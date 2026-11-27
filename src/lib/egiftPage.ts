// SCRAPE_EGIFT page side: the run's settings (from the tracker's scrape config, site "costcoEgift")
// and the scripts executeScript runs inside the delivery portal. Each page script is self-contained
// (it is serialised), takes its selectors as an argument, and returns flags and the card cell values
// only to the background, which never logs or reports them.

import type { CardPatterns } from './egiftCommand.ts';
import { getScrape } from './scrapeConfig.ts';

/** The run's settings, read from the scrape config once per run. */
export function settings() {
  const s = getScrape('costcoEgift');
  const ms = (k: string, d: number) => { const v = s.timeoutsMs[k]; return typeof v === 'number' && v > 0 ? v : d; };
  const clickables = s.selectors.clickables || 'button, a, [role="button"], input[type="button"], input[type="submit"]';
  const emailInput = s.selectors.emailInput || '#p2, input[type="email"]';
  return {
    page: {
      clickables, emailInput,
      alert: s.selectors.alert || '[role="alert"]',
      alertText: s.patterns.alertText || '\\b(invalid|not match|incorrect|error)\\b',
      openLabel: s.labels.openLabel || 'Access eGift',
      nextButton: s.selectors.nextButton || '',
      nextText: s.patterns.nextButton || '^next\\b',
      counter: s.selectors.counter || '',
      labelCells: s.selectors.labelCells || 'td, th, div, p, li, span, label',
      codeLabel: s.labels.codeLabel || 'Code:',
      pinLabel: s.labels.pinLabel || 'PIN:',
      botCheck: s.selectors.botCheck || '',
      botCheckText: s.patterns.botCheckText || '',
      itemTitle: s.selectors.itemTitle || 'section.order-item .order-item-title',
      cardImage: s.selectors.cardImage || '#print-content-section, #body-canvas',
    },
    submit: {
      emailInput,
      submitButton: s.selectors.submitButton || 'button[type="submit"], input[type="submit"]',
      buttons: s.selectors.buttons || 'button',
      submitText: s.patterns.submitText || 'submit|continue|next|view|access',
    },
    pats: {
      code: s.regex('code'), pin: s.regex('pin', 'i'), sequence: s.regex('sequence', 'i'), amount: s.regex('amount'),
      codeValue: s.regex('codeValue'), pinValue: s.regex('pinValue'),
    } satisfies CardPatterns,
    pollMs: ms('pollMs', 1500),
    waitMs: ms('waitMs', 40_000),
    stepDelayMs: ms('stepDelayMs', 3000),
    newTabWaitMs: ms('newTabWaitMs', 10_000),
  };
}
export type Settings = ReturnType<typeof settings>;
export type PageCfg = Settings['page'];
export type SubmitCfg = Settings['submit'];

// ---- run inside the delivery page ----

export function pageText(c: PageCfg) {
  const rx = (src: string, flags: string) => { try { return src ? new RegExp(src, flags) : null; } catch { return null; } };
  const qa = (sel: string): Element[] => { try { return sel ? Array.from(document.querySelectorAll(sel)) : []; } catch { return []; } };
  const q = (sel: string): Element | null => qa(sel)[0] ?? null;
  const text = document.body?.innerText ?? '';
  const label = (e: Element) => ((e as HTMLInputElement).value || e.textContent || '').trim();
  const clickables = qa(c.clickables);
  const open = c.openLabel.toLowerCase();
  const nextRe = rx(c.nextText, 'i');
  const alertRe = rx(c.alertText, 'i');
  const botRe = rx(c.botCheckText, 'i');
  // The value next to a label ("Code:" -> its <span>): the deepest short element whose text starts
  // with the label and holds more than it.
  const labelled = (want: string): string | null => {
    const w = want.trim().toLowerCase();
    if (!w) return null;
    let best: Element | null = null;
    for (const el of qa(c.labelCells)) {
      const t = (el.textContent ?? '').trim();
      if (t.length <= w.length || t.length > w.length + 100 || !t.toLowerCase().startsWith(w)) continue;
      if (!best || best.contains(el)) best = el;
    }
    if (!best) return null;
    const span = Array.from(best.querySelectorAll('span')).map(s => (s.textContent ?? '').trim()).find(t => t && !t.toLowerCase().startsWith(w));
    if (span) return span;
    const rest = (best.textContent ?? '').trim().slice(w.length).trim();
    return rest || null;
  };
  const nextEl = q(c.nextButton) as HTMLInputElement | null;
  return {
    text: text.slice(0, 100_000),
    hasEmail: !!q(c.emailInput),
    hasOpen: clickables.some(e => label(e).toLowerCase().includes(open)),
    hasNext: (!!nextEl && !nextEl.disabled) || (!!nextRe && clickables.some(e => nextRe.test(label(e)))),
    alert: !!alertRe && qa(c.alert).some(el => alertRe.test(el.textContent ?? '')),
    botCheck: !!q(c.botCheck) || (!!botRe && botRe.test(text.slice(0, 5000))),
    code: labelled(c.codeLabel),
    pin: labelled(c.pinLabel),
    counter: (q(c.counter)?.textContent ?? '').trim() || null,
    // The redemption page's one title per card ("Brand $25"): brand and value, not secrets.
    titles: qa(c.itemTitle).map(e => (e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)).filter(Boolean).slice(0, 60),
  };
}

