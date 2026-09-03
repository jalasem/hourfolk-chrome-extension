import { addDays, daysInMonth, isIsoDate, isoWeekday, toIsoDate } from '@/domain/time/iso';
import { todayInZone } from '@/domain/time/zone-clock';
import type { IanaTimeZone, IsoDate } from '@/domain/time/types';
import type { ParsedDate } from './types';

export interface DateExtractionOptions {
  referenceZone: IanaTimeZone;
  nowMs: number;
}

export interface DateExtraction {
  date?: ParsedDate;
  /** `tokens` with the matched date (and a preceding "on") removed. */
  tokens: string[];
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const WEEKDAYS: Record<string, number> = {
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
  sun: 7,
  sunday: 7,
};

const DAY_OF_MONTH = /^(\d{1,2})(st|nd|rd|th)?$/i;
const YEAR = /^\d{4}$/;

/** This year if `month`/`day` falls today-or-later (compared as ISO strings); otherwise next year. */
function inferYear(month: number, day: number, today: IsoDate): number {
  const todayYear = Number(today.slice(0, 4));
  const candidate = toIsoDate(todayYear, month, day);
  return candidate >= today ? todayYear : todayYear + 1;
}

interface MonthDayMatch {
  year: number;
  month: number;
  day: number;
  consumed: number;
}

function monthDayMatch(month: number, dayTok: string | undefined, yearTok: string | undefined, today: IsoDate): MonthDayMatch | undefined {
  if (!dayTok) return undefined;
  const dm = DAY_OF_MONTH.exec(dayTok);
  if (!dm) return undefined;
  const day = Number(dm[1]);
  if (day < 1 || day > 31) return undefined;
  if (yearTok && YEAR.test(yearTok)) return { year: Number(yearTok), month, day, consumed: 3 };
  return { year: inferYear(month, day, today), month, day, consumed: 2 };
}

/** "Sep 8", "September 8th", "Sep 8 2026". */
function tryMonthThenDay(tokens: string[], i: number, today: IsoDate): MonthDayMatch | undefined {
  const month = MONTHS[(tokens[i] as string).toLowerCase()];
  if (month === undefined) return undefined;
  return monthDayMatch(month, tokens[i + 1], tokens[i + 2], today);
}

/** "8 Sep", "8th September", "8 Sep 2026". */
function tryDayThenMonth(tokens: string[], i: number, today: IsoDate): MonthDayMatch | undefined {
  const dm = DAY_OF_MONTH.exec(tokens[i] as string);
  if (!dm) return undefined;
  const monthTok = tokens[i + 1];
  if (!monthTok) return undefined;
  const month = MONTHS[monthTok.toLowerCase()];
  if (month === undefined) return undefined;
  return monthDayMatch(month, tokens[i], tokens[i + 2], today);
}

interface RelativeOrWeekdayMatch {
  iso: IsoDate;
  kind: ParsedDate['kind'];
  consumed: number;
}

function tryRelativeOrWeekday(tokens: string[], i: number, today: IsoDate, todayWeekday: number): RelativeOrWeekdayMatch | undefined {
  const token = tokens[i] as string;
  const lower = token.toLowerCase();

  if (lower === 'day' && tokens[i + 1]?.toLowerCase() === 'after' && tokens[i + 2]?.toLowerCase() === 'tomorrow') {
    return { iso: addDays(today, 2), kind: 'relative', consumed: 3 };
  }

  if (lower === 'next') {
    const weekdayTok = tokens[i + 1];
    const target = weekdayTok ? WEEKDAYS[weekdayTok.toLowerCase()] : undefined;
    if (target !== undefined) {
      const offset = (target - todayWeekday + 7) % 7 || 7;
      return { iso: addDays(today, offset), kind: 'weekday', consumed: 2 };
    }
    return undefined;
  }

  const weekdayTarget = WEEKDAYS[lower];
  if (weekdayTarget !== undefined) {
    const offset = (weekdayTarget - todayWeekday + 7) % 7;
    return { iso: addDays(today, offset), kind: 'weekday', consumed: 1 };
  }

  if (lower === 'today' || lower === 'tonight') return { iso: today, kind: 'relative', consumed: 1 };
  if (lower === 'tomorrow') return { iso: addDays(today, 1), kind: 'relative', consumed: 1 };

  // "yesterday" is deliberately not matched: Hourfolk only plans forward.
  return undefined;
}

/**
 * Finds the first recognisable date expression in `tokens`: relative words ("today",
 * "tomorrow", "day after tomorrow", "tonight"), a weekday name (optionally preceded by
 * "next"), a month-day form with an optional year, or an ISO date. A preceding "on" is
 * dropped along with the match. "Yesterday" and numeric month/day forms ("9/8") are not
 * recognised.
 */
export function extractDate(tokens: string[], opts: DateExtractionOptions): DateExtraction {
  const today = todayInZone(opts.referenceZone, opts.nowMs);
  const todayWeekday = isoWeekday(today);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] as string;
    let iso: IsoDate | undefined;
    let kind: ParsedDate['kind'] | undefined;
    let consumed = 1;

    if (isIsoDate(token)) {
      iso = token;
      kind = 'explicit';
    } else {
      const monthDay = tryMonthThenDay(tokens, i, today) ?? tryDayThenMonth(tokens, i, today);
      if (monthDay && monthDay.day <= daysInMonth(monthDay.year, monthDay.month)) {
        iso = toIsoDate(monthDay.year, monthDay.month, monthDay.day);
        kind = 'explicit';
        consumed = monthDay.consumed;
      } else {
        const relative = tryRelativeOrWeekday(tokens, i, today, todayWeekday);
        if (relative) {
          iso = relative.iso;
          kind = relative.kind;
          consumed = relative.consumed;
        }
      }
    }

    if (iso && kind) {
      const matchEnd = i + consumed - 1;
      const removeOn = i > 0 && (tokens[i - 1] as string).toLowerCase() === 'on';
      const removed = new Set<number>();
      for (let k = i; k <= matchEnd; k++) removed.add(k);
      if (removeOn) removed.add(i - 1);
      const raw = tokens.slice(i, matchEnd + 1).join(' ');
      const remaining = tokens.filter((_, idx) => !removed.has(idx));
      return { date: { iso, raw, kind }, tokens: remaining };
    }
  }

  return { tokens: [...tokens] };
}
