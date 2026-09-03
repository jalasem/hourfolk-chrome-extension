import type { AdvanceMinutes, Reminder } from '@/domain/storage/schema';
import { describeInstant, formatShortDate } from '@/domain/time/format';
import type { HourCycle } from '@/domain/time/types';
import type { ReminderNotification } from './types';

export const SNOOZE_MINUTES = 10;
export const NOTIFICATION_ID_PREFIX = 'hourfolk:reminder:';

export interface BuildNotificationOptions {
  localZone: string;
  hourCycle: HourCycle;
  late?: boolean;
  locale?: string;
  advanceMinutes?: AdvanceMinutes;
}

/**
 * "2:00 PM in New York (Tue, Sep 8) · 10:00 PM for you" — the city-zone half always shows, the
 * "for you" half is omitted when the viewer's zone matches the reminder's zone.
 */
export function buildReminderNotification(reminder: Reminder, options: BuildNotificationOptions): ReminderNotification {
  const { localZone, hourCycle, late = false, locale, advanceMinutes } = options;
  const describeOpts = locale !== undefined ? { hourCycle, locale } : { hourCycle };

  const cityTime = describeInstant(reminder.targetMs, reminder.timeZone, describeOpts).time;
  const cityDate = formatShortDate(reminder.targetMs, reminder.timeZone, locale);
  const cityLine = `${cityTime} in ${reminder.cityLabel} (${cityDate})`;

  const message =
    localZone === reminder.timeZone
      ? cityLine
      : `${cityLine} · ${describeInstant(reminder.targetMs, localZone, describeOpts).time} for you`;

  return {
    title: reminder.title.trim() || 'Hourfolk reminder',
    message,
    contextMessage: advanceMinutes !== undefined
      ? `Starts in ${advanceMinutes} minutes · Hourfolk`
      : late
      ? 'Delivered late — your device was probably asleep or Chrome was closed.'
      : 'Hourfolk · Your hours, wherever work happens',
  };
}
