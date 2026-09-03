import type { Reminder } from '@/domain/storage/schema';
import type { IanaTimeZone, IsoDate, IsoTime } from '@/domain/time/types';

export function newReminderId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface CreateReminderInput {
  title: string;
  targetMs: number;
  timeZone: IanaTimeZone;
  cityLabel: string;
  requestedDate: IsoDate;
  requestedTime: IsoTime;
  nowMs: number;
  advanceMinutes?: Reminder['advanceMinutes'];
}

export function createReminder(input: CreateReminderInput): Reminder {
  const reminder: Reminder = {
    id: newReminderId(),
    title: input.title,
    targetMs: input.targetMs,
    timeZone: input.timeZone,
    cityLabel: input.cityLabel,
    requestedDate: input.requestedDate,
    requestedTime: input.requestedTime,
    createdAt: input.nowMs,
    updatedAt: input.nowMs,
    enabled: true,
  };
  if (input.advanceMinutes?.length) reminder.advanceMinutes = [...input.advanceMinutes];
  return reminder;
}
