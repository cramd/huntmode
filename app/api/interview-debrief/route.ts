import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { buildInterviewDebriefPrompt } from "@/lib/interview-chat";
import { withModelFallback, formatAIError } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";
import { adminAuth } from "@/lib/firebase-admin";
import { trackTokenUsage } from "@/lib/cost-tracker";
import type { InterviewChatMode } from "@/lib/types";

const debriefSchema = z.object({
  clarity: z.number().int().min(1).max(5),
  structure: z.number().int().min(1).max(5),
  specificity: z.number().int().min(1).max(5),
  roleFit: z.number().int().min(1).max(5),
  summary: z.string(),
  rewrites: z.array(z.string()).min(1).max(4),
  researchGaps: z.array(z.string()).min(1).max(5),
  weakSpots: z.array(z.string()).min(1).max(5),
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

  const {
    company,
    role,
    mode,
    transcript,
    jobDescription,
    provider,
    apiKey,
  } = body as {
    company?: string;
    role?: string;
    mode?: string;
    transcript?: string;
    jobDescription?: string;
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
      console.error("[interview-debrief] Auth verification failed:", err);
    }
  }

  const isMarc = userEmail === "marcsherwood@gmail.com";
  if (!isMarc && (!apiKey || !apiKey.trim())) {
    return new Response(
      JSON.stringify({ error: "No AI API key provided. Please configure your own AI key in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!transcript?.trim() || !jobDescription?.trim()) {
    return new Response(
      JSON.stringify({ error: "Transcript and job description are required for a debrief." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const activeProvider = (provider as AIProvider) || "openai";
  const prompt = buildInterviewDebriefPrompt({
    company: company || "the company",
    role: role || "this role",
    mode: (mode as InterviewChatMode) || "secondary",
    transcript,
    jobDescription,
  });

  try {
    const result = await withModelFallback(activeProvider, apiKey, (model) =>
      generateObject({
        model,
        prompt,
        schema: debriefSchema,
        maxRetries: 1,
      })
    );

    if (uid && result.usage) {
      await trackTokenUsage(uid, activeProvider, result.usage.inputTokens || 0, result.usage.outputTokens || 0);
    }

    const debrief = {
      ...result.object,
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(debrief), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("[interview-debrief] error:", err);
    return new Response(JSON.stringify({ error: formatAIError(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
