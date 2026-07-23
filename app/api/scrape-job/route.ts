import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import type { AIProvider } from "@/lib/ai";
import { scrapeJobFromUrl } from "@/lib/scrape-job";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, provider, apiKey } = body as {
    url?: string;
    provider?: string;
    apiKey?: string;
  };

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  let uid = "";
  let userEmail = "";
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
      uid = decoded.uid || "";
      userEmail = decoded.email || "";
    } catch (err) {
      console.error("[scrape-job] Auth verification failed:", err);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await scrapeJobFromUrl({
    url,
    uid,
    userEmail,
    provider: provider as AIProvider | undefined,
    apiKey,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const { ok: _ok, ...payload } = result;
  return NextResponse.json(payload);
}
