import { toIsoDate, toIsoTime } from './iso';
import type { DescribeOptions, HourCycle, IanaTimeZone, InstantDescription } from './types';
import { getOffsetMinutes, getWallClockParts } from './zone-clock';

const MINUS = '−';
const ABBREVIATION_LOCALES = ['en-US', 'en-GB', 'en-AU', 'en-IN'];
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function cached(key: string, make: () => Intl.DateTimeFormat): Intl.DateTimeFormat {
  let f = formatterCache.get(key);
  if (!f) {
    f = make();
    formatterCache.set(key, f);
  }
  return f;
}

/** "UTC−4", "UTC+5:30", "UTC". Pass `ascii: true` for a plain hyphen (copy/paste friendly). */
export function formatUtcOffset(offsetMinutes: number, opts: { ascii?: boolean } = {}): string {
  if (offsetMinutes === 0) return 'UTC';
  const sign = offsetMinutes < 0 ? (opts.ascii ? '-' : MINUS) : '+';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`;
}

function intlZoneName(epochMs: number, timeZone: IanaTimeZone, locale: string): string {
  const f = cached(`zn|${locale}|${timeZone}`, () => new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' }));
  return f.formatToParts(new Date(epochMs)).find((p) => p.type === 'timeZoneName')?.value ?? '';
}

const ALPHABETIC_ABBREVIATION = /^[A-Z]{2,5}$/;

/**
 * Best available zone abbreviation. Intl only knows alphabetic names for some zones per locale,
 * so several English locales are consulted before falling back to the caller-supplied
 * standard-time abbreviation and finally to Intl's "GMT+x" form.
 */
export function getZoneAbbreviation(
  epochMs: number,
  timeZone: IanaTimeZone,
  fallback?: DescribeOptions['abbreviationFallback'],
  locale?: string,
): string {
  const locales = locale && !ABBREVIATION_LOCALES.includes(locale) ? [locale, ...ABBREVIATION_LOCALES] : ABBREVIATION_LOCALES;
  let generic = '';
  for (const loc of locales) {
    const name = intlZoneName(epochMs, timeZone, loc);
    if (ALPHABETIC_ABBREVIATION.test(name)) return name;
    if (!generic && name) generic = name;
  }
  const fromFallback = fallback?.(timeZone, getOffsetMinutes(epochMs, timeZone));
  if (fromFallback && ALPHABETIC_ABBREVIATION.test(fromFallback)) return fromFallback;
  return generic || formatUtcOffset(getOffsetMinutes(epochMs, timeZone));
}

function timeFormatter(locale: string, timeZone: IanaTimeZone, hourCycle: HourCycle, seconds: boolean): Intl.DateTimeFormat {
  return cached(`t|${locale}|${timeZone}|${hourCycle}|${seconds}`, () =>
    new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: hourCycle === '24h' ? '2-digit' : 'numeric',
      minute: '2-digit',
      ...(seconds ? { second: '2-digit' } : {}),
      hourCycle: hourCycle === '24h' ? 'h23' : 'h12',
    }),
  );
}

function splitClock(parts: Intl.DateTimeFormatPart[]): { clock: string; period: string; full: string } {
  let clock = '';
  let period = '';
  for (const p of parts) {
    if (p.type === 'dayPeriod') period = p.value.replace(/\./g, '').toUpperCase();
    else if (p.type === 'literal' && p.value.trim() === '') continue;
    else clock += p.value;
  }
  return { clock, period, full: period ? `${clock} ${period}` : clock };
}

export function formatTime(epochMs: number, timeZone: IanaTimeZone, hourCycle: HourCycle, locale = 'en-US'): string {
  return splitClock(timeFormatter(locale, timeZone, hourCycle, false).formatToParts(new Date(epochMs))).full;
}

/** Full description of one instant as seen in one zone. Intl only; safe in the service worker. */
export function describeInstant(epochMs: number, timeZone: IanaTimeZone, opts: DescribeOptions): InstantDescription {
  const locale = opts.locale ?? 'en-US';
  const date = new Date(epochMs);
  const parts = getWallClockParts(epochMs, timeZone);
  const offsetMinutes = getOffsetMinutes(epochMs, timeZone);
  const { clock, period, full } = splitClock(timeFormatter(locale, timeZone, opts.hourCycle, false).formatToParts(date));
  const withSeconds = splitClock(timeFormatter(locale, timeZone, opts.hourCycle, true).formatToParts(date)).full;
  const weekday = cached(`wd|${locale}|${timeZone}`, () => new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long' })).format(date);
  const weekdayShort = cached(`wds|${locale}|${timeZone}`, () => new Intl.DateTimeFormat(locale, { timeZone, weekday: 'short' })).format(date);
  const dateShort = cached(`d|${locale}|${timeZone}`, () =>
    new Intl.DateTimeFormat(locale, { timeZone, month: 'short', day: 'numeric', year: 'numeric' }),
  ).format(date);
  const dateLong = cached(`dl|${locale}|${timeZone}`, () =>
    new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  ).format(date);

  return {
    epochMs,
    timeZone,
    isoDate: toIsoDate(parts.year, parts.month, parts.day),
    isoTime: toIsoTime(parts.hour, parts.minute),
    time: full,
    timeWithSeconds: withSeconds,
    clock,
    period,
    weekday,
    weekdayShort,
    date: dateShort,
    dateLong,
    abbreviation: getZoneAbbreviation(epochMs, timeZone, opts.abbreviationFallback, opts.locale),
    utcOffset: formatUtcOffset(offsetMinutes),
    offsetMinutes,
  };
}

/** "Mon, Sep 8" style short date for compact rows. */
export function formatShortDate(epochMs: number, timeZone: IanaTimeZone, locale = 'en-US'): string {
  return cached(`sd|${locale}|${timeZone}`, () =>
    new Intl.DateTimeFormat(locale, { timeZone, weekday: 'short', month: 'short', day: 'numeric' }),
  ).format(new Date(epochMs));
}

/** Formats a calendar date (no zone) such as "Monday, September 8, 2026". */
export function formatIsoDateLong(iso: string, locale = 'en-US'): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return cached(`idl|${locale}`, () =>
    new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  ).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatIsoDateShort(iso: string, locale = 'en-US'): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return cached(`ids|${locale}`, () =>
    new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
  ).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Formats a wall-clock "HH:MM" string according to the hour cycle without any zone math. */
export function formatIsoTime(iso: string, hourCycle: HourCycle, locale = 'en-US'): string {
  const [h, m] = iso.split(':').map(Number) as [number, number];
  return formatTime(Date.UTC(2000, 0, 1, h, m), 'UTC', hourCycle, locale);
}
