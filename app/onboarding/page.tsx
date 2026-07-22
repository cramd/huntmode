"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getApplications, getMasterResumes, getUserProfile } from "@/lib/db";
import { needsOnboarding } from "@/lib/onboarding";
import { UploadCvStep } from "@/components/onboarding/UploadCvStep";
import { TargetsStep } from "@/components/onboarding/TargetsStep";
import { ReviewDraftsStep } from "@/components/onboarding/ReviewDraftsStep";
import { ApiKeyStep } from "@/components/onboarding/ApiKeyStep";
import {
  ContactProfileStep,
  type ContactProfileFields,
} from "@/components/onboarding/ContactProfileStep";
import { HuntModeBrand } from "@/components/HuntModeBrand";
import { StickyActionBar } from "@/components/StickyActionBar";
import { Button } from "@/components/ui/button";
import { Key, Loader2 } from "lucide-react";
import type { MasterResume, OnboardingDraftSuggestion, UserProfile } from "@/lib/types";
import type { ParseResumeHints } from "@/lib/parse-resume";
import { AnalyticsEvents, captureEvent } from "@/lib/analytics";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_TITLES: Record<Step, string> = {
  1: "Upload CV",
  2: "Target roles",
  3: "Review drafts",
  4: "Contact profile",
  5: "Connect AI key",
};

