// Runs on the buying-group sites the user switched on in Settings. It only decides
// where a clicked outbound link goes; it never reads, stores or sends page content.
import { GROUP_LINKS_KEY, destinationFor, isGroupEnabled, isOutboundDealLink, siteForHost, type GroupLinkSettings } from '../lib/groupLinks';

const site = siteForHost(location.hostname);

if (site) {
  let enabled = false;
  let cfg: { trackerUrl?: string; extensionSecret?: string } = {};
  const load = () => chrome.storage.sync.get(['trackerUrl', 'extensionSecret', GROUP_LINKS_KEY]).then(r => {
    enabled = isGroupEnabled(r[GROUP_LINKS_KEY] as GroupLinkSettings | undefined, site.key);
    cfg = { trackerUrl: r.trackerUrl as string | undefined, extensionSecret: r.extensionSecret as string | undefined };
  }).catch(() => {});
  load();
  chrome.storage.onChanged.addListener(load);

  const handle = (e: MouseEvent) => {
    if (!enabled || e.defaultPrevented) return;
    const isAux = e.type === 'auxclick';
    if (isAux ? e.button !== 1 : e.button !== 0) return;
    const el = e.target instanceof Element ? e.target.closest('a[href]') as HTMLAnchorElement | null : null;
    if (!el || el.hasAttribute('download')) return;
    const href = el.href;
    let trackerHost: string | undefined;
    try { trackerHost = cfg.trackerUrl ? new URL(cfg.trackerUrl).hostname : undefined; } catch { /* ignore */ }
    if (!isOutboundDealLink(href, site, trackerHost)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const background = isAux || e.ctrlKey || e.metaKey;
    chrome.runtime.sendMessage({ type: 'OPEN_GROUP_LINK', url: destinationFor(href, site.key, cfg), background }).catch(() => {});
  };
  document.addEventListener('click', handle, true);
  document.addEventListener('auxclick', handle, true);
}
