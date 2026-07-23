"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, ShieldAlert, RefreshCw, LogOut, Plus, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserProfile, getApplications, getMasterResumes } from "@/lib/db";
import { needsOnboarding } from "@/lib/onboarding";
import { userHasAiApiKey } from "@/lib/has-ai-key";
import Sidebar from "@/components/Sidebar";
import { HuntModeBrand } from "@/components/HuntModeBrand";
import { ApiKeyBanner } from "@/components/ApiKeyBanner";
import { ExtensionImportBanner } from "@/components/ExtensionImportBanner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const {
    user,
    loading,
    accessStatus,
    refreshAccessStatus,
    logout,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("huntmode:sidebar-collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || !user || accessStatus !== "approved") {
      setOnboardingChecked(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [profile, applications, resumes] = await Promise.all([
          getUserProfile(user.uid),
          getApplications(user.uid),
          getMasterResumes(user.uid),
        ]);
        if (cancelled) return;
        if (
          needsOnboarding({
            profile,
            applicationCount: applications.length,
            resumeCount: resumes.length,
          })
        ) {
          router.replace("/onboarding");
          return;
        }
        setUserProfile(profile);
        setOnboardingChecked(true);
      } catch {
        if (!cancelled) setOnboardingChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, accessStatus, router]);

  useEffect(() => {
    if (!user || !onboardingChecked) return;
    getUserProfile(user.uid).then((profile) => {
      if (profile) setUserProfile(profile);
    });
  }, [pathname, user, onboardingChecked]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("huntmode:sidebar-collapsed", String(next));
      return next;
    });
  };

  const handleRefreshStatus = async () => {
    setActionLoading(true);
    await refreshAccessStatus();
    setActionLoading(false);
  };

  if (loading || (accessStatus === "approved" && !onboardingChecked)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading HuntMode...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (accessStatus === "denied" || accessStatus === "rate_limited" || accessStatus === "none") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/5 bg-slate-900/60 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div
            className={cn(
              "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
              accessStatus === "denied"
                ? "from-indigo-500 to-red-500"
                : "from-indigo-500 to-amber-500"
            )}
          />

          <div className="mb-8 flex justify-center">
            <HuntModeBrand variant="stacked" />
          </div>

          <div className="flex justify-center mb-6">
            {accessStatus === "denied" ? (
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                <ShieldAlert className="w-8 h-8" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                <Clock className="w-8 h-8" />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            {accessStatus === "denied" && "Access Denied"}
            {accessStatus === "rate_limited" && "Sign-ups Temporarily Full"}
            {accessStatus === "none" && "Could Not Complete Sign-up"}
          </h2>

          <p className="text-sm text-slate-400 leading-relaxed mb-8">
            {accessStatus === "denied" &&
              "Your account was blocked by the administrator. If you believe this was an error, please reach out directly."}
            {accessStatus === "rate_limited" &&
              "HuntMode limits new sign-ups to 10 per hour to prevent abuse. Please try again in a little while."}
            {accessStatus === "none" &&
              "Something went wrong while setting up your account. Try again, or sign out and back in."}
          </p>

          <div className="mb-8 p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-left">
            <div className="overflow-hidden mr-2">
              <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Signed In As</p>
              <p className="text-sm font-semibold text-white truncate">{user.displayName || "Google User"}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => logout()}
              className="text-slate-400 hover:text-white hover:bg-white/5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {(accessStatus === "rate_limited" || accessStatus === "none") && (
              <Button
                onClick={handleRefreshStatus}
                disabled={actionLoading}
                className="w-full py-6 text-sm font-semibold rounded-xl"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", actionLoading && "animate-spin")} />
                {actionLoading ? "Trying Again..." : "Try Again"}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => logout()}
              className="w-full text-slate-400 hover:text-white hover:bg-white/5 text-xs py-2"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <TooltipProvider delay={300}>
    <div className="flex min-h-screen bg-background flex-col md:flex-row relative overflow-hidden selection:bg-indigo-500/30">
      {/* Decorative ambient background lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[60%] h-[60%] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Desktop Sidebar (Fixed position) */}
      <div className="hidden md:block">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Main Layout Area */}
      <div className="flex flex-col flex-1 min-h-screen w-full">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-xs px-4 md:hidden w-full shrink-0">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon-sm" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                }
              />
              <SheetContent
                side="left"
                className="p-0 w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
                showCloseButton={false}
              >
                <Sidebar
                  isMobile={true}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <HuntModeBrand variant="inline" />
          </div>

          <Link href="/settings" className="flex items-center">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </header>

        {/* Content Body */}
        <main
          className={cn(
            "flex-1 min-h-screen overflow-y-auto transition-all duration-300 w-full pb-20 md:pb-0",
            isMounted && (isCollapsed ? "md:pl-16" : "md:pl-64"),
            !isMounted && "md:pl-64"
          )}
        >
          {!userHasAiApiKey(user.email, userProfile) && <ApiKeyBanner />}
          <ExtensionImportBanner userProfile={userProfile} />
          {children}
        </main>

        {/* Mobile FAB — quick new application */}
        <Link
          href="/applications/new"
          className="fixed bottom-5 right-4 z-50 md:hidden inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-4 py-3 text-xs shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
          aria-label="New application"
        >
          <Plus className="w-4 h-4" />
          New
        </Link>
      </div>
    </div>
    </TooltipProvider>
  );
}
