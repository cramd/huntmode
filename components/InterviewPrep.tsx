"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Copy, 
  Edit3, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Check, 
  CheckSquare, 
  Square,
  FileText,
  HelpCircle,
  Shield,
  Notebook,
  Loader2,
  Sparkles,
  Maximize2,
  Minimize2,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Application, InterviewSection, InterviewPrepData, UserProfile, MasterResume } from "@/lib/types";
import InterviewChat from "@/components/InterviewChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface InterviewPrepProps {
  application: Application;
  onUpdate: (data: Partial<Application>) => Promise<void>;
  userProfile: UserProfile | null;
  masterResume: MasterResume | null;
  user: any;
}

// Custom defaults based on Boomi or general roles
const getInitialSections = (company: string, role: string): InterviewSection[] => {
  const isBoomi = company.toLowerCase().includes("boomi");
  
  if (isBoomi) {
    return [
      {
        id: "elevator",
        icon: "🎙️",
        title: "Elevator Pitch",
        keywords: ["10+ Yrs Exp", "Oracle/Docker/Elastic", "Data Activation"],
        script: "• I’m a veteran technical PMM. Over the past decade, I’ve led GTM for *Oracle*, *Docker*, and *Elastic*.\n• I love Boomi's pivot to *'The Data Activation Company'*—it aligns perfectly with my recent work connecting *agentic AI* to complex enterprise data.",
        completed: false,
        order: 0
      },
      {
        id: "data",
        icon: "🗄️",
        title: "Data Management",
        keywords: ["DBaaS", "Data Lakes", "Time-Series"],
        script: "• I’ve spent my career translating *complex backend data architectures* into *business-value narratives*.\n• I've marketed everything from DBaaS at *MariaDB* to enterprise data lakes at *Oracle*, so I speak the language of Boomi’s core buyer naturally.",
        completed: false,
        order: 1
      },
      {
        id: "ar",
        icon: "📊",
        title: "Analyst Relations (AR)",
        keywords: ["Strategic Contributor", "Tech Briefs", "MQ & Wave"],
        script: "• I partner closely with corporate AR to provide the *technical briefs*, *product messaging*, and *customer insights* that actually win the dot on the MQ.\n• I know how to package capabilities to move the needle with analysts.",
        completed: false,
        order: 2
      },
      {
        id: "ai",
        icon: "🤖",
        title: "Agentic AI",
        keywords: ["0→1 LLM Launch", "Context-rich Data", "Docker"],
        script: "• AI is only as good as the *data feeding it*.\n• At Docker and HoneOSS, I've lived at the intersection of *agentic AI* and *structured data*, helping platforms safely monetize autonomous workflows.",
        completed: false,
        order: 3
      },
      {
        id: "plg",
        icon: "📈",
        title: "PLG & Trials",
        keywords: ["Top-of-Funnel", "Dev Onboarding", "Trial-to-Paid"],
        script: "• I bring a strong Product-Led Growth (PLG) mindset.\n• At VictoriaMetrics and in my consulting, I’ve focused heavily on *top-of-funnel developer onboarding* and optimizing the *trial experience* to drive net ARR.",
        completed: false,
        order: 4
      },
      {
        id: "context",
        icon: "🧠",
        title: "Boomi Context (Drop These)",
        keywords: ["Data Fragmentation", "Agentic Enterprise", "CIO ROI"],
        script: "• Enterprises are facing AI hype fatigue.\n• They are stalling due to *data fragmentation* and poor data quality.\n• Boomi wins because it handles the *data foundation* required for the true *Agentic Enterprise*.",
        completed: false,
        order: 5
      },
      {
        id: "logistics",
        icon: "💼",
        title: "Logistics & Ask",
        keywords: ["$158k - $199k CAD", "Richmond, BC", "Closing Q"],
        script: "• I am comfortable with the posted base range depending on the total package.\n\nYOUR QUESTION: *\"What is the most critical milestone you need this Senior PMM to hit in their first 90 days?\"*",
        completed: false,
        order: 6
      }
    ];
  } else {
    return [
      {
        id: "elevator",
        icon: "🎙️",
        title: "Elevator Pitch",
        keywords: ["Intro", "Hook", "Core Pitch"],
        script: `• I am a seasoned product marketing manager with extensive experience leading GTM campaigns.\n• I'm excited about ${company}'s role in ${role} and want to align my skills with your mission.`,
        completed: false,
        order: 0
      },
      {
        id: "experience",
        icon: "🗄️",
        title: "Key Experience",
        keywords: ["Successes", "Metrics", "GTM Velocity"],
        script: "• I've spent my career translating *complex product capabilities* into *high-impact narratives*.\n• I know how to speak to core buyers, increase developer conversion, and coordinate cross-functional teams.",
        completed: false,
        order: 1
      },
      {
        id: "value_prop",
        icon: "🧠",
        title: "Why this Role?",
        keywords: ["Company Pivot", "Market Opportunity"],
        script: `• I've followed ${company}'s growth, and this role feels like a natural extension of my GTM background.\n• I bring a strong *product-led growth (PLG)* mindset to scale operations.`,
        completed: false,
        order: 2
      },
      {
        id: "logistics",
        icon: "💼",
        title: "Logistics & Ask",
        keywords: ["Logistics", "Richmond, BC", "Closing Q"],
        script: `• I am highly interested in this role and comfortable with competitive market rates.\n\nYOUR QUESTION: *\"What does success look like in the first 90 days for this role?\"*`,
        completed: false,
        order: 3
      }
    ];
  }
};

