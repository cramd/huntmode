"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Target,
  Trash2,
  Check,
  Flame,
  Calendar,
  Trophy,
  Loader2,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import {
  getGoals,
  saveGoal,
  updateGoalCompletion,
  deleteGoal,
  getActivityLogs,
  getUserProfile,
} from "@/lib/db";
import type { Goal, ActivityLog, UserProfile } from "@/lib/types";
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { toast } from "sonner";

const MILESTONE_BADGES = [
  { days: 3, label: "3-Day Spark", emoji: "⚡", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  { days: 7, label: "7-Day Streak", emoji: "🔥", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  { days: 14, label: "2-Week Warrior", emoji: "🛡️", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { days: 30, label: "30-Day Legend", emoji: "🏆", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { days: 60, label: "60-Day Machine", emoji: "🤖", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { days: 100, label: "100-Day Elite", emoji: "💎", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
];

const PRESET_PACKS = [
  {
    id: "job-search",
    label: "Job Search Machine",
    emoji: "🎯",
    color: "from-indigo-600 to-purple-600",
    borderColor: "border-indigo-500/30",
    bg: "bg-indigo-500/10",
    goals: [
      { title: "Apply to 2 jobs", type: "daily" as const },
      { title: "Research 3 companies", type: "daily" as const },
      { title: "Follow up on 1 application", type: "daily" as const },
    ],
  },
  {
    id: "momentum",
    label: "Momentum Builder",
    emoji: "⚡",
    color: "from-amber-500 to-orange-500",
    borderColor: "border-amber-500/30",
    bg: "bg-amber-500/10",
    goals: [
      { title: "Network with 1 person", type: "daily" as const },
      { title: "Practice 1 interview question", type: "daily" as const },
      { title: "10 cold LinkedIn messages", type: "weekly" as const },
    ],
  },
  {
    id: "wellbeing",
    label: "Wellbeing & Focus",
    emoji: "🧠",
    color: "from-emerald-600 to-teal-600",
    borderColor: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    goals: [
      { title: "Take a 15 min walk", type: "daily" as const },
      { title: "Celebrate 1 small win", type: "daily" as const },
      { title: "Review my goals & progress", type: "weekly" as const },
    ],
  },
];

const QUICK_ADD_GOALS = [
  "Apply to 2 jobs",
  "Research 3 companies",
  "Follow up on 1 application",
  "Update LinkedIn profile",
  "Practice 1 interview question",
  "Network with 1 person",
];

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", type: "daily" as "daily" | "weekly", targetCount: 1 });
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getGoals(user.uid),
      getActivityLogs(user.uid, 90),
      getUserProfile(user.uid),
    ]).then(([g, a, p]) => {
      setGoals(g);
      setActivity(a);
      setProfile(p);
      setLoading(false);
    });
  }, [user]);

  const toggleGoalToday = async (goal: Goal) => {
    if (!user) return;
    const already = goal.completedDates.includes(today);
    const updated = already
      ? goal.completedDates.filter((d) => d !== today)
      : [...goal.completedDates, today];
    await updateGoalCompletion(user.uid, goal.id, updated);
    setGoals((gs) =>
      gs.map((g) => (g.id === goal.id ? { ...g, completedDates: updated } : g))
    );
  };

  const handleAddGoal = async () => {
    if (!user || !newGoal.title.trim()) return;
    setSaving(true);
    try {
      const id = await saveGoal(user.uid, {
        title: newGoal.title.trim(),
        type: newGoal.type,
        targetCount: newGoal.targetCount,
        completedDates: [],
      });
      const created: Goal = {
        id,
        uid: user.uid,
        title: newGoal.title.trim(),
        type: newGoal.type,
        targetCount: newGoal.targetCount,
        completedDates: [],
        createdAt: new Date().toISOString(),
      };
      setGoals((gs) => [...gs, created]);
      setNewGoal({ title: "", type: "daily", targetCount: 1 });
      setShowAdd(false);
      toast.success("Goal added!");
    } catch {
      toast.error("Failed to add goal");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!user) return;
    await deleteGoal(user.uid, id);
    setGoals((gs) => gs.filter((g) => g.id !== id));
    toast.success("Goal removed");
  };

  const handleAddPack = async (pack: (typeof PRESET_PACKS)[0]) => {
    if (!user) return;
    const existing = new Set(goals.map((g) => g.title.toLowerCase()));
    const toAdd = pack.goals.filter((p) => !existing.has(p.title.toLowerCase()));
    if (toAdd.length === 0) {
      toast("All goals from this pack are already added!");
      return;
    }
    try {
      const created: Goal[] = await Promise.all(
        toAdd.map(async (p) => {
          const id = await saveGoal(user.uid, {
            title: p.title,
            type: p.type,
            targetCount: p.type === "weekly" ? 5 : 1,
            completedDates: [],
          });
          return {
            id,
            uid: user.uid,
            title: p.title,
            type: p.type,
            targetCount: p.type === "weekly" ? 5 : 1,
            completedDates: [],
            createdAt: new Date().toISOString(),
          };
        })
      );
      setGoals((gs) => [...gs, ...created]);
      toast.success(`${pack.label} pack added — ${created.length} new habits!`);
    } catch {
      toast.error("Failed to add pack");
    }
  };

  // Streak heatmap: last 90 days
  const heatmapDays = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, "yyyy-MM-dd");
      const log = activity.find((a) => a.date === dateStr);
      const goalDone = goals.filter((g) => g.completedDates.includes(dateStr)).length;
      days.push({ date: dateStr, count: (log?.appsSubmitted || 0) + goalDone });
    }
    return days;
  }, [activity, goals]);

  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, "yyyy-MM-dd");
      const hasActivity = heatmapDays.some((h) => h.date === dateStr && h.count > 0);
      if (hasActivity) s++;
      else if (i > 0) break; // Allow today to be 0 (haven't done anything yet today)
    }
    return s;
  }, [heatmapDays]);

  const earnedBadges = MILESTONE_BADGES.filter((b) => streak >= b.days);
  const nextBadge = MILESTONE_BADGES.find((b) => streak < b.days);

  const weeklyStats = useMemo(() => {
    const thisWeek = heatmapDays.filter(({ date }) => {
      const d = new Date(date + "T00:00:00");
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });
    const activeDays = thisWeek.filter((d) => d.count > 0).length;
    const totalActivity = thisWeek.reduce((sum, d) => sum + d.count, 0);
    return { activeDays, totalActivity };
  }, [heatmapDays, weekStart, weekEnd]);

  const dailyGoals = goals.filter((g) => g.type === "daily");
  const weeklyGoals = goals.filter((g) => g.type === "weekly");

  const todayDoneCount = dailyGoals.filter((g) => g.completedDates.includes(today)).length;
  const todayProgress = dailyGoals.length > 0 ? (todayDoneCount / dailyGoals.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Goals & Habits</h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            Track daily routines, build job search habits, and log activity streaks.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition-all">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Goal
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-purple-950/40 shadow-lg shadow-indigo-500/5 transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner">
              <Flame className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
            <div>
              <p className="text-3xl font-black text-white">{streak}</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Day Streak</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-white/5 hover:border-white/10 transition-all shadow-md">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shadow-inner">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-3xl font-black text-white">{weeklyStats.activeDays}</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Active Days This Week</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-white/5 hover:border-white/10 transition-all shadow-md">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shadow-inner">
              <Trophy className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-3xl font-black text-white">{profile?.longestStreak || streak}</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Best Streak (Days)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Progress */}
      {dailyGoals.length > 0 && (
        <Card className="bg-slate-900/40 border-white/5 shadow-md">
          <CardContent className="p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">Today&apos;s Habits Progress</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {todayDoneCount} of {dailyGoals.length} tasks completed today
                </p>
              </div>
              {todayDoneCount === dailyGoals.length && dailyGoals.length > 0 && (
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 uppercase tracking-wider">
                  <Trophy className="w-4 h-4" />
                  Day Complete!
                </span>
              )}
            </div>
            <Progress value={todayProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Activity Heatmap */}
      <Card className="bg-slate-900/40 border-white/5 shadow-md">
        <CardHeader className="pb-3 border-b border-white/5">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">Consistency Heatmap (90 Days)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-1.5">
            {heatmapDays.map(({ date, count }) => (
              <div
                key={date}
                title={`${date}: ${count} activities logged`}
                className={`w-3.5 h-3.5 rounded-sm transition-all duration-200 cursor-pointer ${
                  count === 0
                    ? "bg-slate-950 border border-white/5 hover:bg-slate-900"
                    : count === 1
                    ? "bg-indigo-950 border border-indigo-900/30 hover:bg-indigo-900"
                    : count === 2
                    ? "bg-indigo-800 hover:bg-indigo-700"
                    : count === 3
                    ? "bg-indigo-600 hover:bg-indigo-500"
                    : "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.3)] hover:bg-indigo-300"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <div
                key={l}
                className={`w-3 h-3 rounded-sm ${
                  l === 0
                    ? "bg-slate-950 border border-white/5"
                    : l === 1
                    ? "bg-indigo-950 border border-indigo-900/30"
                    : l === 2
                    ? "bg-indigo-800"
                    : l === 3
                    ? "bg-indigo-600"
                    : "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                }`}
              />
            ))}
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Milestone Badges */}
      {(earnedBadges.length > 0 || nextBadge) && (
        <Card className="bg-slate-900/40 border-white/5 shadow-md overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-5 border-b border-white/5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Milestone Badges
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <div className="flex flex-wrap gap-3">
              {MILESTONE_BADGES.map((b) => {
                const earned = streak >= b.days;
                return (
                  <div
                    key={b.days}
                    title={earned ? `Earned! ${b.days}-day streak` : `${b.days - streak} more days to unlock`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                      earned
                        ? `${b.bg} ${b.color} shadow-sm`
                        : "bg-slate-950/50 border-white/5 text-slate-600 opacity-60 grayscale"
                    }`}
                  >
                    <span className={earned ? "" : "opacity-40"}>{b.emoji}</span>
                    {b.label}
                    {earned && <Check className="w-3 h-3" />}
                  </div>
                );
              })}
            </div>
            {nextBadge && (
              <p className="text-[10px] text-slate-500 mt-3 font-medium">
                <span className="text-white font-bold">{nextBadge.days - streak} more days</span> to unlock {nextBadge.emoji} {nextBadge.label}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Starter Packs (shown when user has < 2 goals) */}
      {goals.length < 2 && (
        <Card className="bg-gradient-to-br from-slate-900/60 via-indigo-950/30 to-slate-900/60 border border-indigo-500/20 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Starter Packs</p>
                <p className="text-sm font-black text-white">Pick a pack to kickstart your routine</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              One click adds a curated set of daily habits designed to build momentum. You can edit or delete any after.
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRESET_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handleAddPack(pack)}
                  className={`text-left p-4 rounded-xl border ${pack.borderColor} ${pack.bg} hover:scale-[1.02] active:scale-[0.98] transition-all group`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{pack.emoji}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">{pack.label}</p>
                  <ul className="space-y-0.5">
                    {pack.goals.map((g) => (
                      <li key={g.title} className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />
                        {g.title}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Goals */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-wide uppercase text-xs">Daily Habits</h2>
        {dailyGoals.length === 0 ? (
          <Card className="bg-slate-900/40 border-white/5 shadow-md">
            <CardContent className="py-10 text-center text-slate-500 text-sm space-y-3">
              <Target className="w-10 h-10 mx-auto opacity-20" />
              <div>
                <p className="font-bold text-slate-400 text-base mb-1">No daily habits yet</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Add habits above using a Starter Pack, quick-add a preset, or create a custom goal.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAdd(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Custom Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {dailyGoals.map((goal) => {
              const doneToday = goal.completedDates.includes(today);
              const streak7 = Array.from({ length: 7 }, (_, i) => {
                const d = subDays(new Date(), i);
                return goal.completedDates.includes(format(d, "yyyy-MM-dd"));
              });
              const recentStreak = streak7.filter(Boolean).length;

              return (
                <div
                  key={goal.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    doneToday
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-white/5 bg-slate-950/40 hover:border-white/10"
                  }`}
                >
                  <button
                    onClick={() => toggleGoalToday(goal)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      doneToday
                        ? "border-emerald-500 bg-emerald-500 scale-110"
                        : "border-white/15 bg-white/5 hover:border-indigo-500"
                    }`}
                  >
                    {doneToday && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${doneToday ? "line-through text-slate-500" : "text-white"}`}>
                      {goal.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {streak7.reverse().map((done, i) => (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 rounded-full ${
                            done ? "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.3)]" : "bg-slate-900 border border-white/5"
                          }`}
                          title={format(subDays(new Date(), 6 - i), "MMM d")}
                        />
                      ))}
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1.5">{recentStreak}/7 Days Consistency</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly Goals */}
      {weeklyGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-wide uppercase text-xs">Weekly Targets</h2>
          <div className="space-y-2">
            {weeklyGoals.map((goal) => {
              const weekDates = Array.from({ length: 7 }, (_, i) =>
                format(new Date(weekStart.getTime() + i * 86400000), "yyyy-MM-dd")
              );
              const completedThisWeek = goal.completedDates.filter((d) =>
                weekDates.includes(d)
              ).length;
              const progress = Math.min((completedThisWeek / goal.targetCount) * 100, 100);

              return (
                <div key={goal.id} className="p-4 rounded-xl border border-white/5 bg-slate-900/40 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-slate-200">{goal.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">
                        {completedThisWeek}/{goal.targetCount} Complete
                      </span>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Add Presets */}
      {goals.length >= 2 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick-Add More Habits</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ADD_GOALS.filter(
              (p) => !goals.some((g) => g.title.toLowerCase() === p.toLowerCase())
            ).map((preset) => (
              <button
                key={preset}
                onClick={async () => {
                  if (!user) return;
                  const id = await saveGoal(user.uid, {
                    title: preset,
                    type: "daily",
                    targetCount: 1,
                    completedDates: [],
                  });
                  setGoals((gs) => [
                    ...gs,
                    { id, uid: user.uid, title: preset, type: "daily", targetCount: 1, completedDates: [], createdAt: new Date().toISOString() },
                  ]);
                  toast.success(`"${preset}" added!`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-indigo-500/10 hover:text-indigo-400 text-xs font-semibold text-slate-400 border border-white/5 transition-all duration-200"
              >
                <Plus className="w-3 h-3 text-indigo-400" />
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-slate-900 border-white/5 rounded-2xl max-w-sm p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Add New Habit Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-semibold">Habit Title</Label>
              <Input
                placeholder="e.g. Apply to 2 jobs"
                value={newGoal.title}
                onChange={(e) => setNewGoal((g) => ({ ...g, title: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
                className="bg-slate-950 border-white/5 text-white rounded-xl focus:border-indigo-500/30"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-semibold">Frequency Type</Label>
              <Select
                value={newGoal.type}
                onValueChange={(v) => setNewGoal((g) => ({ ...g, type: v as "daily" | "weekly" }))}
              >
                <SelectTrigger className="bg-slate-950 border-white/5 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/5 text-white">
                  <SelectItem value="daily">Daily (repeat every day)</SelectItem>
                  <SelectItem value="weekly">Weekly (target per week)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newGoal.type === "weekly" && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-400 font-semibold">Weekly Target Count</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={newGoal.targetCount}
                  onChange={(e) =>
                    setNewGoal((g) => ({ ...g, targetCount: parseInt(e.target.value) || 1 }))
                  }
                  className="bg-slate-950 border-white/5 text-white rounded-xl focus:border-indigo-500/30"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowAdd(false)} className="border-white/10 hover:bg-white/5 text-white rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAddGoal} disabled={saving || !newGoal.title.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track Habit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
