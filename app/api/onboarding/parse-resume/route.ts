import { NextRequest, NextResponse } from "next/server";
import { verifyOnboardingAuth } from "@/lib/onboarding-auth";
import { adminDb } from "@/lib/firebase-admin";
import { extractTextFromPdfBuffer, structureResumeFromText } from "@/lib/parse-resume";
import { ONBOARDING_MAX_PDF_BYTES } from "@/lib/onboarding";
import { trackTokenUsage } from "@/lib/cost-tracker";

export const runtime = "nodejs";

async function assertOnboardingAllowed(uid: string): Promise<string | null> {
  const profileSnap = await adminDb.doc(`users/${uid}/profile/data`).get();
  const profile = profileSnap.data();
  if (profile?.onboardingCompletedAt) {
    return "Onboarding already completed";
  }
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await verifyOnboardingAuth(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await assertOnboardingAllowed(auth.uid);
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 400 });
  }

  if (!process.env.GOOGLE_AI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Server AI is not configured. Contact the administrator." },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }
  if (file.size > ONBOARDING_MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF must be 5MB or smaller" }, { status: 400 });
  }

  let rawText: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    rawText = await extractTextFromPdfBuffer(buffer);
  } catch (err) {
    console.error("[onboarding/parse-resume] PDF error:", err);
    return NextResponse.json(
      { error: "Could not read PDF. Try a text-based PDF (not a scanned image)." },
      { status: 422 }
    );
  }

  if (!rawText.trim()) {
    return NextResponse.json(
      { error: "PDF appears to be empty or image-only. Please use a text-based PDF." },
      { status: 422 }
    );
  }

  try {
    const { sections, hints } = await structureResumeFromText({
      rawText,
      provider: "google",
      apiKey: process.env.GOOGLE_AI_API_KEY,
      includeHints: true,
      onUsage: async (inputTokens, outputTokens) => {
        await trackTokenUsage(auth.uid, "google", inputTokens, outputTokens);
      },
    });
    return NextResponse.json({ sections, hints });
  } catch (err: unknown) {
    console.error("[onboarding/parse-resume] AI error:", err);
    const message = err instanceof Error ? err.message : "AI extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
