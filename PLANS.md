# Hourfolk — MVP implementation plan

Scope: Chrome MV3 extension (popup, side panel, full-page dashboard) with a world clock,
a time-zone planner, and reminders. No backend, no accounts. This file is the execution
checklist and is kept in sync with real progress.

## Decisions

- Build: Vite 8 + `@crxjs/vite-plugin` 2.7 + React 19 + TypeScript strict. Vitest 5 for unit
  tests, Playwright 1.62 (`channel: 'chromium'`, headless) for end-to-end verification.
- Time model: IANA zones only. `@js-temporal/polyfill` resolves wall-clock → instant with explicit
  DST disambiguation (`earlier`/`later` comparison detects ambiguous vs nonexistent). `Intl`
  formats everything. The service worker only imports the `Intl`-based formatter (no polyfill).
- City data: `city-timezones` (7,329 cities, province + country, IANA zone) lazy-loaded behind a
  `CityProvider`; `@vvo/tzdb` (eager, 116 KB) supplies zone metadata and the local city label.
  A small curated alias map covers NYC / Bombay / Saigon-style names.
- Storage: `chrome.storage.local`, keys `schemaVersion`, `settings`, `cities`, `reminders`,
  with a sequential migration runner. Memory fallback for plain-browser dev.
- Reminders: one `chrome.alarms` alarm per enabled future reminder (`hourfolk:reminder:<id>`),
  idempotent reconciliation on install/startup/storage change, late delivery for overdue ones,
  `chrome.notifications` basic template with a "Snooze 10 minutes" button.
- Surfaces: `popup.html`, `sidepanel.html`, `dashboard.html` share one `<App surface=…/>`.
  Toolbar behavior follows the "Open Hourfolk as" setting via `action.setPopup`,
  `sidePanel.setPanelBehavior`, and `action.onClicked`. New-tab replacement is an optional,
  documented build variant (`pnpm build:newtab`), never a runtime toggle.

## Layout

```
manifest.config.ts  vite.config.ts  vitest.config.ts  playwright.config.ts
popup.html sidepanel.html dashboard.html
public/icons/            generated PNG icons (scripts/make-icons.mjs from scripts/icon.svg)
src/platform/            Chrome API adapters + in-memory fakes
src/domain/time/         resolve (Temporal), format (Intl), relations, occurrence
src/domain/cities/       provider, dataset loader, aliases, normalization
src/domain/parse/        deterministic natural-language planner parser
src/domain/storage/      schema, migrations, store
src/domain/reminders/    alarm naming, reconciliation, notification content
src/background/          MV3 service worker
src/app/                 React app: providers, hooks, views, components, styles
src/surfaces/            popup / sidepanel / dashboard entry points
e2e/                     Playwright specs + extension fixture
```

## Checklist

### Group 0 — foundation (sequential, main agent)
- [x] Save plan to PLANS.md
- [x] package.json, tsconfig, vite/vitest/playwright configs, manifest, HTML entries
- [x] Design tokens + base styles
- [x] Typed contracts for time, cities, parse, storage, reminders, platform
- [x] Icons (SVG + generation script)

### Group A — time domain (parallel agent)
- [x] resolveWallClock with unique / ambiguous / nonexistent results + tests (spring-forward, fall-back)
- [x] describeInstant, offsets, abbreviations + tests (positive/negative, half- and quarter-hour zones)
- [x] dayRelation / offsetDifference / nextOccurrence + tests (before/after requested time, cross-midnight)

### Group B — cities (parallel agent)
- [x] tzdb zone info + local label
- [x] lazy dataset loader, normalization, aliases, scoring search + tests

### Group C — parser (parallel agent, independent via injected city resolver)
- [x] parsePlanQuery for "2pm in New York", "14:00 London", "tomorrow at 9am Tokyo", "Sep 8 at 4:30pm in Toronto", weekdays, ISO dates + tests

### Group D — storage, reminders, service worker (parallel agent)
- [x] platform adapters (chrome + memory) for storage, alarms
- [x] schema, migrations, store + tests
- [x] reminder alarm reconciliation + notification content + tests
- [x] service worker wiring (install/startup/storage change/alarm/notification/action)

### Group E — UI (main agent, depends on contracts only)
- [x] App shell, providers (store, clock tick, theme), navigation, top bar, settings
- [x] Clocks view: local hero, city list (rename/reorder/remove), city search combobox, empty states
- [x] Plan view: command input, structured controls, next-occurrence inference, DST notices, results, copy, back to now, set reminder
- [x] Reminders view: form, list, edit/enable/disable/delete, delivery caveat text
- [x] Responsive layouts for popup / side panel / full page; dark theme; reduced motion; focus styles

