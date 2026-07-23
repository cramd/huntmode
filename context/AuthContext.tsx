"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { saveUserProfile, getUserProfile } from "@/lib/db";
import { AnalyticsEvents, captureEvent, identifyUser, resetUser } from "@/lib/analytics";
import { accessGateEnabled } from "@/lib/edition";
import { isAdminEmail } from "@/lib/is-admin";

function serializeError(err: any): string {
  if (!err) return "null";
  try {
    const obj: any = {};
    if (typeof err === "object") {
      Object.getOwnPropertyNames(err).forEach((key) => {
        const val = err[key];
        if (typeof val === "object" && val !== null) {
          try {
            obj[key] = JSON.parse(JSON.stringify(val));
          } catch {
            obj[key] = String(val);
          }
        } else {
          obj[key] = val;
        }
      });
      return JSON.stringify(obj);
    }
    return String(err);
  } catch (e) {
    return "Serialization failed: " + String(e);
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  accessStatus: "approved" | "pending" | "denied" | "rate_limited" | "none" | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  logout: () => Promise<void>;
  requestAccess: (customEmail?: string) => Promise<void>;
  refreshAccessStatus: () => Promise<void>;
  authLogs: string;
  clearAuthLogs: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authError: null,
  accessStatus: null,
  signInWithGoogle: async () => {},
  signInWithGithub: async () => {},
  logout: async () => {},
  requestAccess: async (customEmail?: string) => {},
  refreshAccessStatus: async () => {},
  authLogs: "",
  clearAuthLogs: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<
    "approved" | "pending" | "denied" | "rate_limited" | "none" | null
  >(null);
  const [authLogs, setAuthLogs] = useState<string>("");

  const logDiagnostic = (message: string) => {
    if (typeof window === "undefined") return;
    const time = new Date().toLocaleTimeString();
    const existing = localStorage.getItem("huntmode:auth-logs") || "";
    const newLine = `[${time}] ${message}\n`;
    let updated = existing + newLine;
    const lines = updated.split("\n").filter(Boolean);
    if (lines.length > 50) {
      updated = lines.slice(lines.length - 50).join("\n") + "\n";
    }
    localStorage.setItem("huntmode:auth-logs", updated);
    setAuthLogs(updated);
    console.log(`[Diagnostic] ${message}`);
  };

  const clearAuthLogs = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("huntmode:auth-logs");
    setAuthLogs("");
  };

  const ensureUserProfile = async (u: User) => {
    const profile = await getUserProfile(u.uid);
    if (!profile) {
      logDiagnostic("Creating user profile...");
      await saveUserProfile(u.uid, {
        uid: u.uid,
        name: u.displayName || "",
        email: u.email || "",
        targetRole: "",
        weeklyGoal: 5,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const resolveAccessForUser = async (
    u: User
  ): Promise<{ status: "approved" | "denied" | "rate_limited" | "none"; isNewRegistration: boolean }> => {
    const token = await u.getIdToken();
    const authHeaders = { Authorization: `Bearer ${token}` };

    const statusRes = await fetch(`/api/auth/check-status?uid=${u.uid}`, {
      headers: authHeaders,
    });
    if (!statusRes.ok) throw new Error("Status check failed");
    const statusData = await statusRes.json();
    let status = statusData.status || "none";
    let isNewRegistration = false;

    if (status === "none") {
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: u.uid,
          email: u.email,
          name: u.displayName,
        }),
      });
      const registerData = await registerRes.json().catch(() => ({}));
      if (registerRes.status === 429) {
        return { status: "rate_limited", isNewRegistration: false };
      }
      if (!registerRes.ok) {
        throw new Error(registerData.error || "Registration failed");
      }
      status = registerData.status || "approved";
      isNewRegistration = registerData.created === true;
    }

    if (status === "pending") return { status: "approved", isNewRegistration };
    return { status, isNewRegistration };
  };

  const syncAnalyticsForUser = (
    u: User,
    resolution: { status: "approved" | "denied" | "rate_limited" | "none"; isNewRegistration: boolean }
  ) => {
    captureEvent(AnalyticsEvents.USER_SIGNED_IN, { method: "google" });
    identifyUser({
      uid: u.uid,
      email: u.email,
      name: u.displayName,
      accessStatus: resolution.status,
    });
    if (resolution.isNewRegistration) {
      captureEvent(AnalyticsEvents.USER_REGISTERED);
    }
    if (resolution.status === "denied" || resolution.status === "rate_limited") {
      captureEvent(AnalyticsEvents.ACCESS_BLOCKED, { reason: resolution.status });
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthLogs(localStorage.getItem("huntmode:auth-logs") || "");
    }
  }, []);

  useEffect(() => {
    // Load Google Identity Services script
    if (typeof document !== "undefined") {
      const existingScript = document.getElementById("google-gsi-client");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-gsi-client";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
        logDiagnostic("Google Identity Services script injected.");
      }
    }

    // Setup network interception to log Google API calls and responses
    if (typeof window !== "undefined" && !(window as any).__network_intercepted) {
      (window as any).__network_intercepted = true;

      // 1. Fetch Interceptor
      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        const url = String(args[0]);
        const isIdentityCall = url.includes("googleapis.com") || url.includes("identitytoolkit");
        if (isIdentityCall) {
          logDiagnostic(`[Network Fetch] Request to: ${url}`);
          try {
            const res = await originalFetch.apply(this, args);
            logDiagnostic(`[Network Fetch Response] Status: ${res.status} for: ${url.split("?")[0]}`);
            if (!res.ok) {
              const clone = res.clone();
              const text = await clone.text();
              logDiagnostic(`[Network Fetch Error Payload] ${text}`);
            }
            return res;
          } catch (err) {
            logDiagnostic(`[Network Fetch Failed] Error: ${String(err)} for: ${url}`);
            throw err;
          }
        }
        return originalFetch.apply(this, args);
      };

      // 2. XHR Interceptor
      const originalOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: any[]) {
        const urlStr = String(url);
        const isIdentityCall = urlStr.includes("googleapis.com") || urlStr.includes("identitytoolkit");
        if (isIdentityCall) {
          logDiagnostic(`[Network XHR] ${method} to: ${urlStr}`);
          const xhr = this;
          this.addEventListener("load", function () {
            logDiagnostic(`[Network XHR Response] Status: ${xhr.status} for: ${urlStr.split("?")[0]}`);
            if (xhr.status < 200 || xhr.status >= 300) {
              logDiagnostic(`[Network XHR Error Payload] ${xhr.responseText}`);
            }
          });
          this.addEventListener("error", function () {
            logDiagnostic(`[Network XHR Failed] for: ${urlStr}`);
          });
        }
        return originalOpen.apply(this, [method, url, ...rest] as any);
      } as any;
    }

    logDiagnostic("AuthProvider initialized. Location: " + window.location.href);
    logDiagnostic("User Agent: " + navigator.userAgent);

    // Safety timeout — if Firebase never responds, stop the spinner after 8s
    const timeout = setTimeout(() => {
      logDiagnostic("Safety timeout triggered: Firebase took more than 8 seconds to respond.");
      setLoading(false);
    }, 8000);

    // Process redirect result after returning from Google
    logDiagnostic("Calling getRedirectResult(auth)...");
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          logDiagnostic(`getRedirectResult successful. User: ${result.user.email} (${result.user.uid})`);
        } else {
          logDiagnostic("getRedirectResult completed, but no redirect user was found.");
        }
      })
      .catch((err) => {
        const code = (err as { code?: string }).code ?? "";
        const message = (err as { message?: string }).message ?? "Unknown error";
        logDiagnostic(`getRedirectResult failed. Code: ${code}, Message: ${message}`);
        logDiagnostic(`Detailed getRedirectResult error: ${serializeError(err)}`);
        if (code !== "auth/no-current-user") {
          setAuthError(`Sign-in failed: ${code}`);
        }
        setLoading(false);
      });

    logDiagnostic("Subscribing to onAuthStateChanged...");
    const unsub = onAuthStateChanged(auth, async (u) => {
      clearTimeout(timeout);
      if (u) {
        logDiagnostic(`onAuthStateChanged: User is signed in. Email: ${u.email}, UID: ${u.uid}`);
        if (!accessGateEnabled()) {
          logDiagnostic("Open sign-up edition — auto-approving access.");
          setAccessStatus("approved");
          setUser(u);
          syncAnalyticsForUser(u, { status: "approved", isNewRegistration: false });
          try {
            await resolveAccessForUser(u);
          } catch (err) {
            console.error("[Auth] Error registering open sign-up user:", err);
          }
          await ensureUserProfile(u);
          setLoading(false);
        } else if (isAdminEmail(u.email)) {
          logDiagnostic("User is administrator. Auto-approving access.");
          setAccessStatus("approved");
          setUser(u);
          syncAnalyticsForUser(u, { status: "approved", isNewRegistration: false });
          await ensureUserProfile(u);
          setLoading(false);
        } else {
          logDiagnostic(`Resolving access for user ${u.email}...`);
          try {
            const resolution = await resolveAccessForUser(u);
            logDiagnostic(`Access resolved: ${resolution.status}`);
            setAccessStatus(resolution.status);
            setUser(u);
            syncAnalyticsForUser(u, resolution);
            if (resolution.status === "approved") {
              await ensureUserProfile(u);
            }
          } catch (err) {
            console.error("[Auth] Error resolving access:", err);
            logDiagnostic(`Error resolving access: ${(err as Error).message}`);
            setAccessStatus("none");
            setUser(u);
          } finally {
            setLoading(false);
          }
        }
      } else {
        logDiagnostic("onAuthStateChanged: User is signed out (null).");
        resetUser();
        setUser(null);
        setAccessStatus(null);
        setLoading(false);
      }
    });

    return () => {
      logDiagnostic("AuthProvider running cleanup (unsubscribing).");
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  const signInWithGoogle = async () => {
    logDiagnostic("signInWithGoogle action triggered.");
    setAuthError(null);

    // GIS initTokenClient requires window.location.origin to be listed on the OAuth Web
    // client's Authorized JavaScript origins. Firebase Auth uses authDomain (firebaseapp.com)
    // for the OAuth handshake, so custom domains only need Firebase authorizedDomains.
    // Keep GIS only for origins already registered on client
    // 928125401687-bqj0qujjgc75mgae0c10foq8k9b3lreq — otherwise origin_mismatch.
    const gisRegisteredOrigins = new Set([
      "http://localhost:3000",
      "https://fuzzynacho.org",
      "https://www.fuzzynacho.org",
      "https://dvp-insight-platform.firebaseapp.com",
      "https://dvp-insight-platform.web.app",
      ...(process.env.NEXT_PUBLIC_GOOGLE_GIS_ORIGINS || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ]);
    const pageOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const canUseGis = gisRegisteredOrigins.has(pageOrigin);

    try {
      logDiagnostic("Attempting first-party Google Identity Services flow...");
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "928125401687-bqj0qujjgc75mgae0c10foq8k9b3lreq.apps.googleusercontent.com";
      const google = (window as any).google;

      if (canUseGis && google?.accounts?.oauth2) {
        logDiagnostic("Google Identity Services detected. Initializing Token Client...");
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "email profile openid",
          callback: async (tokenResponse: any) => {
            logDiagnostic("Google OAuth2 token response received.");
            if (tokenResponse.error) {
              logDiagnostic(`Google OAuth2 error: ${tokenResponse.error} - ${tokenResponse.error_description || ""}`);
              setAuthError(`Google Sign-In failed: ${tokenResponse.error_description || tokenResponse.error}`);
              return;
            }

            try {
              logDiagnostic("Signing into Firebase using OAuth2 access token...");
              const credential = GoogleAuthProvider.credential(null, tokenResponse.access_token);
              const userCredential = await signInWithCredential(auth, credential);
              logDiagnostic(`Firebase sign-in successful! User: ${userCredential.user.email}`);
            } catch (firebaseErr: any) {
              logDiagnostic(`Firebase sign-in failed with OAuth token: ${serializeError(firebaseErr)}`);
              setAuthError(`Sign-in failed: ${firebaseErr.code || firebaseErr.message}`);
            }
          },
        });

        logDiagnostic("Launching Google Consent Popup...");
        tokenClient.requestAccessToken();
        return; // Success, bypass Firebase fallback
      } else {
        logDiagnostic(
          canUseGis
            ? "Google Identity Services script not available. Falling back to Firebase Auth..."
            : `Origin ${pageOrigin} not in GIS-registered origins. Using Firebase Auth to avoid origin_mismatch.`
        );
      }
    } catch (gisErr) {
      logDiagnostic(`Google Identity Services flow encountered an error: ${String(gisErr)}. Falling back to Firebase Auth...`);
    }

    // FALLBACK: Firebase Auth popup-first on ALL platforms (including mobile).
    // Mobile Chrome/Safari third-party cookie blocking silently breaks
    // signInWithRedirect — Google returns to the landing page with no session.
    // Redirect only when the popup is explicitly blocked.
    await signInWithFirebasePopup(new GoogleAuthProvider(), "Google");
  };

  const signInWithFirebasePopup = async (
    provider: GoogleAuthProvider | GithubAuthProvider,
    providerLabel: "Google" | "GitHub"
  ) => {
    try {
      logDiagnostic(`Initiating ${providerLabel} signInWithPopup (all platforms)...`);
      await signInWithPopup(auth, provider);
      logDiagnostic(`${providerLabel} signInWithPopup completed successfully!`);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      const message = (err as { message?: string }).message ?? "Unknown error";
      logDiagnostic(`${providerLabel} signInWithPopup failed. Code: ${code}, Message: ${message}`);
      logDiagnostic(`Detailed ${providerLabel} signInWithPopup error: ${serializeError(err)}`);

      if (code === "auth/popup-closed-by-user") {
        // User cancelled — do not fall back to redirect (also broken on mobile).
        logDiagnostic(`${providerLabel} popup closed by user; not falling back to redirect.`);
        return;
      }

      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        logDiagnostic(`Popup blocked; attempting signInWithRedirect due to: ${code}`);
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr: unknown) {
          const redirectCode = (redirectErr as { code?: string }).code ?? "";
          logDiagnostic(`signInWithRedirect fallback failed. Code: ${redirectCode}`);
          logDiagnostic(`Detailed signInWithRedirect fallback error: ${serializeError(redirectErr)}`);
          setAuthError(`Sign-in failed: ${redirectCode || "redirect error"}`);
        }
      } else if (code === "auth/configuration-not-found") {
        setAuthError(
          `${providerLabel} Sign-In is not enabled. Enable it in Firebase Console → Authentication → Sign-in method → ${providerLabel}.`
        );
      } else if (code === "auth/unauthorized-domain") {
        setAuthError(
          `This domain is not authorized for sign-in. Add "${window.location.hostname}" to Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (typeof code === "string" && code.includes("requests-from-referer") && code.includes("are-blocked")) {
        setAuthError(
          `Sign-in blocked for this domain by the Firebase API key HTTP referrer settings. Add "${window.location.origin}/*" to the Browser key restrictions in Google Cloud Console.`
        );
      } else {
        setAuthError(`Sign-in failed: ${code || message}`);
      }
    }
  };

  const signInWithGithub = async () => {
    logDiagnostic("signInWithGithub action triggered.");
    setAuthError(null);
    await signInWithFirebasePopup(new GithubAuthProvider(), "GitHub");
  };

  const logout = async () => {
    logDiagnostic("logout action triggered.");
    resetUser();
    await signOut(auth);
  };

  const requestAccess = async (customEmail?: string) => {
    if (!user) return;
    const emailToUse = customEmail || user.email;
    if (!emailToUse) {
      logDiagnostic("requestAccess failed: No email address available.");
      setAuthError("Email is required to request access.");
      return;
    }
    setLoading(true);
    logDiagnostic(`requestAccess action triggered. Email: ${emailToUse}`);
    try {
      const res = await fetch("/api/auth/request-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
          email: emailToUse,
          name: user.displayName,
        }),
      });
      if (!res.ok) throw new Error("Request access failed");
      const data = await res.json();
      if (data.status) {
        logDiagnostic(`Access request status response: ${data.status}`);
        setAccessStatus(data.status);
      }
    } catch (err) {
      console.error("[Auth] Failed to request access:", err);
      logDiagnostic(`Failed to request access: ${(err as Error).message}`);
      setAuthError("Failed to request access. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const refreshAccessStatus = async () => {
    if (!user) return;
    if (!accessGateEnabled() || isAdminEmail(user.email)) {
      setAccessStatus("approved");
      return;
    }
    setLoading(true);
    logDiagnostic("refreshAccessStatus action triggered.");
    try {
      const resolution = await resolveAccessForUser(user);
      logDiagnostic(`Status refreshed: ${resolution.status}`);
      setAccessStatus(resolution.status);
      syncAnalyticsForUser(user, resolution);
      if (resolution.status === "approved") {
        await ensureUserProfile(user);
      }
    } catch (err) {
      console.error("[Auth] Failed to refresh status:", err);
      logDiagnostic(`Failed to refresh status: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        accessStatus,
        signInWithGoogle,
        signInWithGithub,
        logout,
        requestAccess,
        refreshAccessStatus,
        authLogs,
        clearAuthLogs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
