"use client";

import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OnboardingDraftSuggestion } from "@/lib/types";

interface ReviewDraftsStepProps {
  drafts: OnboardingDraftSuggestion[];
  completing: boolean;
  error: string | null;
  onUpdateDraft: (index: number, patch: Partial<OnboardingDraftSuggestion>) => void;
  onRemoveDraft: (index: number) => void;
  onBack: () => void;
  onComplete: () => void;
}

export function ReviewDraftsStep({
  drafts,
  completing,
  error,
  onUpdateDraft,
  onRemoveDraft,
  onBack,
  onComplete,
}: ReviewDraftsStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-white">Your starter draft roles</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          Three paint-by-numbers targets to get you moving. Edit anything, then we&apos;ll save
          your Master Resume and import these as draft applications.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {drafts.map((draft, index) => (
          <div
            key={`${draft.company}-${draft.role}-${index}`}
            className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Draft {index + 1}
              </span>
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveDraft(index)}
                  className="text-slate-500 hover:text-red-400"
                  aria-label="Remove draft"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Company</label>
                <Input
                  value={draft.company}
                  onChange={(e) => onUpdateDraft(index, { company: e.target.value })}
                  className="rounded-xl border-white/5 bg-slate-950/60 text-white text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Role</label>
                <Input
                  value={draft.role}
                  onChange={(e) => onUpdateDraft(index, { role: e.target.value })}
                  className="rounded-xl border-white/5 bg-slate-950/60 text-white text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">{draft.reason}</p>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">JD sketch</label>
              <Textarea
                value={draft.briefJd}
                onChange={(e) => onUpdateDraft(index, { briefJd: e.target.value })}
                rows={4}
                className="rounded-xl border-white/5 bg-slate-950/60 text-white text-xs font-mono"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={completing} className="text-slate-400 hover:text-white">
          Back
        </Button>
        <Button
          type="button"
          onClick={onComplete}
          disabled={completing || drafts.length === 0}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white hover:from-indigo-500 hover:to-purple-500"
        >
          {completing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up your hunt…
            </>
          ) : (
            "Start hunting"
          )}
        </Button>
      </div>
    </div>
  );
}
