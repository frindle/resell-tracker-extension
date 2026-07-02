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

### 1.1.71
- **Amazon + Walmart: skip store-pickup orders during scrape.** Pickup orders never ship to a group, so they don't belong in the tracker. Amazon triggers on "Ready for pickup / Pick up at / Amazon Locker / Fresh Pickup / Whole Foods Market" phrasing on the order card; Walmart triggers on "Free store pickup / Curbside pickup / Pickup at / Ready for pickup / Store Pickup". Skips run before the per-order detail fetch, so it's a real cost win too.

### 1.1.70
- **Amazon: skip locked orders during rescrape.** Fetches `GET /api/orders/locked-order-numbers?platform=amazon` from the tracker at scrape start and drops those order numbers from `allOrders` before the per-order detail-fetch loop. Locked orders reject writes server-side anyway, so the per-order detail fetch (which is where the rescrape cost lives) is pure waste. Graceful degradation: if the endpoint is unavailable, the sync proceeds without a skip (same behavior as before).

### 1.1.69
- **Amazon current-year: walk pages via live-tab navigation.** v1.1.68's same-origin fetch still came back as a SPA shell — Amazon's current-year orders page is fully React-rendered regardless of `Sec-Fetch-Site`. Static fetches just don't populate. New approach: `runSync` now uses the live tab itself for current-year pagination. Scrape the live DOM, get the Next link, save state (orders found so far, sinceDate, nextStartIndex) to `chrome.storage.local` + `sessionStorage`, then `location.href = '/your-orders/orders?startIndex=N&timeFilter=year-YYYY'`. The page reloads, the on-load handler reads the resume state, scrapes the new live DOM, and the loop continues. Past years still use `fetchOrdersPage` (Amazon SSRs old years). Bounded by the existing 500-order safety cap.

### 1.1.68
- **Amazon: same-origin fetch from content script.** v1.1.67 diagnostics showed pagination IS now detected (`startIndex=10`) but `fetchOrdersPage(10, 2026)` returns 0 orders — the page-2 fetch comes back as a SPA shell with no order links rendered. Theory: Amazon serves SSR HTML for same-origin requests and a CSR shell for cross-origin (Sec-Fetch-Site: cross-site) requests. Previously `fetchHtml` routed through the background SW (cross-origin); now it `fetch()`es directly from the content script which runs in amazon.com's origin. Past years worked either way because Amazon SSRs older orders regardless.

### 1.1.67
- **Diagnostic-only: forward Amazon scrape logs to background SW.** Scrape tab auto-closes when sync completes, taking DevTools with it — so we never get to read the new `[AMZ] pagination:` diagnostics added in v1.1.66. Now the Amazon content script mirrors every `console.log`/`console.warn` to the background service worker via `chrome.runtime.sendMessage({ type: 'SCRAPE_LOG' })`, where they persist. Read them via `about:debugging` → This Firefox → Reselling Tracker Sync → Inspect → Console.

### 1.1.66
- **Amazon pagination — wait for lazy injection, brute-force fallback, full diagnostics.** v1.1.65's text-based fallback still returned `null` for the user's Next anchor — either Amazon lazy-injects the pagination block after the order cards render, or the anchor's text doesn't match expectations. Three changes: (1) wait 1.5s on live DOM before reading pagination so lazy markup has a chance, (2) log fallback candidates' text/href for diagnosis, (3) brute-force fallback — when no Next link is detected but page 1 had orders, walk `startIndex += 10` until a page returns 0. Existing `hasOlder` check and 500-order cap still bound the loop.

### 1.1.65
- **Amazon pagination selector — markup-change fallback.** v1.1.64 still stopped at 9 because Amazon changed the "Next page" wrapper. The link is no longer inside `.a-pagination .a-last` — it now ships with a `ref_=ppx_yo2ov_dt_b_pagination_1_2`-style ref attribute and unrelated parent classes. `getNextStartIndex` now falls back to scanning every `<a href*="startIndex=">` whose text starts with "Next" or contains "→", so it survives future markup churn.

### 1.1.64
- **Amazon current-year pagination fixed.** v1.1.62's "live DOM as page 1" hotfix worked for the first 9 orders but stopped there: the live DOM is Amazon's default ~30-day view with no "Next page" link, so `getNextStartIndex(liveDom)` returned `null` and we exited the loop on page 1. Result: out of 57 orders in the year, only 9 got scraped. Switched to: try `fetchOrdersPage(0, year)` first (year-filtered view with full pagination); only fall back to live DOM when the fetched view returns 0 orders. Past years still go through the year-filtered fetch as before.

