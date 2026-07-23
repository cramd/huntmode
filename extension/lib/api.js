import { HUNTMODE_BASE, AUTH_STORAGE_KEY } from "./constants.js";

export async function getAuthSession() {
  const data = await chrome.storage.session.get(AUTH_STORAGE_KEY);
  return data[AUTH_STORAGE_KEY] || null;
}

export async function setAuthSession(session) {
  await chrome.storage.session.set({ [AUTH_STORAGE_KEY]: session });
}

export async function clearAuthSession() {
  await chrome.storage.session.remove(AUTH_STORAGE_KEY);
}

export function getConnectUrl(extensionId) {
  const ext = extensionId || chrome.runtime.id;
  return `${HUNTMODE_BASE}/extension/connect?ext=${encodeURIComponent(ext)}`;
}

export async function addApplicationFromUrl(url, pageTitle) {
  const auth = await getAuthSession();
  if (!auth?.token) {
    return { ok: false, error: "not_connected" };
  }

  const res = await fetch(`${HUNTMODE_BASE}/api/applications/from-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ url, pageTitle }),
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    await clearAuthSession();
    return { ok: false, error: "not_connected" };
  }
  if (!res.ok) {
    return { ok: false, error: data.error || "Request failed" };
  }
  return { ok: true, duplicate: Boolean(data.duplicate), data };
}
