import {
  buildReminderNotification,
  parseReminderAlarmName,
  NOTIFICATION_ID_PREFIX,
  reconcileReminderAlarms,
  SNOOZE_MINUTES,
} from '@/domain/reminders';
import {
  createHourfolkStore,
  normalizeReminders,
  normalizeSettings,
  STORAGE_KEYS,
  type Reminder,
  type AdvanceMinutes,
  type SurfacePreference,
} from '@/domain/storage';
import { getDeviceTimeZone } from '@/domain/time/zone-clock';
import { createChromeAlarmsAdapter } from '@/platform/chrome/alarms';
import { clearNotification, showNotification } from '@/platform/chrome/notifications';
import { createChromeStorageArea } from '@/platform/chrome/storage';
import { applySurfacePreference, openDashboardTab, openSidePanel } from '@/platform/chrome/surface';

const area = createChromeStorageArea();
const alarmsAdapter = createChromeAlarmsAdapter();
const store = createHourfolkStore(area);
const ADVANCE_NOTIFICATION_ID_PREFIX = `${NOTIFICATION_ID_PREFIX}advance:`;

/** Mirrors settings.surface so `action.onClicked` can react synchronously (a user-gesture requirement). */
let surfacePref: SurfacePreference | undefined;

function logError(label: string, err: unknown): void {
  console.error(`[hourfolk] ${label}`, err);
}

async function bootstrap(reason: string): Promise<void> {
  try {
    const state = await store.load();
    surfacePref = state.settings.surface;
    await applySurfacePreference(state.settings.surface);
    await reconcileAndDeliver();
  } catch (err) {
    logError(`bootstrap(${reason}) failed`, err);
  }
}

/** Reconciles alarms against `reminders` (defaults to the cached snapshot) and delivers anything overdue. */
async function reconcileAndDeliver(reminders?: Reminder[]): Promise<void> {
  try {
    const list = reminders ?? store.getState().reminders;
    const plan = await reconcileReminderAlarms(list, alarmsAdapter, Date.now());
    for (const reminder of plan.overdue) {
      await deliver(reminder, { late: true });
    }
  } catch (err) {
    logError('reconcileAndDeliver failed', err);
  }
}

async function deliver(reminder: Reminder, options: { late: boolean }): Promise<void> {
  try {
    const state = store.getState();
    const notification = buildReminderNotification(reminder, {
      localZone: getDeviceTimeZone(),
      hourCycle: state.settings.hourCycle,
      late: options.late,
    });
    await showNotification(NOTIFICATION_ID_PREFIX + reminder.id, {
      ...notification,
      buttons: [{ title: `Snooze ${SNOOZE_MINUTES} minutes` }],
      silent: state.settings.notificationsMuted,
    });

    const now = Date.now();
    // Drop snoozedUntilMs rather than setting it to undefined (exactOptionalPropertyTypes).
    const { snoozedUntilMs: _snoozedUntilMs, ...rest } = reminder;
    await store.upsertReminder({ ...rest, firedAt: now, updatedAt: now });
  } catch (err) {
    logError('deliver failed', err);
  }
}

async function deliverAdvance(reminder: Reminder, minutes: AdvanceMinutes): Promise<void> {
  try {
    const state = store.getState();
    const notification = buildReminderNotification(reminder, {
      localZone: getDeviceTimeZone(),
      hourCycle: state.settings.hourCycle,
      advanceMinutes: minutes,
    });
    await showNotification(`${ADVANCE_NOTIFICATION_ID_PREFIX}${minutes}:${reminder.id}`, {
      ...notification,
      silent: state.settings.notificationsMuted,
    });

    const now = Date.now();
    const advanceFiredMinutes = [...new Set([...(reminder.advanceFiredMinutes ?? []), minutes])];
    await store.upsertReminder({ ...reminder, advanceFiredMinutes, updatedAt: now });
  } catch (err) {
    logError('deliverAdvance failed', err);
  }
}

