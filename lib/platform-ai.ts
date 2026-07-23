import { isAdminEmail } from "@/lib/is-admin";
import {
  isCoreEdition,
  isHostedEdition,
  onboardingServerAiEnabled,
  platformAiForUsersEnabled,
} from "@/lib/edition";
import type { UsageFeature } from "@/lib/types";

export type PlatformAiFeature = UsageFeature | "onboarding";

/** Phase-2 policy map — no subsidized user AI until explicitly enabled. */
const PLATFORM_SUBSIDIZED_FEATURES: Partial<Record<UsageFeature, boolean>> = {
  "onboarding-parse-resume": true,
  "onboarding-suggest-roles": true,
};

export function userHasFindSimilarAccess(params: {
  email: string | null | undefined;
  userApiKey?: string | null;
}): boolean {
  if (userHasAiAccess(params)) return true;
  if (isHostedEdition() && Boolean(process.env.GOOGLE_AI_API_KEY?.trim())) {
    return true;
  }
  return false;
}

export function resolveFindSimilarGoogleKey(params: {
  email: string | null | undefined;
  userApiKey?: string | null;
}): string | undefined {
  const userKey = params.userApiKey?.trim();
  if (userKey) return userKey;
  if (userHasFindSimilarAccess(params)) {
    return process.env.GOOGLE_AI_API_KEY?.trim();
  }
  return undefined;
}

export function userHasStoredApiKey(userApiKey?: string | null): boolean {
  return Boolean(userApiKey?.trim());
}

export function userHasAiAccess(params: {
  email: string | null | undefined;
  userApiKey?: string | null;
}): boolean {
  if (userHasStoredApiKey(params.userApiKey)) return true;
  if (isHostedEdition() && isAdminEmail(params.email)) return true;
  if (isHostedEdition() && platformAiForUsersEnabled()) {
    return false;
  }
  return false;
}

export function canBillToPlatform(params: {
  email: string | null | undefined;
  feature: PlatformAiFeature;
}): boolean {
  const feature = params.feature;
  const isOnboarding =
    feature === "onboarding" ||
    feature === "onboarding-parse-resume" ||
    feature === "onboarding-suggest-roles";

  if (isOnboarding && onboardingServerAiEnabled()) {
    if (isHostedEdition()) return true;
    if (isCoreEdition()) return true;
  }

  if (isHostedEdition() && isAdminEmail(params.email)) return true;

  if (
    isHostedEdition() &&
    platformAiForUsersEnabled() &&
    feature !== "onboarding" &&
    PLATFORM_SUBSIDIZED_FEATURES[feature as UsageFeature]
  ) {
    return true;
  }

  return false;
}

export function getActiveProviderKey(params: {
  userApiKey?: string | null;
  email?: string | null;
  feature: PlatformAiFeature;
  envKey?: string | null;
}): string | undefined {
  const userKey = params.userApiKey?.trim();
  if (userKey) return userKey;
  if (canBillToPlatform({ email: params.email, feature: params.feature })) {
    return params.envKey?.trim() || process.env.GOOGLE_AI_API_KEY?.trim() || undefined;
  }
  return undefined;
}

export function getAiAccessError(): string {
  return "No AI API key provided. Please configure your own AI key in Settings.";
}

export function getOnboardingServerAiError(): string {
  if (isCoreEdition()) {
    return "Server AI is not configured. Set GOOGLE_AI_API_KEY in your environment or add your AI key in Settings.";
  }
  return "Server AI is not configured. Contact the administrator.";
}

export type AiAccessCheck =
  | { ok: true; apiKey: string | undefined }
  | { ok: false; error: string };

export function checkUserAiAccess(params: {
  email: string | null | undefined;
  userApiKey?: string | null;
  feature?: PlatformAiFeature;
  envKey?: string | null;
}): AiAccessCheck {
  const feature = params.feature ?? "generate";
  if (!userHasAiAccess({ email: params.email, userApiKey: params.userApiKey })) {
    return { ok: false, error: getAiAccessError() };
  }
  const apiKey =
    getActiveProviderKey({
      userApiKey: params.userApiKey,
      email: params.email,
      feature,
      envKey: params.envKey,
    }) || params.userApiKey?.trim() || undefined;
  return { ok: true, apiKey };
}

export function resolveBilledTo(params: {
  email: string | null | undefined;
  userApiKey?: string | null;
  feature: PlatformAiFeature;
}): "user" | "platform" {
  if (userHasStoredApiKey(params.userApiKey)) return "user";
  if (canBillToPlatform({ email: params.email, feature: params.feature })) {
    return "platform";
  }
  return "user";
}
