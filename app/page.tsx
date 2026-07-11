"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Zap,
  Target,
  FileText,
  TrendingUp,
  Lock,
  Clock,
  ShieldAlert,
  Flame,
  Trophy,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Plus,
  Play,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

export default function LandingPage() {
  const { user, loading, authError, signInWithGoogle, signInWithGithub, authLogs, clearAuthLogs } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Hero checklist interactive states
  const [stripeChecked, setStripeChecked] = useState(false);
  const [googleChecked, setGoogleChecked] = useState(false);
  const [weeklyGoalProgress, setWeeklyGoalProgress] = useState(3);

  // AI Gen Interactive tab states
  const [jobUrl, setJobUrl] = useState("https://jobs.stripe.com/software-engineer");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [genCompleted, setGenCompleted] = useState(false);

  // Heatmap interactive state
  const [heatmapSubmissions, setHeatmapSubmissions] = useState<Record<string, number>>({});
  const [hoveredCell, setHoveredCell] = useState<{ date: string; count: number } | null>(null);

  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("debug") === "true" || localStorage.getItem("huntmode:debug") === "true") {
        setShowDebug(true);
      }
    }
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // Handle hero checklist item toggle with confetti
  const handleToggleStripe = async () => {
    if (!stripeChecked) {
      setStripeChecked(true);
      setWeeklyGoalProgress((prev) => Math.min(prev + 1, 5));
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6, x: 0.5 },
        colors: ["#6366f1", "#a855f7", "#10b981"],
      });
    } else {
      setStripeChecked(false);
      setWeeklyGoalProgress((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleToggleGoogle = async () => {
    if (!googleChecked) {
      setGoogleChecked(true);
      setWeeklyGoalProgress((prev) => Math.min(prev + 1, 5));
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6, x: 0.5 },
        colors: ["#6366f1", "#a855f7", "#10b981"],
      });
    } else {
      setGoogleChecked(false);
      setWeeklyGoalProgress((prev) => Math.max(prev - 1, 0));
    }
  };

  // Generate document animation runner
  const handleStartGenerate = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenCompleted(false);
    setGenStep(1);

    setTimeout(() => setGenStep(2), 1000);
    setTimeout(() => setGenStep(3), 2000);
    setTimeout(() => {
      setGenStep(4);
      setGenCompleted(true);
      setIsGenerating(false);
    }, 3000);
  };

  // Heatmap click trigger
  const handleAddHeatmapSubmission = async () => {
    const today = new Date().toDateString();
    setHeatmapSubmissions((prev) => ({
      ...prev,
      [today]: (prev[today] || 0) + 1,
    }));
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.8 },
      colors: ["#10b981", "#34d399", "#60a5fa"],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Pre-compiled charts data using the interactive states
  const progressPercent = Math.round((weeklyGoalProgress / 5) * 100);
  const radialData = [
    { name: "Progress", value: weeklyGoalProgress },
    { name: "Remaining", value: 5 - weeklyGoalProgress },
  ];

  // Hardcoded calendar data for the heat grid
  const daysOfGrid = Array.from({ length: 112 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (111 - i));
    const dateStr = date.toDateString();
    
    // Default mock data to populate grid visually
    let baseCount = 0;
    const dayIndex = date.getDay();
    if (i % 7 === 1 && i > 30) baseCount = 2;
    if (i % 11 === 3 && i > 50) baseCount = 1;
    if (i % 15 === 0 && i > 20) baseCount = 3;
    if (i % 19 === 5) baseCount = 4;
    if (dayIndex === 0 || dayIndex === 6) baseCount = 0; // weekends usually off

    const submissionsCount = baseCount + (heatmapSubmissions[dateStr] || 0);

    return {
      date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      dateStr,
      count: submissionsCount,
      level: Math.min(submissionsCount, 4),
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30 overflow-x-hidden relative">
      {/* Decorative ambient background lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[60%] h-[60%] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-12 py-6 max-w-7xl mx-auto border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">HuntMode</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={signInWithGoogle}
              className="text-slate-400 hover:text-white hover:bg-white/5 text-sm font-semibold rounded-xl px-4"
            >
              Google Login
            </Button>
            <Button
              variant="ghost"
              onClick={signInWithGithub}
              className="text-slate-400 hover:text-white hover:bg-white/5 text-sm font-semibold rounded-xl px-4"
            >
              <GithubIcon className="w-4 h-4 mr-2" />
              GitHub Login
            </Button>
          </div>
        </div>
      </header>

      {authError && (
        <div className="max-w-7xl mx-auto px-6 sm:px-12 mt-4 relative z-10">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-400">Authentication Error</h3>
              <p className="text-xs text-red-300/80 mt-1">{authError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 pt-12 pb-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Hook */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-medium animate-pulse">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Say goodbye to job search paralysis
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Job hunting with ADHD is exhausting. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">
                Let’s make it a game.
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
              HuntMode is an open source AI job application assistant providing <strong>AI-powered resume tailoring, cover letter generation, and application tracking</strong>. Outsmart executive dysfunction and keep your momentum alive with dopamine-boosting streak tracking.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    onClick={signInWithGoogle}
                    className="w-full sm:w-auto px-6 py-6 text-base rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 hover:translate-y-[-2px] transition-all duration-200"
                  >
                    Google Login
                  </Button>
                  <Button
                    size="lg"
                    onClick={signInWithGithub}
                    className="w-full sm:w-auto px-6 py-6 text-base rounded-xl font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white shadow-xl hover:translate-y-[-2px] transition-all duration-200"
                  >
                    <GithubIcon className="w-5 h-5 mr-2" />
                    GitHub Login
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2.5 text-center sm:text-left">
                  Setup takes 60 seconds • No credit card required
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Interactive Mockup */}
          <div className="lg:col-span-5 relative">
            {/* Background glowing rings */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-3xl blur-2xl -z-10" />
            
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl">
              {/* Card top bar */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs font-semibold text-slate-500 tracking-widest uppercase">
                  Mission Progress
                </span>
              </div>

              {/* Progress Ring and Stats */}
              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center mb-6">
                <div className="relative w-40 h-40 shrink-0">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={radialData}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={70}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell key="progress" fill="#6366f1" />
                          <Cell key="remaining" fill="#1e293b" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-white leading-none">
                      {weeklyGoalProgress}/5
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                      Target
                    </span>
                  </div>
                </div>

                <div className="text-center sm:text-left space-y-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Goal status: {progressPercent}%
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">
                    {weeklyGoalProgress === 5 
                      ? "🔥 Awesome! You've crushed your weekly goal! The dopamine flow is peak."
                      : `You are just ${5 - weeklyGoalProgress} application${5 - weeklyGoalProgress > 1 ? 's' : ''} away from hitting your streak target!`
                    }
                  </p>
                </div>
              </div>

              {/* Interactive checklist */}
              <div className="border-t border-white/5 pt-6 space-y-3 text-left">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                  Interactive checklist (Try checking items!)
                </p>
                
                <div 
                  onClick={handleToggleStripe}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                >
                  <div className={cn(
                    "w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                    stripeChecked ? "bg-indigo-600 border-indigo-600" : "border-white/20 group-hover:border-white/30"
                  )}>
                    {stripeChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                  </div>
                  <span className={cn(
                    "text-sm font-semibold transition-all",
                    stripeChecked ? "line-through text-slate-500" : "text-white"
                  )}>
                    Submit Stripe GTM Analyst Role
                  </span>
                </div>

                <div 
                  onClick={handleToggleGoogle}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                >
                  <div className={cn(
                    "w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                    googleChecked ? "bg-indigo-600 border-indigo-600" : "border-white/20 group-hover:border-white/30"
                  )}>
                    {googleChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                  </div>
                  <span className={cn(
                    "text-sm font-semibold transition-all",
                    googleChecked ? "line-through text-slate-500" : "text-white"
                  )}>
                    Submit Google Sales Consultant Role
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* The Problem Section */}
      <section className="bg-slate-900/30 border-y border-white/5 py-24 relative">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 text-center space-y-12">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Traditional job searching wasn&apos;t built for our brains.
            </h2>
            <p className="text-slate-400 text-sm">
              We struggle with the administrative loops, lack of immediate feedback, and the black holes of organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-5xl mx-auto">
            {[
              {
                title: 'The "Doom Box" of Resumes',
                desc: "Storing 50 slightly different versions of your CV in random folders until you lose track of them entirely."
              },
              {
                title: "Executive Dysfunction",
                desc: "Staring at a blinking cursor for two hours trying to write a single tailored cover letter."
              },
              {
                title: "The Black Hole",
                desc: "Forgetting which jobs you applied to, when you applied, and where you put the job description."
              },
              {
                title: "The Motivation Crash",
                desc: "Losing steam and abandoning the search after three days because there’s no immediate feedback loop."
              }
            ].map(({ title, desc }) => (
              <Card key={title} className="bg-slate-900/40 border-white/5 hover:border-indigo-500/20 transition-all p-6 rounded-2xl relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/10 group-hover:bg-indigo-500/50 transition-colors" />
                <CardHeader className="p-0 mb-2">
                  <CardTitle className="text-white font-bold text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features / Solutions Section */}
      <section className="py-24 max-w-7xl mx-auto px-6 sm:px-12 text-center space-y-16">
        <div className="max-w-xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            🛠️ Built to keep you moving forward.
          </h2>
          <p className="text-slate-400 text-sm">
            Everything you need to automate structure, maintain momentum, and generate dopamine triggers.
          </p>
        </div>

        {/* Feature 1: AI Doc Gen & Tabs Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
          <div className="lg:col-span-5 space-y-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Tailor documents in one click.</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Paste a job URL and let HuntMode adapt your Master Resume into a targeted CV and cover letter in seconds. Powered by GPT-4o and Claude, it does the heavy mental lifting so you never have to stare at a blank page again.
            </p>
          </div>
          
          <div className="lg:col-span-7 bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
            {/* Interactive demo tabs */}
            <Tabs defaultValue="doc-gen" className="w-full">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <TabsList className="bg-slate-950 border border-white/5 p-1 rounded-xl">
                  <TabsTrigger value="doc-gen" className="px-4 py-1.5 text-xs">AI Document Gen</TabsTrigger>
                  <TabsTrigger value="app-tracker" className="px-4 py-1.5 text-xs">Application Tracker</TabsTrigger>
                </TabsList>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">
                  Live UI Demo
                </div>
              </div>

              <TabsContent value="doc-gen" className="space-y-4">
                <div className="space-y-3">
                  <label className="text-xs text-slate-400 font-semibold block">Enter Job Board URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                    <Button
                      onClick={handleStartGenerate}
                      disabled={isGenerating}
                      className="bg-indigo-600 hover:bg-indigo-500 text-xs px-4 py-2.5 font-bold rounded-xl"
                    >
                      {isGenerating ? "Analyzing..." : "Tailor"}
                    </Button>
                  </div>
                </div>

                {/* Simulated Gen State */}
                <div className="bg-slate-950 rounded-2xl p-4 min-h-[140px] border border-white/5 flex flex-col justify-center">
                  {!isGenerating && !genCompleted && (
                    <div className="text-center space-y-2 py-4">
                      <Play className="w-6 h-6 text-indigo-400 mx-auto opacity-70 animate-bounce" />
                      <p className="text-xs text-slate-400">Click the <strong className="text-indigo-400">Tailor</strong> button above to simulate AI document generation!</p>
                    </div>
                  )}

                  {isGenerating && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-indigo-400 font-bold uppercase">
                        <span>
                          {genStep === 1 && "🌐 Fetching job posting..."}
                          {genStep === 2 && "🧠 Mapping Master Resume keywords..."}
                          {genStep === 3 && "✍️ Composing targeted Cover Letter..."}
                        </span>
                        <span>{Math.round((genStep / 4) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${(genStep / 4) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {genCompleted && (
                    <div className="space-y-3 text-left animate-fadeIn">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        AI Generation Completed!
                      </div>
                      <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2">
                        <p className="text-xs text-white font-bold">Generated CV for Stripe GTM Analyst</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3">
                          ... Leveraged <strong className="text-indigo-300">sales operations dashboards</strong> to drive <strong className="text-indigo-300">23% response rate</strong>. Aligned cross-functional GTM funnels using Next.js and Firebase ...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="app-tracker" className="space-y-3">
                <div className="space-y-2">
                  {[
                    { role: "Software Engineer", company: "Stripe", status: "Interviewing", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
                    { role: "Product Manager", company: "Vercel", status: "Applied", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
                    { role: "GTM Analyst", company: "Airbnb", status: "Offer Received 🎉", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold" },
                  ].map((app) => (
                    <div 
                      key={app.role} 
                      className="p-3 bg-slate-950 border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{app.role}</p>
                        <p className="text-[10px] text-slate-500">{app.company}</p>
                      </div>
                      <span className={cn("text-[9px] px-2 py-0.5 rounded-full border", app.color)}>
                        {app.status}
                      </span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Feature 2: Heatmap & Streaks */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left pt-12">
          {/* Grid visual left on desktop, details right */}
          <div className="lg:col-span-7 lg:order-2 space-y-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Stay hooked with Streaks & Heatmaps.</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Borrowing the best part of GitHub, HuntMode visualizes your daily consistency with an activity heatmap and interactive checkboxes. Turn a boring chore into a visual winning streak that begs to be completed.
            </p>
            <div>
              <Button
                onClick={handleAddHeatmapSubmission}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs py-3 px-5 shadow-lg shadow-emerald-500/10"
              >
                Log an Application (Get Dopamine)
                <Sparkles className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5 lg:order-1 bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                ADHD Consistency Heatmap
              </span>
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 animate-bounce" />
                <span>12 Day Streak!</span>
              </div>
            </div>

            {/* Interactive Heat Grid */}
            <div className="space-y-3">
              <div 
                className="grid gap-1.5"
                style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
              >
                {daysOfGrid.map((day, idx) => (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredCell({ date: day.date, count: day.count })}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={cn(
                      "aspect-square rounded-xs transition-colors duration-200 cursor-pointer relative",
                      day.level === 0 && "bg-slate-950 border border-white/5 hover:bg-slate-900",
                      day.level === 1 && "bg-emerald-950 border border-emerald-900/40 hover:bg-emerald-900",
                      day.level === 2 && "bg-emerald-800 hover:bg-emerald-700",
                      day.level === 3 && "bg-emerald-600 hover:bg-emerald-500",
                      day.level === 4 && "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)] hover:bg-emerald-300"
                    )}
                  />
                ))}
              </div>

              {/* Floating micro tooltip */}
              <div className="h-6 flex items-center justify-center">
                {hoveredCell ? (
                  <p className="text-[11px] font-bold text-slate-400">
                    📅 {hoveredCell.date}: <span className="text-emerald-400">{hoveredCell.count} application{hoveredCell.count !== 1 ? "s" : ""}</span> submitted
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500">Hover over the grid cells to preview application logs</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3: Visual funnel mock */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left pt-12">
          <div className="lg:col-span-5 space-y-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">A beautiful, visual Mission Control.</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              See your entire job hunt at a glance. Your dashboard features a clean application funnel, a weekly progress ring, and instant links to every AI-generated document you&apos;ve ever created. No clutter, no mess.
            </p>
          </div>

          <div className="lg:col-span-7 bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Funnel analytics mockup
              </span>
              <span className="text-[10px] text-indigo-400 font-bold">
                100% conversion rates
              </span>
            </div>

            {/* Visual bars */}
            <div className="space-y-4 py-2">
              {[
                { label: "Applied", count: 18, percent: 100, color: "bg-indigo-500" },
                { label: "Phone Screen", count: 8, percent: 44, color: "bg-purple-500" },
                { label: "Interviews", count: 4, percent: 22, color: "bg-yellow-500" },
                { label: "Offers Received", count: 2, percent: 11, color: "bg-emerald-500" },
              ].map((bar) => (
                <div key={bar.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{bar.label}</span>
                    <span className="text-slate-400 font-bold">{bar.count} ({bar.percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-700", bar.color)}
                      style={{ width: `${bar.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-900/20 border-y border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 text-center space-y-16">
          <div className="max-w-xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              From zero to tracking in three steps:
            </h2>
            <p className="text-slate-400 text-sm">
              No long forms or configurations. Start loading applications right away.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left relative">
            {[
              {
                step: "1",
                title: "Connect",
                desc: "Sign in instantly with your Google or GitHub account."
              },
              {
                step: "2",
                title: "Load Your Background",
                desc: "Drop your experience into the Master Resume vault."
              },
              {
                step: "3",
                title: "Hunt",
                desc: "Paste job URLs, generate hyper-tailored applications, and watch your progress ring fill up."
              }
            ].map(({ step, title, desc }) => (
              <div key={step} className="space-y-4 relative p-6 rounded-2xl bg-slate-900/40 border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-black text-indigo-400 text-base">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BYOK & Security Section */}
      <section className="py-24 max-w-7xl mx-auto px-6 sm:px-12">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center text-left">
            <div className="space-y-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Bring Your Own Key (BYOK).<br/>
                <span className="text-emerald-400">100% Local Security.</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                We believe in completely <strong>free BYOK AI tools</strong>. HuntMode doesn&apos;t charge a markup on AI tokens. You simply plug in your own OpenAI, Anthropic, or Google Gemini API key.
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex gap-4 items-start">
                <ShieldAlert className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-bold text-sm">Strictly Local Storage</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    Your API key is stored <strong>locally in your browser&apos;s localStorage</strong>. It is <strong>never</strong> transmitted to our servers, saved in our databases, or shared with anyone. Your data and credentials remain entirely under your control.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { title: "No Subscriptions", desc: "Pay pennies directly to the AI provider instead of $20/mo subscriptions." },
                { title: "Open Source AI Job Application Assistant", desc: "Inspect the code yourself. Our architecture is transparent." },
                { title: "Ultimate Privacy", desc: "Your Master Resume and generated CVs are your property." }
              ].map((item) => (
                <div key={item.title} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                  <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400 pl-6">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Card */}
      <section className="py-24 max-w-7xl mx-auto px-6 sm:px-12 text-center">
        <div className="max-w-4xl mx-auto rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-12 sm:p-16 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-indigo-500/5 rounded-3xl blur-xl" />
          
          <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Ready to take control of the hunt?
            </h2>
            
            <p className="text-base text-slate-300 leading-relaxed">
              Stop fighting your brain and start using a tool designed for it. Get organized, stay motivated, and land your next role.
            </p>

            <div>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  size="lg"
                  onClick={signInWithGoogle}
                  className="px-8 py-6 text-base rounded-xl font-bold bg-white text-slate-950 hover:bg-slate-200 shadow-xl transition-all duration-200"
                >
                  Continue with Google
                </Button>
                <Button
                  size="lg"
                  onClick={signInWithGithub}
                  className="px-8 py-6 text-base rounded-xl font-bold bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 shadow-xl transition-all duration-200"
                >
                  <GithubIcon className="w-5 h-5 mr-2" />
                  Continue with GitHub
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-3.5">
                Open-source architecture. Fully private. Built for builders and neurodivergent pros.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Persistent Diagnostics Panel for Debugging */}
      {showDebug && authLogs && (
        <section className="max-w-7xl mx-auto px-6 sm:px-12 pb-12 relative z-10">
          <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  Authentication Diagnostics Log
                </h3>
                <p className="text-xs text-slate-500">
                  Logs persist across page reloads to help troubleshoot Google Sign-In issues.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(authLogs);
                  }}
                  className="text-xs text-slate-400 hover:text-white border-white/10 hover:bg-white/5 rounded-lg px-3 py-1.5 h-auto bg-transparent"
                >
                  Copy Logs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAuthLogs}
                  className="text-xs text-slate-400 hover:text-white border-white/10 hover:bg-white/5 rounded-lg px-3 py-1.5 h-auto bg-transparent"
                >
                  Clear Logs
                </Button>
              </div>
            </div>
            <div className="bg-slate-950/80 rounded-xl p-4 border border-white/5 max-h-60 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1 scrollbar-thin">
              {authLogs.split("\n").filter(Boolean).map((log, index) => (
                <div key={index} className="leading-relaxed whitespace-pre-wrap">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Open Source callout */}
      <footer className="border-t border-white/5 py-12 px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-2 max-w-md">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
              <svg className="w-4.5 h-4.5 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              Built by developers, for developers.
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              HuntMode is lightweight, blazing-fast, and built on Next.js 15, Tailwind CSS, shadcn/ui, and Firebase.
            </p>
          </div>
          <div className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} HuntMode. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
