"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Zap, Target, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { user, loading, authError, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-8 py-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-xl text-foreground">HuntMode</span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Zap className="w-3.5 h-3.5" />
              Your ADHD-Friendly Job Search Command Center
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-foreground leading-tight">
              Land your dream role.{" "}
              <span className="text-primary">Stay on track.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              HuntMode helps you generate tailored CVs and cover letters,
              track every application, hit your weekly goals, and stay motivated
              throughout the search.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-left">
            {[
              {
                icon: FileText,
                title: "AI-Powered Docs",
                desc: "Tailored CVs and cover letters from any job URL in seconds",
              },
              {
                icon: Target,
                title: "Goal Tracking",
                desc: "Daily checklists, streaks, and gentle nudges to keep momentum",
              },
              {
                icon: TrendingUp,
                title: "Mission Dashboard",
                desc: "Visual progress, funnel analytics, and motivational milestones",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col gap-2 p-4 rounded-2xl bg-card border border-border"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <p className="font-semibold text-sm text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3">
            {authError && (
              <div className="w-full max-w-md rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3 text-center">
                {authError}
              </div>
            )}
            <Button
              size="lg"
              onClick={signInWithGoogle}
              className="px-8 py-6 text-base rounded-xl font-semibold"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
            <p className="text-xs text-muted-foreground">
              Free to use. No credit card required.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
