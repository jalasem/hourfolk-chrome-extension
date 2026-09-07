# Hourfolk

**Your hours, wherever work happens.**

[Add Hourfolk to Chrome](https://chromewebstore.google.com/detail/hourfolk/gmogjfhodnhpfjkphmcmgoefclceecfd) from the Chrome Web Store, or visit [hourfolk.abdulsamii.com](https://hourfolk.abdulsamii.com/).

Hourfolk is a Chrome extension (Manifest V3) with a personal world clock, a time-zone planner, and
exact-moment reminders. It runs as a toolbar popup, a Chrome side panel, or a full-page dashboard
tab, and all three share the same domain logic and components.

- **Clocks** – a prominent local clock plus a list of saved cities that tick together, with
  yesterday/today/tomorrow badges and "8 hours behind" differences. Rename, reorder, remove;
  12-hour or 24-hour display.
- **Plan** – type `2pm in New York`, `14:00 London`, `tomorrow at 9am Tokyo`, or
  `Sep 8 at 4:30pm in Toronto`. Without a date, Hourfolk picks the next time that wall clock
  occurs in the source city and says so. Structured controls let you correct anything. One
  exact instant is then shown for you, the source city, and every saved city, with DST
  ambiguities and gaps explained rather than guessed.
- **Reminders** – save that instant as a reminder with an at-time alert plus any combination of
  30, 15, 10, or 5-minute early alerts. Hourfolk schedules each alert with `chrome.alarms` and
  shows a Chrome notification with the source-city and local times. Alerts can be muted globally,
  and the at-time notification includes a "Snooze 10 minutes" button.

## Requirements

- Node.js 20 or newer, pnpm 10 (`corepack enable` if pnpm is missing)
- Google Chrome 116 or newer (side panel APIs)

## Setup

```bash
pnpm install
pnpm exec playwright install chromium   # only needed for the end-to-end suite and icon generation
```

## Build

```bash
pnpm build          # typecheck + production build into dist/
pnpm dev            # Vite dev server with CRXJS hot reload (load dist/ once, then edit freely)
pnpm build:newtab   # optional variant: also registers the dashboard as the New Tab page (see below)
pnpm icons          # regenerate public/icons/*.png from scripts/icon.svg
npm run store:assets   # regenerate the Web Store icon and 440x280 promo tile
npm run package:store  # production build + guarded upload ZIP in release/
```

## Install unpacked

1. Run `pnpm build`.
2. Open `chrome://extensions`, enable **Developer mode**.
3. Choose **Load unpacked** and select the `dist/` folder.
4. Pin Hourfolk to the toolbar. Click it for the popup, or open **Settings → Open Hourfolk as**
   to switch the toolbar button to the side panel or the full-page dashboard.

## Test

```bash
pnpm test        # Vitest unit tests (time-zone math, DST, parser, city search, storage migrations, alarm reconciliation)
pnpm typecheck   # tsc --noEmit for the app and for configs/e2e
pnpm build && pnpm test:e2e   # Playwright, headless Chromium with the built extension loaded
```

The end-to-end suite launches Playwright's bundled Chromium (`channel: 'chromium'`, headless) with
`--load-extension=dist`, uses a throw-away user-data directory per test, and deletes it afterwards.
It pins the local zone to `Asia/Muscat` so expectations are deterministic.

### Current verification results

| Check                        | Result                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| `pnpm typecheck`             | clean (app + configs/e2e)                                     |
| `pnpm test`                  | 25 files, 252 tests passing                                   |
| `pnpm build`                 | passes; city dataset split into a lazy chunk                  |
| `pnpm build:newtab`          | passes; manifest gains `chrome_url_overrides.newtab`          |
| `pnpm test:e2e`              | 12 headless Playwright scenarios passing                      |

## Chrome Web Store submission

Hourfolk is published at [chromewebstore.google.com/detail/hourfolk/gmogjfhodnhpfjkphmcmgoefclceecfd](https://chromewebstore.google.com/detail/hourfolk/gmogjfhodnhpfjkphmcmgoefclceecfd).
The repository includes an upload-ready packaging command, prepared listing copy, privacy answers,
a public [privacy policy](https://hourfolk.abdulsamii.com/privacy-policy.html),
[terms and conditions](https://hourfolk.abdulsamii.com/terms.html), and correctly sized graphic assets. See
[`store-listing/SUBMISSION_GUIDE.md`](store-listing/SUBMISSION_GUIDE.md) for the exact dashboard flow.

## Public website hosting

The marketing website is published at [hourfolk.abdulsamii.com](https://hourfolk.abdulsamii.com/).
Its static source is in `docs/`, deployed to the Vercel project `hourfolk-chrome-extension`.
Cloudflare manages the `hourfolk` CNAME in the `abdulsamii.com` zone, pointing to
`98f9ec1cb2cd8d22.vercel-dns-017.com` with proxying disabled (DNS only); Vercel manages HTTPS.
The existing `hourfolk-chrome-extension.vercel.app` address remains available for published links.

## Architecture

```
manifest.config.ts       CRXJS manifest (MV3). HTML entry points live at the project root.
src/platform/            Thin promise-based adapters over chrome.storage / alarms / notifications /
                         action / sidePanel, plus in-memory fakes used by tests and by `vite dev`
                         when the page is opened in a plain tab.
src/domain/time/         IANA-only time math. `resolve.ts` is the single importer of
                         @js-temporal/polyfill and turns a wall-clock request into
                         unique | ambiguous | nonexistent. `format.ts`, `relations.ts`,
                         `occurrence.ts` are Intl-only and safe for the service worker.
src/domain/cities/       CityProvider: lazy `city-timezones` dataset (7,329 cities with region and
                         country), eager `@vvo/tzdb` zone metadata, curated aliases, normalized
                         prefix search with scoring. Swap the data source inside this folder only.
src/domain/parse/        Deterministic planner parser (time → date → city), returns an explanation
                         for every decision. City lookup is injected; no network, no AI.
src/domain/storage/      Typed schema (`schemaVersion`, `settings`, `cities`, `reminders`),
                         validation, sequential migrations, and a small store with snapshots for
                         React's useSyncExternalStore that also merges changes from other surfaces.
src/domain/reminders/    Alarm naming, idempotent reminder ↔ alarm reconciliation, notification text.
src/background/          MV3 service worker: reconciles on start/install/startup/storage change,
                         delivers alarms (late ones too), handles snooze/click, applies the surface
                         preference to the toolbar button.
src/app/                 React 19 UI: providers (store, app state, toasts), one shared clock loop
                         (`clock-store.ts`) that pauses when hidden, views, components, CSS Modules
                         on top of `src/styles/tokens.css`.
src/surfaces/            popup / sidepanel / dashboard entry points rendering <App surface=…/>.
```

Key decisions:

- **Time zones** are always IANA identifiers. Offsets are computed per instant via `Intl`, never
  stored. Ambiguous fall-back times ask for earlier/later; nonexistent spring-forward times move to
  the next valid local time and say so.
- **Next occurrence**: "2pm in New York" resolves to today if 2:00 PM is still ahead in New York,
  otherwise tomorrow; the inferred date is labelled and editable.
- **One clock loop**: `clock-store.ts` schedules a single timer aligned to the second boundary;
  components subscribe at second or minute granularity and rendering pauses while the document is
  hidden.
- **Reminders persist first**, then alarms are reconciled. Reconciliation is idempotent and runs in
  the UI after each write and in the service worker on every start, install, browser startup, and
  storage change, so disabled or deleted reminders never leave orphaned alarms and enabled future
  reminders are restored after Chrome restarts.
- **Surface preference** is applied by the service worker: popup mode sets `action.setPopup`; side
  panel mode clears the popup and sets `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`;
  full-page mode clears the popup and `action.onClicked` opens or focuses the dashboard tab.

### Optional New Tab variant

`chrome_url_overrides.newtab` is a manifest-level setting that Chrome cannot toggle at runtime, so
Hourfolk never pretends to. `pnpm build:newtab` produces `dist-newtab/`, an otherwise identical
build whose manifest also registers `dashboard.html` as the New Tab page. Load that folder instead
of `dist/` if you want the dashboard on every new tab. The regular build's "Full page" option only
opens the dashboard in a normal tab.

## Permissions

| Permission      | Why Hourfolk needs it                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `storage`       | Persist saved cities, settings, and reminders locally (`chrome.storage.local`). Nothing leaves the device. |
| `alarms`        | Schedule one alarm per enabled reminder so the service worker wakes at the exact target instant.         |
| `notifications` | Show the reminder notification (title, source-city time, your local time, snooze button).                |
| `sidePanel`     | Offer Hourfolk in Chrome's side panel and let the toolbar button open it when that mode is chosen.       |

No host permissions, no `tabs`, `activeTab`, `history`, or content scripts. The extension has no
backend and makes no network requests; all code and data are bundled.

## Known Chrome limitations

- **Reminders need Chrome running.** Alarms fire only while Chrome is running. If Chrome is closed at
  the target time, Chrome fires the alarm on next launch and Hourfolk delivers it marked as late.
  If the device is asleep, the alarm fires after it wakes. Hourfolk does not promise
  operating-system-level alarm behavior.
- **Alarm granularity.** Chrome fires alarms "near" the scheduled time; packed extensions are limited
  to one alarm per 30 seconds. Reminders are exact to the minute, not the second.
- **Notification buttons on macOS.** Chrome renders notification action buttons behind the
  notification's disclosure control on macOS, so "Snooze 10 minutes" may be one click further away
  than on Windows, Linux, or ChromeOS. Clicking the notification body always opens Hourfolk.
- **Side panel needs a user gesture.** `chrome.sidePanel.open()` may only be called in response to a
  user action, which is why the toolbar button uses `setPanelBehavior` rather than an async handler.
- **New Tab override is build-time only** (see above).
- **Headless notifications.** Headless Chromium creates notifications through the API but does not
  render them, so the end-to-end suite verifies the notification via `chrome.notifications.getAll()`
  and the persisted `firedAt` field rather than pixels.
