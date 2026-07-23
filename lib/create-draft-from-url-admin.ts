import { adminDb } from "@/lib/firebase-admin";
import { findMatchingApplication } from "@/lib/application-dedupe";
import type { Application } from "@/lib/types";
import {
  buildDraftApplicationData,
  type DraftFromUrlInput,
} from "@/lib/create-draft-from-url";
import {
  scrapeJobFromUrl,
  type ScrapeJobFromUrlParams,
} from "@/lib/scrape-job";

export type CreateDraftFromUrlAdminResult =
  | { ok: true; id: string; duplicate: false; application: Omit<Application, "id"> & { id: string } }
  | { ok: true; duplicate: true; existingId: string }
  | { ok: false; error: string };

export async function createDraftFromUrlAdmin(params: {
  uid: string;
  userEmail: string;
  input: DraftFromUrlInput;
  scrapeParams: Omit<ScrapeJobFromUrlParams, "url">;
  existingApplications: Application[];
}): Promise<CreateDraftFromUrlAdminResult> {
  const { uid, userEmail, input, scrapeParams, existingApplications } = params;

  const existing = findMatchingApplication(existingApplications, { url: input.url });
  if (existing) {
    return { ok: true, duplicate: true, existingId: existing.id };
  }

  const scrapeResult = await scrapeJobFromUrl({
    url: input.url,
    uid,
    userEmail,
    ...scrapeParams,
  });

  const scrape = scrapeResult.ok ? scrapeResult : null;
  const now = new Date().toISOString();
  const data = buildDraftApplicationData(input, scrape);

  const ref = await adminDb.collection("users").doc(uid).collection("applications").add({
    ...data,
    uid,
    createdAt: now,
    updatedAt: now,
  });

  return {
    ok: true,
    duplicate: false,
    id: ref.id,
    application: {
      id: ref.id,
      uid,
      ...data,
      createdAt: now,
      updatedAt: now,
    },
  };
}
