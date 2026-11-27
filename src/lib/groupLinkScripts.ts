import { GROUP_LINKS_KEY, GROUP_SITES, isGroupEnabled, originsForGroup, type GroupLinkSettings, type GroupSite } from './groupLinks';

// Registers the click-redirect content script only on the sites the user enabled
// AND granted access to. Same approach as the tracker-status banner: no static
// content_scripts entry and no new required host permission.

const idFor = (s: GroupSite) => `group-links-${s.key}`;

export async function syncGroupLinkScripts(): Promise<void> {
  const got = await chrome.storage.sync.get(GROUP_LINKS_KEY).catch(() => ({} as Record<string, unknown>));
  const settings = got[GROUP_LINKS_KEY] as GroupLinkSettings | undefined;
  for (const site of GROUP_SITES) {
    try { await chrome.scripting.unregisterContentScripts({ ids: [idFor(site)] }); } catch { /* not registered */ }
    if (!isGroupEnabled(settings, site.key)) continue;
    const origins = originsForGroup(site);
    if (!(await chrome.permissions.contains({ origins }).catch(() => false))) continue;
    await chrome.scripting.registerContentScripts([{
      id: idFor(site), matches: origins, js: ['content/group-links.js'], runAt: 'document_start',
    }]).catch(() => {});
  }
}
