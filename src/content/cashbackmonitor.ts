import { getSettings } from '../lib/storage';

interface CbmRate {
  portal: string;
  rate: string;
  category: string | null;
}

// Each cbm2 table may be under a section heading (Cashback, Travel Miles/Points, etc.)
// We treat anything non-cashback as a note in the category field.
function parseTables(): CbmRate[] {
  const rates: CbmRate[] = [];
  let currentCategory: string | null = null;

  // Walk the DOM looking for section headings and cbm2 tables
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    null,
  );

  let node: Node | null = walker.nextNode();
  while (node) {
    const el = node as Element;
    // Section headings like <h2 class="...">Cashback</h2> or <div class="cbm-section-title">
    if (/^H[2-4]$/i.test(el.tagName) || el.classList.contains('cbm-section-title') || el.classList.contains('cbm_tab_title')) {
      const text = el.textContent?.trim() ?? '';
      if (text && text.length < 60) {
        currentCategory = text.toLowerCase() === 'cashback' ? null : text;
      }
    }

    if (el.tagName === 'TABLE' && el.classList.contains('cbm2')) {
      const rows = el.querySelectorAll('tr');
      rows.forEach(row => {
        // Portal name: <a href="/go-to/Portal/merchant">Portal</a> in second td.l
        const cells = row.querySelectorAll('td.l');
        if (cells.length < 2) return;
        const portalAnchor = cells[1]?.querySelector('a[href*="/go-to/"]');
        const portal = portalAnchor?.textContent?.trim();
        // Rate: <span id="ra*"> in third td.l
        const rateSpan = cells[2]?.querySelector('span[id^="ra"]');
        const rate = rateSpan?.textContent?.trim();
        if (portal && rate && rate !== 'n/a' && rate !== 'N/A') {
          rates.push({ portal, rate, category: currentCategory });
        }
      });
    }

    node = walker.nextNode();
  }

  return rates;
}

function merchantFromUrl(): string | null {
  const m = location.pathname.match(/\/cashback-store\/([^/]+)/);
  return m ? m[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null;
}

async function scrapeAndSend() {
  // Vendor name passed as query param by extension when it opens this page
  const params = new URLSearchParams(location.search);
  const merchant = params.get('vendor') || merchantFromUrl();
  if (!merchant) return;

  const rates = parseTables();
  if (!rates.length) return;

  const settings = await getSettings();
  if (!settings.trackerUrl) return;

  const base = settings.trackerUrl.replace(/\/$/, '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey) headers['X-API-Key'] = settings.apiKey;

  try {
    const res = await fetch(`${base}/api/portal-rates/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ merchant, rates }]),
    });
    chrome.runtime.sendMessage({
      type: 'CBM_SCRAPE_DONE',
      merchant,
      rateCount: rates.length,
      ok: res.ok,
    }).catch(() => {});
  } catch {
    chrome.runtime.sendMessage({
      type: 'CBM_SCRAPE_DONE',
      merchant,
      rateCount: 0,
      ok: false,
    }).catch(() => {});
  }
}

// Run after page is idle so JS-rendered rates are in the DOM
if (document.readyState === 'complete') {
  scrapeAndSend();
} else {
  window.addEventListener('load', scrapeAndSend);
}
