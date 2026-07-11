"use client";

import type { LucideIcon } from "lucide-react";
import { Copy, CheckCheck, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FitInsightCardType } from "@/lib/types";

type FitCardColor = "emerald" | "red" | "indigo";

const COLOR_STYLES: Record<
  FitCardColor,
  { border: string; title: string; badge: string; badgeBorder: string; badgeText: string }
> = {
  emerald: {
    border: "border-emerald-500/10",
    title: "text-emerald-400",
    badge: "bg-emerald-500/15",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-400",
  },
  red: {
    border: "border-red-500/10",
    title: "text-red-400",
    badge: "bg-red-500/15",
    badgeBorder: "border-red-500/30",
    badgeText: "text-red-400",
  },
  indigo: {
    border: "border-indigo-500/10",
    title: "text-indigo-400",
    badge: "bg-indigo-500/15",
    badgeBorder: "border-indigo-500/30",
    badgeText: "text-indigo-400",
  },
};

interface FitInsightCardProps {
  title: string;
  icon: LucideIcon;
  color: FitCardColor;
  items: string[];
  cardKey: FitInsightCardType;
  emptyLabel: string;
  onCopy: (cardKey: FitInsightCardType) => void;
  onIncorporate: (cardKey: FitInsightCardType) => void;
  isCopied: boolean;
  isIncorporating: boolean;
}

export default function FitInsightCard({
  title,
  icon: Icon,
  color,
  items,
  cardKey,
  emptyLabel,
  onCopy,
  onIncorporate,
  isCopied,
  isIncorporating,
}: FitInsightCardProps) {
  const styles = COLOR_STYLES[color];
  const hasItems = items.length > 0;

  return (
    <Card className={`bg-slate-900/60 ${styles.border} rounded-2xl overflow-hidden`}>
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${styles.title}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {title}
          </CardTitle>
          {hasItems && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                title={`Copy ${title.toLowerCase()}`}
                onClick={() => onCopy(cardKey)}
              >
                {isCopied ? (
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-slate-400 hover:text-indigo-300 gap-1"
                title={`Add ${title.toLowerCase()} to CV`}
                disabled={isIncorporating}
                onClick={() => onIncorporate(cardKey)}
              >
                {isIncorporating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline text-[10px] font-bold">Add to CV</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {hasItems ? (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <span
                  className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded-full ${styles.badge} border ${styles.badgeBorder} flex items-center justify-center ${styles.badgeText} text-[9px] font-bold`}
                >
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}
