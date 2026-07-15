"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getApplications, getMasterResumes, getUserProfile } from "@/lib/db";
import { needsOnboarding } from "@/lib/onboarding";
import { UploadCvStep } from "@/components/onboarding/UploadCvStep";
import { TargetsStep } from "@/components/onboarding/TargetsStep";
import { ReviewDraftsStep } from "@/components/onboarding/ReviewDraftsStep";
import { HuntModeBrand } from "@/components/HuntModeBrand";
import type { MasterResume, OnboardingDraftSuggestion } from "@/lib/types";
import type { ParseResumeHints } from "@/lib/parse-resume";
import { AnalyticsEvents, captureEvent } from "@/lib/analytics";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const { user, loading, accessStatus } = useAuth();
  const router = useRouter();

  const [gateLoading, setGateLoading] = useState(true);
  const [step, setStep] = useState<Step>(1);

  const [sections, setSections] = useState<MasterResume["sections"] | null>(null);
  const [hints, setHints] = useState<ParseResumeHints | undefined>();
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetIndustry, setTargetIndustry] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<OnboardingDraftSuggestion[]>([]);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (accessStatus !== "approved") {
      router.replace("/");
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
          !needsOnboarding({
            profile,
            applicationCount: applications.length,
            resumeCount: resumes.length,
          })
        ) {
          router.replace("/dashboard");
          return;
        }
        if (profile?.targetRoles?.length) setTargetRoles(profile.targetRoles);
        else if (profile?.targetRole) {
          setTargetRoles(
            profile.targetRole.split(",").map((r) => r.trim()).filter(Boolean)
          );
        }
        if (profile?.targetIndustry) setTargetIndustry(profile.targetIndustry);
        setGateLoading(false);
      } catch {
        if (!cancelled) setGateLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, accessStatus, router]);

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    if (!user) throw new Error("Not signed in");
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  const handleParse = async (file: File) => {
    if (!user) return;
    setParsing(true);
    setParseError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const headers = await getAuthHeaders();
      const res = await fetch("/api/onboarding/parse-resume", {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse CV");
      setSections(data.sections);
      setHints(data.hints);
      if (data.hints?.suggestedIndustry && !targetIndustry) {
        setTargetIndustry(data.hints.suggestedIndustry);
      }
      if (data.hints?.suggestedRoles?.length && targetRoles.length === 0) {
        setTargetRoles(data.hints.suggestedRoles.slice(0, 2));
      }
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "Failed to parse CV");
    } finally {
      setParsing(false);
    }
  };

  const handleSuggest = async () => {
    if (!user) return;
    setSuggestLoading(true);
    setSuggestError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/onboarding/suggest-roles", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          sections,
          targetRoles,
          industry: targetIndustry,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to suggest roles");
      setDrafts(data.drafts);
      setStep(3);
    } catch (err: unknown) {
      setSuggestError(err instanceof Error ? err.message : "Failed to suggest roles");
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          sections,
          targetRoles,
          targetIndustry,
          drafts,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete onboarding");

      captureEvent(AnalyticsEvents.ONBOARDING_COMPLETED, {
        draft_count: data.draftCount ?? drafts.length,
        had_cv: !!sections,
        role_count: targetRoles.length,
      });

      router.replace("/dashboard");
    } catch (err: unknown) {
      setCompleteError(err instanceof Error ? err.message : "Failed to complete setup");
      setCompleting(false);
    }
  };

  if (loading || gateLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl px-6 py-10 sm:py-14">
        <div className="mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <HuntModeBrand variant="inline" className="items-start sm:items-center" />
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400/80">
              Setup · Step {step} of 3
            </p>
            <p className="text-lg font-bold text-white">Welcome aboard</p>
          </div>
        </div>

        <div className="mb-8 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-indigo-500" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        <p className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs leading-relaxed text-indigo-200/90">
          Setup runs on HuntMode&apos;s server AI key — parse your CV, suggest jobs, and seed
          draft applications. Add your own key later in Settings for tailoring and interview prep.
        </p>

        {step === 1 && (
          <UploadCvStep
            sections={sections}
            parsing={parsing}
            error={parseError}
            onParse={handleParse}
            onSkip={() => setStep(2)}
            onContinue={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <TargetsStep
            targetRoles={targetRoles}
            targetIndustry={targetIndustry}
            suggestedRoles={hints?.suggestedRoles}
            suggestedIndustry={hints?.suggestedIndustry}
            loading={suggestLoading}
            error={suggestError}
            onChangeRoles={setTargetRoles}
            onChangeIndustry={setTargetIndustry}
            onBack={() => setStep(1)}
            onContinue={handleSuggest}
          />
        )}

        {step === 3 && (
          <ReviewDraftsStep
            drafts={drafts}
            completing={completing}
            error={completeError}
            onUpdateDraft={(index, patch) => {
              setDrafts((prev) =>
                prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
              );
            }}
            onRemoveDraft={(index) => {
              setDrafts((prev) => prev.filter((_, i) => i !== index));
            }}
            onBack={() => setStep(2)}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
}
