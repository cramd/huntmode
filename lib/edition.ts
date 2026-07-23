export type HuntModeEdition = "hosted" | "core";

function readEdition(): HuntModeEdition {
  const raw =
    process.env.NEXT_PUBLIC_HUNTMODE_EDITION?.trim() ||
    process.env.HUNTMODE_EDITION?.trim() ||
    "hosted";
  return raw === "core" ? "core" : "hosted";
}

const edition = readEdition();

export function getEdition(): HuntModeEdition {
  return edition;
}

export function isHostedEdition(): boolean {
  return edition === "hosted";
}

export function isCoreEdition(): boolean {
  return edition === "core";
}

/** Hosted: sign-up rate limits + access-request admin tools. Core: open sign-up. */
export function accessGateEnabled(): boolean {
  return isHostedEdition();
}

/** Server-side onboarding AI (GOOGLE_AI_API_KEY). Available on both editions when configured. */
export function onboardingServerAiEnabled(): boolean {
  return Boolean(process.env.GOOGLE_AI_API_KEY?.trim());
}

/** Future: subsidize in-app AI for hosted users without BYOK. Off in phase 1. */
export function platformAiForUsersEnabled(): boolean {
  return isHostedEdition() && process.env.HUNTMODE_PLATFORM_AI_FOR_USERS === "true";
}

/** Soft “help us improve” copy on hosted; silent on core. */
export function analyticsPromptEnabled(): boolean {
  return isHostedEdition();
}

/** Tip celebration / sidebar CTAs — hosted only. */
export function tippingUiEnabled(): boolean {
  return isHostedEdition();
}
