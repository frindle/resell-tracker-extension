// Passive Amazon order-page capture.
//
// This script only READS the DOM of the Amazon page the user has opened in
// their own browser and hands a cleaned copy to the background worker. It never
// fetches, opens, navigates, clicks or prefetches anything, and it injects no
// UI into the page. Sign-in, CAPTCHA and block pages are ignored.
import { classifyAmazonUrl, cleanDocumentHtml, hashString, isBlockedPage, byteLength, MAX_CLEAN_BYTES } from '../lib/amazonCapture';

const QUIET_MS = 1500;      // wait for the DOM to stop changing
const MAX_WAIT_MS = 15000;  // give up waiting for late rendering

let lastHandledUrl = '';
let timer: ReturnType<typeof setTimeout> | null = null;
let deadline = 0;

function capture() {
  const url = location.href;
  const kind = classifyAmazonUrl(url);
  if (isBlockedPage(document)) {
    // Nothing from the page is sent; the worker only learns "blocked" so a
    // Sync now run can stop and leave the tab for the user.
    console.log('[Resell Tracker] Amazon page looks like a sign-in or block page; nothing sent.');
    chrome.runtime.sendMessage({ type: 'AMAZON_PAGE_BLOCKED' }).catch(() => {});
    return;
  }
  if (!kind) return;
  const html = cleanDocumentHtml(document);
  if (byteLength(html) > MAX_CLEAN_BYTES) {
    console.log('[Resell Tracker] Amazon page too large after cleaning; skipped.');
    chrome.runtime.sendMessage({ type: 'AMAZON_PAGE_SKIPPED', reason: 'too_large' }).catch(() => {});
    return;
  }
  chrome.runtime.sendMessage({ type: 'AMAZON_PAGE_CAPTURE', url, kind, html, hash: hashString(html) }).catch(() => {});
}

function schedule() {
  const url = location.href;
  if (url === lastHandledUrl) return;
  if (!deadline) deadline = Date.now() + MAX_WAIT_MS;
  if (timer) clearTimeout(timer);
  const remaining = Math.max(0, deadline - Date.now());
  timer = setTimeout(() => {
    timer = null;
    deadline = 0;
    lastHandledUrl = location.href;
    capture();
  }, Math.min(QUIET_MS, remaining));
}

function onUrlMaybeChanged() {
  if (location.href !== lastHandledUrl) {
    deadline = 0;
    schedule();
  }
}

const observer = new MutationObserver(() => {
  if (location.href !== lastHandledUrl) schedule();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', onUrlMaybeChanged);
window.addEventListener('hashchange', onUrlMaybeChanged);
// SPA soft navigation that mutates nothing observable still changes the URL.
setInterval(onUrlMaybeChanged, 2000);
schedule();
