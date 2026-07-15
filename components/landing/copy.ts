export type HeadlineVariant = 1 | 2 | 3 | 4;

export const HEADLINE_VARIANTS: Record<
  HeadlineVariant,
  { headline: string; subhead: string }
> = {
  1: {
    headline: "Stop blanking mid-interview.",
    subhead:
      "Paste your CV and the job description. Get a live HUD you can actually read while you talk.",
  },
  2: {
    headline: "Hope is not an interview strategy.",
    subhead:
      "Turn résumé + JD into a scannable battleboard before the call — and keep it open during the call.",
  },
  3: {
    headline: "Your talking points, on glass.",
    subhead:
      "HuntMode distills prep into four panels: battlecard, topics, closing questions, and pacing.",
  },
  4: {
    headline: "Forty-five minutes in, still sharp.",
    subhead: 'When they ask "Any questions for us?" — you\'ll already have them.',
  },
};

export const DEFAULT_HEADLINE_VARIANT: HeadlineVariant = 1;

export const EYEBROW = "FREE · BYOK · INTERVIEW PREP HUD";

export const PRIMARY_CTA = "Sign in with Google";
export const SECONDARY_CTA = "Sign in with GitHub";
export const DIVIDER = "or";

export const TRUST_LINE =
  "Free forever · Bring your own API key · Résumé and JD stay on your machine";

export const ERROR_BANNER_FALLBACK =
  "Sign-in failed. Check your connection or try email link instead.";

export const WHAT_YOU_GET = [
  {
    title: "Quick Battlecard",
    description: "One-glance strategy before you join the call",
  },
  {
    title: "Topic Clusters",
    description: "JD themes mapped to your bullets",
  },
  {
    title: "Closing Questions",
    description: "Strategic questions ready before they ask",
  },
  {
    title: "Pacing & Coverage",
    description: "Timer + checkoffs so you don't leave themes on the table",
  },
] as const;

export const BYOK_BADGE = "BYOK · YOUR KEYS NEVER LEAVE YOUR BROWSER";

export const MOBILE_SUMMARY_TITLE = "Your interview HUD";

export const MOBILE_BULLETS = [
  { label: "Battlecard", description: "re-center on why you're the fit" },
  { label: "Topics", description: "scan JD themes mapped to your experience" },
  { label: "Closing Qs", description: "no blank stare at the end" },
  { label: "Pacing", description: "timer + coverage so nothing's left unsaid" },
] as const;

export const MOBILE_TRUST = "Free · BYOK · local-first";

/** Public source / self-host entry points */
export const GITHUB_REPO_URL = "https://github.com/cramd/huntmode";
export const DOCKER_HUB_URL = "https://hub.docker.com/r/cramd/huntmode";

export const LEARN_MORE_LABEL = "Learn more about HuntMode";
export const LEARN_MORE_HREF = "/about";

export const LOCAL_INSTALL_TITLE = "Run it locally";
export const LOCAL_INSTALL_BODY =
  "Download and install HuntMode yourself if you want to tweak the code, add features, or keep everything fully private.";
export const LOCAL_INSTALL_CTA = "View source on GitHub";