### 1.1.63
- **Amazon split-shipment tracking from the LIST page.** Real fix for "5 orders shipped overnight, only 1 got tracking." On split-shipment orders, Amazon's detail page often only has preship/cancel URLs because the post-ship state hasn't aggregated yet — but the orders LIST already shows a "Track package" button per shipment (`/gp/your-account/ship-track?itemId=…&packageIndex=N&orderId=…&shipmentId=…`). `scrapeDoc` now captures those URLs into a local-only `_listTrackingUrls` field on each scraped order, and `fetchOrderDetails` merges them with the detail-page URLs before walking through tracking extraction.
- **Skip preship / cancel-items pages.** The selector `a[href*="progress-tracker"]` was matching `/progress-tracker/package/preship/cancel-items?orderID=…` URLs which contain no tracking. They burned through the 8-page budget and (for orders with ONLY preship URLs rendered) caused the whole order to end up with empty tracking. Path-keyword filter added: `preship`, `cancel-items`, `return`, `refund`, `replacement`.
- **Reject empty tracking strings.** An empty `""` was leaking through the final dedupe (the superstring filter let it survive because every non-empty other made `"".startsWith(other)` false). Added a `length >= 8` filter before the dedupe.

### 1.1.62
- **Hotfix: Amazon page-1 read live DOM again.** The 1.1.61 multi-year refactor switched page 1 to `fetchOrdersPage(0, year)` for all years. The fetched current-year page returned zero order links (`[AMZ] scrapeDoc found 0 order links: <empty string>`) and the entire sync stalled before tracking extraction could even start. Restore the live-DOM path for the current calendar year; past years still go through `fetchOrdersPage` with `timeFilter=year-YYYY`.

### 1.1.61
- **Amazon: multi-year scrape via `timeFilter=year-YYYY`.** Without the param, Amazon's `/your-orders/orders` page only returns ~30 days regardless of how far back the user wants to scrape. We now iterate calendar years from the current year back to `sinceDate.getFullYear()` and pass `timeFilter=year-YYYY` on each fetch. The existing `hasOlder` check inside `scrapeDoc` ends the scrape at `sinceDate`. Page-1-from-live-DOM optimization removed (we always fetch now); cap raised 200→500 to give multi-year spans room.
- **Walmart delivery photos: fetch bytes in background SW.** The signed Walmart photo URLs (`receipts-query.edge.walmart.com`) require the user's session cookies — server-side fetch returns HTTP 401. The background SW now fetches with `credentials: 'include'` and forwards base64 + mime back to the content script, which threads them through to `/api/import`. The server prefers the inline bytes when present and decodes directly. Amazon's S3 path is unchanged (its signed URLs are self-contained).

### 1.1.60
- **Delivery photo capture (Amazon + Walmart).** When the order's tracking / detail page exposes a proof-of-delivery image, we forward the URL to the tracker and the server downloads the bytes immediately as an `OrderAttachment` row (the URLs are signed and expire — Amazon's S3 link is good for 3 days, Walmart's proxy similar). Selectors: `img.photo-on-delivery-img-thumb` on the Amazon `/progress-tracker/` page (also reads `data-src` for lazy-loaded variants), and `img[alt="Proof of delivery location"]` on the Walmart order detail page. Server-side: new `lib/deliveryPhoto.ts` + `/api/import` accepting `deliveryPhotoUrl` per row. Idempotent — re-syncs don't double-attach.
- **Extension shared secret (`X-Extension-Secret`).** Counterpart to the new tracker-side `EXTENSION_SHARED_SECRET` env gate. The Options page auto-generates a 32-byte hex value on first load (no buttons — appears in the password field, you paste it into the tracker `.env`). Sent on every fetch alongside `X-Extension-User-Id` / `X-API-Key`. Opt-in: tracker only enforces when the env var is set.
- **API Spy → tracker error forwarding.** When the spy sees a non-2xx response on `cardcenter.cc`, `buyinggroup.com`, `bfmr.com`, or `bigskybuyers.com`, fire a debounced POST to the tracker's `/api/api-errors` ingest endpoint so those failures land in the central `/api-errors` UI alongside server-side errors. 60-second per-endpoint dedupe so retries don't multiply rows.
- **BG `edit_commitment` auto-sync.** When the spy sees a successful POST to `buyinggroup.com/v1/commitment/(edit|create|delete|update|cancel)`, schedule a debounced (5s quiet window) POST to the tracker's `/api/buyinggroup/sync-commitments` so edits on bg.com show up locally without you having to click "Sync from BG".
- **Telemetry on `triggerSyncInBackground`.** Adds `[BG] triggerSync` log lines at every step (entry args, active-tab reuse decision, current window resolution, tab create + result, page-load wait + outcome, content-script ping result, injection result, START_SYNC delivery). Diagnostic aid for the intermittent "scrape didn't open a tab" issue — next time it happens the service worker console will tell us exactly where the chain broke.

