import { QUEUE_STORAGE_KEY } from "./constants.js";

export function normalizeJobUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

export async function getQueue() {
  const data = await chrome.storage.local.get(QUEUE_STORAGE_KEY);
  const items = data[QUEUE_STORAGE_KEY];
  return Array.isArray(items) ? items : [];
}

export async function saveQueue(items) {
  await chrome.storage.local.set({ [QUEUE_STORAGE_KEY]: items });
}

export async function addToQueue(entry) {
  const queue = await getQueue();
  const normalized = normalizeJobUrl(entry.url);
  if (!normalized) return { added: false, reason: "invalid_url" };
  if (queue.some((item) => normalizeJobUrl(item.url) === normalized)) {
    return { added: false, reason: "duplicate" };
  }
  const item = {
    url: entry.url.trim(),
    pageTitle: entry.pageTitle?.trim() || undefined,
    addedAt: new Date().toISOString(),
  };
  queue.unshift(item);
  await saveQueue(queue);
  return { added: true, item };
}

export async function removeUrls(urls) {
  const toRemove = new Set(urls.map(normalizeJobUrl));
  const queue = await getQueue();
  const next = queue.filter((item) => !toRemove.has(normalizeJobUrl(item.url)));
  await saveQueue(next);
  return next;
}
