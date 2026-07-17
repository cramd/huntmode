/** Normalize fancy punctuation common in AI/resume text. */
export function normalizeResumePunctuation(text: string): string {
  return text
    .replace(/\uFEFF/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "-")
    .replace(/\u2026/g, "...");
}

/**
 * Standard PDF fonts (Helvetica) use WinAnsi and cannot render many Unicode
 * resume characters. Map them to ASCII/Latin-1-safe equivalents before rendering.
 */
export function toPdfSafeText(text: string): string {
  return normalizeResumePunctuation(text).replace(
    /[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g,
    ""
  );
}
