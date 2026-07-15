#!/usr/bin/env node
/**
 * Suggest draft job targets from a seed JSON resume using server GOOGLE_AI_API_KEY.
 *
 * Usage:
 *   node scripts/suggest-jobs.mjs --data scripts/seed-data/rod-allen.json
 *   node scripts/suggest-jobs.mjs --data scripts/seed-data/rod-allen.json --out scripts/seed-data/rod-allen-jobs.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

config({ path: resolve(process.cwd(), ".env.local") });

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--data") out.data = argv[++i];
    else if (arg === "--out") out.out = argv[++i];
    else if (arg === "--help" || arg === "-h") out.help = true;
  }
  return out;
}

function resumeSectionsToText(sections) {
  if (!sections) return "";
  const parts = [];
  if (sections.summary?.trim()) parts.push(`SUMMARY:\n${sections.summary}`);
  if (sections.experience?.trim()) parts.push(`EXPERIENCE:\n${sections.experience}`);
  if (sections.skills?.trim()) parts.push(`SKILLS:\n${sections.skills}`);
  if (sections.education?.trim()) parts.push(`EDUCATION:\n${sections.education}`);
  if (sections.certifications?.trim()) parts.push(`CERTIFICATIONS:\n${sections.certifications}`);
  return parts.join("\n\n").slice(0, 8000);
}

function buildSuggestPrompt({ resumeText, targetRoles, industry }) {
  const rolesLine =
    targetRoles.length > 0 ? targetRoles.join(", ") : "Not specified — infer from resume";
  const industryLine = industry.trim() || "Not specified — infer from resume";

  return `You are an expert career coach helping a job seeker start their hunt with paint-by-numbers draft targets.

CANDIDATE RESUME:
${resumeText.slice(0, 6000) || "(No resume uploaded yet)"}

TARGET ROLES THEY WANT: ${rolesLine}
TARGET INDUSTRY: ${industryLine}
LOCATION PREFERENCE: Boise, Idaho area or remote-friendly roles

Return ONLY a valid JSON object — no markdown fences — with exactly 3 draft role suggestions:
{
  "drafts": [
    {
      "company": "<real company currently hiring or likely to hire for this profile>",
      "role": "<specific job title>",
      "reason": "<1 sentence why this fits their background and stated mission>",
      "searchQuery": "<Google-ready search e.g. \\"Director Revenue Operations\\" Salesforce site:greenhouse.io>",
      "briefJd": "<4-6 bullet sketch of a plausible job description they could tailor to — responsibilities, stack, and outcomes>"
    }
  ]
}

Rules:
- Return exactly 3 drafts, no more, no less
- Prioritize Revenue Operations, Marketing Operations, Solutions Architect, and GTM systems roles
- Companies should be realistic B2B SaaS, MarTech, CRM, or enterprise software firms (e.g. HubSpot, Clari, Gong, Workato, Adobe, Salesforce ecosystem partners)
- Mix senior IC and director-level roles appropriate for 17+ years experience
- briefJd should reference Salesforce, Marketo, marketing automation, or RevOps where relevant
- searchQuery should help them find a live posting
- Do not use corporate trial / enterprise pipeline jargon`;
}

function normalizeDrafts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const d = item;
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
    .filter(Boolean)
    .slice(0, 3);
}

async function suggestDrafts(seed) {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");

  const google = createGoogleGenerativeAI({ apiKey });
  const modelIds = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
  const resumeText = resumeSectionsToText(seed.resume.sections);
  const prompt = buildSuggestPrompt({
    resumeText,
    targetRoles: seed.profile?.targetRoles || [],
    industry: seed.profile?.targetIndustry || "",
  });

  let lastError;
  for (const modelId of modelIds) {
    try {
      const { text } = await generateText({
        model: google(modelId),
        prompt,
        maxOutputTokens: 4000,
        maxRetries: 1,
      });
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      const drafts = normalizeDrafts(parsed.drafts);
      if (drafts.length >= 3) return drafts;
      lastError = new Error(`Model ${modelId} returned ${drafts.length} drafts`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Could not generate 3 draft suggestions");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.data) {
    console.log("Usage: node scripts/suggest-jobs.mjs --data <seed.json> [--out <output.json>]");
    process.exit(args.help ? 0 : 1);
  }

  const seed = JSON.parse(readFileSync(resolve(process.cwd(), args.data), "utf8"));
  const drafts = await suggestDrafts(seed);

  const applications = drafts.map((draft) => ({
    company: draft.company,
    role: draft.role,
    status: "draft",
    orgType: "enterprise",
    location: "Remote",
    remote: true,
    jobDescription: draft.briefJd,
    notes: [draft.reason, draft.searchQuery ? `Search: ${draft.searchQuery}` : ""]
      .filter(Boolean)
      .join("\n\n"),
    jobUrl: "",
  }));

  const output = {
    profile: seed.profile,
    applications,
  };

  const outPath = args.out || args.data.replace(/\.json$/, "-jobs.json");
  writeFileSync(resolve(process.cwd(), outPath), JSON.stringify(output, null, 2) + "\n");

  console.log(`Suggested ${applications.length} draft applications:`);
  applications.forEach((app, i) => {
    console.log(`  ${i + 1}. ${app.role} @ ${app.company}`);
  });
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error("\nError:", err.message || err);
  process.exit(1);
});