const EMPTY_CONTACT: ContactProfileFields = {
  name: "",
  email: "",
  location: "",
  phone: "",
  linkedIn: "",
};

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

  const [contactProfile, setContactProfile] = useState<ContactProfileFields>(EMPTY_CONTACT);

  const [aiProvider, setAiProvider] = useState<NonNullable<UserProfile["aiProvider"]>>("google");
  const [aiApiKey, setAiApiKey] = useState("");
  const [keyValidated, setKeyValidated] = useState(false);

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
        setContactProfile({
          name: profile?.name || user.displayName || "",
          email: profile?.email || user.email || "",
          location: profile?.location || "",
          phone: profile?.phone || "",
          linkedIn: profile?.linkedIn || "",
        });
        if (profile?.aiProvider) setAiProvider(profile.aiProvider);
        if (profile?.aiApiKey) {
          setAiApiKey(profile.aiApiKey);
          setKeyValidated(true);
        }
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

  const handleComplete = async (options?: { skippedApiKey?: boolean }) => {
    if (!user) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      const headers = await getAuthHeaders();
      const trimmedKey = aiApiKey.trim();
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          sections,
          targetRoles,
          targetIndustry,
          drafts,
          contactProfile,
          aiProvider: trimmedKey && !options?.skippedApiKey ? aiProvider : undefined,
          aiApiKey: trimmedKey && !options?.skippedApiKey ? trimmedKey : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete onboarding");

      captureEvent(AnalyticsEvents.ONBOARDING_COMPLETED, {
        draft_count: data.draftCount ?? drafts.length,
        had_cv: !!sections,
        role_count: targetRoles.length,
        added_api_key: Boolean(trimmedKey && !options?.skippedApiKey),
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

  const canContinueTargets =
    targetRoles.length > 0 || targetIndustry.trim().length > 0;
  const canFinishWithKey = !aiApiKey.trim() || keyValidated;

  return (
    <div className="min-h-screen bg-slate-950 pb-24 text-slate-100 selection:bg-indigo-500/30 md:pb-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl px-6 py-10 sm:py-14">
        <div className="mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <HuntModeBrand variant="inline" className="items-start sm:items-center" />
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400/80">
              Setup · Step {step} of 5 · {STEP_TITLES[step]}
            </p>
            <p className="text-lg font-bold text-white">Welcome aboard</p>
          </div>
        </div>

        <div className="mb-8 flex gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-indigo-500" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {step <= 3 && (
          <p className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs leading-relaxed text-indigo-200/90">
            Steps 1–3 use HuntMode&apos;s server AI to parse your CV and suggest starter roles. Steps
            4–5 set your export contact profile and connect your own key for tailoring, fit scores,
            and interview prep.
          </p>
        )}

        {step === 1 && (
          <UploadCvStep
            sections={sections}
            parsing={parsing}
            error={parseError}
            onParse={handleParse}
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
          />
        )}

        {step === 3 && (
          <ReviewDraftsStep
            drafts={drafts}
            error={completeError}
            onUpdateDraft={(index, patch) => {
              setDrafts((prev) =>
                prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
              );
            }}
            onRemoveDraft={(index) => {
              setDrafts((prev) => prev.filter((_, i) => i !== index));
            }}
          />
        )}

        {step === 4 && (
          <ContactProfileStep
            contact={contactProfile}
            onChange={(patch) => setContactProfile((prev) => ({ ...prev, ...patch }))}
          />
        )}

        {step === 5 && (
          <ApiKeyStep
            aiProvider={aiProvider}
            aiApiKey={aiApiKey}
            keyValidated={keyValidated}
            completing={completing}
            error={completeError}
            onChangeProvider={(provider) => {
              setAiProvider(provider);
              setKeyValidated(false);
            }}
            onChangeApiKey={(key) => {
              setAiApiKey(key);
              setKeyValidated(false);
            }}
            onKeyValidated={() => setKeyValidated(true)}
          />
        )}

        {step === 1 && (
          <StickyActionBar
            hint="Next: pick target roles"
            secondary={
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(2)}
                disabled={parsing}
                className="text-slate-400 hover:text-white"
              >
                Skip for now
              </Button>
            }
            primary={
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={parsing}
                className="bg-indigo-600 font-bold text-white hover:bg-indigo-500"
              >
                {sections ? "Continue to target roles" : "Continue without CV"}
              </Button>
            }
          />
        )}

        {step === 2 && (
          <StickyActionBar
            hint="Next: review starter draft roles"
            secondary={
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                className="text-slate-400 hover:text-white"
              >
                Back
              </Button>
            }
            primary={
              <Button
                type="button"
                onClick={handleSuggest}
                disabled={!canContinueTargets || suggestLoading}
                className="bg-indigo-600 font-bold text-white hover:bg-indigo-500"
              >
                {suggestLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finding matches…
                  </>
                ) : (
                  "Continue to review drafts"
                )}
              </Button>
            }
          />
        )}

        {step === 3 && (
          <StickyActionBar
            hint="Next: add your export contact profile · drafts save when you finish setup"
            secondary={
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(2)}
                className="text-slate-400 hover:text-white"
              >
                Back
              </Button>
            }
            primary={
              <Button
                type="button"
                onClick={() => {
                  setCompleteError(null);
                  setStep(4);
                }}
                disabled={drafts.length === 0}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white hover:from-indigo-500 hover:to-purple-500"
              >
                Continue to contact profile
              </Button>
            }
          />
        )}

        {step === 4 && (
          <StickyActionBar
            hint="Next: connect your AI key · profile saves when you finish setup"
            secondary={
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(3)}
                className="text-slate-400 hover:text-white"
              >
                Back
              </Button>
            }
            primary={
              <Button
                type="button"
                onClick={() => {
                  setCompleteError(null);
                  setStep(5);
                }}
                className="bg-indigo-600 font-bold text-white hover:bg-indigo-500"
              >
                Continue to AI key setup
              </Button>
            }
          />
        )}

        {step === 5 && (
          <StickyActionBar
            hint="Finish to save your Master Resume, contact profile, and draft applications"
            secondary={
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(4)}
                disabled={completing}
                className="text-slate-400 hover:text-white"
              >
                Back
              </Button>
            }
            primary={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleComplete({ skippedApiKey: true })}
                  disabled={completing}
                  className="text-slate-400 hover:text-white"
                >
                  Skip for now
                </Button>
                <Button
                  type="button"
                  onClick={() => handleComplete()}
                  disabled={completing || !canFinishWithKey}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white hover:from-indigo-500 hover:to-purple-500"
                >
                  {completing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up your hunt…
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      {aiApiKey.trim() ? "Save key & start hunting" : "Start hunting"}
                    </>
                  )}
                </Button>
              </>
            }
          />
        )}
      </div>
    </div>
  );
}
