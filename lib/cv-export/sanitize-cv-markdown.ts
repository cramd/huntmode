/** Strip AI wrapper text and code fences so exports contain only resume content. */
export function sanitizeCvMarkdown(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  const fencedBody = text.match(/```(?:markdown|md)?\s*\n([\s\S]*?)```/i);
  if (fencedBody) {
    text = fencedBody[1].trim();
  } else {
    text = text
      .replace(/^```(?:markdown|md)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
  }

  const lines = text.split("\n");
  const kept: string[] = [];
  let started = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!started) {
      if (!trimmed) continue;
      if (isCvPreambleLine(trimmed)) continue;
      if (/^```(?:markdown|md)?$/i.test(trimmed)) continue;
      if (/^`{1,3}(?:markdown|md)?$/i.test(trimmed)) continue;
      started = true;
    }
    kept.push(rawLine.trimEnd());
  }

  return kept.join("\n").trim();
}

function isCvPreambleLine(line: string): boolean {
  if (/^here is the tailored resume/i.test(line)) return true;
  if (/^here'?s the tailored resume/i.test(line)) return true;
  if (/^below is the tailored resume/i.test(line)) return true;
  if (/tailored resume, optimized/i.test(line)) return true;
  if (/^optimized for the\b/i.test(line)) return true;
  if (/role at .+:$/.test(line)) return true;
  if (/^i'?ve tailored/i.test(line)) return true;
  if (/^the following (?:is|resume)/i.test(line)) return true;
  if (/^output:/i.test(line)) return true;
  return false;
}
