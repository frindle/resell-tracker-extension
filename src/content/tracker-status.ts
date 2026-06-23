// Renders a small floating sync-status banner on the resell-tracker pages.
//
// The extension writes per-platform status into chrome.storage.local under
// {amazon,walmart,costco}SyncStatus. This script:
//   1. Self-filters by checking if the current URL matches the user's
//      configured trackerUrl (we don't know it at manifest-match time so
//      we match broadly and bail if we're on the wrong site).
//   2. Reads all current statuses + subscribes to changes.
//   3. Renders a fixed-position banner in the bottom-right with one row
//      per active platform. Done/error states auto-dismiss after 30s.

type SyncStatus = {
  type: 'SYNC_STARTED' | 'SYNC_PROGRESS' | 'SYNC_DONE' | 'SYNC_ERROR';
  message?: string;
  result?: { platform: string; scraped?: number; imported?: number; updated?: number; skipped?: number };
  error?: string;
  ts: number;
};

const PLATFORMS = [
  { key: 'amazonSyncStatus',  name: 'Amazon',  color: '#ff9900' },
  { key: 'walmartSyncStatus', name: 'Walmart', color: '#0071dc' },
  { key: 'costcoSyncStatus',  name: 'Costco',  color: '#e31837' },
  { key: 'bigskySyncStatus',  name: 'BigSky',  color: '#0ea5e9' },
] as const;

async function isOnTrackerPage(): Promise<boolean> {
  const { trackerUrl } = await chrome.storage.sync.get(['trackerUrl']) as { trackerUrl?: string };
  if (!trackerUrl) return false;
  try {
    const tracker = new URL(trackerUrl.startsWith('http') ? trackerUrl : `http://${trackerUrl}`);
    return location.hostname === tracker.hostname;
  } catch {
    return false;
  }
}

function renderStatus(statuses: Record<string, SyncStatus | undefined>) {
  // Prefer an in-page mount point if the tracker UI provided one
  // (data-rt-sync-target). Falls back to a floating bottom-right card so the
  // banner still shows up on pages that don't have the mount point (e.g.
  // older deploys of the tracker).
  const mountTarget = document.querySelector<HTMLElement>('[data-rt-sync-target]');
  let container = document.getElementById('rt-sync-banner');

  const mountedStyle = [
    'display:flex', 'flex-direction:column', 'gap:6px',
    'font-family:system-ui,-apple-system,sans-serif', 'font-size:13px',
    'align-items:flex-end',
  ].join(';');
  const floatingStyle = [
    'position:fixed', 'bottom:16px', 'right:16px', 'z-index:2147483647',
    'display:flex', 'flex-direction:column', 'gap:8px',
    'font-family:system-ui,-apple-system,sans-serif', 'font-size:13px',
    'pointer-events:none',
  ].join(';');

  if (container && mountTarget && !mountTarget.contains(container)) {
    container.style.cssText = mountedStyle;
    mountTarget.appendChild(container);
  }

  if (!container) {
    container = document.createElement('div');
    container.id = 'rt-sync-banner';
    if (mountTarget) {
      container.style.cssText = mountedStyle;
      mountTarget.appendChild(container);
    } else {
      container.style.cssText = floatingStyle;
      document.body.appendChild(container);
    }
  }

  // Cap the display window — anything older than 30s for DONE/ERROR drops off.
  const now = Date.now();
  const cards: string[] = [];
  for (const p of PLATFORMS) {
    const s = statuses[p.key];
    if (!s) continue;
    const isActive = s.type === 'SYNC_STARTED' || s.type === 'SYNC_PROGRESS';
    const isError  = s.type === 'SYNC_ERROR';
    const isDone   = s.type === 'SYNC_DONE';
    // Auto-dismiss DONE / ERROR after 30s
    if ((isDone || isError) && now - s.ts > 30_000) continue;

    const accent = isError ? '#dc2626' : isDone ? '#16a34a' : p.color;
    const label =
      isActive ? (s.message ?? 'syncing…')
      : isError ? `error: ${s.error ?? 'unknown'}`
      : isDone ? formatResult(s.result)
      : s.type;
    const spinner = isActive ? '<span class="rt-spin">⟳</span>' : '';

    cards.push(`
      <div style="pointer-events:auto;background:#111827;color:#e5e7eb;border:1px solid #374151;border-left:3px solid ${accent};border-radius:6px;padding:8px 12px;box-shadow:0 4px 12px rgba(0,0,0,.4);max-width:320px;display:flex;align-items:center;gap:8px;">
        ${spinner}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;color:${accent}">${p.name}</div>
          <div style="font-size:11px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(label)}</div>
        </div>
        ${isDone || isError ? `<button data-rt-dismiss="${p.key}" style="background:none;border:none;color:#6b7280;cursor:pointer;padding:0 4px;font-size:14px;line-height:1;">×</button>` : ''}
      </div>
    `);
  }

  container.innerHTML = cards.length === 0 ? '' : `
    <style>
      @keyframes rt-spin { from { transform:rotate(0); } to { transform:rotate(360deg); } }
      #rt-sync-banner .rt-spin { display:inline-block; animation: rt-spin 1.2s linear infinite; color:#60a5fa; }
    </style>
    ${cards.join('')}
  `;

  container.querySelectorAll<HTMLButtonElement>('[data-rt-dismiss]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.getAttribute('data-rt-dismiss');
      if (key) chrome.storage.local.remove(key);
    };
  });
}

function formatResult(r?: SyncStatus['result']): string {
  if (!r) return 'done';
  const parts: string[] = [];
  if (typeof r.imported === 'number') parts.push(`${r.imported} new`);
  if (typeof r.updated === 'number') parts.push(`${r.updated} updated`);
  if (typeof r.skipped === 'number' && r.skipped > 0) parts.push(`${r.skipped} skipped`);
  if (typeof r.scraped === 'number' && parts.length === 0) parts.push(`${r.scraped} scraped`);
  return parts.length ? `done · ${parts.join(', ')}` : 'done';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

async function refresh() {
  const keys = PLATFORMS.map(p => p.key);
  const data = await chrome.storage.local.get(keys) as Record<string, SyncStatus | undefined>;
  renderStatus(data);
}

(async () => {
  if (!(await isOnTrackerPage())) return;
  refresh();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (Object.keys(changes).some(k => PLATFORMS.some(p => p.key === k))) refresh();
  });
  // Repaint every 5s so the auto-dismiss timer fires without needing a storage change
  setInterval(refresh, 5000);

  // Nudge the background to poll commands every 15s while the user is here.
  // Chrome MV3 caps alarms at 1-min, so queued SYNC_* commands would otherwise
  // wait up to 60s for the background to wake. Background rate-limits to one
  // real poll per 10s, so this is cheap. Also fire once on load so a Sync
  // button click → response is near-instant.
  const nudge = () => chrome.runtime.sendMessage({ type: 'POLL_COMMANDS_NOW' }).catch(() => null);
  nudge();
  setInterval(nudge, 15_000);
})();
