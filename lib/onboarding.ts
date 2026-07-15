import type { MasterResume, UserProfile } from "@/lib/types";

export function needsOnboarding(input: {
  profile: UserProfile | null;
  applicationCount: number;
  resumeCount: number;
}): boolean {
  const { profile, applicationCount, resumeCount } = input;
  if (profile?.onboardingCompletedAt) return false;
  if (applicationCount > 0 || resumeCount > 0) return false;
  if (profile?.onboardingDismissedAt) return false;
  return true;
}

export function masterResumeSectionsToText(
  sections: MasterResume["sections"] | null | undefined
): string {
  if (!sections) return "";
  const parts: string[] = [];
  if (sections.summary?.trim()) parts.push(`SUMMARY:\n${sections.summary}`);
  if (sections.experience?.trim()) parts.push(`EXPERIENCE:\n${sections.experience}`);
  if (sections.skills?.trim()) parts.push(`SKILLS:\n${sections.skills}`);
  if (sections.education?.trim()) parts.push(`EDUCATION:\n${sections.education}`);
  if (sections.certifications?.trim()) {
    parts.push(`CERTIFICATIONS:\n${sections.certifications}`);
  }
  if (sections.projects?.length) {
    const projectText = sections.projects
      .map((p) => `${p.name}: ${p.description}`)
      .join("\n");
    parts.push(`PROJECTS:\n${projectText}`);
  }
  return parts.join("\n\n").slice(0, 8000);
}

export const ONBOARDING_MAX_PDF_BYTES = 5 * 1024 * 1024;
