"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  Plus,
  Save,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  Edit2,
  Loader2,
  Upload,
  Check,
  X,
  Link,
  Calendar,
  Cpu,
  Compass,
  Megaphone,
  Sliders,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { getMasterResumes, saveMasterResume, deleteMasterResume, getUserProfile, getApplications } from "@/lib/db";
import { SEED_RESUMES } from "@/lib/seed-resumes";
import type { MasterResume, UserProfile, ProjectEntry, Application } from "@/lib/types";
import { STATUS_CONFIG, CATEGORY_CONFIG, type ResumeCategory } from "@/lib/types";
import { toast } from "sonner";
import { AnalyticsEvents, captureEvent } from "@/lib/analytics";

const SECTION_LABELS: Record<string, string> = {
  summary: "Professional Summary",
  experience: "Work Experience",
  skills: "Skills",
  education: "Education",
  certifications: "Certifications",
};

const SECTION_PLACEHOLDERS: Record<string, string> = {
  summary:
    "A compelling 2-3 sentence overview of who you are, what you do, and what you bring to the table...",
  experience:
    "List each role with: Company | Title | Dates\n- Key achievement 1 (with numbers if possible)\n- Key achievement 2\n- Key achievement 3",
  skills:
    "Technical: TypeScript, React, Node.js, Python...\nTools: GitHub, Figma, AWS...\nSoft Skills: Leadership, Communication...",
  education:
    "University Name | Degree | Graduation Year\nRelevant coursework, honors, activities...",
  certifications: "Certification Name | Issuer | Year\n...",
};

const EMPTY_PROJECT: ProjectEntry = { name: "", url: "", description: "", tech: "", dates: "" };

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

