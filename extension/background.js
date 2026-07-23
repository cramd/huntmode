import { MESSAGE_TYPES, HUNTMODE_BASE } from "./lib/constants.js";
import { addToQueue, getQueue, removeUrls } from "./lib/queue.js";
import {
  addApplicationFromUrl,
  getAuthSession,
  setAuthSession,
  clearAuthSession,
  getConnectUrl,
} from "./lib/api.js";

const MENU_SAVE = "huntmode-save-queue";
const MENU_ADD = "huntmode-add-now";

function getUrlFromDetails(info, tab) {
  if (info.linkUrl) return info.linkUrl;
  if (tab?.url && !tab.url.startsWith("chrome://")) return tab.url;
  return null;
}

function getTitleFromTab(tab) {
  return tab?.title || undefined;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_SAVE,
    title: "Save to HuntMode queue",
    contexts: ["page", "link"],
  });
  chrome.contextMenus.create({
    id: MENU_ADD,
    title: "Add to HuntMode now",
    contexts: ["page", "link"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = getUrlFromDetails(info, tab);
  if (!url) return;
  const pageTitle = getTitleFromTab(tab);

  if (info.menuItemId === MENU_SAVE) {
    const result = await addToQueue({ url, pageTitle });
    if (result.added) {
      chrome.action.setBadgeText({ text: String((await getQueue()).length) });
      chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
    }
    return;
  }

  if (info.menuItemId === MENU_ADD) {
    const auth = await getAuthSession();
    if (!auth?.token) {
      await addToQueue({ url, pageTitle });
      chrome.tabs.create({ url: getConnectUrl() });
      return;
    }
    const result = await addApplicationFromUrl(url, pageTitle);
    if (result.ok && !result.duplicate) {
      await removeUrls([url]);
      chrome.action.setBadgeText({ text: String((await getQueue()).length) || "" });
    }
    if (result.error === "not_connected") {
      chrome.tabs.create({ url: getConnectUrl() });
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MESSAGE_TYPES.ADD_TO_QUEUE) {
    addToQueue(message.entry)
      .then(async (result) => {
        const queue = await getQueue();
        chrome.action.setBadgeText({ text: queue.length ? String(queue.length) : "" });
        sendResponse({ ...result, queue });
      })
      .catch((err) => sendResponse({ added: false, error: String(err) }));
    return true;
  }

  if (message?.type === MESSAGE_TYPES.GET_QUEUE) {
    getQueue().then((items) => sendResponse({ items }));
    return true;
  }

  if (message?.type === MESSAGE_TYPES.REMOVE_URLS) {
    removeUrls(message.urls || [])
      .then((items) => {
        chrome.action.setBadgeText({ text: items.length ? String(items.length) : "" });
        sendResponse({ items });
      })
      .catch((err) => sendResponse({ error: String(err) }));
    return true;
  }

  if (message?.type === MESSAGE_TYPES.ADD_NOW) {
    addApplicationFromUrl(message.url, message.pageTitle)
      .then(async (result) => {
        if (result.ok && !result.duplicate) {
          await removeUrls([message.url]);
        }
        sendResponse(result);
      })
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === MESSAGE_TYPES.GET_AUTH) {
    getAuthSession().then((auth) => sendResponse({ auth }));
    return true;
  }

  if (message?.type === MESSAGE_TYPES.AUTH_UPDATED) {
    setAuthSession(message.auth)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === "HUNTMODE_DISCONNECT") {
    clearAuthSession().then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type === MESSAGE_TYPES.AUTH_UPDATED && message.auth?.token) {
    setAuthSession(message.auth)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  return false;
});

getQueue().then((items) => {
  if (items.length) {
    chrome.action.setBadgeText({ text: String(items.length) });
    chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
  }
});
