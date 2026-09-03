import { describe, expect, it } from 'vitest';
import { normalizeReminders } from './validate';

const validReminder = {
  id: 'r1',
  title: 'Standup',
  targetMs: Date.UTC(2026, 8, 8, 18, 0),
  timeZone: 'America/New_York',
  cityLabel: 'New York',
  requestedDate: '2026-09-08',
  requestedTime: '14:00',
  createdAt: Date.UTC(2026, 8, 1),
  updatedAt: Date.UTC(2026, 8, 1),
  enabled: true,
};

describe('normalizeReminders', () => {
  it('preserves supported advance reminder fields', () => {
    const [reminder] = normalizeReminders([{ ...validReminder, advanceMinutes: [30, 5, 15, 5], advanceFiredMinutes: [15, 20] }]);
    expect(reminder?.advanceMinutes).toEqual([30, 15, 5]);
    expect(reminder?.advanceFiredMinutes).toEqual([15]);
  });

  it('drops unsupported advance minute values', () => {
    const [reminder] = normalizeReminders([{ ...validReminder, advanceMinutes: 20 }]);
    expect(reminder?.advanceMinutes).toBeUndefined();
  });
});
