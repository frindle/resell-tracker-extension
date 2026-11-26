// Passive Amazon order-page capture.
//
// This script only READS the DOM of the Amazon page the user has opened in
// their own browser and hands a cleaned copy to the background worker. It never
// fetches, opens, navigates, clicks or prefetches anything, and it injects no
// UI into the page. Sign-in, CAPTCHA and block pages are ignored.
//
// During a Sync run the worker also asks this script to read the page now
// (AMAZON_CAPTURE_NOW): a hidden page's timers are slowed by the browser, so
// the timer below could fire after the run had given up on the page.
import { classifyAmazonUrl, cleanDocumentHtml, hashString, isBlockedPage, byteLength, MAX_CLEAN_BYTES } from '../lib/amazonCapture';
import { mayReadNow, type CaptureState, type PokeReply } from '../lib/capturePoke';

const QUIET_MS = 1500;      // wait for the DOM to stop changing
const MAX_WAIT_MS = 15000;  // give up waiting for late rendering
const MAX_RESENDS = 2;      // tries again when the worker did not get the page

// One per loaded document, so the worker can tell this page from the one before it.
const PAGE_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

let lastHandledUrl = '';
let lastState: CaptureState | null = null;
let lastMutationAt = Date.now();
let timer: ReturnType<typeof setTimeout> | null = null;
let deadline = 0;
let failUrl = '';
let sendFails = 0;

// The worker never got the page (it was restarting): let this URL be read again, a couple of times.
function sendFailed(url: string) {
  if (location.href !== url || lastHandledUrl !== url) return;
  if (failUrl !== url) { failUrl = url; sendFails = 0; }
  if (sendFails >= MAX_RESENDS) return;
  sendFails += 1;
  lastHandledUrl = '';
  lastState = null;
  schedule();
}

function capture(): CaptureState {
  const url = location.href;
  const kind = classifyAmazonUrl(url);
  if (isBlockedPage(document)) {
    // Nothing from the page is sent; the worker only learns "blocked" so a
    // Sync now run can stop and leave the tab for the user.
    console.log('[Resell Tracker] Amazon page looks like a sign-in or block page; nothing sent.');
    chrome.runtime.sendMessage({ type: 'AMAZON_PAGE_BLOCKED', pageId: PAGE_ID }).catch(() => {});
    return 'blocked';
  }
  if (!kind) return 'unrecognised';
  const html = cleanDocumentHtml(document);
  if (byteLength(html) > MAX_CLEAN_BYTES) {
    console.log('[Resell Tracker] Amazon page too large after cleaning; skipped.');
    chrome.runtime.sendMessage({ type: 'AMAZON_PAGE_SKIPPED', reason: 'too_large', pageId: PAGE_ID }).catch(() => {});
    return 'too_large';
  }
  chrome.runtime.sendMessage({ type: 'AMAZON_PAGE_CAPTURE', url, kind, html, hash: hashString(html), pageId: PAGE_ID }).catch(() => sendFailed(url));
  return 'sent';
}

/** Reads the page once for its current URL and remembers what happened. */
function handleNow(): CaptureState {
  if (timer) { clearTimeout(timer); timer = null; }
  deadline = 0;
  lastHandledUrl = location.href;
  lastState = capture();
  return lastState;
}

function schedule() {
  const url = location.href;
  if (url === lastHandledUrl) return;
  if (!deadline) deadline = Date.now() + MAX_WAIT_MS;
  if (timer) clearTimeout(timer);
  const remaining = Math.max(0, deadline - Date.now());
  timer = setTimeout(handleNow, Math.min(QUIET_MS, remaining));
}

function onUrlMaybeChanged() {
  if (location.href !== lastHandledUrl) {
    deadline = 0;
    schedule();
  }
}

const observer = new MutationObserver(() => {
  lastMutationAt = Date.now();
  if (location.href !== lastHandledUrl) schedule();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', onUrlMaybeChanged);
window.addEventListener('hashchange', onUrlMaybeChanged);
// SPA soft navigation that mutates nothing observable still changes the URL.
setInterval(onUrlMaybeChanged, 2000);
schedule();

// The worker's ask during a run. Answers at once; the page itself is sent the
// usual way (AMAZON_PAGE_CAPTURE). Only the worker can send this.
chrome.runtime.onMessage.addListener((msg: { type?: string; force?: boolean; forceAny?: boolean } | undefined, _sender, sendResponse) => {
  if (msg?.type !== 'AMAZON_CAPTURE_NOW') return undefined;
  const reply = (state: PokeReply['state']): PokeReply => ({ state, pageId: PAGE_ID, path: location.pathname });
  if (location.href === lastHandledUrl && lastState) { sendResponse(reply(lastState)); return undefined; }
  const ready = mayReadNow({ readyState: document.readyState, quietForMs: Date.now() - lastMutationAt, quietMs: QUIET_MS, force: msg.force, forceAny: msg.forceAny });
  if (!ready) { sendResponse(reply('busy')); return undefined; }
  sendResponse(reply(handleNow()));
  return undefined;
});
