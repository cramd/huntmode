import { userHasAiAccess } from "@/lib/platform-ai";
import type { UserProfile } from "@/lib/types";

export function userHasAiApiKey(
  email: string | null | undefined,
  profile: Pick<UserProfile, "aiApiKey"> | null | undefined
): boolean {
  return userHasAiAccess({
    email,
    userApiKey: profile?.aiApiKey,
  });
}
