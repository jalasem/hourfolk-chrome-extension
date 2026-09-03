import type { Reminder } from '@/domain/storage/schema';

export const ALARM_PREFIX = 'hourfolk:reminder:';
export const ADVANCE_ALARM_PREFIX = `${ALARM_PREFIX}advance:`;

export type ReminderAlarmKind = 'at-time' | 'advance';

export interface ParsedReminderAlarm {
  reminderId: string;
  kind: ReminderAlarmKind;
  advanceMinutes?: 5 | 10 | 15 | 30;
}

export interface AlarmCreation {
  name: string;
  whenMs: number;
  reminderId: string;
}

export interface ReconcilePlan {
  create: AlarmCreation[];
  /** Alarm names to clear. */
  clear: string[];
  /** Enabled, undelivered reminders whose target has already passed. */
  overdue: Reminder[];
}

export interface ReminderNotification {
  title: string;
  message: string;
  contextMessage: string;
}
