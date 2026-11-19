// Host-access grant flow shared by the popup and options page.
// chrome.permissions.request only works inside a user gesture, and Brave is
// strict about it: the call must be made synchronously from the click handler
// (no await, storage read or message round-trip before it).

export const AMAZON_ORIGINS = ['https://www.amazon.com/*'];

export const BRAVE_HELP =
  'If it keeps failing in Brave: open brave://extensions, click Details on this extension, set "Site access" to "On all sites" (or add the sites), then reopen this popup.';

// Explicit http/https patterns. A scheme wildcard like "*://host/*" is not a
// literal member of optional_host_permissions, and Brave can reject it.
export function originsFor(trackerUrl: string | undefined): string[] {
  const out = [...AMAZON_ORIGINS];
  if (trackerUrl) {
    try {
      const u = new URL(trackerUrl.startsWith('http') ? trackerUrl : `http://${trackerUrl}`);
      out.push(`http://${u.hostname}/*`, `https://${u.hostname}/*`);
    } catch { /* ignore bad url */ }
  }
  return out;
}

export interface PermsApi {
  contains(p: { origins: string[] }): Promise<boolean>;
  request(p: { origins: string[] }): Promise<boolean>;
}

export async function missingOrigins(perms: PermsApi, wanted: string[]): Promise<string[]> {
  const checks = await Promise.all(wanted.map(o => perms.contains({ origins: [o] }).catch(() => false)));
  return wanted.filter((_, i) => !checks[i]);
}

export interface GrantResult { ok: boolean; message: string }

// Must be invoked synchronously from the click handler: the first thing it
// does is call perms.request (no await before it). `missing` is computed
// beforehand (at render time), never inside the gesture.
export function requestGrant(perms: PermsApi, missing: string[], wanted: string[]): Promise<GrantResult> {
  let pending: Promise<boolean>;
  try {
    pending = perms.request({ origins: missing });
  } catch (e) {
    pending = Promise.reject(e);
  }
  return pending
    .then(() => true, () => false)
    .then(async () => {
      // Trust contains(), not the request result: browsers disagree on it.
      const still = await missingOrigins(perms, wanted);
      if (!still.length) return { ok: true, message: 'Access granted.' };
      return { ok: false, message: `Access was not granted; capture will not work until it is. ${BRAVE_HELP}` };
    });
}
