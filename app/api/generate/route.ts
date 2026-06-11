import { NextRequest } from "next/server";
import { generateDocument } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";

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
    const result = await generateDocument({
      jobDescription,
      masterResume,
      role: role || "this role",
      company: company || "the company",
      type: docType,
      provider: (provider as AIProvider) || "openai",
      apiKey,
    });

    // Consume the text stream into chunks so we can catch provider errors
    // (streamText returns lazily — errors only surface when reading the stream)
    const reader = result.textStream;
    const chunks: string[] = [];
    try {
      for await (const chunk of reader) {
        chunks.push(chunk);
      }
    } catch (streamErr: unknown) {
      console.error("AI stream error:", streamErr);
      const msg = streamErr instanceof Error ? streamErr.message : "AI generation failed during streaming";
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fullText = chunks.join("");
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
    const message = err instanceof Error ? err.message : "AI generation failed";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
