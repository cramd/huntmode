export type HeadlineVariant = 1 | 2 | 3 | 4;

export type ProductPillarIcon =
  | "briefcase"
  | "barChart"
  | "search"
  | "fileText"
  | "target"
  | "flame";

export type ProductPillar = {
  icon: ProductPillarIcon;
  title: string;
  description: string;
};

export const HEADLINE_VARIANTS: Record<
  HeadlineVariant,
  { headline: string; subhead: string }
> = {
  1: {
    headline: "Track roles. Score the fit. Walk in prepared.",
    subhead:
      "Pipeline, fit analysis, one-click tailoring, and a live interview HUD — free forever, BYOK, your data stays local.",
  },
  2: {
    headline: "Your job hunt, finally in one place.",
    subhead:
      "Track every application, prioritize with AI fit scores, tailor docs from a master résumé, and open a battleboard before the call.",
  },
  3: {
    headline: "Stop guessing which roles are worth your time.",
    subhead:
      "Analyze Fit against your background, find similar openings, generate targeted CVs — then prep with a HUD you can read while you talk.",
  },
  4: {
    headline: "From application to interview, without the chaos.",
    subhead:
      "Status tracking, fit scoring, tailored documents, streaks that keep momentum visible — plus an interview HUD for game day.",
  },
};

export const DEFAULT_HEADLINE_VARIANT: HeadlineVariant = 1;

export const EYEBROW = "FREE · BYOK · AI JOB HUNT ASSISTANT";

export const PRIMARY_CTA = "Sign in with Google";
export const SECONDARY_CTA = "Sign in with GitHub";
export const DIVIDER = "or";

export const TRUST_LINE =
  "Free forever · Bring your own API key · Résumé and JD stay on your machine";

export const ERROR_BANNER_FALLBACK =
  "Sign-in failed. Check your connection or try email link instead.";

export const PRODUCT_PILLARS: ProductPillar[] = [
  {
    icon: "briefcase",
    title: "Track applications",
    description: "Pipeline, status, and notes for every role you pursue",
  },
  {
    icon: "barChart",
    title: "Analyze Fit",
    description: "AI fit score with strengths, gaps, and overall %",
  },
  {
    icon: "search",
    title: "Find Similar Roles",
    description: "Discover openings that match roles you already like",
  },
  {
    icon: "fileText",
    title: "Tailor resume & cover letter",
    description: "One-click docs adapted from your master résumé",
  },
  {
    icon: "target",
    title: "Interview prep HUD",
    description: "Battlecard, topics, closing questions, and pacing",
  },
  {
    icon: "flame",
    title: "Streaks & weekly goals",
    description: "Heatmaps and targets so momentum stays visible",
  },
];

/** Subset for the desktop showcase footer grid */
export const WHAT_YOU_GET = PRODUCT_PILLARS.slice(0, 4);

export const BYOK_BADGE = "BYOK · YOUR KEYS NEVER LEAVE YOUR BROWSER";

export const MOBILE_SUMMARY_TITLE = "Your full hunt toolkit";

export const MOBILE_BULLETS = PRODUCT_PILLARS;

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

/** Chrome Web Store listing for the HuntMode browser extension */
export const CHROME_EXTENSION_STORE_URL =
  "https://chromewebstore.google.com/detail/kejpagponmjfjcjljojamacifnbmjmbk";

export const EXTENSION_CTA_LABEL = "Add to Chrome";

export const EXTENSION_CARD_TITLE = "Save jobs from any tab";
export const EXTENSION_CARD_BODY =
  "Install the free Chrome extension to queue job postings while you browse, then import them as drafts in HuntMode.";

export const EXTENSION_SECTION_EYEBROW = "Chrome extension";
export const EXTENSION_SECTION_HEADLINE = "Spot a role? Save it in one click.";
export const EXTENSION_SECTION_SUBHEAD =
  "Queue job URLs from LinkedIn, company career pages, or anywhere else — then turn them into draft applications when you open HuntMode.";

export const EXTENSION_COMPACT_HEADLINE = "Save jobs while you browse";
export const EXTENSION_COMPACT_BODY =
  "Install the Chrome extension to queue job URLs from any tab. Connect once, then import drafts on HuntMode or add them instantly.";

export const EXTENSION_STEPS = [
  {
    title: "Save",
    description: "Right-click a job page or use the extension popup to add it to your queue.",
  },
  {
    title: "Connect",
    description: "Sign in to HuntMode once from the extension popup to enable instant adds.",
  },
  {
    title: "Import",
    description: "Open HuntMode and click Import drafts on the banner — or use Add now from any tab.",
  },
] as const;

export const EXTENSION_PRIVACY_NOTE = "See our privacy policy for what the extension stores.";
