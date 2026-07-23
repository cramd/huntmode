import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { AIProvider } from "@/lib/ai";
import { createDraftFromUrlAdmin } from "@/lib/create-draft-from-url-admin";
import { verifyAuthToken } from "@/lib/verify-auth-token";
import type { Application } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const pageTitle = typeof body.pageTitle === "string" ? body.pageTitle.trim() : undefined;
  const provider = typeof body.provider === "string" ? body.provider : undefined;
  const apiKey = typeof body.apiKey === "string" ? body.apiKey : undefined;

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const decoded = await verifyAuthToken(req);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = decoded.uid;
  const userEmail = decoded.email || "";

  const appsSnap = await adminDb.collection("users").doc(uid).collection("applications").get();
  const existingApplications = appsSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Application, "id">),
  }));

  const result = await createDraftFromUrlAdmin({
    uid,
    userEmail,
    input: {
      url,
      pageTitle,
      notes: "Added from HuntMode browser extension",
    },
    scrapeParams: {
      uid,
      userEmail,
      provider: provider as AIProvider | undefined,
      apiKey,
    },
    existingApplications,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (result.duplicate) {
    return NextResponse.json({
      duplicate: true,
      id: result.existingId,
      status: "draft",
    });
  }

  return NextResponse.json({
    id: result.id,
    company: result.application.company,
    role: result.application.role,
    jobUrl: result.application.jobUrl,
    status: result.application.status,
    duplicate: false,
  });
}
