"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Link2, MousePointerClick, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CHROME_EXTENSION_STORE_URL,
  EXTENSION_CTA_LABEL,
  EXTENSION_PRIVACY_NOTE,
  EXTENSION_SECTION_EYEBROW,
  EXTENSION_SECTION_HEADLINE,
  EXTENSION_SECTION_SUBHEAD,
  EXTENSION_COMPACT_HEADLINE,
  EXTENSION_COMPACT_BODY,
  EXTENSION_STEPS,
} from "@/components/landing/copy";
import { cn } from "@/lib/utils";

const STEP_ICONS = [MousePointerClick, Link2, Sparkles] as const;

type ExtensionPromoSectionProps = {
  variant?: "full" | "compact";
  className?: string;
  id?: string;
};

function ExtensionStoreButton({ className }: { className?: string }) {
  return (
    <Button
      nativeButton={false}
      render={
        <a
          href={CHROME_EXTENSION_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
        />
      }
      className={cn(
        "rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500",
        className
      )}
    >
      {EXTENSION_CTA_LABEL}
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  );
}

export function ExtensionPromoSection({
  variant = "full",
  className,
  id = "extension",
}: ExtensionPromoSectionProps) {
  if (variant === "compact") {
    return (
      <section
        id={id}
        className={cn(
          "rounded-2xl border border-indigo-500/25 bg-indigo-500/5 p-6",
          className
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <Image
              src="/huntmode-extension-icon.png"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-xl"
            />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">{EXTENSION_COMPACT_HEADLINE}</h2>
              <p className="text-sm leading-relaxed text-slate-400">{EXTENSION_COMPACT_BODY}</p>
            </div>
          </div>
          <ExtensionStoreButton className="shrink-0" />
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      className={cn(
        "border-t border-white/5 bg-slate-950/80 px-6 py-14 sm:px-10 lg:px-14",
        className
      )}
    >
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-950 p-6 sm:p-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Image
                  src="/huntmode-extension-icon.png"
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-xl"
                />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/80">
                  {EXTENSION_SECTION_EYEBROW}
                </p>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {EXTENSION_SECTION_HEADLINE}
              </h2>
              <p className="text-base leading-relaxed text-slate-400">
                {EXTENSION_SECTION_SUBHEAD}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ExtensionStoreButton className="h-11 px-6" />
                <Link
                  href="/privacy"
                  className="text-xs text-slate-500 transition-colors hover:text-slate-300"
                >
                  {EXTENSION_PRIVACY_NOTE}
                </Link>
              </div>
            </div>

            <ol className="space-y-4">
              {EXTENSION_STEPS.map((step, index) => {
                const Icon = STEP_ICONS[index] ?? Sparkles;
                return (
                  <li
                    key={step.title}
                    className="flex gap-4 rounded-2xl border border-white/5 bg-slate-950/50 p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-sm font-black text-indigo-400">
                      {index + 1}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="flex items-center gap-2 text-sm font-bold text-white">
                        <Icon className="h-4 w-4 text-indigo-400" />
                        {step.title}
                      </p>
                      <p className="text-xs leading-relaxed text-slate-400">{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
