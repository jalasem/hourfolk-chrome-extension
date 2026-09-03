import type { IsoDate, IsoTime } from './types';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_TIME = /^(\d{2}):(\d{2})$/;

export function isIsoDate(value: string): value is IsoDate {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

export function isIsoTime(value: string): value is IsoTime {
  const m = ISO_TIME.exec(value);
  if (!m) return false;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function parseIsoDate(iso: IsoDate): { year: number; month: number; day: number } {
  if (!isIsoDate(iso)) throw new RangeError(`Invalid ISO date: ${iso}`);
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return { year, month, day };
}

export function parseIsoTime(iso: IsoTime): { hour: number; minute: number } {
  if (!isIsoTime(iso)) throw new RangeError(`Invalid ISO time: ${iso}`);
  const [hour, minute] = iso.split(':').map(Number) as [number, number];
  return { hour, minute };
}

export function toIsoDate(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function toIsoTime(hour: number, minute: number): IsoTime {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Days since the Unix epoch for a calendar date (pure calendar arithmetic, no zones). */
export function isoDateToEpochDays(iso: IsoDate): number {
  const { year, month, day } = parseIsoDate(iso);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function epochDaysToIsoDate(days: number): IsoDate {
  const d = new Date(days * 86_400_000);
  return toIsoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return epochDaysToIsoDate(isoDateToEpochDays(iso) + days);
}

/** b - a in whole calendar days. */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return isoDateToEpochDays(b) - isoDateToEpochDays(a);
}

export function compareIsoDates(a: IsoDate, b: IsoDate): number {
  return Math.sign(diffDays(b, a));
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(iso: IsoDate): number {
  const jsDay = new Date(isoDateToEpochDays(iso) * 86_400_000).getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function compareIsoTimes(a: IsoTime, b: IsoTime): number {
  const ta = parseIsoTime(a);
  const tb = parseIsoTime(b);
  return Math.sign(ta.hour * 60 + ta.minute - (tb.hour * 60 + tb.minute));
}
