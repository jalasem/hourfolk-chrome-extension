import { expect, LOCAL_ZONE, test } from './fixtures';
import { addDays, instantFor, isoDateIn, longDate, time12 } from './time-helpers';

const NY = 'America/New_York';

async function addCity(page: import('@playwright/test').Page, query: string, optionName: string) {
  await page.getByRole('button', { name: 'Add city' }).click();
  const input = page.getByRole('combobox', { name: 'Search for a city to add' });
  await input.fill(query);
  const option = page.getByRole('option', { name: new RegExp(`^${optionName}`) }).first();
  await option.waitFor();
  await option.click();
  await expect(page.getByRole('list', { name: 'Saved cities' }).getByText(optionName, { exact: true })).toBeVisible();
}

test('first run: loads without errors and shows the local clock and empty state', async ({ openSurface, errors }) => {
  const page = await openSurface('popup');
  await expect(page.getByText('Live')).toBeVisible();
  const hero = page.getByRole('article', { name: 'Local time' });
  await expect(hero).toContainText(/\d{1,2}:\d{2}/);
  await expect(hero).toContainText('Muscat');
  await expect(hero).toContainText('UTC+4');
  await expect(page.getByText('Add the places you work with')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add city' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tokyo' })).toBeVisible();

  const before = await hero.textContent();
  await page.waitForTimeout(1500);
  const after = await hero.textContent();
  expect(before).not.toEqual(after);

  expect(errors).toEqual([]);
});

