import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Megaphone } from "lucide-react";
import { HuntModeBrand } from "@/components/HuntModeBrand";
import { ChangelogViewTracker } from "@/components/ChangelogViewTracker";
import {
  CHANGELOG,
  CHANGELOG_KIND_LABEL,
  formatChangelogDate,
  type ChangelogKind,
} from "@/lib/changelog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "What's New | HuntMode",
  description:
    "Product changelog for HuntMode — Practice Coach, Find Similar Roles, onboarding, and daily improvements.",
  openGraph: {
    title: "What's New | HuntMode",
    description:
      "See what changed in HuntMode — interview Practice Coach, clearer controls, and recent releases.",
    url: "https://www.huntmode.ca/changelog",
  },
};

const KIND_STYLES: Record<ChangelogKind, string> = {
  new: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  improved: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  fixed: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export default function ChangelogPage() {
  const latest = CHANGELOG[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      <ChangelogViewTracker />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-8 sm:px-10">
        <HuntModeBrand variant="inline" href="/" />
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/blog/"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            Blog
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            About
          </Link>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-transparent px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Sign in
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl space-y-12 px-6 pb-24 sm:px-10">
        <section className="space-y-4 pt-2">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/80">
            <Megaphone className="h-3.5 w-3.5" />
            Changelog
          </p>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            What&apos;s new in HuntMode
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            We ship often. This page is the plain-English list of what changed —
            so you can catch up without digging through every release.
          </p>
          {latest && (
            <p className="text-sm text-slate-500">
              Latest:{" "}
              <span className="font-semibold text-slate-300">
                {formatChangelogDate(latest.date)}
              </span>{" "}
              · {latest.title}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
            >
              Open HuntMode
            </Link>
            <p className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 font-mono text-[11px] text-slate-400">
              https://www.huntmode.ca/changelog
            </p>
          </div>
        </section>

        <ol className="space-y-8">
          {CHANGELOG.map((release, index) => (
            <li
              key={release.date + release.title}
              id={release.date}
              className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <time
                      dateTime={release.date}
                      className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      {formatChangelogDate(release.date)}
                    </time>
                    {index === 0 && (
                      <span className="rounded-md border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-300">
                        Latest
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                    {release.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-400">
                    {release.summary}
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-3">
                {release.items.map((item) => (
                  <li key={item.text} className="flex gap-3 text-sm leading-relaxed">
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        KIND_STYLES[item.kind]
                      )}
                    >
                      {CHANGELOG_KIND_LABEL[item.kind]}
                    </span>
                    <span className="text-slate-300">{item.text}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <section className="rounded-2xl border border-dashed border-white/10 bg-slate-900/20 p-5 text-sm text-slate-400">
          <p className="font-semibold text-slate-200">How we use this</p>
          <p className="mt-2 leading-relaxed">
            Big story posts still go on the{" "}
            <Link href="/blog/" className="font-semibold text-indigo-300 hover:text-indigo-200">
              blog
            </Link>
            . This changelog is the short, shareable list for day-to-day
            shipping — copy{" "}
            <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">
              https://www.huntmode.ca/changelog
            </code>{" "}
            when someone asks what changed.
          </p>
        </section>
      </main>
    </div>
  );
}
