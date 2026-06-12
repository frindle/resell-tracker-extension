import { getSettings } from '../lib/storage';
import type { SyncMessage, Platform, ApiLogEntry } from '../lib/types';

function setStatus(platform: Platform, text: string, cls: string) {
  const id = platform === 'Amazon' ? 'amazonStatus' : platform === 'Walmart' ? 'walmartStatus' : platform === 'Costco' ? 'costcoStatus' : 'bigskyStatus';
  const el = document.getElementById(id)!;
  el.textContent = text;
  el.className = `status ${cls}`;
}

function setMeta(platform: Platform, text: string) {
  const id = platform === 'Amazon' ? 'amazonMeta' : platform === 'Walmart' ? 'walmartMeta' : platform === 'Costco' ? 'costcoMeta' : 'bigskyMeta';
  const el = document.getElementById(id)!;
  el.textContent = text;
}

function setSyncBtn(platform: Platform, disabled: boolean, cancel = false) {
  const id = platform === 'Amazon' ? 'syncAmazon' : platform === 'Walmart' ? 'syncWalmart' : platform === 'Costco' ? 'syncCostco' : 'syncBigsky';
  const btn = document.getElementById(id) as HTMLButtonElement;
  btn.disabled = disabled && !cancel;
  btn.textContent = cancel ? 'Cancel' : 'Sync';
  btn.dataset.cancel = cancel ? '1' : '';
}

async function cancelSync(platform: Platform) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'CANCEL_SYNC', platform }).catch(() => {});
  setSyncBtn(platform, false);
  setStatus(platform, 'cancelled', 'idle');
}

async function triggerSync(platform: Platform) {
  setSyncBtn(platform, true, platform === 'Amazon');
  setStatus(platform, 'syncing…', 'syncing');
  // Pass the active tab so background can use it directly if it's already on the right host
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.runtime.sendMessage({ type: 'TRIGGER_SYNC', platform, activeTabId: tab?.id, activeTabUrl: tab?.url }).catch(() => {});
}

