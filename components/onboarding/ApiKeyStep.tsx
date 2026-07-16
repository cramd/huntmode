"use client";

import { useState } from "react";
import Link from "next/link";
import { Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiKeyInstructions, apiKeyPlaceholder } from "@/components/ApiKeyInstructions";
import type { UserProfile } from "@/lib/types";
import { toast } from "sonner";

type AiProvider = NonNullable<UserProfile["aiProvider"]>;

interface ApiKeyStepProps {
  aiProvider: AiProvider;
  aiApiKey: string;
  keyValidated: boolean;
  completing: boolean;
  error: string | null;
  onChangeProvider: (provider: AiProvider) => void;
  onChangeApiKey: (key: string) => void;
  onKeyValidated: () => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function ApiKeyStep({
  aiProvider,
  aiApiKey,
  keyValidated,
  completing,
  error,
  onChangeProvider,
  onChangeApiKey,
  onKeyValidated,
  onBack,
  onSkip,
  onComplete,
}: ApiKeyStepProps) {
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const handleTestKey = async () => {
    if (!aiApiKey.trim()) {
      toast.error("Paste your API key first.");
      return;
    }
    setTesting(true);
    setTestError(null);
    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: aiProvider, apiKey: aiApiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Key validation failed");
      onKeyValidated();
      toast.success(
        data.chatModelId
          ? `API key works — Practice Coach ready (${data.chatModelId}).`
          : "API key works — you're ready to tailor applications."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid key";
      setTestError(msg);
      toast.error(`Validation failed: ${msg}`);
    } finally {
      setTesting(false);
    }
  };

  const canFinishWithKey = !aiApiKey.trim() || keyValidated;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-white">Connect your AI key</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          Tailoring CVs, cover letters, fit scores, and interview prep run on <strong className="text-slate-300">your</strong>{" "}
          API key (BYOK). Setup above used HuntMode&apos;s server key — this step unlocks everything
          inside the app.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
        Without a key, you can browse drafts and applications, but AI actions will stop and ask you
        to visit Settings. Adding it now avoids that surprise mid-application.
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            AI provider
          </Label>
          <Select
            value={aiProvider}
            onValueChange={(v) => {
              onChangeProvider(v as AiProvider);
              setTestError(null);
            }}
          >
            <SelectTrigger className="w-full rounded-xl border-white/5 bg-slate-950/60 font-medium text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-slate-950 text-white">
              <SelectItem value="google" className="text-xs focus:bg-white/5 focus:text-white">
                Google Gemini (recommended)
              </SelectItem>
              <SelectItem value="openai" className="text-xs focus:bg-white/5 focus:text-white">
                OpenAI (GPT-4o)
              </SelectItem>
              <SelectItem value="anthropic" className="text-xs focus:bg-white/5 focus:text-white">
                Anthropic (Claude)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ApiKeyInstructions provider={aiProvider} />

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">API key</Label>
          <div className="flex gap-2">
            <Input
              type="password"
              value={aiApiKey}
              onChange={(e) => {
                onChangeApiKey(e.target.value);
                setTestError(null);
              }}
              placeholder={apiKeyPlaceholder(aiProvider)}
              className="flex-1 rounded-xl border-white/5 bg-slate-950/60 font-mono text-sm text-white placeholder:text-slate-600"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleTestKey}
              disabled={testing || !aiApiKey.trim()}
              className="shrink-0 rounded-xl border-white/5 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Testing…
                </>
              ) : (
                "Test key"
              )}
            </Button>
          </div>
          {keyValidated && (
            <p className="text-xs font-semibold text-emerald-400">Key validated successfully.</p>
          )}
          {testError && (
            <p className="text-xs text-red-300">{testError}</p>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <p className="text-[10px] leading-relaxed text-slate-500">
        You can always add or change your key in{" "}
        <Link href="/settings" className="font-semibold text-indigo-300 hover:text-indigo-200">
          Settings
        </Link>
        . Keys are stored in your profile and only used for your requests.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={completing}
          className="text-slate-400 hover:text-white"
        >
          Back
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={completing}
            className="text-slate-400 hover:text-white"
          >
            Skip for now
          </Button>
          <Button
            type="button"
            onClick={onComplete}
            disabled={completing || !canFinishWithKey}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white hover:from-indigo-500 hover:to-purple-500"
          >
            {completing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up your hunt…
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                {aiApiKey.trim() ? "Save key & start hunting" : "Start hunting"}
              </>
            )}
          </Button>
        </div>
      </div>

      {aiApiKey.trim() && !keyValidated && (
        <p className="text-center text-[10px] text-slate-500">
          Test your key before continuing, or use Skip for now.
        </p>
      )}
    </div>
  );
}
