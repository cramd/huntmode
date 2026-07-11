"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Link2,
  Sparkles,
  Key,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { saveUserProfile } from "@/lib/db";
import type { UserProfile } from "@/lib/types";
import { toast } from "sonner";

interface GettingStartedCardProps {
  user: { uid: string };
  profile: UserProfile | null;
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: FileText,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    title: "Build your master resume",
    body: "Fill in your experience, skills, and projects once. HuntMode tailors it automatically for each role.",
    href: "/resume",
    linkLabel: "Open My Resume →",
  },
  {
    icon: Link2,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    title: "Paste a job URL and click Fetch Job",
    body: "We pull the company, role, and full description automatically for most postings. If fetch fails, paste the description manually — AI generation still works.",
    href: "/applications/new",
    linkLabel: "New Application →",
  },
  {
    icon: Sparkles,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    title: "Generate tailored CV & cover letter",
    body: "Pick your resume variant and hit Generate. The AI rewrites your resume and writes a custom cover letter for the specific role.",
    href: null,
    linkLabel: null,
  },
  {
    icon: Key,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    title: "Add your AI API key",
    body: "HuntMode uses your own OpenAI, Anthropic, or Google key so you control costs. Add it once in Settings.",
    href: "/settings",
    linkLabel: "Open Settings →",
  },
];

const WORKS_WELL = ["Lever", "Greenhouse", "Workable", "Ashby", "Most company career pages"];
const MAY_FAIL = ["LinkedIn (login required)", "Indeed (login required)", "Pages with cookie banners or 'Show more' gates"];

export function GettingStartedCard({ user, profile, onDismiss }: GettingStartedCardProps) {
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await saveUserProfile(user.uid, {
        ...profile,
        onboardingDismissedAt: new Date().toISOString(),
      } as Partial<UserProfile>);
      onDismiss();
    } catch {
      toast.error("Could not save preference");
    } finally {
      setDismissing(false);
    }
  };

  return (
    <Card className="relative bg-gradient-to-br from-indigo-950/60 via-slate-900/60 to-purple-950/40 border border-indigo-500/20 shadow-2xl shadow-indigo-500/5 rounded-2xl overflow-hidden">
      {/* Dismiss */}
      <button
        type="button"
        onClick={handleDismiss}
        disabled={dismissing}
        aria-label="Dismiss getting started guide"
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-40"
      >
        <X className="w-4 h-4" />
      </button>

      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="pr-6">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Getting Started</p>
          <h2 className="text-lg font-black text-white tracking-tight">Welcome to HuntMode</h2>
          <p className="text-xs text-slate-400 mt-1">
            Your AI-powered job search command center. Four steps to your first tailored application.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className={`rounded-xl border ${step.border} ${step.bg} p-3.5 space-y-1.5`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${step.bg} border ${step.border}`}>
                    <Icon className={`w-3.5 h-3.5 ${step.color}`} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Step {i + 1}</span>
                </div>
                <p className="text-sm font-bold text-white">{step.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{step.body}</p>
                {step.href && (
                  <Link
                    href={step.href}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${step.color} hover:underline mt-1`}
                  >
                    {step.linkLabel}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* URL fetch tips */}
        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3.5 space-y-2.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL Fetch — what to expect</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Works well
              </p>
              {WORKS_WELL.map((item) => (
                <p key={item} className="text-xs text-slate-400 pl-4">• {item}</p>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> May fail
              </p>
              {MAY_FAIL.map((item) => (
                <p key={item} className="text-xs text-slate-400 pl-4">• {item}</p>
              ))}
              <p className="text-xs text-slate-500 pl-4 italic">Fallback: paste description manually</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3 pt-1">
          <Link
            href="/applications/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-4 py-2 text-xs shadow-lg shadow-indigo-500/10 transition-all hover:-translate-y-[1px]"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Start first application
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissing}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
          >
            Dismiss guide
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
