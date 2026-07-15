/** Session-level undo stacks for non-destructive resume/document edits. */

const MAX_UNDO = 5;

export function pushUndoSnapshot<T>(stack: T[], snapshot: T, max = MAX_UNDO): T[] {
  return [...stack, snapshot].slice(-max);
}

export function popUndoSnapshot<T>(stack: T[]): { next: T[]; snapshot: T | null } {
  if (stack.length === 0) return { next: stack, snapshot: null };
  const snapshot = stack[stack.length - 1];
  return { next: stack.slice(0, -1), snapshot };
}

export function appendFitInsights(
  existingCV: string,
  additiveMarkdown: string,
  cardLabel: string
): string {
  const existing = existingCV.trimEnd();
  let addition = additiveMarkdown.trim();
  // Strip accidental full-rewrite preamble / fences if the model misbehaves
  addition = addition
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (!addition) return existing;

  const stamp = new Date().toISOString().slice(0, 10);
  const block = `---\n### Added from fit insights (${cardLabel} · ${stamp})\n\n${addition}`;
  return existing ? `${existing}\n\n${block}` : block;
}

export const FIT_CARD_LABELS: Record<string, string> = {
  strengths: "Strengths",
  gaps: "Gaps",
  suggestions: "Suggestions",
};
