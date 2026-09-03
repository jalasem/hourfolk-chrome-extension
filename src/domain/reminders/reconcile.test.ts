import { describe, expect, it } from 'vitest';
import { createMemoryAlarmsAdapter } from '@/platform/memory/alarms';
import type { Reminder } from '@/domain/storage/schema';
import { advanceAlarmNameFor, alarmNameFor, parseReminderAlarmName, reminderIdFromAlarmName } from './alarms';
import { planReconciliation, reconcileReminderAlarms } from './reconcile';

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'r1',
    title: 'Test',
    targetMs: NOW + 60_000,
    timeZone: 'America/New_York',
    cityLabel: 'New York',
    requestedDate: '2026-01-01',
    requestedTime: '07:00',
    createdAt: NOW,
    updatedAt: NOW,
    enabled: true,
    ...overrides,
  };
}

describe('planReconciliation', () => {
  it('creates an alarm for an enabled future reminder with no existing alarm', () => {
    const reminder = makeReminder();
    const plan = planReconciliation([reminder], [], NOW);
    expect(plan.create).toEqual([{ name: alarmNameFor('r1'), whenMs: reminder.targetMs, reminderId: 'r1' }]);
    expect(plan.clear).toEqual([]);
    expect(plan.overdue).toEqual([]);
  });

  it('creates an additional alarm at the selected advance time', () => {
    const reminder = makeReminder({ targetMs: NOW + 60 * 60_000, advanceMinutes: [30, 15] });
    const plan = planReconciliation([reminder], [], NOW);
    expect(plan.create).toEqual([
      { name: alarmNameFor('r1'), whenMs: reminder.targetMs, reminderId: 'r1' },
      { name: advanceAlarmNameFor('r1', 30), whenMs: reminder.targetMs - 30 * 60_000, reminderId: 'r1' },
      { name: advanceAlarmNameFor('r1', 15), whenMs: reminder.targetMs - 15 * 60_000, reminderId: 'r1' },
    ]);
  });

  it('does not recreate an advance alarm after its notification fired', () => {
    const reminder = makeReminder({ targetMs: NOW + 60 * 60_000, advanceMinutes: [30, 15], advanceFiredMinutes: [15] });
    const plan = planReconciliation([reminder], [], NOW);
    expect(plan.create).toEqual([
      { name: alarmNameFor('r1'), whenMs: reminder.targetMs, reminderId: 'r1' },
      { name: advanceAlarmNameFor('r1', 30), whenMs: reminder.targetMs - 30 * 60_000, reminderId: 'r1' },
    ]);
  });

  it('does not create for a disabled reminder and clears an existing alarm', () => {
    const reminder = makeReminder({ enabled: false });
    const alarms = [{ name: alarmNameFor('r1'), scheduledTime: reminder.targetMs }];
    const plan = planReconciliation([reminder], alarms, NOW);
    expect(plan.create).toEqual([]);
    expect(plan.clear).toEqual([alarmNameFor('r1')]);
  });

  it('clears the alarm for a fired reminder', () => {
    const reminder = makeReminder({ firedAt: NOW - 1000 });
    const alarms = [{ name: alarmNameFor('r1'), scheduledTime: reminder.targetMs }];
    const plan = planReconciliation([reminder], alarms, NOW);
    expect(plan.create).toEqual([]);
    expect(plan.clear).toEqual([alarmNameFor('r1')]);
    expect(plan.overdue).toEqual([]);
  });

  it('uses snoozedUntilMs over targetMs', () => {
    const snoozeTarget = NOW + 10 * 60_000;
    const reminder = makeReminder({ targetMs: NOW - 5000, snoozedUntilMs: snoozeTarget });
    const plan = planReconciliation([reminder], [], NOW);
    expect(plan.create).toEqual([{ name: alarmNameFor('r1'), whenMs: snoozeTarget, reminderId: 'r1' }]);
    expect(plan.overdue).toEqual([]);
  });

  it('does nothing when an existing alarm already matches the target time', () => {
    const reminder = makeReminder();
    const alarms = [{ name: alarmNameFor('r1'), scheduledTime: reminder.targetMs }];
    const plan = planReconciliation([reminder], alarms, NOW);
    expect(plan.create).toEqual([]);
    expect(plan.clear).toEqual([]);
  });

  it('tolerates sub-second drift between an existing alarm and the target time', () => {
    const reminder = makeReminder();
    const alarms = [{ name: alarmNameFor('r1'), scheduledTime: reminder.targetMs + 500 }];
    const plan = planReconciliation([reminder], alarms, NOW);
    expect(plan.create).toEqual([]);
    expect(plan.clear).toEqual([]);
  });

  it('recreates when the existing alarm time has drifted beyond tolerance', () => {
    const reminder = makeReminder();
    const alarms = [{ name: alarmNameFor('r1'), scheduledTime: reminder.targetMs + 5000 }];
    const plan = planReconciliation([reminder], alarms, NOW);
    expect(plan.clear).toEqual([alarmNameFor('r1')]);
    expect(plan.create).toEqual([{ name: alarmNameFor('r1'), whenMs: reminder.targetMs, reminderId: 'r1' }]);
  });

  it('clears an orphan hourfolk alarm with no matching reminder', () => {
    const plan = planReconciliation([], [{ name: alarmNameFor('ghost'), scheduledTime: NOW + 1000 }], NOW);
    expect(plan.clear).toEqual([alarmNameFor('ghost')]);
  });

  it('leaves foreign alarms untouched', () => {
    const plan = planReconciliation([], [{ name: 'some-other-extension-alarm', scheduledTime: NOW + 1000 }], NOW);
    expect(plan.clear).toEqual([]);
  });

  it('lists an enabled past reminder as overdue without creating an alarm', () => {
    const reminder = makeReminder({ targetMs: NOW - 1000 });
    const plan = planReconciliation([reminder], [], NOW);
    expect(plan.create).toEqual([]);
    expect(plan.overdue).toEqual([reminder]);
  });

  it('round-trips alarm names through reminderIdFromAlarmName', () => {
    expect(reminderIdFromAlarmName(alarmNameFor('abc-123'))).toBe('abc-123');
    expect(reminderIdFromAlarmName('unrelated')).toBeUndefined();
    expect(parseReminderAlarmName(advanceAlarmNameFor('abc-123', 15))).toEqual({ reminderId: 'abc-123', kind: 'advance', advanceMinutes: 15 });
    expect(parseReminderAlarmName('hourfolk:reminder:advance:abc-123')).toEqual({ reminderId: 'abc-123', kind: 'advance' });
  });
});

describe('reconcileReminderAlarms', () => {
  it('is idempotent: a second run with unchanged inputs produces an empty create/clear plan', async () => {
    const adapter = createMemoryAlarmsAdapter();
    const reminders = [makeReminder({ id: 'a' }), makeReminder({ id: 'b', enabled: false })];
    // Seed an orphan and a stale-time alarm so the first pass has cleanup to do.
    await adapter.create(alarmNameFor('ghost'), NOW + 1000);
    await adapter.create(alarmNameFor('a'), NOW + 999_000);

    const first = await reconcileReminderAlarms(reminders, adapter, NOW);
    expect(first.create.length + first.clear.length).toBeGreaterThan(0);

    const second = await reconcileReminderAlarms(reminders, adapter, NOW);
    expect(second.create).toEqual([]);
    expect(second.clear).toEqual([]);
  });
});
