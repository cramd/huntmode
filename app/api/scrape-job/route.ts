import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { withModelFallback, AIProvider } from "@/lib/ai";
import { generateObject } from "ai";
import { z } from "zod";
import { trackTokenUsage } from "@/lib/cost-tracker";

type FetchSource = "greenhouse" | "lever" | "ashby" | "workday" | "direct" | "jina";

const DIRECT_FETCH_TIMEOUT_MS = 8_000;
const JINA_FETCH_TIMEOUT_MS = 20_000;
const ATS_SOURCES: FetchSource[] = ["greenhouse", "lever", "ashby", "workday"];

interface JobMeta {
  company?: string;
  role?: string;
  location?: string;
  salaryRange?: string;
  remote?: boolean;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, provider, apiKey } = body as {
    url?: string;
    provider?: string;
    apiKey?: string;
  };

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
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
      console.error("[scrape-job] Auth verification failed:", err);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(`[scrape-job] Fetching: ${url}`);

  try {
    let text = "";
    let fetchSource: FetchSource = "direct";
    let atsMeta: JobMeta = {};

    // 1. Greenhouse API — SPA shells (e.g. jobs.elastic.co) only render nav in HTML/Jina
    const ghRef = parseGreenhouseRef(url);
    if (ghRef) {
      console.log(`[scrape-job] Trying Greenhouse API board=${ghRef.boardToken} jobId=${ghRef.jobId}`);
      const ghResult = await fetchGreenhouseJob(ghRef.boardToken, ghRef.jobId);
      if (ghResult) {
        text = ghResult.text;
        fetchSource = "greenhouse";
        atsMeta = ghResult;
        console.log(
          `[scrape-job] Greenhouse OK — role="${ghResult.role}" textLen=${text.length}`
        );
      } else {
        console.log("[scrape-job] Greenhouse API returned no usable content");
      }
    }

    // 2. Lever API
    if (!text) {
      const leverRef = parseLeverRef(url);
      if (leverRef) {
        console.log(
          `[scrape-job] Trying Lever API company=${leverRef.company} posting=${leverRef.postingId}`
        );
        const leverResult = await fetchLeverJob(leverRef.company, leverRef.postingId);
        if (leverResult) {
          text = leverResult.text;
          fetchSource = "lever";
          atsMeta = leverResult;
          console.log(
            `[scrape-job] Lever OK — role="${leverResult.role}" textLen=${text.length}`
          );
        } else {
          console.log("[scrape-job] Lever API returned no usable content");
        }
      }
    }

    // 3. Ashby API
    if (!text) {
      const ashbyRef = parseAshbyRef(url);
      if (ashbyRef) {
        console.log(
          `[scrape-job] Trying Ashby API company=${ashbyRef.company} jobId=${ashbyRef.jobId}`
        );
        const ashbyResult = await fetchAshbyJob(ashbyRef.company, ashbyRef.jobId);
        if (ashbyResult) {
          text = ashbyResult.text;
          fetchSource = "ashby";
          atsMeta = ashbyResult;
          console.log(
            `[scrape-job] Ashby OK — role="${ashbyResult.role}" textLen=${text.length}`
          );
        } else {
          console.log("[scrape-job] Ashby API returned no usable content");
        }
      }
    }

    // 4. Workday CXS API
    if (!text) {
      const workdayRef = parseWorkdayRef(url);
      if (workdayRef) {
        console.log(
          `[scrape-job] Trying Workday API tenant=${workdayRef.tenant} site=${workdayRef.site}`
        );
        const workdayResult = await fetchWorkdayJob(workdayRef);
        if (workdayResult) {
          text = workdayResult.text;
          fetchSource = "workday";
          atsMeta = workdayResult;
          console.log(
            `[scrape-job] Workday OK — role="${workdayResult.role}" textLen=${text.length}`
          );
        } else {
          console.log("[scrape-job] Workday API returned no usable content");
        }
      }
    }

    // 5. Generic gh_jid — discover Greenhouse board token from page HTML
    if (!text && /[?&]gh_jid=\d+/i.test(url)) {
      const ghJidRef = await resolveGhJidGreenhouseRef(url);
      if (ghJidRef) {
        console.log(
          `[scrape-job] Trying discovered Greenhouse API board=${ghJidRef.boardToken} jobId=${ghJidRef.jobId}`
        );
        const ghResult = await fetchGreenhouseJob(ghJidRef.boardToken, ghJidRef.jobId);
        if (ghResult) {
          text = ghResult.text;
          fetchSource = "greenhouse";
          atsMeta = ghResult;
          console.log(
            `[scrape-job] Greenhouse (gh_jid) OK — role="${ghResult.role}" textLen=${text.length}`
          );
        }
      }
    }

    // 6. Direct fetch
    if (!text) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(DIRECT_FETCH_TIMEOUT_MS),
        });

        if (res.ok && !res.url.includes("login") && !res.url.includes("sign_in")) {
          const html = await res.text();
          const extracted = extractTextFromHtml(html);
          const isLoginWall =
            extracted.toLowerCase().includes("please log in") ||
            extracted.toLowerCase().includes("sign in to view") ||
            extracted.toLowerCase().includes("create an account to");
          if (!isLoginWall && extracted.length >= 300 && !isThinJobContent(extracted)) {
            text = extracted;
            fetchSource = "direct";
            console.log(`[scrape-job] Direct fetch OK — textLen=${text.length}`);
          } else {
            console.log(
              `[scrape-job] Direct fetch rejected — len=${extracted.length} loginWall=${isLoginWall} thin=${isThinJobContent(extracted)}`
            );
          }
        }
      } catch (directErr) {
        console.error("[scrape-job] Direct fetch failed:", directErr);
      }
    }

    // 7. Jina Reader fallback
    if (!text) {
      try {
        const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
        const jinaHeaders: Record<string, string> = {
          Accept: "text/plain",
          "X-Return-Format": "text",
        };
        const jinaKey = process.env.JINA_API_KEY;
        if (jinaKey) jinaHeaders["Authorization"] = `Bearer ${jinaKey}`;

        console.log("[scrape-job] Trying Jina Reader fallback");
        const jinaRes = await fetch(jinaUrl, {
          headers: jinaHeaders,
          signal: AbortSignal.timeout(JINA_FETCH_TIMEOUT_MS),
        });
        if (jinaRes.ok) {
          const raw = await jinaRes.text();
          const stripped = raw
            .split("\n")
            .filter((line) => !/^(Title:|URL Source:|Published Time:|Markdown Content:|Images:|---)/i.test(line.trim()))
            .join("\n")
            .trim();
          if (stripped.length >= 300 && !isThinJobContent(stripped)) {
            text = stripped.slice(0, 8000);
            fetchSource = "jina";
            console.log(`[scrape-job] Jina OK — textLen=${text.length}`);
          } else {
            console.log(
              `[scrape-job] Jina rejected — len=${stripped.length} thin=${isThinJobContent(stripped)}`
            );
          }
        } else {
          console.log(`[scrape-job] Jina HTTP ${jinaRes.status}`);
        }
      } catch (jinaErr) {
        console.error("[scrape-job] Jina fallback failed:", jinaErr);
      }
    }

    if (!text) {
      const isLoginUrl =
        url.includes("linkedin.com") ||
        url.includes("indeed.com") ||
        url.includes("login") ||
        url.includes("sign_in");

      const errorMsg = isLoginUrl
        ? "This site requires login to view job details. Please open the posting, copy the full description, and paste it in the field below."
        : "Could not fetch the job posting automatically. Please paste the description manually below — AI generation will still work.";

      console.log(`[scrape-job] Failed — no usable content for ${url}`);
      return NextResponse.json({ error: errorMsg }, { status: 422 });
    }

    let parsed: Partial<{
      company: string;
      role: string;
      location: string;
      salaryRange: string;
      remote: boolean;
    }> = { ...atsMeta };
    const isMarc = userEmail === "marcsherwood@gmail.com";
    const hasAtsMeta =
      ATS_SOURCES.includes(fetchSource) && Boolean(text && atsMeta.role);

    if (hasAtsMeta) {
      parsed = { ...parsed, ...parseJobDetails(text, url) };
    } else if (isMarc || (apiKey && apiKey.trim())) {
      try {
        const { result, modelId } = await withModelFallback((provider as AIProvider) || "openai", apiKey, (model) =>
          generateObject({
            model,
            schema: z.object({
              company: z.string().optional(),
              role: z.string().optional(),
              location: z.string().optional(),
              salaryRange: z.string().optional(),
              remote: z.boolean().optional(),
            }),
            maxRetries: 1,
            prompt: `Extract the following details from the job description text below. If a detail is not found or unclear, omit it.

TEXT:
${text}`,
          })
        );
        parsed = { ...parsed, ...result.object };
        if (uid && result.usage) {
          await trackTokenUsage(uid, (provider as AIProvider) || "openai", result.usage.inputTokens || 0, result.usage.outputTokens || 0, {
            feature: "scrape-job",
            modelId,
          });
        }
      } catch (aiErr) {
        console.error("[scrape-job] AI parsing failed:", aiErr);
        parsed = { ...parsed, ...parseJobDetails(text, url) };
      }
    } else {
      parsed = { ...parsed, ...parseJobDetails(text, url) };
    }

    console.log(`[scrape-job] Success source=${fetchSource} textLen=${text.length}`);
    return NextResponse.json({ text, source: fetchSource, ...parsed });
  } catch (err) {
    console.error("[scrape-job] Scrape error:", err);
    return NextResponse.json(
      { error: "Could not fetch the job posting. Try pasting the description manually." },
      { status: 422 }
    );
  }
}

