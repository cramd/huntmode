import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, type LanguageModel } from "ai";

export type AIProvider = "openai" | "anthropic" | "google";

const GOOGLE_MODEL_IDS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
] as const;

export interface GenerateParams {
  jobDescription: string;
  masterResume: string;
  role: string;
  company: string;
  type: "cv" | "cover_letter";
  provider?: AIProvider;
  apiKey?: string;
}

export function getModel(provider: AIProvider = "openai", apiKey?: string) {
  if (provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
    return anthropic("claude-3-5-sonnet-20241022");
  }

  if (provider === "google") {
    const google = createGoogleGenerativeAI({ apiKey: apiKey || process.env.GOOGLE_AI_API_KEY });
    return google(GOOGLE_MODEL_IDS[0]);
  }

  const openai = createOpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
  return openai("gpt-4o");
}

export function isTransientModelError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("high demand") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("quota exceeded") ||
    msg.includes("exceeded your current quota") ||
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("failed after")
  );
}

export function isGoogleModelFallbackError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    isTransientModelError(err) ||
    msg.includes("not found") ||
    msg.includes("is not supported") ||
    msg.includes("shut down")
  );
}

export function formatAIError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/quota exceeded|exceeded your current quota/i.test(raw)) {
    return "Gemini free-tier quota reached. Wait about a minute and try again, or switch to OpenAI/Anthropic in Settings.";
  }
  if (isTransientModelError(err)) {
    return "Gemini is temporarily overloaded. Wait a minute and try again, or switch to OpenAI/Anthropic in Settings.";
  }
  return raw;
}

export async function withModelFallback<T>(
  provider: AIProvider,
  apiKey: string | undefined,
  run: (model: LanguageModel) => T | Promise<T>
): Promise<T> {
  if (provider !== "google") {
    return run(getModel(provider, apiKey));
  }

  const google = createGoogleGenerativeAI({ apiKey: apiKey || process.env.GOOGLE_AI_API_KEY });
  let lastError: unknown;

  for (const modelId of GOOGLE_MODEL_IDS) {
    try {
      return await run(google(modelId));
    } catch (err) {
      lastError = err;
      if (!isGoogleModelFallbackError(err)) throw err;
      console.warn(
        `[ai] ${modelId} unavailable (${err instanceof Error ? err.message : err}), trying next model...`
      );
    }
  }

  throw lastError;
}

export function buildCVPrompt(params: GenerateParams): string {
  return `You are an expert resume writer. Your task is to tailor the following master resume to best fit the job description below.

JOB TITLE: ${params.role}
COMPANY: ${params.company}

JOB DESCRIPTION:
${params.jobDescription}

MASTER RESUME:
${params.masterResume}

Instructions:
- Rewrite and reorder sections to highlight the most relevant experience for THIS specific role
- Mirror key phrases and requirements from the job description where truthful
- Lead with a punchy 2-3 sentence summary tailored to this role and company
- Quantify achievements where possible (use the original data, don't fabricate)
- Keep a clean, ATS-friendly format using markdown
- Be concise: target 1-2 pages when printed
- Do NOT fabricate any experience, certifications, or skills not present in the master resume

Output the tailored resume in clean markdown format.`;
}

export function buildCoverLetterPrompt(params: GenerateParams): string {
  return `You are an expert cover letter writer. Write a compelling, personalized cover letter for the job below based on the provided resume.

JOB TITLE: ${params.role}
COMPANY: ${params.company}

JOB DESCRIPTION:
${params.jobDescription}

CANDIDATE RESUME:
${params.masterResume}

Instructions:
- Open with a strong hook that shows genuine interest in ${params.company} specifically
- Connect 2-3 specific skills/experiences from the resume to the job requirements
- Show personality — this should sound human, not like a template
- Keep it to 3-4 paragraphs, under 400 words
- End with a confident call to action
- Do NOT use clichés like "I am writing to express my interest..."

Output the cover letter in clean markdown format. Use placeholders like [Your Name], [Date], [Your Email] for personal details.`;
}

