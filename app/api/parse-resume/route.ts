import { NextRequest } from "next/server";
import type { AIProvider } from "@/lib/ai";
import { adminAuth } from "@/lib/firebase-admin";
import { trackTokenUsage } from "@/lib/cost-tracker";
import { extractTextFromPdfBuffer, structureResumeFromText } from "@/lib/parse-resume";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const provider = (formData.get("provider") as AIProvider | null) ?? "openai";
  const apiKey = (formData.get("apiKey") as string | null) ?? undefined;

  if (!file) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return Response.json({ error: "File must be a PDF" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  let userEmail = "";
  let uid = "";
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      userEmail = decoded.email || "";
      uid = decoded.uid || "";
    } catch (err) {
      console.error("[parse-resume] Auth verification failed:", err);
    }
  }

  const isMarc = userEmail === "marcsherwood@gmail.com";
  const apiKeyToUse = isMarc ? apiKey || undefined : apiKey;

  if (!isMarc && (!apiKeyToUse || !apiKeyToUse.trim())) {
    return Response.json(
      { error: "No AI API key provided. Please configure your own AI key in Settings." },
      { status: 400 }
    );
  }

  let rawText: string;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    rawText = await extractTextFromPdfBuffer(buffer);
  } catch (err) {
    console.error("[parse-resume] PDF parse error:", err);
    return Response.json(
      { error: "Could not read PDF. Try a text-based PDF (not a scanned image)." },
      { status: 422 }
    );
  }

  if (!rawText.trim()) {
    return Response.json(
      { error: "PDF appears to be empty or image-only. Please use a text-based PDF." },
      { status: 422 }
    );
  }

  try {
    const { sections } = await structureResumeFromText({
      rawText,
      provider,
      apiKey: apiKeyToUse,
      onUsage: uid
        ? async (inputTokens, outputTokens, modelId) => {
            await trackTokenUsage(uid, provider, inputTokens, outputTokens, {
              feature: "parse-resume",
              modelId,
            });
          }
        : undefined,
    });
    return Response.json({ sections });
  } catch (err: unknown) {
    console.error("[parse-resume] AI error:", err);
    const message = err instanceof Error ? err.message : "AI extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
