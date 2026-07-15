export type ApplicationStatus =
  | "draft"
  | "applied"
  | "phone_screen"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface InterviewSection {
  id: string;
  icon: string;
  title: string;
  keywords: string[];
  script: string;
  completed: boolean;
  order: number;
}

export interface InterviewPrepData {
  sections: InterviewSection[];
  notes?: string;
  questions?: string[];
  zoomLevel?: number;
}

export interface FitScoreBreakdown {
  skills: number;
  experience: number;
  keywords: number;
  culture: number;
}

export interface SimilarRole {
  company: string;
  role: string;
  reason: string;
  searchQuery: string;
}

/** Onboarding seed draft — extends SimilarRole with a paint-by-numbers JD sketch */
export interface OnboardingDraftSuggestion extends SimilarRole {
  briefJd: string;
}

export interface FitScore {
  overall: number;
  breakdown: FitScoreBreakdown;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  similarRoles: SimilarRole[];
  generatedAt: string;
}

export type FitInsightCardType = "strengths" | "gaps" | "suggestions";

export interface Application {
  id: string;
  uid: string;
  company: string;
  role: string;
  jobUrl: string;
  jobDescription: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  notes: string;
  generatedCV: string;
  generatedCoverLetter: string;
  resumeUsed: string | null;
  salaryRange?: string;
  location?: string;
  remote?: boolean;
  orgType?: OrgType;
  interviewPrep?: InterviewPrepData;
  fitScore?: FitScore;
}

export type OrgType = "startup" | "scaleup" | "enterprise" | "agency" | "consulting" | "nonprofit" | "government" | "other";

export const ORG_TYPE_CONFIG: Record<OrgType, { label: string; color: string; bgColor: string }> = {
  startup: { label: "Startup", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  scaleup: { label: "Scale-up", color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  enterprise: { label: "Enterprise", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  agency: { label: "Agency", color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
  consulting: { label: "Consulting", color: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-100 dark:bg-teal-900/30" },
  nonprofit: { label: "Non-profit", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  government: { label: "Government", color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30" },
  other: { label: "Other", color: "text-gray-600 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-900/30" },
};

export interface ProjectEntry {
  name: string;
  url?: string;
  description: string;
  tech?: string;
  dates?: string;
}

export type ResumeCategory = "gtm" | "marketing" | "sales_ops" | "general";

export const CATEGORY_CONFIG: Record<
  ResumeCategory,
  { label: string; color: string; bgColor: string; iconName: string }
> = {
  gtm: {
    label: "GTM Based",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    iconName: "gtm",
  },
  marketing: {
    label: "Revenue & Special Projects",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    iconName: "marketing",
  },
  sales_ops: {
    label: "Sales Ops",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    iconName: "sales_ops",
  },
  general: {
    label: "General / Other",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    iconName: "general",
  },
};

export interface MasterResume {
  id: string;
  uid: string;
  name: string;
  category?: ResumeCategory;
  sections: {
    summary: string;
    experience: string;
    skills: string;
    education: string;
    certifications?: string;
    projects?: ProjectEntry[];
  };
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  uid: string;
  title: string;
  type: "daily" | "weekly";
  targetCount: number;
  completedDates: string[];
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  targetRole: string;
  weeklyGoal: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  aiProvider?: "openai" | "anthropic" | "google";
  aiApiKey?: string;
  totalTokensUsed?: number;
  totalEstimatedCostUsd?: number;
  onboardingDismissedAt?: string;
  onboardingCompletedAt?: string;
  targetIndustry?: string;
  targetRoles?: string[];
  createdAt: string;
}

export type AccessRequestStatus = "pending" | "approved" | "denied";

export interface AccessRequest {
  uid: string;
  email: string;
  name: string;
  status: AccessRequestStatus;
  requestedAt: string;
  updatedAt?: string;
}

export interface ActivityLog {
  date: string;
  appsSubmitted: number;
  tasksCompleted: number;
  uid: string;
}

export const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: "Draft",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  applied: {
    label: "Applied",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  phone_screen: {
    label: "Phone Screen",
    color: "text-violet-700 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
  },
  interview: {
    label: "Interview",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  offer: {
    label: "Offer",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  withdrawn: {
    label: "Withdrawn",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
  },
};

export const MOTIVATIONAL_MESSAGES = [
  "Every application is a step closer. Keep going!",
  "You're building momentum. The right opportunity is coming!",
  "Consistency beats perfection. Show up every day.",
  "Each 'no' gets you closer to the perfect 'yes'.",
  "Your dream role is out there — keep hunting!",
  "Progress, not perfection. You're doing great.",
  "One application at a time. You've got this.",
  "The grind is real, but so is the reward.",
  "Your next big chapter starts with today's effort.",
  "Stay focused, stay consistent, stay unstoppable.",
];
