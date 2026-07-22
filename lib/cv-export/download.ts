export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
  return cleaned.replace(/^_+|_+$/g, "").slice(0, 80) || "CV";
}

export function buildCvFilename(company: string, role: string, ext: "pdf" | "docx"): string {
  const parts = [company.trim(), role.trim(), "CV"].filter(Boolean);
  return `${sanitizeFilename(parts.join("_"))}.${ext}`;
}

export function buildCoverLetterFilename(company: string, role: string, ext: "pdf" | "docx"): string {
  const parts = [company.trim(), role.trim(), "Cover_Letter"].filter(Boolean);
  return `${sanitizeFilename(parts.join("_"))}.${ext}`;
}