test('cities: add, reorder, rename, remove, and persist across every surface', async ({ openSurface, errors }) => {
  const page = await openSurface('popup');
  await addCity(page, 'tokyo', 'Tokyo');
  await addCity(page, 'london', 'London');
  const list = page.getByRole('list', { name: 'Saved cities' });
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(list.getByRole('listitem').nth(0)).toContainText('Tokyo');
  await expect(list.getByRole('listitem').nth(0)).toContainText(/hours ahead/);
  await expect(list.getByRole('listitem').nth(1)).toContainText('London');
  await expect(list.getByRole('listitem').nth(1)).toContainText(/hours behind/);

  await page.getByRole('button', { name: 'Options for London' }).click();
  await page.getByRole('menuitem', { name: 'Move up' }).click();
  await expect(list.getByRole('listitem').nth(0)).toContainText('London');

  await page.getByRole('button', { name: 'Options for London' }).click();
  await page.getByRole('menuitem', { name: 'Rename' }).click();
  const rename = page.getByLabel('Label for London');
  await rename.fill('HQ');
  await rename.press('Enter');
  await expect(list.getByRole('listitem').nth(0)).toContainText('HQ');
  await expect(list.getByRole('listitem').nth(0)).toContainText('London, United Kingdom');

  await page.reload();
  await expect(page.getByRole('list', { name: 'Saved cities' }).getByRole('listitem').nth(0)).toContainText('HQ');

  const panel = await openSurface('sidepanel');
  await expect(panel.getByRole('list', { name: 'Saved cities' }).getByRole('listitem')).toHaveCount(2);
  await expect(panel.getByRole('list', { name: 'Saved cities' }).getByRole('listitem').nth(0)).toContainText('HQ');

  const dashboard = await openSurface('dashboard');
  await expect(dashboard.getByRole('list', { name: 'Saved cities' }).getByRole('listitem')).toHaveCount(2);

  await dashboard.getByRole('button', { name: 'Options for Tokyo' }).click();
  await dashboard.getByRole('menuitem', { name: 'Remove' }).click();
  await expect(dashboard.getByRole('list', { name: 'Saved cities' }).getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('list', { name: 'Saved cities' }).getByRole('listitem')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('plan: "2pm in New York" infers the next occurrence and explicit dates override it', async ({ openSurface, errors }) => {
  const page = await openSurface('popup');
  await addCity(page, 'tokyo', 'Tokyo');
  await page.getByRole('tab', { name: 'Plan' }).click();
  const input = page.getByRole('textbox', { name: 'Describe a time to plan' });
  await expect(input).toBeEnabled();
  await input.fill('2pm in New York');
  await input.press('Enter');

  const now = Date.now();
  const today = isoDateIn(now, NY);
  const todayAt2 = instantFor(today, '14:00', NY);
  const expectedDate = todayAt2 > now ? today : addDays(today, 1);
  const expectedInstant = instantFor(expectedDate, '14:00', NY);

  await expect(page.getByText('Planning')).toBeVisible();
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue(expectedDate);
  await expect(page.getByLabel('Time', { exact: true })).toHaveValue('14:00');
  await expect(page.getByText('Next occurrence', { exact: true })).toBeVisible();
  await expect(page.getByText('Time from now', { exact: true })).toBeVisible();
  await expect(page.getByText(/^in \d+ (minutes?|hours?|days?)/)).toBeVisible();
  await expect(page.getByText(todayAt2 > now ? /Still ahead today in New York/ : /Already passed today in New York/)).toBeVisible();

  const results = page.getByRole('region', { name: 'Converted times' });
  await expect(results).toContainText('2:00 PM');
  await expect(results).toContainText(longDate(expectedDate));
  const rows = results.getByRole('listitem');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Muscat');
  await expect(rows.nth(0)).toContainText(time12(expectedInstant, LOCAL_ZONE));
  await expect(rows.nth(1)).toContainText('New York');
  await expect(rows.nth(1)).toContainText('Source');
  await expect(rows.nth(2)).toContainText('Tokyo');
  await expect(rows.nth(2)).toContainText(time12(expectedInstant, 'Asia/Tokyo'));

  const later = addDays(expectedDate, 3);
  await page.getByLabel('Date', { exact: true }).fill(later);
  await expect(page.getByText('Next occurrence', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Time from now', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use next occurrence' })).toBeVisible();
  await expect(results).toContainText(longDate(later));
  await expect(rows.nth(2)).toContainText(time12(instantFor(later, '14:00', NY), 'Asia/Tokyo'));

  await page.getByRole('button', { name: 'Use next occurrence' }).click();
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue(expectedDate);

  await page.getByRole('button', { name: 'Back to now' }).click();
  await expect(page.getByText('Live')).toBeVisible();
  expect(errors).toEqual([]);
});

test('plan: explicit date phrases and DST notices', async ({ openSurface }) => {
  const page = await openSurface('dashboard');
  await page.getByRole('tab', { name: 'Plan' }).click();
  const input = page.getByRole('textbox', { name: 'Describe a time to plan' });
  await expect(input).toBeEnabled();
  await input.fill('Sep 8 at 4:30pm in Toronto');
  await input.press('Enter');
  await expect(page.getByLabel('Time', { exact: true })).toHaveValue('16:30');
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue(/-09-08$/);
  await expect(page.getByRole('region', { name: 'Converted times' })).toContainText('4:30 PM in Toronto');

  await page.getByLabel('Date', { exact: true }).fill('2026-11-01');
  await page.getByLabel('Time', { exact: true }).fill('01:30');
  await expect(page.getByText('This time happens twice')).toBeVisible();
  await page.getByRole('radio', { name: /Later/ }).click();
  await expect(page.getByRole('radio', { name: /Later/ })).toHaveAttribute('aria-checked', 'true');

  await page.getByLabel('Date', { exact: true }).fill('2026-03-08');
  await page.getByLabel('Time', { exact: true }).fill('02:30');
  await expect(page.getByText('This time doesn’t exist')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Converted times' })).toContainText('3:00 AM in Toronto');
});

test('reminders: create from the plan, alarm is scheduled, delete clears it', async ({ openSurface, worker, errors }) => {
  const page = await openSurface('sidepanel');
  await page.getByRole('tab', { name: 'Plan' }).click();
  const input = page.getByRole('textbox', { name: 'Describe a time to plan' });
  await expect(input).toBeEnabled();
  await input.fill('2pm in New York');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Set reminder' }).click();

  const form = page.getByRole('form', { name: 'New reminder' });
  await expect(form).toBeVisible();
  await expect(form.getByRole('combobox')).toHaveValue(/New York/);
  await expect(form.getByLabel('Time in New York')).toHaveValue('14:00');
  await expect(form).toContainText(/Scheduled for.*2:00 PM/);
  await expect(form).toContainText(/For you in Muscat/);
  await form.getByLabel('Title (optional)').fill('Standup');
  await form.getByRole('checkbox', { name: '30 min' }).click();
  await form.getByRole('checkbox', { name: '15 min' }).click();
  await expect(form).toContainText('At time + 30 min and 15 min early');
  await form.getByRole('button', { name: 'Save reminder' }).click();

  const upcoming = page.getByRole('region', { name: 'Upcoming reminders' });
  await expect(upcoming).toContainText('Standup');
  await expect(upcoming).toContainText('2:00 PM in New York');
  await expect(upcoming).toContainText('Early alerts 30 min and 15 min before');
  await expect(page.getByRole('tab', { name: /Reminders/ })).toContainText('1');

  const alarms = await worker.evaluate(() => chrome.alarms.getAll());
  expect(alarms).toHaveLength(3);
  const stored = await worker.evaluate(() => chrome.storage.local.get('reminders'));
  const reminder = (stored as { reminders: { id: string; targetMs: number; title: string; advanceMinutes?: number[] }[] }).reminders[0]!;
  expect(reminder.title).toBe('Standup');
  expect(reminder.advanceMinutes).toEqual([30, 15]);
  expect(alarms.find((alarm) => !alarm.name.includes(':advance:'))?.scheduledTime).toBe(reminder.targetMs);
  expect(alarms.find((alarm) => alarm.name.includes(':advance:30:'))?.scheduledTime).toBe(reminder.targetMs - 30 * 60_000);
  expect(alarms.find((alarm) => alarm.name.includes(':advance:15:'))?.scheduledTime).toBe(reminder.targetMs - 15 * 60_000);
  expect(reminder.targetMs).toBeGreaterThan(Date.now());

  await page.getByRole('button', { name: 'Edit Standup' }).click();
  const editForm = page.getByRole('form', { name: 'Edit reminder' });
  await expect(editForm.getByRole('checkbox', { name: '15 min' })).toHaveAttribute('aria-checked', 'true');
  await expect(editForm.getByRole('checkbox', { name: '30 min' })).toHaveAttribute('aria-checked', 'true');
  await editForm.getByRole('checkbox', { name: '15 min' }).click();
  await editForm.getByRole('checkbox', { name: '5 min', exact: true }).click();
  await editForm.getByRole('button', { name: 'Save changes' }).click();
  await expect(upcoming).toContainText('Early alerts 30 min and 5 min before');
  await expect.poll(() => worker.evaluate(() => chrome.alarms.getAll())).toHaveLength(3);

  await page.getByRole('button', { name: 'Pause Standup' }).click();
  await expect(page.getByRole('region', { name: 'Paused reminders' })).toContainText('Standup');
  await expect.poll(() => worker.evaluate(() => chrome.alarms.getAll())).toHaveLength(0);
  await page.getByRole('button', { name: 'Resume Standup' }).click();
  await expect.poll(() => worker.evaluate(() => chrome.alarms.getAll())).toHaveLength(3);

  await page.getByRole('button', { name: 'Delete Standup' }).click();
  await expect(page.getByText('Never miss the moment')).toBeVisible();
  await expect.poll(() => worker.evaluate(() => chrome.alarms.getAll())).toHaveLength(0);
  expect(errors).toEqual([]);
});

test('reminders: advance alarm notifies early without delivering the at-time reminder', async ({ openSurface, worker }) => {
  const page = await openSurface('dashboard');
  await page.getByRole('tab', { name: 'Reminders' }).click();
  await page.getByRole('button', { name: 'New reminder' }).click();
  const form = page.getByRole('form', { name: 'New reminder' });
  await form.getByLabel('Title (optional)').fill('Early heads-up');
  const future = new Date(Date.now() + 3 * 60 * 60 * 1000);
  await form.getByLabel(/^Date in/).fill(isoDateIn(future.getTime(), LOCAL_ZONE));
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: LOCAL_ZONE, hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
  }).formatToParts(future).map((part) => [part.type, part.value]));
  await form.getByLabel(/^Time in/).fill(`${String(+parts.hour! % 24).padStart(2, '0')}:${parts.minute}`);
  await form.getByRole('checkbox', { name: '10 min' }).click();
  await form.getByRole('button', { name: 'Save reminder' }).click();

  const alarms = await worker.evaluate(() => chrome.alarms.getAll());
  const advanceAlarm = alarms.find((alarm) => alarm.name.includes(':advance:'));
  expect(advanceAlarm).toBeDefined();
  await worker.evaluate((name) => chrome.alarms.create(name, { when: Date.now() + 300 }), advanceAlarm!.name);

  await expect.poll(async () => {
    const data = await worker.evaluate(() => chrome.storage.local.get('reminders')) as { reminders: { advanceFiredMinutes?: number[]; firedAt?: number }[] };
    return data.reminders[0]?.advanceFiredMinutes?.includes(10) === true && data.reminders[0]?.firedAt === undefined;
  }, { timeout: 15_000 }).toBe(true);
  await expect(page.getByRole('region', { name: 'Upcoming reminders' })).toContainText('Early heads-up');
  const notifications = await worker.evaluate(() => chrome.notifications.getAll());
  expect(Object.keys(notifications).some((id) => id.includes(':advance:'))).toBe(true);
  await expect.poll(() => worker.evaluate(() => chrome.alarms.getAll())).toHaveLength(1);
  await page.getByRole('button', { name: 'Delete Early heads-up' }).click();
});

