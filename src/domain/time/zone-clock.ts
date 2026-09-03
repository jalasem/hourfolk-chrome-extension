import { toIsoDate, toIsoTime } from './iso';
import type { IanaTimeZone, IsoDate, IsoTime, WallClockParts } from './types';

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: IanaTimeZone): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The device zone as reported by the browser's Intl implementation. */
export function getDeviceTimeZone(): IanaTimeZone {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return zone && isValidTimeZone(zone) ? zone : 'UTC';
}

/** Wall-clock fields for an instant in a zone, derived from Intl only. */
export function getWallClockParts(epochMs: number, timeZone: IanaTimeZone): WallClockParts {
  const parts = partsFormatter(timeZone).formatToParts(new Date(epochMs));
  const pick = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? '';
  const hour = Number(pick('hour'));
  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
    hour: hour === 24 ? 0 : hour,
    minute: Number(pick('minute')),
    second: Number(pick('second')),
    weekday: WEEKDAYS[pick('weekday')] ?? 1,
  };
}

/** Offset of `timeZone` from UTC at `epochMs`, in minutes (east positive). */
export function getOffsetMinutes(epochMs: number, timeZone: IanaTimeZone): number {
  const p = getWallClockParts(epochMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const wholeSeconds = epochMs - (epochMs % 1000);
  return Math.round((asUtc - wholeSeconds) / 60_000);
}

export function isoDateAt(epochMs: number, timeZone: IanaTimeZone): IsoDate {
  const p = getWallClockParts(epochMs, timeZone);
  return toIsoDate(p.year, p.month, p.day);
}

export function isoTimeAt(epochMs: number, timeZone: IanaTimeZone): IsoTime {
  const p = getWallClockParts(epochMs, timeZone);
  return toIsoTime(p.hour, p.minute);
}

export function todayInZone(timeZone: IanaTimeZone, nowMs: number): IsoDate {
  return isoDateAt(nowMs, timeZone);
}
