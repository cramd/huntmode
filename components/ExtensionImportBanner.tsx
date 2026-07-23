"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getApplications, createApplication } from "@/lib/db";
import { findMatchingApplication } from "@/lib/application-dedupe";
import {
  buildDraftApplicationData,
  fetchScrapeForDraft,
} from "@/lib/create-draft-from-url";
import {
  EXTENSION_IMPORT_DISMISS_KEY,
  EXTENSION_MESSAGE_TYPES,
  type ExtensionQueuedRole,
} from "@/lib/extension-bridge";
import type { Application, UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type QueuedRole = ExtensionQueuedRole;

function isExtensionQueueMessage(data: unknown): data is { type: string; items: QueuedRole[] } {
  return (
    Boolean(data) &&
    typeof data === "object" &&
    (data as { type?: string }).type === EXTENSION_MESSAGE_TYPES.EXTENSION_QUEUE &&
    Array.isArray((data as { items?: unknown }).items)
  );
}

function clearExtensionUrls(urls: string[]) {
  if (typeof window === "undefined") return;
  window.postMessage({ type: EXTENSION_MESSAGE_TYPES.CLEAR_URLS, urls }, window.location.origin);
}

type ExtensionImportBannerProps = {
  userProfile: UserProfile | null;
};

export function ExtensionImportBanner({ userProfile }: ExtensionImportBannerProps) {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueuedRole[]>([]);
  const [importing, setImporting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(EXTENSION_IMPORT_DISMISS_KEY) === "1") {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isExtensionQueueMessage(event.data)) return;
      if (sessionStorage.getItem(EXTENSION_IMPORT_DISMISS_KEY) === "1") return;
      setQueue(event.data.items);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(EXTENSION_IMPORT_DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleImport = useCallback(async () => {
    if (!user || queue.length === 0) return;
    setImporting(true);
    let added = 0;
    let skipped = 0;
    const importedUrls: string[] = [];

    try {
      const existing = await getApplications(user.uid);
      const token = await user.getIdToken();

      for (const item of queue) {
        const match = findMatchingApplication(existing, { url: item.url });
        if (match) {
          skipped += 1;
          continue;
        }

        const scrape = await fetchScrapeForDraft({
          token,
          userProfile,
          input: {
            url: item.url,
            pageTitle: item.pageTitle,
            fallbackDescription: "",
            notes: "Imported from HuntMode browser extension queue",
            resumeUsed: null,
          },
        });

        const draftData = buildDraftApplicationData(
          {
            url: item.url,
            pageTitle: item.pageTitle,
            fallbackDescription: "",
            notes: "Imported from HuntMode browser extension queue",
            resumeUsed: null,
          },
          scrape
        );

        const id = await createApplication(user.uid, draftData);
        existing.unshift({
          id,
          uid: user.uid,
          ...draftData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Application);
        importedUrls.push(item.url);
        added += 1;
      }

      if (importedUrls.length) {
        clearExtensionUrls(importedUrls);
      }

      setQueue((prev) => prev.filter((item) => !importedUrls.includes(item.url)));

      if (added === 0 && skipped > 0) {
        toast.info("All queued roles are already in your hunt");
      } else {
        toast.success(
          added
            ? `${added} draft${added === 1 ? "" : "s"} added${skipped ? `, ${skipped} skipped` : ""}`
            : "Nothing to import"
        );
      }

      if (added > 0) {
        sessionStorage.setItem(EXTENSION_IMPORT_DISMISS_KEY, "1");
        setDismissed(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }, [user, queue, userProfile]);

  if (dismissed || queue.length === 0) return null;

  return (
    <div className="mx-4 sm:mx-6 mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-indigo-200 font-semibold text-sm">
          <Sparkles className="w-4 h-4 shrink-0" />
          Get the hunt on?
        </div>
        <p className="text-xs text-slate-400 mt-1">
          You have {queue.length} role{queue.length === 1 ? "" : "s"} saved from the browser extension.
          Import them as draft applications?
        </p>
        <ul className="mt-2 text-[11px] text-slate-500 space-y-0.5 max-h-16 overflow-y-auto">
          {queue.slice(0, 4).map((item) => (
            <li key={item.url} className="truncate">
              {item.pageTitle || item.url}
            </li>
          ))}
          {queue.length > 4 && <li>+{queue.length - 4} more</li>}
        </ul>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="border-white/10"
          onClick={handleDismiss}
          disabled={importing}
        >
          Not now
        </Button>
        <Button size="sm" onClick={handleImport} disabled={importing}>
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing…
            </>
          ) : (
            "Import drafts"
          )}
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-slate-500 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
