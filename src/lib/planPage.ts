// Step plans, page side: the scripts chrome.scripting.executeScript runs inside a portal tab. Each one
// is self-contained (it is serialised: no imports are used at runtime, helpers are repeated), takes
// its selectors and patterns as an argument, and only returns flags and values to the background,
// which never logs or reports them. Selectors and regexes are data: a bad one is skipped, never run
// as code. Logic follows src/lib/egiftPage.ts (pageText, enterEmail, clickOpen, clickNext).
import type { ClickSpec, FillSpec, ProbeReq, ProbeRes, ReadRes, ReadSpec } from './stepPlan.ts';

/** Which conditions hold on the page, the labelled values they read, and the alert and bot-check flags. */
export function planProbe(req: ProbeReq): ProbeRes {
  const c = req.page;
  const rx = (src: string, flags: string) => { try { return src ? new RegExp(src, flags) : null; } catch { return null; } };
  const qa = (sel: string): Element[] => { try { return sel ? Array.from(document.querySelectorAll(sel)) : []; } catch { return []; } };
  const text = (document.body?.innerText ?? '').slice(0, 100_000);
  const label = (e: Element) => ((e as HTMLInputElement).value || e.textContent || '').trim();
  const clickables = qa(c.clickables);
  const alertRe = rx(c.alertText, 'i');
  const botRe = rx(c.botCheckText, 'i');
  // The value next to a label ("Code:" -> its <span>): the deepest short element whose text starts
  // with the label and holds more than it; else the first word after the label in the page text.
  const labelled = (want: string): string | null => {
    const w = want.trim().toLowerCase();
    if (!w) return null;
    let best: Element | null = null;
    for (const el of qa(c.labelCells)) {
      const t = (el.textContent ?? '').trim();
      if (t.length <= w.length || t.length > w.length + 100 || !t.toLowerCase().startsWith(w)) continue;
      if (!best || best.contains(el)) best = el;
    }
    if (best) {
      const span = Array.from(best.querySelectorAll('span')).map(s => (s.textContent ?? '').trim()).find(t => t && !t.toLowerCase().startsWith(w));
      if (span) return span;
      const rest = (best.textContent ?? '').trim().slice(w.length).trim();
      if (rest) return rest;
    }
    const m = new RegExp(want.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*(\\S{1,64})', 'i').exec(text);
    return m ? m[1] : null;
  };
  const alert = !!alertRe && qa(c.alert).some(el => alertRe.test(el.textContent ?? ''));
  const botCheck = qa(c.botCheck).length > 0 || (!!botRe && botRe.test(text.slice(0, 5000)));
  const hits: boolean[] = [];
  const labels: (string | null)[] = [];
  for (const k of req.conds) {
    let hit = false;
    let value: string | null = null;
    if (k.exists !== undefined) hit = qa(k.exists).length > 0;
    else if (k.clickable !== undefined) { const want = k.clickable.toLowerCase(); hit = clickables.some(e => label(e).toLowerCase().includes(want)); }
    else if (k.label !== undefined) { value = labelled(k.label); hit = value != null; }
    else if (k.text !== undefined) { const re = rx(k.text, 'i'); hit = !!re && re.test(text); }
    else if (k.alert) hit = alert;
    hits.push(hit);
    labels.push(value);
  }
  return { hits, labels, alert, botCheck };
}

/**
 * Clicks the element a spec names: by selector, else by clickable label (substring, any case), else by
 * an orText regex over the clickables. Refuses (and does not click) an element whose text matches the
 * bundled denylist, or when the denylist cannot be compiled.
 */
export function planClick(spec: ClickSpec, deny: string): 'ok' | 'none' | 'denied' {
  const rx = (src: string, flags: string) => { try { return src ? new RegExp(src, flags) : null; } catch { return null; } };
  const qa = (sel: string | undefined): HTMLElement[] => { try { return sel ? Array.from(document.querySelectorAll(sel)) as HTMLElement[] : []; } catch { return []; } };
  const label = (e: Element) => ((e as HTMLInputElement).value || e.textContent || '').trim();
  const denyRe = rx(deny, 'i');
  let el: HTMLElement | null = qa(spec.selector)[0] ?? null;
  if (!el && spec.clickable) {
    const want = spec.clickable.toLowerCase();
    el = qa(spec.page.clickables).find(e => label(e).toLowerCase().includes(want)) ?? null;
  }
  if (!el && spec.orText) {
    const re = rx(spec.orText, 'i');
    if (re) el = qa(spec.page.clickables).find(e => re.test(label(e))) ?? null;
  }
  if (!el || (el as HTMLInputElement).disabled) return 'none';
  if (!denyRe || denyRe.test(label(el)) || denyRe.test(el.getAttribute('aria-label') ?? '')) return 'denied';
  el.click();
  return 'ok';
}

/** Sets an input's value (as typing would) and optionally submits its form. Same technique as enterEmail. */
export function planFill(spec: FillSpec, value: string, deny: string): boolean {
  const pick = (root: ParentNode, sel: string): HTMLElement | null => { try { return root.querySelector(sel) as HTMLElement | null; } catch { return null; } };
  const input = pick(document, spec.selector) as HTMLInputElement | null;
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  input.focus();
  setter?.call(input, value);
  for (const type of ['input', 'keyup', 'change']) input.dispatchEvent(new Event(type, { bubbles: true }));
  input.blur();
  if (!spec.submit) return true;
  const form = input.closest('form');
  let re: RegExp | null = null;
  try { re = new RegExp(spec.submitText, 'i'); } catch { /* no text match */ }
  let denyRe: RegExp | null = null;
  try { denyRe = new RegExp(deny, 'i'); } catch { /* refuses below */ }
  const byText = (root: ParentNode) => {
    try { return (Array.from(root.querySelectorAll(spec.buttons)) as HTMLElement[]).find(b => !!re && re.test(b.textContent ?? '')) ?? null; } catch { return null; }
  };
  const btn = (form && pick(form, spec.submitButton)) ?? pick(document, spec.submitButton) ?? (form && byText(form)) ?? byText(document);
  if (btn) {
    if (!denyRe || denyRe.test(((btn as HTMLInputElement).value || btn.textContent || '').trim())) return false;
    btn.click();
  } else form?.requestSubmit();
  return true;
}

/** Reads named fields (by label, selector or regex over the page text) and/or every match of a selector. */
export function planRead(spec: ReadSpec): ReadRes {
  const c = spec.page;
  const qa = (sel: string): Element[] => { try { return sel ? Array.from(document.querySelectorAll(sel)) : []; } catch { return []; } };
  const text = (document.body?.innerText ?? '').slice(0, 100_000);
  const labelled = (want: string): string | null => {
    const w = want.trim().toLowerCase();
    if (!w) return null;
    let best: Element | null = null;
    for (const el of qa(c.labelCells)) {
      const t = (el.textContent ?? '').trim();
      if (t.length <= w.length || t.length > w.length + 100 || !t.toLowerCase().startsWith(w)) continue;
      if (!best || best.contains(el)) best = el;
    }
    if (best) {
      const span = Array.from(best.querySelectorAll('span')).map(s => (s.textContent ?? '').trim()).find(t => t && !t.toLowerCase().startsWith(w));
      if (span) return span;
      const rest = (best.textContent ?? '').trim().slice(w.length).trim();
      if (rest) return rest;
    }
    const m = new RegExp(want.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*(\\S{1,64})', 'i').exec(text);
    return m ? m[1] : null;
  };
  const fields: Record<string, string | null> = {};
  for (const [name, f] of Object.entries(spec.fields ?? {})) {
    let v: string | null = null;
    if (f.label !== undefined) v = labelled(f.label);
    else if (f.selector !== undefined) {
      const el = qa(f.selector)[0];
      v = el ? (((el === document.body ? (el as HTMLElement).innerText : el.textContent) ?? '').trim().slice(0, 100_000) || null) : null;
    } else if (f.regex !== undefined) {
      let re: RegExp | null = null;
      try { re = new RegExp(f.regex, 'i'); } catch { re = null; }
      const m = re ? re.exec(text) : null;
      v = m ? (m[1] ?? m[0]) : null;
    }
    fields[name] = v;
  }
  const all = spec.all ? qa(spec.all).map(e => (e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)).filter(Boolean).slice(0, 60) : [];
  return { fields, all };
}
