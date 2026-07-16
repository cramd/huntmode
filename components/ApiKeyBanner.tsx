"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";

export function ApiKeyBanner() {
  return (
    <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-200">
            <KeyRound className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-amber-100">Add your AI API key to unlock tailoring</p>
            <p className="text-xs leading-relaxed text-amber-200/80">
              CV generation, fit analysis, interview prep, and job scraping need your BYOK key.
              Add it now so you&apos;re not stopped mid-application.
            </p>
          </div>
        </div>
        <Link
          href="/settings"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-50 transition-colors hover:bg-amber-500/30"
        >
          Add API key in Settings
        </Link>
      </div>
    </div>
  );
}
