"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2, RefreshCw, Users, UserCheck, UserX, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { SignupStats } from "@/lib/signup-stats";

const ADMIN_EMAIL = "marcsherwood@gmail.com";

function formatResetTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "warning"
      ? "text-amber-300"
      : tone === "danger"
      ? "text-red-300"
      : "text-white";

  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-black mt-1 ${toneClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export function AdminSignupStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SignupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const loadStats = useCallback(
    async (silent = false) => {
      if (!user || !isAdmin) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/auth/signup-stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load signup stats");
        setStats(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load signup stats";
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, isAdmin]
  );

  useEffect(() => {
    if (isAdmin) loadStats();
  }, [isAdmin, loadStats]);

  if (!isAdmin) return null;

  const hourUsagePct = stats
    ? Math.min(100, Math.round((stats.signupsThisHour / stats.signupLimit) * 100))
    : 0;

  return (
    <Card className="bg-slate-900/40 border-white/5 shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-white tracking-wide uppercase">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            Sign-up Activity
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadStats(true)}
            disabled={refreshing || loading}
            className="border-white/5 hover:bg-white/5 text-slate-300 hover:text-white rounded-lg text-xs h-8"
          >
            {refreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-slate-500 font-medium mt-1">
          Open sign-ups are capped at {stats?.signupLimit ?? 10} new accounts per hour.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile
                label="Total Users"
                value={stats.totalUsers}
                sub="All registered accounts"
              />
              <StatTile
                label="Approved"
                value={stats.approved}
                tone="success"
                sub="Can sign in now"
              />
              <StatTile
                label="Denied"
                value={stats.denied}
                tone={stats.denied > 0 ? "danger" : "default"}
              />
              <StatTile
                label="Pending"
                value={stats.pending}
                tone={stats.pending > 0 ? "warning" : "default"}
              />
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Clock className="w-4 h-4 text-indigo-300" />
                  This Hour
                </div>
                <span className="text-sm font-bold text-indigo-200">
                  {stats.signupsThisHour} / {stats.signupLimit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                  style={{ width: `${hourUsagePct}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                {stats.slotsRemaining} slot{stats.slotsRemaining === 1 ? "" : "s"} left · resets around{" "}
                {formatResetTime(stats.windowResetsAt)}
              </p>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {stats.totalUsers} total
              </span>
              <span className="inline-flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-400" />
                {stats.approved} active
              </span>
              {stats.denied > 0 && (
                <span className="inline-flex items-center gap-1">
                  <UserX className="w-3 h-3 text-red-400" />
                  {stats.denied} blocked
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500 text-center py-6">Could not load sign-up stats.</p>
        )}
      </CardContent>
    </Card>
  );
}
