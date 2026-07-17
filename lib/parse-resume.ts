import { generateText } from "ai";
import type { ProjectEntry } from "@/lib/types";
import { withModelFallback, type AIProvider } from "@/lib/ai";

export type ParsedResumeSections = {
  summary: string;
  experience: string;
  skills: string;
  education: string;
  certifications: string;
  projects: ProjectEntry[];
};

export type ParseResumeHints = {
  suggestedRoles: string[];
  suggestedIndustry: string;
};

const MAX_PDF_TEXT = 12000;

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfModule = (await import("pdf-parse")) as any;
  const pdfParse = pdfModule.default ?? pdfModule;
  const parsed = await pdfParse(buffer);
  return typeof parsed.text === "string" ? parsed.text : "";
}

function buildStructurePrompt(rawText: string, includeHints: boolean): string {
  const hintsBlock = includeHints
    ? `,
  "hints": {
    "suggestedRoles": ["<2-4 job titles that fit this candidate>"],
    "suggestedIndustry": "<one short industry label e.g. B2B SaaS, fintech, platform engineering>"
  }`
    : "";

  return `You are a resume parser. Extract and structure the following resume text into clearly labelled sections.

RESUME TEXT:
${rawText.slice(0, MAX_PDF_TEXT)}

Return ONLY a valid JSON object with exactly these keys:
{
  "summary": "professional summary or objective (string)",
  "experience": "all work experience entries, preserving company names, titles, dates and bullet points (string)",
  "skills": "all skills, tools, technologies listed (string)",
  "education": "all education entries with institution, degree, and dates (string)",
  "certifications": "any certifications, licenses, or credentials (string, empty string if none)",
  "projects": [
    {
      "name": "project name",
      "url": "project URL or empty string",
      "description": "what the project does and its impact",
      "tech": "comma-separated tech stack or empty string",
      "dates": "date range or empty string"
    }
  ]${hintsBlock}
}

Rules:
- Preserve real content from the resume, do not invent or alter facts
- Keep line breaks within string sections using \\n
- "projects" must be a JSON array of objects (empty array [] if no projects found)
- Each project object must have all five keys: name, url, description, tech, dates
- Do NOT wrap in markdown code fences
- Output ONLY the raw JSON object, nothing else`;
}

function normalizeSections(parsed: Record<string, unknown>): ParsedResumeSections {
  const stringKeys = ["summary", "experience", "skills", "education", "certifications"];
  for (const key of stringKeys) {
    if (typeof parsed[key] !== "string") parsed[key] = "";
  }

  let projects: ProjectEntry[] = [];
  if (Array.isArray(parsed.projects)) {
    projects = (parsed.projects as Record<string, unknown>[])
      .map((p) => ({
        name: typeof p.name === "string" ? p.name : "",
        url: typeof p.url === "string" ? p.url : "",
        description: typeof p.description === "string" ? p.description : "",
        tech: typeof p.tech === "string" ? p.tech : "",
        dates: typeof p.dates === "string" ? p.dates : "",
      }))
      .filter((p) => p.name.trim());
  } else if (typeof parsed.projects === "string" && parsed.projects) {
    projects = [
      {
        name: "Projects",
        description: parsed.projects,
        url: "",
        tech: "",
        dates: "",
      },
    ];
  }

  return {
    summary: parsed.summary as string,
    experience: parsed.experience as string,
    skills: parsed.skills as string,
    education: parsed.education as string,
    certifications: parsed.certifications as string,
    projects,
  };
}

function normalizeHints(parsed: Record<string, unknown>): ParseResumeHints | undefined {
  const hintsRaw = parsed.hints;
  if (!hintsRaw || typeof hintsRaw !== "object") return undefined;
  const hints = hintsRaw as Record<string, unknown>;
  const suggestedRoles = Array.isArray(hints.suggestedRoles)
    ? hints.suggestedRoles.filter((r): r is string => typeof r === "string").slice(0, 4)
    : [];
  const suggestedIndustry =
    typeof hints.suggestedIndustry === "string" ? hints.suggestedIndustry : "";
  return { suggestedRoles, suggestedIndustry };
}

export async function structureResumeFromText(input: {
  rawText: string;
  provider?: AIProvider;
  apiKey?: string;
  includeHints?: boolean;
  onUsage?: (inputTokens: number, outputTokens: number, modelId: string) => Promise<void>;
}): Promise<{ sections: ParsedResumeSections; hints?: ParseResumeHints }> {
  const provider = input.provider ?? "openai";
  const prompt = buildStructurePrompt(input.rawText, input.includeHints ?? false);

  const { result, modelId } = await withModelFallback(provider, input.apiKey, (model) =>
    generateText({ model, prompt, maxOutputTokens: 4500, maxRetries: 1 })
  );
  const { text, usage } = result;

  if (input.onUsage && usage) {
    await input.onUsage(usage.inputTokens || 0, usage.outputTokens || 0, modelId);
  }

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned malformed JSON. Try again or paste your resume manually.");
  }

  return {
    sections: normalizeSections(parsed),
    hints: input.includeHints ? normalizeHints(parsed) : undefined,
  };
}
