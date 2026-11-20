// Which browser this extension instance runs in, for the tracker's
// X-Extension-Browser header and the toolbar icon.
//
// Do NOT test for a global `browser` object: Chromium (Brave 157 included)
// now exposes `browser` as an alias of `chrome` in extension contexts, so
// that test called Brave "firefox", the tracker filtered out every Amazon
// command (targeted at 'chrome'), and Sync Amazon waited forever. The
// extension's own URL scheme is the one signal no Chromium browser shares.
export type ExtensionBrowser = 'firefox' | 'chrome';

export function extensionBrowser(extensionBaseUrl: string): ExtensionBrowser {
  return extensionBaseUrl.startsWith('moz-extension://') ? 'firefox' : 'chrome';
}
