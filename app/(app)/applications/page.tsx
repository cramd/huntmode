"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, ExternalLink, Trash2, ChevronUp, ChevronDown, Compass, Megaphone, Sliders, FileText, BarChart2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { getApplications, deleteApplication, getMasterResumes } from "@/lib/db";
import type { Application, ApplicationStatus, MasterResume } from "@/lib/types";
import { STATUS_CONFIG, CATEGORY_CONFIG, type ResumeCategory } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

type SortKey = "createdAt" | "company" | "role" | "status" | "appliedAt" | "fitScore";
type SortDir = "asc" | "desc";

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

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [resumes, setResumes] = useState<MasterResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getApplications(user.uid),
      getMasterResumes(user.uid),
    ]).then(([apps, rs]) => {
      setApplications(apps);
      setResumes(rs);
      setLoading(false);
    });
  }, [user]);

  const resumeMap = useMemo(() => {
    const map: Record<string, MasterResume> = {};
    resumes.forEach((r) => {
      map[r.id] = r;
    });
    return map;
  }, [resumes]);

  const filtered = useMemo(() => {
    let list = [...applications];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }
    list.sort((a, b) => {
      if (sortKey === "fitScore") {
        const va = a.fitScore?.overall ?? -1;
        const vb = b.fitScore?.overall ?? -1;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const va: string = (a[sortKey as keyof Application] as string) || "";
      const vb: string = (b[sortKey as keyof Application] as string) || "";
      const cmp = va.localeCompare(vb);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [applications, search, statusFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleDelete = async () => {
    if (!user || !deleteId) return;
    await deleteApplication(user.uid, deleteId);
    setApplications((prev) => prev.filter((a) => a.id !== deleteId));
    setDeleteId(null);
    toast.success("Application deleted");
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : null;

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    applications.forEach((a) => { c[a.status] = (c[a.status] || 0) + 1; });
    return c;
  }, [applications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Applications</h1>
          <p className="text-xs text-slate-400 mt-1.5 font-semibold tracking-wide uppercase">
            {applications.length} total &bull; {counts["applied"] || 0} applied &bull;{" "}
            {counts["interview"] || 0} interviewing &bull; {counts["offer"] || 0} offers
          </p>
        </div>
        <Link href="/applications/new" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-4 py-2.5 text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all hover:-translate-y-[1px]">
          <Plus className="w-4 h-4 mr-1.5" />
          New Application
        </Link>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            statusFilter === "all"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/15"
              : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5"
          }`}
        >
          All ({applications.length})
        </button>
        {(Object.keys(STATUS_CONFIG) as ApplicationStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const cnt = counts[s] || 0;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                statusFilter === s
                  ? `border-current bg-current/10 ${cfg.color} shadow-sm`
                  : `border-white/5 bg-white/5 ${cfg.color} opacity-70 hover:opacity-100 hover:bg-white/10`
              }`}
            >
              {cfg.label} {cnt > 0 ? `(${cnt})` : ""}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search by company or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-slate-900/40 border-white/5 focus:border-indigo-500/30 text-white text-sm rounded-xl py-5 shadow-inner"
        />
      </div>

      {/* Table */}
      <Card className="bg-slate-900/40 border-white/5 shadow-xl overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="font-semibold text-slate-400">No applications found.</p>
              {applications.length === 0 && (
                <Link href="/applications/new" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-4 py-2 text-xs shadow-lg mt-4 transition-all">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Your First Application
                </Link>
              )}
            </div>
          ) : (
            <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-white/5">
              {filtered.map((app) => {
                const cfg = STATUS_CONFIG[app.status];
                const resume = app.resumeUsed ? resumeMap[app.resumeUsed] : null;
                const cat = resume?.category || "general";
                const catCfg = CATEGORY_CONFIG[cat];
                const CatIcon = getCategoryIcon(catCfg.iconName);
                return (
                  <div
                    key={app.id}
                    className="p-4 space-y-2.5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/applications/${app.id}`} className="flex items-center gap-2.5 min-w-0 flex-1">
                        {app.resumeUsed && (
                          <div className={`p-1.5 rounded-lg border border-current/25 bg-current/10 shrink-0 ${catCfg.color}`}>
                            <CatIcon className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{app.company}</p>
                          <p className="text-sm text-slate-300 font-semibold truncate">{app.role}</p>
                        </div>
                      </Link>
                      {app.jobUrl && (
                        <a
                          href={app.jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white shrink-0"
                          title="View job posting"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <Link href={`/applications/${app.id}`} className="block space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-current/25 bg-current/10 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {app.fitScore ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          app.fitScore.overall >= 75
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : app.fitScore.overall >= 50
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : "bg-red-500/15 text-red-300 border-red-500/30"
                        }`}>
                          <BarChart2 className="w-2.5 h-2.5" />
                          {app.fitScore.overall}% fit
                        </span>
                      ) : null}
                      <span className="text-[10px] text-slate-500 font-medium">
                        {app.appliedAt
                          ? format(parseISO(app.appliedAt), "MMM d, yyyy")
                          : "Not applied yet"}
                      </span>
                    </div>
                    {app.notes && (
                      <p className="text-xs text-slate-500 line-clamp-2">{app.notes}</p>
                    )}
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    {(
                      [
                        { key: "company" as SortKey, label: "Company" },
                        { key: "role" as SortKey, label: "Role" },
                        { key: "status" as SortKey, label: "Status" },
                        { key: "appliedAt" as SortKey, label: "Applied" },
                        { key: "fitScore" as SortKey, label: "Fit" },
                      ] as { key: SortKey; label: string }[]
                    ).map(({ key, label }) => (
                      <th
                        key={key}
                        className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px] cursor-pointer hover:text-white select-none transition-colors"
                        onClick={() => handleSort(key)}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {key === "fitScore" && <BarChart2 className="w-3 h-3" />}
                          {label} <SortIcon col={key} />
                        </span>
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Notes</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((app) => {
                    const cfg = STATUS_CONFIG[app.status];
                    const resume = app.resumeUsed ? resumeMap[app.resumeUsed] : null;
                    const cat = resume?.category || "general";
                    const catCfg = CATEGORY_CONFIG[cat];
                    const CatIcon = getCategoryIcon(catCfg.iconName);

                    return (
                      <tr
                        key={app.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {app.resumeUsed && (
                              <div className={`p-1.5 rounded-lg border border-current/25 bg-current/10 ${catCfg.color}`} title={catCfg.label}>
                                <CatIcon className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <Link href={`/applications/${app.id}`} className="font-bold text-white hover:text-indigo-400 transition-colors">
                              {app.company}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300 font-semibold">{app.role}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-current/25 bg-current/10 ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 font-medium">
                          {app.appliedAt
                            ? format(parseISO(app.appliedAt), "MMM d, yyyy")
                            : <span className="text-slate-500 italic">Not yet</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          {app.fitScore ? (
                            <Link href={`/applications/${app.id}?tab=fit`}>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                app.fitScore.overall >= 75
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : app.fitScore.overall >= 50
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                  : "bg-red-500/15 text-red-300 border-red-500/30"
                              }`}>
                                <BarChart2 className="w-2.5 h-2.5" />
                                {app.fitScore.overall}%
                              </span>
                            </Link>
                          ) : (
                            <span className="text-[10px] text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="truncate text-slate-400 text-xs font-medium">{app.notes || "—"}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 justify-end">
                            {app.jobUrl && (
                              <a
                                href={app.jobUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                                title="View job posting"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => setDeleteId(app.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="bg-slate-900 border-white/5 rounded-2xl max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Delete Application</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm py-2">
            Are you sure you want to delete this application? This cannot be undone.
          </p>
          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="border-white/10 hover:bg-white/5 text-white rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white rounded-xl">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
