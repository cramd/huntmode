"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Heart, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AnalyticsEvents, captureEvent } from "@/lib/analytics";
import {
  TIP_MILESTONE_COPY,
  isTippingEnabled,
  markMilestoneCelebrated,
  openTipUrl,
  type TipMilestoneStatus,
} from "@/lib/tipping";

type TipCelebrationDialogProps = {
  open: boolean;
  status: TipMilestoneStatus | null;
  company?: string;
  role?: string;
  onOpenChange: (open: boolean) => void;
};

function fireSparkleConfetti(colors: string[]) {
  const defaults = {
    colors,
    disableForReducedMotion: true,
  };

  confetti({
    ...defaults,
    particleCount: 70,
    spread: 68,
    origin: { y: 0.55 },
    startVelocity: 32,
  });

  window.setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 36,
      spread: 100,
      scalar: 0.85,
      origin: { y: 0.4, x: 0.3 },
    });
    confetti({
      ...defaults,
      particleCount: 36,
      spread: 100,
      scalar: 0.85,
      origin: { y: 0.4, x: 0.7 },
    });
  }, 180);
}

export function TipCelebrationDialog({
  open,
  status,
  company,
  role,
  onOpenChange,
}: TipCelebrationDialogProps) {
  const copy = status ? TIP_MILESTONE_COPY[status] : null;
  const celebratedForOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      celebratedForOpen.current = false;
      return;
    }
    if (!status || !copy || celebratedForOpen.current) return;
    celebratedForOpen.current = true;
    markMilestoneCelebrated(status);
    captureEvent(AnalyticsEvents.TIP_MILESTONE_SHOWN, {
      status,
      company: company || undefined,
      role: role || undefined,
    });
    fireSparkleConfetti(copy.confettiColors);
  }, [open, status, company, role, copy]);

  const handleClose = () => {
    if (status) {
      captureEvent(AnalyticsEvents.TIP_MILESTONE_DISMISSED, { status });
    }
    onOpenChange(false);
  };

  const handleTip = () => {
    if (!status) return;
    captureEvent(AnalyticsEvents.TIP_CTA_CLICKED, {
      source: "milestone",
      status,
    });
    openTipUrl(`milestone_${status}`);
    onOpenChange(false);
  };

  if (!copy) return null;

  const contextLine =
    company || role
      ? [role, company].filter(Boolean).join(" · ")
      : null;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? handleClose() : onOpenChange(next))}>
      <DialogContent
        className="sm:max-w-md overflow-hidden border-white/10 bg-slate-950/95 p-0 text-white shadow-2xl shadow-indigo-500/20"
        showCloseButton={false}
      >
        <div className="relative px-5 pt-6 pb-2">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-indigo-500/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-8 right-6 h-16 w-16 rounded-full bg-amber-400/15 blur-2xl animate-pulse"
          />

          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/20 via-indigo-500/20 to-emerald-400/10 shadow-[0_0_28px_rgba(251,191,36,0.18)]">
            <Sparkles className="h-7 w-7 text-amber-300 animate-[spin_6s_linear_infinite]" />
          </div>

          <DialogHeader className="relative space-y-2 text-center sm:text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300/90">
              {copy.eyebrow}
            </p>
            <DialogTitle className="text-xl font-black tracking-tight text-white sm:text-2xl">
              {copy.title}
            </DialogTitle>
            {contextLine && (
              <p className="text-xs font-semibold text-indigo-300/90">{contextLine}</p>
            )}
            <DialogDescription className="text-sm leading-relaxed text-slate-300">
              {copy.body}
            </DialogDescription>
          </DialogHeader>

          {isTippingEnabled() && (
            <p className="relative mt-4 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-3 text-sm leading-relaxed text-slate-300">
              {copy.tipAsk}
            </p>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 gap-2 border-t border-white/5 bg-slate-900/60 p-4 sm:flex-col sm:space-x-0">
          {isTippingEnabled() ? (
            <>
              <Button
                onClick={handleTip}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 py-5 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400"
              >
                <Heart className="mr-2 h-4 w-4 fill-white/30" />
                Say thanks with a tip
              </Button>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Not now — keep hunting
              </Button>
            </>
          ) : (
            <Button
              onClick={handleClose}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-5 text-sm font-bold text-white"
            >
              Keep hunting
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
