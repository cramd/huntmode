export type ChangelogKind = "new" | "improved" | "fixed";

export type ChangelogItem = {
  kind: ChangelogKind;
  text: string;
};

export type ChangelogRelease = {
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Short shareable title */
  title: string;
  /** One-line summary for cards and social shares */
  summary: string;
  items: ChangelogItem[];
};

/**
 * User-facing product changelog.
 * Add a new release at the top after each deploy you want users to notice.
 * Keep language plain — skip admin/internal-only work.
 */
export const CHANGELOG: ChangelogRelease[] = [
  {
    date: "2026-07-22",
    title: "Revision chat, exports & onboarding polish",
    summary:
      "Chat your way to better CVs and cover letters, export both as PDF/DOCX, and set up your export contact profile during onboarding. Thanks Rod for the great suggestions.",
    items: [
      {
        kind: "new",
        text: "CV revision chat on each application — request tone or focus changes, then Apply to your tailored CV with Undo.",
      },
      {
        kind: "new",
        text: "Cover letter revision chat with the same Apply + Undo flow as CVs.",
      },
      {
        kind: "new",
        text: "Export cover letters as PDF or DOCX (Classic ATS or Modern Compact), with your contact header, date, and role line.",
      },
      {
        kind: "improved",
        text: "Onboarding is now five steps with sticky actions, clearer next-step hints, and a Contact profile step for export headers.",
      },
      {
        kind: "improved",
        text: "Tooltips and consistent AI labels on CV/cover letter toolbars (Tailor, Regenerate, Export, Save, Undo).",
      },
      {
        kind: "improved",
        text: "Settings → Export contact profile explains how name, phone, location, and LinkedIn appear on exports — update anytime for a new hunt.",
      },
      {
        kind: "improved",
        text: "Thanks to Rod for being a good pony and pushing some of the best ideas in this release.",
      },
    ],
  },
  {
    date: "2026-07-19",
    title: "Say thanks — tips when the hunt heats up",
    summary:
      "Optional tipping to support hosting, with a sparkle celebration when you land screens and interviews.",
    items: [
      {
        kind: "new",
        text: "Sparkle celebration when an application moves to Phone Screen, Interview, or Offer — with an optional tip ask while the win is fresh.",
      },
      {
        kind: "new",
        text: "Soft “HuntMode stays free” tip intro on the dashboard after onboarding, plus Say thanks in the sidebar and Settings.",
      },
    ],
  },
  {
    date: "2026-07-16",
    title: "Practice Coach & clearer application controls",
    summary:
      "Rehearse interviews inside each application, and controls that look like controls.",
    items: [
      {
        kind: "new",
        text: "Practice Coach on Interview Prep — Screening, Secondary, and Pressure modes with AI scorecards saved to the application.",
      },
      {
        kind: "new",
        text: "Generate a tailored question bank from the job description before you start a session.",
      },
      {
        kind: "improved",
        text: "Application stage chips and workspace tabs (CV, Cover Letter, JD, Prep, Fit) are clearer buttons, not plain text.",
      },
      {
        kind: "improved",
        text: "Live HUD vs Practice Coach switcher shows what each mode is for.",
      },
      {
        kind: "fixed",
        text: "Mobile Google sign-in restored to a popup-first flow.",
      },
    ],
  },
  {
    date: "2026-07-14",
    title: "HuntMode.ca relaunch",
    summary:
      "New domain, guided onboarding, and Find Similar Roles on the dashboard.",
    items: [
      {
        kind: "new",
        text: "huntmode.ca branding across the product and landing experience.",
      },
      {
        kind: "new",
        text: "Onboarding wizard — master resume, target role, and BYOK API key setup so the dashboard isn’t empty on day one.",
      },
      {
        kind: "new",
        text: "Find Similar Roles — surface adjacent openings from a role you already like.",
      },
      {
        kind: "improved",
        text: "Safer resume editing during onboarding and application setup.",
      },
    ],
  },
  {
    date: "2026-07-10",
    title: "GitHub sign-in",
    summary: "Sign in with GitHub in addition to Google.",
    items: [
      {
        kind: "new",
        text: "GitHub authentication for accounts that prefer GitHub over Google.",
      },
    ],
  },
  {
    date: "2026-06-11",
    title: "Mobile dashboard & smarter documents",
    summary:
      "Responsive layout, richer analytics, and faster CV / cover letter workflows.",
    items: [
      {
        kind: "new",
        text: "Collapsible desktop sidebar and a fully responsive mobile dashboard.",
      },
      {
        kind: "new",
        text: "Role-title trends and org-type analytics on the dashboard.",
      },
      {
        kind: "new",
        text: "Multi-input CV / cover letter flow with AI suggestions.",
      },
      {
        kind: "improved",
        text: "Base resume categorization and generation reliability.",
      },
      {
        kind: "fixed",
        text: "Mobile auth and landing page layout polish.",
      },
    ],
  },
];

export const CHANGELOG_KIND_LABEL: Record<ChangelogKind, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

export function formatChangelogDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function getLatestChangelogRelease(): ChangelogRelease | undefined {
  return CHANGELOG[0];
}
