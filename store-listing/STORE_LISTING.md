# Hourfolk — Chrome Web Store listing

## Product details

**Name:** Hourfolk

**Summary:** Your hours, wherever work happens. World clock, time-zone planner, and reminders.

**Category:** Productivity

**Language:** English

**Detailed description:**

Hourfolk helps you coordinate time across cities without doing mental arithmetic.

- See live local times for the cities you work with.
- Understand day changes and time differences at a glance.
- Type natural phrases such as “2pm in New York” to plan across time zones.
- Convert one moment across all your saved cities.
- Set an at-time reminder plus any combination of 30, 15, 10, or 5-minute early alerts.
- Use Hourfolk as a toolbar popup, Chrome side panel, or focused dashboard tab.
- Choose 12-hour or 24-hour time, light or dark appearance, and audible or muted alerts.

Hourfolk is private by design. It has no accounts, analytics, advertising, or backend. Saved cities, preferences, planning state, and reminders stay in Chrome’s local extension storage and are never transmitted.

Chrome must be running to deliver reminders. If the computer is asleep, Chrome delivers the alert after it wakes.

## Privacy practices

**Single purpose:** Help people coordinate time across time zones using clocks, planning tools, and local Chrome reminders.

**Data usage disclosure:** Hourfolk does not collect or transmit user data. User-entered reminder titles, schedules, saved cities, display preferences, and unfinished drafts are stored only in `chrome.storage.local` on the user’s device. There are no accounts, analytics, advertisements, or remote servers.

**Data types collected:** Select **No** for every data-type category. Locally stored extension state is not sent to the developer or any third party.

**Limited Use certification:** Certify compliance.

### Permission justifications

- **storage:** Stores saved cities, settings, planner state, and reminders locally so they persist across popup, side-panel, dashboard, and browser restarts. Nothing is transmitted.
- **alarms:** Wakes the extension service worker at each user-selected reminder time and optional early-alert time.
- **notifications:** Displays the reminders users explicitly create, including their chosen title, city time, local time, and snooze action.
- **sidePanel:** Lets users choose Chrome’s side panel as the Hourfolk interface and open it from the toolbar button.

**Remote code:** No. All executable code and city/time-zone data are bundled in the submitted package.

**Host permissions:** None.

## Distribution

- Visibility: Public
- Regions: All regions unless you have a business reason to restrict availability
- Pricing: Free
- In-app purchases: No

## Reviewer test instructions

No account or credentials are required.

1. Click the Hourfolk toolbar icon to open the popup.
2. Add a suggested city on the Clocks tab.
3. Open Plan, enter `2pm in New York`, and submit.
4. Choose **Set reminder**, select one or more early alerts, and save a future reminder.
5. Open Settings to switch between popup, side panel, and dashboard modes.

Reminder notifications use Chrome’s alarms API. A reviewer can create a reminder a few minutes in the future to verify delivery.

## Graphic assets

- Store icon: `assets/icon-128.png`
- Small promo tile: `assets/promo-small-440x280.png`
- Screenshots: `assets/screenshot-01-clocks.png` through `assets/screenshot-03-reminders.png`

## URLs to provide in the dashboard

- Privacy policy: `https://jalasem.github.io/hourfolk-chrome-extension/privacy-policy.html`
- Terms and conditions: `https://jalasem.github.io/hourfolk-chrome-extension/terms.html`
- Support URL: `https://github.com/jalasem/hourfolk-chrome-extension/issues`
- Homepage URL: `https://jalasem.github.io/hourfolk-chrome-extension/`
