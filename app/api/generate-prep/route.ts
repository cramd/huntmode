import { NextRequest } from "next/server";
import { buildInterviewPrepPrompt, withModelFallback, formatAIError } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";
import { generateObject } from "ai";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";
import { trackTokenUsage } from "@/lib/cost-tracker";

const prepSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      icon: z.string(),
      keywords: z.array(z.string()),
      script: z.string()
    })
  ),
  questions: z.array(z.string())
});

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

  const { jobDescription, cvText, role, company, provider, apiKey } = body as {
    jobDescription?: string;
    cvText?: string;
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
      console.error("[generate-prep] Auth verification failed:", err);
    }
  }

  const isMarc = userEmail === "marcsherwood@gmail.com";
  if (!isMarc && (!apiKey || !apiKey.trim())) {
    return new Response(
      JSON.stringify({ error: "No AI API key provided. Please configure your own AI key in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!jobDescription || !jobDescription.trim()) {
    return new Response(
      JSON.stringify({ error: "Job description is missing." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!cvText || !cvText.trim()) {
    return new Response(
      JSON.stringify({ error: "Your CV / resume text is empty. Tailor a CV or save your master resume first." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const activeProvider = (provider as AIProvider) || "openai";
    const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "None";
    console.log(`[generate-prep] Starting generation. Provider: ${activeProvider}, API Key: ${maskedKey}, Role: ${role}, Company: ${company}`);

    const prompt = buildInterviewPrepPrompt({
      jobDescription,
      cvText,
      role: role || "this role",
      company: company || "the company",
    });

    console.log(`[generate-prep] Prompt length: ${prompt.length}. Calling generateObject...`);
    const { result, modelId } = await withModelFallback(activeProvider, apiKey, (fallbackModel) =>
      generateObject({
        model: fallbackModel,
        prompt,
        schema: prepSchema,
        maxRetries: 1,
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        },
      })
    );

    if (uid && result.usage) {
      await trackTokenUsage(uid, activeProvider, result.usage.inputTokens || 0, result.usage.outputTokens || 0, {
        feature: "generate-prep",
        modelId,
      });
    }

    console.log(`[generate-prep] Received valid object successfully`);

    return new Response(JSON.stringify(result.object), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("AI generate-prep error:", err);
    const message = formatAIError(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function extractJson(text: string): string {
  const startArray = text.indexOf("[");
  const startObject = text.indexOf("{");
  
  let startIdx = -1;
  let endChar = "";
  
  if (startArray !== -1 && (startObject === -1 || startArray < startObject)) {
    startIdx = startArray;
    endChar = "]";
  } else if (startObject !== -1) {
    startIdx = startObject;
    endChar = "}";
  }
  
  if (startIdx === -1) {
    return text;
  }
  
  const endIdx = text.lastIndexOf(endChar);
  if (endIdx !== -1 && endIdx > startIdx) {
    return text.substring(startIdx, endIdx + 1);
  }
  
  return text;
}

