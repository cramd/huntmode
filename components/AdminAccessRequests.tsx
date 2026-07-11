"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Shield,
  Loader2,
  RefreshCw,
  Check,
  X,
  Clock,
  UserCheck,
  UserX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { getAccessRequests, updateAccessRequestStatus } from "@/lib/db";
import type { AccessRequest } from "@/lib/types";
import { toast } from "sonner";

const ADMIN_EMAIL = "marcsherwood@gmail.com";

function formatDate(iso: string) {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: AccessRequest["status"] }) {
  if (status === "pending") {
    return (
      <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/15">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15">
        <UserCheck className="w-3 h-3 mr-1" />
        Approved
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/15">
      <UserX className="w-3 h-3 mr-1" />
      Denied
    </Badge>
  );
}

export function AdminAccessRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const loadRequests = useCallback(async (silent = false) => {
    if (!user || !isAdmin) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getAccessRequests();
      setRequests(data);
      setPendingCount(data.filter((r) => r.status === "pending").length);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load access requests";
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (isAdmin) loadRequests();
  }, [isAdmin, loadRequests]);

  const handleAction = async (uid: string, action: "approve" | "deny") => {
    if (!user) return;
    setActingOn(uid);
    try {
      const newStatus = action === "approve" ? "approved" : "denied";
      await updateAccessRequestStatus(uid, newStatus);
      setRequests((prev) =>
        prev.map((r) =>
          r.uid === uid
            ? { ...r, status: newStatus, updatedAt: new Date().toISOString() }
            : r
        )
      );
      setPendingCount((c) => Math.max(0, c - 1));
      toast.success(action === "approve" ? "Access approved" : "Access denied");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update request";
      toast.error(msg);
    } finally {
      setActingOn(null);
    }
  };

  if (!isAdmin) return null;

  const pending = requests.filter((r) => r.status === "pending");
  const recent = requests.filter((r) => r.status !== "pending").slice(0, 10);

  return (
    <Card className="bg-slate-900/40 border-white/5 shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-white tracking-wide uppercase">
            <Shield className="w-4 h-4 text-amber-400" />
            Access Requests
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 text-amber-950 border-none font-bold text-[10px] px-2">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadRequests(true)}
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
          Open sign-ups are enabled. Deny accounts here if you need to block someone.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : pending.length === 0 && recent.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No access requests yet.
          </p>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">
                  Awaiting Review
                </p>
                {pending.map((req) => (
                  <div
                    key={req.uid}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-white truncate">{req.name}</p>
                        <p className="text-xs text-slate-400 truncate">{req.email}</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Requested {formatDate(req.requestedAt)}
                        </p>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(req.uid, "approve")}
                        disabled={actingOn === req.uid}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs h-8"
                      >
                        {actingOn === req.uid ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(req.uid, "deny")}
                        disabled={actingOn === req.uid}
                        className="flex-1 border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200 rounded-lg text-xs h-8"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Deny
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pending.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-2">
                No pending requests right now.
              </p>
            )}

            {recent.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Recent Decisions
                </p>
                {recent.map((req) => (
                  <div
                    key={req.uid}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">{req.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{req.email}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
