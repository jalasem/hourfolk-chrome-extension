import { describe, expect, it } from 'vitest';
import { createReminder, newReminderId } from './factory';

describe('newReminderId', () => {
  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newReminderId()));
    expect(ids.size).toBe(50);
  });
});

describe('createReminder', () => {
  it('sets all fields from the input and defaults enabled to true', () => {
    const nowMs = Date.UTC(2026, 0, 1);
    const reminder = createReminder({
      title: 'Call Alex',
      targetMs: nowMs + 3_600_000,
      timeZone: 'Europe/London',
      cityLabel: 'London',
      requestedDate: '2026-01-01',
      requestedTime: '13:00',
      nowMs,
    });

    expect(reminder.id).toEqual(expect.any(String));
    expect(reminder.id.length).toBeGreaterThan(0);
    expect(reminder.title).toBe('Call Alex');
    expect(reminder.targetMs).toBe(nowMs + 3_600_000);
    expect(reminder.timeZone).toBe('Europe/London');
    expect(reminder.cityLabel).toBe('London');
    expect(reminder.requestedDate).toBe('2026-01-01');
    expect(reminder.requestedTime).toBe('13:00');
    expect(reminder.createdAt).toBe(nowMs);
    expect(reminder.updatedAt).toBe(nowMs);
    expect(reminder.enabled).toBe(true);
    expect(reminder.firedAt).toBeUndefined();
    expect(reminder.snoozedUntilMs).toBeUndefined();
  });

  it('produces distinct ids across calls', () => {
    const nowMs = Date.now();
    const a = createReminder({
      title: 'A',
      targetMs: nowMs,
      timeZone: 'UTC',
      cityLabel: 'UTC',
      requestedDate: '2026-01-01',
      requestedTime: '00:00',
      nowMs,
    });
    const b = createReminder({
      title: 'B',
      targetMs: nowMs,
      timeZone: 'UTC',
      cityLabel: 'UTC',
      requestedDate: '2026-01-01',
      requestedTime: '00:00',
      nowMs,
    });
    expect(a.id).not.toBe(b.id);
  });
});
