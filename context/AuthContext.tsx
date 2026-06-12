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
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { saveUserProfile, getUserProfile } from "@/lib/db";

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent
  );
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authError: null,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Safety timeout — if Firebase never responds, stop the spinner after 8s
    const timeout = setTimeout(() => setLoading(false), 8000);

    // Process redirect result on mobile after returning from Google
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          // onAuthStateChanged will fire and handle profile creation
        }
      })
      .catch((err) => {
        const code = (err as { code?: string }).code ?? "";
        if (code !== "auth/no-current-user") {
          setAuthError(`Sign-in failed: ${code}`);
        }
        setLoading(false);
      });

    const unsub = onAuthStateChanged(auth, async (u) => {
      clearTimeout(timeout);
      setUser(u);
      if (u) {
        const profile = await getUserProfile(u.uid);
        if (!profile) {
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
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();

    // Try popup first on ALL platforms (including mobile).
    // Modern mobile Chrome supports popups and third-party cookie blocking
    // silently breaks signInWithRedirect (the old approach).
    try {
      console.log("[Auth] Attempting signInWithPopup");
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      const message = (err as { message?: string }).message ?? "Unknown error";
      console.error("[Auth] Popup error:", code, message);

      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        // Popup was blocked (common on some mobile browsers) — fall back to redirect
        console.log("[Auth] Popup blocked, falling back to signInWithRedirect");
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr: unknown) {
          const redirectCode = (redirectErr as { code?: string }).code ?? "";
          console.error("[Auth] Redirect also failed:", redirectCode);
          setAuthError(`Sign-in failed: ${redirectCode || "redirect error"}`);
        }
      } else if (code === "auth/popup-closed-by-user") {
        // Silent — user cancelled
      } else if (code === "auth/configuration-not-found") {
        setAuthError("Google Sign-In is not enabled. Enable it in Firebase Console → Authentication → Sign-in method → Google.");
      } else if (code === "auth/unauthorized-domain") {
        setAuthError(
          `This domain is not authorized for sign-in. Add "${window.location.hostname}" to Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else {
        setAuthError(`Sign-in failed: ${code || message}`);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
