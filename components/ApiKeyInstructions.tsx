"use client";

import { ExternalLink } from "lucide-react";
import type { UserProfile } from "@/lib/types";

type AiProvider = NonNullable<UserProfile["aiProvider"]>;

/** User-facing model labels — keep in sync with lib/ai.ts model IDs. */
export const PROVIDER_MODEL_COPY: Record<
  AiProvider,
  { label: string; models: string; note: string }
> = {
  google: {
    label: "Google Gemini (recommended)",
    models: "Gemini 3.5 Flash",
    note: "Best free-tier option for most hunters. HuntMode uses Gemini 3.5 Flash (with automatic fallbacks).",
  },
  openai: {
    label: "OpenAI (GPT-4o)",
    models: "GPT-4o",
    note: "Requires OpenAI platform billing. HuntMode uses GPT-4o for documents and Practice Coach.",
  },
  anthropic: {
    label: "Anthropic (Claude Sonnet 4.6)",
    models: "Claude Sonnet 4.6",
    note: "Requires Anthropic Console credits. HuntMode uses Claude Sonnet 4.6 (falls back to 4.5 if needed). Claude 3.5 is retired and not supported.",
  },
};

interface ApiKeyInstructionsProps {
  provider: AiProvider;
  className?: string;
}

export function ApiKeyInstructions({ provider, className }: ApiKeyInstructionsProps) {
  const copy = PROVIDER_MODEL_COPY[provider];

  if (provider === "google") {
    return (
      <div className={className ?? "rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2.5"}>
        <p className="text-xs font-bold text-emerald-300">How to get a Gemini API key</p>
        <p className="text-[11px] leading-relaxed text-emerald-100/80">
          <strong className="text-emerald-200">Known to work:</strong> {copy.models}. {copy.note}
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-slate-400">
          <li>
            Open{" "}
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-semibold text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline"
            >
              Google AI Studio → API keys
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Sign in with your Google account and accept the terms if prompted.</li>
          <li>
            Click <strong className="text-slate-300">Create API key</strong> (a new project is fine).
          </li>
          <li>
            Copy the key (starts with <code className="font-mono text-slate-300">AIza…</code>), paste
            it below, then tap <strong className="text-slate-300">Test key</strong>.
          </li>
        </ol>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Free tier works for light use. Always tap <strong className="text-slate-400">Test key</strong>{" "}
          before saving — that checks both document generation and Practice Coach. Your key stays in
          your profile and is only sent with your AI requests.
        </p>
        <a
          href="https://ai.google.dev/gemini-api/docs/api-key"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-200"
        >
          Official Gemini API key docs
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  if (provider === "anthropic") {
    return (
      <div className={className ?? "rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-2.5"}>
        <p className="text-xs font-bold text-orange-300">How to get an Anthropic API key</p>
        <p className="text-[11px] leading-relaxed text-orange-100/80">
          <strong className="text-orange-200">Known to work:</strong> {copy.models}. {copy.note}
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-slate-400">
          <li>
            Open{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-semibold text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline"
            >
              Anthropic Console → API keys
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Sign in or create an Anthropic account and add credits if prompted.</li>
          <li>
            Click <strong className="text-slate-300">Create Key</strong>, name it (e.g. HuntMode),
            and copy the key (starts with <code className="font-mono text-slate-300">sk-ant-…</code>
            ).
          </li>
          <li>
            Paste below and tap <strong className="text-slate-300">Test key</strong> before saving.
          </li>
        </ol>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Claude 3.5 Sonnet is retired and will not work. Use a current Anthropic account with Sonnet
          4.x access.
        </p>
      </div>
    );
  }

  return (
    <div className={className ?? "rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-2.5"}>
      <p className="text-xs font-bold text-sky-300">How to get an OpenAI API key</p>
      <p className="text-[11px] leading-relaxed text-sky-100/80">
        <strong className="text-sky-200">Known to work:</strong> {copy.models}. {copy.note}
      </p>
      <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-slate-400">
        <li>
          Open{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-semibold text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline"
          >
            OpenAI Platform → API keys
            <ExternalLink className="w-3 h-3" />
          </a>
        </li>
        <li>Sign in and add a payment method if required for your account tier.</li>
        <li>
          Click <strong className="text-slate-300">Create new secret key</strong> and copy it
          (starts with <code className="font-mono text-slate-300">sk-…</code>). You won&apos;t see it
          again.
        </li>
        <li>
          Paste below and tap <strong className="text-slate-300">Test key</strong> before saving.
        </li>
      </ol>
    </div>
  );
}

export function apiKeyPlaceholder(provider: AiProvider): string {
  if (provider === "google") return "Paste your AIzaSy… key";
  if (provider === "anthropic") return "Paste your sk-ant-… key";
  return "Paste your sk-… key";
}
