import type { Application } from "@/lib/types";

export function normalizeCompanyRole(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/,?\s*(inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|limited)$/i, "")
    .trim();
}

export function normalizeJobUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

export function findMatchingApplication(
  applications: Application[],
  candidate: { company?: string; role?: string; url?: string }
): Application | undefined {
  const candidateUrl = candidate.url ? normalizeJobUrl(candidate.url) : "";
  const candidateCompany = candidate.company ? normalizeCompanyRole(candidate.company) : "";
  const candidateRole = candidate.role ? normalizeCompanyRole(candidate.role) : "";

  for (const app of applications) {
    if (candidateUrl && app.jobUrl && normalizeJobUrl(app.jobUrl) === candidateUrl) {
      return app;
    }
    if (
      candidateCompany &&
      candidateRole &&
      normalizeCompanyRole(app.company) === candidateCompany &&
      normalizeCompanyRole(app.role) === candidateRole
    ) {
      return app;
    }
  }
  return undefined;
}

export function parseCompanyRoleFromTitle(title: string): { company?: string; role?: string } {
  const cleaned = title
    .replace(/\s*\|\s*LinkedIn.*$/i, "")
    .replace(/\s*-\s*Indeed.*$/i, "")
    .replace(/\s*-\s*Glassdoor.*$/i, "")
    .trim();

  const atMatch = cleaned.match(/^(.+?)\s+at\s+(.+?)$/i);
  if (atMatch) {
    return { role: atMatch[1].trim(), company: atMatch[2].trim() };
  }

  const dashParts = cleaned.split(/\s+-\s+/);
  if (dashParts.length >= 2) {
    const [left, right] = dashParts;
    if (left.length <= right.length) {
      return { company: left.trim(), role: right.trim() };
    }
    return { role: left.trim(), company: right.trim() };
  }

  return { role: cleaned };
}
