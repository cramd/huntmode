import { NextRequest } from "next/server";
import { getModel, buildSuggestPrompt } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";
import { streamText } from "ai";

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
    const model = getModel((provider as AIProvider) || "openai", apiKey);
    const prompt = buildSuggestPrompt({
      content,
      type: docType,
      jobDescription,
      role: role || "this role",
      company: company || "the company",
    });

    const result = await streamText({ model, prompt, maxOutputTokens: 2000 });

    // Consume stream to catch provider errors
    const chunks: string[] = [];
    try {
      for await (const chunk of result.textStream) {
        chunks.push(chunk);
      }
    } catch (streamErr: unknown) {
      console.error("AI suggest stream error:", streamErr);
      const msg = streamErr instanceof Error ? streamErr.message : "AI suggestion failed";
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fullText = chunks.join("");
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
    const message = err instanceof Error ? err.message : "AI suggestion failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
