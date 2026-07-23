import { NextRequest } from "next/server";
import { buildSuggestPrompt, streamTextWithFallback, formatAIError } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";
import { adminAuth } from "@/lib/firebase-admin";
import { trackTokenUsage } from "@/lib/cost-tracker";
import { checkUserAiAccess } from "@/lib/platform-ai";

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

  const { content, jobDescription, role, company, type, provider, apiKey } = body as {
    content?: string;
    jobDescription?: string;
    role?: string;
    company?: string;
    type?: string;
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
      console.error("[suggest] Auth verification failed:", err);
    }
  }

  const access = checkUserAiAccess({
    email: userEmail,
    userApiKey: apiKey,
    feature: "suggest",
  });
  if (!access.ok) {
    return new Response(JSON.stringify({ error: access.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const activeApiKey = access.apiKey;

  if (!content?.trim()) {
    return new Response(
      JSON.stringify({ error: "No content to review. Write or paste your content first." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!jobDescription?.trim()) {
    return new Response(
      JSON.stringify({ error: "No job description available. Add one first." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const docType = (type === "cv" || type === "cover_letter") ? type : "cv";

  try {
    const prompt = buildSuggestPrompt({
      content,
      type: docType,
      jobDescription,
      role: role || "this role",
      company: company || "the company",
    });

    const { text: fullText, inputTokens, outputTokens, modelId } = await streamTextWithFallback({
      provider: (provider as AIProvider) || "openai",
      apiKey: activeApiKey,
      prompt,
      maxOutputTokens: 2000,
    });

    if (uid) {
      try {
        await trackTokenUsage(uid, (provider as AIProvider) || "openai", inputTokens, outputTokens, {
          feature: "suggest",
          modelId,
        });
      } catch (usageErr) {
        console.error("Failed to get token usage:", usageErr);
      }
    }

    if (!fullText.trim()) {
      return new Response(JSON.stringify({ error: "AI returned empty suggestions." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(fullText, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    console.error("AI suggest error:", err);
    const message = formatAIError(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
