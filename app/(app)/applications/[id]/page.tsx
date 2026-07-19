"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  BarChart2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Search,
  RefreshCw,
  Undo2,
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
import { cn } from "@/lib/utils";
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
import type { UserProfile, ResumeCategory, OrgType, FitScore, SimilarRole, FitInsightCardType } from "@/lib/types";
import type { Application, MasterResume, ApplicationStatus, InterviewPrepData } from "@/lib/types";
import { STATUS_CONFIG, CATEGORY_CONFIG, ORG_TYPE_CONFIG } from "@/lib/types";
import InterviewPrep from "@/components/InterviewPrep";
import FitInsightCard from "@/components/FitInsightCard";
import { CvExportMenu } from "@/components/CvExportMenu";
import { contactFromProfile } from "@/lib/cv-export/contact-header";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useCompletion } from "@ai-sdk/react";
import { sanitizeCvMarkdown } from "@/lib/cv-export/sanitize-cv-markdown";
import { AnalyticsEvents, captureEvent } from "@/lib/analytics";
import {
  appendFitInsights,
  FIT_CARD_LABELS,
  popUndoSnapshot,
  pushUndoSnapshot,
} from "@/lib/undo-stack";
import { TipCelebrationDialog } from "@/components/TipCelebrationDialog";
import {
  isTipMilestoneStatus,
  shouldCelebrateMilestone,
  type TipMilestoneStatus,
} from "@/lib/tipping";

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
  const searchParams = useSearchParams();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Application>>({});
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [tipMilestone, setTipMilestone] = useState<TipMilestoneStatus | null>(null);
  const [copied, setCopied] = useState<"cv" | "cl" | null>(null);
  const [masterResume, setMasterResume] = useState<MasterResume | null>(null);
  const [generating, setGenerating] = useState<"cv" | "cl" | null>(null);
  const generatingRef = useRef<"cv" | "cl" | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [uploading, setUploading] = useState<"cv" | "cl" | null>(null);
  const [savingDoc, setSavingDoc] = useState<"cv" | "cl" | null>(null);
  const [suggestOpen, setSuggestOpen] = useState<"cv" | "cl" | null>(null);
  const [suggestions, setSuggestions] = useState<string>("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const cvFileRef = useRef<HTMLInputElement>(null);
  const clFileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "cv");

  const [regenError, setRegenError] = useState<string | null>(null);
  const [fitLoading, setFitLoading] = useState(false);
  const [fitError, setFitError] = useState<string | null>(null);
  const [copiedFitCard, setCopiedFitCard] = useState<FitInsightCardType | null>(null);
  const [incorporatingCard, setIncorporatingCard] = useState<FitInsightCardType | null>(null);
  const [liveSearchLoading, setLiveSearchLoading] = useState<string | null>(null);
  const [liveSearchResults, setLiveSearchResults] = useState<Record<string, { title: string; url: string; snippet: string }[]>>({});
  const [cvUndoStack, setCvUndoStack] = useState<string[]>([]);
  const [clUndoStack, setClUndoStack] = useState<string[]>([]);
  const completionRef = useRef<string>("");
  const docSnapshotRef = useRef({ cv: "", cl: "" });

  const { complete: generateDoc, completion, isLoading: genLoading } = useCompletion({
    api: "/api/generate",
    streamProtocol: "text",
    onFinish: async (_, result) => {
      const type = generatingRef.current;
      // Use result if present, otherwise fall back to the latest streamed completion
      const text = (result && result.trim()) ? result : completionRef.current;
      if (type && user && id && text) {
        const field = type === "cv" ? "generatedCV" : "generatedCoverLetter";
        const cleaned = type === "cv" ? sanitizeCvMarkdown(text) : text;
        const previous = type === "cv" ? docSnapshotRef.current.cv : docSnapshotRef.current.cl;
        if (previous.trim()) {
          if (type === "cv") setCvUndoStack((s) => pushUndoSnapshot(s, previous));
          else setClUndoStack((s) => pushUndoSnapshot(s, previous));
        }
        setEditForm((f) => ({ ...f, [field]: cleaned }));
        setApp((a) => a ? { ...a, [field]: cleaned } : null);
        docSnapshotRef.current = {
          ...docSnapshotRef.current,
          [type === "cv" ? "cv" : "cl"]: cleaned,
        };
        try {
          await updateApplication(user.uid, id, { [field]: cleaned });
          captureEvent(AnalyticsEvents.DOCUMENT_GENERATED, { type });
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
      if (a) {
        setEditForm(a);
        docSnapshotRef.current = {
          cv: a.generatedCV || "",
          cl: a.generatedCoverLetter || "",
        };
      }
      if (a?.resumeUsed) getMasterResume(user.uid, a.resumeUsed).then(setMasterResume);
      getUserProfile(user.uid).then(setUserProfile);
      setLoading(false);
    });
  }, [user, id]);

  useEffect(() => {
    docSnapshotRef.current = {
      cv: editForm.generatedCV ?? app?.generatedCV ?? "",
      cl: editForm.generatedCoverLetter ?? app?.generatedCoverLetter ?? "",
    };
  }, [editForm.generatedCV, editForm.generatedCoverLetter, app?.generatedCV, app?.generatedCoverLetter]);

  const pushDocUndo = (target: "cv" | "cl", previous: string) => {
    if (!previous.trim()) return;
    if (target === "cv") setCvUndoStack((s) => pushUndoSnapshot(s, previous));
    else setClUndoStack((s) => pushUndoSnapshot(s, previous));
  };

  const handleUndoDocument = async (target: "cv" | "cl") => {
    if (!user || !id) return;
    const field = target === "cv" ? "generatedCV" : "generatedCoverLetter";
    const stack = target === "cv" ? cvUndoStack : clUndoStack;
    const { next, snapshot } = popUndoSnapshot(stack);
    if (snapshot === null) return;
    if (target === "cv") setCvUndoStack(next);
    else setClUndoStack(next);
    setEditForm((f) => ({ ...f, [field]: snapshot }));
    setApp((a) => (a ? { ...a, [field]: snapshot } : null));
    try {
      await updateApplication(user.uid, id, { [field]: snapshot });
      toast.success("Restored previous version");
    } catch {
      toast.error("Undo restored locally but failed to save");
    }
  };

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
    const previousStatus = app.status;
    const update: Partial<Application> = { status };
    if (status === "applied" && !app.appliedAt) {
      update.appliedAt = new Date().toISOString();
    }
    await updateApplication(user.uid, id, update);
    setApp((a) => a ? { ...a, ...update } : null);
    toast.success(`Status updated to ${STATUS_CONFIG[status].label}`);

    // Congratulatory tip ask when the hunt heats up (new milestone only)
    if (
      status !== previousStatus &&
      isTipMilestoneStatus(status) &&
      shouldCelebrateMilestone(status)
    ) {
      setTipMilestone(status);
    }
  };

  const handleCopy = (type: "cv" | "cl") => {
    const text =
      type === "cv"
        ? editForm.generatedCV || app?.generatedCV
        : editForm.generatedCoverLetter || app?.generatedCoverLetter;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied to clipboard!");
  };

  const getDocumentText = (target: "cv" | "cl") => {
    const field = target === "cv" ? "generatedCV" : "generatedCoverLetter";
    return (editForm[field] || app?.[field] || "").trim();
  };

  const triggerPdfUpload = (target: "cv" | "cl") => {
    const label = target === "cv" ? "CV" : "cover letter";
    if (getDocumentText(target)) {
      const ok = window.confirm(
        `Replace your current ${label} with the uploaded PDF? Your existing text will be overwritten.`
      );
      if (!ok) return;
    }
    if (target === "cv") cvFileRef.current?.click();
    else clFileRef.current?.click();
  };

  const handleSaveDocument = async (target: "cv" | "cl") => {
    if (!user || !id) return;
    const field = target === "cv" ? "generatedCV" : "generatedCoverLetter";
    const previous = target === "cv" ? (app?.generatedCV || "") : (app?.generatedCoverLetter || "");
    const nextVal = editForm[field] || "";
    if (previous !== nextVal) pushDocUndo(target, previous);
    setSavingDoc(target);
    try {
      await updateApplication(user.uid, id, { [field]: nextVal });
      setApp((a) => (a ? { ...a, [field]: nextVal } : null));
      toast.success(`${target === "cv" ? "CV" : "Cover letter"} saved`);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingDoc(null);
    }
  };

  const handleRegenerate = async (type: "cv" | "cl") => {
    setRegenError(null);
    if (!app || !masterResume) {
      toast.error("No master resume linked to this application. Go to My Resume and create one first.");
      return;
    }
    if (!app.jobDescription) {
      toast.error("No job description saved for this application.");
      return;
    }
    const isMarc = user?.email === "marcsherwood@gmail.com";
    if (!isMarc && !userProfile?.aiApiKey) {
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

    generatingRef.current = type;
    setGenerating(type);
    const apiType = type === "cl" ? "cover_letter" : "cv";
    const token = await user?.getIdToken();
    await generateDoc("", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
    const isMarc = user?.email === "marcsherwood@gmail.com";
    if (!user || !id || (!isMarc && !userProfile?.aiApiKey)) {
      toast.error("No AI API key set. Go to Settings and add your key.");
      return;
    }
    setUploading(target);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("provider", userProfile?.aiProvider || "openai");
      if (userProfile?.aiApiKey) {
        formData.append("apiKey", userProfile.aiApiKey);
      }
      const token = await user.getIdToken();
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
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
      const previous = target === "cv" ? (app?.generatedCV || editForm.generatedCV || "") : (app?.generatedCoverLetter || editForm.generatedCoverLetter || "");
      pushDocUndo(target, previous);
      setEditForm((f) => ({ ...f, [field]: text }));
      setApp((a) => a ? { ...a, [field]: text } : null);
      await updateApplication(user.uid, id, { [field]: text });
      captureEvent(AnalyticsEvents.DOCUMENT_UPLOADED, { type: target });
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
    const isMarc = user?.email === "marcsherwood@gmail.com";
    if (!app || (!isMarc && !userProfile?.aiApiKey)) {
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
      const token = await user?.getIdToken();
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content,
          jobDescription: app.jobDescription,
          role: app.role,
          company: app.company,
          type: target === "cv" ? "cv" : "cover_letter",
          provider: userProfile?.aiProvider || "openai",
          apiKey: userProfile?.aiApiKey || undefined,
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

  const handleAnalyzeFit = async () => {
    const isMarc = user?.email === "marcsherwood@gmail.com";
    if (!app || !masterResume) {
      toast.error("Load a resume first — open application settings to select one.");
      return;
    }
    if (!app.jobDescription?.trim()) {
      toast.error("No job description to analyze against.");
      return;
    }
    if (!isMarc && !userProfile?.aiApiKey) {
      toast.error("No AI API key set. Go to Settings.");
      return;
    }
    setFitLoading(true);
    setFitError(null);
    setActiveTab("fit");
    try {
      const token = await user?.getIdToken();
      const s = masterResume.sections;
      const masterText = [
        s.summary && `## Summary\n${s.summary}`,
        s.experience && `## Experience\n${s.experience}`,
        s.skills && `## Skills\n${s.skills}`,
        s.education && `## Education\n${s.education}`,
        s.certifications && `## Certifications\n${s.certifications}`,
        s.projects?.length && `## Projects\n${s.projects.map((p) =>
          `**${p.name}**${p.url ? ` | ${p.url}` : ""}${p.dates ? ` | ${p.dates}` : ""}\n${p.description}${p.tech ? `\nTech: ${p.tech}` : ""}`
        ).join("\n\n")}`,
      ].filter(Boolean).join("\n\n");

      const res = await fetch("/api/analyze-fit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          applicationId: id,
          jobDescription: app.jobDescription,
          masterResume: masterText,
          role: app.role,
          company: app.company,
          provider: userProfile?.aiProvider || "openai",
          apiKey: userProfile?.aiApiKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fit analysis failed");
      setApp((a) => a ? { ...a, fitScore: data.fitScore } : null);
      captureEvent(AnalyticsEvents.FIT_ANALYZED, { application_id: id ?? "" });
      toast.success("Fit analysis complete!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fit analysis failed";
      setFitError(msg);
      toast.error(msg);
    } finally {
      setFitLoading(false);
    }
  };

  const FIT_CARD_TITLES: Record<FitInsightCardType, string> = {
    strengths: "Strengths",
    gaps: "Gaps",
    suggestions: "Suggestions",
  };

  const buildMasterResumeText = (resume: MasterResume) => {
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

  const formatFitCardText = (cardKey: FitInsightCardType, items: string[]) => {
    const title = FIT_CARD_TITLES[cardKey];
    const lines = items.map((item, i) => `${i + 1}. ${item}`).join("\n");
    return `${title}:\n${lines}`;
  };

  const handleCopyFitCard = (cardKey: FitInsightCardType) => {
    const items = app?.fitScore?.[cardKey] ?? [];
    if (!items.length) return;
    navigator.clipboard.writeText(formatFitCardText(cardKey, items));
    setCopiedFitCard(cardKey);
    setTimeout(() => setCopiedFitCard(null), 2000);
    toast.success(`${FIT_CARD_TITLES[cardKey]} copied to clipboard`);
  };

  const handleIncorporateFitCard = async (cardKey: FitInsightCardType) => {
    const isMarc = user?.email === "marcsherwood@gmail.com";
    if (!app || !user || !id) return;

    const currentCV = (editForm.generatedCV || app.generatedCV || "").trim();
    if (!currentCV) {
      toast.error("Generate a CV first on the Documents tab.");
      return;
    }
    if (!masterResume) {
      toast.error("No master resume linked to this application.");
      return;
    }
    if (!app.jobDescription?.trim()) {
      toast.error("No job description saved for this application.");
      return;
    }
    if (!isMarc && !userProfile?.aiApiKey) {
      toast.error("No AI API key set. Go to Settings and add your key.");
      return;
    }

    const items = app.fitScore?.[cardKey] ?? [];
    if (!items.length) {
      toast.error(`No ${FIT_CARD_TITLES[cardKey].toLowerCase()} to incorporate.`);
      return;
    }

    const masterText = buildMasterResumeText(masterResume);
    if (!masterText.trim()) {
      toast.error("Your master resume has no content. Fill in sections in My Resume first.");
      return;
    }

    setIncorporatingCard(cardKey);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/incorporate-fit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentCV,
          items,
          cardType: cardKey,
          jobDescription: app.jobDescription,
          masterResume: masterText,
          role: app.role,
          company: app.company,
          provider: userProfile?.aiProvider || "openai",
          apiKey: userProfile?.aiApiKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update CV");

      const additive = typeof data.text === "string" ? data.text : "";
      const cardLabel = FIT_CARD_LABELS[cardKey] || cardKey;
      const merged = appendFitInsights(currentCV, additive, cardLabel);
      pushDocUndo("cv", currentCV);
      setEditForm((f) => ({ ...f, generatedCV: merged }));
      setApp((a) => (a ? { ...a, generatedCV: merged } : null));
      await updateApplication(user.uid, id, { generatedCV: merged });
      captureEvent(AnalyticsEvents.FIT_INCORPORATED, { card_type: cardKey });
      setActiveTab("cv");
      toast.success(`${cardLabel} appended to your CV — Undo available if needed`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update CV";
      toast.error(msg);
    } finally {
      setIncorporatingCard(null);
    }
  };

  const handleLiveSearch = async (role: SimilarRole) => {
    setLiveSearchLoading(role.searchQuery);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/search-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: role.searchQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setLiveSearchResults((prev) => ({ ...prev, [role.searchQuery]: data.results || [] }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Search failed";
      toast.error(msg);
    } finally {
      setLiveSearchLoading(null);
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

  const renderSidebar = () => (
    <div className="space-y-4">
      <Card className="bg-slate-900/40 border-white/5 shadow-md">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">Details</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(!editing)}
              className="h-7 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-white/5 rounded-lg"
            >
              {editing ? "Cancel" : <><Edit2 className="w-3 h-3 mr-1" />Edit</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm pt-4">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-semibold">Company</Label>
                <Input
                  value={editForm.company || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))}
                  className="h-8 text-sm bg-slate-950 border-white/5 text-white rounded-lg focus:border-indigo-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-semibold">Role</Label>
                <Input
                  value={editForm.role || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="h-8 text-sm bg-slate-950 border-white/5 text-white rounded-lg focus:border-indigo-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-semibold">Location</Label>
                <Input
                  value={editForm.location || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                  className="h-8 text-sm bg-slate-950 border-white/5 text-white rounded-lg focus:border-indigo-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-semibold">Salary Range</Label>
                <Input
                  value={editForm.salaryRange || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, salaryRange: e.target.value }))}
                  className="h-8 text-sm bg-slate-950 border-white/5 text-white rounded-lg focus:border-indigo-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-semibold">Org Type</Label>
                <Select
                  value={editForm.orgType || ""}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, orgType: v as OrgType }))}
                >
                  <SelectTrigger className="h-8 text-sm bg-slate-950 border-white/5 text-white rounded-lg">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/5 text-white">
                    {(Object.keys(ORG_TYPE_CONFIG) as OrgType[]).map((t) => (
                      <SelectItem key={t} value={t}>{ORG_TYPE_CONFIG[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1" />Save</>}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              {[
                { label: "Company", value: app.company },
                { label: "Role", value: app.role },
                { label: "Location", value: app.location },
                { label: "Salary", value: app.salaryRange },
                { label: "Org Type", value: app.orgType ? ORG_TYPE_CONFIG[app.orgType]?.label : undefined },
                { label: "Applied", value: app.appliedAt ? format(parseISO(app.appliedAt), "MMM d, yyyy") : "Draft" },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
                    <p className="font-semibold text-slate-200 mt-0.5">{value}</p>
                  </div>
                ) : null
              )}
              {masterResume && (() => {
                const catCfg = CATEGORY_CONFIG[masterResume.category || "general"];
                const CatIcon = getCategoryIcon(catCfg.iconName);
                return (
                  <div className="border-t border-white/5 pt-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Base Resume Link</p>
                    <div className="flex items-center gap-2 mt-1.5 font-semibold text-slate-200">
                      <div className={`p-1 rounded-lg border border-current/25 bg-current/10 ${catCfg.color}`}>
                        <CatIcon className="w-3.5 h-3.5" />
                      </div>
                      <Link href="/resume" className="hover:underline text-indigo-400 font-bold">
                        {masterResume.name}
                      </Link>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="bg-slate-900/40 border-white/5 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">Diary & Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={editForm.notes || ""}
            onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Log interviews, referrals, or checklists for this role..."
            className="min-h-28 text-xs bg-slate-950 border-white/5 text-white rounded-lg focus:border-indigo-500/30"
            onBlur={async () => {
              if (!user || !id) return;
              await updateApplication(user.uid, id, { notes: editForm.notes });
              setApp((a) => a ? { ...a, notes: editForm.notes || "" } : null);
            }}
          />
          <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mt-1.5 text-right">Auto-saves on blur</p>
        </CardContent>
      </Card>
    </div>
  );

  const cfg = STATUS_CONFIG[app.status];

  return (
    <div className={cn("p-4 sm:p-6 lg:p-8 mx-auto space-y-6 transition-all duration-300", activeTab === "interview" ? "max-w-[1600px]" : "max-w-5xl")}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-white/5 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 min-w-0">
          <Link href="/applications" className="inline-flex items-center justify-center rounded-xl hover:bg-white/5 text-slate-400 hover:text-white px-3 py-2 text-xs font-semibold border border-white/5 transition-all self-start">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight break-words">{app.role}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border border-current/25 bg-current/10 shrink-0 ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1.5 flex flex-wrap items-center gap-2 font-medium">
              <span className="text-white font-semibold">{app.company}</span>
              {app.location && <span>&bull; {app.location}</span>}
              {app.appliedAt && (
                <span>&bull; Applied {format(parseISO(app.appliedAt), "MMM d, yyyy")}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {app.jobUrl && (
            <a
              href={app.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold px-4 py-2 text-xs border border-white/5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              View Job
            </a>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyzeFit}
            disabled={fitLoading || !app.jobDescription}
            title={!masterResume ? "Select a resume variant first" : !app.jobDescription ? "No job description" : "Analyze fit vs your resume"}
            className="h-10 sm:h-8 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200 rounded-xl text-xs font-bold"
          >
            {fitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <BarChart2 className="w-3.5 h-3.5 mr-1" />}
            {fitLoading ? "Analyzing…" : app.fitScore ? `Fit: ${app.fitScore.overall}%` : "Analyze Fit"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDelete(true)}
            className="h-10 w-10 sm:h-8 sm:w-8 border-white/10 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Status updater */}
      <Card className="bg-slate-900/40 border-white/5 shadow-md">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Application stage
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tap a stage to move this application forward.
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-lg border border-current/25 bg-current/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
              <CheckCircle2 className="w-3 h-3" />
              Current: {cfg.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Update application stage">
            {(Object.keys(STATUS_CONFIG) as ApplicationStatus[]).map((s) => {
              const c = STATUS_CONFIG[s];
              const isActive = app.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(s)}
                  aria-pressed={isActive}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50",
                    isActive
                      ? `border-current/40 bg-current/15 ${c.color} shadow-[0_0_0_1px_rgba(255,255,255,0.06)]`
                      : "border-white/10 bg-slate-950/50 text-slate-400 hover:border-white/20 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  {c.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Workspace
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Open a section to edit docs, prep, or fit analysis.
              </p>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-white/10 p-1.5 rounded-2xl overflow-x-auto scrollbar-none">
            <TabsList className="bg-transparent border-0 gap-1.5 p-0 w-max min-w-full h-auto">
              <TabsTrigger
                value="cv"
                className={cn(
                  "group shrink-0 h-auto min-h-11 gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold cursor-pointer",
                  "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white",
                  "data-active:border-indigo-500/40 data-active:bg-indigo-500/15 data-active:text-indigo-100 data-active:shadow-sm"
                )}
              >
                <FileText className="w-3.5 h-3.5 opacity-70 group-data-active:opacity-100" />
                <span className="sm:hidden">CV</span>
                <span className="hidden sm:inline">Tailored CV</span>
              </TabsTrigger>
              <TabsTrigger
                value="cl"
                className={cn(
                  "group shrink-0 h-auto min-h-11 gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold cursor-pointer",
                  "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white",
                  "data-active:border-indigo-500/40 data-active:bg-indigo-500/15 data-active:text-indigo-100 data-active:shadow-sm"
                )}
              >
                <PenLine className="w-3.5 h-3.5 opacity-70 group-data-active:opacity-100" />
                <span className="sm:hidden">Letter</span>
                <span className="hidden sm:inline">Cover Letter</span>
              </TabsTrigger>
              <TabsTrigger
                value="jd"
                className={cn(
                  "group shrink-0 h-auto min-h-11 gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold cursor-pointer",
                  "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white",
                  "data-active:border-indigo-500/40 data-active:bg-indigo-500/15 data-active:text-indigo-100 data-active:shadow-sm"
                )}
              >
                <Search className="w-3.5 h-3.5 opacity-70 group-data-active:opacity-100" />
                <span className="sm:hidden">JD</span>
                <span className="hidden sm:inline">Job Description</span>
              </TabsTrigger>
              <TabsTrigger
                value="interview"
                className={cn(
                  "group shrink-0 h-auto min-h-11 gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold cursor-pointer",
                  "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white",
                  "data-active:border-indigo-500/40 data-active:bg-indigo-500/15 data-active:text-indigo-100 data-active:shadow-sm"
                )}
              >
                <MessageSquareText className="w-3.5 h-3.5 opacity-70 group-data-active:opacity-100" />
                <span className="sm:hidden">Prep</span>
                <span className="hidden sm:inline">Interview Prep</span>
              </TabsTrigger>
              <TabsTrigger
                value="fit"
                className={cn(
                  "group shrink-0 h-auto min-h-11 gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold cursor-pointer",
                  "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white",
                  "data-active:border-indigo-500/40 data-active:bg-indigo-500/15 data-active:text-indigo-100 data-active:shadow-sm"
                )}
              >
                <BarChart2 className="w-3.5 h-3.5 opacity-70 group-data-active:opacity-100" />
                Fit
                {app.fitScore && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-black ${
                    app.fitScore.overall >= 75 ? "bg-emerald-500/20 text-emerald-300" :
                    app.fitScore.overall >= 50 ? "bg-amber-500/20 text-amber-300" :
                    "bg-red-500/20 text-red-300"
                  }`}>{app.fitScore.overall}%</span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="cv">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-1 order-2 lg:order-1">{renderSidebar()}</div>
            <div className="lg:col-span-2 order-1 lg:order-2">
              <Card className="bg-slate-900/40 border-white/5 shadow-xl">
                <CardHeader className="pb-2 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">Tailored CV Segment</CardTitle>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {(app.generatedCV || editForm.generatedCV) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggest("cv")}
                          disabled={suggestLoading}
                          className="h-8 w-8 p-0 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg"
                          title="AI Suggestions"
                        >
                          <MessageSquareText className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerPdfUpload("cv")}
                        disabled={uploading === "cv"}
                        className="h-8 px-2 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold gap-1"
                        title="Upload or replace CV from PDF"
                      >
                        {uploading === "cv" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {getDocumentText("cv") ? "Replace PDF" : "Upload PDF"}
                        </span>
                      </Button>
                      {(app.generatedCV || editForm.generatedCV) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveDocument("cv")}
                          disabled={savingDoc === "cv"}
                          className="h-8 px-2 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold gap-1"
                          title="Save CV edits"
                        >
                          {savingDoc === "cv" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Save</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUndoDocument("cv")}
                        disabled={cvUndoStack.length === 0}
                        className="h-8 px-2 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold gap-1 disabled:opacity-40"
                        title="Undo last CV change"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Undo</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy("cv")}
                        disabled={!getDocumentText("cv")}
                        className="h-8 w-8 p-0 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg"
                        title="Copy CV"
                      >
                        {copied === "cv" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      <CvExportMenu
                        markdown={getDocumentText("cv")}
                        company={editForm.company || app.company || "Company"}
                        role={editForm.role || app.role || "Role"}
                        contact={contactFromProfile(
                          userProfile
                            ? {
                                ...userProfile,
                                email: userProfile.email || user?.email || "",
                              }
                            : null
                        )}
                        disabled={!getDocumentText("cv")}
                      />
                      {masterResume && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerate("cv")}
                          disabled={genLoading}
                          className="h-8 w-8 p-0 border-white/10 hover:bg-white/5 text-indigo-400 hover:text-indigo-300 rounded-lg"
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
                <CardContent className="pt-4">
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
                  {uploading === "cv" ? (
                    <div className="flex flex-col items-center justify-center min-h-[350px]">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                      <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Parsing PDF sections...</p>
                    </div>
                  ) : app.generatedCV || editForm.generatedCV || (generating === "cv" && completion) ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editForm.generatedCV || (generating === "cv" ? completion : "") || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, generatedCV: e.target.value }))
                        }
                        readOnly={genLoading && generating === "cv"}
                        placeholder="Paste or write your CV content here..."
                        className={`min-h-[300px] sm:min-h-[500px] font-mono text-xs bg-slate-950 border-white/5 text-slate-200 rounded-xl focus:border-indigo-500/30 ${genLoading && generating === "cv" ? "opacity-70" : ""}`}
                        onBlur={async () => {
                          if (!user || !id || (genLoading && generating === "cv")) return;
                          await updateApplication(user.uid, id, { generatedCV: editForm.generatedCV });
                          setApp((a) => a ? { ...a, generatedCV: editForm.generatedCV || "" } : null);
                        }}
                      />
                      <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider text-right">
                        Edits auto-save on blur, or use Save
                      </p>
                    </div>
                  ) : generating === "cv" && genLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[350px]">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                      <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Generating tailored CV...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[350px] text-slate-400 text-sm p-6">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-white text-base">No tailored CV yet</p>
                      <p className="text-xs text-slate-400 mt-1.5 mb-6 max-w-sm text-center leading-relaxed">
                        Customize your master resume for this role with AI, upload an existing PDF, or draft manually.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {masterResume && (
                          <Button
                            size="sm"
                            onClick={() => handleRegenerate("cv")}
                            disabled={genLoading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                          >
                            <Sparkles className="w-4 h-4 mr-1.5" />
                            AI Tailor Document
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerPdfUpload("cv")}
                          className="border-white/10 hover:bg-white/5 text-white rounded-xl font-bold"
                        >
                          <Upload className="w-4 h-4 mr-1.5" />
                          Upload CV PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartWriting("cv")}
                          className="border-white/10 hover:bg-white/5 text-white rounded-xl font-bold"
                        >
                          <PenLine className="w-4 h-4 mr-1.5" />
                          Start Writing
                        </Button>
                      </div>
                      {!masterResume && (
                        <p className="text-[10px] mt-4 text-slate-500 font-semibold uppercase tracking-wider">
                          <Link href="/resume" className="underline hover:text-slate-300">Link a base resume</Link> to unlock AI tailoring
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-1 order-2 lg:order-1">{renderSidebar()}</div>
            <div className="lg:col-span-2 order-1 lg:order-2">
              <Card className="bg-slate-900/40 border-white/5 shadow-xl">
                <CardHeader className="pb-2 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">Cover Letter Segment</CardTitle>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {(app.generatedCoverLetter || editForm.generatedCoverLetter) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggest("cl")}
                          disabled={suggestLoading}
                          className="h-8 w-8 p-0 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg"
                          title="AI Suggestions"
                        >
                          <MessageSquareText className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerPdfUpload("cl")}
                        disabled={uploading === "cl"}
                        className="h-8 px-2 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold gap-1"
                        title="Upload or replace cover letter from PDF"
                      >
                        {uploading === "cl" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {getDocumentText("cl") ? "Replace PDF" : "Upload PDF"}
                        </span>
                      </Button>
                      {(app.generatedCoverLetter || editForm.generatedCoverLetter) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveDocument("cl")}
                          disabled={savingDoc === "cl"}
                          className="h-8 px-2 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold gap-1"
                          title="Save cover letter edits"
                        >
                          {savingDoc === "cl" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Save</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUndoDocument("cl")}
                        disabled={clUndoStack.length === 0}
                        className="h-8 px-2 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold gap-1 disabled:opacity-40"
                        title="Undo last cover letter change"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Undo</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy("cl")}
                        disabled={!getDocumentText("cl")}
                        className="h-8 w-8 p-0 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg"
                        title="Copy cover letter"
                      >
                        {copied === "cl" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      {masterResume && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerate("cl")}
                          disabled={genLoading}
                          className="h-8 w-8 p-0 border-white/10 hover:bg-white/5 text-indigo-400 hover:text-indigo-300 rounded-lg"
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
                <CardContent className="pt-4">
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
                  {uploading === "cl" ? (
                    <div className="flex flex-col items-center justify-center min-h-[350px]">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                      <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Parsing PDF sections...</p>
                    </div>
                  ) : app.generatedCoverLetter || editForm.generatedCoverLetter || (generating === "cl" && completion) ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editForm.generatedCoverLetter || (generating === "cl" ? completion : "") || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, generatedCoverLetter: e.target.value }))
                        }
                        readOnly={genLoading && generating === "cl"}
                        placeholder="Paste or write your cover letter here..."
                        className={`min-h-[300px] sm:min-h-[500px] font-mono text-xs bg-slate-950 border-white/5 text-slate-200 rounded-xl focus:border-indigo-500/30 ${genLoading && generating === "cl" ? "opacity-70" : ""}`}
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
                      <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider text-right">
                        Edits auto-save on blur, or use Save
                      </p>
                    </div>
                  ) : generating === "cl" && genLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[350px]">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                      <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Generating cover letter...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[350px] text-slate-400 text-sm p-6">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-white text-base">No cover letter draft</p>
                      <p className="text-xs text-slate-400 mt-1.5 mb-6 max-w-sm text-center leading-relaxed">
                        Generate a custom cover letter mapped to the job details using AI, upload a file, or write it manually.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {masterResume && (
                          <Button
                            size="sm"
                            onClick={() => handleRegenerate("cl")}
                            disabled={genLoading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                          >
                            <Sparkles className="w-4 h-4 mr-1.5" />
                            AI Write Document
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerPdfUpload("cl")}
                          className="border-white/10 hover:bg-white/5 text-white rounded-xl font-bold"
                        >
                          <Upload className="w-4 h-4 mr-1.5" />
                          Upload Cover Letter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartWriting("cl")}
                          className="border-white/10 hover:bg-white/5 text-white rounded-xl font-bold"
                        >
                          <PenLine className="w-4 h-4 mr-1.5" />
                          Start Writing
                        </Button>
                      </div>
                      {!masterResume && (
                        <p className="text-[10px] mt-4 text-slate-500 font-semibold uppercase tracking-wider">
                          <Link href="/resume" className="underline hover:text-slate-300">Link a base resume</Link> to unlock AI cover letter drafts
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="jd">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-1 order-2 lg:order-1">{renderSidebar()}</div>
            <div className="lg:col-span-2 order-1 lg:order-2">
              <Card className="bg-slate-900/40 border-white/5 shadow-xl">
                <CardHeader className="pb-2 border-b border-white/5">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">Saved Job Description</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <Textarea
                    value={app.jobDescription || "No description saved."}
                    readOnly
                    className="min-h-[300px] sm:min-h-[500px] font-mono text-xs bg-slate-950 border-white/5 text-slate-300 rounded-xl"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="interview">
          <InterviewPrep
            application={app}
            userProfile={userProfile}
            masterResume={masterResume}
            user={user}
            onUpdate={async (update) => {
              if (!user || !id || !app) return;
              await updateApplication(user.uid, id, update);
              setApp((a) => a ? { ...a, ...update } : null);
            }}
          />
        </TabsContent>

        <TabsContent value="fit">
          {fitLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
              <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Analyzing your fit…</p>
              <p className="text-xs text-slate-500 mt-1">This usually takes 10–20 seconds</p>
            </div>
          ) : fitError ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mb-4" />
              <p className="text-sm font-bold text-white mb-1">Analysis failed</p>
              <p className="text-xs text-slate-400 mb-4 max-w-sm">{fitError}</p>
              <Button size="sm" onClick={handleAnalyzeFit} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
              </Button>
            </div>
          ) : !app.fitScore ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
                <BarChart2 className="w-8 h-8" />
              </div>
              <p className="text-base font-black text-white mb-1">No fit analysis yet</p>
              <p className="text-xs text-slate-400 mb-6 max-w-sm leading-relaxed">
                Click <strong>Analyze Fit</strong> to get an AI score of how well your resume matches this job, plus specific strengths, gaps, and similar roles to explore.
              </p>
              <Button
                onClick={handleAnalyzeFit}
                disabled={!app.jobDescription || !masterResume}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20"
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                Analyze Fit
              </Button>
              {!masterResume && (
                <p className="text-[10px] mt-3 text-slate-500">
                  <Link href="/resume" className="underline hover:text-slate-300">Add a master resume</Link> first to enable fit analysis
                </p>
              )}
            </div>
          ) : (() => {
            const fs: FitScore = app.fitScore;
            const scoreColor = (n: number) =>
              n >= 75 ? "text-emerald-300" : n >= 50 ? "text-amber-300" : "text-red-300";
            const scoreBg = (n: number) =>
              n >= 75 ? "bg-emerald-500" : n >= 50 ? "bg-amber-500" : "bg-red-500";
            const scoreGlow = (n: number) =>
              n >= 75 ? "shadow-emerald-500/30" : n >= 50 ? "shadow-amber-500/30" : "shadow-red-500/30";
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Overall score card */}
                  <Card className="bg-slate-900/60 border-white/5 shadow-xl rounded-2xl overflow-hidden">
                    <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overall Fit</p>
                      <div className={`text-6xl font-black ${scoreColor(fs.overall)} drop-shadow-lg ${scoreGlow(fs.overall)}`}>
                        {fs.overall}<span className="text-2xl text-slate-500">%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${scoreBg(fs.overall)}`}
                          style={{ width: `${fs.overall}%` }}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAnalyzeFit}
                        disabled={fitLoading}
                        className="mt-1 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-[10px] h-7"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Re-analyze
                      </Button>
                      {fs.generatedAt && (
                        <p className="text-[10px] text-slate-600">
                          {new Date(fs.generatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Breakdown bars */}
                  <Card className="bg-slate-900/60 border-white/5 shadow-xl rounded-2xl overflow-hidden md:col-span-2">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 space-y-3">
                      {(["skills", "experience", "keywords", "culture"] as const).map((key) => {
                        const val = fs.breakdown?.[key] ?? 0;
                        const labels: Record<string, string> = { skills: "Skills Match", experience: "Experience Level", keywords: "Keyword Alignment", culture: "Culture Fit" };
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-300 font-medium">{labels[key]}</span>
                              <span className={`text-xs font-bold ${scoreColor(val)}`}>{val}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-700 ${scoreBg(val)}`}
                                style={{ width: `${val}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>

                {/* Strengths, Gaps, Suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FitInsightCard
                    title="Strengths"
                    icon={CheckCircle2}
                    color="emerald"
                    items={fs.strengths ?? []}
                    cardKey="strengths"
                    emptyLabel="No strengths identified"
                    onCopy={handleCopyFitCard}
                    onIncorporate={handleIncorporateFitCard}
                    isCopied={copiedFitCard === "strengths"}
                    isIncorporating={incorporatingCard === "strengths"}
                  />
                  <FitInsightCard
                    title="Gaps"
                    icon={AlertTriangle}
                    color="red"
                    items={fs.gaps ?? []}
                    cardKey="gaps"
                    emptyLabel="No gaps identified"
                    onCopy={handleCopyFitCard}
                    onIncorporate={handleIncorporateFitCard}
                    isCopied={copiedFitCard === "gaps"}
                    isIncorporating={incorporatingCard === "gaps"}
                  />
                  <FitInsightCard
                    title="Suggestions"
                    icon={Lightbulb}
                    color="indigo"
                    items={fs.suggestions ?? []}
                    cardKey="suggestions"
                    emptyLabel="No suggestions yet"
                    onCopy={handleCopyFitCard}
                    onIncorporate={handleIncorporateFitCard}
                    isCopied={copiedFitCard === "suggestions"}
                    isIncorporating={incorporatingCard === "suggestions"}
                  />
                </div>

                {/* Similar roles */}
                {fs.similarRoles?.length > 0 && (
                  <Card className="bg-slate-900/60 border-white/5 rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-purple-400">Similar Roles to Explore</span>
                      </CardTitle>
                      <p className="text-[10px] text-slate-500 mt-1">Based on your profile — these orgs and roles are likely strong matches.</p>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {fs.similarRoles.map((role, i) => (
                          <div key={i} className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-1.5">
                            <div>
                              <p className="text-sm font-bold text-white">{role.role}</p>
                              <p className="text-xs text-purple-300 font-medium">{role.company}</p>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">{role.reason}</p>
                            <div className="flex gap-2 pt-1">
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(role.searchQuery)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 hover:text-purple-200 hover:underline"
                              >
                                <Search className="w-3 h-3" /> Search Google
                              </a>
                              <button
                                type="button"
                                onClick={() => handleLiveSearch(role)}
                                disabled={liveSearchLoading === role.searchQuery}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 disabled:opacity-40"
                              >
                                {liveSearchLoading === role.searchQuery ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Search className="w-3 h-3" />
                                )}
                                Live Search
                              </button>
                            </div>
                            {liveSearchResults[role.searchQuery]?.length > 0 && (
                              <div className="mt-2 space-y-1.5 border-t border-white/5 pt-2">
                                {liveSearchResults[role.searchQuery].map((r, j) => (
                                  <a
                                    key={j}
                                    href={r.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block rounded-lg bg-slate-950/50 border border-white/5 p-2 hover:border-purple-500/30 transition-colors"
                                  >
                                    <p className="text-[11px] font-semibold text-white leading-tight line-clamp-1">{r.title}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{r.snippet}</p>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <TipCelebrationDialog
        open={tipMilestone !== null}
        status={tipMilestone}
        company={app.company}
        role={app.role}
        onOpenChange={(open) => {
          if (!open) setTipMilestone(null);
        }}
      />

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-slate-900 border-white/5 rounded-2xl max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Delete this application?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400 py-2">
            Deleting <strong>{app.role} at {app.company}</strong> is permanent and cannot be undone.
          </p>
          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDelete(false)} className="border-white/10 hover:bg-white/5 text-white rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white rounded-xl">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={suggestOpen !== null} onOpenChange={(open) => { if (!open) setSuggestOpen(null); }}>
        <DialogContent className="bg-slate-900 border-white/5 rounded-2xl max-w-2xl max-h-[80vh] overflow-y-auto p-6">
          <DialogHeader className="border-b border-white/5 pb-3">
            <DialogTitle className="flex items-center gap-2 text-white font-bold">
              <MessageSquareText className="w-5 h-5 text-indigo-400" />
              AI Suggestions &bull; {suggestOpen === "cv" ? "CV Review" : "Cover Letter Review"}
            </DialogTitle>
          </DialogHeader>
          {suggestLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
              <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Analyzing your document copy...</p>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-slate-300 py-4 font-sans">
              {suggestions}
            </div>
          )}
          <DialogFooter className="border-t border-white/5 pt-4">
            <Button variant="outline" onClick={() => setSuggestOpen(null)} className="border-white/10 hover:bg-white/5 text-white rounded-xl">
              <X className="w-4 h-4 mr-1.5" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
