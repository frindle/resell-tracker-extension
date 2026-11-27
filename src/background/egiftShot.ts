// Card photos for SCRAPE_EGIFT: a JPEG of the card on the print page, taken through the debugger
// protocol so the run's tab can stay in the background (captureVisibleTab only sees the tab on
// screen). The photo shows the code, so it is a secret like the code: it goes only to the tracker,
// never into a log or the run's result. A photo that cannot be taken is skipped; the card is still saved.

import { cardRect } from '../lib/egiftPage';

const SHOT_TIMEOUT_MS = 12_000;
/** The tracker keeps images up to 4 MB (lib/egiftScrape.ts); base64 is 4/3 of that. */
const MAX_B64 = 5_400_000;
const READY_TRIES = 5;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function within<T>(p: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([p, sleep(ms).then(() => 'timeout' as const)]);
}

type Shot = { data?: string };

/**
 * One camera per run, on the print-page tab. The debugger is attached on the first photo and
 * detached by close(). If a background capture never returns (a hidden tab that paints no frames),
 * the rest of the run brings the tab forward for each photo and gives focus back to the tab that
 * had it. If the user cancels the debugger bar, no more photos are taken.
 */
export function cardCamera(tabId: number) {
  const target: chrome.debugger.Debuggee = { tabId };
  let attached = false;
  let off = typeof chrome.debugger?.attach !== 'function';
  let bringForward = false;
  const onDetach = (src: chrome.debugger.Debuggee, reason: string) => {
    if (src.tabId !== tabId) return;
    attached = false;
    if (reason === 'canceled_by_user') off = true;
  };

  async function capture(rect: Awaited<ReturnType<typeof locate>>): Promise<string | null | 'timeout'> {
    const params = rect
      ? { format: 'jpeg', quality: 85, captureBeyondViewport: true, clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 } }
      : { format: 'jpeg', quality: 85 };
    const r = await within(chrome.debugger.sendCommand(target, 'Page.captureScreenshot', params) as Promise<Shot>, SHOT_TIMEOUT_MS);
    if (r === 'timeout') return 'timeout';
    const data = r?.data;
    return typeof data === 'string' && data.length > 100 && data.length <= MAX_B64 ? data : null;
  }

  async function locate(selector: string) {
    let rect: ReturnType<typeof cardRect> = null;
    for (let i = 0; i < READY_TRIES; i++) {
      rect = (await chrome.scripting.executeScript({ target: { tabId }, func: cardRect, args: [selector] }))[0]?.result ?? null;
      if (!rect || rect.ready) break;
      await sleep(1000);
    }
    return rect;
  }

  async function forward<T>(fn: () => Promise<T>): Promise<T> {
    const tab = await chrome.tabs.get(tabId);
    const [prev] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
    await chrome.tabs.update(tabId, { active: true });
    try {
      await sleep(400);
      return await fn();
    } finally {
      if (prev?.id != null && prev.id !== tabId) await chrome.tabs.update(prev.id, { active: true }).catch(() => {});
    }
  }

  return {
    /** Base64 JPEG of the card (the element `selector` names, else the visible page), or null. */
    async shoot(selector: string): Promise<string | null> {
      if (off) return null;
      try {
        if (!attached) {
          await chrome.debugger.attach(target, '1.3');
          attached = true;
          chrome.debugger.onDetach.addListener(onDetach);
        }
        const rect = await locate(selector);
        if (!bringForward) {
          const shot = await capture(rect);
          if (shot !== 'timeout') return shot;
          bringForward = true;
        }
        const shot = await forward(() => capture(rect));
        if (shot === 'timeout') { off = true; return null; }
        return shot;
      } catch {
        return null;
      }
    },
    async close(): Promise<void> {
      chrome.debugger?.onDetach?.removeListener(onDetach);
      if (attached) await chrome.debugger.detach(target).catch(() => {});
      attached = false;
    },
  };
}
