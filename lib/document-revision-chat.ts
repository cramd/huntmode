export type DocumentRevisionKind = "cv" | "cover_letter";

export interface DocumentRevisionPromptContext {
  currentDocument: string;
  masterResume: string;
  jobDescription: string;
  role: string;
  company: string;
}

export const CV_REVISION_SUGGESTED_PROMPTS = [
  "Make this more B2B focused",
  "Use a more authoritative tone",
  "Tighten to one page",
] as const;

export const COVER_LETTER_REVISION_SUGGESTED_PROMPTS = [
  "Open with a stronger company hook",
  "Use a warmer, more conversational tone",
  "Shorten to three paragraphs",
] as const;

const DOCUMENT_LABELS: Record<DocumentRevisionKind, string> = {
  cv: "CV",
  cover_letter: "cover letter",
};

export function getRevisionSuggestedPrompts(kind: DocumentRevisionKind): readonly string[] {
  return kind === "cv" ? CV_REVISION_SUGGESTED_PROMPTS : COVER_LETTER_REVISION_SUGGESTED_PROMPTS;
}

export function buildDocumentRevisionSystemPrompt(
  ctx: DocumentRevisionPromptContext,
  kind: DocumentRevisionKind
): string {
  const label = DOCUMENT_LABELS[kind];
  const documentField =
    kind === "cv" ? "Current tailored CV" : "Current cover letter";

  const rewriteShape =
    kind === "cv"
      ? "- Start directly with the candidate name or the first section heading.\n- Use standard markdown: ## for section headings, **bold** for job titles or emphasis, bullet lists with \"- \"."
      : "- Start directly with the salutation or first paragraph (no separate title block required).\n- Use plain paragraphs separated by blank lines; optional **bold** for emphasis.";

  const masterResumeBlock = `## Master resume (source of truth for career facts${
    kind === "cv" ? "" : " — do not invent employers or dates"
  })
${ctx.masterResume}`;

  return `You are a professional job-application editor helping a job seeker refine their tailored ${label} for a specific application.

## Your role
- Discuss revisions conversationally when the user asks questions or wants advice.
- When the user requests a concrete rewrite, output ONLY the full revised ${label} body in clean markdown.
- Apply stylistic, strategic, and emphasis changes the user asks for (tone, audience, length, keyword focus, opening hook).
- Preserve factual accuracy: do not invent employers, job titles, dates, degrees, certifications, or metrics.
- If the user asks for a fact you cannot verify from the current ${label} or master resume below, say you cannot add it and suggest they supply the detail.

## Strict output rules for full rewrites
- Do not include intro sentences, explanations, or code fences (no \`\`\`markdown).
- Keep real employers, dates, and achievements from the source material unless the user explicitly asks to remove something.
${rewriteShape}

## Application context
- Company: ${ctx.company}
- Role: ${ctx.role}

## Job description
${ctx.jobDescription}

${masterResumeBlock}

## ${documentField} (starting point for edits)
${ctx.currentDocument}

When unsure whether to chat or rewrite: if the user gives a clear edit instruction (tone, focus, length, emphasis), return the full revised markdown. Otherwise answer briefly and offer to apply changes.`;
}

/** @deprecated Use buildDocumentRevisionSystemPrompt with kind "cv" */
export function buildCvRevisionSystemPrompt(ctx: {
  currentCV: string;
  masterResume: string;
  jobDescription: string;
  role: string;
  company: string;
}): string {
  return buildDocumentRevisionSystemPrompt(
    {
      currentDocument: ctx.currentCV,
      masterResume: ctx.masterResume,
      jobDescription: ctx.jobDescription,
      role: ctx.role,
      company: ctx.company,
    },
    "cv"
  );
}

export function getMessageText(message: {
  content?: string;
  parts?: { type: string; text?: string }[];
}): string {
  if (message.content?.trim()) return message.content;
  if (!message.parts?.length) return "";
  return message.parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text as string)
    .join("\n");
}
