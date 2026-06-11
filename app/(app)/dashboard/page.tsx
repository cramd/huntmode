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
import { STATUS_CONFIG, MOTIVATIONAL_MESSAGES, CATEGORY_CONFIG, type ResumeCategory } from "@/lib/types";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.displayName?.split(" ")[0] || "Hunter"} 👋
          </h1>
          <p className="mt-1 text-muted-foreground italic">&ldquo;{motivationalMsg}&rdquo;</p>
        </div>
        <Link href="/applications/new" className={buttonVariants()}>
          <Plus className="w-4 h-4 mr-2" />
          New Application
        </Link>
      </div>

      {/* Streak + Weekly Goal Hero */}
      <div className="grid grid-cols-2 gap-6">
        {/* Streak */}
        <Card className="border-0 bg-gradient-to-br from-primary/90 to-primary text-primary-foreground overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/70 text-sm font-medium">Current Streak</p>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-5xl font-black">{streak}</span>
                  <span className="text-xl font-bold mb-1">days</span>
                </div>
                <p className="text-primary-foreground/70 text-sm mt-1">
                  {streak === 0
                    ? "Start today — apply to 1 job!"
                    : streak < 7
                    ? "Building momentum! Keep going."
                    : streak < 30
                    ? "On fire! You're unstoppable."
                    : "Legendary dedication. You're a machine."}
                </p>
              </div>
              <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
                <Flame className="w-12 h-12 text-amber-300" />
              </div>
            </div>
            {profile?.longestStreak && profile.longestStreak > 0 && (
              <p className="mt-4 text-xs text-primary-foreground/50 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                Best streak: {profile.longestStreak} days
              </p>
            )}
          </CardContent>
        </Card>

        {/* Weekly Goal */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Weekly Goal</p>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-4xl font-black text-foreground">{weeklyApps}</span>
                  <span className="text-xl text-muted-foreground font-semibold mb-1">/ {weeklyGoal}</span>
                </div>
                <p className="text-sm text-muted-foreground">applications this week</p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Target className="w-8 h-8 text-primary" />
              </div>
            </div>
            <Progress value={weeklyProgress} className="h-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              {weeklyApps >= weeklyGoal
                ? "🎉 Weekly goal crushed! Consider raising the bar."
                : `${weeklyGoal - weeklyApps} more to hit your goal`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Applications", value: stats.total, icon: Briefcase, color: "text-blue-500" },
          { label: "Active Pipelines", value: stats.active, icon: TrendingUp, color: "text-violet-500" },
          { label: "Offers Received", value: stats.offers, icon: Trophy, color: "text-emerald-500" },
          { label: "Response Rate", value: `${stats.responseRate}%`, icon: Zap, color: "text-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center ${color} bg-opacity-10`}
                style={{ background: "var(--muted)" }}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-3 gap-6">
        {/* Funnel Chart */}
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Application Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                  labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                <Briefcase className="w-8 h-8 mb-2 opacity-30" />
                No applications yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
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
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                      formatter={(value, name) => [value, STATUS_CONFIG[name as keyof typeof STATUS_CONFIG]?.label || name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {statusData.slice(0, 4).map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[entry.name] }} />
                        <span className="text-muted-foreground">{entry.label}</span>
                      </div>
                      <span className="font-semibold text-foreground">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Weekly Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">This Week&apos;s Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-20">
              {weeklyActivityData.map(({ day, apps }) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-primary/80 transition-all"
                    style={{ height: `${apps > 0 ? Math.max((apps / 5) * 64, 8) : 4}px`, opacity: apps > 0 ? 1 : 0.2 }}
                  />
                  <span className="text-xs text-muted-foreground">{day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Goals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Today&apos;s Goals</CardTitle>
            <Link href="/goals" className="text-xs text-primary flex items-center gap-1 hover:underline">
              All goals <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {todayGoals.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No daily goals set yet.</p>
                <Link href="/goals" className="text-primary text-xs mt-1 inline-block hover:underline">
                  Set your first goal →
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {todayGoals.map((g) => (
                  <li key={g.id} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      g.doneToday ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30"
                    }`}>
                      {g.doneToday && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className={`text-sm ${g.doneToday ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {g.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Base Resume Analytics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Base Resume Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryStats.total === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm flex flex-col items-center justify-center h-full">
                <FileText className="w-8 h-8 mb-2 opacity-30" />
                <p>No resume category tracking data yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(Object.keys(CATEGORY_CONFIG) as ResumeCategory[]).map((cat) => {
                  const catCfg = CATEGORY_CONFIG[cat];
                  const count = categoryStats.counts[cat] || 0;
                  const pct = categoryStats.total > 0 ? Math.round((count / categoryStats.total) * 100) : 0;
                  const CatIcon = getCategoryIcon(catCfg.iconName);

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className={`p-1 rounded-md ${catCfg.bgColor}`}>
                            <CatIcon className={`w-3.5 h-3.5 ${catCfg.color}`} />
                          </div>
                          <span className="font-medium text-foreground">{catCfg.label}</span>
                        </div>
                        <span className="text-muted-foreground font-semibold">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
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

      {/* Recent Applications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
          <Link href="/applications" className="text-xs text-primary flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No applications yet.</p>
              <p className="text-sm mt-1">Start your hunt — add your first application!</p>
              <Link href="/applications/new" className={buttonVariants({ className: "mt-4" })}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Application
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {applications.slice(0, 5).map((app) => {
                const cfg = STATUS_CONFIG[app.status];
                return (
                  <Link
                    key={app.id}
                    href={`/applications/${app.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">{app.role}</p>
                      <p className="text-xs text-muted-foreground">{app.company}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {app.appliedAt && (
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(app.appliedAt), "MMM d")}
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.color}`}>
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
