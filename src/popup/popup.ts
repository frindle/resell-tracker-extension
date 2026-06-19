import { getSettings } from '../lib/storage';
import type { ApiLogEntry } from '../lib/types';

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

  // Show last poll time for tracker commands
  const pollStored = await chrome.storage.local.get('lastPoll');
  if (pollStored.lastPoll) {
    const ago = Math.round((Date.now() - (pollStored.lastPoll as number)) / 1000);
    document.getElementById('pollMeta')!.textContent = `last poll: ${ago}s ago`;
    document.getElementById('pollStatus')!.textContent = 'active';
    document.getElementById('pollStatus')!.className = 'status ok';
  }

  document.getElementById('openSettings')!.addEventListener('click', e => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
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
  const reqLimitInput = document.getElementById('devReqLimit') as HTMLInputElement;
  const resLimitInput = document.getElementById('devResLimit') as HTMLInputElement;
  const spyNowBtn = document.getElementById('devSpyNow')!;
  const copyBtn = document.getElementById('devCopyJson')!;
  const clearBtn = document.getElementById('devClear')!;

  // Load persisted state
  const stored = await chrome.storage.local.get(['devMode', 'devModeUrl', 'apiLogs', 'spyReqLimit', 'spyResLimit']);
  const isOn = !!(stored.devMode as boolean | undefined);
  const savedUrl = (stored.devModeUrl as string | undefined) ?? '';
  const logs = (stored.apiLogs as ApiLogEntry[] | undefined) ?? [];

  toggle.checked = isOn;
  label.textContent = isOn ? 'on' : 'off';
  controls.style.display = isOn ? 'block' : 'none';
  urlInput.value = savedUrl;
  if (stored.spyReqLimit != null) reqLimitInput.value = String(stored.spyReqLimit);
  if (stored.spyResLimit != null) resLimitInput.value = String(stored.spyResLimit);
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

  reqLimitInput.addEventListener('change', async () => {
    const v = parseInt(reqLimitInput.value);
    if (!isNaN(v) && v > 0) await chrome.storage.local.set({ spyReqLimit: v });
  });

  resLimitInput.addEventListener('change', async () => {
    const v = parseInt(resLimitInput.value);
    if (!isNaN(v) && v > 0) await chrome.storage.local.set({ spyResLimit: v });
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
