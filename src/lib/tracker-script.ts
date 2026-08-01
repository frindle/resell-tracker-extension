// The tracker-status banner (src/content/tracker-status.ts) only needs to run
// on the user's own configured tracker origin, not on every site they visit.
// Rather than a static <all_urls> content_scripts entry (which forces the
// "read and change all your data on all websites" install warning), we
// register it dynamically for just that one origin once trackerUrl is known.

const TRACKER_SCRIPT_ID = 'tracker-status';

function hostPatternFor(trackerUrl: string): string | null {
  try {
    const u = new URL(trackerUrl.startsWith('http') ? trackerUrl : `http://${trackerUrl}`);
    return `*://${u.hostname}/*`; // scheme-agnostic, mirrors isOnTrackerPage()'s hostname-only check
  } catch {
    return null;
  }
}

async function registerTrackerScript(pattern: string): Promise<void> {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [TRACKER_SCRIPT_ID] });
  } catch { /* wasn't registered yet */ }
  await chrome.scripting.registerContentScripts([{
    id: TRACKER_SCRIPT_ID,
    matches: [pattern],
    js: ['content/tracker-status.js'],
    runAt: 'document_idle',
  }]);
}

// Requests the optional host permission for the tracker's origin and
// registers the content script for it. Must be called from a user-gesture
// handler (e.g. a button click) — chrome.permissions.request requires one.
export async function grantTrackerAccess(trackerUrl: string): Promise<boolean> {
  const pattern = hostPatternFor(trackerUrl);
  if (!pattern) return false;
  const granted = await chrome.permissions.request({ origins: [pattern] });
  if (!granted) return false;
  await registerTrackerScript(pattern);
  return true;
}

// Re-registers the content script for an origin we already hold permission
// for. Safe to call on every startup/install — no-ops if permission hasn't
// been granted (e.g. a fresh install where the user hasn't hit "Connect" yet).
export async function ensureTrackerScriptRegistered(trackerUrl: string): Promise<void> {
  const pattern = hostPatternFor(trackerUrl);
  if (!pattern) return;
  const has = await chrome.permissions.contains({ origins: [pattern] }).catch(() => false);
  if (!has) return;
  await registerTrackerScript(pattern);
}