async function checkVersions(trackerUrl: string | undefined) {
  const manifest = chrome.runtime.getManifest();
  const extVersion = manifest.version;
  document.getElementById('versionLabel')!.textContent = `Extension v${extVersion}`;

  try {
    const [extTags, appVersion] = await Promise.all([
      fetch('https://api.github.com/repos/frindle/resell-tracker-extension/tags', { headers: { 'User-Agent': 'resell-tracker-extension' } }).then(r => r.json()).catch(() => []),
      trackerUrl ? fetch(`${trackerUrl.replace(/\/$/, '')}/api/version`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
    ]);
    const latestExt = (extTags as { name: string }[]).find(t => /^v?\d/.test(t.name))?.name.replace(/^v/, '');
    const extOutdated = latestExt && latestExt !== extVersion;
    const appOutdated = appVersion?.outdated;

    if (extOutdated || appOutdated) {
      document.getElementById('versionUpdate')!.style.display = 'inline';
      const parts = [];
      if (extOutdated) parts.push(`ext v${latestExt}`);
      if (appOutdated) parts.push(`app v${appVersion.latest}`);
      document.getElementById('versionUpdate')!.textContent = `update available: ${parts.join(', ')}`;
    }
  } catch { /* ignore */ }
}

async function init() {
  const settings = await getSettings();

  if (!settings.trackerUrl || !settings.userId) {
    document.getElementById('notConfigured')!.style.display = 'block';
  }

  checkVersions(settings.trackerUrl).catch(() => {});

  if (settings.amazonLastSync) setMeta('Amazon', `Last sync: ${settings.amazonLastSync}`);
  if (settings.walmartLastSync) setMeta('Walmart', `Last sync: ${settings.walmartLastSync}`);
  if (settings.costcoLastSync) setMeta('Costco', `Last sync: ${settings.costcoLastSync}`);
  if (settings.bigskyLastSync) setMeta('BigSkyBuyers', `Last sync: ${settings.bigskyLastSync}`);

  // Restore in-progress or recent sync status if popup was closed during sync
  const stored = await chrome.storage.local.get(['amazonSyncStatus', 'walmartSyncStatus', 'costcoSyncStatus', 'bigskyStatus']);
  const s = stored.amazonSyncStatus as { type: string; message?: string; result?: { scraped: number; imported: number; updated: number; platform: string }; error?: string; ts: number } | undefined;
  if (s) {
    if ((s.type === 'SYNC_STARTED' || s.type === 'SYNC_PROGRESS') && Date.now() - s.ts < 5 * 60 * 1000) {
      setStatus('Amazon', s.message ?? 'syncing…', 'syncing');
      setSyncBtn('Amazon', true, true);
    } else if (s.type === 'SYNC_DONE' && s.result) {
      const text = s.result.scraped === 0 ? 'no new orders' : `+${s.result.imported} new, ${s.result.updated} updated`;
      setStatus('Amazon', text, 'ok');
    } else if (s.type === 'SYNC_ERROR') {
      setStatus('Amazon', `Error: ${s.error}`, 'fail');
    }
  }

  const ws = stored.walmartSyncStatus as { type: string; message?: string; result?: { scraped: number; imported: number; updated: number; platform: string }; error?: string; ts: number } | undefined;
  if (ws) {
    if ((ws.type === 'SYNC_STARTED' || ws.type === 'SYNC_PROGRESS') && Date.now() - ws.ts < 5 * 60 * 1000) {
      setStatus('Walmart', ws.message ?? 'syncing…', 'syncing');
      setSyncBtn('Walmart', true);
    } else if (ws.type === 'SYNC_DONE' && ws.result) {
      const text = ws.result.scraped === 0 ? 'no new orders' : `+${ws.result.imported} new, ${ws.result.updated} updated`;
      setStatus('Walmart', text, 'ok');
    } else if (ws.type === 'SYNC_ERROR') {
      setStatus('Walmart', `Error: ${ws.error}`, 'fail');
    }
  }

  const cs = stored.costcoSyncStatus as { type: string; message?: string; result?: { scraped: number; imported: number; updated: number; platform: string }; error?: string; ts: number } | undefined;
  if (cs) {
    if ((cs.type === 'SYNC_STARTED' || cs.type === 'SYNC_PROGRESS') && Date.now() - cs.ts < 5 * 60 * 1000) {
      setStatus('Costco', cs.message ?? 'syncing…', 'syncing');
      setSyncBtn('Costco', true);
    } else if (cs.type === 'SYNC_DONE' && cs.result) {
      const text = cs.result.scraped === 0 ? 'no new orders' : `+${cs.result.imported} new, ${cs.result.updated} updated`;
      setStatus('Costco', text, 'ok');
    } else if (cs.type === 'SYNC_ERROR') {
      setStatus('Costco', `Error: ${cs.error}`, 'fail');
    }
  }

  const bs = stored.bigskyStatus as { type: string; message?: string; result?: { scraped: number; imported: number; updated: number; platform: string }; error?: string; ts: number } | undefined;
  if (bs) {
    if ((bs.type === 'SYNC_STARTED' || bs.type === 'SYNC_PROGRESS') && Date.now() - bs.ts < 5 * 60 * 1000) {
      setStatus('BigSkyBuyers', bs.message ?? 'syncing…', 'syncing');
      setSyncBtn('BigSkyBuyers', true);
    } else if (bs.type === 'SYNC_DONE' && bs.result) {
      const text = bs.result.updated === 0 ? 'no new orders' : `${bs.result.updated} updated`;
      setStatus('BigSkyBuyers', text, 'ok');
    } else if (bs.type === 'SYNC_ERROR') {
      setStatus('BigSkyBuyers', `Error: ${bs.error}`, 'fail');
    }
  }

  // Update last sync display live when storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.amazonLastSync?.newValue) setMeta('Amazon', `Last sync: ${changes.amazonLastSync.newValue}`);
    if (changes.walmartLastSync?.newValue) setMeta('Walmart', `Last sync: ${changes.walmartLastSync.newValue}`);
    if (changes.costcoLastSync?.newValue) setMeta('Costco', `Last sync: ${changes.costcoLastSync.newValue}`);
    if (changes.bigskyLastSync?.newValue) setMeta('BigSkyBuyers', `Last sync: ${changes.bigskyLastSync.newValue}`);
    const bs = changes.bigskyStatus?.newValue as { type: string; message?: string; result?: { scraped: number; imported: number; updated: number; platform: string }; error?: string } | undefined;
    if (bs) {
      if (bs.type === 'SYNC_STARTED' || bs.type === 'SYNC_PROGRESS') {
        setStatus('BigSkyBuyers', bs.message ?? 'syncing…', 'syncing');
        setSyncBtn('BigSkyBuyers', true);
      } else if (bs.type === 'SYNC_DONE' && bs.result) {
        const text = bs.result.updated === 0 ? 'no new orders' : `${bs.result.updated} updated`;
        setStatus('BigSkyBuyers', text, 'ok');
        setSyncBtn('BigSkyBuyers', false);
      } else if (bs.type === 'SYNC_ERROR') {
        setStatus('BigSkyBuyers', `Error: ${bs.error}`, 'fail');
        setSyncBtn('BigSkyBuyers', false);
      }
    }
    const cs = changes.costcoSyncStatus?.newValue as { type: string; message?: string; result?: { scraped: number; imported: number; updated: number; platform: string }; error?: string } | undefined;
    if (cs) {
      if (cs.type === 'SYNC_STARTED' || cs.type === 'SYNC_PROGRESS') {
        setStatus('Costco', cs.message ?? 'syncing…', 'syncing');
        setSyncBtn('Costco', true);
      } else if (cs.type === 'SYNC_DONE' && cs.result) {
        const text = cs.result.scraped === 0 ? 'no new orders' : `+${cs.result.imported} new, ${cs.result.updated} updated`;
        setStatus('Costco', text, 'ok');
        setSyncBtn('Costco', false);
      } else if (cs.type === 'SYNC_ERROR') {
        setStatus('Costco', `Error: ${cs.error}`, 'fail');
        setSyncBtn('Costco', false);
      }
    }
    // Live sync status updates for popups opened mid-sync
    const s = changes.amazonSyncStatus?.newValue as { type: string; message?: string; result?: { scraped: number; imported: number; updated: number; platform: string }; error?: string; ts: number } | undefined;
    if (s) {
      if (s.type === 'SYNC_STARTED' || s.type === 'SYNC_PROGRESS') {
        setStatus('Amazon', s.message ?? 'syncing…', 'syncing');
        setSyncBtn('Amazon', true, true);
      } else if (s.type === 'SYNC_DONE' && s.result) {
        const text = s.result.scraped === 0 ? 'no new orders' : `+${s.result.imported} new, ${s.result.updated} updated`;
        setStatus('Amazon', text, 'ok');
        setSyncBtn('Amazon', false);
      } else if (s.type === 'SYNC_ERROR') {
        setStatus('Amazon', `Error: ${s.error}`, 'fail');
        setSyncBtn('Amazon', false);
      }
    }
  });

  document.getElementById('syncAmazon')!.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    if (btn.dataset.cancel) cancelSync('Amazon'); else triggerSync('Amazon');
  });
  document.getElementById('syncWalmart')!.addEventListener('click', () => triggerSync('Walmart'));
  document.getElementById('syncCostco')!.addEventListener('click', () => triggerSync('Costco'));
  document.getElementById('syncBigsky')!.addEventListener('click', () => triggerSync('BigSkyBuyers'));

  document.getElementById('openSettings')!.addEventListener('click', e => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  chrome.runtime.onMessage.addListener((message: SyncMessage) => {
    if (message.type === 'SYNC_STARTED') {
      setStatus(message.platform, 'syncing…', 'syncing');
      setSyncBtn(message.platform, true, message.platform === 'Amazon');
    } else if (message.type === 'SYNC_PROGRESS') {
      setStatus(message.platform, message.message, 'syncing');
    } else if (message.type === 'SYNC_DONE') {
      const { result } = message;
      const text = result.scraped === 0
        ? 'no new orders'
        : `+${result.imported} new, ${result.updated} updated`;
      setStatus(result.platform, text, 'ok');
      setMeta(result.platform, `Last sync: ${new Date().toISOString().split('T')[0]}`);
      setSyncBtn(result.platform, false);
    } else if (message.type === 'SYNC_ERROR') {
      setStatus(message.platform, `Error: ${message.error}`, 'fail');
      setSyncBtn(message.platform, false);
    }
  });
}