const getInitialQuestions = (company: string): string[] => {
  return [
    `What is the most critical milestone you need this PMM to hit in their first 90 days?`,
    `How is the PMM team structured between core product lines vs. solution segments?`,
    `What is the biggest friction point you see when marketing ${company}'s solutions to traditional IT buyers vs. modern developers?`
  ];
};

export default function InterviewPrep({ application, onUpdate, userProfile, masterResume, user }: InterviewPrepProps) {
  // --- States ---
  const [sections, setSections] = useState<InterviewSection[]>([]);
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [checkedQuestions, setCheckedQuestions] = useState<number[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  const [focusMode, setFocusMode] = useState<boolean>(false);
  
  // Escape key to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);
  
  // Stopwatch states
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerIsRunning, setTimerIsRunning] = useState<boolean>(false);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formIcon, setFormIcon] = useState<string>("🎯");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formKeywords, setFormKeywords] = useState<string>("");
  const [formScript, setFormScript] = useState<string>("");

  // Drag and Drop states
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [canDrag, setCanDrag] = useState(false);
  const [prepView, setPrepView] = useState<"hud" | "coach">("hud");

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const update = () => setCanDrag(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // References
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const notepadDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const qDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // --- Load Initial Data ---
  useEffect(() => {
    const prep = application.interviewPrep;
    if (prep) {
      if (prep.sections && prep.sections.length > 0) {
        setSections([...prep.sections].sort((a, b) => a.order - b.order));
      } else {
        const defaults = getInitialSections(application.company, application.role);
        setSections(defaults);
        saveToDb({ sections: defaults });
      }
      setNotes(prep.notes || "");
      setQuestions(prep.questions || getInitialQuestions(application.company));
      setZoomLevel(prep.zoomLevel || 100);
    } else {
      const defaultSections = getInitialSections(application.company, application.role);
      const defaultQuestions = getInitialQuestions(application.company);
      setSections(defaultSections);
      setNotes("");
      setQuestions(defaultQuestions);
      setZoomLevel(100);
      
      saveToDb({
        sections: defaultSections,
        notes: "",
        questions: defaultQuestions,
        zoomLevel: 100
      });
    }

    // Load checked questions index state locally
    const savedChecked = localStorage.getItem(`checked_qs_${application.id}`);
    if (savedChecked) {
      setCheckedQuestions(JSON.parse(savedChecked));
    } else {
      setCheckedQuestions([]);
    }
  }, [application.id]);

  // --- Stopwatch logic ---
  useEffect(() => {
    if (timerIsRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerIsRunning]);

  // --- DB Persistence Helpers ---
  const saveToDb = (updatedFields: Partial<InterviewPrepData>) => {
    const currentPrep = application.interviewPrep || { sections: [], notes: "", questions: [], zoomLevel: 100 };
    onUpdate({
      interviewPrep: {
        ...currentPrep,
        ...updatedFields
      }
    });
  };

  const handleAIGenerate = async () => {
    if (aiGenerating) return;

    if (!application.jobDescription?.trim()) {
      toast.error("Please add a Job Description to the application first.");
      return;
    }

    // Determine the CV text: check if tailored CV is available, otherwise compile master resume
    let cvText = application.generatedCV || "";
    if (!cvText.trim() && masterResume) {
      const s = masterResume.sections || {};
      cvText = [
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
    }

    if (!cvText.trim()) {
      toast.error("Please link a base resume or save your CV segment first to provide background details.");
      return;
    }

    setAiGenerating(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/generate-prep", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          jobDescription: application.jobDescription,
          cvText,
          role: application.role,
          company: application.company,
          provider: userProfile?.aiProvider || "openai",
          apiKey: userProfile?.aiApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate prep cards.");

      if (!Array.isArray(data.sections)) {
        throw new Error("AI returned invalid format. Expected an array of sections.");
      }

      const formattedSections: InterviewSection[] = data.sections.map((sec: any, idx: number) => ({
        id: `ai_${idx}_${Date.now()}`,
        icon: sec.icon || "🎯",
        title: sec.title || `Point ${idx + 1}`,
        keywords: Array.isArray(sec.keywords) ? sec.keywords : [],
        script: sec.script || "",
        completed: false,
        order: idx,
      }));

      setSections(formattedSections);
      
      let updatedFields: Partial<InterviewPrepData> = { sections: formattedSections };

      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        updatedFields.questions = data.questions;
        setCheckedQuestions([]);
        localStorage.setItem(`checked_qs_${application.id}`, JSON.stringify([]));
      }

      saveToDb(updatedFields);
      toast.success("Successfully generated customized prep talking points and questions!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong during generation.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Debounced Notepad Save
  const handleNotepadChange = (val: string) => {
    setNotes(val);
    if (notepadDebounceRef.current) clearTimeout(notepadDebounceRef.current);
    notepadDebounceRef.current = setTimeout(() => {
      saveToDb({ notes: val });
    }, 800);
  };

  // --- Helper Methods ---

  const toggleSectionCompletion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion
    const updated = sections.map(s => {
      if (s.id === id) {
        const nextState = !s.completed;
        return { ...s, completed: nextState };
      }
      return s;
    });
    setSections(updated);
    saveToDb({ sections: updated });
    toast.success("Coverage updated");
  };

  const toggleCardExpansion = (id: string) => {
    const next = new Set(expandedCardIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedCardIds(next);
  };

  const handleZoom = (type: "in" | "out") => {
    let nextZoom = zoomLevel;
    if (type === "in" && zoomLevel < 250) {
      nextZoom = zoomLevel + 10;
    } else if (type === "out" && zoomLevel > 70) {
      nextZoom = zoomLevel - 10;
    }
    setZoomLevel(nextZoom);
    saveToDb({ zoomLevel: nextZoom });
  };

  const handleResetChecked = () => {
    if (confirm("Reset all card checkmarks?")) {
      const updated = sections.map(s => ({ ...s, completed: false }));
      setSections(updated);
      saveToDb({ sections: updated });
      toast.success("Progress reset");
    }
  };

  // Clipboard copy helper
  const handleCopyScript = (script: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanScript = script.replace(/\*/g, "");
    navigator.clipboard.writeText(cleanScript);
    toast.success("Script copied to clipboard!");
  };

  // --- Dynamic highlight script parser ---
  const renderFormattedScript = (scriptText: string) => {
    const lines = scriptText.split('\n');
    
    return (
      <ul className="space-y-4 list-none pl-1">
        {lines.map((line, lineIdx) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return null;
          
          // Remove leading bullet characters
          const cleanLine = trimmedLine.replace(/^[-*•]\s*/, "");
          
          const parts = cleanLine.split("*");
          return (
            <li key={lineIdx} className="relative pl-5 leading-relaxed">
              <span className="absolute left-0 top-[0.6em] w-1.5 h-1.5 rounded-full bg-indigo-500/70 shadow-[0_0_6px_rgba(99,102,241,0.8)]"></span>
              {parts.map((part, index) => {
                if (index % 2 === 1) {
                  return (
                    <span 
                      key={index} 
                      className="text-amber-400 font-bold bg-amber-500/10 border-b border-dashed border-amber-500/40 px-1 py-0.5 rounded mx-0.5"
                    >
                      {part}
                    </span>
                  );
                }
                return part;
              })}
            </li>
          );
        })}
      </ul>
    );
  };

  // Extract highlighted phrases for display in collapsed view
  const extractHighlights = (scriptText: string): string[] => {
    const highlights: string[] = [];
    const regex = /\*(.*?)\*/g;
    let match;
    while ((match = regex.exec(scriptText)) !== null) {
      const phrase = match[1].trim();
      const cleanPhrase = phrase.replace(/^["'“”]|["'“”]$/g, "");
      if (cleanPhrase && !highlights.includes(cleanPhrase)) {
        highlights.push(cleanPhrase);
      }
    }
    return highlights;
  };

  // --- Modal Forms (Add/Edit) ---
  const handleOpenEditModal = (s: InterviewSection, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(s.id);
    setFormIcon(s.icon || "🎯");
    setFormTitle(s.title);
    setFormKeywords(s.keywords.join(", "));
    setFormScript(s.script);
    setModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditId(null);
    setFormIcon("💡");
    setFormTitle("");
    setFormKeywords("");
    setFormScript("");
    setModalOpen(true);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    const keywords = formKeywords.split(",").map(k => k.trim()).filter(k => k.length > 0);
    
    let updated: InterviewSection[];
    if (editId) {
      updated = sections.map(s => {
        if (s.id === editId) {
          return { ...s, icon: formIcon, title: formTitle, keywords, script: formScript };
        }
        return s;
      });
    } else {
      const newCard: InterviewSection = {
        id: "custom_" + Date.now(),
        icon: formIcon,
        title: formTitle,
        keywords,
        script: formScript,
        completed: false,
        order: sections.length
      };
      updated = [...sections, newCard];
    }

    setSections(updated);
    saveToDb({ sections: updated });
    setModalOpen(false);
    toast.success(editId ? "Card updated" : "Custom card created");
  };

  const handleDeleteCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this card?")) {
      const updated = sections.filter(s => s.id !== id);
      setSections(updated);
      saveToDb({ sections: updated });
      toast.success("Card deleted");
    }
  };

  // --- Drag and Drop implementation ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('.btn-card-action') || target.closest('.card-checkbox')) {
      e.preventDefault();
      return;
    }
    setDraggedCardId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDragOverCardId(null);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedCardId && draggedCardId !== id && dragOverCardId !== id) {
      setDragOverCardId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverCardId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverCardId(null);
    if (draggedCardId && draggedCardId !== targetId) {
      const newSections = [...sections];
      const draggedIdx = newSections.findIndex(s => s.id === draggedCardId);
      const targetIdx = newSections.findIndex(s => s.id === targetId);
      
      if (draggedIdx !== -1 && targetIdx !== -1) {
        const [draggedItem] = newSections.splice(draggedIdx, 1);
        newSections.splice(targetIdx, 0, draggedItem);
        
        // Re-assign order properties
        const reordered = newSections.map((s, idx) => ({ ...s, order: idx }));
        setSections(reordered);
        saveToDb({ sections: reordered });
      }
    }
  };

  const handleMoveSection = (id: string, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sections.length) return;
    const newSections = [...sections];
    [newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]];
    const reordered = newSections.map((s, i) => ({ ...s, order: i }));
    setSections(reordered);
    saveToDb({ sections: reordered });
  };

  // --- Sidebar closing questions handler ---
  const handleQuestionToggle = (idx: number) => {
    let nextChecked = [...checkedQuestions];
    if (nextChecked.includes(idx)) {
      nextChecked = nextChecked.filter(i => i !== idx);
    } else {
      nextChecked.push(idx);
    }
    setCheckedQuestions(nextChecked);
    localStorage.setItem(`checked_qs_${application.id}`, JSON.stringify(nextChecked));
  };

  // --- Formatting Helpers ---
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Filtering
  const filteredSections = sections.filter(s => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      s.title.toLowerCase().includes(query) ||
      s.script.toLowerCase().includes(query) ||
      s.keywords.some(k => k.toLowerCase().includes(query))
    );
  });

  const completedCount = sections.filter(s => s.completed).length;
  const coverageProgress = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

  // Prompter sizing values
  const scriptFontSize = `${(zoomLevel / 100) * 1.05}rem`;
  const sidebarFontSize = `${(zoomLevel / 100) * 0.9}rem`;
  const hasAIKey = user?.email === "marcsherwood@gmail.com" || !!userProfile?.aiApiKey;

  return (
    <div className={`text-slate-100 select-none transition-all duration-300 ${focusMode ? 'fixed inset-0 z-[100] p-4 sm:p-8 md:p-12 bg-slate-950/95 backdrop-blur-3xl overflow-y-auto' : ''}`}>
      <div className={`flex flex-col gap-6 w-full ${focusMode ? 'max-w-7xl mx-auto' : 'min-h-[600px]'}`}>

      {!focusMode && (
        <div className="space-y-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Interview prep mode
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Switch between live talking-point HUD and AI practice coach.
            </p>
          </div>
          <Tabs value={prepView} onValueChange={(value) => setPrepView(value as "hud" | "coach")} className="w-full">
            <TabsList className="bg-slate-900/60 border border-white/10 p-1.5 h-auto w-full sm:w-auto gap-1.5 rounded-2xl">
              <TabsTrigger
                value="hud"
                className={cn(
                  "group h-auto min-h-12 flex-1 sm:flex-none flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 rounded-xl border px-4 py-2.5 text-left cursor-pointer",
                  "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white",
                  "data-active:border-indigo-500/40 data-active:bg-indigo-500/15 data-active:text-indigo-100"
                )}
              >
                <Maximize2 className="h-3.5 w-3.5 shrink-0 opacity-70 group-data-active:opacity-100" />
                <span>
                  <span className="block text-xs font-bold uppercase tracking-wide">Live HUD</span>
                  <span className="block text-[10px] font-medium normal-case tracking-normal text-slate-500 group-data-active:text-indigo-200/80">
                    Talking points for the call
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="coach"
                className={cn(
                  "group h-auto min-h-12 flex-1 sm:flex-none flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 rounded-xl border px-4 py-2.5 text-left cursor-pointer",
                  "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white",
                  "data-active:border-indigo-500/40 data-active:bg-indigo-500/15 data-active:text-indigo-100"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70 group-data-active:opacity-100" />
                <span>
                  <span className="block text-xs font-bold uppercase tracking-wide">Practice Coach</span>
                  <span className="block text-[10px] font-medium normal-case tracking-normal text-slate-500 group-data-active:text-indigo-200/80">
                    Rehearse answers with AI
                  </span>
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {prepView === "coach" && !focusMode ? (
        <InterviewChat
          application={application}
          masterResume={masterResume}
          userProfile={userProfile}
          user={user}
          onUpdate={onUpdate}
          hasAIKey={hasAIKey}
        />
      ) : (
      <>
      
      {/* Header bar: Timer, Zoom, Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 bg-slate-900/60 border border-white/5 p-4 rounded-2xl shadow-lg backdrop-blur-sm">
        
        {/* Stopwatch */}
        <div className="flex items-center gap-3 bg-slate-950/70 border border-white/5 px-4 py-2 rounded-xl font-mono justify-center md:justify-start">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {timerIsRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${timerIsRunning ? "bg-red-500" : "bg-slate-500"}`}></span>
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Stopwatch</span>
          </div>
          <div className="text-base font-bold text-slate-200 min-w-[50px]">{formatTime(timerSeconds)}</div>
          <div className="flex items-center gap-1 border-l border-white/10 pl-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-white"
              onClick={() => setTimerIsRunning(!timerIsRunning)}
            >
              {timerIsRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-white"
              onClick={() => {
                setTimerIsRunning(false);
                setTimerSeconds(0);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Text Zoom */}
        <div className="flex items-center justify-center gap-3 bg-slate-950/70 border border-white/5 px-4 py-2 rounded-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Prompter Size:</span>
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-6 px-2 text-[10px] bg-slate-800 border-white/5 hover:bg-slate-700"
              onClick={() => handleZoom("out")}
            >
              A-
            </Button>
            <span className="font-mono text-xs font-bold text-slate-200 min-w-[35px] text-center">{zoomLevel}%</span>
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-6 px-2 text-[10px] bg-slate-800 border-white/5 hover:bg-slate-700"
              onClick={() => handleZoom("in")}
            >
              A+
            </Button>
          </div>
        </div>

        {/* Coverage Tracker */}
        <div className="flex items-center justify-between gap-4 bg-slate-950/40 px-4 py-2 rounded-xl border border-white/5">
          <div className="text-left leading-none">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Coverage</span>
            <div className="text-sm font-black text-emerald-400 mt-1">{coverageProgress}%</div>
          </div>
          <div className="flex-1 max-w-[120px]">
            <Progress value={coverageProgress} className="h-2 bg-slate-800" />
          </div>
        </div>

      </div>

      {/* Toolbar: Search, Add Card */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search keywords or scripts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 h-9 bg-slate-900/60 border-white/5 focus-visible:ring-blue-500/20 text-slate-200 placeholder-slate-500 rounded-xl text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {hasAIKey && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAIGenerate}
              disabled={aiGenerating}
              className="h-10 sm:h-9 px-3 border-indigo-500/20 bg-indigo-950/20 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/45 text-xs font-bold rounded-xl shadow-md shadow-indigo-500/5 transition-all"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:mr-1.5 animate-spin" />
                  <span className="hidden sm:inline">Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">AI Generate</span>
                </>
              )}
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setFocusMode(!focusMode)}
            className={`h-10 sm:h-9 px-3 border-white/5 text-xs font-semibold rounded-xl transition-all order-first sm:order-none ${focusMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20' : 'bg-indigo-500/15 sm:bg-slate-900/40 text-indigo-300 sm:text-slate-300 hover:text-white border-indigo-500/30 sm:border-white/5'}`}
          >
            {focusMode ? <Minimize2 className="h-3.5 w-3.5 sm:mr-1.5" /> : <Maximize2 className="h-3.5 w-3.5 sm:mr-1.5" />}
            <span className="hidden sm:inline">{focusMode ? "Exit Focus" : "Focus Mode"}</span>
            <span className="sm:hidden">{focusMode ? "Exit" : "Focus"}</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetChecked}
            className="h-10 sm:h-9 px-3 border-white/5 bg-slate-900/40 text-slate-300 hover:text-white text-xs font-semibold rounded-xl"
          >
            <RotateCcw className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Reset Coverage</span>
          </Button>
          <Button 
            size="sm" 
            onClick={handleOpenAddModal}
            className="h-10 sm:h-9 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/10"
          >
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Add Card</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Card list + Battlecard Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Left Side: Cards Container */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSections.map((section, sectionIdx) => {
              const isExpanded = expandedCardIds.has(section.id);
              const isDragging = draggedCardId === section.id;
              const isDragOver = dragOverCardId === section.id;
              const extractedHighlights = extractHighlights(section.script);

              return (
                <div
                  key={section.id}
                  draggable={canDrag}
                  onDragStart={canDrag ? (e) => handleDragStart(e, section.id) : undefined}
                  onDragEnd={canDrag ? handleDragEnd : undefined}
                  onDragOver={canDrag ? (e) => handleDragOver(e, section.id) : undefined}
                  onDragLeave={canDrag ? handleDragLeave : undefined}
                  onDrop={canDrag ? (e) => handleDrop(e, section.id) : undefined}
                  onClick={() => toggleCardExpansion(section.id)}
                  className={`
                    group relative flex flex-col gap-3 rounded-2xl p-5 border cursor-pointer select-none transition-all duration-300
                    ${section.completed 
                      ? "bg-slate-900/20 border-white/2 opacity-55 scale-[0.98] hover:opacity-85 hover:scale-[1.0]"
                      : "bg-slate-900/60 border-white/5 hover:border-blue-500/20 hover:bg-slate-900/80 hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
                    }
                    ${isDragging ? "opacity-20 border-dashed border-slate-700 bg-transparent scale-95" : ""}
                    ${isDragOver ? "border-blue-500/40 bg-blue-500/5 scale-[1.02]" : ""}
                  `}
                >
                  
                  {/* Top-Right Checkbox */}
                  <button
                    onClick={(e) => toggleSectionCompletion(section.id, e)}
                    className={`
                      card-checkbox absolute top-4 right-4 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors z-20
                      ${section.completed 
                        ? "bg-emerald-500 border-emerald-500 text-white" 
                        : "border-slate-600 text-transparent hover:border-blue-400"
                      }
                    `}
                    title="Mark covered"
                  >
                    <Check className={`h-3 w-3 ${section.completed ? "block" : "hidden"}`} strokeWidth={3} />
                  </button>

                  {/* Header Row */}
                  <div className="flex items-center gap-2.5 pr-8">
                    {canDrag ? (
                      <span 
                        className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing text-xs font-bold mr-0.5 select-none"
                        title="Drag to sort"
                      >
                        ⋮⋮
                      </span>
                    ) : (
                      <div className="flex flex-col gap-0.5 md:hidden shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleMoveSection(section.id, "up", e)}
                          disabled={sectionIdx === 0}
                          className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleMoveSection(section.id, "down", e)}
                          disabled={sectionIdx === filteredSections.length - 1}
                          className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <span className="text-xl leading-none">{section.icon || "🎯"}</span>
                    <h3 className={`text-sm font-black tracking-tight text-white leading-tight ${section.completed ? "line-through text-slate-500" : ""}`}>
                      {section.title}
                    </h3>
                    <span className="ml-auto text-slate-500 hover:text-slate-300">
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  </div>

                  {/* Keywords Container */}
                  <div className="flex flex-wrap gap-1.5">
                    {section.keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className={`
                          text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide border transition-all duration-200
                          ${section.completed
                            ? "bg-white/2 border-white/5 text-slate-600"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          }
                        `}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>

                  {/* Extracted Highlights Cloud (Visible when collapsed) */}
                  {extractedHighlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {extractedHighlights.map((hl, idx) => (
                        <span
                          key={idx}
                          style={{ fontSize: `${(zoomLevel / 100) * 0.8}rem` }}
                          className={`
                            font-bold px-2 py-1 rounded-md border border-dashed transition-all duration-200
                            ${section.completed
                              ? "bg-transparent border-white/5 text-slate-500"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            }
                          `}
                        >
                          {hl}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Script body & actions (Collapsible wrapper) */}
                  <div 
                    className={`
                      overflow-hidden transition-all duration-300 flex flex-col gap-4
                      ${isExpanded ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0 pointer-events-none"}
                    `}
                  >
                    <div 
                      style={{ fontSize: scriptFontSize }}
                      className={`font-sans tracking-wide ${section.completed ? "text-slate-600" : "text-slate-350"}`}
                    >
                      {renderFormattedScript(section.script)}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <FileText className="h-3 w-3" />
                        <span>~{Math.round((section.script.split(/\s+/).filter(w => w.length > 0).length / 135) * 60)}s read</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-white btn-card-action"
                          title="Copy talking points"
                          onClick={(e) => handleCopyScript(section.script, e)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-white btn-card-action"
                          title="Edit Card"
                          onClick={(e) => handleOpenEditModal(section, e)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-red-400 btn-card-action"
                          title="Delete Card"
                          onClick={(e) => handleDeleteCard(section.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {filteredSections.length === 0 && (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-slate-900/20 border border-dashed border-white/5 rounded-2xl">
              <Search className="h-8 w-8 text-slate-600 mb-2" />
              <h4 className="text-sm font-bold text-slate-400">No talking points found</h4>
              <p className="text-xs text-slate-500 mt-0.5">Try a different search query or add a new card.</p>
            </div>
          )}

        </div>

        {/* Right Side: Sidebar (Battlecard, Checklist, Notepad) */}
        <div className="flex flex-col gap-6" style={{ fontSize: sidebarFontSize }}>
          
          {/* Battlecard */}
          <Card className="bg-slate-900/60 border-white/5 relative overflow-hidden backdrop-blur-sm shadow-xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full filter blur-xl"></div>
            
            <CardHeader className="py-4 border-b border-white/5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🛡️</span>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-300">Quick Battlecard</CardTitle>
              </div>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-400 font-bold px-1.5 py-0.5 rounded">Cheat Sheet</span>
            </CardHeader>
            
            <CardContent className="pt-4 flex flex-col gap-4 text-xs leading-relaxed">
              
              {/* Pivot Theme */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Key Strategy Focus</span>
                <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3">
                  <strong className="text-indigo-200">
                    {application.company.toLowerCase().includes("boomi") ? "The Data Activation Company" : `${application.company} Core Vision`}
                  </strong>
                  <p className="text-slate-400 mt-1">
                    {application.company.toLowerCase().includes("boomi") 
                      ? "Focusing on resolving data fragmentation and poor quality to power the Agentic Enterprise."
                      : `Translating technical capabilities into GTM narratives and revenue-focused developer onboarding.`
                    }
                  </p>
                </div>
              </div>

              {/* Competitive Landmines */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Competitive Angles</span>
                <ul className="space-y-1.5 pl-1 list-none">
                  {application.company.toLowerCase().includes("boomi") ? (
                    <>
                      <li className="relative pl-3 text-slate-400"><span className="absolute left-0 text-slate-600">&bull;</span> <strong className="text-slate-200">MuleSoft:</strong> Legacy, costly, and resource-heavy. Hard to run developers.</li>
                      <li className="relative pl-3 text-slate-400"><span className="absolute left-0 text-slate-600">&bull;</span> <strong className="text-slate-200">Informatica:</strong> Overly complex governance, lacks modern PLG velocity.</li>
                      <li className="relative pl-3 text-slate-400"><span className="absolute left-0 text-slate-600">&bull;</span> <strong className="text-slate-200">Workato:</strong> Good workflow automation but lacks deep enterprise data security.</li>
                    </>
                  ) : (
                    <>
                      <li className="relative pl-3 text-slate-400"><span className="absolute left-0 text-slate-600">&bull;</span> <strong className="text-slate-200">Friction:</strong> Find and address the primary bottlenecks in onboarding.</li>
                      <li className="relative pl-3 text-slate-400"><span className="absolute left-0 text-slate-600">&bull;</span> <strong className="text-slate-200">Value:</strong> Tie product features directly to revenue metrics and ROI.</li>
                      <li className="relative pl-3 text-slate-400"><span className="absolute left-0 text-slate-600">&bull;</span> <strong className="text-slate-200">Analyst:</strong> Package features logically to drive leadership in MQ reports.</li>
                    </>
                  )}
                </ul>
              </div>

            </CardContent>
          </Card>

          {/* Closing Questions Checklist */}
          <Card className="bg-slate-900/60 border-white/5 backdrop-blur-sm shadow-xl">
            <CardHeader className="py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span>❓</span>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-400">Closing Questions to Ask</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-2.5">
              {questions.map((q, idx) => {
                const isChecked = checkedQuestions.includes(idx);
                return (
                  <label 
                    key={idx}
                    className="flex gap-3 p-3 bg-slate-950/20 hover:bg-slate-950/40 border border-white/2 hover:border-white/5 rounded-xl cursor-pointer transition-colors text-xs text-slate-300 items-start select-none"
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => handleQuestionToggle(idx)}
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20 h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <span className={isChecked ? "line-through text-slate-500" : ""}>{q}</span>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Notepad */}
          <Card className="bg-slate-900/60 border-white/5 flex-1 flex flex-col backdrop-blur-sm shadow-xl min-h-[200px]">
            <CardHeader className="py-4 border-b border-white/5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span>📝</span>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-400">Call Notepad</CardTitle>
              </div>
              <span className="text-[8px] text-slate-500 font-bold uppercase font-mono tracking-wider">Cloud Auto-saved</span>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex">
              <Textarea
                value={notes}
                onChange={(e) => handleNotepadChange(e.target.value)}
                placeholder="Type real-time interviewer notes, names, or feedback here..."
                className="w-full flex-1 min-h-[140px] bg-slate-950/40 border-white/5 focus-visible:ring-blue-500/20 text-xs text-slate-300 placeholder-slate-650 resize-none font-sans leading-relaxed rounded-xl"
              />
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Dialog for Editing / Creating cards */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-white/5 rounded-2xl max-w-md p-6 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              {editId ? "Edit talking point card" : "Create custom talking point"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCard} className="flex flex-col gap-4 mt-3">
            
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Icon</label>
                <Input 
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  className="bg-slate-950 border-white/5 text-center text-sm font-semibold rounded-xl mt-1.5 focus-visible:ring-blue-500/20"
                />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Card Title</label>
                <Input 
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  placeholder="e.g. Elevator Pitch"
                  className="bg-slate-950 border-white/5 text-sm rounded-xl mt-1.5 focus-visible:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Keywords / Bullet tags (comma-separated)</label>
              <Input 
                value={formKeywords}
                onChange={(e) => setFormKeywords(e.target.value)}
                placeholder="GTM GTM, Strategy, Cloud"
                className="bg-slate-950 border-white/5 text-sm rounded-xl mt-1.5 focus-visible:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Script / Talking Points</label>
              <Textarea 
                value={formScript}
                onChange={(e) => setFormScript(e.target.value)}
                required
                rows={5}
                placeholder="Write your speaking script here... Wrap *important words* in asterisks to highlight them."
                className="bg-slate-950 border-white/5 text-sm rounded-xl mt-1.5 resize-none leading-relaxed focus-visible:ring-blue-500/20"
              />
              <p className="text-[9px] text-slate-500 mt-1.5 leading-normal">
                💡 Wrap phrases in asterisks, e.g., <strong>*Data Activation*</strong>, to highlight them in yellow for quick reading.
              </p>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2"
              >
                Save Talking Point
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

      </>
      )}

      </div>
    </div>
  );
}
