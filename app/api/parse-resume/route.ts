import { NextRequest } from "next/server";
import { generateText } from "ai";
import { withModelFallback } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";
import type { ProjectEntry } from "@/lib/types";
import { adminAuth } from "@/lib/firebase-admin";
import { trackTokenUsage } from "@/lib/cost-tracker";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const provider = (formData.get("provider") as AIProvider | null) ?? "openai";
  const apiKey = (formData.get("apiKey") as string | null) ?? undefined;

  if (!file) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return Response.json({ error: "File must be a PDF" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  let userEmail = "";
  let uid = "";
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      userEmail = decoded.email || "";
      uid = decoded.uid || "";
    } catch (err) {
      console.error("[parse-resume] Auth verification failed:", err);
    }
  }

  const isMarc = userEmail === "marcsherwood@gmail.com";
  const apiKeyToUse = isMarc ? (apiKey || undefined) : apiKey;

  if (!isMarc && (!apiKeyToUse || !apiKeyToUse.trim())) {
    return Response.json({ error: "No AI API key provided. Please configure your own AI key in Settings." }, { status: 400 });
  }

  // Extract text from PDF
  let rawText: string;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Handle both CJS (.default) and ESM (no .default) builds of pdf-parse
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfModule = await import("pdf-parse") as any;
    const pdfParse = pdfModule.default ?? pdfModule;
    const parsed = await pdfParse(buffer);
    rawText = parsed.text;
  } catch (err) {
    console.error("[parse-resume] PDF parse error:", err);
    return Response.json({ error: "Could not read PDF. Try a text-based PDF (not a scanned image)." }, { status: 422 });
  }

  if (!rawText.trim()) {
    return Response.json(
      { error: "PDF appears to be empty or image-only. Please use a text-based PDF." },
      { status: 422 }
    );
  }

  // Use AI to structure the raw text into resume sections
  const prompt = `You are a resume parser. Extract and structure the following resume text into clearly labelled sections.

RESUME TEXT:
${rawText.slice(0, 12000)}

Return ONLY a valid JSON object with exactly these keys:
{
  "summary": "professional summary or objective (string)",
  "experience": "all work experience entries, preserving company names, titles, dates and bullet points (string)",
  "skills": "all skills, tools, technologies listed (string)",
  "education": "all education entries with institution, degree, and dates (string)",
  "certifications": "any certifications, licenses, or credentials (string, empty string if none)",
  "projects": [
    {
      "name": "project name",
      "url": "project URL or empty string",
      "description": "what the project does and its impact",
      "tech": "comma-separated tech stack or empty string",
      "dates": "date range or empty string"
    }
  ]
}

Rules:
- Preserve real content from the resume, do not invent or alter facts
- Keep line breaks within string sections using \\n
- "projects" must be a JSON array of objects (empty array [] if no projects found)
- Each project object must have all five keys: name, url, description, tech, dates
- Do NOT wrap in markdown code fences
- Output ONLY the raw JSON object, nothing else`;

  try {
    const { text, usage } = await withModelFallback(provider, apiKeyToUse, (model) =>
      generateText({ model, prompt, maxOutputTokens: 4000, maxRetries: 1 })
    );

    if (uid && usage) {
      await trackTokenUsage(uid, provider, usage.inputTokens || 0, usage.outputTokens || 0);
    }

    // Strip any accidental markdown fences the model may add
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[parse-resume] JSON parse failed, raw response:", cleaned.slice(0, 500));
      return Response.json(
        { error: "AI returned malformed JSON. Try again or paste your resume manually." },
        { status: 500 }
      );
    }

    // Normalise string sections
    const stringKeys = ["summary", "experience", "skills", "education", "certifications"];
    for (const key of stringKeys) {
      if (typeof parsed[key] !== "string") parsed[key] = "";
    }

    // Normalise projects array
    let projects: ProjectEntry[] = [];
    if (Array.isArray(parsed.projects)) {
      projects = (parsed.projects as Record<string, unknown>[]).map((p) => ({
        name: typeof p.name === "string" ? p.name : "",
        url: typeof p.url === "string" ? p.url : "",
        description: typeof p.description === "string" ? p.description : "",
        tech: typeof p.tech === "string" ? p.tech : "",
        dates: typeof p.dates === "string" ? p.dates : "",
      })).filter((p) => p.name.trim());
    } else if (typeof parsed.projects === "string" && parsed.projects) {
      // Fallback: model returned a string despite instructions; wrap it as one entry
      projects = [{ name: "Projects", description: parsed.projects as string, url: "", tech: "", dates: "" }];
    }

    const sections = {
      summary: parsed.summary as string,
      experience: parsed.experience as string,
      skills: parsed.skills as string,
      education: parsed.education as string,
      certifications: parsed.certifications as string,
      projects,
    };

    return Response.json({ sections });
  } catch (err: unknown) {
    console.error("[parse-resume] AI error:", err);
    const message = err instanceof Error ? err.message : "AI extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