init();
initDevMode();

// Hide pop-out button when already running as a standalone window
if (new URLSearchParams(location.search).get('standalone')) {
  const btn = document.getElementById('popOutBtn');
  if (btn) btn.style.display = 'none';
} else {
  document.getElementById('popOutBtn')?.addEventListener('click', () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html?standalone=1'),
      type: 'popup',
      width: 340,
      height: 680,
    });
  });
}

// ── Dev Mode ──────────────────────────────────────────────────────────────────

function renderLogs(logs: ApiLogEntry[]) {
  const el = document.getElementById('devLog')!;
  const count = document.getElementById('devLogCount')!;
  count.textContent = `${logs.length} request${logs.length === 1 ? '' : 's'}`;
  if (!logs.length) { el.innerHTML = '<div style="padding:6px 8px;color:#4b5563;">No requests captured yet.</div>'; return; }

  el.innerHTML = logs.slice().reverse().map(e => {
    const statusColor = !e.status ? '#6b7280' : e.status < 300 ? '#4ade80' : e.status < 400 ? '#fbbf24' : '#f87171';
    const path = (() => { try { return new URL(e.url).pathname; } catch { return e.url; } })();
    return `<div style="padding:4px 8px;border-bottom:1px solid #1f2937;cursor:pointer;" data-id="${e.id}" class="dev-log-row">
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#60a5fa;font-weight:bold;">${e.method}</span>
        <span style="color:${statusColor}">${e.status ?? (e.error ? 'ERR' : '—')}</span>
      </div>
      <div style="color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${e.url}">${path}</div>
      ${e.error ? `<div style="color:#f87171;">${e.error}</div>` : ''}
    </div>`;
  }).join('');

  // Click to toggle body details
  el.querySelectorAll('.dev-log-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = parseInt((row as HTMLElement).dataset.id ?? '');
      const entry = logs.find(l => l.id === id);
      if (!entry) return;
      const existing = row.querySelector('.dev-detail');
      if (existing) { existing.remove(); return; }
      const detail = document.createElement('div');
      detail.className = 'dev-detail';
      detail.style.cssText = 'margin-top:4px;color:#d1d5db;word-break:break-all;white-space:pre-wrap;';
      const parts: string[] = [];
      if (entry.duration != null) parts.push(`⏱ ${entry.duration}ms`);
      if (entry.reqBody) parts.push(`REQ: ${entry.reqBody}`);
      if (entry.resBody) parts.push(`RES: ${entry.resBody}`);
      detail.textContent = parts.join('\n') || '(no body)';
      row.appendChild(detail);
    });
  });
}

