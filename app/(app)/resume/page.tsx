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
    if (!userProfile?.aiApiKey) {
      toast.info("Add an AI API key in Settings to auto-fill sections from a PDF.");
      return;
    }

    // Send PDF to our server API for parsing — avoids Firebase Storage CORS entirely
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("provider", userProfile.aiProvider || "openai");
      formData.append("apiKey", userProfile.aiApiKey);

      const res = await fetch("/api/parse-resume", { method: "POST", body: formData });
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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Master Resumes</h1>
          <p className="text-muted-foreground mt-1">
            Store your resume variants here. The AI will tailor them for each job.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {resumes.length === 0 && (
            <Button variant="outline" onClick={handleSeedBaseResumes} disabled={seeding}>
              {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Seed Base Resumes
            </Button>
          )}
          <Button onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Variant
          </Button>
        </div>
      </div>

      {resumes.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <div className="max-w-md mx-auto">
              <Zap className="w-12 h-12 mx-auto mb-4 text-primary/40" />
              <p className="font-semibold text-foreground text-lg">Get started with your base resumes</p>
              <p className="text-sm text-muted-foreground mt-2">
                Seed all three base resume variants — GTM, Sales Ops, and Revenue & Special Projects — with your real content in one click.
              </p>
              <Button className="mt-5" size="lg" onClick={handleSeedBaseResumes} disabled={seeding}>
                {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                Seed All 3 Base Resumes
              </Button>
              <p className="text-xs text-muted-foreground mt-3">or</p>
              <Button variant="ghost" size="sm" className="mt-1" onClick={() => setShowNew(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create one manually
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          {/* Sidebar: Resume list */}
          <div className="space-y-2">
            {resumes.map((r) => {
              const catCfg = CATEGORY_CONFIG[r.category || "general"];
              const CatIcon = getCategoryIcon(catCfg.iconName);
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                    activeId === r.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border hover:border-primary/50"
                  }`}
                >
                  <CatIcon className={`w-4 h-4 shrink-0 ${activeId === r.id ? "text-primary-foreground" : catCfg.color}`} />
                  <span className="font-medium text-sm truncate">{r.name}</span>
                </button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowNew(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New variant
            </Button>
          </div>

          {/* Editor */}
          {editData && (
            <div className="col-span-3 space-y-4">
              {/* Name + actions */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex-1 flex gap-3">
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData((d) => d ? { ...d, name: e.target.value } : d)}
                    className="font-semibold text-lg h-11"
                  />
                  <Select
                    value={editData.category || "general"}
                    onValueChange={(val) => setEditData((d) => d ? { ...d, category: val as ResumeCategory } : d)}
                  >
                    <SelectTrigger className="w-44 h-11 font-medium text-sm border-border">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General / Other</SelectItem>
                      <SelectItem value="gtm">GTM Based</SelectItem>
                      <SelectItem value="marketing">Marketing Focused</SelectItem>
                      <SelectItem value="sales_ops">Sales Ops</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleSave} disabled={saving} className="shrink-0 h-11 px-5">
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Save className="w-4 h-4 mr-2" />Save</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-11 w-11 text-destructive hover:text-destructive"
                    onClick={() => setShowDelete(editData.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Usage stats badge */}
              {activeUsageStats && (
                <div className="inline-flex flex-wrap items-center gap-2 text-xs bg-muted/50 text-muted-foreground px-3 py-1.5 rounded-lg border border-border">
                  <span className="font-semibold text-foreground">Usage Tracker:</span>
                  {activeUsageStats.total === 0 ? (
                    <span>Not used in any applications yet.</span>
                  ) : (
                    <>
                      <span>Used in {activeUsageStats.total} application{activeUsageStats.total > 1 ? "s" : ""}</span>
                      {Object.entries(activeUsageStats.statusCounts).map(([status, count]) => {
                        const sCfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                        return (
                          <span
                            key={status}
                            className={`px-1.5 py-0.5 rounded-md font-medium text-[10px] uppercase tracking-wide ${sCfg?.bgColor} ${sCfg?.color}`}
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
              <Tabs defaultValue="summary">
                <TabsList className="flex-wrap h-auto gap-1">
                  {Object.keys(SECTION_LABELS).map((key) => (
                    <TabsTrigger key={key} value={key} className="text-xs">
                      {key === "summary" ? "Summary" :
                       key === "experience" ? "Experience" :
                       key === "skills" ? "Skills" :
                       key === "education" ? "Education" : "Certs"}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value="projects" className="text-xs">Projects</TabsTrigger>
                  <TabsTrigger value="pdf" className="text-xs">PDF Upload</TabsTrigger>
                </TabsList>

                {Object.entries(SECTION_LABELS).map(([key, label]) => (
                  <TabsContent key={key} value={key}>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={(editData.sections?.[key as keyof Omit<MasterResume["sections"], "projects">] as string) || ""}
                          onChange={(e) =>
                            handleSectionChange(
                              key as keyof Omit<MasterResume["sections"], "projects">,
                              e.target.value
                            )
                          }
                          placeholder={SECTION_PLACEHOLDERS[key] || ""}
                          className="min-h-72 font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          {((editData.sections?.[key as keyof Omit<MasterResume["sections"], "projects">] as string) || "").length} characters
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}

                {/* Projects structured editor */}
                <TabsContent value="projects">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">Projects / Portfolio</CardTitle>
                        <Button size="sm" variant="outline" onClick={openNewProject}>
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Add Project
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(!editData.sections || !Array.isArray(editData.sections.projects) || editData.sections.projects.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No projects yet. Click &ldquo;Add Project&rdquo; to get started.
                        </p>
                      )}
                      {(editData.sections && Array.isArray(editData.sections.projects) ? editData.sections.projects : []).map((proj, idx) => (
                        <div key={idx} className="flex gap-2 items-start rounded-xl border border-border bg-muted/30 p-3">
                          <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                            <button
                              type="button"
                              onClick={() => moveProject(idx, -1)}
                              disabled={idx === 0}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveProject(idx, 1)}
                              disabled={idx === (editData.sections && Array.isArray(editData.sections.projects) ? editData.sections.projects.length : 0) - 1}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{proj.name}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              {proj.url && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Link className="w-3 h-3" />{proj.url}
                                </span>
                              )}
                              {proj.tech && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Cpu className="w-3 h-3" />{proj.tech}
                                </span>
                              )}
                              {proj.dates && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />{proj.dates}
                                </span>
                              )}
                            </div>
                            {proj.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{proj.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditProject(idx)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteProject(idx)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pdf">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Upload & Auto-Parse PDF</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Upload your existing resume PDF and the AI will automatically fill in the
                        Summary, Experience, Skills, Education, Certifications, and Projects sections.
                        {!userProfile?.aiApiKey && (
                          <span className="block mt-1 text-amber-600 dark:text-amber-400">
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
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                          <FileText className="w-8 h-8 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">PDF uploaded</p>
                            <a
                              href={editData.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline truncate block"
                            >
                              View / Download →
                            </a>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
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
                        <Button
                          variant="outline"
                          className="w-full border-dashed h-24"
                          onClick={() => fileRef.current?.click()}
                          disabled={parsing}
                        >
                          {parsing ? (
                            <div className="flex flex-col items-center gap-1">
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              <span className="text-sm text-muted-foreground">Parsing resume sections…</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Upload className="w-5 h-5 text-muted-foreground" />
                              <span className="text-sm font-medium">Click to upload PDF</span>
                              <span className="text-xs text-muted-foreground">
                                AI will auto-fill all sections
                              </span>
                            </div>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Save reminder */}
              <p className="text-xs text-muted-foreground text-center">
                Remember to save after editing sections.
              </p>
            </div>
          )}
        </div>
      )}

      {/* New Resume Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Resume Variant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Variant Name</Label>
              <Input
                placeholder='e.g. "Senior Engineer", "Startup Focus", "Leadership Role"'
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateNew()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Variant Category</Label>
              <Select
                value={newCategory}
                onValueChange={(val) => setNewCategory(val as ResumeCategory)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General / Other</SelectItem>
                  <SelectItem value="gtm">GTM Based</SelectItem>
                  <SelectItem value="marketing">Marketing Focused</SelectItem>
                  <SelectItem value="sales_ops">Sales Ops</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreateNew} disabled={saving || !newName.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overwrite confirmation Dialog */}
      <Dialog open={showOverwrite} onOpenChange={(o) => { if (!o) { setShowOverwrite(false); setParsedSections(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace existing content?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This resume already has content in some sections. Parsing the PDF will overwrite all
            sections with the extracted content. This cannot be undone until you manually edit them.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowOverwrite(false); setParsedSections(null); }}>
              Keep existing
            </Button>
            <Button
              onClick={() => {
                if (parsedSections) applyParsedSections(parsedSections);
                setShowOverwrite(false);
                setParsedSections(null);
              }}
            >
              Replace with PDF content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!showDelete} onOpenChange={(o) => !o && setShowDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resume Variant</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this resume variant. Applications that used it will keep
            their generated documents.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showDelete && handleDelete(showDelete)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Edit Dialog */}
      <Dialog open={showProjectForm} onOpenChange={(o) => { if (!o) setShowProjectForm(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProjectIdx === null ? "Add Project" : "Edit Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="proj-name">Project Name <span className="text-destructive">*</span></Label>
              <Input
                id="proj-name"
                placeholder="My Awesome Project"
                value={projectDraft.name}
                onChange={(e) => setProjectDraft((d) => ({ ...d, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="proj-url">URL</Label>
              <Input
                id="proj-url"
                placeholder="https://github.com/you/project"
                value={projectDraft.url ?? ""}
                onChange={(e) => setProjectDraft((d) => ({ ...d, url: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="proj-dates">Dates</Label>
              <Input
                id="proj-dates"
                placeholder="Jan 2024 – Present"
                value={projectDraft.dates ?? ""}
                onChange={(e) => setProjectDraft((d) => ({ ...d, dates: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="proj-tech">Tech Stack</Label>
              <Input
                id="proj-tech"
                placeholder="React, TypeScript, Node.js"
                value={projectDraft.tech ?? ""}
                onChange={(e) => setProjectDraft((d) => ({ ...d, tech: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="proj-desc">Description <span className="text-destructive">*</span></Label>
              <Textarea
                id="proj-desc"
                placeholder="What does this project do? What impact did it have?"
                value={projectDraft.description}
                onChange={(e) => setProjectDraft((d) => ({ ...d, description: e.target.value }))}
                className="min-h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectForm(false)}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={saveProjectDraft} disabled={!projectDraft.name.trim()}>
              <Check className="w-4 h-4 mr-1" />
              {editingProjectIdx === null ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
