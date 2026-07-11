import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query } = body as { query?: string };
  if (!query?.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await adminAuth.verifyIdToken(authHeader.substring(7));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jinaUrl = `https://s.jina.ai/${encodeURIComponent(query)}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    const jinaKey = process.env.JINA_API_KEY;
    if (jinaKey) headers["Authorization"] = `Bearer ${jinaKey}`;

    const res = await fetch(jinaUrl, { headers });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Search service unavailable. Try opening the search links manually." },
        { status: 502 }
      );
    }

    const json = await res.json();

    // Jina search returns { data: [{ title, url, description }] }
    const results = (json.data || [])
      .slice(0, 5)
      .map((item: { title?: string; url?: string; description?: string }) => ({
        title: item.title || "",
        url: item.url || "",
        snippet: item.description || "",
      }))
      .filter((r: { url: string }) => r.url);

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[search-jobs] error:", err);
    return NextResponse.json(
      { error: "Search failed. Try opening the search links manually." },
      { status: 500 }
    );
  }
}
