import { getSettings, saveSettings, savePaired } from '../lib/storage';
import { fetchUsers } from '../lib/api';
import { grantTrackerAccess, ensureTrackerScriptRegistered } from '../lib/tracker-script';
import type { TrackerUser } from '../lib/types';
import { describeScrapeStatus, SCRAPE_STATUS_KEY } from '../lib/scrapeConfig';
import { approvalUrl, beginPairing, checkSecret, localPairingStore, PAIRING_POLL_MS, stepPairing, trackerBase } from '../lib/pairing';
import { extensionBrowser } from '../lib/browserTarget';

async function showScrapeConfig() {
  const el = document.getElementById('scrapeConfigLabel');
  if (!el) return;
  const got = await chrome.storage.local.get(SCRAPE_STATUS_KEY).catch(() => ({} as Record<string, unknown>));
  el.textContent = describeScrapeStatus(got[SCRAPE_STATUS_KEY] as Parameters<typeof describeScrapeStatus>[0]);
}
showScrapeConfig();

let users: TrackerUser[] = [];
const http = (url: string, init?: RequestInit) => fetch(url, init);

function setPairStatus(text: string, kind: '' | 'ok' | 'fail' = '') {
  const el = document.getElementById('pairStatus')!;
  el.textContent = text;
  el.className = `status${kind ? ' ' + kind : ''}`;
}

async function showUsers(trackerUrl: string) {
  await loadUsers(trackerUrl);
  const { userId } = await getSettings();
  if (userId) (document.getElementById('userSelect') as HTMLSelectElement).value = userId;
}

// Polls the claim while this page is open; the background poll alarm does the same when it is not.
let pairTimer: ReturnType<typeof setInterval> | undefined;
function watchPairing(trackerUrl: string) {
  clearInterval(pairTimer);
  let busy = false;
  const stop = () => { clearInterval(pairTimer); pairTimer = undefined; };
  pairTimer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const r = await stepPairing(localPairingStore(), savePaired, http, Date.now());
      if (r.state === 'pending') return;
      if (r.state === 'error') { setPairStatus(`${r.message} Still trying…`, 'fail'); return; }
      stop();
      if (r.state === 'paired') {
        setPairStatus(`Paired as ${r.userName || 'your tracker user'}.`, 'ok');
        await showUsers(trackerUrl);
      } else if (r.state === 'expired') {
        setPairStatus('Pairing timed out. Click Connect to try again.', 'fail');
      } else {
        // 'none' or 'unknown': the background may have finished it first.
        await showPairState(trackerUrl, 'Pairing ended without approval. Click Connect to try again.');
      }
    } finally {
      busy = false;
    }
  }, PAIRING_POLL_MS);
}

/** Shows whether the tracker accepts the saved secret, and returns the check. */
async function showPairState(trackerUrl: string, notPaired = 'Not paired. Click Connect to pair this browser.'): Promise<'ok' | 'rejected' | 'unreachable'> {
  const s = await getSettings();
  const check = await checkSecret(trackerUrl, s.userId, s.extensionSecret, http);
  if (check === 'ok') {
    setPairStatus(s.userName ? `Paired as ${s.userName}.` : 'Paired.', 'ok');
    await showUsers(trackerUrl);
    return check;
  }
  setPairStatus(check === 'rejected' ? notPaired : 'Could not reach the tracker.', 'fail');
  return check;
}

async function startPairing(trackerUrl: string) {
  setPairStatus('Starting pairing…');
  try {
    const p = await beginPairing(trackerUrl, extensionBrowser(chrome.runtime.getURL('')), http, Date.now());
    await localPairingStore().set(p);
    await chrome.tabs.create({ url: approvalUrl(p.trackerUrl, p.code) });
    setPairStatus('Approve this browser in the tracker tab that just opened (sign in if asked). Waiting…');
    watchPairing(p.trackerUrl);
  } catch (err) {
    setPairStatus(err instanceof Error ? err.message : String(err), 'fail');
  }
}

