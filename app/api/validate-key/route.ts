import { NextRequest, NextResponse } from "next/server";
import {
  validateChatCapability,
  withModelFallback,
  formatAIError,
  type AIProvider,
} from "@/lib/ai";
import { generateText } from "ai";

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey } = (await req.json()) as {
      provider?: string;
      apiKey?: string;
    };

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "Provider and API Key are required." },
        { status: 400 }
      );
    }

    const activeProvider = provider as AIProvider;

    // Document probe: use generateText (not a partial stream read).
    // Partial textStream reads can return done/empty without surfacing the real API error.
    try {
      const docProbe = await withModelFallback(activeProvider, apiKey, (model) =>
        generateText({
          model,
          prompt:
            "Write a one-line resume summary for a software engineer. Max 20 words.",
          maxOutputTokens: 64,
          maxRetries: 0,
          ...(activeProvider === "google"
            ? {
                providerOptions: {
                  google: { thinkingConfig: { thinkingBudget: 0 } },
                },
              }
            : {}),
        })
      );
      const docText = (docProbe.text || "").trim();
      if (!docText) {
        throw new Error("Document generation returned an empty response.");
      }
    } catch (docErr) {
      throw new Error(
        `Document generation failed: ${formatAIError(docErr)}. Check that your API key can access the recommended model for this provider.`
      );
    }

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
