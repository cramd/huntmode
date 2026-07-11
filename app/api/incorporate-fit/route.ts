import { NextRequest } from "next/server";
import { buildIncorporateFitPrompt, streamTextWithFallback, formatAIError } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";
import type { FitInsightCardType } from "@/lib/types";
import { adminAuth } from "@/lib/firebase-admin";
import { trackTokenUsage } from "@/lib/cost-tracker";

const VALID_CARD_TYPES: FitInsightCardType[] = ["strengths", "gaps", "suggestions"];

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const {
    currentCV,
    items,
    cardType,
    jobDescription,
    masterResume,
    role,
    company,
    provider,
    apiKey,
  } = body as {
    currentCV?: string;
    items?: string[];
    cardType?: string;
    jobDescription?: string;
    masterResume?: string;
    role?: string;
    company?: string;
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
      console.error("[incorporate-fit] Auth verification failed:", err);
    }
  }

  const isMarc = userEmail === "marcsherwood@gmail.com";
  if (!isMarc && (!apiKey || !apiKey.trim())) {
    return new Response(
      JSON.stringify({ error: "No AI API key provided. Please configure your own AI key in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!currentCV?.trim()) {
    return new Response(
      JSON.stringify({ error: "No CV content to revise. Generate a CV first." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!jobDescription?.trim() || !masterResume?.trim()) {
    return new Response(
      JSON.stringify({ error: "Job description and master resume are required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!cardType || !VALID_CARD_TYPES.includes(cardType as FitInsightCardType)) {
    return new Response(
      JSON.stringify({ error: "cardType must be strengths, gaps, or suggestions." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const itemList = Array.isArray(items) ? items.filter((i) => typeof i === "string" && i.trim()) : [];
  if (itemList.length === 0) {
    return new Response(
      JSON.stringify({ error: "No items to incorporate." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const prompt = buildIncorporateFitPrompt({
      currentCV,
      items: itemList,
      cardType: cardType as FitInsightCardType,
      jobDescription,
      masterResume,
      role: role || "this role",
      company: company || "the company",
    });

    const { text, inputTokens, outputTokens } = await streamTextWithFallback({
      provider: (provider as AIProvider) || "openai",
      apiKey,
      prompt,
      maxOutputTokens: 4000,
    });

    if (uid) {
      try {
        await trackTokenUsage(uid, (provider as AIProvider) || "openai", inputTokens, outputTokens);
      } catch (usageErr) {
        console.error("[incorporate-fit] Failed to track token usage:", usageErr);
      }
    }

    if (!text.trim()) {
      return new Response(
        JSON.stringify({ error: "AI returned empty response. Try again." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("[incorporate-fit] error:", err);
    const message = formatAIError(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