export function buildFitScorePrompt(params: {
  jobDescription: string;
  masterResume: string;
  role: string;
  company: string;
}): string {
  return `You are an expert recruiter and career coach. Analyze how well the candidate's resume matches the job description below and return a structured fit assessment.

JOB TITLE: ${params.role}
COMPANY: ${params.company}

JOB DESCRIPTION:
${params.jobDescription.slice(0, 6000)}

CANDIDATE RESUME:
${params.masterResume.slice(0, 4000)}

Return ONLY a valid JSON object — no markdown fences, no preamble — with this exact shape:
{
  "overall": <integer 0-100>,
  "breakdown": {
    "skills": <integer 0-100>,
    "experience": <integer 0-100>,
    "keywords": <integer 0-100>,
    "culture": <integer 0-100>
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>", "<gap 3>"],
  "suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>", "<actionable suggestion 3>"],
  "similarRoles": [
    {
      "company": "<company name>",
      "role": "<job title>",
      "reason": "<1 sentence why this is a good match>",
      "searchQuery": "<Google-ready search string e.g. Senior PMM site:greenhouse.io>"
    }
  ]
}

Scoring guidelines:
- "overall" is the weighted average: skills 35%, experience 35%, keywords 20%, culture 10%
- "skills": technical skills overlap between resume and JD requirements
- "experience": seniority level and domain experience match
- "keywords": presence of key phrases, tools, methodologies from the JD
- "culture": org type, stage, team size, and work style alignment
- "strengths": 2-3 specific things from the resume that directly address JD requirements
- "gaps": 2-3 concrete things mentioned in the JD that are absent or weak in the resume
- "suggestions": 2-3 specific, actionable resume tweaks ("Add X to your skills section", "Quantify the Y achievement")
- "similarRoles": 4-6 real companies and job titles of similar seniority, function, and org stage where this candidate would be a strong fit. Each searchQuery should be a Google-ready search like '"Senior PMM" site:greenhouse.io' or '"Head of Growth" fintech startup'

Be honest — a score of 60 is not bad, it is useful information. Do not inflate scores.`;
}

export async function generateDocument(params: GenerateParams) {
  const prompt = params.type === "cv"
    ? buildCVPrompt(params)
    : buildCoverLetterPrompt(params);

  return withModelFallback(params.provider || "openai", params.apiKey, (model) =>
    streamText({ model, prompt, maxOutputTokens: 4000, maxRetries: 1 })
  );
}

export async function streamTextWithFallback(params: {
  provider?: AIProvider;
  apiKey?: string;
  prompt: string;
  maxOutputTokens?: number;
}): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const provider = params.provider || "openai";
  const models =
    provider === "google"
      ? GOOGLE_MODEL_IDS.map((modelId) => {
          const google = createGoogleGenerativeAI({
            apiKey: params.apiKey || process.env.GOOGLE_AI_API_KEY,
          });
          return google(modelId);
        })
      : [getModel(provider, params.apiKey)];

  let lastError: unknown;
  for (const model of models) {
    try {
      const result = streamText({
        model,
        prompt: params.prompt,
        maxOutputTokens: params.maxOutputTokens ?? 4000,
        maxRetries: 1,
      });
      const chunks: string[] = [];
      for await (const chunk of result.textStream) {
        chunks.push(chunk);
      }
      const text = chunks.join("");
      if (!text.trim()) throw new Error("AI returned empty response");
      const usage = await result.usage;
      return {
        text,
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
      };
    } catch (err) {
      lastError = err;
      if (provider !== "google" || !isGoogleModelFallbackError(err)) throw err;
      console.warn(
        `[ai] stream failed (${err instanceof Error ? err.message : err}), trying next model...`
      );
    }
  }

  throw lastError;
}

export function buildSuggestPrompt(params: {
  content: string;
  type: "cv" | "cover_letter";
  jobDescription: string;
  role: string;
  company: string;
}): string {
  const docType = params.type === "cv" ? "resume/CV" : "cover letter";
  return `You are an expert career coach and ${docType} reviewer. Review the following ${docType} and provide specific, actionable suggestions to improve it for the target role.

JOB TITLE: ${params.role}
COMPANY: ${params.company}

JOB DESCRIPTION:
${params.jobDescription}

CURRENT ${docType.toUpperCase()}:
${params.content}

Instructions:
- Start with a brief overall assessment (2-3 sentences)
- List 5-8 specific, actionable improvements as numbered items
- For each suggestion, explain WHY it matters for this specific role
- Highlight any missing keywords or skills from the job description that could be added (if truthful)
- Note any weak phrasing that could be strengthened
- Do NOT rewrite the whole document — just give suggestions
- Be direct and constructive, not generic

Format as clean markdown with headers.`;
}

