"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCompletion } from "@ai-sdk/react";
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
import { type MasterResume, type UserProfile, CATEGORY_CONFIG } from "@/lib/types";
import { toast } from "sonner";
import { useEffect } from "react";

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
      const res = await fetch("/api/scrape-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.jobUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScrapeError(data.error || "Failed to fetch job posting.");
      } else {
        update("jobDescription", data.text);
        if (data.company && !form.company) update("company", data.company);
        toast.success("Job description loaded!");
      }
    } catch {
      setScrapeError("Network error. Try pasting the description manually.");
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
      update("generatedCV", result);
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
    if (!userProfile?.aiApiKey) {
      return toast.error("No AI API key set. Go to Settings and add your API key.");
    }

    const body = {
      jobDescription: form.jobDescription,
      masterResume,
      role: form.role,
      company: form.company,
      provider: userProfile?.aiProvider || "openai",
      apiKey: userProfile.aiApiKey,
    };
    await Promise.all([
      generateCV("", { body: { ...body, type: "cv" } }),
      generateCL("", { body: { ...body, type: "cover_letter" } }),
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
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">New Application</h1>
        <p className="text-muted-foreground mt-1">
          Add a job, generate tailored docs, and track it — all in one flow.
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                step > s.num
                  ? "bg-emerald-500 text-white"
                  : step === s.num
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s.num ? <Check className="w-4 h-4" /> : s.num}
            </div>
            <span
              className={`text-sm font-medium ${
                step === s.num ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px w-8 mx-1 ${step > s.num ? "bg-emerald-500" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Job Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Step 1: Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* URL Scraper */}
            <div className="space-y-2">
              <Label>Job Posting URL</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://jobs.lever.co/company/role"
                  value={form.jobUrl}
                  onChange={(e) => update("jobUrl", e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleScrape}
                  disabled={!form.jobUrl || scraping}
                >
                  {scraping ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  {scraping ? "Loading..." : "Fetch"}
                </Button>
              </div>
              {scrapeError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {scrapeError} — paste description below.
                </p>
              )}
            </div>

            {/* Company + Role */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company *</Label>
                <Input
                  placeholder="Acme Corp"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role / Job Title *</Label>
                <Input
                  placeholder="Senior Software Engineer"
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="San Francisco, CA"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Salary Range</Label>
                <Input
                  placeholder="$150k–$200k"
                  value={form.salaryRange}
                  onChange={(e) => update("salaryRange", e.target.value)}
                />
              </div>
            </div>

            {/* Job Description */}
            <div className="space-y-2">
              <Label>Job Description *</Label>
              <Textarea
                placeholder="Paste the full job description here, or use the Fetch button above..."
                value={form.jobDescription}
                onChange={(e) => update("jobDescription", e.target.value)}
                className="min-h-48 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {form.jobDescription.length} characters ·{" "}
                {form.jobDescription ? "✓ Description loaded" : "Required for AI generation"}
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about this role, referral info, etc..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                className="min-h-20"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Resume */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Step 2: Select Your Resume
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resumes.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No resumes found.</p>
                <p className="text-sm mt-1">Create a master resume first to enable AI generation.</p>
                <Button
                  className="mt-4"
                  onClick={() => router.push("/resume")}
                  variant="outline"
                >
                  Create Master Resume →
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
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-colors ${
                        form.selectedResumeId === r.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          form.selectedResumeId === r.id
                            ? `${catCfg.bgColor} ${catCfg.color}`
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <CatIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {r.sections?.summary?.slice(0, 100) || "No summary"}…
                        </p>
                      </div>
                      {form.selectedResumeId === r.id && (
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Step 3: Generate Tailored Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground space-y-1">
              <p><span className="font-medium text-foreground">Role:</span> {form.role} at {form.company}</p>
              <p><span className="font-medium text-foreground">Resume:</span> {selectedResume?.name}</p>
              <p><span className="font-medium text-foreground">Job description:</span> {form.jobDescription.length} characters loaded</p>
            </div>

            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={cvLoading || clLoading}
              className="w-full"
            >
              {cvLoading || clLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating documents...
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
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>AI is writing your documents…</span>
                </div>
                <Progress value={0} className="h-1.5 animate-pulse" />
              </div>
            )}

            {genError && (
              <div className="rounded-xl bg-destructive/10 text-destructive text-sm p-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Generation failed</p>
                  <p className="text-xs mt-0.5 opacity-80">{genError}</p>
                  <p className="text-xs mt-1 opacity-60">Check your API key in Settings and that your resume has content.</p>
                </div>
              </div>
            )}

            {(form.generatedCV || form.generatedCoverLetter) && (
              <Tabs defaultValue="cv">
                <TabsList className="w-full">
                  <TabsTrigger value="cv" className="flex-1">Tailored CV</TabsTrigger>
                  <TabsTrigger value="cl" className="flex-1">Cover Letter</TabsTrigger>
                </TabsList>
                <TabsContent value="cv">
                  <Textarea
                    value={form.generatedCV || cvCompletion}
                    onChange={(e) => update("generatedCV", e.target.value)}
                    className="min-h-96 font-mono text-sm"
                  />
                </TabsContent>
                <TabsContent value="cl">
                  <Textarea
                    value={form.generatedCoverLetter || clCompletion}
                    onChange={(e) => update("generatedCoverLetter", e.target.value)}
                    className="min-h-96 font-mono text-sm"
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Save */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              Step 4: Review & Save
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 text-sm">
              <div><span className="text-muted-foreground">Company:</span> <span className="font-semibold ml-2">{form.company}</span></div>
              <div><span className="text-muted-foreground">Role:</span> <span className="font-semibold ml-2">{form.role}</span></div>
              {form.location && <div><span className="text-muted-foreground">Location:</span> <span className="font-semibold ml-2">{form.location}</span></div>}
              {form.salaryRange && <div><span className="text-muted-foreground">Salary:</span> <span className="font-semibold ml-2">{form.salaryRange}</span></div>}
              <div>
                <span className="text-muted-foreground">Tailored CV:</span>{" "}
                <span className={form.generatedCV ? "text-emerald-600 font-medium" : "text-muted-foreground/50"}>
                  {form.generatedCV ? "✓ Ready" : "Not generated"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Cover Letter:</span>{" "}
                <span className={form.generatedCoverLetter ? "text-emerald-600 font-medium" : "text-muted-foreground/50"}>
                  {form.generatedCoverLetter ? "✓ Ready" : "Not generated"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Final Notes</Label>
              <Textarea
                placeholder="Add any final notes..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                className="min-h-24"
              />
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleSave}
              disabled={saving || !form.company || !form.role}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
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
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => (s - 1) as Step)}
          disabled={step === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={!canProceed()}
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
