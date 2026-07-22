"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Flame,
  Briefcase,
  Target,
  TrendingUp,
  Plus,
  ArrowRight,
  Trophy,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getApplications, getActivityLogs, getUserProfile, getGoals, getMasterResumes } from "@/lib/db";
import type { Application, ActivityLog, UserProfile, Goal, MasterResume } from "@/lib/types";
import { STATUS_CONFIG, MOTIVATIONAL_MESSAGES, CATEGORY_CONFIG, ORG_TYPE_CONFIG, resolveResumeCategory, getCategoryConfig, type ResumeCategory, type OrgType } from "@/lib/types";
import { formatApplicationDate, getApplicationStatusConfig } from "@/lib/application-display";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { Compass, Megaphone, Sliders, FileText } from "lucide-react";
import { GettingStartedCard } from "@/components/GettingStartedCard";
import { FindSimilarRolesButton } from "@/components/FindSimilarRolesButton";
import { TipIntroCard } from "@/components/TipIntroCard";

const STATUS_COLORS: Record<string, string> = {
  applied: "#6366f1",
  phone_screen: "#8b5cf6",
  interview: "#f59e0b",
  offer: "#10b981",
  rejected: "#ef4444",
  withdrawn: "#94a3b8",
  draft: "#cbd5e1",
};

const FUNNEL_ORDER = ["applied", "phone_screen", "interview", "offer"] as const;

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