export default function ResumePage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<MasterResume[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editData, setEditData] = useState<MasterResume | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<ResumeCategory>("general");
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedSections, setParsedSections] = useState<MasterResume["sections"] | null>(null);
  const [showOverwrite, setShowOverwrite] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProjectIdx, setEditingProjectIdx] = useState<number | null>(null);
  const [projectDraft, setProjectDraft] = useState<ProjectEntry>(EMPTY_PROJECT);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getMasterResumes(user.uid),
      getApplications(user.uid),
    ]).then(([rs, apps]) => {
      setResumes(rs);
      setApplications(apps);
      if (rs.length > 0) {
        // If there's an activeId, find it, otherwise default to first
        const active = rs.find((r) => r.id === activeId) || rs[0];
        setActiveId(active.id);
        setEditData(active);
      }
      setLoading(false);
    });
    getUserProfile(user.uid).then(setUserProfile);
  }, [user, activeId]);

  const activeUsageStats = useMemo(() => {
    if (!editData) return null;
    const variantApps = applications.filter((a) => a.resumeUsed === editData.id);
    const total = variantApps.length;
    const statusCounts: Record<string, number> = {};
    variantApps.forEach((a) => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });
    return { total, statusCounts };
  }, [applications, editData?.id]);

  const handleSelect = (r: MasterResume) => {
    setActiveId(r.id);
    setEditData({ ...r });
  };

  const handleSectionChange = (section: keyof Omit<MasterResume["sections"], "projects">, value: string) => {
    if (!editData) return;
    const sections = editData.sections || { summary: "", experience: "", skills: "", education: "" };
    setEditData((d) =>
      d ? { ...d, sections: { ...sections, [section]: value } } : d
    );
  };

  const openNewProject = () => {
    setProjectDraft({ ...EMPTY_PROJECT });
    setEditingProjectIdx(null);
    setShowProjectForm(true);
  };

  const openEditProject = (idx: number) => {
    const p = editData?.sections?.projects?.[idx];
    if (!p) return;
    setProjectDraft({ ...p });
    setEditingProjectIdx(idx);
    setShowProjectForm(true);
  };

  const saveProjectDraft = () => {
    if (!editData || !projectDraft.name.trim()) return;
    const sections = editData.sections || { summary: "", experience: "", skills: "", education: "" };
    const projects = Array.isArray(sections.projects) ? [...sections.projects] : [];
    if (editingProjectIdx === null) {
      projects.push(projectDraft);
    } else {
      projects[editingProjectIdx] = projectDraft;
    }
    setEditData((d) => d ? { ...d, sections: { ...sections, projects } } : d);
    setShowProjectForm(false);
  };

  const deleteProject = (idx: number) => {
    if (!editData) return;
    const sections = editData.sections || { summary: "", experience: "", skills: "", education: "" };
    const projects = (Array.isArray(sections.projects) ? sections.projects : []).filter((_, i) => i !== idx);
    setEditData((d) => d ? { ...d, sections: { ...sections, projects } } : d);
  };

  const moveProject = (idx: number, dir: -1 | 1) => {
    if (!editData) return;
    const sections = editData.sections || { summary: "", experience: "", skills: "", education: "" };
    const projects = [...(Array.isArray(sections.projects) ? sections.projects : [])];
    const target = idx + dir;
    if (target < 0 || target >= projects.length) return;
    [projects[idx], projects[target]] = [projects[target], projects[idx]];
    setEditData((d) => d ? { ...d, sections: { ...sections, projects } } : d);
  };

  const handleSave = async () => {
    if (!user || !editData) return;
    setSaving(true);
    try {
      const id = await saveMasterResume(
        user.uid,
        {
          name: editData.name,
          category: editData.category || "general",
          sections: editData.sections,
          pdfUrl: editData.pdfUrl,
        },
        editData.id
      );
      const updated = { ...editData, id };
      setResumes((rs) =>
        rs.some((r) => r.id === id) ? rs.map((r) => (r.id === id ? updated : r)) : [...rs, updated]
      );
      setActiveId(id);
      captureEvent(AnalyticsEvents.MASTER_RESUME_SAVED, {
        variant_count: resumes.some((r) => r.id === id) ? resumes.length : resumes.length + 1,
      });
      toast.success("Resume saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save resume");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async () => {
    if (!user || !newName.trim()) return;
    setSaving(true);
    try {
      const id = await saveMasterResume(user.uid, {
        name: newName.trim(),
        category: newCategory,
        sections: { summary: "", experience: "", skills: "", education: "" },
      });
      const created: MasterResume = {
        id,
        uid: user.uid,
        name: newName.trim(),
        category: newCategory,
        sections: { summary: "", experience: "", skills: "", education: "" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setResumes((rs) => [created, ...rs]);
      setActiveId(id);
      setEditData(created);
      setShowNew(false);
      setNewName("");
      setNewCategory("general");
      toast.success("New resume created!");
    } catch {
      toast.error("Failed to create resume");
    } finally {
      setSaving(false);
    }
  };

  const handleSeedBaseResumes = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const created: MasterResume[] = [];
      for (const seed of SEED_RESUMES) {
        const id = await saveMasterResume(user.uid, {
          name: seed.name,
          category: seed.category,
          sections: seed.sections,
        });
        created.push({
          id,
          uid: user.uid,
          name: seed.name,
          category: seed.category,
          sections: seed.sections,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setResumes((rs) => [...created, ...rs]);
      setActiveId(created[0].id);
      setEditData(created[0]);
      toast.success(`${created.length} base resumes created!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to seed base resumes");
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deleteMasterResume(user.uid, id);
    const remaining = resumes.filter((r) => r.id !== id);
    setResumes(remaining);
    if (activeId === id) {
      const next = remaining[0] || null;
      setActiveId(next?.id || null);
      setEditData(next);
    }
    setShowDelete(null);
    toast.success("Resume deleted");
  };

  const hasAnyContent = (sections: MasterResume["sections"]) =>
    sections && Object.values(sections).some((v) =>
      Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim().length > 0
    );

  const applyParsedSections = (sections: MasterResume["sections"]) => {
    setEditData((d) => d ? { ...d, sections } : d);
    toast.success("Resume parsed from PDF — review each section then save.");
  };

  const handleParsedSectionsReady = (sections: MasterResume["sections"]) => {
    if (editData && hasAnyContent(editData.sections)) {
      setParsedSections(sections);
      setShowOverwrite(true);
    } else {
      applyParsedSections(sections);
    }
  };

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !editData || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    // Reset so same file can be re-selected
    e.target.value = "";
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    const isMarc = user?.email === "marcsherwood@gmail.com";
    if (!isMarc && !userProfile?.aiApiKey) {
      toast.info("Add an AI API key in Settings to auto-fill sections from a PDF.");
      return;
    }

    // Send PDF to our server API for parsing — avoids Firebase Storage CORS entirely
    setParsing(true);
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

      if (!res.ok) {
        toast.error(data.error || "Failed to parse resume");
        return;
      }

      handleParsedSectionsReady(data.sections as MasterResume["sections"]);
    } catch {
      toast.error("Could not parse resume. You can still fill in sections manually.");
    } finally {
      setParsing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header — compact */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">Resumes</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Store your resume variants here. The AI will tailor them for each job.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {resumes.length === 0 && (
            <Button
              variant="outline"
              onClick={handleSeedBaseResumes}
              disabled={seeding}
              className="border-white/5 hover:bg-white/5 hover:text-white rounded-xl text-xs font-semibold px-4 py-2"
            >
              {seeding ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" />}
              Seed Base Resumes
            </Button>
          )}
          <Button
            onClick={() => setShowNew(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-4 py-2.5 text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all hover:-translate-y-[1px] rounded-xl border-none"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Variant
          </Button>
        </div>
      </div>

      {resumes.length === 0 ? (
        <Card className="text-center py-16 bg-slate-900/40 border-white/5 shadow-xl overflow-hidden rounded-2xl">
          <CardContent className="p-6">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                <Zap className="w-8 h-8 text-indigo-400 animate-pulse" />
              </div>
              <h3 className="font-black text-white text-xl tracking-tight">Get started with your base resumes</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Seed all three base resume variants — GTM, Sales Ops, and Revenue & Special Projects — with your real content in one click.
              </p>
              <Button
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-5 rounded-xl border-none shadow-lg shadow-indigo-500/20"
                onClick={handleSeedBaseResumes}
                disabled={seeding}
              >
                {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2 text-amber-300" />}
                Seed All 3 Base Resumes
              </Button>
              <div className="flex items-center gap-3 text-xs text-slate-500 my-4">
                <div className="flex-1 h-[1px] bg-white/5" />
                <span>or</span>
                <div className="flex-1 h-[1px] bg-white/5" />
              </div>
              <Button
                variant="outline"
                className="w-full border-white/5 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl py-5"
                onClick={() => setShowNew(true)}
              >
                <Plus className="w-4 h-4 mr-2 text-indigo-400" />
                Create one manually
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar: Resume list */}
          <div className="space-y-2">
            {resumes.map((r) => {
              const catCfg = CATEGORY_CONFIG[r.category || "general"];
              const CatIcon = getCategoryIcon(catCfg.iconName);
              const isActive = activeId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-all ${
                    isActive
                      ? "bg-indigo-600/15 text-white border-indigo-500/40 shadow-md shadow-indigo-500/5"
                      : "bg-slate-900/40 border-white/5 text-slate-400 hover:text-white hover:border-white/10 hover:bg-slate-900/60"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${isActive ? "bg-indigo-500/10" : "bg-white/5"}`}>
                    <CatIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-400" : catCfg.color}`} />
                  </div>
                  <span className="font-semibold text-xs truncate flex-1">{r.name}</span>
                </button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl py-4.5"
              onClick={() => setShowNew(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              New variant
            </Button>
          </div>

          {/* Editor */}
          {editData && (
            <div className="col-span-1 md:col-span-3 space-y-4">
              {/* Name + actions */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center bg-slate-900/40 border border-white/5 p-3 rounded-2xl shadow-md">
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData((d) => d ? { ...d, name: e.target.value } : d)}
                    className="font-black text-base h-10 bg-slate-950/60 border-white/5 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 text-white rounded-xl shadow-inner flex-1"
                  />
                  <Select
                    value={editData.category || "general"}
                    onValueChange={(val) => setEditData((d) => d ? { ...d, category: val as ResumeCategory } : d)}
                  >
                    <SelectTrigger className="w-40 h-10 font-bold text-xs bg-slate-950/60 border-white/5 focus:ring-indigo-500/30 text-white rounded-xl">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10 text-white">
                      <SelectItem value="general" className="text-xs focus:bg-white/5 focus:text-white">General / Other</SelectItem>
                      <SelectItem value="gtm" className="text-xs focus:bg-white/5 focus:text-white">GTM Based</SelectItem>
                      <SelectItem value="marketing" className="text-xs focus:bg-white/5 focus:text-white">Marketing Focused</SelectItem>
                      <SelectItem value="sales_ops" className="text-xs focus:bg-white/5 focus:text-white">Sales Ops</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-10 px-4 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl border-none shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all hover:-translate-y-[1px]"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <><Save className="w-3.5 h-3.5 mr-1.5" />Save Changes</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-white/5 hover:border-rose-500/30 rounded-xl"
                    onClick={() => setShowDelete(editData.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Usage stats badge */}
              {activeUsageStats && (
                <div className="inline-flex flex-wrap items-center gap-2 text-[11px] bg-slate-900/30 text-slate-400 px-3 py-2 rounded-xl border border-white/5 shadow-inner">
                  <span className="font-bold text-slate-300">Usage Tracker:</span>
                  {activeUsageStats.total === 0 ? (
                    <span className="text-slate-500 italic">Not used in any applications yet.</span>
                  ) : (
                    <>
                      <span>Used in {activeUsageStats.total} application{activeUsageStats.total > 1 ? "s" : ""}</span>
                      {Object.entries(activeUsageStats.statusCounts).map(([status, count]) => {
                        const sCfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                        return (
                          <span
                            key={status}
                            className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wide border border-white/5 ${sCfg?.bgColor || "bg-white/5"} ${sCfg?.color || "text-slate-300"}`}
                          >
                            {count} {sCfg?.label}
                          </span>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {/* Sections */}
              <Tabs defaultValue="summary" className="space-y-4">
                <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-slate-950/60 border border-white/5 rounded-xl shadow-inner w-fit">
                  {Object.keys(SECTION_LABELS).map((key) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="text-xs font-bold px-3 py-2 text-slate-400 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all"
                    >
                      {key === "summary" ? "Summary" :
                       key === "experience" ? "Experience" :
                       key === "skills" ? "Skills" :
                       key === "education" ? "Education" : "Certs"}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger
                    value="projects"
                    className="text-xs font-bold px-3 py-2 text-slate-400 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all"
                  >
                    Projects
                  </TabsTrigger>
                  <TabsTrigger
                    value="pdf"
                    className="text-xs font-bold px-3 py-2 text-slate-400 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all"
                  >
                    PDF Upload
                  </TabsTrigger>
                </TabsList>

                {Object.entries(SECTION_LABELS).map(([key, label]) => (
                  <TabsContent key={key} value={key} className="focus-visible:outline-none">
                    <Card className="bg-slate-900/40 border-white/5 shadow-xl rounded-2xl overflow-hidden">
                      <CardHeader className="pb-2 pt-4 px-5">
                        <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">{label}</CardTitle>
                      </CardHeader>
                      <CardContent className="px-5 pb-4">
                        <Textarea
                          value={(editData.sections?.[key as keyof Omit<MasterResume["sections"], "projects">] as string) || ""}
                          onChange={(e) =>
                            handleSectionChange(
                              key as keyof Omit<MasterResume["sections"], "projects">,
                              e.target.value
                            )
                          }
                          placeholder={SECTION_PLACEHOLDERS[key] || ""}
                          className="min-h-72 font-mono text-xs bg-slate-950/60 border-white/5 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 text-slate-300 placeholder:text-slate-650 rounded-xl p-4 shadow-inner"
                        />
                        <div className="flex justify-between items-center mt-2.5">
                          <span className="text-[10px] text-slate-500 font-medium">
                            {((editData.sections?.[key as keyof Omit<MasterResume["sections"], "projects">] as string) || "").length} characters
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Auto-Saved Draft</span>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}

                {/* Projects structured editor */}
                <TabsContent value="projects" className="focus-visible:outline-none">
                  <Card className="bg-slate-900/40 border-white/5 shadow-xl rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">Projects / Portfolio</CardTitle>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={openNewProject}
                          className="border-white/5 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl text-xs font-semibold px-3 py-1.5 h-8"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                          Add Project
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 px-5 pb-4">
                      {(!editData.sections || !Array.isArray(editData.sections.projects) || editData.sections.projects.length === 0) && (
                        <div className="text-center py-12 text-slate-500">
                          <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-40 animate-pulse" />
                          <p className="text-xs font-medium">No projects yet. Click &ldquo;Add Project&rdquo; to get started.</p>
                        </div>
                      )}
                      {(editData.sections && Array.isArray(editData.sections.projects) ? editData.sections.projects : []).map((proj, idx) => (
                        <div key={idx} className="flex gap-3 items-start rounded-xl border border-white/5 bg-slate-950/40 p-4 shadow-sm hover:border-white/10 transition-all">
                          <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                            <button
                              type="button"
                              onClick={() => moveProject(idx, -1)}
                              disabled={idx === 0}
                              className="text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              aria-label="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveProject(idx, 1)}
                              disabled={idx === (editData.sections && Array.isArray(editData.sections.projects) ? editData.sections.projects.length : 0) - 1}
                              className="text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              aria-label="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-bold text-sm text-white truncate">{proj.name}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                              {proj.url && (
                                <span className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
                                  <Link className="w-3.5 h-3.5 text-indigo-400" />
                                  <a href={proj.url} target="_blank" rel="noreferrer" className="hover:underline">{proj.url}</a>
                                </span>
                              )}
                              {proj.tech && (
                                <span className="flex items-center gap-1.5 text-xs text-purple-300 font-medium">
                                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                                  {proj.tech}
                                </span>
                              )}
                              {proj.dates && (
                                <span className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                  {proj.dates}
                                </span>
                              )}
                            </div>
                            {proj.description && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">{proj.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white" onClick={() => openEditProject(idx)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg" onClick={() => deleteProject(idx)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pdf" className="focus-visible:outline-none">
                  <Card className="bg-slate-900/40 border-white/5 shadow-xl rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">Upload & Auto-Parse PDF</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-5 pb-5">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Upload your existing resume PDF and the AI will automatically extract and fill in the
                        Summary, Experience, Skills, Education, Certifications, and Projects sections.
                        {!userProfile?.aiApiKey && (
                          <span className="block mt-1.5 text-amber-400 font-semibold flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg w-fit">
                            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            Add an AI API key in Settings to enable auto-parsing.
                          </span>
                        )}
                      </p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleUploadPdf}
                      />
                      {editData.pdfUrl ? (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-950/60 border border-white/5 shadow-inner">
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-inner">
                            <FileText className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-white">PDF Uploaded</p>
                            <a
                              href={editData.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold hover:underline truncate block mt-0.5"
                            >
                              View / Download Resume PDF →
                            </a>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-white/5 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl text-xs"
                            onClick={() => fileRef.current?.click()}
                            disabled={parsing}
                          >
                            {parsing ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Parsing…</>
                            ) : (
                              "Replace & Re-parse"
                            )}
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="w-full border border-dashed border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all h-28 rounded-xl flex flex-col items-center justify-center gap-1.5 group cursor-pointer"
                          onClick={() => fileRef.current?.click()}
                          disabled={parsing}
                        >
                          {parsing ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                              <span className="text-xs text-slate-400 font-bold tracking-wider uppercase animate-pulse">Extracting resume sections…</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shadow-inner group-hover:border-indigo-500/20 group-hover:bg-indigo-500/10 transition-colors">
                                <Upload className="w-4.5 h-4.5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                              </div>
                              <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Click to upload PDF</span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                AI will auto-fill all sections of this resume
                              </span>
                            </div>
                          )}
                        </button>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Save reminder */}
              <p className="text-[10px] text-slate-500 text-center font-medium">
                * Remember to save after editing sections.
              </p>
            </div>
          )}
        </div>
      )}

      {/* New Resume Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="bg-slate-950 border border-white/10 text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-white">Create New Resume Variant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Variant Name</Label>
              <Input
                placeholder='e.g. "Senior Engineer", "Startup Focus", "Leadership Role"'
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateNew()}
                className="bg-slate-900 border-white/5 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 text-white rounded-xl placeholder:text-slate-655"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Variant Category</Label>
              <Select
                value={newCategory}
                onValueChange={(val) => setNewCategory(val as ResumeCategory)}
              >
                <SelectTrigger className="w-full bg-slate-900 border-white/5 text-white rounded-xl font-medium">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-white">
                  <SelectItem value="general" className="text-xs focus:bg-white/5 focus:text-white">General / Other</SelectItem>
                  <SelectItem value="gtm" className="text-xs focus:bg-white/5 focus:text-white">GTM Based</SelectItem>
                  <SelectItem value="marketing" className="text-xs focus:bg-white/5 focus:text-white">Marketing Focused</SelectItem>
                  <SelectItem value="sales_ops" className="text-xs focus:bg-white/5 focus:text-white">Sales Ops</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNew(false)} className="border-white/5 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl">Cancel</Button>
            <Button onClick={handleCreateNew} disabled={saving || !newName.trim()} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl border-none">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Variant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overwrite confirmation Dialog */}
      <Dialog open={showOverwrite} onOpenChange={(o) => { if (!o) { setShowOverwrite(false); setParsedSections(null); } }}>
        <DialogContent className="bg-slate-950 border border-white/10 text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-white">Replace existing content?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400 leading-relaxed">
            This resume already has content in some sections. Parsing the PDF will overwrite all
            sections with the extracted content. This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowOverwrite(false); setParsedSections(null); }} className="border-white/5 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl">
              Keep Existing
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl border-none"
              onClick={() => {
                if (parsedSections) applyParsedSections(parsedSections);
                setShowOverwrite(false);
                setParsedSections(null);
              }}
            >
              Replace with PDF Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!showDelete} onOpenChange={(o) => !o && setShowDelete(null)}>
        <DialogContent className="bg-slate-950 border border-white/10 text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-white">Delete Resume Variant</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400 leading-relaxed">
            This will permanently delete this resume variant. Applications that used it will keep
            their generated documents.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDelete(null)} className="border-white/5 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={() => showDelete && handleDelete(showDelete)} className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl border-none">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Edit Dialog */}
      <Dialog open={showProjectForm} onOpenChange={(o) => { if (!o) setShowProjectForm(false); }}>
        <DialogContent className="max-w-lg bg-slate-950 border border-white/10 text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-white">{editingProjectIdx === null ? "Add Project" : "Edit Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="proj-name" className="text-xs font-bold text-slate-300 uppercase tracking-wider">Project Name <span className="text-rose-400">*</span></Label>
              <Input
                id="proj-name"
                placeholder="My Awesome Project"
                value={projectDraft.name}
                onChange={(e) => setProjectDraft((d) => ({ ...d, name: e.target.value }))}
                className="bg-slate-900 border-white/5 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 text-white rounded-xl placeholder:text-slate-655"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-url" className="text-xs font-bold text-slate-300 uppercase tracking-wider">URL</Label>
              <Input
                id="proj-url"
                placeholder="https://github.com/you/project"
                value={projectDraft.url ?? ""}
                onChange={(e) => setProjectDraft((d) => ({ ...d, url: e.target.value }))}
                className="bg-slate-900 border-white/5 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 text-white rounded-xl placeholder:text-slate-655"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-dates" className="text-xs font-bold text-slate-300 uppercase tracking-wider">Dates</Label>
              <Input
                id="proj-dates"
                placeholder="Jan 2024 – Present"
                value={projectDraft.dates ?? ""}
                onChange={(e) => setProjectDraft((d) => ({ ...d, dates: e.target.value }))}
                className="bg-slate-900 border-white/5 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 text-white rounded-xl placeholder:text-slate-655"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-tech" className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tech Stack</Label>
              <Input
                id="proj-tech"
                placeholder="React, TypeScript, Node.js"
                value={projectDraft.tech ?? ""}
                onChange={(e) => setProjectDraft((d) => ({ ...d, tech: e.target.value }))}
                className="bg-slate-900 border-white/5 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 text-white rounded-xl placeholder:text-slate-655"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-desc" className="text-xs font-bold text-slate-300 uppercase tracking-wider">Description <span className="text-rose-400">*</span></Label>
              <Textarea
                id="proj-desc"
                placeholder="What does this project do? What impact did it have?"
                value={projectDraft.description}
                onChange={(e) => setProjectDraft((d) => ({ ...d, description: e.target.value }))}
                className="min-h-24 bg-slate-900 border-white/5 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 text-slate-300 placeholder:text-slate-655 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowProjectForm(false)} className="border-white/5 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl">
              <X className="w-3.5 h-3.5 mr-1" />
              Cancel
            </Button>
            <Button onClick={saveProjectDraft} disabled={!projectDraft.name.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl border-none">
              <Check className="w-3.5 h-3.5 mr-1" />
              {editingProjectIdx === null ? "Add Project" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
