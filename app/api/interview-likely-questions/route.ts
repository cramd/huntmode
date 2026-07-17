import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { buildLikelyQuestionsPrompt } from "@/lib/interview-chat";
import { withModelFallback, formatAIError } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";
import { adminAuth } from "@/lib/firebase-admin";
import { trackTokenUsage } from "@/lib/cost-tracker";

const questionsSchema = z.object({
  questions: z.array(z.string()).min(6).max(14),
});

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { company, role, jobDescription, cvText, provider, apiKey } = body as {
    company?: string;
    role?: string;
    jobDescription?: string;
    cvText?: string;
    provider?: string;
    apiKey?: string;
  };

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
      console.error("[interview-likely-questions] Auth verification failed:", err);
    }
  }

  const isMarc = userEmail === "marcsherwood@gmail.com";
  if (!isMarc && (!apiKey || !apiKey.trim())) {
    return new Response(
      JSON.stringify({ error: "No AI API key provided. Please configure your own AI key in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!jobDescription?.trim()) {
    return new Response(JSON.stringify({ error: "Job description is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!cvText?.trim()) {
    return new Response(
      JSON.stringify({ error: "CV text is required. Tailor a CV or save your master resume first." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const activeProvider = (provider as AIProvider) || "openai";
  const prompt = buildLikelyQuestionsPrompt({
    company: company || "the company",
    role: role || "this role",
    jobDescription,
    cvText,
  });

  try {
    const { result, modelId } = await withModelFallback(activeProvider, apiKey, (model) =>
      generateObject({
        model,
        prompt,
        schema: questionsSchema,
        maxRetries: 1,
      })
    );

    if (uid && result.usage) {
      await trackTokenUsage(uid, activeProvider, result.usage.inputTokens || 0, result.usage.outputTokens || 0, {
        feature: "interview-likely-questions",
        modelId,
      });
    }

    return new Response(JSON.stringify(result.object), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("[interview-likely-questions] error:", err);
    return new Response(JSON.stringify({ error: formatAIError(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
