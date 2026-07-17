import type { CvBlock, CvSection, ParsedCv } from "./types";
import { sanitizeCvMarkdown } from "./sanitize-cv-markdown";

function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim();
}

const BULLET_PREFIX = /^[-*•●◦‣–—]\s+/;

function pushBlock(section: CvSection, line: string): void {
  const trimmed = line.trim();
  if (!trimmed) return;
  // Keep inline markdown (**bold**) so PDF/DOCX can style job titles and emphasis.
  if (BULLET_PREFIX.test(trimmed)) {
    section.blocks.push({
      type: "bullet",
      text: trimmed.replace(BULLET_PREFIX, "").trim(),
    });
    return;
  }
  section.blocks.push({ type: "paragraph", text: trimmed });
}

function parseBodyLines(lines: string[]): CvSection {
  const section: CvSection = { title: "", blocks: [] };
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line.trim())) continue;
    pushBlock(section, line);
  }
  return section;
}

export function parseCvMarkdown(markdown: string): ParsedCv {
  const normalized = sanitizeCvMarkdown(markdown);
  if (!normalized) {
    return { headerLines: [], sections: [] };
  }

  const lines = normalized.split("\n");
  const headerLines: string[] = [];
  const sections: CvSection[] = [];
  let currentSection: CvSection | null = null;
  let seenHeading = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      // Single # heading at top is usually the candidate name, not a section
      if (level === 1 && !seenHeading && !currentSection) {
        headerLines.push(stripMarkdownInline(title));
        continue;
      }

      seenHeading = true;
      if (currentSection && (currentSection.title || currentSection.blocks.length > 0)) {
        sections.push(currentSection);
      }
      currentSection = { title: headingMatch[2].trim(), blocks: [] };
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!seenHeading) {
      headerLines.push(stripMarkdownInline(trimmed));
      continue;
    }

    if (!currentSection) {
      currentSection = { title: "", blocks: [] };
    }
    pushBlock(currentSection, line);
  }

  if (currentSection && (currentSection.title || currentSection.blocks.length > 0)) {
    sections.push(currentSection);
  }

  if (sections.length === 0 && headerLines.length === 0) {
    const fallback = parseBodyLines(lines);
    if (fallback.blocks.length > 0) {
      sections.push(fallback);
    }
  }

  return { headerLines, sections };
}

export function parseInlineMarkdown(text: string): import("./types").TextRunStyle[] {
  const runs: import("./types").TextRunStyle[] = [];
  const pattern = /(\*\*.+?\*\*|\*.+?\*|__.+?__|_.+?_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      runs.push({ text: token.slice(2, -2), bold: true });
    } else {
      runs.push({ text: token.slice(1, -1), italic: true });
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    runs.push({ text: text.slice(lastIndex) });
  }

  if (runs.length === 0) {
    runs.push({ text });
  }

  return runs.filter((run) => run.text.length > 0);
}
