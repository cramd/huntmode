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
import { STATUS_CONFIG, MOTIVATIONAL_MESSAGES, CATEGORY_CONFIG, ORG_TYPE_CONFIG, type ResumeCategory, type OrgType } from "@/lib/types";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { Compass, Megaphone, Sliders, FileText } from "lucide-react";

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
      const category = resume?.category || "general";
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header — compact */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.displayName?.split(" ")[0] || "Hunter"} 👋
          </h1>
          <p className="text-xs text-muted-foreground italic mt-0.5">&ldquo;{motivationalMsg}&rdquo;</p>
        </div>
        <Link href="/applications/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Application
        </Link>
      </div>

      {/* Top row: Stats + Streak + Weekly Goal — responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 4 stat cards */}
        {[
          { label: "Total", value: stats.total, icon: Briefcase, color: "text-blue-500" },
          { label: "Active", value: stats.active, icon: TrendingUp, color: "text-violet-500" },
          { label: "Offers", value: stats.offers, icon: Trophy, color: "text-emerald-500" },
          { label: "Response", value: `${stats.responseRate}%`, icon: Zap, color: "text-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--muted)" }}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Streak — compact */}
        <Card className="border-0 bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-primary-foreground/60 font-medium uppercase tracking-wider">Streak</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{streak}</span>
                <span className="text-xs font-semibold opacity-70">days</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-amber-300" />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Goal — compact */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Weekly</p>
              <span className="text-xs font-bold text-foreground">{weeklyApps}/{weeklyGoal}</span>
            </div>
            <Progress value={weeklyProgress} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1">
              {weeklyApps >= weeklyGoal ? "🎉 Goal hit!" : `${weeklyGoal - weeklyApps} to go`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle row: Pipeline + Status + Weekly Activity — responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Funnel Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">Application Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={funnelData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                  labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Pie — compact */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">Status</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {statusData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-muted-foreground text-xs">
                <Briefcase className="w-6 h-6 mb-1 opacity-30" />
                No applications yet
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
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: 11 }}
                      formatter={(value, name) => [value, STATUS_CONFIG[name as keyof typeof STATUS_CONFIG]?.label || name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 flex-1 min-w-0">
                  {statusData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[entry.name] }} />
                        <span className="text-muted-foreground truncate">{entry.label}</span>
                      </div>
                      <span className="font-semibold text-foreground ml-2">{entry.value}</span>
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
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">Top Role Titles</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {roleTrends.length === 0 ? (
              <div className="text-center py-3 text-muted-foreground text-xs">
                <Briefcase className="w-5 h-5 mx-auto mb-1 opacity-30" />
                <p>No applications yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {roleTrends.map(({ role, count, responseRate }) => (
                  <div key={role} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-foreground truncate max-w-[60%]">{role}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{count} apps</span>
                        <span className={`font-semibold ${responseRate > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {responseRate}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all duration-500"
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
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">By Org Type</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {orgTypeStats.length === 0 || (orgTypeStats.length === 1 && orgTypeStats[0].type === "unset") ? (
              <div className="text-center py-3 text-muted-foreground text-xs">
                <Target className="w-5 h-5 mx-auto mb-1 opacity-30" />
                <p>Tag applications with org types to see trends.</p>
                <p className="text-[10px] mt-0.5">Edit an application → Org Type dropdown</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orgTypeStats.filter((s) => s.type !== "unset").map(({ type, label, count, responseRate }) => {
                  const cfg = ORG_TYPE_CONFIG[type as OrgType];
                  return (
                    <div key={type} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg?.bgColor || ""} ${cfg?.color || ""}`}>
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{count} apps</span>
                          <span className={`font-semibold ${responseRate > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                            {responseRate}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
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
                  <p className="text-[10px] text-muted-foreground mt-1">
                    + {orgTypeStats.find((s) => s.type === "unset")?.count} untagged
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
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">This Week</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-end gap-1 h-14">
              {weeklyActivityData.map(({ day, apps }) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-t bg-primary/80 transition-all"
                    style={{ height: `${apps > 0 ? Math.max((apps / 5) * 48, 6) : 3}px`, opacity: apps > 0 ? 1 : 0.2 }}
                  />
                  <span className="text-[9px] text-muted-foreground">{day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Goals — compact */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">Today&apos;s Goals</CardTitle>
            <Link href="/goals" className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
              All <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {todayGoals.length === 0 ? (
              <div className="text-center py-3 text-muted-foreground text-xs">
                <Target className="w-5 h-5 mx-auto mb-1 opacity-30" />
                <p>No daily goals set.</p>
                <Link href="/goals" className="text-primary text-[10px] mt-0.5 inline-block hover:underline">
                  Set a goal →
                </Link>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {todayGoals.map((g) => (
                  <li key={g.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      g.doneToday ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30"
                    }`}>
                      {g.doneToday && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className={`text-xs ${g.doneToday ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {g.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Base Resume Analytics — compact */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">Resume Usage</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {categoryStats.total === 0 ? (
              <div className="text-center py-3 text-muted-foreground text-xs flex flex-col items-center">
                <FileText className="w-5 h-5 mb-1 opacity-30" />
                <p>No tracking data yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(Object.keys(CATEGORY_CONFIG) as ResumeCategory[]).map((cat) => {
                  const catCfg = CATEGORY_CONFIG[cat];
                  const count = categoryStats.counts[cat] || 0;
                  const pct = categoryStats.total > 0 ? Math.round((count / categoryStats.total) * 100) : 0;
                  const CatIcon = getCategoryIcon(catCfg.iconName);

                  return (
                    <div key={cat} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1">
                          <CatIcon className={`w-3 h-3 ${catCfg.color}`} />
                          <span className="font-medium text-foreground">{catCfg.label}</span>
                        </div>
                        <span className="text-muted-foreground font-semibold">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
          <CardTitle className="text-sm font-semibold">Recent Applications</CardTitle>
          <Link href="/applications" className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
            View all <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {applications.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-sm">No applications yet.</p>
              <p className="text-xs mt-0.5">Start your hunt — add your first application!</p>
              <Link href="/applications/new" className={buttonVariants({ size: "sm", className: "mt-3" })}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add First Application
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {applications.slice(0, 7).map((app) => {
                const cfg = STATUS_CONFIG[app.status];
                return (
                  <Link
                    key={app.id}
                    href={`/applications/${app.id}`}
                    className="flex items-center justify-between py-2 hover:bg-muted/50 px-2 -mx-2 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-xs text-foreground truncate">{app.role}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{app.company}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {app.appliedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(parseISO(app.appliedAt), "MMM d")}
                        </span>
                      )}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.bgColor} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