export function buildIncorporateFitPrompt(params: {
  currentCV: string;
  items: string[];
  cardType: "strengths" | "gaps" | "suggestions";
  jobDescription: string;
  masterResume: string;
  role: string;
  company: string;
}): string {
  const itemsList = params.items.map((item, i) => `${i + 1}. ${item}`).join("\n");
  const cardLabel =
    params.cardType === "strengths"
      ? "Strengths"
      : params.cardType === "gaps"
        ? "Gaps"
        : "Suggestions";

  const cardInstructions =
    params.cardType === "strengths"
      ? `Incorporate these STRENGTHS by emphasizing them more prominently in the CV — in the summary, experience bullets, and skills where relevant. Do NOT invent new experience or skills. Only highlight what is already supported by the master resume.`
      : params.cardType === "gaps"
        ? `Address these GAPS by surfacing any related experience, skills, or achievements from the MASTER RESUME that partially or fully cover them. Rephrase and reposition existing content to better match the job requirements. Do NOT fabricate skills, roles, certifications, or metrics that are not in the master resume. If a gap cannot be truthfully addressed, leave it unmentioned rather than inventing content.`
        : `Apply these SUGGESTIONS as specific edits to the CV. Implement each actionable tweak that can be done truthfully using content from the master resume. Do NOT add fabricated experience or skills.`;

  return `You are an expert resume writer. Revise the candidate's tailored CV below to incorporate fit-analysis insights for a specific job application.

JOB TITLE: ${params.role}
COMPANY: ${params.company}

JOB DESCRIPTION:
${params.jobDescription.slice(0, 6000)}

MASTER RESUME (source of truth — do not invent beyond this):
${params.masterResume.slice(0, 4000)}

CURRENT TAILORED CV:
${params.currentCV}

${cardLabel.toUpperCase()} TO INCORPORATE:
${itemsList}

Instructions:
- ${cardInstructions}
- Preserve the overall structure and markdown format of the current CV
- Keep all truthful content from the current CV unless improving phrasing
- Mirror relevant keywords from the job description where supported by real experience
- Output the COMPLETE revised CV in clean markdown — not a diff, not commentary, not a preamble
- Do NOT wrap the output in code fences`;
}

export function buildInterviewPrepPrompt(params: {
  jobDescription: string;
  cvText: string;
  role: string;
  company: string;
}): string {
  return `You are an expert interview coach and senior hiring consultant. Your task is to generate 5-7 customized interview preparation talking-point cards (sections) for a candidate preparing to interview for the following role:

COMPANY: ${params.company}
ROLE: ${params.role}

JOB DESCRIPTION:
${params.jobDescription}

CANDIDATE CV / RESUME CONTENT:
${params.cvText}

Instructions:
1. Create 5 to 7 logical talking-point cards that represent the most important topics or competency areas the candidate should address in the interview.
2. Each card MUST have the following fields:
   - "title": A short, punchy title (2-4 words, e.g., "Elevator Pitch", "Agentic AI Launch", "AR Strategy").
   - "icon": A single relevant emoji (e.g., "🎙️", "🤖", "📈").
   - "keywords": An array of 3-4 key phrases or skills associated with this topic (e.g., ["GTM Velocity", "0->1 Launch", "Docker Hub"]).
   - "script": A highly scannable bullet-point script (3-4 concise bullets) written in the first person ("I ...") that the candidate can quickly glance at during the call. Use markdown bullets (- or *) and separate them with newlines.
     - IMPORTANT: In the script, you MUST wrap critical words, numbers, or key phrases that you want highlighted in asterisks, e.g., *10+ years experience* or *Docker*. These highlighted phrases must include the candidate's real metrics and achievements from their CV that directly answer requirements in the Job Description.
     - IMPORTANT: Keep the tone highly professional, confident, and conversational. Do NOT write long paragraphs; keep it punchy, short, and strictly bulleted.
3. The cards should cover:
   - An Elevator Pitch / Introduction card tailored to the company's current context/mission and the candidate's core background.
   - 3 to 4 competency/experience cards mapping the candidate's specific past achievements (using real metrics/roles from their CV) to the core technical or business requirements in the Job Description.
   - A Logistics card detailing salary range if mentioned in the JD, location/hybrid details.
   - Do NOT include a closing question in the logistics card script. The closing questions will be in a separate array.

Return ONLY a valid JSON object with two properties: "sections" (an array of the talking-point cards) and "questions" (an array of 3-5 high-impact, strategic questions the candidate should ask the interviewer at the end). Do not write any preambles, intros, or postscripts. The response must be directly parseable as JSON.

CRITICAL: You MUST properly escape any double quotes inside your string values with a backslash (e.g. \\"example\\"). Do not use unescaped double quotes inside strings.

JSON format:
{
  "sections": [
    {
      "title": "...",
      "icon": "...",
      "keywords": ["...", "..."],
      "script": "..."
    }
  ],
  "questions": [
    "What is the most critical milestone for this role in the first 90 days?",
    "How is the team structured to achieve...?"
  ]
}`;
}