async function loadUsers(trackerUrl: string) {
  const select = document.getElementById('userSelect') as HTMLSelectElement;
  const userSection = document.getElementById('userSection') as HTMLElement;
  const userStatus = document.getElementById('userStatus') as HTMLElement;

  userStatus.textContent = 'Fetching users…';
  userStatus.className = 'status';
  try {
    users = await fetchUsers(trackerUrl);
    select.innerHTML = '<option value="">— select user —</option>' +
      users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    userSection.style.display = 'block';
    userStatus.textContent = '';
  } catch (err) {
    userStatus.textContent = `Could not load users: ${err instanceof Error ? err.message : String(err)}`;
    userStatus.className = 'status fail';
  }
}

async function init() {
  const settings = await getSettings();

  (document.getElementById('trackerUrl') as HTMLInputElement).value = settings.trackerUrl;
  (document.getElementById('amazonLastSync') as HTMLInputElement).value = settings.amazonLastSync;
  (document.getElementById('walmartLastSync') as HTMLInputElement).value = settings.walmartLastSync;
  (document.getElementById('costcoLastSync') as HTMLInputElement).value = settings.costcoLastSync;

  const select = document.getElementById('userSelect') as HTMLSelectElement;

  if (settings.trackerUrl) {
    const waiting = await localPairingStore().get();
    if (waiting && waiting.trackerUrl === trackerBase(settings.trackerUrl)) {
      setPairStatus('Waiting for approval in the tracker tab…');
      watchPairing(waiting.trackerUrl);
      await showUsers(settings.trackerUrl);
    } else {
      await showPairState(settings.trackerUrl);
    }
    // Re-register the status-banner content script if we already hold
    // permission for this origin (e.g. after a browser restart).
    await ensureTrackerScriptRegistered(settings.trackerUrl);
  }

  document.getElementById('connect')!.addEventListener('click', async () => {
    const trackerUrl = trackerBase((document.getElementById('trackerUrl') as HTMLInputElement).value);
    if (!trackerUrl) return;
    // Ask for access to just this origin so the sync-status banner can run
    // there, instead of the extension holding <all_urls> permanently.
    // permissions.request must be the first call in the click (before any
    // await), or Brave drops the user gesture.
    const granting = grantTrackerAccess(trackerUrl).catch(() => false);
    await saveSettings({ trackerUrl });
    await granting;
    // A secret the tracker already accepts is kept; otherwise pair to get one.
    if (await showPairState(trackerUrl) === 'rejected') await startPairing(trackerUrl);
  });

  document.getElementById('saveUser')!.addEventListener('click', async () => {
    const userId = select.value;
    const user = users.find(u => String(u.id) === userId);
    await saveSettings({ userId, userName: user?.name ?? '' });
    const saved = document.getElementById('userSaved')!;
    saved.style.display = 'inline';
    setTimeout(() => { saved.style.display = 'none'; }, 2000);
  });

  document.getElementById('saveDates')!.addEventListener('click', async () => {
    const amazonLastSync = (document.getElementById('amazonLastSync') as HTMLInputElement).value;
    const walmartLastSync = (document.getElementById('walmartLastSync') as HTMLInputElement).value;
    const costcoLastSync = (document.getElementById('costcoLastSync') as HTMLInputElement).value;
    await saveSettings({ amazonLastSync, walmartLastSync, costcoLastSync });
    const saved = document.getElementById('datesSaved')!;
    saved.style.display = 'inline';
    setTimeout(() => { saved.style.display = 'none'; }, 2000);
  });

  document.getElementById('backfillBtn')!.addEventListener('click', async () => {
    const btn = document.getElementById('backfillBtn') as HTMLButtonElement;
    const status = document.getElementById('backfillStatus')!;
    const currentSettings = await getSettings();
    if (!currentSettings.trackerUrl || !currentSettings.userId) {
      status.textContent = 'Configure tracker URL and user first.';
      status.className = 'status fail';
      return;
    }

    btn.disabled = true;
    status.textContent = 'Fetching orders…';
    status.className = 'status';

    try {
      const res = await fetch(`${currentSettings.trackerUrl}/api/orders/backfill`, {
        headers: { 'X-Extension-User-Id': currentSettings.userId, ...(currentSettings.apiKey ? { 'X-API-Key': currentSettings.apiKey } : {}), ...(currentSettings.extensionSecret ? { 'X-Extension-Secret': currentSettings.extensionSecret } : {}) },
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      type BackfillOrder = { id: number; platform: string; orderNumber: string; sourceUrl: string | null; shippingAddress: string | null; itemDescription: string | null };
      const orders: BackfillOrder[] = await res.json();

      if (orders.length === 0) {
        status.textContent = 'Nothing to backfill.';
        status.className = 'status ok';
        btn.disabled = false;
        return;
      }

      status.textContent = `Backfilling ${orders.length} orders…`;
      let filled = 0;
      let skipped = 0;

      for (const order of orders) {
        status.textContent = `Backfilling ${filled + skipped + 1}/${orders.length}…`;
        await new Promise(r => setTimeout(r, 800));

        try {
          // Amazon is passive-only: never fetch Amazon pages automatically.
          if (order.platform !== 'Walmart') { skipped++; continue; }
          const url = order.sourceUrl ?? `https://www.walmart.com/orders/${order.orderNumber}`;
          const resp = await chrome.runtime.sendMessage({ type: 'FETCH_HTML', url });
          if (resp?.error || !resp?.html) { skipped++; continue; }

          const doc = new DOMParser().parseFromString(resp.html, 'text/html');

          let title = '';
          let address = '';

          if (order.platform === 'Walmart') {
            // Walmart embeds the full order in __NEXT_DATA__ at
            // props.pageProps.initialData.data.order. Mirrors what the
            // walmart content script does on detail-page fetch.
            if (!order.itemDescription || !order.shippingAddress) {
              const nextDataEl = doc.querySelector('#__NEXT_DATA__');
              if (nextDataEl?.textContent) {
                try {
                  const nd = JSON.parse(nextDataEl.textContent) as {
                    props?: { pageProps?: { initialData?: { data?: { order?: Record<string, unknown> } } } };
                  };
                  const ndOrder = nd.props?.pageProps?.initialData?.data?.order;
                  if (ndOrder) {
                    const groupsKey = Object.keys(ndOrder).find(k => k.startsWith('groups_'));
                    const firstGroup = groupsKey ? (ndOrder[groupsKey] as unknown[])?.[0] as Record<string, unknown> : null;
                    if (!order.itemDescription) {
                      const firstItem = (firstGroup?.items as unknown[])?.[0] as Record<string, unknown>;
                      const name = (firstItem?.productInfo as Record<string, unknown>)?.name as string | undefined;
                      if (name) title = name.slice(0, 120);
                    }
                    if (!order.shippingAddress) {
                      const addrStr = ((firstGroup?.deliveryAddress as Record<string, unknown>)?.address as Record<string, unknown>)?.addressString;
                      if (typeof addrStr === 'string' && addrStr.trim()) address = addrStr.slice(0, 200);
                    }
                  }
                } catch { /* ignore */ }
              }
              if (!title) {
                const productEl = doc.querySelector('[data-testid="productName"]');
                const t = (productEl?.textContent ?? '').trim();
                if (t.length > 5) title = t.slice(0, 120);
              }
            }
          }

          if (!title && !address) { skipped++; continue; }

          const patch: Record<string, string> = {};
          if (title) patch.itemDescription = title;
          if (address) patch.shippingAddress = address;

          await fetch(`${currentSettings.trackerUrl}/api/orders/${order.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'X-Extension-User-Id': currentSettings.userId, ...(currentSettings.apiKey ? { 'X-API-Key': currentSettings.apiKey } : {}), ...(currentSettings.extensionSecret ? { 'X-Extension-Secret': currentSettings.extensionSecret } : {}) },
            body: JSON.stringify(patch),
          });
          filled++;
        } catch {
          skipped++;
        }
      }

      status.textContent = `Done — ${filled} updated, ${skipped} skipped.`;
      status.className = 'status ok';
    } catch (err) {
      status.textContent = `Failed: ${err instanceof Error ? err.message : String(err)}`;
      status.className = 'status fail';
    }

    btn.disabled = false;
  });
}

init();
