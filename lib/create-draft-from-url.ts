import { parseCompanyRoleFromTitle } from "@/lib/application-dedupe";
import type { Application, UserProfile } from "@/lib/types";
import type { ScrapeJobSuccess } from "@/lib/scrape-job";

export type DraftFromUrlInput = {
  url: string;
  pageTitle?: string;
  notes?: string;
  resumeUsed?: string | null;
  fallbackDescription?: string;
};

export function buildDraftApplicationData(
  input: DraftFromUrlInput,
  scrape: ScrapeJobSuccess | null
): Omit<Application, "id" | "uid" | "createdAt" | "updatedAt"> {
  const parsedTitle = input.pageTitle
    ? parseCompanyRoleFromTitle(input.pageTitle)
    : {};
  let company = parsedTitle.company || "Unknown company";
  let role = parsedTitle.role || input.pageTitle || "Role from posting";
  let jobDescription = input.fallbackDescription || "";
  let location: string | undefined;
  let salaryRange: string | undefined;
  let remote: boolean | undefined;

  if (scrape) {
    jobDescription = scrape.text;
    if (scrape.company) company = scrape.company;
    if (scrape.role) role = scrape.role;
    if (scrape.location) location = scrape.location;
    if (scrape.salaryRange) salaryRange = scrape.salaryRange;
    if (scrape.remote !== undefined) remote = scrape.remote;
  }

  return {
    company,
    role,
    jobUrl: input.url,
    jobDescription,
    status: "draft",
    appliedAt: null,
    notes: input.notes || "Saved from browser extension",
    generatedCV: "",
    generatedCoverLetter: "",
    resumeUsed: input.resumeUsed ?? null,
    ...(location ? { location } : {}),
    ...(salaryRange ? { salaryRange } : {}),
    ...(remote !== undefined ? { remote } : {}),
  };
}

export type CreateDraftFromUrlClientParams = {
  token: string;
  input: DraftFromUrlInput;
  userProfile?: Pick<UserProfile, "aiProvider" | "aiApiKey"> | null;
};

export async function fetchScrapeForDraft(
  params: CreateDraftFromUrlClientParams
): Promise<ScrapeJobSuccess | null> {
  const res = await fetch("/api/scrape-job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      url: params.input.url,
      provider: params.userProfile?.aiProvider || "google",
      apiKey: params.userProfile?.aiApiKey || undefined,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.text) return null;
  return {
    ok: true,
    text: data.text,
    source: data.source || "direct",
    company: data.company,
    role: data.role,
    location: data.location,
    salaryRange: data.salaryRange,
    remote: data.remote,
  };
}
