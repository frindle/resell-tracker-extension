# Resell Tracker Sync Extension

Browser extension (Chrome, Firefox, Safari) that automatically syncs Amazon and Walmart orders to your self-hosted [Resell Tracker](https://github.com/frindle/resell-tracker) instance whenever you visit your orders pages.

## Features

- Auto-syncs when you navigate to Amazon or Walmart orders
- Captures order number, date, items, shipping address, and tracking numbers
- Deduplicates against existing orders in your tracker
- Configurable "since" date so you control how far back it goes

## Setup

### 1. Build

```bash
npm install
npm run build
```

### 2. Load in browser

**Chrome / Edge**
1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" → select the `dist/` folder

**Firefox**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on" → select `dist/manifest.json`

**Safari**
```bash
xcrun safari-web-extension-converter dist/ --project-location ./safari --app-name "Resell Tracker Sync"
```
Then open the Xcode project, build, and enable in Safari → Settings → Extensions.

### 3. Configure

Click the extension icon → Settings, then enter your tracker URL (e.g. `http://10.0.12.39:3000`) and test the connection.

## Development

```bash
npm run watch   # rebuilds on file changes
```

## Tracker-side requirement

The `/api/import` endpoint needs to accept a `trackingNumbers` array on each order. This is tracked in the main repo's TODO.

## Changelog

### 1.1.15
- Fix cancelRequested not reset on page-navigation sync resume (could permanently abort syncs after a cancel)
- Fix onUpdated listener leak when 10s tab-load timeout fires before page completes
- Fix appendApiLog race condition in dev mode (concurrent writes could drop entries)
- Fix fetchUsers crash when background returns non-array response
- Fix BigSkyBuyers tRPC response not null-guarded (auth errors threw confusing TypeError)
- Fix BigSkyBuyers popup status showing "+0 new" on live updates (now consistent with stored display)
- Fix backfill requests missing X-API-Key header (caused 401 on authenticated deployments)
- Fix badge showing "+undefined" when server omits imported count from response
- Remove dead duplicate Walmart address DOM fallback block

### 1.1.14
- Fix Firefox pinned toolbar icon: use SVG instead of PNG for action icon (Firefox supports SVG; PNG toolbar rendering was silently failing)

### 1.1.13
- Add dev mode API spy: toggle in popup, enter any hostname, click "Spy Now" to intercept all fetch/XHR on that tab; logs show live in popup with click-to-expand request/response bodies and Copy JSON export

### 1.1.12
- Fix pinned toolbar icon missing on HiDPI/Retina displays: add 32px icon variant Firefox uses for high-DPI toolbar

### 1.1.11
- Fix blank toolbar icon: source PNG files were empty/transparent; replaced with dark gray background and white $ symbol matching app theme

### 1.1.10
- Fix blank toolbar icon in Firefox: use `browser.action.setIcon()` (Firefox native API) instead of `chrome.action.setIcon()` which is not available in Firefox background pages

### 1.1.9
- Fix blank toolbar icon in Firefox MV3: call `chrome.action.setIcon()` explicitly at startup since Firefox often ignores `default_icon` in the manifest

### 1.1.8
- Fix blank toolbar icon in Firefox: PNG files declared RGB in header but contained RGBA data; Firefox is strict about this while Chrome is not

### 1.1.7
- Fix Walmart order detail scraping: cost, item name, and shipping address now correctly extracted from `__NEXT_DATA__` JSON (versioned groups key, `priceDetails.grandTotal.value` for cost)

### 1.1.6
- Fix Firefox blocking HTTP requests to local IPs — override default CSP that adds upgrade-insecure-requests

### 1.1.5
- Try XHR instead of fetch in background for Firefox local network compatibility

### 1.1.4
- Fix Firefox network error: route user fetch through background to bypass local network access restrictions

### 1.1.3
- Fix Firefox options page user fetch (remove Content-Type header that triggered CORS preflight)

### 1.1.2
- Fix "Could not load users" error in Firefox options page — fetch users directly instead of routing through background

### 1.1.1
- Fix missing toolbar icon in Firefox

### 1.1.0
- Add Firefox support with AMO-signed XPI (requires Firefox 128+)
- Bump minimum Firefox version to 128 for MAIN world content script support

### 1.0.2
- Add Costco online order scraping via GraphQL API
- Bulk backfill button for existing Amazon orders missing item descriptions or shipping addresses
- Fix calendar icon invisible in dark mode on options page
- Add payment due date field support

### 1.0.1
- Fix popup status not updating when opened mid-sync in a new tab — now tracks live status via `chrome.storage.onChanged`

### 1.0.0
- Initial release
