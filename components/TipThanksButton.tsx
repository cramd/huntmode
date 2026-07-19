"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsEvents, captureEvent } from "@/lib/analytics";
import { isTippingEnabled, openTipUrl } from "@/lib/tipping";
import { cn } from "@/lib/utils";

type TipThanksButtonProps = {
  source: string;
  className?: string;
  /** Compact icon-only for collapsed sidebar */
  iconOnly?: boolean;
  label?: string;
};

export function TipThanksButton({
  source,
  className,
  iconOnly = false,
  label = "Say thanks",
}: TipThanksButtonProps) {
  if (!isTippingEnabled()) return null;

  const handleClick = () => {
    captureEvent(AnalyticsEvents.TIP_CTA_CLICKED, { source });
    openTipUrl(source);
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={label}
        className={cn(
          "mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300 transition-colors hover:bg-amber-500/20 hover:text-amber-200",
          className
        )}
      >
        <Heart className="h-4 w-4" />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      className={cn(
        "w-full justify-start gap-2 rounded-xl border-amber-500/20 bg-amber-500/5 text-amber-200 hover:bg-amber-500/15 hover:text-amber-100",
        className
      )}
    >
      <Heart className="h-4 w-4" />
      {label}
    </Button>
  );
}
