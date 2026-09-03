import type { AdvanceMinutes, Reminder } from '@/domain/storage/schema';
import type { AlarmInfo, AlarmsAdapter } from '@/platform/types';
import { advanceAlarmNameFor, alarmNameFor, effectiveTargetMs, isScheduled, reminderIdFromAlarmName } from './alarms';
import type { AlarmCreation, ReconcilePlan } from './types';

/** Alarms firing within this tolerance of the target are treated as already correct (no recreate). */
const TOLERANCE_MS = 1000;

/** Pure planner: never touches the adapter, so it is trivial to test and to call twice for idempotency checks. */
export function planReconciliation(reminders: Reminder[], alarms: AlarmInfo[], nowMs: number): ReconcilePlan {
  const alarmsByName = new Map(alarms.map((alarm) => [alarm.name, alarm]));
  const create: AlarmCreation[] = [];
  const clear: string[] = [];
  const overdue: Reminder[] = [];

  for (const reminder of reminders) {
    const name = alarmNameFor(reminder.id);
    const existing = alarmsByName.get(name);

    if (isScheduled(reminder, nowMs)) {
      const whenMs = effectiveTargetMs(reminder);
      const matches = existing !== undefined && Math.abs(existing.scheduledTime - whenMs) <= TOLERANCE_MS;
      if (!matches) {
        if (existing) clear.push(name);
        create.push({ name, whenMs, reminderId: reminder.id });
      }
    } else {
      if (existing) clear.push(name);
      if (reminder.enabled && !reminder.firedAt && effectiveTargetMs(reminder) <= nowMs) {
        overdue.push(reminder);
      }
    }

    for (const minutes of reminder.advanceMinutes ?? []) {
      const advanceName = advanceAlarmNameFor(reminder.id, minutes);
      const existingAdvance = alarmsByName.get(advanceName);
      const advanceTarget = reminder.targetMs - minutes * 60_000;
      const shouldScheduleAdvance = reminder.enabled && !reminder.firedAt
        && !reminder.advanceFiredMinutes?.includes(minutes)
        && advanceTarget > nowMs && reminder.snoozedUntilMs === undefined;

      if (shouldScheduleAdvance) {
        const matches = existingAdvance !== undefined && Math.abs(existingAdvance.scheduledTime - advanceTarget) <= TOLERANCE_MS;
        if (!matches) {
          if (existingAdvance) clear.push(advanceName);
          create.push({ name: advanceName, whenMs: advanceTarget, reminderId: reminder.id });
        }
      } else if (existingAdvance) {
        clear.push(advanceName);
      }
    }

    const selectedNames = new Set((reminder.advanceMinutes ?? []).map((minutes) => advanceAlarmNameFor(reminder.id, minutes)));
    for (const alarm of alarms) {
      const parsed = parseAdvanceForReminder(alarm.name, reminder.id);
      if (parsed && !selectedNames.has(alarm.name) && !clear.includes(alarm.name)) clear.push(alarm.name);
    }
  }

  // Orphan hourfolk:reminder:* alarms with no matching reminder at all (foreign-named alarms are left untouched).
  const reminderIds = new Set(reminders.map((r) => r.id));
  for (const alarm of alarms) {
    const id = reminderIdFromAlarmName(alarm.name);
    if (id === undefined || reminderIds.has(id) || clear.includes(alarm.name)) continue;
    clear.push(alarm.name);
  }

  return { create, clear, overdue };
}

function parseAdvanceForReminder(name: string, reminderId: string): boolean {
  const legacyName = `hourfolk:reminder:advance:${reminderId}`;
  return name === legacyName || name.startsWith('hourfolk:reminder:advance:') && name.endsWith(`:${reminderId}`);
}

/** Reads current alarms, computes the plan, then executes it (clear before create) against `adapter`. */
export async function reconcileReminderAlarms(
  reminders: Reminder[],
  adapter: AlarmsAdapter,
  nowMs: number,
): Promise<ReconcilePlan> {
  const alarms = await adapter.getAll();
  const plan = planReconciliation(reminders, alarms, nowMs);

  for (const name of plan.clear) {
    await adapter.clear(name);
  }
  for (const creation of plan.create) {
    await adapter.create(creation.name, creation.whenMs);
  }

  return plan;
}
