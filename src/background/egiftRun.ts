// SCRAPE_EGIFT: opens an order's Costco eGift delivery link in a background tab, enters the delivery
// email, reads each card and posts it to the tracker. The tab is always closed. Ported from the
// sidecar's egiftFlow.js (same steps and stop reasons). Card numbers, PINs, the email and the link are
// never logged or reported: the result is counts only.

import {
  MAX_CARDS, egiftPostBody, egiftReport, isAllowedEgiftLink, parseCardText, parseEgiftInfo,
  type EgiftCard, type EgiftFailure, type EgiftReport,
} from '../lib/egiftCommand';

const POLL_MS = 1500;
const WAIT_MS = 40_000;
const STEP_DELAY_MS = 3000; // the sidecar's pause between opening / advancing cards
const KEEPALIVE_MS = 20_000;

// The sidecar's Costco site config (egiftSites.js).
const OPEN_LABEL = 'Access eGift';

let running = false;
export function egiftRunActive(): boolean { return running; }

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ---- run inside the delivery page (self-contained: serialised by executeScript) ----

function pageText(): { text: string; hasEmail: boolean; hasOpen: boolean; hasNext: boolean; alert: boolean } {
  const text = document.body?.innerText ?? '';
  const clickables = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]'));
  const label = (e: Element) => ((e as HTMLInputElement).value || e.textContent || '').trim();
  return {
    text: text.slice(0, 100_000),
    hasEmail: !!document.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]'),
    hasOpen: clickables.some(e => label(e).toLowerCase().includes('access egift')),
    hasNext: clickables.some(e => /^next\b/i.test(label(e))),
    alert: !!document.querySelector('[role="alert"]') && /\b(invalid|not match|incorrect|error)\b/i.test(document.querySelector('[role="alert"]')?.textContent ?? ''),
  };
}

function enterEmail(email: string): boolean {
  const input = document.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]') as HTMLInputElement | null;
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  input.focus();
  setter?.call(input, email);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  const form = input.closest('form');
  const btn = (form?.querySelector('button[type="submit"], input[type="submit"]')
    ?? Array.from((form ?? document).querySelectorAll('button')).find(b => /submit|continue|next|view|access/i.test(b.textContent ?? ''))) as HTMLElement | undefined;
  if (btn) btn.click(); else form?.requestSubmit();
  return true;
}

function clickLabel(startsWith: string, contains: boolean): boolean {
  const want = startsWith.toLowerCase();
  const els = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]'));
  const el = els.find(e => {
    const t = (((e as HTMLInputElement).value || e.textContent) ?? '').trim().toLowerCase();
    return contains ? t.includes(want) : t.startsWith(want);
  }) as HTMLElement | undefined;
  if (!el) return false;
  el.click();
  return true;
}

// ---- background side ----

type PageState = Awaited<ReturnType<typeof read>>;
async function read(tabId: number) {
  const res = await chrome.scripting.executeScript({ target: { tabId }, func: pageText });
  return res[0]?.result ?? null;
}

async function waitFor(tabId: number, ok: (s: NonNullable<PageState>) => boolean): Promise<NonNullable<PageState> | null> {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    try {
      const s = await read(tabId);
      if (s && ok(s)) return s;
    } catch { /* still loading or navigating */ }
  }
  return null;
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
  let tabId: number | undefined;
  let cards = 0;
  let saved = 0;
  let failure: EgiftFailure | null = null;
  try {
    const res = await doFetch(`${base}/api/extension/egift?orderId=${orderId}`, { headers, cache: 'no-store' });
    if (!res.ok) return egiftReport(0, 0, 'error');
    const info = parseEgiftInfo(await res.json().catch(() => null));
    if (!info) return egiftReport(0, 0, 'no-link');
    if (!isAllowedEgiftLink(info.link)) return egiftReport(0, 0, 'link-rejected');

    const tab = await chrome.tabs.create({ url: info.link, active: false });
    tabId = tab.id;
    if (tabId == null) return egiftReport(0, 0, 'error');

    // The site asks for the address before it shows the order.
    const first = await waitFor(tabId, s => s.hasEmail || s.hasOpen || s.alert);
    if (!first) return egiftReport(0, 0, 'page-timeout');
    if (first.hasEmail && !first.hasOpen) {
      await chrome.scripting.executeScript({ target: { tabId }, func: enterEmail, args: [info.email] });
    }
    const list = await waitFor(tabId, s => s.hasOpen || (s.alert && !s.hasEmail) || !!parseCardText(s.text));
    if (!list) return egiftReport(0, 0, 'page-timeout');
    if (list.alert && !list.hasOpen) return egiftReport(0, 0, 'email-rejected');
    if (!list.hasOpen && !parseCardText(list.text)) return egiftReport(0, 0, 'no-open-button');

    if (list.hasOpen) {
      await sleep(STEP_DELAY_MS);
      await chrome.scripting.executeScript({ target: { tabId }, func: clickLabel, args: [OPEN_LABEL, true] });
    }

    let expected = 1;
    let total = 0;
    let lastCode = '';
    while (cards < MAX_CARDS) {
      const s = await waitFor(tabId, st => { const c = parseCardText(st.text); return !!c && c.code !== lastCode; });
      if (!s) { failure = cards ? 'ended-early' : 'page-timeout'; break; }
      const card = parseCardText(s.text) as EgiftCard;
      if (cards === 0) total = card.total;
      if (card.index !== expected) { failure = 'out-of-sequence'; break; }
      if (card.total !== total) { failure = 'total-mismatch'; break; }
      cards++;
      lastCode = card.code;
      let ok = false;
      try {
        const r = await doFetch(`${base}/api/extension/egift`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(egiftPostBody(orderId, card)),
        });
        ok = r.ok;
      } catch { ok = false; }
      if (!ok) { failure = 'save-failed'; break; }
      saved++;
      if (card.index >= total) { if (card.index !== total) failure = 'ended-early'; break; }
      await sleep(STEP_DELAY_MS);
      const next = await chrome.scripting.executeScript({ target: { tabId }, func: clickLabel, args: ['next', false] });
      if (!next[0]?.result) { failure = 'ended-early'; break; }
      expected++;
    }
    if (!failure && cards >= MAX_CARDS && saved < total) failure = 'ended-early';
    return egiftReport(cards, saved, failure);
  } catch {
    return egiftReport(cards, saved, 'error');
  } finally {
    clearInterval(keep);
    if (tabId != null) await chrome.tabs.remove(tabId).catch(() => {});
    running = false;
  }
}
