import { NextRequest, NextResponse } from "next/server";
import { generateDocument } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey } = await req.json() as { provider?: string; apiKey?: string };

    if (!provider || !apiKey) {
      return NextResponse.json({ error: "Provider and API Key are required." }, { status: 400 });
    }

    // Try a tiny generation task to test key validity
    const result = await generateDocument({
      jobDescription: "Test connection.",
      masterResume: "Test connection.",
      role: "Tester",
      company: "Tester Inc",
      type: "cv",
      provider: provider as AIProvider,
      apiKey: apiKey,
    });

    // Consume the first chunk to ensure the API call actually resolves and authenticates successfully
    const reader = result.textStream.getReader();
    await reader.read();
    await reader.cancel();

    return NextResponse.json({ success: true, message: "API key validated successfully!" });
  } catch (err: unknown) {
    console.error("API Key validation error:", err);
    const message = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
