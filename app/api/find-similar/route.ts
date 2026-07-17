import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  buildFindSimilarSearchPrompt,
  withModelFallback,
  formatAIError,
} from "@/lib/ai";
import { searchJobsWithJina } from "@/lib/jina-search";
import { parseCompanyRoleFromTitle } from "@/lib/application-dedupe";
import { trackTokenUsage } from "@/lib/cost-tracker";

export const runtime = "nodejs";

export interface FindSimilarResult {
  title: string;
  url: string;
  snippet: string;
  company?: string;
  role?: string;
}

function parseQueriesFromAiText(text: string): string[] {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as { queries?: unknown };
  if (!Array.isArray(parsed.queries)) return [];
  return parsed.queries
    .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
    .map((q) => q.trim())
    .slice(0, 3);
}

function mergeSearchResults(
  batches: { title: string; url: string; snippet: string }[]
): FindSimilarResult[] {
  const seen = new Set<string>();
  const merged: FindSimilarResult[] = [];

  for (const item of batches) {
    const key = item.url.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const parsed = parseCompanyRoleFromTitle(item.title);
    merged.push({
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      company: parsed.company,
      role: parsed.role,
    });
    if (merged.length >= 10) break;
  }

  return merged;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { company, role, jobDescription, apiKey } = body as {
    company?: string;
    role?: string;
    jobDescription?: string;
    apiKey?: string;
  };

  if (!company?.trim() || !role?.trim()) {
    return NextResponse.json({ error: "company and role are required" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid = "";
  let userEmail = "";
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    uid = decoded.uid;
    userEmail = decoded.email || "";
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isMarc = userEmail === "marcsherwood@gmail.com";
  let activeApiKey = typeof apiKey === "string" ? apiKey.trim() : "";

  if (!activeApiKey) {
    const profileSnap = await adminDb.doc(`users/${uid}/profile/data`).get();
    const profile = profileSnap.data();
    if (profile?.aiApiKey && typeof profile.aiApiKey === "string") {
      activeApiKey = profile.aiApiKey.trim();
    }
  }

  if (!isMarc && !activeApiKey && !process.env.GOOGLE_AI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "No AI API key configured. Add your Gemini key in Settings." },
      { status: 400 }
    );
  }

  const googleApiKey = activeApiKey || process.env.GOOGLE_AI_API_KEY;

  try {
    const prompt = buildFindSimilarSearchPrompt({
      company: company.trim(),
      role: role.trim(),
      jobDescription: typeof jobDescription === "string" ? jobDescription : undefined,
    });

    const { result, modelId } = await withModelFallback("google", googleApiKey, (model) =>
        generateText({
          model,
          prompt,
          maxOutputTokens: 800,
          maxRetries: 1,
          providerOptions: {
            google: { thinkingConfig: { thinkingBudget: 0 } },
          },
        })
    );
    const { text, usage } = result;

    if (usage) {
      await trackTokenUsage(uid, "google", usage.inputTokens || 0, usage.outputTokens || 0, {
        feature: "find-similar",
        modelId,
      });
    }

    let queries = parseQueriesFromAiText(text);
    if (queries.length === 0) {
      queries = [
        `"${role.trim()}" careers site:greenhouse.io`,
        `"${role.trim()}" "${company.trim()}" similar companies hiring`,
      ];
    }

    const allResults: { title: string; url: string; snippet: string }[] = [];
    for (const query of queries) {
      try {
        const batch = await searchJobsWithJina(query, 4);
        allResults.push(...batch);
      } catch (err) {
        console.warn(`[find-similar] Jina search failed for query "${query}":`, err);
      }
    }

    if (allResults.length === 0) {
      const jinaConfigured = Boolean(process.env.JINA_API_KEY?.trim());
      return NextResponse.json(
        {
          error: jinaConfigured
            ? "No live openings found for these queries. Try again later or search manually."
            : "Live job search is not configured (missing JINA_API_KEY). Contact the site admin.",
        },
        { status: 502 }
      );
    }

    const results = mergeSearchResults(allResults);
    return NextResponse.json({ results, queries });
  } catch (err: unknown) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI returned malformed search queries. Please try again." },
        { status: 500 }
      );
    }
    console.error("[find-similar] error:", err);
    return NextResponse.json({ error: formatAIError(err) }, { status: 500 });
  }
}