### 1.1.59
- **Amazon: catch tracking on the new package-tracker UI.** Amazon rolled out a `pt-delivery-card-wrapper` layout where the tracking number lives in `<div class="pt-delivery-card-trackingId">Tracking ID: …</div>` and "See all updates" is a modal trigger with `href="#"` — there's no ship-track sub-link to follow. We now (a) explicitly target `.pt-delivery-card-trackingId` and any `[class*="trackingId"]`, (b) widen the tracking-page selector to include `/progress-tracker/` and `/package-tracking/` URLs alongside legacy ship-track, and (c) scan the order detail page itself, so an inline pt-card no longer gets missed. Bumped the per-order tracking-page cap from 3 to 8 (split shipments exceeded the old cap), preserved UPS 1Z numbers that legitimately end in a letter (the trailing-letter strip was corrupting valid UPS IDs), widened carrier-link param matching (`tracking_number`, ontrac, lasership), and added a warn log when a fetched tracking page yields zero matches so future misses are diagnosable.

### 1.1.58
- **Amazon Business orders are now skipped at scan time.** The 113- prefixed IDs returned a "we can't find that order" page when we tried to fetch detail. We now detect the not-found markup and drop the row instead of pushing an empty order to the server.
- **Amazon No-Rush delivery detection.** When the order detail page shows the supplemental "Earns extra N% on items using No-Rush delivery" disclosure, capture `noRushBonusPercent` (e.g. 2 for "extra 2%") and forward it to the server. The server flags the order with `delayedShipping=true` and persists the bonus on the new `noRushBonusPercent` column.
- **Sync banner cards stay until manually dismissed.** Removed the 30s auto-dismiss so you can come back and see what happened after walking away.
- **Pop-out window fixed in Firefox.** Path was `popup.html?standalone=1` (which only exists in Chrome's flat build) — now correctly `popup/popup.html?standalone=1`.

### 1.1.57
- **Critical: forward `paymentLast4` to the server.** Content scripts have been scraping last-4 since v1.1.51 and showing it in `[AMZ]` / `[WM] detail` logs, but `handlePushOrders` in the background script projected the order body for `POST /api/import` and silently dropped the field. Server logs confirmed: `[import] no paymentLast4 scraped for Amazon #114-0396526-8799400` even though the extension's content-script log line for that same order said `last4: 1007`. Card auto-assignment has been broken since the feature was added. Now passes through when scraped.

### 1.1.56
- **Scrape tabs open in your current window now.** The old behavior queried for any existing Amazon/Walmart tab (in any window) and hijacked it — a problem when you have product tabs open in other windows you're actively tracking. Now: if your active tab is already on the right host, scrape in place; otherwise open a fresh tab in your current window. Never reuses tabs in other windows.
- **Scrape tab auto-closes when done.** Background tracks tabs it opened and closes them ~2s after `SYNC_DONE` / `SYNC_ERROR` (delay so the toast is briefly visible).
- **Closed-mid-scrape recovery.** If you close a tab the extension opened before the scan finishes, background broadcasts a `SYNC_ERROR` ("tab closed before scan finished") so the tracker banner doesn't hang.
- **Sync banner pinned to bottom-right.** Previously the banner would mount inside an in-page `[data-rt-sync-target]` element when present. Next.js client re-renders could detach/re-create that element, causing the banner to drift (e.g. under the "New Order" button on `/orders` refresh). Now always pinned to `document.body` with `position:fixed` so it can't relocate.
- **"verified" instead of "updated" when nothing changed.** Result summary now distinguishes `N updated` (orders with field changes) from `N verified` (orders re-checked with no changes). Requires tracker 2026-06-23+ which returns the new `verified` count.
- **Popup only flags extension updates.** The popup used to show "update available: app v…" when the tracker dashboard had a newer version. Per separation of concerns, the popup is the extension's surface — it now only flags extension updates. Dashboard updates surface inside the dashboard itself.

### 1.1.55
- **Amazon last-4 actually works now.** v1.1.54 extracted from `detailDoc.body.innerText`, but DOMParser-created docs have no layout — `innerText` is `""`, and `??` only falls through to `textContent` on null/undefined, so the empty string silently won the chain. Switched to scanning `documentElement.outerHTML` (same approach as Walmart). The `<span class="a-color-base">ending in 1007</span>` Amazon emits in the Payment Method section now matches the first pattern cleanly.

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
