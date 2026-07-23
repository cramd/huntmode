"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { analyticsPromptEnabled } from "@/lib/edition";

export function AnalyticsPromptCard() {
  if (!analyticsPromptEnabled()) return null;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) return null;

  return (
    <Card className="border-indigo-500/20 bg-indigo-500/5">
      <CardContent className="pt-5 pb-5 flex gap-3">
        <BarChart3 className="size-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Help us improve HuntMode</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Anonymous usage analytics are enabled on this hosted instance so we can spot bugs and
            prioritize features. Nothing from your résumé or job descriptions is sent — only product
            events like “generated CV” or “completed onboarding.” You can disable analytics anytime
            by blocking scripts in your browser; HuntMode stays fully usable either way.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