export default function DashboardPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [resumes, setResumes] = useState<MasterResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [motivationalMsg] = useState(
    () => MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]
  );
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getApplications(user.uid),
      getActivityLogs(user.uid, 90),
      getUserProfile(user.uid),
      getGoals(user.uid),
      getMasterResumes(user.uid),
    ]).then(([apps, act, prof, gls, rs]) => {
      setApplications(apps);
      setActivity(act);
      setProfile(prof);
      setGoals(gls);
      setResumes(rs);
      setLoading(false);
    });
  }, [user]);

  const stats = useMemo(() => {
    const total = applications.length;
    const active = applications.filter(
      (a) => !["rejected", "withdrawn", "draft"].includes(a.status)
    ).length;
    const offers = applications.filter((a) => a.status === "offer").length;
    const responseRate =
      total > 0
        ? Math.round(
            (applications.filter((a) => a.status !== "applied" && a.status !== "draft").length /
              total) *
              100
          )
        : 0;
    return { total, active, offers, responseRate };
  }, [applications]);

  const weeklyApps = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = endOfWeek(new Date());
    return applications.filter((a) => {
      if (!a.appliedAt) return false;
      try {
        return isWithinInterval(parseISO(a.appliedAt), { start, end });
      } catch {
        return false;
      }
    }).length;
  }, [applications]);

  const weeklyGoal = profile?.weeklyGoal || 5;
  const weeklyProgress = Math.min((weeklyApps / weeklyGoal) * 100, 100);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, label: STATUS_CONFIG[name as keyof typeof STATUS_CONFIG]?.label || name }));
  }, [applications]);

  const funnelData = useMemo(() => {
    return FUNNEL_ORDER.map((status) => ({
      name: STATUS_CONFIG[status].label,
      count: applications.filter((a) => a.status === status).length,
    }));
  }, [applications]);

  const weeklyActivityData = useMemo(() => {
    const days: { day: string; apps: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const log = activity.find((a) => a.date === dateStr);
      days.push({ day: format(d, "EEE"), apps: log?.appsSubmitted || 0 });
    }
    return days;
  }, [activity]);

  const todayGoals = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return goals.filter((g) => g.type === "daily").map((g) => ({
      ...g,
      doneToday: g.completedDates.includes(today),
    }));
  }, [goals]);

  const streak = profile?.currentStreak || 0;

  const categoryStats = useMemo(() => {
    const resumeMap: Record<string, MasterResume> = {};
    resumes.forEach((r) => {
      resumeMap[r.id] = r;
    });

    const counts: Record<ResumeCategory, number> = {
      gtm: 0,
      marketing: 0,
      sales_ops: 0,
      general: 0,
    };

    applications.forEach((a) => {
      if (!a.resumeUsed) return;
      const resume = resumeMap[a.resumeUsed];
      const category = resolveResumeCategory(resume?.category);
      counts[category] = (counts[category] || 0) + 1;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return { counts, total };
  }, [applications, resumes]);

  // Role title trends — group by normalized role, compute counts and response rate
  const roleTrends = useMemo(() => {
    const map: Record<string, { count: number; progressed: number }> = {};
    applications.forEach((a) => {
      const role = a.role.trim();
      if (!role) return;
      // Normalize: lowercase for grouping, keep first-seen casing for display
      const key = role.toLowerCase();
      if (!map[key]) map[key] = { count: 0, progressed: 0 };
      map[key].count++;
      if (!["applied", "draft"].includes(a.status)) map[key].progressed++;
    });
    // Sort by count descending, take top 6
    return Object.entries(map)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 6)
      .map(([key, v]) => {
        // Find original casing from first match
        const original = applications.find((a) => a.role.toLowerCase() === key)?.role || key;
        return { role: original, count: v.count, responseRate: v.count > 0 ? Math.round((v.progressed / v.count) * 100) : 0 };
      });
  }, [applications]);

  // Org type stats
  const orgTypeStats = useMemo(() => {
    const map: Record<string, { count: number; progressed: number }> = {};
    applications.forEach((a) => {
      const org = a.orgType || "unset";
      if (!map[org]) map[org] = { count: 0, progressed: 0 };
      map[org].count++;
      if (!["applied", "draft"].includes(a.status)) map[org].progressed++;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([key, v]) => ({
        type: key,
        label: key === "unset" ? "Not set" : (ORG_TYPE_CONFIG[key as OrgType]?.label || key),
        count: v.count,
        responseRate: v.count > 0 ? Math.round((v.progressed / v.count) * 100) : 0,
      }));
  }, [applications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header — compact */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">{user?.displayName?.split(" ")[0] || "Hunter"}</span> 👋
          </h1>
          <p className="text-xs text-slate-400 italic mt-1 font-medium">&ldquo;{motivationalMsg}&rdquo;</p>
        </div>
        <Link href="/applications/new" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-4 py-2.5 text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all hover:-translate-y-[1px]">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Application
        </Link>
      </div>

      {/* Getting Started card — shown for new users who haven't dismissed it */}
      {!onboardingDismissed &&
        !profile?.onboardingDismissedAt &&
        !profile?.onboardingCompletedAt &&
        applications.length === 0 && (
        <GettingStartedCard
          user={{ uid: user!.uid }}
          profile={profile}
          onDismiss={() => setOnboardingDismissed(true)}
        />
      )}

      {/* Soft tip intro — early journey, dismissible once */}
      {profile?.onboardingCompletedAt && <TipIntroCard />}

      {/* Top row: Stats + Streak + Weekly Goal — responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 4 stat cards */}
        {[
          { label: "Total", value: stats.total, icon: Briefcase, color: "text-indigo-400", glow: "shadow-indigo-500/5 hover:border-indigo-500/20" },
          { label: "Active", value: stats.active, icon: TrendingUp, color: "text-purple-400", glow: "shadow-purple-500/5 hover:border-purple-500/20" },
          { label: "Offers", value: stats.offers, icon: Trophy, color: "text-emerald-400", glow: "shadow-emerald-500/5 hover:border-emerald-500/20" },
          { label: "Response", value: `${stats.responseRate}%`, icon: Zap, color: "text-amber-400", glow: "shadow-amber-500/5 hover:border-amber-500/20" },
        ].map(({ label, value, icon: Icon, color, glow }) => (
          <Card key={label} className={`bg-slate-900/40 border-white/5 hover:border-white/10 transition-all ${glow} shadow-md`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8.5 h-8.5 rounded-lg flex items-center justify-center bg-white/5 border border-white/5 shadow-inner">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-black text-white leading-none">{value}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-bold tracking-wider uppercase">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Streak — compact */}
        <Card className="border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-purple-950/40 shadow-lg shadow-indigo-500/5 hover:border-indigo-500/30 transition-all">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Streak</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{streak}</span>
                <span className="text-xs font-semibold text-slate-400">days</span>
              </div>
            </div>
            <div className="w-8.5 h-8.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Goal — compact */}
        <Card className="bg-slate-900/40 border-white/5 hover:border-indigo-500/20 transition-all p-3 shadow-md">
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Weekly Goal</p>
              <span className="text-xs font-bold text-white">{weeklyApps}/{weeklyGoal}</span>
            </div>
            <Progress value={weeklyProgress} className="h-1.5 bg-slate-950 border border-white/5" />
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
              {weeklyApps >= weeklyGoal ? "🎉 Goal achieved!" : `${weeklyGoal - weeklyApps} to target`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle row: Pipeline + Status + Weekly Activity — responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Funnel Chart */}
        <Card className="lg:col-span-2 bg-slate-900/40 border-white/5 hover:border-white/10 transition-all shadow-md">
          <CardHeader className="pb-1 pt-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">Application Pipeline</CardTitle>
            <span className="text-[10px] text-indigo-400 font-bold tracking-wider">Funnel View</span>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="w-full min-h-[140px]">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={funnelData} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="indigoPurpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.03)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", fontSize: 11 }}
                  labelStyle={{ color: "#fff", fontWeight: 700 }}
                  itemStyle={{ color: "#a5b4fc" }}
                />
                <Bar dataKey="count" fill="url(#indigoPurpleGrad)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Pie — compact */}
        <Card className="bg-slate-900/40 border-white/5 hover:border-white/10 transition-all shadow-md">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {statusData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-slate-500 text-xs">
                <Briefcase className="w-6 h-6 mb-1 opacity-20" />
                No applications logged
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_COLORS[entry.name] || "#94a3b8"}
                          stroke="rgba(15, 23, 42, 0.6)"
                          strokeWidth={1.5}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "6px", fontSize: 11 }}
                      formatter={(value, name) => [value, STATUS_CONFIG[name as keyof typeof STATUS_CONFIG]?.label || name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 flex-1 min-w-0">
                  {statusData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[entry.name] }} />
                        <span className="text-slate-400 truncate font-semibold">{entry.label}</span>
                      </div>
                      <span className="font-black text-white ml-2">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend Analytics: Role Titles + Org Type — responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Role Trends */}
        <Card className="bg-slate-900/40 border-white/5 hover:border-white/10 transition-all shadow-md">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">Top Role Titles</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {roleTrends.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-xs">
                <Briefcase className="w-5 h-5 mx-auto mb-1 opacity-20" />
                <p>No applications logged.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {roleTrends.map(({ role, count, responseRate }) => (
                  <div key={role} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-200 truncate max-w-[60%]">{role}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{count} applications</span>
                        <span className={`font-black ${responseRate > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                          {responseRate}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950/80 border border-white/5 rounded-full overflow-hidden flex">
                      <div
                        className="h-full rounded-full bg-indigo-500/80 transition-all duration-500"
                        style={{ width: `${(count / (roleTrends[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Org Type Breakdown */}
        <Card className="bg-slate-900/40 border-white/5 hover:border-white/10 transition-all shadow-md">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">By Org Type</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {orgTypeStats.length === 0 || (orgTypeStats.length === 1 && orgTypeStats[0].type === "unset") ? (
              <div className="text-center py-4 text-slate-500 text-xs">
                <Target className="w-5 h-5 mx-auto mb-1 opacity-20" />
                <p>Add org types to applications to see metrics.</p>
                <p className="text-[10px] mt-0.5 opacity-60">Edit Application &rarr; Org Type</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {orgTypeStats.filter((s) => s.type !== "unset").map(({ type, label, count, responseRate }) => {
                  const cfg = ORG_TYPE_CONFIG[type as OrgType];
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg?.bgColor || "bg-white/5"} ${cfg?.color || "text-slate-300"}`}>
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{count} applications</span>
                          <span className={`font-black ${responseRate > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                            {responseRate}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950/80 border border-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(count / (orgTypeStats[0]?.count || 1)) * 100}%`,
                            backgroundColor: type === "startup" ? "#f97316" : type === "scaleup" ? "#a855f7" : type === "enterprise" ? "#3b82f6" : type === "agency" ? "#ec4899" : type === "consulting" ? "#14b8a6" : "#64748b",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {orgTypeStats.find((s) => s.type === "unset") && (
                  <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
                    + {orgTypeStats.find((s) => s.type === "unset")?.count} untagged applications
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Activity + Goals + Resume Analytics — responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Weekly Activity — compact */}
        <Card className="bg-slate-900/40 border-white/5 hover:border-white/10 transition-all shadow-md">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">Weekly Consistency</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-end gap-1 h-14 pt-2">
              {weeklyActivityData.map(({ day, apps }) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-purple-500 transition-all shadow-inner"
                    style={{ height: `${apps > 0 ? Math.max((apps / 5) * 44, 8) : 3}px`, opacity: apps > 0 ? 1 : 0.25 }}
                  />
                  <span className="text-[9px] text-slate-500 font-bold uppercase">{day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Goals — compact */}
        <Card className="bg-slate-900/40 border-white/5 hover:border-white/10 transition-all shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">Today&apos;s Habits</CardTitle>
            <Link href="/goals" className="text-[10px] text-indigo-400 font-bold flex items-center gap-0.5 hover:underline uppercase tracking-wider">
              All <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {todayGoals.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-xs">
                <Target className="w-5 h-5 mx-auto mb-1 opacity-20" />
                <p>No daily goals set.</p>
                <Link href="/goals" className="text-indigo-400 text-[10px] mt-1 font-bold inline-block hover:underline">
                  Set a goal &rarr;
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {todayGoals.map((g) => (
                  <li key={g.id} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      g.doneToday ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : "border-white/15 bg-white/5"
                    }`}>
                      {g.doneToday && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                    </div>
                    <span className={`text-xs font-medium ${g.doneToday ? "line-through text-slate-500" : "text-slate-200"}`}>
                      {g.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Base Resume Usage — compact */}
        <Card className="bg-slate-900/40 border-white/5 hover:border-white/10 transition-all shadow-md">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">Resume Usage</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {categoryStats.total === 0 ? (
              <div className="text-center py-4 text-slate-500 text-xs flex flex-col items-center">
                <FileText className="w-5 h-5 mb-1 opacity-20" />
                <p>No usage tracked yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(Object.keys(CATEGORY_CONFIG) as ResumeCategory[]).map((cat) => {
                  const catCfg = getCategoryConfig(cat);
                  const count = categoryStats.counts[cat] || 0;
                  const pct = categoryStats.total > 0 ? Math.round((count / categoryStats.total) * 100) : 0;
                  const CatIcon = getCategoryIcon(catCfg.iconName);

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <CatIcon className={`w-3.5 h-3.5 ${catCfg.color}`} />
                          <span className="font-semibold text-slate-200">{catCfg.label}</span>
                        </div>
                        <span className="text-slate-400 font-bold">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950/80 border border-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              cat === "gtm" ? "#3b82f6" :
                              cat === "marketing" ? "#f43f5e" :
                              cat === "sales_ops" ? "#10b981" : "#64748b"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications — compact table */}
      <Card className="bg-slate-900/40 border-white/5 hover:border-white/10 transition-all shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
          <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">Recent Applications</CardTitle>
          <Link href="/applications" className="text-[10px] text-indigo-400 font-bold flex items-center gap-0.5 hover:underline uppercase tracking-wider">
            View all <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {applications.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="font-bold text-sm text-slate-300">No applications registered.</p>
              <p className="text-xs mt-1 opacity-70">Add your first application to start tracking!</p>
              <Link href="/applications/new" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-4 py-2 text-xs shadow-lg shadow-indigo-500/10 mt-4 transition-all">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add First Application
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {applications.slice(0, 7).map((app) => {
                const cfg = getApplicationStatusConfig(app.status);
                const appliedLabel = formatApplicationDate(app.appliedAt, "MMM d");
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between py-2.5 hover:bg-white/5 px-2 -mx-2 rounded-xl transition-colors gap-2"
                  >
                    <FindSimilarRolesButton
                      sourceApplication={app}
                      existingApplications={applications}
                      userProfile={profile}
                      onApplicationCreated={(newApp) =>
                        setApplications((prev) => [newApp, ...prev])
                      }
                    />
                    <Link
                      href={`/applications/${app.id}`}
                      className="flex items-center justify-between flex-1 min-w-0"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-white truncate">{app.role}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{app.company}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        {appliedLabel && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            {appliedLabel}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-current/25 bg-current/10 ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
