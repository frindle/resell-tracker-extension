import { extractDestParam, scrubUrl } from './scrubLink.ts';

// Buying-group sites whose outbound deal links are sent through the tracker's
// /go page. The content script only rewrites where a click goes: it reads no
// page data (Cash Out Kings' terms forbid scraping).

export type GroupKey = 'bfmr' | 'bg' | 'bigsky' | 'cok';

export interface GroupSite {
  key: GroupKey;
  label: string;
  /** Registrable domain; this and its subdomains are "the group's own site". */
  domain: string;
  note?: string;
}

export const GROUP_SITES: GroupSite[] = [
  { key: 'bfmr', label: 'BFMR', domain: 'bfmr.com' },
  { key: 'bg', label: 'BuyingGroup', domain: 'buyinggroup.com' },
  { key: 'bigsky', label: 'Big Sky Buyers', domain: 'bigskybuyers.com' },
  { key: 'cok', label: 'Cash Out Kings', domain: 'thecashoutkings.com', note: 'Only redirects your clicks; reads and sends nothing from the page.' },
];

export const GROUP_LINKS_KEY = 'groupLinkSites';
export type GroupLinkSettings = Partial<Record<GroupKey, boolean>>;

/** Every site is off until switched on in Settings (that also asks for the site permission). */
export function isGroupEnabled(s: GroupLinkSettings | undefined, key: GroupKey): boolean {
  return s?.[key] === true;
}

export function originsForGroup(site: GroupSite): string[] {
  return [`https://*.${site.domain}/*`, `https://${site.domain}/*`];
}

export function siteForHost(hostname: string): GroupSite | null {
  const h = hostname.toLowerCase();
  return GROUP_SITES.find(s => h === s.domain || h.endsWith('.' + s.domain)) ?? null;
}

// Social / chat / support links on the group sites are not deals.
const NON_DEAL_DOMAINS = [
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'youtube.com', 'discord.com', 'discord.gg',
  'tiktok.com', 'linkedin.com', 't.me', 'telegram.org', 'reddit.com',
  'paypal.com', 'stripe.com', 'zendesk.com', 'intercom.io', 'cloudflare.com', 'recaptcha.net',
];

function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith('.' + domain);
}

function isDealHost(host: string, trackerHost?: string): boolean {
  if (trackerHost && host === trackerHost.toLowerCase()) return false;
  if (GROUP_SITES.some(s => hostIs(host, s.domain))) return false;
  return !NON_DEAL_DOMAINS.some(d => hostIs(host, d));
}

/**
 * True for an http(s) link that leaves the group's own site and is not obviously social or support.
 * A same-site link also counts when it wraps a retailer URL in a destination param (e.g. /out?url=https://...).
 */
export function isOutboundDealLink(href: string, site: GroupSite, trackerHost?: string): boolean {
  let u: URL;
  try { u = new URL(href); } catch { return false; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  const host = u.hostname.toLowerCase();
  if (hostIs(host, site.domain)) {
    const dest = extractDestParam(u);
    if (!dest) return false;
    try { return isDealHost(new URL(dest).hostname.toLowerCase(), trackerHost); } catch { return false; }
  }
  return isDealHost(host, trackerHost);
}

/** The tracker's portal page for a link: <base>/go?url=...&src=... */
export function buildGoUrl(trackerBase: string, href: string, src: GroupKey): string {
  const base = trackerBase.trim().replace(/\/+$/, '');
  return `${base}/go?url=${encodeURIComponent(href)}&src=${src}`;
}

/**
 * Where a clicked deal link should go. Paired with a tracker: its /go page.
 * Otherwise (no tracker URL or no secret yet): the locally scrubbed link, no network.
 */
export function destinationFor(
  href: string, src: GroupKey, settings: { trackerUrl?: string; extensionSecret?: string },
): string {
  const base = (settings.trackerUrl ?? '').trim();
  if (base && settings.extensionSecret) return buildGoUrl(base, href, src);
  return scrubUrl(href) ?? href;
}
