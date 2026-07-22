import { NextRequest } from "next/server";
import { convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import {
  buildDocumentRevisionSystemPrompt,
  type DocumentRevisionKind,
} from "@/lib/document-revision-chat";
import { createChatStreamResponseWithFallback, formatAIError } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";
import { adminAuth } from "@/lib/firebase-admin";
import { trackTokenUsage } from "@/lib/cost-tracker";
import type { UsageFeature } from "@/lib/types";

const requestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  documentType: z.enum(["cv", "cover_letter"]).optional(),
  currentCV: z.string().optional(),
  currentDocument: z.string().optional(),
  currentCoverLetter: z.string().optional(),
  masterResume: z.string().min(1),
  jobDescription: z.string().min(1),
  role: z.string(),
  company: z.string(),
  provider: z.string().optional(),
  apiKey: z.string().optional(),
});

function resolveDocumentType(data: z.infer<typeof requestSchema>): DocumentRevisionKind {
  return data.documentType === "cover_letter" ? "cover_letter" : "cv";
}

function resolveCurrentDocument(data: z.infer<typeof requestSchema>): string {
  const fromUnified = data.currentDocument?.trim();
  if (fromUnified) return fromUnified;
  const kind = resolveDocumentType(data);
  if (kind === "cover_letter") {
    return data.currentCoverLetter?.trim() || "";
  }
  return data.currentCV?.trim() || "";
}

function usageFeatureFor(kind: DocumentRevisionKind): UsageFeature {
  return kind === "cover_letter" ? "cl-revision-chat" : "cv-revision-chat";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = parsed.data;
  const documentType = resolveDocumentType(data);
  const currentDocument = resolveCurrentDocument(data);
  if (!currentDocument) {
    return new Response(JSON.stringify({ error: "Current document text is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

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
      console.error("[cv-revision-chat] Auth verification failed:", err);
    }
  }

  const isMarc = userEmail === "marcsherwood@gmail.com";
  if (!isMarc && (!data.apiKey || !data.apiKey.trim())) {
    return new Response(
      JSON.stringify({
        error: "No AI API key provided. Please configure your own AI key in Settings.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const activeProvider = (data.provider as AIProvider) || "openai";
  const system = buildDocumentRevisionSystemPrompt(
    {
      currentDocument,
      masterResume: data.masterResume,
      jobDescription: data.jobDescription,
      role: data.role,
      company: data.company,
    },
    documentType
  );
  const usageFeature = usageFeatureFor(documentType);

  try {
    const modelMessages = await convertToModelMessages(data.messages);

    return createChatStreamResponseWithFallback({
      provider: activeProvider,
      apiKey: data.apiKey,
      system,
      messages: modelMessages,
      originalMessages: data.messages,
      maxOutputTokens: 4096,
      onUsage: uid
        ? async (inputTokens, outputTokens, modelId) => {
            await trackTokenUsage(uid, activeProvider, inputTokens, outputTokens, {
              feature: usageFeature,
              modelId,
            });
          }
        : undefined,
    });
  } catch (err: unknown) {
    console.error("[cv-revision-chat] error:", err);
    return new Response(JSON.stringify({ error: formatAIError(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
