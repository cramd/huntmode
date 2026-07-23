import { MESSAGE_TYPES, HUNTMODE_BASE } from "../lib/constants.js";

const authStatus = document.getElementById("auth-status");
const queueList = document.getElementById("queue-list");
const queueCount = document.getElementById("queue-count");
const emptyQueue = document.getElementById("empty-queue");
const statusEl = document.getElementById("status");

function showStatus(text, isError = false) {
  statusEl.hidden = false;
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

async function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

async function refreshAuth() {
  const { auth } = await send(MESSAGE_TYPES.GET_AUTH);
  if (auth?.token) {
    authStatus.textContent = "Connected to HuntMode";
  } else {
    authStatus.textContent = "Not connected — connect to add drafts immediately";
  }
}

async function refreshQueue() {
  const { items } = await send(MESSAGE_TYPES.GET_QUEUE);
  const queue = items || [];
  queueCount.textContent = queue.length ? `(${queue.length})` : "";
  queueList.innerHTML = "";
  emptyQueue.hidden = queue.length > 0;

  for (const item of queue) {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = item.pageTitle || item.url;
    li.appendChild(link);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      await send(MESSAGE_TYPES.REMOVE_URLS, { urls: [item.url] });
      await refreshQueue();
    });
    li.appendChild(removeBtn);
    queueList.appendChild(li);
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

document.getElementById("save-tab").addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.url) return showStatus("No URL on this tab", true);
  const result = await send(MESSAGE_TYPES.ADD_TO_QUEUE, {
    entry: { url: tab.url, pageTitle: tab.title },
  });
  if (result.added) {
    showStatus("Saved to queue");
  } else if (result.reason === "duplicate") {
    showStatus("Already in queue");
  } else {
    showStatus("Could not save URL", true);
  }
  await refreshQueue();
});

document.getElementById("add-now").addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.url) return showStatus("No URL on this tab", true);
  const result = await send(MESSAGE_TYPES.ADD_NOW, {
    url: tab.url,
    pageTitle: tab.title,
  });
  if (result.ok) {
    if (result.duplicate) {
      showStatus("Already in your hunt");
    } else {
      showStatus(`Draft added: ${result.data?.role || "role"} at ${result.data?.company || "company"}`);
    }
    await refreshQueue();
    return;
  }
  if (result.error === "not_connected") {
    chrome.tabs.create({ url: `${HUNTMODE_BASE}/extension/connect?ext=${chrome.runtime.id}` });
    showStatus("Connect HuntMode first", true);
    return;
  }
  showStatus(result.error || "Failed to add", true);
});

document.getElementById("connect").addEventListener("click", () => {
  chrome.tabs.create({ url: `${HUNTMODE_BASE}/extension/connect?ext=${chrome.runtime.id}` });
});

document.getElementById("open-app").addEventListener("click", () => {
  chrome.tabs.create({ url: `${HUNTMODE_BASE}/dashboard` });
});

refreshAuth();
refreshQueue();
