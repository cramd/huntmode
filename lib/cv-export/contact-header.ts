import type { UserProfile } from "@/lib/types";
import type { CvContact, ParsedCv } from "./types";

export function contactFromProfile(
  profile: Pick<UserProfile, "name" | "email" | "phone" | "linkedIn" | "location"> | null | undefined
): CvContact | null {
  if (!profile) return null;
  const fullName = profile.name?.trim() || "";
  const email = profile.email?.trim() || "";
  const phone = profile.phone?.trim() || "";
  const linkedIn = profile.linkedIn?.trim() || "";
  const location = profile.location?.trim() || "";
  if (!fullName && !email && !phone && !linkedIn && !location) return null;
  return { fullName, email, phone, linkedIn, location };
}

/** Build resume header lines: name, then a single contact details line. */
export function formatContactHeader(contact: CvContact): string[] {
  const name = contact.fullName?.trim() || "";
  const details = [contact.location, contact.email, contact.phone, contact.linkedIn]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  const lines: string[] = [];
  if (name) lines.push(name);
  if (details.length > 0) lines.push(details.join(" | "));
  return lines;
}

/**
 * Prefer profile contact for the export header when a name is available.
 * Falls back to markdown-parsed header lines otherwise.
 */
export function mergeContactIntoParsed(
  parsed: ParsedCv,
  contact?: CvContact | null
): ParsedCv {
  if (!contact?.fullName?.trim()) {
    return parsed;
  }
  const headerLines = formatContactHeader(contact);
  if (headerLines.length === 0) return parsed;
  return { ...parsed, headerLines };
}
