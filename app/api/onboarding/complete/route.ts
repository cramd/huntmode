import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyOnboardingAuth } from "@/lib/onboarding-auth";
import { adminDb, formatAdminError } from "@/lib/firebase-admin";
import type { MasterResume, OnboardingDraftSuggestion } from "@/lib/types";

export const runtime = "nodejs";

function normalizeDrafts(raw: unknown): OnboardingDraftSuggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const d = item as Record<string, unknown>;
      const company = typeof d.company === "string" ? d.company.trim() : "";
      const role = typeof d.role === "string" ? d.role.trim() : "";
      if (!company || !role) return null;
      return {
        company,
        role,
        reason: typeof d.reason === "string" ? d.reason.trim() : "",
        searchQuery: typeof d.searchQuery === "string" ? d.searchQuery.trim() : "",
        briefJd: typeof d.briefJd === "string" ? d.briefJd.trim() : "",
      };
    })
    .filter((d): d is OnboardingDraftSuggestion => d !== null)
    .slice(0, 3);
}

export async function POST(req: NextRequest) {
  const auth = await verifyOnboardingAuth(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileRef = adminDb.doc(`users/${auth.uid}/profile/data`);
  const profileSnap = await profileRef.get();
  const profile = profileSnap.data() || {};
  if (profile.onboardingCompletedAt && !profile.forceOnboarding) {
    return NextResponse.json({ error: "Onboarding already completed" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetRoles = Array.isArray(body.targetRoles)
    ? body.targetRoles
        .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
        .map((r) => r.trim())
    : [];
  const targetIndustry = typeof body.targetIndustry === "string" ? body.targetIndustry.trim() : "";
  const drafts = normalizeDrafts(body.drafts);
  const sectionsRaw = body.sections as MasterResume["sections"] | null | undefined;

  if (targetRoles.length === 0 && !targetIndustry) {
    return NextResponse.json(
      { error: "At least one target role or industry is required." },
      { status: 400 }
    );
  }

  if (drafts.length === 0) {
    return NextResponse.json({ error: "At least one draft role is required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const targetRoleJoined = targetRoles.join(", ");

  try {
    const resumesSnap = await adminDb
      .collection(`users/${auth.uid}/masterResumes`)
      .limit(1)
      .get();
    const appsSnap = await adminDb
      .collection(`users/${auth.uid}/applications`)
      .limit(1)
      .get();
    const preserveExistingApps = !appsSnap.empty;

    let masterResumeId: string | null = resumesSnap.empty ? null : resumesSnap.docs[0].id;

    if (sectionsRaw && typeof sectionsRaw === "object") {
      const sections = {
        summary: sectionsRaw.summary || "",
        experience: sectionsRaw.experience || "",
        skills: sectionsRaw.skills || "",
        education: sectionsRaw.education || "",
        certifications: sectionsRaw.certifications || "",
        projects: Array.isArray(sectionsRaw.projects) ? sectionsRaw.projects : [],
      };
      if (masterResumeId) {
        await adminDb.doc(`users/${auth.uid}/masterResumes/${masterResumeId}`).set(
          { sections, updatedAt: now },
          { merge: true }
        );
      } else {
        const resumeRef = adminDb.collection(`users/${auth.uid}/masterResumes`).doc();
        masterResumeId = resumeRef.id;
        await resumeRef.set({
          uid: auth.uid,
          name: "Master Resume",
          category: "general",
          sections,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await profileRef.set(
      {
        targetRoles,
        targetIndustry,
        targetRole: targetRoleJoined,
        onboardingCompletedAt: now,
        forceOnboarding: FieldValue.delete(),
        onboardingDismissedAt: FieldValue.delete(),
      },
      { merge: true }
    );

    const applicationIds: string[] = [];
    if (!preserveExistingApps) {
      for (const draft of drafts) {
        const appRef = adminDb.collection(`users/${auth.uid}/applications`).doc();
        const notes = [draft.reason, draft.searchQuery ? `Search: ${draft.searchQuery}` : ""]
          .filter(Boolean)
          .join("\n\n");
        await appRef.set({
          uid: auth.uid,
          company: draft.company,
          role: draft.role,
          jobUrl: "",
          jobDescription: draft.briefJd,
          status: "draft",
          appliedAt: null,
          notes,
          generatedCV: "",
          generatedCoverLetter: "",
          resumeUsed: masterResumeId,
          createdAt: now,
          updatedAt: now,
        });
        applicationIds.push(appRef.id);
      }
    }

    return NextResponse.json({
      ok: true,
      masterResumeId,
      applicationIds,
      draftCount: applicationIds.length,
      preservedExistingApplications: preserveExistingApps,
    });
  } catch (err: unknown) {
    console.error("[onboarding/complete] error:", err);
    return NextResponse.json({ error: formatAdminError(err) }, { status: 500 });
  }
}
