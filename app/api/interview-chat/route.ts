import { NextRequest } from "next/server";
import { convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import {
  buildInterviewChatSystemPrompt,
  countUserTurns,
  MAX_USER_TURNS,
} from "@/lib/interview-chat";
import { createChatStreamResponseWithFallback, formatAIError } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";
import { adminAuth } from "@/lib/firebase-admin";
import { trackTokenUsage } from "@/lib/cost-tracker";
import type { ApplicationStatus, InterviewChatFocus, InterviewChatMode } from "@/lib/types";

const requestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  mode: z.enum(["screening", "secondary", "pressure"]),
  focus: z.enum(["behavioral", "role_depth", "culture", "general"]).optional(),
  company: z.string(),
  role: z.string(),
  jobDescription: z.string().min(1),
  cvText: z.string().min(1),
  applicationStatus: z.string(),
  applicationNotes: z.string().optional(),
  prepNotes: z.string().optional(),
  talkingPointTitles: z.array(z.string()).optional(),
  fitStrengths: z.array(z.string()).optional(),
  fitGaps: z.array(z.string()).optional(),
  questionBank: z.array(z.string()).optional(),
  provider: z.string().optional(),
  apiKey: z.string().optional(),
});

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
      console.error("[interview-chat] Auth verification failed:", err);
    }
  }

  const isMarc = userEmail === "marcsherwood@gmail.com";
  if (!isMarc && (!data.apiKey || !data.apiKey.trim())) {
    return new Response(
      JSON.stringify({ error: "No AI API key provided. Please configure your own AI key in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const userTurns = countUserTurns(
    data.messages.map((message) => ({
      role: message.role,
      parts: message.parts,
    }))
  );
  if (userTurns > MAX_USER_TURNS) {
    return new Response(
      JSON.stringify({
        error: `Session limit reached (${MAX_USER_TURNS} answers). End the session to get your scorecard.`,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const activeProvider = (data.provider as AIProvider) || "openai";
  const system = buildInterviewChatSystemPrompt({
    company: data.company,
    role: data.role,
    jobDescription: data.jobDescription,
    cvText: data.cvText,
    applicationStatus: data.applicationStatus as ApplicationStatus,
    applicationNotes: data.applicationNotes || "",
    prepNotes: data.prepNotes,
    talkingPointTitles: data.talkingPointTitles,
    fitStrengths: data.fitStrengths,
    fitGaps: data.fitGaps,
    questionBank: data.questionBank,
    mode: data.mode as InterviewChatMode,
    focus: data.focus as InterviewChatFocus | undefined,
  });

  try {
    let modelMessages = await convertToModelMessages(data.messages)
    if (modelMessages.length === 0) {
      modelMessages = [
        {
          role: "user" as const,
          content:
            "Begin the practice interview now with a brief in-character greeting and your first question.",
        },
      ]
    }

    return createChatStreamResponseWithFallback({
      provider: activeProvider,
      apiKey: data.apiKey,
      system,
      messages: modelMessages,
      originalMessages: data.messages,
      maxOutputTokens: 600,
      onUsage: uid
        ? async (inputTokens, outputTokens) => {
            await trackTokenUsage(uid, activeProvider, inputTokens, outputTokens);
          }
        : undefined,
    });
  } catch (err: unknown) {
    console.error("[interview-chat] error:", err);
    return new Response(JSON.stringify({ error: formatAIError(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
