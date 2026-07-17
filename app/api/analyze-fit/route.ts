import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, formatAdminError } from "@/lib/firebase-admin";
import { buildFitScorePrompt, withModelFallback, formatAIError } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";
import { generateText } from "ai";
import type { FitScore } from "@/lib/types";
import { trackTokenUsage } from "@/lib/cost-tracker";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { applicationId, jobDescription, masterResume, role, company, provider, apiKey } = body as {
    applicationId?: string;
    jobDescription?: string;
    masterResume?: string;
    role?: string;
    company?: string;
    provider?: string;
    apiKey?: string;
  };

  if (!applicationId || !jobDescription || !masterResume) {
    return NextResponse.json(
      { error: "applicationId, jobDescription, and masterResume are required" },
      { status: 400 }
    );
  }

  const authHeader = req.headers.get("authorization");
  let userEmail = "";
  let uid = "";
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
      userEmail = decoded.email || "";
      uid = decoded.uid || "";
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isMarc = userEmail === "marcsherwood@gmail.com";
  if (!isMarc && (!apiKey || !apiKey.trim())) {
    return NextResponse.json(
      { error: "No AI API key provided. Add your key in Settings." },
      { status: 400 }
    );
  }

  try {
    const activeProvider = (provider as AIProvider) || "openai";
    const prompt = buildFitScorePrompt({
      jobDescription,
      masterResume,
      role: role || "this role",
      company: company || "the company",
    });

    const { result, modelId } = await withModelFallback(activeProvider, apiKey, (model) =>
      generateText({
        model,
        prompt,
        maxOutputTokens: 2000,
        maxRetries: 1,
        providerOptions: {
          google: { thinkingConfig: { thinkingBudget: 0 } },
        },
      })
    );

    if (result.usage) {
      await trackTokenUsage(uid, activeProvider, result.usage.inputTokens || 0, result.usage.outputTokens || 0, {
        feature: "analyze-fit",
        modelId,
        applicationId,
      });
    }

    const cleaned = result.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let fitScore: FitScore;
    try {
      fitScore = JSON.parse(cleaned);
    } catch {
      console.error("[analyze-fit] JSON parse failed:", cleaned.slice(0, 300));
      return NextResponse.json(
        { error: "AI returned malformed JSON. Please try again." },
        { status: 500 }
      );
    }

    // Validate and clamp
    fitScore.overall = Math.max(0, Math.min(100, Math.round(fitScore.overall || 0)));
    fitScore.generatedAt = new Date().toISOString();
    if (!Array.isArray(fitScore.strengths)) fitScore.strengths = [];
    if (!Array.isArray(fitScore.gaps)) fitScore.gaps = [];
    if (!Array.isArray(fitScore.suggestions)) fitScore.suggestions = [];
    if (!Array.isArray(fitScore.similarRoles)) fitScore.similarRoles = [];
    if (fitScore.breakdown) {
      for (const k of ["skills", "experience", "keywords", "culture"] as const) {
        fitScore.breakdown[k] = Math.max(0, Math.min(100, Math.round(fitScore.breakdown[k] || 0)));
      }
    }

    // Persist to Firestore
    await adminDb
      .collection("users")
      .doc(uid)
      .collection("applications")
      .doc(applicationId)
      .update({ fitScore, updatedAt: new Date().toISOString() });

    console.log(`[analyze-fit] Success overall=${fitScore.overall} app=${applicationId}`);
    return NextResponse.json({ fitScore });
  } catch (err: unknown) {
    console.error("[analyze-fit] error:", err);
    const rawMessage = err instanceof Error ? err.message : String(err);
    const message = /default credentials/i.test(rawMessage)
      ? formatAdminError(err)
      : formatAIError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
