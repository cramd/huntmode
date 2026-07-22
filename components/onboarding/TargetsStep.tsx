"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_CHIPS = [
  "Senior Product Manager",
  "Platform Engineer",
  "Product Marketing Manager",
  "GTM Lead",
];

interface TargetsStepProps {
  targetRoles: string[];
  targetIndustry: string;
  suggestedRoles?: string[];
  suggestedIndustry?: string;
  loading: boolean;
  error: string | null;
  onChangeRoles: (roles: string[]) => void;
  onChangeIndustry: (industry: string) => void;
}

export function TargetsStep({
  targetRoles,
  targetIndustry,
  suggestedRoles = [],
  suggestedIndustry,
  loading,
  error,
  onChangeRoles,
  onChangeIndustry,
}: TargetsStepProps) {
  const [roleInput, setRoleInput] = useState("");

  const addRole = (role: string) => {
    const trimmed = role.trim();
    if (!trimmed || targetRoles.includes(trimmed)) return;
    onChangeRoles([...targetRoles, trimmed]);
    setRoleInput("");
  };

  const removeRole = (role: string) => {
    onChangeRoles(targetRoles.filter((r) => r !== role));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-white">What are you hunting for?</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          Tell us the roles and industry you want. HuntMode&apos;s server AI will suggest three
          draft applications you can review before we import them.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Industry
        </Label>
        <Input
          value={targetIndustry}
          onChange={(e) => onChangeIndustry(e.target.value)}
          placeholder={
            suggestedIndustry || "e.g. B2B SaaS, fintech, developer tools"
          }
          className="rounded-xl border-white/5 bg-slate-950/60 text-white"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Target roles
        </Label>
        <div className="flex gap-2">
          <Input
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addRole(roleInput);
              }
            }}
            placeholder="e.g. Senior Platform Engineer"
            className="rounded-xl border-white/5 bg-slate-950/60 text-white"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addRole(roleInput)}
            className="shrink-0 border-white/10"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {(suggestedRoles.length > 0 || ROLE_CHIPS.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {[...new Set([...suggestedRoles, ...ROLE_CHIPS])]
              .filter((r) => !targetRoles.includes(r))
              .slice(0, 8)
              .map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => addRole(chip)}
                  className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20"
                >
                  + {chip}
                </button>
              ))}
          </div>
        )}

        {targetRoles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {targetRoles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-white"
              >
                {role}
                <button
                  type="button"
                  onClick={() => removeRole(role)}
                  className="text-slate-500 hover:text-white"
                  aria-label={`Remove ${role}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
