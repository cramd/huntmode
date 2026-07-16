"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Bot,
  Check,
  ChevronRight,
  History,
  Loader2,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Square,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  aggregateWeakSpots,
  buildCvTextFromApplication,
  buildQuestionBank,
  extractQuestionFromInterviewerMessage,
  FREE_SESSIONS_PER_MONTH,
  formatTranscript,
  getLatestInterviewerMessage,
  getMessageText,
  getSessionsThisMonth,
  INTERVIEW_CHAT_FOCUS_OPTIONS,
  INTERVIEW_CHAT_MODE_CONFIG,
  MAX_USER_TURNS,
  SESSION_START_TEXT,
} from "@/lib/interview-chat";
import type {
  Application,
  InterviewChatDebrief,
  InterviewChatFocus,
  InterviewChatMessage,
  InterviewChatMode,
  InterviewChatSession,
  InterviewPrepData,
  MasterResume,
  UserProfile,
} from "@/lib/types";

interface InterviewChatProps {
  application: Application;
  masterResume: MasterResume | null;
  userProfile: UserProfile | null;
  user: { getIdToken: () => Promise<string>; email?: string | null } | null;
  onUpdate: (data: Partial<Application>) => Promise<void>;
  hasAIKey: boolean;
}

function toStoredMessages(messages: UIMessage[]): InterviewChatMessage[] {
  return messages
    .map((message) => ({
      id: message.id,
      role: message.role === "user" ? "user" : "assistant",
      content: getMessageText(message),
      createdAt: new Date().toISOString(),
    }))
    .filter((message) => message.content.trim() && message.content.trim() !== SESSION_START_TEXT) as InterviewChatMessage[];
}

function fromStoredMessages(messages: InterviewChatMessage[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [{ type: "text" as const, text: message.content }],
  }));
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-400">
        <span>{label}</span>
        <span className="font-bold text-slate-200">{score}/5</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}

const MODE_ICONS: Record<InterviewChatMode, typeof Phone> = {
  screening: Phone,
  secondary: Users,
  pressure: Zap,
};

