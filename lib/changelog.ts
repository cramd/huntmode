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
