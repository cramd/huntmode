import type { UsageFeature } from "@/lib/types";

export const HUNT_SPEND_SIDEBAR_LABEL = "Your Hunt spend";
export const HUNT_SPEND_SIDEBAR_HINT =
  "Estimated API cost for AI used on HuntMode during your job search — tailoring, fit scores, prep, and more.";

export const USAGE_FEATURE_LABELS: Record<UsageFeature, string> = {
  generate: "Document generation",
  suggest: "Suggestions",
  "parse-resume": "Resume parsing",
  "incorporate-fit": "Fit incorporation",
  "generate-prep": "Interview prep",
  "interview-chat": "Practice Coach chat",
  "interview-likely-questions": "Likely questions",
  "interview-debrief": "Interview debrief",
  "find-similar": "Find similar roles",
  "onboarding-parse-resume": "Onboarding resume parse",
  "onboarding-suggest-roles": "Onboarding role suggestions",
  "analyze-fit": "Fit analysis",
  "scrape-job": "Job scrape parse",
  "validate-key": "API key validation",
};
