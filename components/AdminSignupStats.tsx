"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Loader2,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Clock,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { isAdminEmail } from "@/lib/is-admin";
import type { AdminUserRow, SignupStats } from "@/lib/signup-stats";
import type { AccessRequestStatus } from "@/lib/types";
import { USAGE_FEATURE_LABELS } from "@/lib/usage-labels";

function formatResetTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatJoined(iso: string) {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: AccessRequestStatus }) {
  if (status === "pending") {
    return (
      <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/15 text-[10px]">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15 text-[10px]">
        <UserCheck className="w-3 h-3 mr-1" />
        Approved
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/15 text-[10px]">
      <UserX className="w-3 h-3 mr-1" />
      Denied
    </Badge>
  );
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

function UserDirectoryTable({ users }: { users: AdminUserRow[] }) {
  const totalApps = users.reduce((sum, u) => sum + u.applicationCount, 0);
  const totalTokens = users.reduce((sum, u) => sum + u.totalTokensUsed, 0);
  const totalCost = users.reduce((sum, u) => sum + u.totalEstimatedCostUsd, 0);

  return (
    <div className="space-y-3 pt-2 border-t border-white/5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          All users
        </p>
        <span className="text-[10px] text-slate-500">
          {users.length} account{users.length === 1 ? "" : "s"} · {totalApps} application
          {totalApps === 1 ? "" : "s"} · ${totalCost.toFixed(2)} est. AI spend
        </span>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No registered accounts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5 font-bold">User</th>
                <th className="px-3 py-2.5 font-bold">Status</th>
                <th className="px-3 py-2.5 font-bold">Joined</th>
                <th className="px-3 py-2.5 font-bold text-right">Apps</th>
                <th className="px-3 py-2.5 font-bold text-right">Tokens</th>
                <th className="px-3 py-2.5 font-bold text-right">Est. AI $</th>
                <th className="px-3 py-2.5 font-bold text-center">Onboarded</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr
                  key={row.uid}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-200 truncate max-w-[180px]">
                      {row.name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                      {row.email}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                    {formatJoined(row.requestedAt)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-white tabular-nums">
                    {row.applicationCount}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                    {row.totalTokensUsed.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-amber-200">
                    ${row.totalEstimatedCostUsd.toFixed(4)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {row.onboardingCompleted ? (
                      <Check className="w-4 h-4 text-emerald-400 inline-block" aria-label="Yes" />
                    ) : (
                      <X className="w-4 h-4 text-slate-600 inline-block" aria-label="No" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-slate-950/40">
                <td
                  colSpan={3}
                  className="px-3 py-2.5 font-bold text-slate-300 uppercase tracking-wider text-[10px]"
                >
                  Subtotal
                </td>
                <td className="px-3 py-2.5 text-right font-bold text-white tabular-nums">
                  {totalApps}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-200">
                  {totalTokens.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-bold text-amber-200">
                  ${totalCost.toFixed(4)}
                </td>
                <td className="px-3 py-2.5" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function UsageRollupTable({ stats }: { stats: SignupStats["usageSummary"] }) {
  return (
    <div className="space-y-3 pt-2 border-t border-white/5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          AI usage · last {stats.days} days
        </p>
        <span className="text-[10px] text-slate-500">
          {stats.totalEvents} events · {stats.totalTokens.toLocaleString()} tokens · $
          {stats.estimatedCostUsd.toFixed(2)} est.
        </span>
      </div>

      {stats.byFeature.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">
          No usage events yet in this window.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5 font-bold">Feature</th>
                <th className="px-3 py-2.5 font-bold">Provider</th>
                <th className="px-3 py-2.5 font-bold text-right">Calls</th>
                <th className="px-3 py-2.5 font-bold text-right">Tokens</th>
                <th className="px-3 py-2.5 font-bold text-right">Est. cost</th>
              </tr>
            </thead>
            <tbody>
              {stats.byFeature.map((row) => (
                <tr
                  key={`${row.feature}-${row.provider}`}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-2.5 font-semibold text-slate-200">
                    {USAGE_FEATURE_LABELS[row.feature] ?? row.feature}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{row.provider}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                    {row.eventCount}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                    {row.totalTokens.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-amber-200">
                    ${row.estimatedCostUsd.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-slate-950/40">
                <td
                  colSpan={2}
                  className="px-3 py-2.5 font-bold text-slate-300 uppercase tracking-wider text-[10px]"
                >
                  Subtotal
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-200">
                  {stats.totalEvents}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-200">
                  {stats.totalTokens.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-bold text-amber-200">
                  ${stats.estimatedCostUsd.toFixed(4)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminSignupStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SignupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = isAdminEmail(user?.email);

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
            Users &amp; sign-ups
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
                {stats.slotsRemaining} slot{stats.slotsRemaining === 1 ? "" : "s"} left · resets
                around {formatResetTime(stats.windowResetsAt)}
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

            <UsageRollupTable stats={stats.usageSummary} />

            <UserDirectoryTable users={stats.users ?? []} />
          </>
        ) : (
          <p className="text-sm text-slate-500 text-center py-6">Could not load sign-up stats.</p>
        )}
      </CardContent>
    </Card>
  );
}
