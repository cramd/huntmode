"use client";

import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { getRecentUsageEvents } from "@/lib/db";
import { USAGE_FEATURE_LABELS } from "@/lib/usage-labels";
import type { UsageEvent } from "@/lib/types";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RecentAiUsage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    getRecentUsageEvents(user.uid, 20)
      .then((rows) => {
        if (!cancelled) setEvents(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <Card className="bg-slate-900/40 border-white/5 shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-white tracking-wide uppercase">
          <Zap className="w-4 h-4 text-amber-400" />
          Your Hunt spend history
        </CardTitle>
        <p className="text-[10px] text-slate-500 font-medium mt-1">
          Estimated API cost for AI on HuntMode during your job search — usually pennies compared to
          the time you save tailoring, scoring fit, and prepping interviews.
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No Hunt spend tracked yet. Generate a tailored doc or run fit analysis — your running
            total will show in the sidebar.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5 font-bold">When</th>
                  <th className="px-3 py-2.5 font-bold">Feature</th>
                  <th className="px-3 py-2.5 font-bold text-right">Tokens</th>
                  <th className="px-3 py-2.5 font-bold text-right">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                      {formatWhen(event.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-200">
                        {USAGE_FEATURE_LABELS[event.feature] ?? event.feature}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                        {event.provider} · {event.modelId}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                      {event.totalTokens.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-amber-200">
                      ${event.estimatedCostUsd.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
