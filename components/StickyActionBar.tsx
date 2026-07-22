"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StickyActionBarProps {
  secondary?: ReactNode;
  primary?: ReactNode;
  hint?: string;
  className?: string;
}

export function StickyActionBar({
  secondary,
  primary,
  hint,
  className,
}: StickyActionBarProps) {
  return (
    <div className={cn("mt-6", className)}>
      {hint ? (
        <p className="mb-2 hidden text-right text-[10px] font-medium text-slate-500 md:block">
          {hint}
        </p>
      ) : null}
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-md md:static md:border-t md:border-white/5 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        {hint ? (
          <p className="text-center text-[10px] font-medium text-slate-500 md:hidden">
            {hint}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="flex shrink-0 items-center gap-2">{secondary}</div>
          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            {primary}
          </div>
        </div>
      </div>
    </div>
  );
}
