import { NextRequest } from "next/server";
import { streamTextWithFallback, formatAIError, buildCVPrompt, buildCoverLetterPrompt } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";
import { adminAuth } from "@/lib/firebase-admin";
import { trackTokenUsage } from "@/lib/cost-tracker";

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

  const { jobDescription, masterResume, role, company, type, provider, apiKey } = body as {
    jobDescription?: string;
    masterResume?: string;
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
      console.error("[generate] Auth verification failed:", err);
    }
  }

  const isMarc = userEmail === "marcsherwood@gmail.com";
  if (!isMarc && (!apiKey || !apiKey.trim())) {
    return new Response(
      JSON.stringify({ error: "No AI API key provided. Please configure your own AI key in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log("[generate] provider:", provider, "type:", type,
    "jd length:", jobDescription?.length ?? 0,
    "resume length:", masterResume?.length ?? 0);

  if (!jobDescription || !masterResume || !masterResume.trim() || !type) {
    const missing = [
      !jobDescription && "jobDescription (job description is missing)",
      (!masterResume || !masterResume.trim()) && "masterResume (your master resume text is empty. Go to My Resume, fill out your summary/experience/skills, and click Save first!)",
      !type && "type",
    ].filter(Boolean).join(", ");
    console.error("[generate] 400 missing:", missing);
    return new Response(
      JSON.stringify({ error: `Missing: ${missing}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const docType = (type === "cv" || type === "cover_letter") ? type : "cv";

  try {
    const prompt =
      docType === "cv"
        ? buildCVPrompt({
            jobDescription,
            masterResume,
            role: role || "this role",
            company: company || "the company",
            type: docType,
          })
        : buildCoverLetterPrompt({
            jobDescription,
            masterResume,
            role: role || "this role",
            company: company || "the company",
            type: docType,
          });

    const { text: fullText, inputTokens, outputTokens } = await streamTextWithFallback({
      provider: (provider as AIProvider) || "openai",
      apiKey,
      prompt,
    });

    if (uid) {
      try {
        await trackTokenUsage(uid, (provider as AIProvider) || "openai", inputTokens, outputTokens);
      } catch (usageErr) {
        console.error("Failed to track token usage:", usageErr);
      }
    }

    if (!fullText.trim()) {
      return new Response(JSON.stringify({ error: "AI returned empty response. Check your API key and try again." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return the full text as a simple streaming-compatible response
    return new Response(fullText, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    console.error("AI generation error:", err);
    const message = formatAIError(err);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
