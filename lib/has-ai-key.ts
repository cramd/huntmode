import type { UserProfile } from "@/lib/types";

const OWNER_EMAIL = "marcsherwood@gmail.com";

export function userHasAiApiKey(
  email: string | null | undefined,
  profile: Pick<UserProfile, "aiApiKey"> | null | undefined
): boolean {
  if (email === OWNER_EMAIL) return true;
  return Boolean(profile?.aiApiKey?.trim());
}
