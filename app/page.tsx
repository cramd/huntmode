"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoginAuthPanel } from "@/components/landing/LoginAuthPanel";
import { LandingProductShowcase } from "@/components/landing/LandingProductShowcase";
import { MobileProductSummary } from "@/components/landing/MobileProductSummary";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const {
    user,
    loading,
    authError,
    signInWithGoogle,
    signInWithGithub,
    authLogs,
    clearAuthLogs,
  } = useAuth();
  const router = useRouter();
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (
        searchParams.get("debug") === "true" ||
        localStorage.getItem("huntmode:debug") === "true"
      ) {
        setShowDebug(true);
      }
    }
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-500/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        <LoginAuthPanel
          authError={authError}
          onSignInWithGoogle={signInWithGoogle}
          onSignInWithGithub={signInWithGithub}
        />
        <LandingProductShowcase />
        <div className="lg:col-span-2 lg:hidden">
          <MobileProductSummary />
        </div>
      </div>

      {showDebug && authLogs && (
        <section className="relative z-10 mx-auto max-w-3xl px-6 pb-12">
          <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl">
            <div className="flex flex-col justify-between gap-4 border-b border-white/5 pb-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                  Authentication Diagnostics Log
                </h3>
                <p className="text-xs text-slate-500">
                  Logs persist across page reloads to help troubleshoot sign-in
                  issues.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(authLogs)}
                  className="h-auto rounded-lg border-white/10 bg-transparent px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  Copy Logs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAuthLogs}
                  className="h-auto rounded-lg border-white/10 bg-transparent px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  Clear Logs
                </Button>
              </div>
            </div>
            <div className="scrollbar-thin max-h-60 space-y-1 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/80 p-4 font-mono text-[10px] text-slate-400">
              {authLogs.split("\n").filter(Boolean).map((log, index) => (
                <div key={index} className="whitespace-pre-wrap leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