async function initDevMode() {
  const toggle = document.getElementById('devToggle') as HTMLInputElement;
  const label = document.getElementById('devToggleLabel')!;
  const controls = document.getElementById('devControls')!;
  const urlInput = document.getElementById('devUrl') as HTMLInputElement;
  const spyNowBtn = document.getElementById('devSpyNow')!;
  const copyBtn = document.getElementById('devCopyJson')!;
  const clearBtn = document.getElementById('devClear')!;

  // Load persisted state
  const stored = await chrome.storage.local.get(['devMode', 'devModeUrl', 'apiLogs']);
  const isOn = !!(stored.devMode as boolean | undefined);
  const savedUrl = (stored.devModeUrl as string | undefined) ?? '';
  const logs = (stored.apiLogs as ApiLogEntry[] | undefined) ?? [];

  toggle.checked = isOn;
  label.textContent = isOn ? 'on' : 'off';
  controls.style.display = isOn ? 'block' : 'none';
  urlInput.value = savedUrl;
  renderLogs(logs);

  toggle.addEventListener('change', async () => {
    const on = toggle.checked;
    label.textContent = on ? 'on' : 'off';
    controls.style.display = on ? 'block' : 'none';
    await chrome.storage.local.set({ devMode: on });
  });

  urlInput.addEventListener('change', async () => {
    await chrome.storage.local.set({ devModeUrl: urlInput.value.trim() });
  });

  spyNowBtn.addEventListener('click', async () => {
    await chrome.storage.local.set({ devModeUrl: urlInput.value.trim() });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    spyNowBtn.textContent = 'Injecting…';
    chrome.runtime.sendMessage({ type: 'DEV_SPY_NOW', tabId: tab.id }, (resp) => {
      const ok = !chrome.runtime.lastError && !resp?.error;
      spyNowBtn.textContent = ok ? 'Injected ✓' : 'Failed ✗';
      setTimeout(() => { spyNowBtn.textContent = 'Spy'; }, 2000);
    });
  });

  document.getElementById('devSpyReload')?.addEventListener('click', async () => {
    await chrome.storage.local.set({ devModeUrl: urlInput.value.trim() });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const btn = document.getElementById('devSpyReload') as HTMLButtonElement;
    btn.textContent = 'Injecting…';
    chrome.runtime.sendMessage({ type: 'DEV_SPY_NOW', tabId: tab.id }, (resp) => {
      if (chrome.runtime.lastError || resp?.error) {
        btn.textContent = 'Failed ✗';
        setTimeout(() => { btn.textContent = 'Spy + Reload'; }, 2000);
        return;
      }
      chrome.tabs.reload(tab.id!);
      btn.textContent = 'Spy + Reload';
    });
  });

  copyBtn.addEventListener('click', async () => {
    const s = await chrome.storage.local.get('apiLogs');
    const text = JSON.stringify((s.apiLogs as ApiLogEntry[] | undefined) ?? [], null, 2);
    await navigator.clipboard.writeText(text).catch(() => {});
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 1500);
  });

  clearBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'DEV_LOGS_CLEAR' }, () => {
      renderLogs([]);
    });
  });

  // Live updates as logs come in
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.apiLogs?.newValue) renderLogs(changes.apiLogs.newValue as ApiLogEntry[]);
  });
}
