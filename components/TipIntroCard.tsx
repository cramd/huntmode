"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Heart, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnalyticsEvents, captureEvent } from "@/lib/analytics";
import {
  dismissTipIntro,
  openTipUrl,
  shouldShowTipIntro,
} from "@/lib/tipping";

function subscribeNoop() {
  return () => {};
}

/**
 * Soft early introduction to tipping — shown once on the dashboard
 * after onboarding, until dismissed.
 */
export function TipIntroCard() {
  const storedVisible = useSyncExternalStore(
    subscribeNoop,
    shouldShowTipIntro,
    () => false
  );
  const [dismissed, setDismissed] = useState(false);
  const visible = storedVisible && !dismissed;
  const tracked = useRef(false);

  useEffect(() => {
    if (!visible || tracked.current) return;
    tracked.current = true;
    captureEvent(AnalyticsEvents.TIP_INTRO_SHOWN, { surface: "dashboard" });
  }, [visible]);

  if (!visible) return null;

  const handleDismiss = () => {
    dismissTipIntro();
    captureEvent(AnalyticsEvents.TIP_INTRO_DISMISSED, { surface: "dashboard" });
    setDismissed(true);
  };

  const handleTip = () => {
    captureEvent(AnalyticsEvents.TIP_CTA_CLICKED, {
      source: "intro",
      surface: "dashboard",
    });
    openTipUrl("intro_dashboard");
    dismissTipIntro();
    setDismissed(true);
  };

  return (
    <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-r from-amber-950/30 via-slate-900/50 to-indigo-950/30 shadow-lg shadow-amber-500/5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl"
      />
      <CardContent className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3 pr-8 sm:pr-0">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-500/10">
            <Heart className="h-4 w-4 text-amber-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">HuntMode stays free</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
              Tips help offset hosting and development time — totally optional,
              always appreciated when the hunt starts paying off.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            size="sm"
            onClick={handleTip}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 text-xs font-bold text-white hover:from-amber-400 hover:to-orange-400"
          >
            <Heart className="mr-1.5 h-3.5 w-3.5" />
            Say thanks
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="rounded-xl text-xs text-slate-400 hover:bg-white/5 hover:text-white"
          >
            Dismiss
          </Button>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 sm:hidden"
          aria-label="Dismiss tip intro"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}
