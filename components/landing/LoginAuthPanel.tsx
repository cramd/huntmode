"use client";

import Link from "next/link";
import { ArrowRight, Code2, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/landing/GithubIcon";
import { HuntModeBrand } from "@/components/HuntModeBrand";
import {
  DEFAULT_HEADLINE_VARIANT,
  DIVIDER,
  ERROR_BANNER_FALLBACK,
  EYEBROW,
  GITHUB_REPO_URL,
  HEADLINE_VARIANTS,
  LEARN_MORE_HREF,
  LEARN_MORE_LABEL,
  LOCAL_INSTALL_BODY,
  LOCAL_INSTALL_CTA,
  LOCAL_INSTALL_TITLE,
  PRIMARY_CTA,
  SECONDARY_CTA,
  TRUST_LINE,
  type HeadlineVariant,
} from "@/components/landing/copy";

interface LoginAuthPanelProps {
  headlineVariant?: HeadlineVariant;
  authError: string | null;
  onSignInWithGoogle: () => void;
  onSignInWithGithub: () => void;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginAuthPanel({
  headlineVariant = DEFAULT_HEADLINE_VARIANT,
  authError,
  onSignInWithGoogle,
  onSignInWithGithub,
}: LoginAuthPanelProps) {
  const { headline, subhead } = HEADLINE_VARIANTS[headlineVariant];

  return (
    <div className="relative flex min-h-screen flex-col overflow-visible px-6 pb-8 pt-6 sm:px-10 sm:pt-8 lg:px-14 lg:pb-10 lg:pt-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <HuntModeBrand variant="stacked" href="/" className="items-start text-left" />

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/80">
            {EYEBROW}
          </p>
          <h1 className="text-3xl font-black leading-[1.2] tracking-tight text-white sm:text-4xl sm:leading-[1.15]">
            {headline}
          </h1>
          <p className="text-base leading-relaxed text-slate-400">{subhead}</p>
        </div>

          {authError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <p className="text-sm text-red-300/90">
                {authError || ERROR_BANNER_FALLBACK}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              size="lg"
              onClick={onSignInWithGoogle}
              className="h-12 w-full rounded-xl bg-white text-base font-bold text-slate-950 shadow-xl hover:bg-slate-100"
            >
              <GoogleIcon className="mr-2 h-5 w-5" />
              {PRIMARY_CTA}
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-medium text-slate-500">{DIVIDER}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <Button
              size="lg"
              variant="outline"
              onClick={onSignInWithGithub}
              className="h-12 w-full rounded-xl border-slate-700 bg-slate-900/60 text-base font-bold text-white hover:bg-slate-800"
            >
              <GithubIcon className="mr-2 h-5 w-5" />
              {SECONDARY_CTA}
            </Button>
          </div>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
            {TRUST_LINE}
          </p>
      </div>

      <div className="mx-auto mt-auto w-full max-w-md space-y-4 pt-10">
        <Link
          href={LEARN_MORE_HREF}
          className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-indigo-500/30 hover:bg-indigo-500/5"
        >
          <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
            {LEARN_MORE_LABEL}
          </span>
          <ArrowRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-400" />
        </Link>

        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/5"
        >
          <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/80" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-slate-200 group-hover:text-white">
              {LOCAL_INSTALL_TITLE}
            </p>
            <p className="text-xs leading-relaxed text-slate-500">
              {LOCAL_INSTALL_BODY}
            </p>
            <p className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-emerald-400/90">
              <GithubIcon className="h-3.5 w-3.5" />
              {LOCAL_INSTALL_CTA}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </p>
          </div>
        </a>

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-slate-600">
          <Link href="/blog" className="transition-colors hover:text-slate-400">
            Blog
          </Link>
          <span className="text-slate-700">·</span>
          <a
            href="https://dir.fuzzynacho.org"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-slate-400"
          >
            All projects
          </a>
        </footer>
      </div>
    </div>
  );
}
