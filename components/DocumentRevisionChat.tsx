"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Check, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getMessageText,
  getRevisionSuggestedPrompts,
  type DocumentRevisionKind,
} from "@/lib/document-revision-chat";
import { AI_LEXICON } from "@/lib/ai-lexicon";
import type { UserProfile } from "@/lib/types";

const CHAT_CONFIG: Record<
  DocumentRevisionKind,
  {
    title: string;
    description: string;
    emptyHint: string;
    placeholder: string;
    applyLabel: string;
    applySuccess: string;
    missingDocumentError: string;
    streamingLabel: string;
  }
> = {
  cv: {
    title: AI_LEXICON.cvRevisionChat.label,
    description: "Request tone, focus, or length changes. Facts stay tied to your master resume.",
    emptyHint: "Try a chip below or describe how you want this CV reframed.",
    placeholder: "e.g. Emphasize enterprise SaaS experience and tighten the summary",
    applyLabel: "Apply to CV",
    applySuccess: "Revision applied to your CV",
    missingDocumentError: "Generate or write a CV before requesting revisions.",
    streamingLabel: "Revising…",
  },
  cover_letter: {
    title: AI_LEXICON.clRevisionChat.label,
    description: "Adjust tone, opening hook, or length. Career facts stay tied to your master resume.",
    emptyHint: "Try a chip below or describe how you want this letter reframed.",
    placeholder: "e.g. Open with why this company specifically, keep it under 300 words",
    applyLabel: "Apply to cover letter",
    applySuccess: "Revision applied to your cover letter",
    missingDocumentError: "Generate or write a cover letter before requesting revisions.",
    streamingLabel: "Drafting…",
  },
};

interface DocumentRevisionChatProps {
  kind: DocumentRevisionKind;
  currentDocument: string;
  masterResumeText: string;
  jobDescription: string;
  role: string;
  company: string;
  userProfile: UserProfile | null;
  user: { getIdToken: () => Promise<string>; email?: string | null } | null;
  hasAIKey: boolean;
  onApplyRevision: (revisedMarkdown: string) => Promise<void>;
}

export default function DocumentRevisionChat({
  kind,
  currentDocument,
  masterResumeText,
  jobDescription,
  role,
  company,
  userProfile,
  user,
  hasAIKey,
  onApplyRevision,
}: DocumentRevisionChatProps) {
  const config = CHAT_CONFIG[kind];
  const [input, setInput] = useState("");
  const [applying, setApplying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestedPrompts = getRevisionSuggestedPrompts(kind);

  const currentContext = {
    documentType: kind,
    currentDocument,
    masterResume: masterResumeText,
    jobDescription,
    role,
    company,
    provider: userProfile?.aiProvider || "openai",
    apiKey: userProfile?.aiApiKey || undefined,
  };
  const contextRef = useRef(currentContext);
  contextRef.current = currentContext;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/cv-revision-chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const token = await user?.getIdToken();
          return {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: {
              ...body,
              messages,
              ...contextRef.current,
            },
          };
        },
      }),
    [user]
  );

  const { messages, sendMessage, status, error } = useChat({
    id: `${kind}-revision-${company}-${role}`,
    transport,
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const visibleMessages = messages.filter((message) => getMessageText(message).trim());
  const latestAssistant = [...visibleMessages]
    .reverse()
    .find((message) => message.role === "assistant");
  const latestAssistantText = latestAssistant ? getMessageText(latestAssistant) : "";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages, isStreaming]);

  useEffect(() => {
    if (error) toast.error(error.message || "Revision chat failed.");
  }, [error?.message]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    if (!hasAIKey && user?.email !== "marcsherwood@gmail.com") {
      toast.error("Configure your AI API key in Settings first.");
      return;
    }
    if (!currentDocument.trim()) {
      toast.error(config.missingDocumentError);
      return;
    }
    setInput("");
    await sendMessage({ text: trimmed });
  };

  const handleApply = async () => {
    if (!latestAssistantText.trim()) return;
    setApplying(true);
    try {
      await onApplyRevision(latestAssistantText);
      toast.success(config.applySuccess);
    } catch {
      toast.error("Failed to apply revision");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="flex min-h-[320px] flex-col border-white/5 bg-slate-900/40 shadow-xl sm:min-h-[500px]">
      <CardHeader className="border-b border-white/5 pb-3">
        <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          {config.title}
        </CardTitle>
        <p className="text-[10px] leading-relaxed text-slate-500">{config.description}</p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div
          ref={scrollRef}
          className="max-h-[220px] flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:max-h-[320px]"
        >
          {visibleMessages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/30 px-3 py-4 text-center">
              <Bot className="mx-auto mb-2 h-6 w-6 text-indigo-400/70" />
              <p className="text-xs leading-relaxed text-slate-400">{config.emptyHint}</p>
            </div>
          ) : (
            visibleMessages.map((message) => {
              const text = getMessageText(message);
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap",
                      isUser
                        ? "bg-indigo-600/90 text-white"
                        : "border border-white/5 bg-slate-950/70 text-slate-200"
                    )}
                  >
                    {text}
                  </div>
                </div>
              );
            })
          )}
          {isStreaming ? (
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              {config.streamingLabel}
            </div>
          ) : null}
        </div>

        {latestAssistantText.trim().length > 80 ? (
          <div className="border-t border-white/5 px-4 py-2">
            <Button
              size="sm"
              onClick={() => void handleApply()}
              disabled={applying || isStreaming}
              className="w-full bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500"
            >
              {applying ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              )}
              {config.applyLabel}
            </Button>
          </div>
        ) : null}

        <div className="space-y-2 border-t border-white/5 p-4">
          <div className="flex flex-wrap gap-1.5">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isStreaming}
                onClick={() => void handleSend(prompt)}
                className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/20 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={config.placeholder}
            rows={2}
            disabled={isStreaming}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend(input);
              }
            }}
            className="resize-none border-white/5 bg-slate-950/50 text-xs text-slate-100"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => void handleSend(input)}
              disabled={!input.trim() || isStreaming}
              className="bg-indigo-600 text-xs font-bold hover:bg-indigo-500"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
