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

### 1.0.2
- Add Costco online order scraping via GraphQL API
- Bulk backfill button for existing Amazon orders missing item descriptions or shipping addresses
- Fix calendar icon invisible in dark mode on options page
- Add payment due date field support

### 1.0.1
- Fix popup status not updating when opened mid-sync in a new tab — now tracks live status via `chrome.storage.onChanged`

### 1.0.0
- Initial release
