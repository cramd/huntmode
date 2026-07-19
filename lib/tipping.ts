import type { ApplicationStatus } from "@/lib/types";

/** Statuses that mean the hunt is heating up — celebrate + soft tip ask. */
export type TipMilestoneStatus = "phone_screen" | "interview" | "offer";

export const TIP_MILESTONE_STATUSES: TipMilestoneStatus[] = [
  "phone_screen",
  "interview",
  "offer",
];

export function isTipMilestoneStatus(
  status: ApplicationStatus
): status is TipMilestoneStatus {
  return (TIP_MILESTONE_STATUSES as ApplicationStatus[]).includes(status);
}

/**
 * External tip / “buy me a coffee” link.
 * Set NEXT_PUBLIC_TIP_URL in env (Buy Me a Coffee, Ko-fi, Stripe Payment Link, etc.).
 */
export function getTipUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_TIP_URL?.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isTippingEnabled(): boolean {
  return Boolean(getTipUrl());
}

export type TipMilestoneCopy = {
  status: TipMilestoneStatus;
  eyebrow: string;
  title: string;
  body: string;
  tipAsk: string;
  confettiColors: string[];
};

export const TIP_MILESTONE_COPY: Record<TipMilestoneStatus, TipMilestoneCopy> = {
  phone_screen: {
    status: "phone_screen",
    eyebrow: "Momentum unlocked",
    title: "Phone screen — you're getting warmer",
    body: "A real human wants to talk. HuntMode helped get you organized, tailored, and ready for this moment.",
    tipAsk:
      "If that made the difference, a quick tip helps cover hosting and keep building HuntMode.",
    confettiColors: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#6366f1", "#fbbf24"],
  },
  interview: {
    status: "interview",
    eyebrow: "You're in the room",
    title: "Interview locked in",
    body: "This is the stretch that matters. Prep from your application HUD, then go make it count.",
    tipAsk:
      "Feeling good about the tools that got you here? A tip keeps HuntMode free for the next hunter.",
    confettiColors: ["#f59e0b", "#fbbf24", "#fcd34d", "#6366f1", "#34d399"],
  },
  offer: {
    status: "offer",
    eyebrow: "You did it",
    title: "Offer on the table",
    body: "This is what the grind was for. HuntMode was with you from draft to done — celebrate it.",
    tipAsk:
      "If HuntMode played a part in landing this, a thank-you tip goes a long way for hosting and development.",
    confettiColors: ["#10b981", "#34d399", "#6ee7b7", "#fbbf24", "#f472b6"],
  },
};

const STORAGE_PREFIX = "huntmode:tip";

function storageKey(suffix: string): string {
  return `${STORAGE_PREFIX}:${suffix}`;
}

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore quota / private mode
  }
}

/** Soft intro on dashboard after onboarding — show once until dismissed. */
export function shouldShowTipIntro(): boolean {
  return isTippingEnabled() && !safeGet(storageKey("intro-dismissed"));
}

export function dismissTipIntro(): void {
  safeSet(storageKey("intro-dismissed"), new Date().toISOString());
}

/**
 * Celebrate the first time a user reaches each milestone tier.
 * Offers always celebrate (rare + high emotion) unless celebrated in the last 7 days.
 * Works even when NEXT_PUBLIC_TIP_URL is unset — tip CTA is hidden separately.
 */
export function shouldCelebrateMilestone(status: TipMilestoneStatus): boolean {
  if (status === "offer") {
    const last = safeGet(storageKey("offer-celebrated-at"));
    if (!last) return true;
    const elapsed = Date.now() - Date.parse(last);
    return Number.isFinite(elapsed) && elapsed > 7 * 24 * 60 * 60 * 1000;
  }

  return !safeGet(storageKey(`milestone:${status}`));
}

export function markMilestoneCelebrated(status: TipMilestoneStatus): void {
  if (status === "offer") {
    safeSet(storageKey("offer-celebrated-at"), new Date().toISOString());
    return;
  }
  safeSet(storageKey(`milestone:${status}`), new Date().toISOString());
}

export function openTipUrl(source: string): void {
  const url = getTipUrl();
  if (!url) return;
  const withSource = (() => {
    try {
      const u = new URL(url);
      u.searchParams.set("utm_source", "huntmode");
      u.searchParams.set("utm_medium", "tip");
      u.searchParams.set("utm_campaign", source);
      return u.toString();
    } catch {
      return url;
    }
  })();
  window.open(withSource, "_blank", "noopener,noreferrer");
}
