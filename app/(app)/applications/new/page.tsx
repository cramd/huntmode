"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCompletion } from "@ai-sdk/react";
import { sanitizeCvMarkdown } from "@/lib/cv-export/sanitize-cv-markdown";
import {
  Link2,
  FileText,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  Save,
  Compass,
  Megaphone,
  Sliders,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { createApplication, getMasterResumes, logActivity, getUserProfile } from "@/lib/db";
import { AnalyticsEvents, captureEvent } from "@/lib/analytics";
import { type MasterResume, type UserProfile, CATEGORY_CONFIG } from "@/lib/types";
import { toast } from "sonner";
import { useEffect } from "react";
import { WorkdayFetchNotice } from "@/components/WorkdayFetchNotice";
import { isWorkdayJobUrl } from "@/lib/job-url";

export function getCategoryIcon(iconName: string) {
  switch (iconName) {
    case "gtm":
      return Compass;
    case "marketing":
      return Megaphone;
    case "sales_ops":
      return Sliders;
    default:
      return FileText;
  }
}

type Step = 1 | 2 | 3 | 4;

interface FormData {
  jobUrl: string;
  jobDescription: string;
  company: string;
  role: string;
  location: string;
  salaryRange: string;
  remote: boolean;
  notes: string;
  selectedResumeId: string;
  generatedCV: string;
  generatedCoverLetter: string;
}

const STEPS = [
  { num: 1, label: "Job Details" },
  { num: 2, label: "Your Resume" },
  { num: 3, label: "Generate Docs" },
  { num: 4, label: "Review & Save" },
];

export default function NewApplicationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [resumes, setResumes] = useState<MasterResume[]>([]);
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<FormData>({
    jobUrl: "",
    jobDescription: "",
    company: "",
    role: "",
    location: "",
    salaryRange: "",
    remote: false,
    notes: "",
    selectedResumeId: "",
    generatedCV: "",
    generatedCoverLetter: "",
  });

  useEffect(() => {
    if (!user) return;
    getMasterResumes(user.uid).then(setResumes);
    getUserProfile(user.uid).then(setUserProfile);
  }, [user]);

  const update = (field: keyof FormData, val: string | boolean) =>
    setForm((f) => ({ ...f, [field]: val }));

  // Scrape job URL
  const handleScrape = async () => {
    if (!form.jobUrl) return;
    setScraping(true);
    setScrapeError("");
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/scrape-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          url: form.jobUrl,
          provider: userProfile?.aiProvider || "openai",
          apiKey: userProfile?.aiApiKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScrapeError(data.error || "Failed to fetch job posting.");
        captureEvent(AnalyticsEvents.JOB_SCRAPED, {
          success: false,
          source: data.source || "unknown",
        });
      } else {
        update("jobDescription", data.text);
        captureEvent(AnalyticsEvents.JOB_SCRAPED, {
          success: true,
          source: data.source || "direct",
        });
        if (data.company && !form.company) update("company", data.company);
        if (data.role && !form.role) update("role", data.role);
        if (data.location && !form.location) update("location", data.location);
        if (data.salaryRange && !form.salaryRange) update("salaryRange", data.salaryRange);
        if (data.remote !== undefined) update("remote", data.remote);
        if (data.source === "jina") {
          toast.success("Job loaded via enhanced reader");
        } else if (data.source === "workday") {
          toast.success("Job loaded from Workday");
        } else if (data.source === "greenhouse") {
          toast.success("Job loaded from Greenhouse API");
        } else if (data.source === "lever") {
          toast.success("Job loaded from Lever API");
        } else if (data.source === "ashby") {
          toast.success("Job loaded from Ashby API");
        } else {
          toast.success("Job description loaded!");
        }
      }
    } catch {
      setScrapeError("Network error. Try pasting the description manually.");
      captureEvent(AnalyticsEvents.JOB_SCRAPED, { success: false, source: "network_error" });
    } finally {
      setScraping(false);
    }
  };

  // AI generation hooks
  const [genError, setGenError] = useState<string | null>(null);

  const {
    completion: cvCompletion,
    complete: generateCV,
    isLoading: cvLoading,
  } = useCompletion({
    api: "/api/generate",
    streamProtocol: "text",
    onFinish: (_, result) => {
      update("generatedCV", sanitizeCvMarkdown(result || ""));
    },
    onError: (e) => setGenError(e.message || "CV generation failed"),
  });

  const {
    completion: clCompletion,
    complete: generateCL,
    isLoading: clLoading,
  } = useCompletion({
    api: "/api/generate",
    streamProtocol: "text",
    onFinish: (_, result) => {
      update("generatedCoverLetter", result);
    },
    onError: (e) => setGenError(e.message || "Cover letter generation failed"),
  });

  const selectedResume = resumes.find((r) => r.id === form.selectedResumeId);

  const buildResumeText = (resume: MasterResume) => {
    const s = resume.sections || {};
    return [
      s.summary && `## Summary\n${s.summary}`,
      s.experience && `## Experience\n${s.experience}`,
      s.skills && `## Skills\n${s.skills}`,
      s.education && `## Education\n${s.education}`,
      s.certifications && `## Certifications\n${s.certifications}`,
      Array.isArray(s.projects) && s.projects.length > 0 && `## Projects\n${s.projects.map((p) =>
        `**${p.name}**${p.url ? ` | ${p.url}` : ""}${p.dates ? ` | ${p.dates}` : ""}\n${p.description}${p.tech ? `\nTech: ${p.tech}` : ""}`
      ).join("\n\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const handleGenerate = async () => {
    setGenError(null);
    if (!selectedResume) return toast.error("Please select a resume first");
    if (!form.jobDescription) return toast.error("Please add a job description first");
    const masterResume = buildResumeText(selectedResume);
    if (!masterResume.trim()) {
      return toast.error("Your resume has no content. Fill in sections in My Resume first.");
    }
    const isMarc = user?.email === "marcsherwood@gmail.com";
    if (!isMarc && !userProfile?.aiApiKey) {
      return toast.error("No AI API key set. Go to Settings and add your API key.");
    }

    const body = {
      jobDescription: form.jobDescription,
      masterResume,
      role: form.role,
      company: form.company,
      provider: userProfile?.aiProvider || "openai",
      apiKey: userProfile?.aiApiKey || undefined,
    };
    const token = await user?.getIdToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    await Promise.all([
      generateCV("", { headers, body: { ...body, type: "cv" } }),
      generateCL("", { headers, body: { ...body, type: "cover_letter" } }),
    ]);

    if (!genError) toast.success("Documents generated!");
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.company || !form.role) {
      toast.error("Company and role are required");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const id = await createApplication(user.uid, {
        company: form.company,
        role: form.role,
        jobUrl: form.jobUrl,
        jobDescription: form.jobDescription,
        status: form.generatedCV ? "applied" : "draft",
        appliedAt: form.generatedCV ? now : null,
        notes: form.notes,
        generatedCV: form.generatedCV || cvCompletion,
        generatedCoverLetter: form.generatedCoverLetter || clCompletion,
        resumeUsed: form.selectedResumeId || null,
        salaryRange: form.salaryRange,
        location: form.location,
        remote: form.remote,
      });

      // Log activity
      const today = now.split("T")[0];
      await logActivity(user.uid, today, { appsSubmitted: 1 });

      captureEvent(AnalyticsEvents.APPLICATION_CREATED, {
        has_job_url: !!form.jobUrl,
        company: form.company,
      });

      toast.success("Application saved!");
      router.push(`/applications/${id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save application");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!form.jobDescription && !!form.company && !!form.role;
    if (step === 2) return !!form.selectedResumeId;
    if (step === 3) return true;
    return true;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="border-b border-white/5 pb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">New Application</h1>
        <p className="text-xs text-slate-400 mt-1.5 font-medium">
          Add a job URL, generate tailored documents, and log your progress in one flow.
        </p>
      </div>

      {/* Step progress */}
      <div className="flex flex-col gap-2 bg-slate-900/40 border border-white/5 p-4 rounded-2xl shadow-inner">
        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider sm:hidden">
          Step {step} of {STEPS.length} — {STEPS[step - 1]?.label}
        </p>
        <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2 flex-1 justify-center sm:justify-start">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all border ${
                step > s.num
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : step === s.num
                  ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                  : "bg-white/5 border-white/5 text-slate-500"
              }`}
            >
              {step > s.num ? <Check className="w-4 h-4" /> : s.num}
            </div>
            <span
              className={`text-xs font-bold uppercase tracking-wider hidden sm:block ${
                step === s.num ? "text-indigo-400 font-extrabold" : "text-slate-500"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`hidden sm:block flex-1 h-px mx-2 ${step > s.num ? "bg-emerald-500/40" : "bg-white/5"}`} />
            )}
          </div>
        ))}
        </div>
      </div>

      {/* Step 1: Job Details */}
      {step === 1 && (
        <Card className="bg-slate-900/40 border-white/5 shadow-xl">
          <CardHeader className="border-b border-white/5 pb-3.5">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <Link2 className="w-4 h-4 text-indigo-400" />
              Step 1: Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {/* Onboarding tip */}
            <div className="flex gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-indigo-300">Tip: paste the job URL and click Fetch Job</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We&apos;ll pull the company, role, and description automatically for most postings
                  (Lever, Greenhouse, Workable, Ashby, Workday, and most company career pages).
                  Workday links can take a bit longer — paste the description manually to skip the wait.
                  LinkedIn and Indeed require login — for those, paste the description manually below.
                </p>
              </div>
            </div>

            {/* URL Scraper */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-semibold">Job Posting URL <span className="text-indigo-400">(recommended)</span></Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="https://jobs.lever.co/company/role"
                  value={form.jobUrl}
                  onChange={(e) => update("jobUrl", e.target.value)}
                  className="flex-1 bg-slate-950 border-white/5 text-white rounded-xl focus:border-indigo-500/30"
                />
                <Button
                  variant="outline"
                  onClick={handleScrape}
                  disabled={!form.jobUrl || scraping}
                  className="border-white/10 hover:bg-white/5 text-white rounded-xl font-bold w-full sm:w-auto shrink-0"
                >
                  {scraping ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2 text-indigo-400" />
                  )}
                  {scraping
                    ? isWorkdayJobUrl(form.jobUrl)
                      ? "Fetching from Workday…"
                      : "Fetching job description…"
                    : "Fetch Job"}
                </Button>
              </div>
              <WorkdayFetchNotice jobUrl={form.jobUrl} />
              {scrapeError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-red-300 font-semibold">{scrapeError}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Paste the job description manually in the field below — AI generation will still work.</p>
                  </div>
                </div>
              )}
              {!scrapeError && form.jobDescription && form.jobUrl && (
                <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Job description loaded — scroll down to review.
                </p>
              )}
            </div>

            {/* Company + Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400 font-semibold">Company Name *</Label>
                <Input
                  placeholder="Acme Corp"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                  className="bg-slate-950 border-white/5 text-white rounded-xl focus:border-indigo-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-400 font-semibold">Role / Job Title *</Label>
                <Input
                  placeholder="Senior Software Engineer"
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                  className="bg-slate-950 border-white/5 text-white rounded-xl focus:border-indigo-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-400 font-semibold">Location</Label>
                <Input
                  placeholder="San Francisco, CA"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  className="bg-slate-950 border-white/5 text-white rounded-xl focus:border-indigo-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-400 font-semibold">Salary Range</Label>
                <Input
                  placeholder="$150k–$200k"
                  value={form.salaryRange}
                  onChange={(e) => update("salaryRange", e.target.value)}
                  className="bg-slate-950 border-white/5 text-white rounded-xl focus:border-indigo-500/30"
                />
              </div>
            </div>

            {/* Job Description */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-semibold">Job Description *</Label>
              <Textarea
                placeholder="Paste the full job listing description here, or load using the URL Fetcher above..."
                value={form.jobDescription}
                onChange={(e) => update("jobDescription", e.target.value)}
                className="min-h-48 font-mono text-xs bg-slate-950 border-white/5 text-slate-200 rounded-xl focus:border-indigo-500/30"
              />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {form.jobDescription.length} characters &bull;{" "}
                {form.jobDescription ? "✓ Description loaded" : "Required for AI document tailoring"}
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-semibold">Notes (optional)</Label>
              <Textarea
                placeholder="Key dates, referral details, interview stages, or thoughts..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                className="min-h-20 bg-slate-950 border-white/5 text-white rounded-xl focus:border-indigo-500/30"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Resume */}
      {step === 2 && (
        <Card className="bg-slate-900/40 border-white/5 shadow-xl">
          <CardHeader className="border-b border-white/5 pb-3.5">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <FileText className="w-4 h-4 text-indigo-400" />
              Step 2: Select Your Resume
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {resumes.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-bold text-white">No master resumes found.</p>
                <p className="text-xs text-slate-400 mt-1 mb-5">Create a master resume first to enable AI document tailoring.</p>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                  onClick={() => router.push("/resume")}
                  variant="outline"
                >
                  Create Master Resume &rarr;
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {resumes.map((r) => {
                  const catCfg = CATEGORY_CONFIG[r.category || "general"];
                  const CatIcon = getCategoryIcon(catCfg.iconName);
                  return (
                    <button
                      key={r.id}
                      onClick={() => update("selectedResumeId", r.id)}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        form.selectedResumeId === r.id
                          ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.1)]"
                          : "border-white/5 bg-slate-950 hover:border-white/10"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          form.selectedResumeId === r.id
                            ? `border-current bg-current/10 ${catCfg.color}`
                            : "bg-white/5 border-white/5 text-slate-500"
                        }`}
                      >
                        <CatIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white">{r.name}</p>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {r.sections?.summary?.slice(0, 120) || "No summary profile description."}…
                        </p>
                      </div>
                      {form.selectedResumeId === r.id && (
                        <Check className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: AI Generation */}
      {step === 3 && (
        <Card className="bg-slate-900/40 border-white/5 shadow-xl">
          <CardHeader className="border-b border-white/5 pb-3.5">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Step 3: Generate Tailored Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="rounded-xl bg-slate-950 border border-white/5 p-4 text-xs text-slate-400 space-y-1.5 font-medium">
              <p><span className="text-slate-500 uppercase font-bold tracking-wider mr-1.5">Target Role:</span> <span className="text-white font-semibold">{form.role}</span> at <span className="text-white font-semibold">{form.company}</span></p>
              <p><span className="text-slate-500 uppercase font-bold tracking-wider mr-1.5">Selected Resume:</span> <span className="text-indigo-400 font-bold">{selectedResume?.name}</span></p>
              <p><span className="text-slate-500 uppercase font-bold tracking-wider mr-1.5">Job Description:</span> <span className="text-white font-semibold">{form.jobDescription.length} characters loaded</span></p>
            </div>

            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={cvLoading || clLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg"
            >
              {cvLoading || clLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating tailored files...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {form.generatedCV ? "Regenerate Documents" : "Generate CV + Cover Letter"}
                </>
              )}
            </Button>

            {(cvLoading || clLoading) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <span>AI models are writing tailored CV and Cover Letter...</span>
                </div>
                <Progress value={0} className="h-1.5 animate-pulse" />
              </div>
            )}

            {genError && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold uppercase tracking-wider">Generation failed</p>
                  <p className="mt-1 font-medium">{genError}</p>
                  <p className="mt-1 opacity-70">Verify your API key in Settings and ensure your base resume has sufficient content.</p>
                </div>
              </div>
            )}

            {(form.generatedCV || form.generatedCoverLetter) && (
              <Tabs defaultValue="cv">
                <div className="flex items-center justify-between mb-3 bg-slate-950 border border-white/5 p-1 rounded-xl">
                  <TabsList className="bg-transparent border-0 gap-1.5 p-0 w-full">
                    <TabsTrigger value="cv" className="flex-1 px-4 py-1.5 text-xs font-bold">Tailored CV Segment</TabsTrigger>
                    <TabsTrigger value="cl" className="flex-1 px-4 py-1.5 text-xs font-bold">Cover Letter Draft</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="cv">
                  <Textarea
                    value={form.generatedCV || cvCompletion}
                    onChange={(e) => update("generatedCV", e.target.value)}
                    className="min-h-96 font-mono text-xs bg-slate-950 border-white/5 text-slate-200 rounded-xl focus:border-indigo-500/30"
                  />
                </TabsContent>
                <TabsContent value="cl">
                  <Textarea
                    value={form.generatedCoverLetter || clCompletion}
                    onChange={(e) => update("generatedCoverLetter", e.target.value)}
                    className="min-h-96 font-mono text-xs bg-slate-950 border-white/5 text-slate-200 rounded-xl focus:border-indigo-500/30"
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Save */}
      {step === 4 && (
        <Card className="bg-slate-900/40 border-white/5 shadow-xl">
          <CardHeader className="border-b border-white/5 pb-3.5">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <Save className="w-4 h-4 text-indigo-400" />
              Step 4: Review & Save
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-white/5 text-xs">
              <div><span className="text-slate-500 font-bold uppercase tracking-wider mr-2">Company:</span> <span className="font-semibold text-white">{form.company}</span></div>
              <div><span className="text-slate-500 font-bold uppercase tracking-wider mr-2">Role:</span> <span className="font-semibold text-white">{form.role}</span></div>
              {form.location && <div><span className="text-slate-500 font-bold uppercase tracking-wider mr-2">Location:</span> <span className="font-semibold text-white">{form.location}</span></div>}
              {form.salaryRange && <div><span className="text-slate-500 font-bold uppercase tracking-wider mr-2">Salary:</span> <span className="font-semibold text-white">{form.salaryRange}</span></div>}
              <div>
                <span className="text-slate-500 font-bold uppercase tracking-wider mr-2">Tailored CV:</span>{" "}
                <span className={form.generatedCV ? "text-emerald-400 font-bold" : "text-slate-500 italic"}>
                  {form.generatedCV ? "✓ Document Ready" : "Not generated"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase tracking-wider mr-2">Cover Letter:</span>{" "}
                <span className={form.generatedCoverLetter ? "text-emerald-400 font-bold" : "text-slate-500 italic"}>
                  {form.generatedCoverLetter ? "✓ Document Ready" : "Not generated"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-semibold">Final Diary Notes</Label>
              <Textarea
                placeholder="Log follow-ups, interview preps, or checklists for this role..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                className="min-h-24 bg-slate-950 border-white/5 text-white rounded-xl focus:border-indigo-500/30"
              />
            </div>

            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition-all"
              onClick={handleSave}
              disabled={saving || !form.company || !form.role}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving application details...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Application
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="fixed bottom-0 inset-x-0 z-30 flex justify-between gap-3 border-t border-white/10 bg-slate-950/95 backdrop-blur-md px-4 py-3 md:static md:border-t md:border-white/5 md:bg-transparent md:backdrop-blur-none md:px-0 md:pt-5 md:pb-0">
        <Button
          variant="outline"
          onClick={() => setStep((s) => (s - 1) as Step)}
          disabled={step === 1}
          className="border-white/10 hover:bg-white/5 text-white rounded-xl font-bold px-5 h-11 md:h-9 flex-1 sm:flex-none"
        >
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={!canProceed()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl px-5 h-11 md:h-9 transition-all flex-1 sm:flex-none"
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