interface GreenhouseRef {
  boardToken: string;
  jobId: string;
}

function parseGreenhouseRef(url: string): GreenhouseRef | null {
  const boardPath = url.match(
    /(?:boards\.greenhouse\.io|job-boards\.greenhouse\.io|job-boards\.eu\.greenhouse\.io)\/([^/?#]+)\/jobs\/(\d+)/i
  );
  if (boardPath) {
    return { boardToken: boardPath[1], jobId: boardPath[2] };
  }

  const ghJid = url.match(/[?&]gh_jid=(\d+)/i)?.[1];
  const elasticPath = url.match(/jobs\.elastic\.co\/.*\/(\d+)\/?(?:\?|#|$)/i);

  if (elasticPath) {
    return { boardToken: "elastic", jobId: elasticPath[1] };
  }
  if (ghJid && /elastic\.co/i.test(url)) {
    return { boardToken: "elastic", jobId: ghJid };
  }

  return null;
}

async function resolveGhJidGreenhouseRef(url: string): Promise<GreenhouseRef | null> {
  const ghJid = url.match(/[?&]gh_jid=(\d+)/i)?.[1];
  if (!ghJid) return null;

  try {
    const html = await fetchPageHtml(url);
    if (!html) return null;
    const boardToken = discoverGreenhouseBoardToken(html);
    if (!boardToken) {
      console.log("[scrape-job] gh_jid present but no Greenhouse board token found in HTML");
      return null;
    }
    return { boardToken, jobId: ghJid };
  } catch (err) {
    console.error("[scrape-job] gh_jid board discovery failed:", err);
    return null;
  }
}

function discoverGreenhouseBoardToken(html: string): string | null {
  const patterns = [
    /boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/i,
    /job-boards\.greenhouse\.io\/([a-z0-9_-]+)\/jobs/i,
    /boards\.greenhouse\.io\/([a-z0-9_-]+)\/jobs/i,
    /boards\.greenhouse\.io\/embed\/job_app\?for=([a-z0-9_-]+)/i,
    /grnhse_app[^"']*for=([a-z0-9_-]+)/i,
    /"boardToken"\s*:\s*"([a-z0-9_-]+)"/i,
    /data-board-token=["']([a-z0-9_-]+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1] && match[1] !== "embed") return match[1];
  }
  return null;
}

interface LeverRef {
  company: string;
  postingId: string;
}

function parseLeverRef(url: string): LeverRef | null {
  const match = url.match(/jobs\.lever\.co\/([^/?#]+)\/([^/?#]+)/i);
  if (!match) return null;
  return { company: match[1], postingId: match[2] };
}

async function fetchLeverJob(
  company: string,
  postingId: string
): Promise<(JobMeta & { text: string }) | null> {
  try {
    const apiUrl = `https://api.lever.co/v0/postings/${company}/${postingId}?mode=json`;
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.log(`[scrape-job] Lever API HTTP ${res.status} for ${apiUrl}`);
      return null;
    }
    const job = (await res.json()) as {
      ok?: boolean;
      text?: string;
      descriptionPlain?: string;
      openingPlain?: string;
      additionalPlain?: string;
      lists?: Array<{ text?: string; content?: string }>;
      categories?: {
        location?: string;
        allLocations?: string[];
        department?: string;
      };
    };
    if (job.ok === false) return null;

    const parts: string[] = [];
    if (job.text) parts.push(job.text);
    if (job.openingPlain) parts.push(job.openingPlain);
    if (job.descriptionPlain) parts.push(job.descriptionPlain);
    for (const list of job.lists || []) {
      if (list.text) parts.push(list.text);
      if (list.content) parts.push(extractTextFromHtml(decodeHtmlEntities(list.content)));
    }
    if (job.additionalPlain) parts.push(job.additionalPlain);

    const text = parts.join("\n\n").trim();
    if (text.length < 200) return null;

    const location =
      job.categories?.location ||
      job.categories?.allLocations?.join(", ") ||
      undefined;

    return {
      text: text.slice(0, 8000),
      company: company.replace(/-/g, " "),
      role: job.text,
      location,
    };
  } catch (err) {
    console.error("[scrape-job] Lever fetch error:", err);
    return null;
  }
}

interface AshbyRef {
  company: string;
  jobId: string;
}

function parseAshbyRef(url: string): AshbyRef | null {
  const match = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)\/([0-9a-f-]{36})/i);
  if (!match) return null;
  return { company: match[1], jobId: match[2] };
}

async function fetchAshbyJob(
  company: string,
  jobId: string
): Promise<(JobMeta & { text: string }) | null> {
  try {
    const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${company}`;
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.log(`[scrape-job] Ashby API HTTP ${res.status} for ${apiUrl}`);
      return null;
    }
    const data = (await res.json()) as {
      jobs?: Array<{
        id?: string;
        title?: string;
        location?: string;
        secondaryLocations?: Array<{ location?: string }>;
        descriptionPlain?: string;
        descriptionHtml?: string;
      }>;
    };
    const job = data.jobs?.find((j) => j.id === jobId);
    if (!job) {
      console.log(`[scrape-job] Ashby job ${jobId} not found on board ${company}`);
      return null;
    }

    let text = job.descriptionPlain || "";
    if (!text && job.descriptionHtml) {
      text = extractTextFromHtml(decodeHtmlEntities(job.descriptionHtml));
    }
    if (text.length < 200) return null;

    const locations = [
      job.location,
      ...(job.secondaryLocations?.map((l) => l.location).filter(Boolean) || []),
    ].filter(Boolean);

    return {
      text: text.slice(0, 8000),
      company: company.replace(/-/g, " "),
      role: job.title,
      location: locations.length ? locations.join(", ") : undefined,
    };
  } catch (err) {
    console.error("[scrape-job] Ashby fetch error:", err);
    return null;
  }
}

interface WorkdayRef {
  tenant: string;
  wdServer: string;
  site: string;
  externalPath: string;
}

function parseWorkdayRef(url: string): WorkdayRef | null {
  const match = url.match(
    /https?:\/\/([^.]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([^/]+)\/job\/([^?#]+)/i
  );
  if (!match) return null;
  return {
    tenant: match[1],
    wdServer: match[2],
    site: match[3],
    externalPath: match[4],
  };
}

function extractSalaryFromDescription(text: string): string | undefined {
  const patterns = [
    /base salary range[^.]*?is\s*\$[\d,]+\s*[-–]\s*\$[\d,]+/i,
    /salary range[^.]*?\$[\d,]+\s*[-–]\s*\$[\d,]+/i,
    /\$[\d,]+\s*[-–]\s*\$[\d,]+(?:\s+with\s+on-target-earnings|\s+OTE)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }
  return undefined;
}

async function fetchWorkdayJob(
  ref: WorkdayRef
): Promise<(JobMeta & { text: string }) | null> {
  try {
    const apiUrl = `https://${ref.tenant}.${ref.wdServer}.myworkdayjobs.com/wday/cxs/${ref.tenant}/${ref.site}/job/${ref.externalPath}`;
    const referer = `https://${ref.tenant}.${ref.wdServer}.myworkdayjobs.com/en-US/${ref.site}`;
    const res = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US",
        Referer: referer,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(DIRECT_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.log(`[scrape-job] Workday API HTTP ${res.status} for ${apiUrl}`);
      return null;
    }

    const data = (await res.json()) as {
      jobPostingInfo?: {
        title?: string;
        jobDescription?: string;
        location?: string;
        additionalLocations?: string[];
      };
      hiringOrganization?: { name?: string };
    };

    const info = data.jobPostingInfo;
    if (!info?.jobDescription) return null;

    let text = info.jobDescription;
    if (/<[a-z][\s\S]*>/i.test(text)) {
      text = extractTextFromHtml(decodeHtmlEntities(text));
    }
    text = text.replace(/\s+/g, " ").trim();
    if (text.length < 200) return null;

    const locations = [
      info.location,
      ...(info.additionalLocations || []),
    ].filter(Boolean);
    const locationStr = locations.length ? locations.join(", ") : undefined;
    const remote = locationStr?.toLowerCase().includes("remote") ?? undefined;

    return {
      text: text.slice(0, 8000),
      role: info.title,
      company: data.hiringOrganization?.name || ref.tenant.replace(/-/g, " "),
      location: locationStr,
      remote,
      salaryRange: extractSalaryFromDescription(text),
    };
  } catch (err) {
    console.error("[scrape-job] Workday fetch error:", err);
    return null;
  }
}

async function fetchPageHtml(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(DIRECT_FETCH_TIMEOUT_MS),
  });
  if (!res.ok || res.url.includes("login") || res.url.includes("sign_in")) return null;
  return res.text();
}

async function fetchGreenhouseJob(
  boardToken: string,
  jobId: string
): Promise<(JobMeta & { text: string }) | null> {
  try {
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}`;
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.log(`[scrape-job] Greenhouse API HTTP ${res.status} for ${apiUrl}`);
      return null;
    }
    const job = (await res.json()) as {
      title?: string;
      company_name?: string;
      content?: string;
      location?: { name?: string };
    };
    if (!job.content || job.content.length < 100) return null;

    const decoded = decodeHtmlEntities(job.content);
    const text = extractTextFromHtml(decoded);
    if (text.length < 200) return null;

    return {
      text: text.slice(0, 8000),
      company: job.company_name,
      role: job.title,
      location: job.location?.name,
    };
  } catch (err) {
    console.error("[scrape-job] Greenhouse fetch error:", err);
    return null;
  }
}

/** Detect nav/footer shells where the job body is JS-rendered (common on Elastic, etc.) */
function isThinJobContent(text: string): boolean {
  const lower = text.toLowerCase();
  const navMarkers = [
    "trademarks",
    "privacy statement",
    "follow us",
    "contact sales",
    "start free trial",
    "terms of use",
    "investor relations",
  ];
  const navHits = navMarkers.filter((m) => lower.includes(m)).length;
  const jobMarkers = [
    "responsibilities",
    "requirements",
    "qualifications",
    "what you will",
    "what you'll",
    "you will be doing",
    "about the role",
    "job description",
    "experience",
  ];
  const jobHits = jobMarkers.filter((m) => lower.includes(m)).length;
  const applyCount = (lower.match(/apply now/g) || []).length;

  if (navHits >= 3 && jobHits < 2) return true;
  if (applyCount >= 2 && navHits >= 2 && text.length < 5000) return true;
  return false;
}

function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ");

  text = text
    .replace(/<\/?(p|div|section|article|li|h[1-6]|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/g, " ");

  text = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 2)
    .join("\n");

  return text.slice(0, 8000);
}

function parseJobDetails(text: string, url: string) {
  const result: { company?: string; role?: string; location?: string } = {};

  const linkedinMatch = url.match(/linkedin\.com\/jobs\/view\/[^/]+-at-([^/\-?]+)/i);
  const greenhouseMatch = url.match(/greenhouse\.io\/([^/]+)\//);
  const leverMatch = url.match(/jobs\.lever\.co\/([^/]+)\//);
  const workableMatch = url.match(/apply\.workable\.com\/([^/]+)\//);

  if (linkedinMatch) result.company = decodeURIComponent(linkedinMatch[1]).replace(/-/g, " ");
  else if (greenhouseMatch) result.company = greenhouseMatch[1].replace(/-/g, " ");
  else if (leverMatch) result.company = leverMatch[1].replace(/-/g, " ");
  else if (workableMatch) result.company = workableMatch[1].replace(/-/g, " ");
  else if (url.includes("elastic.co")) result.company = "Elastic";
  else {
    const workdayMatch = url.match(/https?:\/\/([^.]+)\.wd\d+\.myworkdayjobs\.com/i);
    if (workdayMatch) result.company = workdayMatch[1].replace(/-/g, " ");
  }

  return result;
}
