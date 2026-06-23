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

### 1.1.54
- **Walmart + Amazon last-4: tighter text regex.** v1.1.53's catch-all `\W{2,}\s*(\d{4})` matched four-digit years (real example: extension captured `2026` from an order placed on `2026-06-22`). Replaced with a fixed list of explicit card patterns (`ending in 1234`, `**1234`, `xxxx1234`, unicode bullets, HTML entities) tried in order.
- **Amazon last-4 from detail page too.** List card often omits the payment method; detail page reliably shows "Visa ending in 1234". Detail extraction added, propagated to ScrapedOrder, logged on `[AMZ] tracking for` line.

### 1.1.53
- **Walmart last-4: pull from NEXT_DATA JSON first.** v1.1.51's visible-text regex never fired because Walmart embeds the card under JSON keys (`lastFour`, `lastFourDigits`, `cardLast4`, `last4`, `cardNumberLast4`, `accountNumberLast4`) in NEXT_DATA, not in user-facing text. Try each of those keys before falling back to a broader text regex. Detail log line now ends with `last4: 1234 [json:lastFour]` or `[text]` so we can verify the path.
- **Amazon last-4 regex broadened** to cover unicode bullets / x-runs (`Visa ••1234`, `xxxx1234`). Adding-order log line now includes `last4: 1234` so we can spot missed captures.

### 1.1.52
- **Side-by-side sync banners.** When Amazon + Walmart finish around the same time the status cards now lay out horizontally (wrap to a second row if there's no room) instead of stacking on top of each other.
- **Clickable sync banners.** Done cards include the import's `eventId`, so clicking the card jumps to `/sync-history?event=<id>` on the tracker — the new history page shows per-order field diffs for that scrape.

### 1.1.51
- **Walmart item descriptions: stop polluting with "Walmart.com".** The detail-page script-tag scan used to match any `"name": "..."` JSON field, which on Walmart pages often landed on a seller/brand/category name rather than the product. Dropped bare `name` from the regex (productInfo.name is still reached via the direct NEXT_DATA path), and added a final sanity check that rejects `Walmart.com` / `Walmart` / `Loading` if they leak through any path.
- **Walmart payment last-4 from detail page.** The order list rarely shows the card; capture the `ending in 1234` / `••1234` / `**1234` line from the detail HTML too. Enables card auto-assign on import to actually work for Walmart.

### 1.1.50
- Diagnostic logging on Walmart sync: `[WM/diag] <orderNumber> status: <status> candidates: <n1>[origin], <n2>[origin], ...` for every order whose detail-fetch ran. Lets us see exactly which tracking-shaped numbers are in Walmart's HTML and where each came from (NEXT_DATA trackingNumber field, a stray 20-22 digit run in some other JSON blob, etc.). Will use this to design a smarter filter.

### 1.1.49
- **Removed Walmart order-number tracking fallback.** v1.1.44 added a fallback that wrote the Walmart order number as the tracking value when only internal `555…` IDs were filtered out. Walmart embeds 555-prefixed IDs in every order's NEXT_DATA — including not-yet-shipped orders — so the fallback fired on every sync and overwrote orders with fake tracking. Real carrier numbers (UPS / FedEx / USPS) still flow through unchanged. If you need the Walmart order number on a specific order, set it manually.

### 1.1.48
- Sync-status banner: when the tracker page provides a `[data-rt-sync-target]` mount point (orders page in v1.1.48+ tracker), render the status inline there instead of floating in the bottom-right corner. Same status content; just lives next to the Sync buttons where it makes contextual sense. Falls back to floating bottom-right on pages without the mount point.

### 1.1.47
- **Faster sync after click.** Chrome MV3 caps `chrome.alarms` at 1-minute periods, so a queued sync could wait up to 60s for the background to wake. The tracker-status content script (already running on tracker pages) now sends a `POLL_COMMANDS_NOW` message to the background every 15s, and on page load. Background rate-limits to one real poll per 10s. Net: clicking Sync in the tracker UI now fires within ~15s.

### 1.1.46
- **Backfill: Walmart support** — the "Backfill missing data" button on the Options page now backfills Walmart orders too (was Amazon-only). Walmart detail page is parsed via `__NEXT_DATA__` for item name + shipping address; Amazon path unchanged.
- Pairs with the tracker-side fix that respects `X-Extension-User-Id` (the previous "Nothing to backfill" message was the tracker returning 0 orders because session auth was missing).

### 1.1.45
- Amazon + Walmart: capture payment-method last 4 digits when present in the order card text (matches `ending in 1234` / `****1234` / `..1234`) and pass as `paymentLast4` on the import payload. Tracker uses this to auto-assign one of the user's saved cards when it matches uniquely.

### 1.1.44
- **Walmart order-number fallback bug fix.** v1.1.43 fell back to the order number whenever the tracking list was empty after filtering — even when Walmart hadn't actually returned any internal `555…` ID. Now only falls back when an internal-ID was specifically filtered. Orders that genuinely have no tracking (haven't shipped yet) are left with no tracking instead of getting the order number fabricated as one.
- **Walmart product name** — prefer `[data-testid="productName"]` (the actual product name Walmart renders for each order row) over the more permissive selectors. Reject "Walmart.com" / "Walmart" / "Loading" generic chrome that occasionally leaked through.
- **Live sync-status banner on the tracker page** — new content script `tracker-status.ts` injects a small floating banner in the bottom-right of the resell-tracker UI showing per-platform sync state (Syncing… / Sync done · N new, M updated / Error: ...). Reads `*SyncStatus` from `chrome.storage.local`. Self-filters to only render on the configured trackerUrl hostname. Auto-dismisses done/error after 30s; can be dismissed manually.

### 1.1.43
- Walmart: when an order has no real carrier tracking number after filtering Walmart's internal `555...` IDs, fall back to using the Walmart order number (digits only, no dashes) as the tracking value. Lets buying groups identify the shipment via Walmart's own system when no UPS/FedEx/USPS tracking is available.

### 1.1.42
- Tighten Amazon promo-card filter. 1.1.41 matched on card names anywhere in the card text, which would have false-positive on real orders paid with an Amazon Visa (payment method string contains the card name). New filter requires either an "Apply now" CTA OR cost=$0 AND a specific promo phrase (Earn X%, Get the Amazon Visa, No annual fee, Card Member, etc.) — none of which appear in the payment-method portion of real orders.

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
