import type { ApplicationStatus, InterviewChatFocus, InterviewChatMode, MasterResume } from "@/lib/types"

export function buildCvTextFromApplication(
  generatedCV: string,
  masterResume: { sections: MasterResume["sections"] } | null
): string {
  if (generatedCV.trim()) return generatedCV
  if (!masterResume) return ""
  const sections = masterResume.sections || {}
  return [
    sections.summary && `## Summary\n${sections.summary}`,
    sections.experience && `## Experience\n${sections.experience}`,
    sections.skills && `## Skills\n${sections.skills}`,
    sections.education && `## Education\n${sections.education}`,
    sections.certifications && `## Certifications\n${sections.certifications}`,
    Array.isArray(sections.projects) && sections.projects.length > 0
      ? `## Projects\n${sections.projects
          .map(
            (project) =>
              `**${project.name}**${project.url ? ` | ${project.url}` : ""}${project.dates ? ` | ${project.dates}` : ""}\n${project.description}${project.tech ? `\nTech: ${project.tech}` : ""}`
          )
          .join("\n\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")
}

export const MAX_USER_TURNS = 8
export const FREE_SESSIONS_PER_MONTH = 5
export const SESSION_START_TEXT = "[session-start]"

export const INTERVIEW_CHAT_MODE_CONFIG: Record<
  InterviewChatMode,
  {
    label: string
    shortLabel: string
    description: string
    persona: string
    actionHint: string
  }
> = {
  screening: {
    label: "Screening",
    shortLabel: "Screening",
    description: "Friendly recruiter — basics, fit, and tell me about yourself.",
    persona: "a warm but efficient recruiter running a 20-minute phone screen",
    actionHint: "Select for a light phone-screen rehearsal",
  },
  secondary: {
    label: "Secondary interview",
    shortLabel: "Secondary",
    description: "Hiring manager depth — STAR stories, role competency, company awareness.",
    persona: "a senior hiring manager conducting a 45-minute competency interview",
    actionHint: "Select for a deeper hiring-manager round",
  },
  pressure: {
    label: "Pressure prep",
    shortLabel: "Pressure",
    description: "Skeptical interviewer — pushback, curveballs, and uncomfortable follow-ups.",
    persona: "a skeptical executive interviewer who probes weak spots and challenges vague answers",
    actionHint: "Select for tough pushback practice",
  },
}

export const INTERVIEW_CHAT_FOCUS_OPTIONS: { value: InterviewChatFocus; label: string }[] = [
  { value: "behavioral", label: "Behavioral" },
  { value: "role_depth", label: "Role depth" },
  { value: "culture", label: "Culture fit" },
  { value: "general", label: "General mix" },
]

export interface InterviewChatContextParams {
  company: string
  role: string
  jobDescription: string
  cvText: string
  applicationStatus: ApplicationStatus
  applicationNotes: string
  prepNotes?: string
  talkingPointTitles?: string[]
  fitStrengths?: string[]
  fitGaps?: string[]
  questionBank?: string[]
  mode: InterviewChatMode
  focus?: InterviewChatFocus
}

export function buildInterviewChatSystemPrompt(params: InterviewChatContextParams): string {
  const modeConfig = INTERVIEW_CHAT_MODE_CONFIG[params.mode]
  const talkingPoints = params.talkingPointTitles?.length
    ? params.talkingPointTitles.map((title) => `- ${title}`).join("\n")
    : "None generated yet."
  const strengths = params.fitStrengths?.length
    ? params.fitStrengths.map((item) => `- ${item}`).join("\n")
    : "Not analyzed."
  const gaps = params.fitGaps?.length
    ? params.fitGaps.map((item) => `- ${item}`).join("\n")
    : "Not analyzed."
  const questionBank = params.questionBank?.length
    ? params.questionBank.map((question, index) => `${index + 1}. ${question}`).join("\n")
    : "None provided — derive questions from the job description."
  const focusLine = params.focus
    ? `Optional focus for this session: ${params.focus.replace("_", " ")}.`
    : "Cover a balanced mix of role fit, experience, and motivation."

  return `You are ${modeConfig.persona} for ${params.company}, interviewing for the ${params.role} role.

You are a PRACTICE interview coach inside HuntMode. Stay in character as the interviewer, but keep responses concise and useful for rehearsal.

RULES:
- Ask ONE clear interview question at a time. Every reply MUST include a direct question the candidate can answer — never send only feedback or a greeting without a question.
- Wait for the candidate's answer before asking the next question.
- Prefer questions from the QUESTION BANK when relevant; adapt wording to feel natural in conversation.
- Ground questions in the job description and candidate background below. Do NOT invent company facts not supported by the JD.
- If you speculate about the company, label it clearly (e.g. "Based on the JD, it sounds like…").
- Use follow-up probes when answers are vague (${params.mode === "pressure" ? "be direct and challenging" : "be constructive"}).
- Keep each reply under 120 words unless giving brief feedback after an answer.
- After 2–3 answers, you may give a one-sentence coaching nudge, then continue interviewing.
- Do not write scorecards or long debriefs in chat — the app handles that when the session ends.
- Never claim to be the real employer or make hiring decisions.

APPLICATION STAGE: ${params.applicationStatus}
${focusLine}

JOB DESCRIPTION:
${params.jobDescription.slice(0, 6000)}

CANDIDATE CV / RESUME (tailored or master):
${params.cvText.slice(0, 4000)}

APPLICATION NOTES:
${params.applicationNotes?.trim() || "None"}

INTERVIEW PREP NOTES:
${params.prepNotes?.trim() || "None"}

PREP TALKING POINT THEMES:
${talkingPoints}

FIT ANALYSIS — STRENGTHS:
${strengths}

FIT ANALYSIS — GAPS TO PROBE:
${gaps}

QUESTION BANK (draw from these; rephrase naturally):
${questionBank}

Open with a brief in-character greeting, then ask your first interview question on a new line prefixed with "Question:".`
}

export function buildQuestionBank(
  likelyQuestions: string[] = [],
  prepQuestions: string[] = []
): string[] {
  const seen = new Set<string>()
  const merged: string[] = []
  for (const question of [...likelyQuestions, ...prepQuestions]) {
    const normalized = question.trim()
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(normalized)
  }
  return merged
}

export function getLatestInterviewerMessage(
  messages: { role: string; content?: string; parts?: { type: string; text?: string }[] }[]
): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role !== "assistant") continue
    const text = getMessageText(message).trim()
    if (text) return text
  }
  return ""
}

export function extractQuestionFromInterviewerMessage(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ""
  const labeled = trimmed.match(/(?:^|\n)\s*(?:\*\*)?Question:?(?:\*\*)?\s*(.+)$/im)
  if (labeled?.[1]) return labeled[1].trim()
  const sentences = trimmed.split(/(?<=[.?!])\s+/)
  const last = sentences[sentences.length - 1]?.trim()
  if (last?.endsWith("?")) return last
  const questionSentence = [...sentences].reverse().find((sentence) => sentence.trim().endsWith("?"))
  return questionSentence?.trim() || trimmed
}

export function buildInterviewDebriefPrompt(params: {
  company: string
  role: string
  mode: InterviewChatMode
  transcript: string
  jobDescription: string
}): string {
  const modeConfig = INTERVIEW_CHAT_MODE_CONFIG[params.mode]

  return `You are an expert interview coach. Review this ${modeConfig.label.toLowerCase()} practice session for ${params.role} at ${params.company}.

JOB DESCRIPTION (for context):
${params.jobDescription.slice(0, 4000)}

TRANSCRIPT:
${params.transcript.slice(0, 12000)}

Return a structured debrief. Score clarity, structure, specificity, and role_fit each from 1–5 (integer).
Identify 2–3 weak spots (short labels) for future practice.
Provide 2–3 stronger answer rewrites as brief bullet rewrites the candidate could memorize.
List 2–4 research gaps — things they should look up before the real interview.
Write a 2–3 sentence summary.

Be direct and specific. Base feedback only on what appears in the transcript and JD.`
}

export function buildLikelyQuestionsPrompt(params: {
  company: string
  role: string
  jobDescription: string
  cvText: string
}): string {
  return `You are an interview prep assistant. Based on the job description and candidate background, generate 8–12 likely interview questions for ${params.role} at ${params.company}.

Prioritize questions that connect JD requirements to the candidate's actual experience.
Mix behavioral, role-specific, and company-context questions.
Do not invent company facts not supported by the JD.

JOB DESCRIPTION:
${params.jobDescription.slice(0, 6000)}

CANDIDATE CV:
${params.cvText.slice(0, 3000)}

Return only the questions as a JSON array of strings.`
}

export function countUserTurns(messages: { role: string; content?: string; parts?: { type: string; text?: string }[] }[]): number {
  return messages.filter((message) => {
    if (message.role !== "user") return false
    const text = getMessageText(message)
    return text.trim().length > 0 && text.trim() !== SESSION_START_TEXT
  }).length
}

export function getMessageText(message: {
  content?: string
  parts?: { type: string; text?: string }[]
}): string {
  if (message.content?.trim()) return message.content
  if (!message.parts?.length) return ""
  return message.parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text as string)
    .join("\n")
}

export function formatTranscript(
  messages: { role: string; content?: string; parts?: { type: string; text?: string }[] }[]
): string {
  return messages
    .filter((message) => {
      const text = getMessageText(message)
      return text.trim().length > 0 && text.trim() !== SESSION_START_TEXT
    })
    .map((message) => {
      const speaker = message.role === "user" ? "Candidate" : "Interviewer"
      return `${speaker}: ${getMessageText(message)}`
    })
    .join("\n\n")
}

export function getSessionsThisMonth<T extends { startedAt: string; endedAt?: string }>(sessions: T[]): number {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return sessions.filter(
    (session) => session.endedAt && new Date(session.startedAt) >= monthStart
  ).length
}

export function aggregateWeakSpots(
  sessions: { debrief?: { weakSpots?: string[] } | null }[]
): { label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const session of sessions) {
    for (const spot of session.debrief?.weakSpots ?? []) {
      const normalized = spot.trim()
      if (!normalized) continue
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}
