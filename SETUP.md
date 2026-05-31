# Resell Tracker — Setup Guide

This guide covers setting up the **dashboard** (the web app where you track P&L) and the **browser extension** (which automatically imports orders from Amazon and Walmart).

---

## Part 1 — Dashboard

The dashboard is a self-hosted web app that runs in Docker. You need a machine that runs Docker (a home server, NAS, or any always-on PC works).

### Requirements
- Docker and Docker Compose installed
- A domain or local IP you can reach from your browser

### Installation

1. Clone the repo onto your server:
   ```
   git clone https://github.com/frindle/resell-tracker.git
   cd resell-tracker
   ```

2. Create a `.env` file in the project root:
   ```
   SECRET=some-random-string-at-least-32-chars
   ```
   Generate a random string with: `openssl rand -hex 32`

3. Start the app:
   ```
   docker-compose up -d
   ```

4. Open `http://<your-server-ip>:3000` in your browser. Create an account — the first account registered becomes the admin.

### Updating
```
git pull && docker-compose build && docker-compose up -d
```

---

## Part 2 — Dashboard Walkthrough

### Buying Groups
Go to **Buying Groups** and add each group you sell for. For each group, click **Addresses** and add the street address (or zip code) of their warehouse. This lets the app auto-assign orders to the right group when they're imported.

Under **Blocked Addresses**, add your home address (or any address you ship to yourself). Orders shipped there will be skipped on import so they don't clutter your tracker.

### Credit Cards
Go to **Cards** and add the credit card(s) you use to buy. Enter the cashback rate (%) or points multiplier (×). You can also add merchant-specific rates (e.g. 5× on Amazon). The dashboard uses these to auto-calculate cashback earned and estimated miles/points per order.

### BFMR
Go to **BFMR** and click **Settings** to enter your BFMR API credentials. Once configured, click **Sync** to pull your BFMR deal history. The sync will automatically match paid amounts to your imported orders and fill in the sale price.

### BuyingGroup
Go to **BuyingGroup** and log in with your BuyingGroup credentials. Receipt data is fetched automatically and matched to orders by order number and tracking number.

### Orders
The **Orders** page shows all your imported and manually-entered orders. Key columns:
- **Cost** — what you paid (purchase + shipping)
- **Cashback** — auto-calculated from your card rate
- **Miles** — estimated points earned based on card multiplier
- **Sale** — what the buying group paid you (auto-filled from BFMR/BuyingGroup sync)
- **P&L** — profit = Sale − (Cost + Shipping − Cashback)

**Status filters:**
- **Needs Info** — orders missing sale price, buyer, or cost
- **Complete** — all fields filled in
- **Overdue** — Walmart/Amazon orders with no payout after 14 days

Click any order to edit it. You can manually set the sale price, assign it to a buying group, add a credit card, and add notes.

### P&L Summary
The **Analytics** page shows total profit, cashback earned, and miles across all orders, filterable by date range, platform, and buying group.

---

## Part 3 — Browser Extension

The extension runs in your browser and imports orders from Amazon and Walmart directly into the dashboard. It reads your order history pages — no credentials are stored or sent anywhere except your own dashboard.

### Chrome / Edge

1. Download `resell-tracker-extension.zip` from the latest release.
2. Unzip it — you should have a `dist/` folder.
3. Go to `chrome://extensions` (or `edge://extensions`).
4. Enable **Developer mode** (toggle in the top right).
5. Click **Load unpacked** and select the `dist/` folder.

### Firefox

1. Download `resell-tracker-sync-firefox.xpi` from the latest release.
2. Go to `about:addons`.
3. Click the gear icon → **Install Add-on From File…**
4. Select the `.xpi` file.

### Extension Setup

1. Click the extension icon in your toolbar (pin it if needed).
2. Click **Settings** (gear icon).
3. Fill in:
   - **Dashboard URL** — e.g. `http://10.0.12.39:3000` (your server's address, no trailing slash)
   - **API Key** — found in the dashboard under Settings → API Key
   - **User ID** — found in the dashboard under Settings → API Key (shown alongside the key)
4. Click **Save**.

### Syncing Orders

- Navigate to Amazon or Walmart in your browser (you can be on any page).
- Click the extension icon and hit **Sync Amazon** or **Sync Walmart**.
- The extension will navigate to your orders page, scrape your recent orders, and push them to the dashboard.
- The **Last sync** date shown in the popup is the cutoff — next sync will re-check one day before that date to avoid missing anything at the boundary.

**Tips:**
- Sync runs page by page through your order history and stops when it reaches orders older than the last sync date.
- Amazon paginates slowly (3s between pages) to avoid rate limiting — a full initial sync of 90 days can take a few minutes.
- Walmart fetches tracking numbers automatically from each order's detail page.
- Blocked addresses and buying group address matching happen server-side on import — you don't need to do anything extra.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Extension shows red `!` | Open Settings and verify Dashboard URL, API Key, and User ID |
| "Injection failed — refresh the tab" | Refresh the Amazon/Walmart tab and try again |
| Orders imported but no sale price | Check BFMR/BuyingGroup sync — it fills sale prices automatically |
| Order shows in Overdue filter | No matching payout found after 14 days — check BFMR/BuyingGroup for that order |
| Dashboard shows wrong date (1 day behind) | This was a bug fixed in a recent update — update your Docker install |
