/** Shared message types between HuntMode web app and the Chrome extension content script. */
export const EXTENSION_MESSAGE_TYPES = {
  EXTENSION_QUEUE: "HUNTMODE_EXTENSION_QUEUE",
  CLEAR_URLS: "HUNTMODE_CLEAR_URLS",
} as const;

export const EXTENSION_IMPORT_DISMISS_KEY = "huntmode:extension-import-dismissed";

export type ExtensionQueuedRole = {
  url: string;
  pageTitle?: string;
  addedAt: string;
};
