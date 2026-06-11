"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, ExternalLink, Trash2, ChevronUp, ChevronDown, Compass, Megaphone, Sliders, FileText } from "lucide-react";
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

type SortKey = "createdAt" | "company" | "role" | "status" | "appliedAt";
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
      const va: string = (a[sortKey] as string) || "";
      const vb: string = (b[sortKey] as string) || "";
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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Applications</h1>
          <p className="text-muted-foreground mt-1">
            {applications.length} total · {counts["applied"] || 0} applied ·{" "}
            {counts["interview"] || 0} interviewing · {counts["offer"] || 0} offers
          </p>
        </div>
        <Link href="/applications/new" className={buttonVariants()}>
          <Plus className="w-4 h-4 mr-2" />
          New Application
        </Link>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
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
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? `${cfg.bgColor} ${cfg.color} ring-2 ring-offset-1 ring-current`
                  : `${cfg.bgColor} ${cfg.color} opacity-70 hover:opacity-100`
              }`}
            >
              {cfg.label} {cnt > 0 ? `(${cnt})` : ""}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by company or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-medium">No applications found.</p>
              {applications.length === 0 && (
                <Link href="/applications/new" className={buttonVariants({ className: "mt-4" })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Application
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {(
                      [
                        { key: "company" as SortKey, label: "Company" },
                        { key: "role" as SortKey, label: "Role" },
                        { key: "status" as SortKey, label: "Status" },
                        { key: "appliedAt" as SortKey, label: "Applied" },
                      ] as { key: SortKey; label: string }[]
                    ).map(({ key, label }) => (
                      <th
                        key={key}
                        className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort(key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label} <SortIcon col={key} />
                        </span>
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => {
                    const cfg = STATUS_CONFIG[app.status];
                    const resume = app.resumeUsed ? resumeMap[app.resumeUsed] : null;
                    const cat = resume?.category || "general";
                    const catCfg = CATEGORY_CONFIG[cat];
                    const CatIcon = getCategoryIcon(catCfg.iconName);

                    return (
                      <tr
                        key={app.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {app.resumeUsed && (
                              <div className={`p-1 rounded-md ${catCfg.bgColor}`} title={catCfg.label}>
                                <CatIcon className={`w-3.5 h-3.5 ${catCfg.color}`} />
                              </div>
                            )}
                            <Link href={`/applications/${app.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                              {app.company}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{app.role}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bgColor} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {app.appliedAt
                            ? format(parseISO(app.appliedAt), "MMM d, yyyy")
                            : <span className="text-muted-foreground/50 italic">Not yet</span>}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="truncate text-muted-foreground text-xs">{app.notes || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            {app.jobUrl && (
                              <a
                                href={app.jobUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="View job posting"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => setDeleteId(app.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Are you sure you want to delete this application? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
