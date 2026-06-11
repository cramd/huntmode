import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

export type AIProvider = "openai" | "anthropic" | "google";

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
    return google("gemini-2.5-flash");
  }

  const openai = createOpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
  return openai("gpt-4o");
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

export async function generateDocument(params: GenerateParams) {
  const model = getModel(params.provider, params.apiKey);
  const prompt = params.type === "cv"
    ? buildCVPrompt(params)
    : buildCoverLetterPrompt(params);

  return streamText({ model, prompt, maxOutputTokens: 4000 });
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
