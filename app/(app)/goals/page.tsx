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

const PRESET_DAILY_GOALS = [
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
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goals & Activity</h1>
          <p className="text-muted-foreground mt-1">
            Track your daily habits and stay consistent on the hunt.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Flame className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <p className="text-3xl font-black">{streak}</p>
              <p className="text-sm text-primary-foreground/70">day streak</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-3xl font-black text-foreground">{weeklyStats.activeDays}</p>
              <p className="text-sm text-muted-foreground">active days this week</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-3xl font-black text-foreground">{profile?.longestStreak || streak}</p>
              <p className="text-sm text-muted-foreground">best streak (days)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Progress */}
      {dailyGoals.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Today&apos;s Progress</p>
                <p className="text-sm text-muted-foreground">
                  {todayDoneCount} of {dailyGoals.length} tasks done
                </p>
              </div>
              {todayDoneCount === dailyGoals.length && dailyGoals.length > 0 && (
                <span className="text-emerald-600 font-semibold text-sm flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  Day Complete!
                </span>
              )}
            </div>
            <Progress value={todayProgress} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Activity Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Activity Heatmap (last 90 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {heatmapDays.map(({ date, count }) => (
              <div
                key={date}
                title={`${date}: ${count} activities`}
                className={`w-3.5 h-3.5 rounded-sm transition-colors ${
                  count === 0
                    ? "bg-muted"
                    : count === 1
                    ? "bg-primary/30"
                    : count === 2
                    ? "bg-primary/55"
                    : count >= 3
                    ? "bg-primary/85"
                    : "bg-primary"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <span>Less</span>
            {[0, 1, 2, 3].map((l) => (
              <div
                key={l}
                className={`w-3 h-3 rounded-sm ${
                  l === 0 ? "bg-muted" : l === 1 ? "bg-primary/30" : l === 2 ? "bg-primary/55" : "bg-primary/85"
                }`}
              />
            ))}
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Daily Goals */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Daily Goals</h2>
        {dailyGoals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No daily goals yet. Add some to build your routine!</p>
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
                    doneToday ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10" : "border-border bg-card"
                  }`}
                >
                  <button
                    onClick={() => toggleGoalToday(goal)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      doneToday
                        ? "border-emerald-500 bg-emerald-500 scale-110"
                        : "border-muted-foreground/30 hover:border-primary"
                    }`}
                  >
                    {doneToday && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${doneToday ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {goal.title}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {streak7.reverse().map((done, i) => (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 rounded-full ${done ? "bg-emerald-400" : "bg-muted"}`}
                          title={format(subDays(new Date(), 6 - i), "MMM d")}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">{recentStreak}/7 days</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-1.5 text-muted-foreground/40 hover:text-destructive transition-colors rounded-lg"
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
          <h2 className="text-lg font-bold">Weekly Goals</h2>
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
                <div key={goal.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-foreground">{goal.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {completedThisWeek}/{goal.targetCount}
                      </span>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors"
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

      {/* Suggested goals */}
      {dailyGoals.length < 3 && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Suggested Daily Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {PRESET_DAILY_GOALS.filter(
                (p) => !dailyGoals.some((g) => g.title.toLowerCase() === p.toLowerCase())
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary text-xs font-medium transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {preset}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Goal Title</Label>
              <Input
                placeholder="e.g. Apply to 2 jobs"
                value={newGoal.title}
                onChange={(e) => setNewGoal((g) => ({ ...g, title: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newGoal.type}
                onValueChange={(v) => setNewGoal((g) => ({ ...g, type: v as "daily" | "weekly" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (repeat every day)</SelectItem>
                  <SelectItem value="weekly">Weekly (target per week)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newGoal.type === "weekly" && (
              <div className="space-y-2">
                <Label>Weekly Target</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={newGoal.targetCount}
                  onChange={(e) =>
                    setNewGoal((g) => ({ ...g, targetCount: parseInt(e.target.value) || 1 }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGoal} disabled={saving || !newGoal.title.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
