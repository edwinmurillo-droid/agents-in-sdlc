# Tab Commander

A Chrome (Manifest V3) extension that gives you a live, searchable dashboard
of every open tab across all windows — with multi-select close, quick
filter-and-close, and a voice command mode.

## Load it in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this `tab-commander` folder.
4. Click the Tab Commander icon in the toolbar to open the dashboard in a
   new tab.

## Features

- **Live tab index** — `background.js` is a service worker that tracks every
  tab (id, title, favicon, URL, window, last-accessed time) via
  `chrome.tabs` events and keeps it in `chrome.storage.local`.
- **Dashboard** (`dashboard.html`) — a full page (not a popup) listing tabs
  grouped by window, with checkboxes, a search box that filters by title or
  URL substring, "Close selected", and "Close all matching".
- **Voice commands** — click the mic button and say things like:
  - "close all suno tabs"
  - "close tabs matching netflix"
  - "close this window's tabs"

  Closing more than 3 tabs at once (voice or buttons) always asks for
  confirmation first.
- **Real-time updates** — the dashboard listens for `chrome.runtime`
  messages pushed from the background worker whenever tabs are created,
  closed, updated, or switched, so the list never needs a manual refresh.

No external backend, build step, or bundler required — just plain
HTML/CSS/JS.
