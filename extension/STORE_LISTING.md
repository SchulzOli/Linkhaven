# Store Listing — Chrome / Edge / Firefox

Everything the three store listings need, ready to copy: texts, images,
permission justifications, data disclosures and reviewer notes, plus the steps
to create the listings and connect them to the Release workflow.

## Table of Contents

- [How releases reach the stores](#how-releases-reach-the-stores)
- [Listing details (all stores)](#listing-details-all-stores)
- [Description](#description)
- [Images](#images)
- [Permissions and data disclosure](#permissions-and-data-disclosure)
- [Chrome Web Store, field by field](#chrome-web-store-field-by-field)
- [Edge Add-ons, field by field](#edge-add-ons-field-by-field)
- [Firefox (AMO), field by field](#firefox-amo-field-by-field)
- [After the first upload: connect the Release workflow](#after-the-first-upload-connect-the-release-workflow)
- [The old listings](#the-old-listings)
- [Notes to reviewer (AMO)](#notes-to-reviewer-amo)
- [Notes for certification (Edge)](#notes-for-certification-edge)
- [Building from source (for reviewers)](#building-from-source-for-reviewers)

---

## How releases reach the stores

- **New listings.** The app was renamed to Linkhaven, and the old listings
  can't be renamed, so all three stores get new listings (new IDs). The
  Firefox add-on ID is `linkhaven@oli-tech.eu`.
- **The first version is uploaded by hand.** No store API can create a
  listing. Run **Actions → Release** with the stores unticked: it builds,
  tags and attaches `linkhaven-extension-vX.Y.Z.zip` to the GitHub release.
  Upload that ZIP when creating each listing.
- **Every later version is automatic.** Once the new IDs are in the
  repository secrets, the Release workflow uploads and submits to all three
  stores.
- **Texts and images are kept by hand in each dashboard.** The Chrome and
  Edge APIs only take packages, so listing changes are made there; they stay
  in place across releases.
- **The default sync server** is baked in at build time from the repository
  variable `SYNC_SERVER_URL` (`https://linkhaven.oli-tech.eu`).

---

## Listing details (all stores)

| Field                                 | Value                                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Name                                  | Linkhaven                                                                                                              |
| Short description (manifest, max 132) | Your new tab as a link canvas: links, groups, notes, charts and news feeds. Local-first, with optional encrypted sync. |
| Category                              | Chrome/Edge: Productivity · Firefox: Tabs (second: Bookmarks)                                                          |
| Language                              | English                                                                                                                |
| Homepage                              | https://schulzoli.github.io/Linkhaven/                                                                                 |
| Support                               | https://github.com/SchulzOli/Linkhaven/issues                                                                          |
| Privacy policy                        | https://schulzoli.github.io/Linkhaven/privacy/                                                                         |
| Contributions (Firefox)               | https://www.buymeacoffee.com/SchulzOli                                                                                 |
| License (Firefox)                     | MIT                                                                                                                    |

### Summary

> AMO summary and other short fields, max 250 characters

Your new tab as an infinite canvas: links, groups, notes, images, live charts and RSS feeds on a drag-and-drop board. Themes, templates, workspaces. Local-first, with optional end-to-end encrypted sync.

### Search terms (Edge)

> max 7 terms, max 30 characters each, 21 words total

- new tab page
- visual bookmark manager
- start page organizer
- link dashboard
- infinite canvas
- workspace bookmarks
- homelab dashboard

---

## Description

Linkhaven replaces your browser new tab page with a visual canvas for everything you open every day.

Drag, group, resize and style link cards on a zoomable infinite board — and put notes, live charts and news feeds right next to them. Every link has a place: no folders, no clutter, just a spatial layout you design yourself.

**Canvas**
Pan, zoom and navigate freely. Snap-to-grid keeps everything aligned. Multi-select, copy, paste, undo and a format painter let you work fast. On tablets and touch screens: pan with one finger, pinch to zoom, double-tap to zoom in.

**Link Cards**
Create cards from any URL; with website icons turned on, favicons are fetched once and cached locally, otherwise a clean default image is used. Homelab links get the real app icon: Jellyfin, Radarr, Home Assistant and 3,000 more are recognised by name, address or port. Give a card an optional local address (e.g. http://192.168.1.10:8123 next to https://home.example.com) and Linkhaven opens the local one when you're at home. Resize cards from 2×2 up to 12×12 grid cells, toggle title and image, use your own images, and style each card with fill, border, corner radius, transparency and shadow.

**Groups**
Collect cards in collapsible groups and nest groups inside groups. Collapsing a group hides everything inside it, including charts and feeds.

**Notes**
Sketch on a note with mouse, pen or finger, Excalidraw style, and double-click to type in a handwriting font. Pen, eraser, five ink colors and three sizes.

**Live Charts**
Chart nodes plot a time series from a WebSocket or Server-Sent Events feed: ranges from one day to all time, price or percent change, moving averages, log scale and CSV export. Charts inside a group follow the group's settings, and any chart can keep its own.

**News Feeds**
Feed nodes merge several RSS or Atom feeds into one list. Filter by words, sort by date, source or title, limit to a time window, and switch sources on or off. Paste a website address and Linkhaven finds its feed.

**Pictures**
Drop images onto the canvas as picture nodes and manage them in a built-in gallery.

**Appearance**
Six built-in themes — Excalidraw, Blueprint, Minimal, Nord, Sunset and Neon — each in light and dark. Save your own theme, import or export it, and edit every color token.

**Templates**
Save selected cards, groups, pictures, charts and feeds as reusable templates with preview thumbnails, and insert them on any board.

**Workspaces, Import & Export**
Create, rename, reorder and switch between boards from the workspace rail. Export a board with its images, templates and themes as one .linkhaven.zip file and import it anywhere.

**Statistics**
See link opens, canvas opens and storage use per board — computed and kept on your device.

**Device sync and web app (optional)**
Keep your boards in step across computers and phones: create a sync, then add devices with a sync code or QR code. Everything is encrypted on your device before it leaves; the server only stores data it can't read. Lost a device? Remove it from the device list and it is locked out at once. A work computer can sync just the workspaces you pick. Use the public Linkhaven server, host your own with one Docker container, or use a WebDAV folder. On phones, Linkhaven installs as a web app.

**Privacy**
No account. No analytics. No ads. Off by default: every feature that uses the network waits until you turn it on in Menu → Privacy.

---

## Images

### Screenshots (1280×800 PNG, all stores)

| File                                      | Shows                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `screenshots/01-canvas-overview.png`      | Five named groups with fifty link cards (Sunset, light)                |
| `screenshots/02-groups-organization.png`  | A Development and a Social group (Blueprint, light)                    |
| `screenshots/03-themes-customization.png` | The Themes tab with all six built-in themes (Neon, dark)               |
| `screenshots/04-card-edit-styling.png`    | The card edit panel: link, shape and style                             |
| `screenshots/05-multiple-workspaces.png`  | The pinned workspace rail with three boards (Nord, dark)               |
| `screenshots/06-template-library.png`     | A group saved as a template with its preview                           |
| `screenshots/07-charts-and-news.png`      | Three live charts and a news feed (Excalidraw, dark)                   |
| `screenshots/08-local-statistics.png`     | The Statistics tab, all local                                          |
| `screenshots/10-notes.png`                | A handwritten to-do list and a sketch (Excalidraw, light)              |
| `screenshots/11-homelab-app-icons.png`    | A Homelab group with app icons (Nord, dark)                            |
| `screenshots/12-device-sync.png`          | The Sync tab: server, workspace choice, three devices (Minimal, light) |

**Upload order.** Chrome takes 5: `01, 11, 12, 10, 07`. Edge takes 10 and AMO any number: `01, 11, 12, 10, 07, 02, 03, 04, 05, 08`.

### Promotional tiles

| Store  | Small (440×280)                                          | Large (1400×560)                                            |
| ------ | -------------------------------------------------------- | ----------------------------------------------------------- |
| Chrome | `store-assets/chrome-small-promotional-tile-440x280.png` | `store-assets/chrome-marquee-promotional-tile-1400x560.png` |
| Edge   | `store-assets/edge-small-promotional-tile-440x280.png`   | `store-assets/edge-large-promotional-tile-1400x560.png`     |

Store icon / logo: `icons/icon-128.png`.

### Regenerating

```bash
STORE_SCREENSHOTS=1 npx playwright test tests/e2e/screenshots.spec.ts --project=chromium
```

Charts and feeds use fixed demo data; link cards load real favicons. Test 11
loads app icons from jsDelivr, or from a local folder of dashboard-icons SVGs
with `APP_ICONS_DIR=<folder>`. Test 12 runs its own Linkhaven server. The
promotional tiles (test 09) are rendered from `store-assets/promo-tile.html`
with the current screenshots.

---

## Permissions and data disclosure

The extension requests **no permission at install time**. Everything below is
optional and asked for only when the user turns the feature on.

### Single purpose (Chrome)

Replaces the browser's new tab page with a visual canvas on which the user organizes their links, notes and widgets.

### Permission justifications (Chrome, Edge)

| Permission                                              | Justification                                                                                                                                                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New tab override (`chrome_url_overrides.newtab`)        | The extension's single purpose: it is the new tab page.                                                                                                                                                                                                      |
| `history` (optional)                                    | Only for the optional Auto dashboard: when the user turns on browser history as a source, Linkhaven reads which pages they open most to suggest them as link cards. Processed on the device; requested only from the Auto dashboard settings.                |
| `topSites` (optional)                                   | Only for the optional Auto dashboard: when the user turns on top sites as a source, Linkhaven uses the browser's most visited sites to suggest link cards. Processed on the device; requested only from the Auto dashboard settings.                         |
| Host permissions `https://*/*`, `http://*/*` (optional) | Requested for exactly one address at a time: the sync server or WebDAV folder the user connects device sync to (for example https://linkhaven.oli-tech.eu), released on disconnect. There are no content scripts and no access to the pages the user visits. |

**Remote code:** No. All code is in the package; the content security policy is `script-src 'self'`.

### Data usage (Chrome "Privacy practices", Edge)

Collected only after the user turns the feature on in Menu → Privacy:

| Category                            | When                                                      | Where it goes                                                                    |
| ----------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Web history                         | AI arrangement on (with the user's own Anthropic API key) | Titles and addresses of the candidate pages, to the Anthropic API, to group them |
| Website content (the user's boards) | Device sync on                                            | End-to-end encrypted on the device, to the sync server the user chooses          |

Not collected: personally identifiable information, health, financial and payment, authentication, personal communications, location, user activity.

Certify all three: not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not used to determine creditworthiness or for lending.

### Data collection (Firefox)

Declared in the manifest (`data_collection_permissions`): required `none`;
optional `browsingActivity` (AI arrangement) and `bookmarksInfo` (device
sync). Each is requested when its feature is turned on and released when it
is turned off.

### Network requests, all off by default

| Feature (Menu → Privacy)        | Contacts                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Website icons                   | `https://<site>/favicon.ico` of new cards, cached locally                                               |
| Google favicons                 | `https://www.google.com/s2/favicons` (never for local addresses)                                        |
| App icons                       | `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/…`, one icon per matching card, cached locally |
| Charts and news feeds           | The feed server and feed proxy set on each node (default: the user's own computer)                      |
| Link check                      | One `HEAD` request per card, when the user starts it                                                    |
| Auto dashboard / AI arrangement | Browser history and top sites on the device / `https://api.anthropic.com`                               |
| Device sync                     | The sync server or WebDAV folder the user enters                                                        |
| Local links                     | On click only, the card's local address, to see whether it answers                                      |

---

## Chrome Web Store, field by field

[Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **New item** → upload `linkhaven-extension-vX.Y.Z.zip`.

1. **Store listing:** Description (above), Category _Productivity_, Language
   _English_, Store icon `icons/icon-128.png`, 5 screenshots in the order
   above, small and marquee promotional tiles, Homepage URL, Support URL.
2. **Privacy:** Single purpose, the justifications for `history`,
   `topSites` and the host permissions, _Remote code: No_, Data usage (Web
   history, Website content) with the three certifications, Privacy policy
   URL.
3. **Distribution:** Public, all regions.
4. **Submit for review.** Note the **item ID** (32 letters, in the URL).

## Edge Add-ons, field by field

[Partner Center](https://partner.microsoft.com/dashboard/microsoftedge) → **Create new extension** → upload the ZIP.

1. **Availability:** Public, all markets.
2. **Properties:** Category _Productivity_, Privacy policy URL, Website,
   Support; "Does your extension access, collect or transmit personal
   information?" → **Yes** (only the two optional features above).
3. **Store listings (English):** Description, Short description, Search
   terms, Store logo `icons/icon-128.png`, up to 10 screenshots, small and
   large promotional tiles.
4. **Submit:** paste [Notes for certification](#notes-for-certification-edge).
   Note the **Product ID** (a GUID, in the extension overview).

## Firefox (AMO), field by field

[Developer Hub](https://addons.mozilla.org/developers/) → **Submit a New Add-on** → _On this site_ → upload the ZIP.

1. **Source code:** _Yes_ → upload the release's _Source code (zip)_ (the
   build is bundled and minified).
2. **Describe add-on:** Name _Linkhaven_, Summary, Description, Categories
   _Tabs_ and _Bookmarks_, Support email or website, Homepage, License _MIT_,
   Privacy policy (paste the URL or text).
3. **Notes to reviewer:** paste [Notes to reviewer](#notes-to-reviewer-amo).
4. After approval: **Edit Product Page** → screenshots, Contributions URL.
   Note the **slug** from `addons.mozilla.org/…/addon/<slug>/`.

---

## After the first upload: connect the Release workflow

Repository → **Settings → Secrets and variables → Actions → Secrets**:

| Secret            | Value                              |
| ----------------- | ---------------------------------- |
| `CHROME_EXT_ID`   | the new Chrome item ID             |
| `EDGE_PRODUCT_ID` | the new Edge Product ID            |
| `FIREFOX_EXT_ID`  | the AMO slug (default `linkhaven`) |

`CHROME_PUBLISHER_ID`, `CHROME_SERVICE_ACCOUNT_JSON`, `EDGE_CLIENT_ID`,
`EDGE_API_KEY` (renew it every 72 days), `FIREFOX_JWT_ISSUER` and
`FIREFOX_JWT_SECRET` stay the same for the same developer accounts.

From then on: **Actions → Release** → version → stores ticked.

---

## The old listings

1. Put this at the top of each old listing's description:

   > **This extension is now Linkhaven.** Get it here: <link to the new listing>.
   > To take your boards along: Menu → Data → Export here, then import the
   > file in Linkhaven.

2. A few weeks later, unlist (Chrome, Firefox) or unpublish (Edge) the old
   listings.

Each extension keeps its own storage, so boards move only by export and
import (or device sync, once both run a version that has it).

---

## Notes to reviewer (AMO)

Linkhaven is a new-tab override extension. It replaces the browser new tab page with a local-first link canvas application. This is a new listing that replaces the developer's earlier listing of the same app under its former name; the app was renamed to Linkhaven.

The extension stores all user data locally in IndexedDB plus localStorage fallback snapshots: workspaces, link cards, groups, picture and note nodes, gallery images, templates, themes, appearance preferences, and local usage statistics for the in-app Statistics view. No account or sign-in is involved.

Out of the box the extension makes no network requests and needs no server. Every request below belongs to a feature that is off by default and only works after the user turns it on in Menu → Privacy:

- Website icons: when the user creates a link card, the extension loads `https://<site>/favicon.ico` and caches the icon locally. With "Google favicons" also on, it falls back to Google's public favicon service (never for local addresses). With both off, cards show a default picture or an image the user uploaded.
- App icons: a card whose title or address matches a self-hosted app (Jellyfin, Radarr, …) gets that app's icon, matched on the device against a bundled list of names; only that icon is loaded from https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons and cached locally.
- Chart nodes (user-added): connect to the WebSocket or SSE feed URL set on the node (default `ws://127.0.0.1:8787/feed`, a server the user runs locally).
- News feed nodes (user-added): load the RSS/Atom URLs the user enters, through the feed proxy set on the node (default `http://127.0.0.1:8788/rss`, also local) or directly. Article images load from the news sites when "Images" is on.
- Check Links (user-triggered): one `HEAD` request per link card URL.
- Local links (only on cards with a second, local address): on click, one request to that local address to see whether it answers (up to ~0.9 s).
- Auto dashboard: builds a workspace from the pages the user opens most. Reads top sites and history only after the user turns on that source and grants the optional `topSites` / `history` permission; processed locally. With "AI arrangement" also on and the user's own Anthropic API key, titles and URLs of the candidate pages are sent to https://api.anthropic.com to group them.
- Device sync: exchanges workspaces, themes and images with a Linkhaven sync server or WebDAV folder the user enters. Everything is encrypted on the device (AES-GCM) before upload; the server stores only ciphertext, a random vault id, hashes of access tokens, each device's public key and its encrypted name. Access to that one address is requested via the optional host permission on Connect and released on Disconnect.

Firefox data collection: the manifest declares no required data collection and two optional categories, each requested with `permissions.request({ data_collection })` when the user turns the matching feature on, and released when it is turned off: `browsingActivity` for the AI arrangement and `bookmarksInfo` for device sync.

The extension has no content scripts and loads no remote code (CSP `script-src 'self'`). The AMO linter warnings about innerHTML (React DOM, html-to-image) and the Function constructor (Zod, JSZip) come from these established libraries; the CSP prevents eval at runtime.

See [Building from source](#building-from-source-for-reviewers) for the build.

## Notes for certification (Edge)

Linkhaven is a new-tab override extension; this listing replaces the developer's earlier listing of the same app under its former name. After installation, open a new tab to launch the app.

How to test:

1. Open a new tab.
2. Create a link card with the Add link button.
3. Optionally create a group, add a note (Add note: drag to draw, double-click to type), switch themes, save a template, or create a second workspace.
4. Export a bundle (Menu → Data) and import it again.
5. Close and reopen the browser to confirm local persistence.

Important behavior:

- No account or sign-in is required; all data is stored locally in browser storage.
- With the default settings the extension makes no network requests at all. Website icons, Google favicons, app icons, chart and news feed nodes, Check Links, the Auto dashboard and its AI arrangement, and device sync are off by default; once turned on in Menu → Privacy they contact only the addresses listed in the store description's privacy section and the privacy policy.
- Workspace data leaves the device only when the user sets up device sync, end-to-end encrypted, to the server the user chooses.
- No content scripts. The optional `history` and `topSites` permissions are requested only when the user turns on those Auto dashboard sources; the optional host permission only for the one sync server address the user enters.

---

## Building from source (for reviewers)

- OS: Windows, macOS or Linux; Node.js 22 or later; npm 10 or later
- Tools (installed by `npm install`): Vite with Rolldown (bundler and minifier), TypeScript, CSS Modules. No pre-transpiled or generated sources; all application code is in `src/`.

```bash
npm install
npm run build:extension      # output in dist-extension/
npm run deploy:dry           # writes dist-extension.zip, files at the archive root
```
