"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Edit2,
  Save,
  Sparkles,
  Loader2,
  Copy,
  CheckCheck,
  Trash2,
  Compass,
  Megaphone,
  Sliders,
  FileText,
  Upload,
  MessageSquareText,
  PenLine,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import {
  getApplication,
  updateApplication,
  deleteApplication,
  getMasterResume,
  getUserProfile,
} from "@/lib/db";
import type { UserProfile, ResumeCategory, OrgType } from "@/lib/types";
import type { Application, MasterResume, ApplicationStatus } from "@/lib/types";
import { STATUS_CONFIG, CATEGORY_CONFIG, ORG_TYPE_CONFIG } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useCompletion } from "@ai-sdk/react";

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

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Application>>({});
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [copied, setCopied] = useState<"cv" | "cl" | null>(null);
  const [masterResume, setMasterResume] = useState<MasterResume | null>(null);
  const [generating, setGenerating] = useState<"cv" | "cl" | null>(null);
  const generatingRef = useRef<"cv" | "cl" | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [uploading, setUploading] = useState<"cv" | "cl" | null>(null);
  const [suggestOpen, setSuggestOpen] = useState<"cv" | "cl" | null>(null);
  const [suggestions, setSuggestions] = useState<string>("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const cvFileRef = useRef<HTMLInputElement>(null);
  const clFileRef = useRef<HTMLInputElement>(null);

  const [regenError, setRegenError] = useState<string | null>(null);
  const completionRef = useRef<string>("");
  const { complete: generateDoc, completion, isLoading: genLoading } = useCompletion({
    api: "/api/generate",
    streamProtocol: "text",
    onFinish: async (_, result) => {
      const type = generatingRef.current;
      // Use result if present, otherwise fall back to the latest streamed completion
      const text = (result && result.trim()) ? result : completionRef.current;
      if (type && user && id && text) {
        const field = type === "cv" ? "generatedCV" : "generatedCoverLetter";
        setEditForm((f) => ({ ...f, [field]: text }));
        setApp((a) => a ? { ...a, [field]: text } : null);
        try {
          await updateApplication(user.uid, id, { [field]: text });
          toast.success(`${type === "cv" ? "CV" : "Cover letter"} generated and saved!`);
        } catch {
          toast.error("Generated but failed to save — copy the text manually.");
        }
      } else if (type) {
        toast.error("Generation completed but returned empty text. Try again.");
      }
      generatingRef.current = null;
      setGenerating(null);
    },
    onError: (e) => {
      setRegenError(e.message || "Generation failed");
      toast.error(`Generation failed: ${e.message || "unknown error"}`);
      generatingRef.current = null;
      setGenerating(null);
    },
  });

  // Keep completionRef in sync with the streaming completion value
  useEffect(() => {
    if (completion) completionRef.current = completion;
  }, [completion]);

  useEffect(() => {
    if (!user || !id) return;
    getApplication(user.uid, id).then((a) => {
      setApp(a);
      if (a) setEditForm(a);
      if (a?.resumeUsed) getMasterResume(user.uid, a.resumeUsed).then(setMasterResume);
      getUserProfile(user.uid).then(setUserProfile);
      setLoading(false);
    });
  }, [user, id]);

  const handleSave = async () => {
    if (!user || !id || !app) return;
    setSaving(true);
    try {
      await updateApplication(user.uid, id, editForm);
      setApp({ ...app, ...editForm });
      setEditing(false);
      toast.success("Application updated");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !id) return;
    await deleteApplication(user.uid, id);
    toast.success("Application deleted");
    router.push("/applications");
  };

  const handleStatusChange = async (status: ApplicationStatus) => {
    if (!user || !id || !app) return;
    const update: Partial<Application> = { status };
    if (status === "applied" && !app.appliedAt) {
      update.appliedAt = new Date().toISOString();
    }
    await updateApplication(user.uid, id, update);
    setApp((a) => a ? { ...a, ...update } : null);
    toast.success(`Status updated to ${STATUS_CONFIG[status].label}`);
  };

  const handleCopy = (type: "cv" | "cl") => {
    const text = type === "cv" ? app?.generatedCV : app?.generatedCoverLetter;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleRegenerate = async (type: "cv" | "cl") => {
    setRegenError(null);
    // #region agent log
    // fetch('http://127.0.0.1:7755/ingest/515e276b-97ed-4604-80f1-6f57f7bffddb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7e1cb3'},body:JSON.stringify({sessionId:'7e1cb3',location:'[id]/page.tsx:handleRegenerate:entry',message:'regen called',data:{type,hasMasterResume:!!masterResume,jdLen:app?.jobDescription?.length??0,hasApiKey:!!(userProfile?.aiApiKey),provider:userProfile?.aiProvider,appLoaded:!!app},hypothesisId:'H-A,H-B,H-C,H-E',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!app || !masterResume) {
      toast.error("No master resume linked to this application. Go to My Resume and create one first.");
      return;
    }
    if (!app.jobDescription) {
      toast.error("No job description saved for this application.");
      return;
    }
    if (!userProfile?.aiApiKey) {
      toast.error("No AI API key set. Go to Settings and add your key.");
      return;
    }
    const s = masterResume.sections || {};
    const masterText = [
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

    if (!masterText.trim()) {
      toast.error("Your master resume has no content. Fill in the sections in My Resume first.");
      return;
    }

    // #region agent log
    // fetch('http://127.0.0.1:7755/ingest/515e276b-97ed-4604-80f1-6f57f7bffddb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7e1cb3'},body:JSON.stringify({sessionId:'7e1cb3',location:'[id]/page.tsx:handleRegenerate:sendingToAPI',message:'calling useCompletion for regen',data:{type,masterTextLen:masterText.length,jdLen:app.jobDescription.length,provider:userProfile?.aiProvider},hypothesisId:'H-A,H-B,H-D',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    generatingRef.current = type;
    setGenerating(type);
    const apiType = type === "cl" ? "cover_letter" : "cv";
    await generateDoc("", {
      body: {
        jobDescription: app.jobDescription,
        masterResume: masterText,
        role: app.role,
        company: app.company,
        type: apiType,
        provider: userProfile?.aiProvider || "openai",
        apiKey: userProfile?.aiApiKey || undefined,
      },
    });
  };

  const handlePdfUpload = async (file: File, target: "cv" | "cl") => {
    if (!user || !id || !userProfile?.aiApiKey) {
      toast.error("No AI API key set. Go to Settings and add your key.");
      return;
    }
    setUploading(target);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("provider", userProfile.aiProvider || "openai");
      formData.append("apiKey", userProfile.aiApiKey);
      const res = await fetch("/api/parse-resume", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      // Combine parsed sections into a single text block
      const s = data.sections;
      const text = [
        s.summary && `## Summary\n${s.summary}`,
        s.experience && `## Experience\n${s.experience}`,
        s.skills && `## Skills\n${s.skills}`,
        s.education && `## Education\n${s.education}`,
        s.certifications && `## Certifications\n${s.certifications}`,
      ].filter(Boolean).join("\n\n");
      const field = target === "cv" ? "generatedCV" : "generatedCoverLetter";
      setEditForm((f) => ({ ...f, [field]: text }));
      setApp((a) => a ? { ...a, [field]: text } : null);
      await updateApplication(user.uid, id, { [field]: text });
      toast.success(`PDF content extracted and saved to ${target === "cv" ? "CV" : "cover letter"}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  };

  const handleStartWriting = (target: "cv" | "cl") => {
    const field = target === "cv" ? "generatedCV" : "generatedCoverLetter";
    // Set a single space so the textarea appears (user can then type)
    setEditForm((f) => ({ ...f, [field]: " " }));
    setApp((a) => a ? { ...a, [field]: " " } : null);
  };

  const handleSuggest = async (target: "cv" | "cl") => {
    if (!app || !userProfile?.aiApiKey) {
      toast.error("No AI API key set. Go to Settings.");
      return;
    }
    const content = target === "cv" ? editForm.generatedCV : editForm.generatedCoverLetter;
    if (!content?.trim()) {
      toast.error("No content to review yet.");
      return;
    }
    setSuggestOpen(target);
    setSuggestions("");
    setSuggestLoading(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          jobDescription: app.jobDescription,
          role: app.role,
          company: app.company,
          type: target === "cv" ? "cv" : "cover_letter",
          provider: userProfile.aiProvider || "openai",
          apiKey: userProfile.aiApiKey,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Suggestion failed");
      }
      const text = await res.text();
      setSuggestions(text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Suggestion failed";
      toast.error(msg);
      setSuggestOpen(null);
    } finally {
      setSuggestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Application not found.</p>
        <Link href="/applications" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
          Back to Applications
        </Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[app.status];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/applications" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{app.role}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bgColor} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              {app.company}
              {app.location && <span>· {app.location}</span>}
              {app.appliedAt && (
                <span>· Applied {format(parseISO(app.appliedAt), "MMM d, yyyy")}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {app.jobUrl && (
            <a
              href={app.jobUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              View Job
            </a>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDelete(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Status updater */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground mr-2">Update Status:</span>
          {(Object.keys(STATUS_CONFIG) as ApplicationStatus[]).map((s) => {
            const c = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  app.status === s
                    ? `${c.bgColor} ${c.color} ring-2 ring-offset-1 ring-current scale-105`
                    : `bg-muted text-muted-foreground hover:${c.bgColor} hover:${c.color}`
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Details + Notes */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(!editing)}
                  className="h-7 text-xs"
                >
                  {editing ? "Cancel" : <><Edit2 className="w-3 h-3 mr-1" />Edit</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {editing ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Company</Label>
                    <Input
                      value={editForm.company || ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Input
                      value={editForm.role || ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Location</Label>
                    <Input
                      value={editForm.location || ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Salary Range</Label>
                    <Input
                      value={editForm.salaryRange || ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, salaryRange: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Org Type</Label>
                    <Select
                      value={editForm.orgType || ""}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, orgType: v as OrgType }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ORG_TYPE_CONFIG) as OrgType[]).map((t) => (
                          <SelectItem key={t} value={t}>{ORG_TYPE_CONFIG[t].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" className="w-full mt-2" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1" />Save</>}
                  </Button>
                </>
              ) : (
                <>
                  {[
                    { label: "Company", value: app.company },
                    { label: "Role", value: app.role },
                    { label: "Location", value: app.location },
                    { label: "Salary", value: app.salaryRange },
                    { label: "Org Type", value: app.orgType ? ORG_TYPE_CONFIG[app.orgType]?.label : undefined },
                    { label: "Applied", value: app.appliedAt ? format(parseISO(app.appliedAt), "MMM d, yyyy") : "Draft" },
                  ].map(({ label, value }) =>
                    value ? (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-medium text-foreground">{value}</p>
                      </div>
                    ) : null
                  )}
                  {masterResume && (() => {
                    const catCfg = CATEGORY_CONFIG[masterResume.category || "general"];
                    const CatIcon = getCategoryIcon(catCfg.iconName);
                    return (
                      <div>
                        <p className="text-xs text-muted-foreground">Resume Used</p>
                        <div className="flex items-center gap-1.5 font-medium text-foreground mt-0.5">
                          <div className={`p-0.5 rounded ${catCfg.bgColor}`}>
                            <CatIcon className={`w-3.5 h-3.5 ${catCfg.color}`} />
                          </div>
                          <Link href="/resume" className="hover:underline text-primary">
                            {masterResume.name}
                          </Link>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editForm.notes || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Add notes about this application..."
                className="min-h-28 text-sm"
                onBlur={async () => {
                  if (!user || !id) return;
                  await updateApplication(user.uid, id, { notes: editForm.notes });
                  setApp((a) => a ? { ...a, notes: editForm.notes || "" } : null);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-saves on blur</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Generated Documents */}
        <div className="col-span-2">
          <Tabs defaultValue="cv">
            <div className="flex items-center justify-between mb-3">
              <TabsList>
                <TabsTrigger value="cv">Tailored CV</TabsTrigger>
                <TabsTrigger value="cl">Cover Letter</TabsTrigger>
                <TabsTrigger value="jd">Job Description</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="cv">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Tailored CV</CardTitle>
                    <div className="flex gap-2">
                      {(app.generatedCV || editForm.generatedCV) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggest("cv")}
                          disabled={suggestLoading}
                          title="AI Suggestions"
                        >
                          <MessageSquareText className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy("cv")}
                        disabled={!app.generatedCV}
                      >
                        {copied === "cv" ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      {masterResume && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerate("cv")}
                          disabled={genLoading}
                        >
                          {genLoading && generating === "cv" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <input
                    ref={cvFileRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePdfUpload(f, "cv");
                      e.target.value = "";
                    }}
                  />
                  {app.generatedCV || editForm.generatedCV || (generating === "cv" && completion) ? (
                    <Textarea
                      value={editForm.generatedCV || (generating === "cv" ? completion : "") || ""}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, generatedCV: e.target.value }))
                      }
                      readOnly={genLoading && generating === "cv"}
                      placeholder="Paste or write your CV content here..."
                      className={`min-h-[500px] font-mono text-xs ${genLoading && generating === "cv" ? "opacity-70" : ""}`}
                      onBlur={async () => {
                        if (!user || !id || (genLoading && generating === "cv")) return;
                        await updateApplication(user.uid, id, { generatedCV: editForm.generatedCV });
                        setApp((a) => a ? { ...a, generatedCV: editForm.generatedCV || "" } : null);
                      }}
                    />
                  ) : generating === "cv" && genLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-48">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                      <p className="text-sm text-muted-foreground">Generating tailored CV...</p>
                    </div>
                  ) : uploading === "cv" ? (
                    <div className="flex flex-col items-center justify-center min-h-48">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                      <p className="text-sm text-muted-foreground">Extracting text from PDF...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-48 text-muted-foreground text-sm">
                      <FileText className="w-10 h-10 mb-3 opacity-30" />
                      <p className="font-medium text-foreground">No CV content yet</p>
                      <p className="text-xs mt-1 mb-5 max-w-sm text-center">
                        Choose how to add your tailored CV for this application.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {masterResume && (
                          <Button
                            size="sm"
                            onClick={() => handleRegenerate("cv")}
                            disabled={genLoading}
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            AI Generate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cvFileRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartWriting("cv")}
                        >
                          <PenLine className="w-4 h-4 mr-2" />
                          Write / Paste
                        </Button>
                      </div>
                      {!masterResume && (
                        <p className="text-xs mt-3 text-muted-foreground">
                          <Link href="/resume" className="underline hover:text-foreground">Link a base resume</Link> to enable AI generation
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cl">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Cover Letter</CardTitle>
                    <div className="flex gap-2">
                      {(app.generatedCoverLetter || editForm.generatedCoverLetter) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggest("cl")}
                          disabled={suggestLoading}
                          title="AI Suggestions"
                        >
                          <MessageSquareText className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy("cl")}
                        disabled={!app.generatedCoverLetter}
                      >
                        {copied === "cl" ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      {masterResume && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerate("cl")}
                          disabled={genLoading}
                        >
                          {genLoading && generating === "cl" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <input
                    ref={clFileRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePdfUpload(f, "cl");
                      e.target.value = "";
                    }}
                  />
                  {app.generatedCoverLetter || editForm.generatedCoverLetter || (generating === "cl" && completion) ? (
                    <Textarea
                      value={editForm.generatedCoverLetter || (generating === "cl" ? completion : "") || ""}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, generatedCoverLetter: e.target.value }))
                      }
                      readOnly={genLoading && generating === "cl"}
                      placeholder="Paste or write your cover letter here..."
                      className={`min-h-[500px] font-mono text-xs ${genLoading && generating === "cl" ? "opacity-70" : ""}`}
                      onBlur={async () => {
                        if (!user || !id || (genLoading && generating === "cl")) return;
                        await updateApplication(user.uid, id, {
                          generatedCoverLetter: editForm.generatedCoverLetter,
                        });
                        setApp((a) =>
                          a ? { ...a, generatedCoverLetter: editForm.generatedCoverLetter || "" } : null
                        );
                      }}
                    />
                  ) : generating === "cl" && genLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-48">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                      <p className="text-sm text-muted-foreground">Generating cover letter...</p>
                    </div>
                  ) : uploading === "cl" ? (
                    <div className="flex flex-col items-center justify-center min-h-48">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                      <p className="text-sm text-muted-foreground">Extracting text from PDF...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-48 text-muted-foreground text-sm">
                      <FileText className="w-10 h-10 mb-3 opacity-30" />
                      <p className="font-medium text-foreground">No cover letter yet</p>
                      <p className="text-xs mt-1 mb-5 max-w-sm text-center">
                        Choose how to add your cover letter for this application.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {masterResume && (
                          <Button
                            size="sm"
                            onClick={() => handleRegenerate("cl")}
                            disabled={genLoading}
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            AI Generate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => clFileRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartWriting("cl")}
                        >
                          <PenLine className="w-4 h-4 mr-2" />
                          Write / Paste
                        </Button>
                      </div>
                      {!masterResume && (
                        <p className="text-xs mt-3 text-muted-foreground">
                          <Link href="/resume" className="underline hover:text-foreground">Link a base resume</Link> to enable AI generation
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="jd">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Job Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={app.jobDescription || "No description saved."}
                    readOnly
                    className="min-h-[500px] font-mono text-xs bg-muted/30"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this application?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deleting <strong>{app.role} at {app.company}</strong> is permanent and cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={suggestOpen !== null} onOpenChange={(open) => { if (!open) setSuggestOpen(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-primary" />
              AI Suggestions — {suggestOpen === "cv" ? "CV" : "Cover Letter"}
            </DialogTitle>
          </DialogHeader>
          {suggestLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Analyzing your content...</p>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {suggestions}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuggestOpen(null)}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