export default function InterviewChat({
  application,
  masterResume,
  userProfile,
  user,
  onUpdate,
  hasAIKey,
}: InterviewChatProps) {
  const prep = application.interviewPrep;
  const savedSessions = prep?.chatSessions ?? [];
  const cvText = useMemo(
    () => buildCvTextFromApplication(application.generatedCV, masterResume),
    [application.generatedCV, masterResume]
  );

  const [mode, setMode] = useState<InterviewChatMode>("secondary");
  const [focus, setFocus] = useState<InterviewChatFocus>("general");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isReadOnlySession, setIsReadOnlySession] = useState(false);
  const [input, setInput] = useState("");
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [activeDebrief, setActiveDebrief] = useState<InterviewChatDebrief | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [likelyQuestions, setLikelyQuestions] = useState<string[]>(prep?.likelyQuestions ?? []);
  const [shouldBootstrapSession, setShouldBootstrapSession] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const questionBank = useMemo(() => buildQuestionBank(likelyQuestions), [likelyQuestions]);

  const currentContext = {
    mode,
    focus,
    company: application.company,
    role: application.role,
    jobDescription: application.jobDescription,
    cvText,
    applicationStatus: application.status,
    applicationNotes: application.notes,
    prepNotes: prep?.notes ?? "",
    talkingPointTitles: prep?.sections?.map((section) => section.title) ?? [],
    fitStrengths: application.fitScore?.strengths ?? [],
    fitGaps: application.fitScore?.gaps ?? [],
    questionBank,
    provider: userProfile?.aiProvider || "openai",
    apiKey: userProfile?.aiApiKey || undefined,
  };
  const contextRef = useRef(currentContext);
  contextRef.current = currentContext;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/interview-chat",
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

  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: activeSessionId ?? "interview-chat-idle",
    transport,
  });

  const visibleMessages = messages.filter(
    (message) => getMessageText(message).trim() !== SESSION_START_TEXT
  );
  const userTurnCount = visibleMessages.filter((message) => message.role === "user").length;
  const latestInterviewerMessage = getLatestInterviewerMessage(
    messages.map((message) => ({ role: message.role, parts: message.parts }))
  );
  const currentQuestion = extractQuestionFromInterviewerMessage(latestInterviewerMessage);
  const isStreaming = status === "streaming" || status === "submitted";
  const sessionsThisMonth = getSessionsThisMonth(savedSessions);
  const weakSpots = aggregateWeakSpots(savedSessions);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages, isStreaming]);

  useEffect(() => {
    if (error) toast.error(error.message || "Interview chat failed.");
  }, [error?.message]);

  useEffect(() => {
    if (!shouldBootstrapSession || !activeSessionId) return;
    setShouldBootstrapSession(false);
    setMessages([]);
    void sendMessage({ text: SESSION_START_TEXT });
  }, [shouldBootstrapSession, activeSessionId, sendMessage, setMessages]);

  const persistPrep = useCallback(
    async (updatedFields: Partial<InterviewPrepData>) => {
      const currentPrep = application.interviewPrep || { sections: [] };
      await onUpdate({
        interviewPrep: {
          ...currentPrep,
          ...updatedFields,
        },
      });
    },
    [application.interviewPrep, onUpdate]
  );

  const saveSession = useCallback(
    async (session: InterviewChatSession) => {
      const nextSessions = [
        session,
        ...savedSessions.filter((item) => item.id !== session.id),
      ].slice(0, 20);
      await persistPrep({ chatSessions: nextSessions });
    },
    [persistPrep, savedSessions]
  );

  const handleStartSession = async () => {
    if (!application.jobDescription?.trim()) {
      toast.error("Add a job description to this application before practicing.");
      return;
    }
    if (!cvText.trim()) {
      toast.error("Tailor a CV or save your master resume before practicing.");
      return;
    }
    if (!hasAIKey) {
      toast.error("Configure your AI API key in Settings first.");
      return;
    }
    if (sessionsThisMonth >= FREE_SESSIONS_PER_MONTH && user?.email !== "marcsherwood@gmail.com") {
      toast.error(`Free plan includes ${FREE_SESSIONS_PER_MONTH} practice sessions per month.`);
      return;
    }

    if (likelyQuestions.length === 0) {
      const generatedQuestions = await handleGenerateLikelyQuestions();
      if (!generatedQuestions?.length) return;
    }

    const sessionId = `chat_${Date.now()}`;
    setActiveSessionId(sessionId);
    setIsReadOnlySession(false);
    setActiveDebrief(null);
    setShouldBootstrapSession(true);
  };

  const handleSendAnswer = async () => {
    const trimmed = input.trim();
    if (!trimmed || isReadOnlySession || isStreaming) return;
    if (userTurnCount >= MAX_USER_TURNS) {
      toast.error(`Session limit reached (${MAX_USER_TURNS} answers). End the session for your scorecard.`);
      return;
    }
    setInput("");
    await sendMessage({ text: trimmed });
  };

  const handleEndSession = async () => {
    if (!activeSessionId || isReadOnlySession) return;
    const storedMessages = toStoredMessages(messages);
    if (storedMessages.length < 2) {
      toast.error("Answer at least one question before ending the session.");
      return;
    }

    setIsEndingSession(true);
    try {
      const token = await user?.getIdToken();
      const transcript = formatTranscript(
        messages.map((message) => ({
          role: message.role,
          parts: message.parts,
        }))
      );

      const res = await fetch("/api/interview-debrief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          company: application.company,
          role: application.role,
          mode,
          transcript,
          jobDescription: application.jobDescription,
          provider: userProfile?.aiProvider || "openai",
          apiKey: userProfile?.aiApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate debrief.");

      const session: InterviewChatSession = {
        id: activeSessionId,
        mode,
        focus,
        messages: storedMessages,
        questionsAsked: storedMessages
          .filter((message) => message.role === "assistant")
          .map((message) => extractQuestionFromInterviewerMessage(message.content))
          .filter(Boolean),
        debrief: data as InterviewChatDebrief,
        startedAt: storedMessages[0]?.createdAt ?? new Date().toISOString(),
        endedAt: new Date().toISOString(),
      };

      await saveSession(session);
      setActiveDebrief(data as InterviewChatDebrief);
      setIsReadOnlySession(true);
      toast.success("Scorecard saved to this application.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not generate scorecard.";
      toast.error(message);
    } finally {
      setIsEndingSession(false);
    }
  };

  const handleLoadSession = (session: InterviewChatSession) => {
    setActiveSessionId(session.id);
    setMode(session.mode);
    setFocus(session.focus ?? "general");
    setMessages(fromStoredMessages(session.messages));
    setActiveDebrief(session.debrief ?? null);
    setIsReadOnlySession(true);
  };

  async function handleGenerateLikelyQuestions(): Promise<string[] | null> {
    if (!application.jobDescription?.trim()) {
      toast.error("Add a job description first.");
      return null;
    }
    if (!cvText.trim()) {
      toast.error("Tailor a CV or save your master resume first.");
      return null;
    }
    if (!hasAIKey) {
      toast.error("Configure your AI API key in Settings first.");
      return null;
    }

    setIsGeneratingQuestions(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/interview-likely-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          company: application.company,
          role: application.role,
          jobDescription: application.jobDescription,
          cvText,
          provider: userProfile?.aiProvider || "openai",
          apiKey: userProfile?.aiApiKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate questions.");
      setLikelyQuestions(data.questions);
      await persistPrep({
        likelyQuestions: data.questions,
        likelyQuestionsGeneratedAt: new Date().toISOString(),
      });
      toast.success("Likely questions ready — use them to warm up before chatting.");
      return data.questions as string[];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not generate questions.";
      toast.error(message);
      return null;
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
      <div className="flex flex-col gap-4 min-h-[640px]">
        <Card className="bg-slate-900/60 border-white/5 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-white/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Practice Coach
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Job-context interview rehearsal for {application.role} at {application.company}.
                  Sessions save a scorecard to this application.
                </p>
              </div>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">
                {sessionsThisMonth}/{FREE_SESSIONS_PER_MONTH} sessions this month
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div
              className={cn(
                "rounded-xl border p-4",
                likelyQuestions.length > 0
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-amber-500/30 bg-amber-500/10"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                    <Target className={cn("h-4 w-4", likelyQuestions.length ? "text-emerald-400" : "text-amber-400")} />
                    {likelyQuestions.length
                      ? `${likelyQuestions.length} tailored questions ready`
                      : "First, build your interview question bank"}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    {likelyQuestions.length
                      ? "The coach will use these questions and adapt follow-ups to your answers."
                      : "HuntMode will analyze the job description and your resume before starting the interview."}
                  </p>
                </div>
                <Button
                  variant={likelyQuestions.length ? "outline" : "default"}
                  size="sm"
                  onClick={() => void handleGenerateLikelyQuestions()}
                  disabled={isGeneratingQuestions || Boolean(activeSessionId && !isReadOnlySession)}
                  className={cn(
                    "shrink-0",
                    likelyQuestions.length
                      ? "border-white/10 text-slate-200 hover:bg-slate-800"
                      : "bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold"
                  )}
                >
                  {isGeneratingQuestions ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                  )}
                  {isGeneratingQuestions
                    ? "Analyzing role…"
                    : likelyQuestions.length
                      ? "Regenerate"
                      : "Generate questions"}
                </Button>
              </div>
              {likelyQuestions.length > 0 && (
                <ol className="mt-3 grid gap-2 border-t border-white/5 pt-3">
                  {likelyQuestions.slice(0, 3).map((question, index) => (
                    <li key={index} className="flex gap-2 text-[11px] leading-relaxed text-slate-300">
                      <span className="font-mono text-slate-500">{index + 1}.</span>
                      <span>{question}</span>
                    </li>
                  ))}
                  {likelyQuestions.length > 3 && (
                    <li className="text-[10px] text-slate-500">
                      +{likelyQuestions.length - 3} more questions in the session bank
                    </li>
                  )}
                </ol>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Choose interview mode
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tap a mode to select it, then start the session below.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2" role="radiogroup" aria-label="Interview mode">
                {(Object.keys(INTERVIEW_CHAT_MODE_CONFIG) as InterviewChatMode[]).map((modeKey) => {
                  const config = INTERVIEW_CHAT_MODE_CONFIG[modeKey];
                  const isActive = mode === modeKey;
                  const ModeIcon = MODE_ICONS[modeKey];
                  const sessionLocked = Boolean(activeSessionId) && !isReadOnlySession;
                  return (
                    <button
                      key={modeKey}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      disabled={sessionLocked}
                      onClick={() => setMode(modeKey)}
                      className={cn(
                        "rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                        isActive
                          ? "border-indigo-500/50 bg-indigo-500/15 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]"
                          : "border-white/10 bg-slate-950/40 hover:border-indigo-400/30 hover:bg-slate-900/70"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                              isActive
                                ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-200"
                                : "border-white/10 bg-slate-900 text-slate-400"
                            )}
                          >
                            <ModeIcon className="h-4 w-4" />
                          </span>
                          <div className="text-xs font-bold text-white">{config.label}</div>
                        </div>
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                            isActive
                              ? "border-indigo-400 bg-indigo-500 text-white"
                              : "border-white/20 bg-transparent"
                          )}
                          aria-hidden
                        >
                          {isActive && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                        {config.description}
                      </div>
                      <div
                        className={cn(
                          "mt-2.5 text-[10px] font-bold uppercase tracking-wide",
                          isActive ? "text-indigo-300" : "text-slate-500"
                        )}
                      >
                        {isActive ? "Selected · ready to start" : config.actionHint}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Focus (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                {INTERVIEW_CHAT_FOCUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={Boolean(activeSessionId) && !isReadOnlySession}
                    onClick={() => setFocus(option.value)}
                    aria-pressed={focus === option.value}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide border transition-all cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      focus === option.value
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20 hover:text-slate-200"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {!activeSessionId && (
              <Button
                onClick={handleStartSession}
                disabled={isGeneratingQuestions}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                {isGeneratingQuestions ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {likelyQuestions.length
                  ? `Start ${INTERVIEW_CHAT_MODE_CONFIG[mode].shortLabel} session`
                  : "Generate questions & start"}
              </Button>
            )}
          </CardContent>
        </Card>

        {activeSessionId && (
          <Card className="bg-slate-900/60 border-white/5 backdrop-blur-sm flex-1 flex flex-col min-h-[420px]">
            <CardHeader className="py-3 border-b border-white/5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Bot className="h-4 w-4 text-indigo-400" />
                <span className="font-bold uppercase tracking-wide">
                  {INTERVIEW_CHAT_MODE_CONFIG[mode].label}
                </span>
                <span className="text-slate-500">·</span>
                <span>
                  {userTurnCount}/{MAX_USER_TURNS} answers
                </span>
              </div>
              {!isReadOnlySession && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEndSession}
                  disabled={isEndingSession || isStreaming}
                  className="border-white/10 text-slate-200 hover:bg-slate-800"
                >
                  {isEndingSession ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  End &amp; scorecard
                </Button>
              )}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              {(currentQuestion || isStreaming) && (
                <div className="border-b border-white/5 px-4 py-3 bg-indigo-950/20">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-1">
                    Current question
                  </div>
                  {currentQuestion ? (
                    <p className="text-sm text-slate-100 leading-relaxed">{currentQuestion}</p>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Interviewer is preparing your first question…
                    </div>
                  )}
                </div>
              )}

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-[360px]">
                {visibleMessages.length === 0 && !isStreaming && !currentQuestion && (
                  <p className="text-xs text-slate-500">
                    Waiting for the interviewer to ask the first question…
                  </p>
                )}
                {visibleMessages.map((message) => {
                  const text = getMessageText(message);
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={cn("flex", isUser ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                          isUser
                            ? "bg-indigo-600/90 text-white"
                            : "bg-slate-950/70 border border-white/5 text-slate-200"
                        )}
                      >
                        {text}
                      </div>
                    </div>
                  );
                })}
                {isStreaming && visibleMessages.length > 0 && (
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">Interviewer typing…</div>
                )}
              </div>

              {!isReadOnlySession && (
                <div className="border-t border-white/5 p-4 space-y-2">
                  <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={currentQuestion ? "Type your answer to the question above…" : "Type your answer…"}
                    rows={3}
                    disabled={isStreaming || userTurnCount >= MAX_USER_TURNS}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSendAnswer();
                      }
                    }}
                    className="bg-slate-950/50 border-white/5 text-sm text-slate-100 resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => void handleSendAnswer()}
                      disabled={!input.trim() || isStreaming || userTurnCount >= MAX_USER_TURNS}
                      className="bg-indigo-600 hover:bg-indigo-500"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send answer
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeDebrief && (
          <Card className="bg-slate-900/60 border-emerald-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                Session scorecard
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">{activeDebrief.summary}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ScoreBar label="Clarity" score={activeDebrief.clarity} />
                <ScoreBar label="Structure" score={activeDebrief.structure} />
                <ScoreBar label="Specificity" score={activeDebrief.specificity} />
                <ScoreBar label="Role fit" score={activeDebrief.roleFit} />
              </div>
              {activeDebrief.rewrites.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">
                    Stronger answer rewrites
                  </h4>
                  <ul className="space-y-2">
                    {activeDebrief.rewrites.map((rewrite, index) => (
                      <li key={index} className="text-xs text-slate-300 bg-slate-950/40 rounded-lg p-3 border border-white/5">
                        {rewrite}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {activeDebrief.researchGaps.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">
                    Research before the real interview
                  </h4>
                  <ul className="space-y-1.5">
                    {activeDebrief.researchGaps.map((gap, index) => (
                      <li key={index} className="text-xs text-slate-400 flex gap-2">
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {weakSpots.length > 0 && (
          <Card className="bg-slate-900/60 border-white/5 backdrop-blur-sm">
            <CardHeader className="py-3 border-b border-white/5">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Recurring weak spots
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              {weakSpots.map((spot) => (
                <div
                  key={spot.label}
                  className="flex items-center justify-between text-xs bg-slate-950/30 rounded-lg px-3 py-2 border border-white/5"
                >
                  <span className="text-slate-300">{spot.label}</span>
                  <span className="text-slate-500 font-mono">{spot.count}×</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-900/60 border-white/5 backdrop-blur-sm">
          <CardHeader className="py-3 border-b border-white/5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <History className="h-3.5 w-3.5" />
              Practice history
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {savedSessions.length === 0 ? (
              <p className="text-xs text-slate-500">Completed sessions appear here with scorecards.</p>
            ) : (
              <div className="space-y-2">
                {savedSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => handleLoadSession(session)}
                    className="w-full text-left rounded-lg border border-white/5 bg-slate-950/30 hover:bg-slate-950/50 px-3 py-2 transition-colors"
                  >
                    <div className="text-xs font-bold text-slate-200">
                      {INTERVIEW_CHAT_MODE_CONFIG[session.mode].shortLabel}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(session.startedAt).toLocaleDateString()} · {session.messages.length} messages
                      {session.questionsAsked?.length ? ` · ${session.questionsAsked.length} questions` : ""}
                      {session.debrief ? ` · fit ${session.debrief.roleFit}/5` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
