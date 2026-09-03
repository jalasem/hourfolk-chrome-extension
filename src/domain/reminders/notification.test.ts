import { describe, expect, it } from 'vitest';
import type { Reminder } from '@/domain/storage/schema';
import { buildReminderNotification } from './notification';

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'r1',
    title: 'Sync with design',
    targetMs: Date.UTC(2026, 8, 8, 18, 0),
    timeZone: 'America/New_York',
    cityLabel: 'New York',
    requestedDate: '2026-09-08',
    requestedTime: '14:00',
    createdAt: Date.UTC(2026, 8, 1),
    updatedAt: Date.UTC(2026, 8, 1),
    enabled: true,
    ...overrides,
  };
}

describe('buildReminderNotification', () => {
  it('formats city time and local time when the viewer is elsewhere', () => {
    const notification = buildReminderNotification(makeReminder(), { localZone: 'Asia/Muscat', hourCycle: '12h' });
    expect(notification.title).toBe('Sync with design');
    expect(notification.message).toBe('2:00 PM in New York (Tue, Sep 8) · 10:00 PM for you');
  });

  it('omits the "for you" half when the viewer is in the same zone as the reminder', () => {
    const notification = buildReminderNotification(makeReminder(), { localZone: 'America/New_York', hourCycle: '12h' });
    expect(notification.message).toBe('2:00 PM in New York (Tue, Sep 8)');
  });

  it('falls back to a default title for an empty/whitespace title', () => {
    const notification = buildReminderNotification(makeReminder({ title: '   ' }), {
      localZone: 'America/New_York',
      hourCycle: '12h',
    });
    expect(notification.title).toBe('Hourfolk reminder');
  });

  it('uses the late context message when late is true', () => {
    const notification = buildReminderNotification(makeReminder(), {
      localZone: 'America/New_York',
      hourCycle: '12h',
      late: true,
    });
    expect(notification.contextMessage).toBe('Delivered late — your device was probably asleep or Chrome was closed.');
  });

  it('uses the default context message when not late', () => {
    const notification = buildReminderNotification(makeReminder(), { localZone: 'America/New_York', hourCycle: '12h' });
    expect(notification.contextMessage).toBe('Hourfolk · Your hours, wherever work happens');
  });

  it('labels an advance notification with its lead time', () => {
    const notification = buildReminderNotification(makeReminder({ advanceMinutes: [15] }), {
      localZone: 'America/New_York',
      hourCycle: '12h',
      advanceMinutes: 15,
    });
    expect(notification.contextMessage).toBe('Starts in 15 minutes · Hourfolk');
  });
});
