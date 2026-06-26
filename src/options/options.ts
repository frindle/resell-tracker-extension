import { getSettings, saveSettings } from '../lib/storage';
import { fetchUsers } from '../lib/api';
import type { TrackerUser } from '../lib/types';

let users: TrackerUser[] = [];

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
  (document.getElementById('extensionSecret') as HTMLInputElement).value = settings.extensionSecret;
  (document.getElementById('amazonLastSync') as HTMLInputElement).value = settings.amazonLastSync;
  (document.getElementById('walmartLastSync') as HTMLInputElement).value = settings.walmartLastSync;
  (document.getElementById('costcoLastSync') as HTMLInputElement).value = settings.costcoLastSync;

  const userSection = document.getElementById('userSection') as HTMLElement;
  const select = document.getElementById('userSelect') as HTMLSelectElement;

  if (settings.trackerUrl) {
    await loadUsers(settings.trackerUrl);
    if (settings.userId) select.value = settings.userId;
  }

  document.getElementById('connect')!.addEventListener('click', async () => {
    const trackerUrl = (document.getElementById('trackerUrl') as HTMLInputElement).value.trim();
    const extensionSecret = (document.getElementById('extensionSecret') as HTMLInputElement).value;
    if (!trackerUrl) return;
    await saveSettings({ trackerUrl, extensionSecret });
    await loadUsers(trackerUrl);
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
          const url = order.platform === 'Walmart'
            ? (order.sourceUrl ?? `https://www.walmart.com/orders/${order.orderNumber}`)
            : `https://www.amazon.com/gp/your-account/order-details?orderID=${order.orderNumber}`;
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
          } else {
            // Amazon
            if (!order.itemDescription) {
              const titleSelectors = [
                '[data-component="itemTitle"] a',
                '.yohtmlc-item a.a-link-normal',
                '.a-link-normal[href*="/dp/"]',
              ];
              for (const sel of titleSelectors) {
                const el = doc.querySelector(sel);
                const t = (el?.textContent ?? '').trim().replace(/\s+/g, ' ');
                if (t.length > 5) { title = t.slice(0, 120); break; }
              }
              if (!title) {
                for (const a of Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
                  if (!/\/dp\/[A-Z0-9]{10}|\/gp\/product\/[A-Z0-9]{10}/.test(a.href)) continue;
                  const t = (a.textContent ?? '').trim().replace(/\s+/g, ' ');
                  if (t.length > 5) { title = t.slice(0, 120); break; }
                }
              }
            }
            if (!order.shippingAddress) {
              const headers = Array.from(doc.querySelectorAll('h5'));
              for (const h of headers) {
                if (!/ship\s+to/i.test(h.textContent ?? '')) continue;
                const ul = h.nextElementSibling;
                if (!ul || ul.tagName !== 'UL') continue;
                const items = Array.from(ul.querySelectorAll('li span.a-list-item'))
                  .map(el => (el.innerHTML ?? '').replace(/<br\s*\/?>/gi, ', ').replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' '))
                  .filter(t => t && !/^united states$/i.test(t));
                const addrItems = items.slice(1);
                if (addrItems.length > 0) { address = addrItems.join(', ').slice(0, 200); break; }
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
