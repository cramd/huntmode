import posthog from "posthog-js";

export const AnalyticsEvents = {
  USER_SIGNED_IN: "user_signed_in",
  USER_REGISTERED: "user_registered",
  ACCESS_BLOCKED: "access_blocked",
  APPLICATION_CREATED: "application_created",
  JOB_SCRAPED: "job_scraped",
  DOCUMENT_GENERATED: "document_generated",
  DOCUMENT_UPLOADED: "document_uploaded",
  FIT_ANALYZED: "fit_analyzed",
  FIT_INCORPORATED: "fit_incorporated",
  MASTER_RESUME_SAVED: "master_resume_saved",
  SETTINGS_SAVED: "settings_saved",
  ONBOARDING_COMPLETED: "onboarding_completed",
  SIMILAR_ROLES_SEARCHED: "similar_roles_searched",
  INTERVIEW_PREP_VIEW_CHANGED: "interview_prep_view_changed",
  INTERVIEW_MODE_SELECTED: "interview_mode_selected",
  INTERVIEW_FOCUS_SELECTED: "interview_focus_selected",
  INTERVIEW_QUESTIONS_GENERATED: "interview_questions_generated",
  INTERVIEW_SESSION_STARTED: "interview_session_started",
  INTERVIEW_ANSWER_SENT: "interview_answer_sent",
  INTERVIEW_SESSION_COMPLETED: "interview_session_completed",
  INTERVIEW_SESSION_REPLAYED: "interview_session_replayed",
  CHANGELOG_VIEWED: "changelog_viewed",
  TIP_INTRO_SHOWN: "tip_intro_shown",
  TIP_INTRO_DISMISSED: "tip_intro_dismissed",
  TIP_MILESTONE_SHOWN: "tip_milestone_shown",
  TIP_MILESTONE_DISMISSED: "tip_milestone_dismissed",
  TIP_CTA_CLICKED: "tip_cta_clicked",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

function isClientReady(): boolean {
  return typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

export function captureEvent(name: AnalyticsEventName, properties?: AnalyticsProperties): void {
  if (!isClientReady()) return;
  posthog.capture(name, properties);
}

export function identifyUser(input: {
  uid: string;
  email?: string | null;
  name?: string | null;
  accessStatus?: string;
}): void {
  if (!isClientReady()) return;
  posthog.identify(input.uid, {
    email: input.email ?? undefined,
    name: input.name ?? undefined,
    access_status: input.accessStatus,
  });
}

export function resetUser(): void {
  if (!isClientReady()) return;
  posthog.reset();
}