async function snoozeReminder(reminder: Reminder): Promise<void> {
  const now = Date.now();
  // Drop firedAt rather than setting it to undefined (exactOptionalPropertyTypes).
  const { firedAt: _firedAt, ...rest } = reminder;
  await store.upsertReminder({ ...rest, snoozedUntilMs: now + SNOOZE_MINUTES * 60_000, updatedAt: now });
}

function reminderIdFromNotificationId(notificationId: string): string | undefined {
  if (!notificationId.startsWith(NOTIFICATION_ID_PREFIX)) return undefined;
  const id = notificationId.slice(NOTIFICATION_ID_PREFIX.length);
  return id.length > 0 ? id : undefined;
}

chrome.runtime.onInstalled.addListener(() => {
  void bootstrap('onInstalled');
});

chrome.runtime.onStartup.addListener(() => {
  void bootstrap('onStartup');
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  try {
    // Read straight off the change payload rather than store.getState(): the store's own
    // onChanged listener (registered inside store.load()) may not have run yet when this
    // listener fires for a change that originated in another surface.
    if (STORAGE_KEYS.reminders in changes) {
      const reminders = normalizeReminders(changes[STORAGE_KEYS.reminders]?.newValue);
      void reconcileAndDeliver(reminders);
    }
    if (STORAGE_KEYS.settings in changes) {
      const settings = normalizeSettings(changes[STORAGE_KEYS.settings]?.newValue);
      surfacePref = settings.surface;
      void applySurfacePreference(settings.surface);
    }
  } catch (err) {
    logError('storage.onChanged handler failed', err);
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  void handleAlarm(alarm.name);
});

async function handleAlarm(name: string): Promise<void> {
  try {
    const parsed = parseReminderAlarmName(name);
    if (parsed === undefined) return; // Not one of ours.

    const state = await store.load();
    const reminder = state.reminders.find((r) => r.id === parsed.reminderId);
    if (reminder && reminder.enabled && !reminder.firedAt) {
      if (
        parsed.kind === 'advance'
        && parsed.advanceMinutes !== undefined
        && reminder.advanceMinutes?.includes(parsed.advanceMinutes)
        && !reminder.advanceFiredMinutes?.includes(parsed.advanceMinutes)
      ) {
        await deliverAdvance(reminder, parsed.advanceMinutes);
      } else if (parsed.kind === 'at-time') {
        await deliver(reminder, { late: false });
      } else {
        await alarmsAdapter.clear(name);
      }
    } else {
      await alarmsAdapter.clear(name);
    }
  } catch (err) {
    logError('alarms.onAlarm handler failed', err);
  }
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  void handleNotificationButtonClicked(notificationId, buttonIndex);
});

async function handleNotificationButtonClicked(notificationId: string, buttonIndex: number): Promise<void> {
  try {
    if (buttonIndex !== 0) return;
    const id = reminderIdFromNotificationId(notificationId);
    if (id !== undefined) {
      const state = await store.load();
      const reminder = state.reminders.find((r) => r.id === id);
      if (reminder) await snoozeReminder(reminder);
    }
    await clearNotification(notificationId);
  } catch (err) {
    logError('notifications.onButtonClicked handler failed', err);
  }
}

chrome.notifications.onClicked.addListener((notificationId) => {
  void handleNotificationClicked(notificationId);
});

async function handleNotificationClicked(notificationId: string): Promise<void> {
  try {
    await openDashboardTab();
    await clearNotification(notificationId);
  } catch (err) {
    logError('notifications.onClicked handler failed', err);
  }
}

chrome.action.onClicked.addListener((tab) => {
  try {
    if (surfacePref === 'sidepanel') {
      // Must be invoked synchronously (no prior await) to satisfy the user-gesture requirement.
      void openSidePanel(tab.windowId);
      return;
    }
    if (surfacePref === 'page') {
      void openDashboardTab();
      return;
    }
    // surfacePref not populated yet: load the store, then open the dashboard tab only —
    // opening the side panel after an await would fail the gesture check.
    void (async () => {
      const state = await store.load();
      surfacePref = state.settings.surface;
      await openDashboardTab();
    })().catch((err: unknown) => logError('action.onClicked fallback failed', err));
  } catch (err) {
    logError('action.onClicked handler failed', err);
  }
});

void bootstrap('start');
