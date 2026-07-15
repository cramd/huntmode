"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MasterResume } from "@/lib/types";
import type { ParseResumeHints } from "@/lib/parse-resume";

interface UploadCvStepProps {
  sections: MasterResume["sections"] | null;
  parsing: boolean;
  error: string | null;
  onParse: (file: File) => void;
  onSkip: () => void;
  onContinue: () => void;
}

export function UploadCvStep({
  sections,
  parsing,
  error,
  onParse,
  onSkip,
  onContinue,
}: UploadCvStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file || parsing) return;
    onParse(file);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-white">Upload your current CV</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          We&apos;ll structure it into a Master Resume using HuntMode&apos;s server AI — no API
          key needed during setup.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver
            ? "border-indigo-400 bg-indigo-500/10"
            : "border-white/10 bg-slate-900/40 hover:border-indigo-500/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {parsing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Reading and structuring your CV…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-10 w-10 text-indigo-400" />
            <p className="text-sm font-semibold text-white">Drop a PDF or click to browse</p>
            <p className="text-xs text-slate-500">Text-based PDF · max 5MB</p>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {sections && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-300">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-bold">CV parsed — preview</span>
          </div>
          {sections.summary && (
            <p className="text-xs text-slate-400 line-clamp-3">{sections.summary}</p>
          )}
          {sections.experience && (
            <p className="text-xs text-slate-500 line-clamp-4 whitespace-pre-wrap">
              {sections.experience.slice(0, 400)}
              {sections.experience.length > 400 ? "…" : ""}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          disabled={parsing}
          className="text-slate-400 hover:text-white"
        >
          Skip for now
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={parsing}
          className="bg-indigo-600 font-bold text-white hover:bg-indigo-500"
        >
          {sections ? "Continue" : "Continue without CV"}
        </Button>
      </div>
    </div>
  );
}

export type { ParseResumeHints };
