"use client";

import { useEffect } from "react";

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[HuntMode] app error boundary:", error.message, error.digest);
    // #region agent log
    fetch("http://127.0.0.1:7755/ingest/515e276b-97ed-4604-80f1-6f57f7bffddb", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "7e1cb3" },
      body: JSON.stringify({
        sessionId: "7e1cb3",
        runId: "apps-crash",
        hypothesisId: "A",
        location: "app/(app)/error.tsx",
        message: "App segment error boundary",
        data: { errorMessage: error.message, digest: error.digest ?? null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-6 text-center">
        <h2 className="text-lg font-bold text-white">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-400">
          This page hit an unexpected error. Try reloading — if it keeps happening, contact support.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