test('reminders: a firing alarm creates a notification and marks the reminder delivered', async ({ openSurface, worker }) => {
  const page = await openSurface('dashboard');
  await page.getByRole('tab', { name: 'Reminders' }).click();
  await page.getByRole('button', { name: 'New reminder' }).click();
  const form = page.getByRole('form', { name: 'New reminder' });
  await form.getByLabel('Title (optional)').fill('Fire drill');
  const future = new Date(Date.now() + 3 * 60 * 60 * 1000);
  await form.getByLabel(/^Date in/).fill(isoDateIn(future.getTime(), LOCAL_ZONE));
  const { hour, minute } = ((): { hour: number; minute: number } => {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: LOCAL_ZONE, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
    const p = Object.fromEntries(f.formatToParts(future).map((x) => [x.type, x.value]));
    return { hour: +p.hour! % 24, minute: +p.minute! };
  })();
  await form.getByLabel(/^Time in/).fill(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  await form.getByRole('button', { name: 'Save reminder' }).click();
  await expect(page.getByRole('region', { name: 'Upcoming reminders' })).toContainText('Fire drill');

  const [alarm] = await worker.evaluate(() => chrome.alarms.getAll());
  expect(alarm).toBeDefined();
  await worker.evaluate((name) => chrome.alarms.create(name, { when: Date.now() + 300 }), alarm!.name);

  await expect.poll(async () => {
    const data = (await worker.evaluate(() => chrome.storage.local.get('reminders'))) as { reminders: { firedAt?: number }[] };
    return data.reminders[0]?.firedAt !== undefined;
  }, { timeout: 15_000 }).toBe(true);
  await expect(page.getByRole('region', { name: 'Delivered reminders' })).toContainText('Fire drill');
  const notifications = await worker.evaluate(() => chrome.notifications.getAll());
  expect(Object.keys(notifications).some((id) => id.startsWith('hourfolk:reminder:'))).toBe(true);
  await expect.poll(() => worker.evaluate(() => chrome.alarms.getAll())).toHaveLength(0);
});

test('settings: surface preference controls the toolbar button and persists', async ({ openSurface, worker }) => {
  const page = await openSurface('popup');
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(await worker.evaluate(() => chrome.action.getPopup({}))).toMatch(/popup\.html$/);

  await dialog.getByRole('radio', { name: 'Side panel' }).check();
  await expect.poll(() => worker.evaluate(() => chrome.action.getPopup({}))).toBe('');
  await expect.poll(() => worker.evaluate(async () => (await chrome.sidePanel.getPanelBehavior()).openPanelOnActionClick)).toBe(true);

  await dialog.getByRole('radio', { name: 'Full page' }).check();
  await expect.poll(() => worker.evaluate(() => chrome.action.getPopup({}))).toBe('');
  await expect.poll(() => worker.evaluate(async () => (await chrome.sidePanel.getPanelBehavior()).openPanelOnActionClick)).toBe(false);

  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog').getByRole('radio', { name: 'Full page' })).toBeChecked();

  await page.getByRole('dialog').getByRole('radio', { name: 'Popup' }).check();
  await expect.poll(() => worker.evaluate(() => chrome.action.getPopup({}))).toMatch(/popup\.html$/);
});

test('workspace and notification sound preference persist across surfaces', async ({ openSurface, worker }) => {
  const popup = await openSurface('popup');
  await popup.getByRole('tab', { name: 'Plan' }).click();
  const query = popup.getByRole('textbox', { name: 'Describe a time to plan' });
  await query.fill('4pm in Toronto');
  await query.press('Enter');
  await popup.getByRole('button', { name: 'Set reminder' }).click();
  const form = popup.getByRole('form', { name: 'New reminder' });
  await form.getByLabel('Title (optional)').fill('Persistent draft');
  await form.getByRole('checkbox', { name: '30 min' }).click();
  await form.getByRole('checkbox', { name: '5 min', exact: true }).click();

  await expect.poll(async () => {
    const data = await worker.evaluate(() => chrome.storage.local.get('uiState')) as {
      uiState?: { view?: string; planQuery?: string; reminderDraft?: { title?: string; advanceMinutes?: number[] } };
    };
    return data.uiState;
  }).toMatchObject({
    view: 'reminders',
    planQuery: '4pm in Toronto',
    reminderDraft: { title: 'Persistent draft', advanceMinutes: [30, 5] },
  });

  await popup.close();
  const dashboard = await openSurface('dashboard');
  const restored = dashboard.getByRole('form', { name: 'New reminder' });
  await expect(restored).toBeVisible();
  await expect(restored.getByLabel('Title (optional)')).toHaveValue('Persistent draft');
  await expect(restored.getByRole('checkbox', { name: '30 min' })).toHaveAttribute('aria-checked', 'true');
  await expect(restored.getByRole('checkbox', { name: '5 min', exact: true })).toHaveAttribute('aria-checked', 'true');

  await dashboard.getByRole('button', { name: 'Settings' }).click();
  const sound = dashboard.getByRole('switch', { name: 'Play sound for alerts' });
  await expect(sound).toBeChecked();
  await sound.uncheck();
  await expect.poll(async () => {
    const data = await worker.evaluate(() => chrome.storage.local.get('settings')) as { settings?: { notificationsMuted?: boolean } };
    return data.settings?.notificationsMuted;
  }).toBe(true);
  await dashboard.reload();
  await dashboard.getByRole('button', { name: 'Settings' }).click();
  await expect(dashboard.getByRole('switch', { name: 'Play sound for alerts' })).not.toBeChecked();
});

test('themes: dark and light apply and persist', async ({ openSurface }) => {
  const page = await openSurface('popup');
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await background()).toBe('rgb(15, 15, 16)');
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await background()).toBe('rgb(245, 245, 247)');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('keyboard: the whole popup is operable without a mouse', async ({ openSurface }) => {
  const page = await openSurface('popup');
  const active = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim() ?? '');

  await page.keyboard.press('Tab');
  expect(await active()).toBe('Settings');
  await page.keyboard.press('Tab');
  expect(await active()).toBe('Clocks');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Plan' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Clocks' })).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('Tab');
  expect(await active()).toBe('Add city');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Search for a city to add' })).toBeFocused();
  await page.keyboard.type('tokyo');
  await expect(page.getByRole('option', { name: /^Tokyo/ }).first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('list', { name: 'Saved cities' })).toContainText('Tokyo');
  await expect(page.getByRole('button', { name: 'Add city' })).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  expect(await active()).toBe('Options for Tokyo');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Remove' })).toBeFocused();
  await page.keyboard.press('Escape');
  expect(await active()).toBe('Options for Tokyo');

  await page.keyboard.press('Shift+Tab');
  expect(await active()).toBe('Clocks');
  await page.keyboard.press('Shift+Tab');
  expect(await active()).toBe('Settings');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await active()).toBe('Settings');
});

