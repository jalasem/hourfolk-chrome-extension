import { addDays } from './iso';
import { resolveWallClock } from './resolve';
import type { IanaTimeZone, IsoTime, NextOccurrence } from './types';
import { todayInZone } from './zone-clock';

/** The next instant at which the wall clock in `zone` reads `time`, strictly after `nowMs`. */
export function nextOccurrence(zone: IanaTimeZone, time: IsoTime, nowMs: number): NextOccurrence {
  const today = todayInZone(zone, nowMs);
  const todayEpochMs = resolveWallClock({ timeZone: zone, date: today, time }).epochMs;
  if (todayEpochMs > nowMs) {
    return { date: today, epochMs: todayEpochMs, isToday: true };
  }

  const tomorrow = addDays(today, 1);
  const tomorrowEpochMs = resolveWallClock({ timeZone: zone, date: tomorrow, time }).epochMs;
  return { date: tomorrow, epochMs: tomorrowEpochMs, isToday: false };
}
