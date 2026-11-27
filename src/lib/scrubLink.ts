// Local link scrubbing, a port of the tracker's resolve-link param stripping and
// destination unwrapping. No network: it never follows a redirect, so a redirector
// that hides its target behind a server-side hop is returned as-is (cleaned).

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'tag', 'linkCode', 'camp', 'creative', 'creativeASIN', 'ascsubtag', 'linkId',
  'wmlspartner', 'affp', 'veh', 'sourceid', 'adid',
  'WT.mc_id', 'icmpid', 'cid',
  'ranMID', 'ranEAID', 'ranSiteID', 'AID', 'PID', 'u1',
  'ref', 'aff_id', 'affiliate_id', 'clickid', 'click_id', 'sid', 'vsid',
  'cmpid', 'cmp', 'LSNSUBSITE', 'LSNPUBID',
]);

const RETAIL_DOMAINS = new Set([
  'amazon.com', 'walmart.com', 'bestbuy.com', 'target.com',
  'dell.com', 'costco.com', 'bhphotovideo.com', 'homedepot.com',
  'lowes.com', 'staples.com', 'samsclub.com', 'bedbathandbeyond.com',
]);

// Param names cashback/affiliate redirectors use to carry the real destination.
const DEST_PARAMS = ['url', 'dest', 'destination', 'u', 'r', 'redirect', 'to', 'target', 'link', 'goto', 'out'];

const bare = (host: string) => host.replace(/^www\./, '');

function extractDestParam(u: URL): string | null {
  for (const p of DEST_PARAMS) {
    const v = u.searchParams.get(p);
    if (v && (v.startsWith('https://') || v.startsWith('http://'))) return v;
  }
  return null;
}

export function cleanUrl(raw: string): string {
  let u: URL;
  try { u = new URL(raw); } catch { return raw; }

  const host = bare(u.hostname);

  if (host === 'amazon.com' || host.endsWith('.amazon.com')) {
    const m = u.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
    if (m) return `https://www.amazon.com/dp/${m[1]}`;
  }
  if (host === 'walmart.com') return `https://www.walmart.com${u.pathname}`;
  if (host === 'bestbuy.com') return `https://www.bestbuy.com${u.pathname}`;
  if (host === 'target.com') return `https://www.target.com${u.pathname}`;
  if (host === 'dell.com' || host.endsWith('.dell.com')) return `https://www.dell.com${u.pathname}`;

  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key) || key.toLowerCase().startsWith('utm_')) u.searchParams.delete(key);
  }
  return u.toString();
}

/** Scrubbed destination for a link, or null when it is not an http(s) URL. */
export function scrubUrl(raw: string): string | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (RETAIL_DOMAINS.has(bare(u.hostname))) return cleanUrl(raw);
  const dest = extractDestParam(u);
  if (dest) return cleanUrl(dest);
  return cleanUrl(raw);
}