test('layouts: popup, side panel, and full page have no horizontal overflow', async ({ openSurface }) => {
  const overflow = (page: import('@playwright/test').Page) =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  const popup = await openSurface('popup');
  await addCity(popup, 'kathmandu', 'Kathmandu');
  await addCity(popup, 'los angeles', 'Los Angeles');
  expect(await overflow(popup)).toBe(0);
  await popup.getByRole('tab', { name: 'Plan' }).click();
  expect(await overflow(popup)).toBe(0);
  await popup.getByRole('tab', { name: 'Reminders' }).click();
  await popup.getByRole('button', { name: 'New reminder' }).click();
  expect(await overflow(popup)).toBe(0);

  for (const width of [320, 420, 560]) {
    const panel = await openSurface('sidepanel', { width, height: 780 });
    expect(await overflow(panel)).toBe(0);
    await panel.getByRole('tab', { name: 'Plan' }).click();
    expect(await overflow(panel)).toBe(0);
    await panel.close();
  }

  const dashboard = await openSurface('dashboard');
  expect(await overflow(dashboard)).toBe(0);
  const columnWidth = await dashboard.evaluate(() => document.querySelector('main')?.getBoundingClientRect().width ?? 0);
  expect(columnWidth).toBeLessThanOrEqual(760);
  expect(columnWidth).toBeGreaterThan(600);
});
