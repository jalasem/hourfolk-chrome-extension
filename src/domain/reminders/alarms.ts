import type { AdvanceMinutes, Reminder } from '@/domain/storage/schema';
import { ADVANCE_ALARM_PREFIX, ALARM_PREFIX, type ParsedReminderAlarm } from './types';

export function alarmNameFor(id: string): string {
  return `${ALARM_PREFIX}${id}`;
}

export function advanceAlarmNameFor(id: string, minutes: AdvanceMinutes): string {
  return `${ADVANCE_ALARM_PREFIX}${minutes}:${id}`;
}

export function parseReminderAlarmName(name: string): ParsedReminderAlarm | undefined {
  if (name.startsWith(ADVANCE_ALARM_PREFIX)) {
    const suffix = name.slice(ADVANCE_ALARM_PREFIX.length);
    const separator = suffix.indexOf(':');
    if (separator === -1) return suffix ? { reminderId: suffix, kind: 'advance' } : undefined;
    const minutes = Number(suffix.slice(0, separator));
    const reminderId = suffix.slice(separator + 1);
    if (!reminderId || ![5, 10, 15, 30].includes(minutes)) return undefined;
    return { reminderId, kind: 'advance', advanceMinutes: minutes as AdvanceMinutes };
  }
  if (!name.startsWith(ALARM_PREFIX)) return undefined;
  const reminderId = name.slice(ALARM_PREFIX.length);
  return reminderId ? { reminderId, kind: 'at-time' } : undefined;
}

export function reminderIdFromAlarmName(name: string): string | undefined {
  return parseReminderAlarmName(name)?.reminderId;
}

/** The instant the alarm should target: a snooze overrides the originally requested time. */
export function effectiveTargetMs(reminder: Reminder): number {
  return reminder.snoozedUntilMs ?? reminder.targetMs;
}

/** Whether `reminder` should currently have a pending (not yet fired) alarm. */
export function isScheduled(reminder: Reminder, nowMs: number): boolean {
  return reminder.enabled && !reminder.firedAt && effectiveTargetMs(reminder) > nowMs;
}
