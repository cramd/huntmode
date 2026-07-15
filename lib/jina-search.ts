export interface JinaSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchJobsWithJina(
  query: string,
  limit = 5
): Promise<JinaSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const jinaUrl = `https://s.jina.ai/${encodeURIComponent(trimmed)}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const jinaKey = process.env.JINA_API_KEY;
  if (jinaKey) headers.Authorization = `Bearer ${jinaKey}`;

  const res = await fetch(jinaUrl, { headers });
  if (!res.ok) {
    throw new Error("Search service unavailable");
  }

  const json = await res.json();
  return (json.data || [])
    .slice(0, limit)
    .map((item: { title?: string; url?: string; description?: string }) => ({
      title: item.title || "",
      url: item.url || "",
      snippet: item.description || "",
    }))
    .filter((r: JinaSearchResult) => r.url);
}
