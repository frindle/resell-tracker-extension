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

### 1.1.41
- Amazon: skip promotional cards (Amazon Business Card, Prime Visa, Amazon Store Card, etc.) that get injected into the orders DOM with order-detail-style links. They had real-looking order IDs in `113-...` format but didn't resolve in the user's account.
- Amazon: log every added order's cardText snippet so future false positives are easy to diagnose without rebuilding.

### 1.1.40
- Walmart: filter out Walmart's internal tracking IDs (start with `555`, 18+ digits, e.g. `55533883340850446553`) — these aren't real carrier numbers and don't track on UPS/FedEx/USPS. Genuine FedEx numbers starting with 5 (typically 12-15 digits) are kept.
- Walmart: also drop the order number itself if it leaked into the tracking-number list.
- Capture full order placed timestamp (with time) from Walmart's `__NEXT_DATA__` instead of truncating to YYYY-MM-DD. Amazon: added detail-page time-candidate probe that logs ISO/JSON/data-attribute candidates for later refinement.

### 1.1.39
- Walmart scraper: broader cancelled-order detection. Previous regex caught only literal "cancelled/canceled" inside the order DOM block, missing Walmart's separate cancel banner ("we had to cancel these items", "won't be charged", "released the temporary hold"). Now matches all common cancel-banner phrases.
- Log a blockText snippet on every added Walmart order so future cancel-detection failures can be diagnosed from the service worker console without code changes.

### 1.1.37
- Bump dev mode API spy response capture limit from 1000 to 2500 chars to avoid truncating larger API responses (e.g. CardCenter Submissions)

### 1.1.32
- Fix blank receipt: capture .MuiDialog-paper (the card content) instead of role=dialog outer element which has fixed positioning and renders off-screen in a standalone HTML file

### 1.1.31
- Fix Costco receipt capture: detect canvas-rendered receipt (Costco renders receipt as PDF onto canvas); use toDataURL() to capture pixels as PNG data URLs embedded in the saved HTML instead of blank outerHTML

### 1.1.30
- Fix Costco receipt HTML capture: wait for "Print Receipt" button to appear inside the dialog (confirms receipt content is fully rendered) before capturing outerHTML
- Capture page's MUI/emotion style tags and external stylesheets alongside the dialog HTML so the saved receipt renders correctly when opened

### 1.1.29
- Fix Costco receipt HTML capture: replace fixed 2s wait with a poll-based wait (up to 6s) for the dialog to appear; try multiple selectors including `.MuiDialog-paper` and "Print Receipt" text fallback
- Server now saves Costco's rendered receipt modal as an HTML attachment instead of a custom-generated PDF

### 1.1.28
- Costco receipt sync: pass captured modal HTML to server; server saves it as HTML attachment instead of generating a low-quality PDF
- Fix receipt interceptor: detail responses (1 receipt) now overwrite the list entry so full item data is used instead of minimal list data
- Add "Reset all (re-import)" button to /costco debug page to unlink and re-import receipts with corrected HTML

### 1.1.21
- Add Costco warehouse receipt sync: fetches all in-warehouse receipts for the sync date range, generates a thermal-receipt-style PDF for each, and stores it as an attachment on the matching order. Receipts are auto-linked when exactly one order shares the same date; ambiguous matches surface as a link prompt on the order detail page.

### 1.1.20
- Fix Costco sync crash when API returns null status or carrierName on a line item
- Fix Costco getAuth returning empty clientId when /gettoken succeeds but URL lacks the account UUID path
- Fix upgradeUrl() incorrectly upgrading http://localhost to https://
- Fix Amazon clearState() called before detail-fetch loop; moved to after pushOrders succeeds so a tab close mid-fetch no longer silently drops scraped orders
- Fix Spy and Spy+Reload buttons showing success when injection fails on a restricted page
- Fix Walmart year-flip misfiring on near-future delivery date strings (e.g. "Delivering on Jan 5")

### 1.1.19
- Dev mode: move hostname input to its own row, show Spy and Spy+Reload as equal-width buttons below

### 1.1.18
- Fix dev mode spy missing page-load requests: inject at navigation start (loading) instead of after page completes

### 1.1.17
- Add "Spy & Reload" button in dev mode: injects the API spy then immediately reloads the tab, capturing page-load requests in one click

### 1.1.16
- Add pop-out button (↗) to open popup as a persistent standalone window that stays open during syncs and dev mode spying

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
