// Step plans: the real TabDriver over chrome.tabs / chrome.scripting. It opens background tabs, runs
// the bundled page functions (src/lib/planPage.ts), and closes only the tabs this run opened or the
// portal opened from them (the opener-or-host rule), never a tab the user opened. Nothing read from a
// page is logged here.
import type { TabDriver, Watcher } from '../lib/planRun';
import { planClick, planFill, planProbe, planRead } from '../lib/planPage';
import { keepInTab } from '../lib/egiftPage';
import { cardCamera } from './egiftShot';

const KEEPALIVE_MS = 20_000;

function hostOf(url: string | undefined): string {
  try { return url ? new URL(url).hostname.toLowerCase() : ''; } catch { return ''; }
}

/**
 * Tabs created after a click. `portal()` lists the ones the portal opened (the run's tab is their
 * opener, or they are on a plan host): the only ones the run reads or closes.
 */
function watchNewTabs(openerId: number, hosts: readonly string[]): Watcher {
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
          if (t.openerTabId === openerId || hosts.includes(hostOf(t.pendingUrl || t.url))) out.push(id);
        } catch { seen.delete(id); }
      }
      return out;
    },
  };
}

type Fetcher = typeof fetch;

export function chromeDriver(base: string, headers: Record<string, string>, hosts: readonly string[], doFetch: Fetcher = fetch): TabDriver {
  const keep = setInterval(() => { chrome.runtime.getPlatformInfo().catch(() => {}); }, KEEPALIVE_MS);
  const opened = new Set<number>();
  const watchers: Watcher[] = [];
  const cameras = new Map<number, ReturnType<typeof cardCamera>>();
  const run = async <T>(tabId: number, func: (...a: never[]) => T, args: unknown[], world?: 'MAIN'): Promise<T | null> => {
    const res = await chrome.scripting.executeScript({ target: { tabId }, ...(world ? { world } : {}), func: func as never, args: args as never });
    return (res[0]?.result as T | undefined) ?? null;
  };
  return {
    async open(url) {
      const tab = await chrome.tabs.create({ url, active: false });
      if (tab.id == null) throw new Error('no tab id');
      opened.add(tab.id);
      return tab.id;
    },
    watch(opener) { const w = watchNewTabs(opener, hosts); watchers.push(w); return w; },
    adopt(tabId) { opened.add(tabId); },
    probe: (tab, req) => run(tab, planProbe, [req]),
    async click(tab, spec, deny) { return (await run(tab, planClick, [spec, deny])) ?? 'none'; },
    async fill(tab, spec, value, deny) { return !!(await run(tab, planFill, [spec, value, deny])); },
    read: (tab, spec) => run(tab, planRead, [spec]),
    async shoot(tab, selector) {
      let cam = cameras.get(tab);
      if (!cam) { cam = cardCamera(tab); cameras.set(tab, cam); }
      return cam.shoot(selector);
    },
    async post(path, body) {
      const r = await doFetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
      return r.ok;
    },
    async keepInTab(tab) { await run(tab, keepInTab, [], 'MAIN'); },
    async closeAll() {
      clearInterval(keep);
      for (const cam of cameras.values()) await cam.close().catch(() => {});
      cameras.clear();
      for (const w of watchers) {
        for (const id of await w.portal().catch(() => [] as number[])) opened.add(id);
        w.stop();
      }
      for (const id of opened) await chrome.tabs.remove(id).catch(() => {});
      opened.clear();
    },
    sleep: ms => new Promise<void>(r => setTimeout(r, ms)),
    now: () => Date.now(),
  };
}
