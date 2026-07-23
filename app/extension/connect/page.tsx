"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { HuntModeBrand } from "@/components/HuntModeBrand";

type ConnectState = "loading" | "needs_login" | "connecting" | "success" | "error";

export default function ExtensionConnectPage() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const extensionId = searchParams.get("ext")?.trim() || "";
  const [state, setState] = useState<ConnectState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!extensionId) {
      setState("error");
      setErrorMessage("Missing extension id. Open this page from the HuntMode Chrome extension.");
      return;
    }
    if (!user) {
      setState("needs_login");
      return;
    }

    let cancelled = false;
    setState("connecting");

    (async () => {
      try {
        const token = await user.getIdToken();
        const chromeApi = (window as unknown as { chrome?: { runtime?: { sendMessage?: Function } } }).chrome;
        if (!chromeApi?.runtime?.sendMessage) {
          setState("error");
          setErrorMessage(
            "Could not reach the extension. Make sure it is installed and this page was opened from the extension popup."
          );
          return;
        }

        await new Promise<void>((resolve, reject) => {
          chromeApi.runtime!.sendMessage!(
            extensionId,
            {
              type: "HUNTMODE_AUTH_UPDATED",
              auth: { token, uid: user.uid, email: user.email },
            },
            (response: { ok?: boolean; error?: string } | undefined) => {
              const lastError = (window as unknown as { chrome?: { runtime?: { lastError?: { message?: string } } } })
                .chrome?.runtime?.lastError;
              if (lastError?.message) {
                reject(new Error(lastError.message));
                return;
              }
              if (!response?.ok) {
                reject(new Error(response?.error || "Extension rejected the connection"));
                return;
              }
              resolve();
            }
          );
        });

        if (!cancelled) setState("success");
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setErrorMessage(err instanceof Error ? err.message : "Connection failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, extensionId]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <HuntModeBrand className="justify-center" />

        {state === "loading" || state === "connecting" ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p>{state === "connecting" ? "Connecting extension…" : "Loading…"}</p>
          </div>
        ) : null}

        {state === "needs_login" && (
          <div className="space-y-4">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <p className="text-slate-300">Sign in to HuntMode first, then return here to connect the extension.</p>
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/?redirect=${encodeURIComponent(`/extension/connect?ext=${extensionId}`)}`}
                  className="w-full inline-flex items-center justify-center"
                />
              }
              className="w-full"
            >
              Sign in with Google
            </Button>
          </div>
        )}

        {state === "success" && (
          <div className="space-y-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-slate-200 font-semibold">Extension connected</p>
            <p className="text-sm text-slate-400">
              You can close this tab and use &ldquo;Add to HuntMode now&rdquo; from any job posting.
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-4">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <p className="text-sm text-red-200">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