/**
 * Where the card is on the print page, in page coordinates, for the photo; null when it is not
 * found. `ready` is false while an image inside it is still loading.
 */
export function cardRect(selector: string): { x: number; y: number; width: number; height: number; ready: boolean } | null {
  let el: Element | null = null;
  try { el = selector ? document.querySelector(selector) : null; } catch { el = null; }
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 20 || r.height < 20) return null;
  const ready = Array.from(el.querySelectorAll('img')).every(i => i.complete);
  return { x: Math.max(0, r.left + window.scrollX), y: Math.max(0, r.top + window.scrollY), width: Math.min(r.width, 4000), height: Math.min(r.height, 8000), ready };
}

export function enterEmail(email: string, c: SubmitCfg): boolean {
  const pick = (root: ParentNode, sel: string): HTMLElement | null => { try { return root.querySelector(sel) as HTMLElement | null; } catch { return null; } };
  const input = pick(document, c.emailInput) as HTMLInputElement | null;
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  input.focus();
  setter?.call(input, email);
  for (const type of ['input', 'keyup', 'change']) input.dispatchEvent(new Event(type, { bubbles: true }));
  input.blur();
  const form = input.closest('form');
  let re: RegExp | null = null;
  try { re = new RegExp(c.submitText, 'i'); } catch { /* no text match */ }
  const byText = (root: ParentNode) => {
    try { return (Array.from(root.querySelectorAll(c.buttons)) as HTMLElement[]).find(b => !!re && re.test(b.textContent ?? '')) ?? null; } catch { return null; }
  };
  const btn = (form && pick(form, c.submitButton)) ?? pick(document, c.submitButton) ?? (form && byText(form)) ?? byText(document);
  if (btn) btn.click(); else form?.requestSubmit();
  return true;
}

export function clickOpen(c: PageCfg): boolean {
  const want = c.openLabel.toLowerCase();
  let els: HTMLElement[] = [];
  try { els = Array.from(document.querySelectorAll(c.clickables)) as HTMLElement[]; } catch { return false; }
  const el = els.find(e => (((e as HTMLInputElement).value || e.textContent) ?? '').trim().toLowerCase().includes(want));
  if (!el) return false;
  el.click();
  return true;
}

export function clickNext(c: PageCfg): boolean {
  let el: HTMLElement | null = null;
  try { el = c.nextButton ? document.querySelector(c.nextButton) as HTMLElement | null : null; } catch { el = null; }
  if (!el) {
    let re: RegExp | null = null;
    try { re = new RegExp(c.nextText, 'i'); } catch { return false; }
    let els: HTMLElement[] = [];
    try { els = Array.from(document.querySelectorAll(c.clickables)) as HTMLElement[]; } catch { return false; }
    el = els.find(e => re!.test((((e as HTMLInputElement).value || e.textContent) ?? '').trim())) ?? null;
  }
  if (!el || (el as HTMLInputElement).disabled) return false;
  el.click();
  return true;
}

/**
 * Runs in the page's own world, before the second Access eGift click: a click from a script has no
 * user gesture, so the browser may block the new tab the portal opens. This makes that open happen
 * in the same tab instead (window.open, form targets, link targets).
 */
export function keepInTab(): void {
  const w = window as unknown as { __rtKeepInTab?: boolean };
  if (w.__rtKeepInTab) return;
  w.__rtKeepInTab = true;
  window.open = function (url?: string | URL) {
    if (url) location.assign(String(url));
    return window;
  } as typeof window.open;
  const submit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function (this: HTMLFormElement) { this.target = '_self'; return submit.call(this); };
  document.addEventListener('submit', e => { const f = e.target as HTMLFormElement | null; if (f) f.target = '_self'; }, true);
  document.addEventListener('click', e => {
    const el = (e.target as Element | null)?.closest?.('a[target], button[formtarget], input[formtarget]');
    if (el) { el.removeAttribute('target'); el.removeAttribute('formtarget'); }
    const f = (e.target as Element | null)?.closest?.('form');
    if (f) (f as HTMLFormElement).target = '_self';
  }, true);
}
