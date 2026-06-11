import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${res.status} ${res.statusText}` },
        { status: 422 }
      );
    }

    const html = await res.text();
    const text = extractTextFromHtml(html);

    // Try to extract structured job details
    const parsed = parseJobDetails(text, url);

    return NextResponse.json({ text, ...parsed });
  } catch (err) {
    console.error("Scrape error:", err);
    return NextResponse.json(
      { error: "Could not fetch the job posting. Try pasting the description manually." },
      { status: 422 }
    );
  }
}

function extractTextFromHtml(html: string): string {
  // Remove script and style tags with their content
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ");

  // Convert block elements to newlines
  text = text
    .replace(/<\/?(p|div|section|article|li|h[1-6]|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/g, " ");

  // Clean up whitespace
  text = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 2)
    .join("\n");

  // Trim to reasonable size for AI context
  return text.slice(0, 8000);
}

function parseJobDetails(text: string, url: string) {
  const result: { company?: string; role?: string; location?: string } = {};

  // Try to detect company from common job board URL patterns
  const linkedinMatch = url.match(/linkedin\.com\/jobs\/view\/[^/]+-at-([^/\-?]+)/i);
  const greenhouseMatch = url.match(/greenhouse\.io\/([^/]+)\//);
  const leverMatch = url.match(/jobs\.lever\.co\/([^/]+)\//);
  const workableMatch = url.match(/apply\.workable\.com\/([^/]+)\//);

  if (linkedinMatch) result.company = decodeURIComponent(linkedinMatch[1]).replace(/-/g, " ");
  else if (greenhouseMatch) result.company = greenhouseMatch[1].replace(/-/g, " ");
  else if (leverMatch) result.company = leverMatch[1].replace(/-/g, " ");
  else if (workableMatch) result.company = workableMatch[1].replace(/-/g, " ");

  return result;
}
