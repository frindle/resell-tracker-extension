// SCRAPE_EGIFT: opens an order's Costco eGift delivery link in a background tab, enters the delivery
// email, reads each card and posts it to the tracker. Every tab it opened is closed. Card numbers,
// PINs, the email and the link are never logged or reported: the result is counts only.
//
// The portal (mapped 2026-10-05): find-order form (email #p2, "View Digital Code" #submitBtn) ->
// redemption page (one section per card, "Access eGift") -> print page, usually in a NEW tab, with a
// pager ("N of M" #wdt-page-counter, Next input[id$=wdt-nav-next]) and the code in a cell labelled
// "Code:". Selectors, labels, regexes and timeouts come from the tracker's scrape config
// (site "costcoEgift"), so a page change ships as a tracker deploy, not an extension release.

import {
  EGIFT_HOSTS, MAX_CARDS, egiftErrorCode, egiftPostBody, egiftReport, isAllowedEgiftLink, parseEgiftInfo, readCard, titleFor,
  type EgiftCard, type EgiftCounts, type EgiftFailure, type EgiftOpened, type EgiftReport, type EgiftStep,
} from '../lib/egiftCommand';
import { clickNext, clickOpen, enterEmail, keepInTab, pageText, settings, type PageCfg, type Settings } from '../lib/egiftPage';
import { cardCamera } from './egiftShot';

const KEEPALIVE_MS = 20_000;

let running = false;
export function egiftRunActive(): boolean { return running; }

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ---- background side ----

type PageState = NonNullable<Awaited<ReturnType<typeof read>>>;
async function read(tabId: number, c: PageCfg) {
  const res = await chrome.scripting.executeScript({ target: { tabId }, func: pageText, args: [c] });
  return res[0]?.result ?? null;
}

/** Polls until `ok`; on a timeout `hit` is null and `last` is the last state read (for the failure reason). */
async function waitFor(tabId: number, cfg: Settings, ok: (s: PageState) => boolean, waitMs = cfg.waitMs): Promise<{ hit: PageState | null; last: PageState | null }> {
  const deadline = Date.now() + waitMs;
  let last: PageState | null = null;
  while (Date.now() < deadline) {
    await sleep(cfg.pollMs);
    try {
      const s = await read(tabId, cfg.page);
      if (s) { last = s; if (ok(s)) return { hit: s, last }; }
    } catch { /* still loading or navigating */ }
  }
  return { hit: null, last };
}

const timedOut = (last: PageState | null, otherwise: EgiftFailure): EgiftFailure => (last?.botCheck ? 'bot-check' : otherwise);

function hostOf(url: string | undefined): string {
  try { return url ? new URL(url).hostname.toLowerCase() : ''; } catch { return ''; }
}

/**
 * Records tabs created after Access eGift is clicked. `portal` lists the ones the portal opened (the
 * run's tab is their opener, or they are on the portal host), the only ones the run reads or closes:
 * a tab the user opened meanwhile is never touched.
 */
function watchNewTabs(openerId: number) {
  const seen = new Set<number>();
  const onCreated = (t: chrome.tabs.Tab) => { if (t.id != null && t.id !== openerId) seen.add(t.id); };
  chrome.tabs.onCreated.addListener(onCreated);
  return {
    stop: () => chrome.tabs.onCreated.removeListener(onCreated),
    async portal(): Promise<number[]> {
      const out: number[] = [];
      for (const id of [...seen]) {
        try {
          const t = await chrome.tabs.get(id);
          if (t.openerTabId === openerId || EGIFT_HOSTS.includes(hostOf(t.pendingUrl || t.url))) out.push(id);
        } catch { seen.delete(id); }
      }
      return out;
    },
  };
}

type Fetcher = typeof fetch;

/**
 * Runs the whole command for one order. `base` and `headers` are the tracker address and the same
 * auth headers the other /api/extension calls use.
 */
