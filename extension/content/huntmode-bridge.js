import { MESSAGE_TYPES } from "../lib/constants.js";
import { getQueue, removeUrls } from "../lib/queue.js";

function postQueueToPage() {
  getQueue().then((items) => {
    window.postMessage({ type: MESSAGE_TYPES.EXTENSION_QUEUE, items }, window.location.origin);
  });
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === MESSAGE_TYPES.CLEAR_URLS && Array.isArray(event.data.urls)) {
    removeUrls(event.data.urls).then(() => postQueueToPage());
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MESSAGE_TYPES.GET_QUEUE) {
    getQueue().then((items) => sendResponse({ items }));
    return true;
  }
  if (message?.type === MESSAGE_TYPES.CLEAR_URLS && Array.isArray(message.urls)) {
    import("../lib/queue.js").then(({ removeUrls }) => {
      removeUrls(message.urls).then((items) => {
        postQueueToPage();
        sendResponse({ items });
      });
    });
    return true;
  }
  return false;
});

postQueueToPage();
setTimeout(postQueueToPage, 500);
setTimeout(postQueueToPage, 2000);
