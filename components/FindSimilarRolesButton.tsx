"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, ExternalLink, Plus, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createApplication } from "@/lib/db";
import { findMatchingApplication } from "@/lib/application-dedupe";
import {
  buildDraftApplicationData,
  fetchScrapeForDraft,
} from "@/lib/create-draft-from-url";
import type { Application, UserProfile } from "@/lib/types";
import { AnalyticsEvents, captureEvent } from "@/lib/analytics";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isWorkdayJobUrl } from "@/lib/job-url";

interface SimilarSearchResult {
  title: string;
  url: string;
  snippet: string;
  company?: string;
  role?: string;
}

interface FindSimilarRolesButtonProps {
  sourceApplication: Pick<Application, "id" | "company" | "role" | "jobDescription" | "resumeUsed">;
  existingApplications: Application[];
  userProfile?: UserProfile | null;
  onApplicationCreated?: (app: Application) => void;
  className?: string;
}

export function FindSimilarRolesButton({
  sourceApplication,
  existingApplications,
  userProfile,
  onApplicationCreated,
  className,
}: FindSimilarRolesButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SimilarSearchResult[]>([]);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());
  const [localApps, setLocalApps] = useState<Application[]>(existingApplications);

  const handleOpen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
    setError(null);
    setResults([]);
    setAddedUrls(new Set());
    setLocalApps(existingApplications);
    setLoading(true);

    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/find-similar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          company: sourceApplication.company,
          role: sourceApplication.role,
          jobDescription: sourceApplication.jobDescription || undefined,
          provider: userProfile?.aiProvider || "google",
          apiKey: userProfile?.aiApiKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results || []);
      captureEvent(AnalyticsEvents.SIMILAR_ROLES_SEARCHED, {
        source_application_id: sourceApplication.id,
        result_count: (data.results || []).length,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDraft = async (result: SimilarSearchResult) => {
    if (!user) return;

    let company = result.company || result.title.split(/\s+-\s+/)[0]?.trim() || "Unknown company";
    let role = result.role || result.title;

    const existing = findMatchingApplication(localApps, {
      company,
      role,
      url: result.url,
    });
    if (existing) {
      toast.info("Already tracking this role");
      return;
    }

    setAddingUrl(result.url);
    try {
      const token = await user.getIdToken();
      const scrape = await fetchScrapeForDraft({
        token,
        userProfile,
        input: {
          url: result.url,
          fallbackDescription: result.snippet || "",
          notes: `Found via similar search from ${sourceApplication.company} — ${sourceApplication.role}`,
          resumeUsed: sourceApplication.resumeUsed || null,
        },
      });
      if (isWorkdayJobUrl(result.url) && !scrape) {
        toast.info("Workday fetch can be slow — draft saved with search snippet.", {
          description: "Open the posting and paste the full description to enrich this draft.",
        });
      }
      const draftData = buildDraftApplicationData(
        {
          url: result.url,
          fallbackDescription: result.snippet || "",
          notes: `Found via similar search from ${sourceApplication.company} — ${sourceApplication.role}`,
          resumeUsed: sourceApplication.resumeUsed || null,
        },
        scrape
      );
      company = draftData.company;
      role = draftData.role;

      const id = await createApplication(user.uid, draftData);

      const newApp: Application = {
        id,
        uid: user.uid,
        ...draftData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setLocalApps((prev) => [newApp, ...prev]);
      setAddedUrls((prev) => new Set(prev).add(result.url));
      onApplicationCreated?.(newApp);
      captureEvent(AnalyticsEvents.APPLICATION_CREATED, {
        has_job_url: true,
        company,
        source: "similar_roles",
      });
      if (scrape) {
        const sourceLabel = scrape.source === "workday" ? " (from Workday)" : "";
        toast.success(`Draft added: ${role} at ${company}${sourceLabel}`);
      } else {
        toast.success(`Draft added: ${role} at ${company}`, {
          description: "Could not fetch the full posting — snippet saved instead.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add draft";
      toast.error(msg);
    } finally {
      setAddingUrl(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          className ||
          "p-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition-all shrink-0"
        }
        title="Find similar roles"
        aria-label={`Find similar roles to ${sourceApplication.role} at ${sourceApplication.company}`}
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md bg-slate-950 border-white/10 text-white overflow-y-auto"
        >
          <SheetHeader className="border-b border-white/5 pb-4">
            <SheetTitle className="text-white font-bold">Similar roles</SheetTitle>
            <SheetDescription className="text-slate-400">
              Openings like{" "}
              <span className="text-slate-200 font-semibold">{sourceApplication.role}</span> at{" "}
              <span className="text-slate-200 font-semibold">{sourceApplication.company}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 py-4 space-y-3">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                <span className="text-sm">Searching live openings…</span>
              </div>
            )}

            {!loading && error && (
              <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                {error}
              </p>
            )}

            {!loading && !error && results.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">No similar roles found.</p>
            )}

            {!loading &&
              results.map((result) => {
                const company = result.company || result.title.split(/\s+-\s+/)[0]?.trim() || "";
                const role = result.role || result.title;
                const match = findMatchingApplication(localApps, {
                  company,
                  role,
                  url: result.url,
                });
                const isAdded = addedUrls.has(result.url);
                const isAdding = addingUrl === result.url;

                return (
                  <div
                    key={result.url}
                    className="rounded-xl border border-white/5 bg-slate-900/60 p-4 space-y-2"
                  >
                    <div>
                      <p className="text-sm font-bold text-white leading-snug line-clamp-2">
                        {role}
                      </p>
                      {company && (
                        <p className="text-xs text-purple-300 font-medium mt-0.5">{company}</p>
                      )}
                    </div>
                    {result.snippet && (
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {result.snippet}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        View posting
                      </a>
                      {match ? (
                        <Link
                          href={`/applications/${match.id}`}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:text-amber-200"
                        >
                          Already tracking
                        </Link>
                      ) : isAdded ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                          <Check className="w-3 h-3" />
                          Draft added
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isAdding}
                          onClick={() => handleAddDraft(result)}
                          className="h-7 text-[10px] font-bold border-purple-500/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 rounded-lg"
                        >
                          {isAdding ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Fetching…
                            </>
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          Add as draft
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