### Group F — verification and delivery (sequential, main agent)
- [x] Unit tests green (`pnpm test`)
- [x] Production build green (`pnpm build`)
- [x] Playwright headless: first run, add/reorder/remove city, persistence, "2pm in New York", edit inferred date, reminder create/delete + alarm, themes, keyboard nav, three layouts

## Optional advance reminder

- [x] Extend reminder storage and alarm naming/reconciliation for an optional 5, 10, 15, or 30 minute advance notification while retaining the at-time alarm
- [x] Add an intuitive lead-time picker and clear confirmation/list summaries to the reminder UI
- [x] Add focused unit and end-to-end coverage for persistence, two-alarm scheduling, editing, pausing, and deletion
- [x] Run typecheck, unit tests, build, and headless Playwright verification; remove generated test artifacts

## Product-wide UI/UX refinement

- [x] Audit clocks, planner, reminders, settings, shared components, themes, and popup/side-panel/dashboard layouts
- [x] Refine the visual system, hierarchy, spacing, controls, empty states, and responsive behavior without changing core workflows
- [x] Clarify the alarm and notification relationship throughout reminder creation and delivery messaging
- [x] Run typecheck, unit tests, production build, and the full headless Playwright suite
- [x] Visually inspect all three surfaces in light and dark themes, then remove generated verification artifacts

## Illustrations and interaction polish

- [x] Create a cohesive, theme-aware illustration system for the clocks and reminders empty states
- [x] Add restrained ambient motion, hover feedback, and state transitions with reduced-motion support
- [x] Integrate artwork responsively without reducing clarity or crowding compact surfaces
- [x] Run typecheck, unit tests, production build, and the full headless Playwright suite
- [x] Visually inspect popup, side panel, and dashboard in light and dark themes; remove verification artifacts

## Planner distance from now

- [x] Add a precise, live-updating relative duration for the selected planned instant
- [x] Present the duration clearly within the planner controls for future, current, and past times
- [x] Add focused unit and Playwright coverage, then run the full verification suite
- [x] Visually inspect compact and full-page layouts and remove generated artifacts

## Multi-alerts, persistent workspace, and sound

- [x] Migrate reminders from one optional advance alert to multiple selected 5, 10, 15, and 30-minute alerts with backward compatibility
- [x] Replace the timing radio group with an accessible multi-select and update summaries/editing behavior
- [x] Persist the active view, planner state, open reminder form, and unfinished reminder fields across surfaces and reopen
- [x] Add a persisted global notification-sound setting and apply Chrome's supported silent flag to every alert
- [x] Add migration, scheduling, reconciliation, notification, persistence, and end-to-end coverage
- [x] Run typecheck, unit tests, production build, and the full headless Playwright suite
- [x] Visually inspect all surfaces and themes, then remove verification artifacts
- [x] README (setup, build, test, unpacked install, architecture, permissions table, limitations)
- [x] Cleanup: no screenshots, temp profiles, test alarms, or seeded data left behind

## Reminder composer simplification

- [x] Replace the large alert tiles with compact, obvious multi-select chips and an always-on at-time indicator
- [x] Redesign the schedule preview to remove repeated prose while keeping destination time, local time, relative time, and alert coverage clear
- [x] Tighten form spacing, actions, and delivery guidance across popup, side-panel, and dashboard sizes
- [x] Update behavioral coverage without changing reminder scheduling or persistence semantics
- [x] Run typecheck, unit tests, production build, and the complete headless Playwright suite
- [x] Visually inspect compact and full-page light/dark layouts, then remove verification artifacts

## Extension load recovery

- [x] Replace the stale CRXJS development output in dist with a self-contained production build
- [x] Verify the built manifest, background service worker, and popup load without a development server
- [x] Remove verification artifacts and leave no test state behind

## Chrome Web Store submission

- [x] Audit manifest metadata, permissions, privacy behavior, and packaged code against current Chrome Web Store requirements
- [x] Update the store icon to current padding guidance and generate required listing artwork
- [x] Capture current, full-bleed screenshots of the three core workflows at accepted dimensions
- [x] Prepare listing copy, privacy disclosures, permission justifications, reviewer instructions, and a hostable privacy policy
- [x] Add a guarded release-packaging command and create the upload-ready ZIP with manifest.json at its root
- [x] Run typecheck, unit, build, package-integrity, and unpacked-extension tests; remove temporary browser data

## GitHub publishing and legal site

- [x] Inspect repository ownership, remote state, authentication, and local files before any Git mutation
- [x] Add a GitHub Pages legal site with a privacy policy, terms and conditions, and a simple landing page
- [x] Update submission documentation and project metadata with canonical hosted URLs
- [in-progress] Initialize Git safely, review staged content for secrets and unwanted artifacts, commit, and push without rewriting remote history
- [ ] Enable GitHub Pages from the `docs` directory and verify the public legal URLs
- [ ] Run typecheck, unit tests, production packaging, and headless Playwright verification; remove test artifacts