export async function runEgiftOrder(base: string, headers: Record<string, string>, orderId: number, doFetch: Fetcher = fetch): Promise<EgiftReport> {
  if (running) return egiftReport(0, 0, 'run-busy');
  running = true;
  const keep = setInterval(() => { chrome.runtime.getPlatformInfo().catch(() => {}); }, KEEPALIVE_MS);
  const cfg = settings();
  let tabId: number | undefined;
  let tabs: ReturnType<typeof watchNewTabs> | null = null;
  let cards = 0;
  let saved = 0;
  let failure: EgiftFailure | null = null;
  let opened: EgiftOpened | undefined;
  let camera: ReturnType<typeof cardCamera> | null = null;
  const counts: Required<EgiftCounts> = { images: 0, named: 0, mismatched: 0 };
  let step: EgiftStep = 'info';
  const card = (s: PageState): EgiftCard | null => readCard(s, cfg.pats);
  try {
    const res = await doFetch(`${base}/api/extension/egift?orderId=${orderId}`, { headers, cache: 'no-store' });
    if (!res.ok) return egiftReport(0, 0, `info-http-${res.status}`);
    const info = parseEgiftInfo(await res.json().catch(() => null));
    if (!info) return egiftReport(0, 0, 'no-link');
    if (!isAllowedEgiftLink(info.link)) return egiftReport(0, 0, 'link-rejected');

    step = 'tab';
    const tab = await chrome.tabs.create({ url: info.link, active: false });
    tabId = tab.id;
    if (tabId == null) return egiftReport(0, 0, 'error-tab');

    // The portal asks for the address used at Costco before it shows the order.
    step = 'page';
    const first = await waitFor(tabId, cfg, s => s.hasEmail || s.hasOpen || s.alert || !!card(s));
    if (!first.hit) return egiftReport(0, 0, timedOut(first.last, 'page-timeout'));
    if (first.hit.hasEmail && !first.hit.hasOpen && !card(first.hit)) {
      step = 'email';
      await chrome.scripting.executeScript({ target: { tabId }, func: enterEmail, args: [info.email, cfg.submit] });
      await sleep(cfg.stepDelayMs);
    }
    step = 'page';
    const list = await waitFor(tabId, cfg, s => s.hasOpen || s.alert || !!card(s));
    if (!list.hit) return egiftReport(0, 0, timedOut(list.last, list.last?.hasEmail ? 'email-no-response' : 'page-timeout'));
    if (list.hit.alert && !list.hit.hasOpen && !card(list.hit)) return egiftReport(0, 0, 'email-rejected');
    // Brand and value come from the redemption page's per-card titles; the print page does not name them.
    const titles = list.hit.titles ?? [];

    // Access eGift opens the cards in a new tab; a script's click may have that tab blocked, so a
    // second click keeps it in this tab.
    let cardTab = tabId;
    if (!card(list.hit)) {
      step = 'open';
      tabs = watchNewTabs(tabId);
      for (const attempt of ['new-tab', 'kept-in-tab'] as const) {
        await sleep(cfg.stepDelayMs);
        if (attempt === 'kept-in-tab') await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: keepInTab });
        const clicked = await chrome.scripting.executeScript({ target: { tabId }, func: clickOpen, args: [cfg.page] });
        if (!clicked[0]?.result) return egiftReport(0, 0, 'no-open-button');
        step = 'card-tab';
        const deadline = Date.now() + cfg.newTabWaitMs;
        while (Date.now() < deadline) {
          await sleep(cfg.pollMs);
          const child = (await tabs.portal())[0];
          if (child != null) { cardTab = child; opened = 'new-tab'; break; }
          try {
            const s = await read(tabId, cfg.page);
            if (s && card(s)) { opened = attempt === 'new-tab' ? 'same-tab' : 'kept-in-tab'; break; }
          } catch { /* navigating */ }
        }
        if (opened) break;
        step = 'open';
      }
      // A slow new tab: still read it; otherwise the card loop below waits on this tab.
      if (!opened) { const late = (await tabs.portal())[0]; if (late != null) { cardTab = late; opened = 'new-tab'; } }
    } else {
      opened = 'same-tab';
    }

    let expected = 1;
    let total = 0;
    let lastCode = '';
    while (cards < MAX_CARDS) {
      step = 'page';
      const got = await waitFor(cardTab, cfg, st => { const c = card(st); return !!c && c.code !== lastCode; });
      if (!got.hit) { failure = cards ? 'ended-early' : timedOut(got.last, 'page-timeout'); break; }
      const c = card(got.hit) as EgiftCard;
      if (cards === 0) total = c.total;
      if (c.index !== expected) { failure = 'out-of-sequence'; break; }
      if (c.total !== total) { failure = 'total-mismatch'; break; }
      cards++;
      lastCode = c.code;
      const title = titleFor(titles, c.index, total, cfg.pats.amount);
      if (title && c.value != null && c.value !== title.value) counts.mismatched++;
      camera ??= cardCamera(cardTab);
      const image = await camera.shoot(cfg.page.cardImage);
      let ok = false;
      try {
        const r = await doFetch(`${base}/api/extension/egift`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(egiftPostBody(orderId, c, { title, image })),
        });
        ok = r.ok;
      } catch { ok = false; }
      if (!ok) { failure = 'save-failed'; break; }
      saved++;
      if (image) counts.images++;
      if (title) counts.named++;
      if (c.index >= total) { if (c.index !== total) failure = 'ended-early'; break; }
      step = 'next';
      await sleep(cfg.stepDelayMs);
      const next = await chrome.scripting.executeScript({ target: { tabId: cardTab }, func: clickNext, args: [cfg.page] });
      if (!next[0]?.result) { failure = 'ended-early'; break; }
      expected++;
    }
    if (!failure && cards >= MAX_CARDS && saved < total) failure = 'ended-early';
    return egiftReport(cards, saved, failure, opened, counts);
  } catch (e) {
    return egiftReport(cards, saved, egiftErrorCode(step, e), opened, counts);
  } finally {
    clearInterval(keep);
    if (camera) await camera.close().catch(() => {});
    if (tabs) {
      tabs.stop();
      for (const id of await tabs.portal().catch(() => [])) await chrome.tabs.remove(id).catch(() => {});
    }
    if (tabId != null) await chrome.tabs.remove(tabId).catch(() => {});
    running = false;
  }
}
