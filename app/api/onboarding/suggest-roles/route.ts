import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { verifyOnboardingAuth } from "@/lib/onboarding-auth";
import { adminDb } from "@/lib/firebase-admin";
import { buildOnboardingSuggestPrompt, withModelFallback, formatAIError } from "@/lib/ai";
import type { OnboardingDraftSuggestion } from "@/lib/types";
import { masterResumeSectionsToText } from "@/lib/onboarding";
import type { MasterResume } from "@/lib/types";
import { trackTokenUsage } from "@/lib/cost-tracker";

export const runtime = "nodejs";

async function assertOnboardingAllowed(uid: string): Promise<string | null> {
  const profileSnap = await adminDb.doc(`users/${uid}/profile/data`).get();
  const profile = profileSnap.data();
  if (profile?.onboardingCompletedAt && !profile?.forceOnboarding) {
    return "Onboarding already completed";
  }
  return null;
}

function normalizeDrafts(raw: unknown): OnboardingDraftSuggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const d = item as Record<string, unknown>;
      const company = typeof d.company === "string" ? d.company.trim() : "";
      const role = typeof d.role === "string" ? d.role.trim() : "";
      const reason = typeof d.reason === "string" ? d.reason.trim() : "";
      const searchQuery = typeof d.searchQuery === "string" ? d.searchQuery.trim() : "";
      const briefJd = typeof d.briefJd === "string" ? d.briefJd.trim() : "";
      if (!company || !role) return null;
      return {
        company,
        role,
        reason: reason || "Strong fit for your background and target mission.",
        searchQuery: searchQuery || `"${role}" ${company}`,
        briefJd: briefJd || `Draft role: ${role} at ${company}.`,
      };
    })
    .filter((d): d is OnboardingDraftSuggestion => d !== null)
    .slice(0, 3);
}

function parseDraftsFromAiText(text: string): OnboardingDraftSuggestion[] {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  return normalizeDrafts(parsed.drafts);
}

async function generateDraftSuggestions(
  prompt: string,
  uid: string
): Promise<OnboardingDraftSuggestion[]> {
  const { result, modelId } = await withModelFallback("google", process.env.GOOGLE_AI_API_KEY, (model) =>
    generateText({ model, prompt, maxOutputTokens: 4000, maxRetries: 1 })
  );
  const { text, usage } = result;

  if (usage) {
    await trackTokenUsage(uid, "google", usage.inputTokens || 0, usage.outputTokens || 0, {
      feature: "onboarding-suggest-roles",
      modelId,
    });
  }

  return parseDraftsFromAiText(text);
}

export async function POST(req: NextRequest) {
  const auth = await verifyOnboardingAuth(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await assertOnboardingAllowed(auth.uid);
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 400 });
  }

  if (!process.env.GOOGLE_AI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Server AI is not configured. Contact the administrator." },
      { status: 503 }
    );
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
  const industry = typeof body.industry === "string" ? body.industry.trim() : "";
  const sections = body.sections as MasterResume["sections"] | null | undefined;

  if (targetRoles.length === 0 && !industry && !sections) {
    return NextResponse.json(
      { error: "Add at least one target role or industry, or upload a CV first." },
      { status: 400 }
    );
  }

  const resumeText = masterResumeSectionsToText(sections ?? undefined);
  const prompt = buildOnboardingSuggestPrompt({
    resumeText,
    targetRoles,
    industry,
  });

  try {
    let drafts = await generateDraftSuggestions(prompt, auth.uid);

    if (drafts.length < 3) {
      const retryPrompt = `${prompt}

You returned ${drafts.length} draft(s). Return ONLY a valid JSON object with exactly 3 entries in "drafts". No markdown fences.`;
      drafts = await generateDraftSuggestions(retryPrompt, auth.uid);
    }

    if (drafts.length < 3) {
      return NextResponse.json(
        { error: "Could not generate 3 role suggestions. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ drafts: drafts.slice(0, 3) });
  } catch (err: unknown) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI returned malformed suggestions. Please try again." },
        { status: 500 }
      );
    }
    console.error("[onboarding/suggest-roles] error:", err);
    return NextResponse.json({ error: formatAIError(err) }, { status: 500 });
  }
}
