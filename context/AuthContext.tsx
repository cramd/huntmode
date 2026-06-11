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

    // Mobile browsers can't handle popups reliably — use full-page redirect
    if (isMobile()) {
      try {
        await signInWithRedirect(auth, provider);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? "";
        setAuthError(`Sign-in failed: ${code}`);
      }
      return;
    }

    // Desktop: use popup
    try {
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      const message = (err as { message?: string }).message ?? "Unknown error";
      console.error("Auth error:", code, message);
      if (code === "auth/popup-blocked") {
        // Popup was blocked — fall back to redirect
        await signInWithRedirect(auth, provider);
      } else if (code === "auth/configuration-not-found") {
        setAuthError("Google Sign-In is not enabled. Enable it in the Firebase Console → Authentication → Sign-in method → Google.");
      } else if (code === "auth/popup-closed-by-user") {
        // Silent — user cancelled
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
