import { NextRequest, NextResponse } from "next/server";
import { generateDocument, validateChatCapability } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey } = await req.json() as { provider?: string; apiKey?: string };

    if (!provider || !apiKey) {
      return NextResponse.json({ error: "Provider and API Key are required." }, { status: 400 });
    }

    const activeProvider = provider as AIProvider;

    const result = await generateDocument({
      jobDescription: "Test connection.",
      masterResume: "Test connection.",
      role: "Tester",
      company: "Tester Inc",
      type: "cv",
      provider: activeProvider,
      apiKey: apiKey,
    });

    const reader = result.textStream.getReader();
    await reader.read();
    await reader.cancel();

    const chatCheck = await validateChatCapability(activeProvider, apiKey);
    if (!chatCheck.ok) {
      return NextResponse.json(
        {
          error: `Key works for document generation, but Practice Coach chat is unavailable: ${chatCheck.error}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key validated for documents and Practice Coach chat.",
      chatModelId: chatCheck.modelId,
    });
  } catch (err: unknown) {
    console.error("API Key validation error:", err);
    const message = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
