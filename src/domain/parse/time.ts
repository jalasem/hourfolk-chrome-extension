import type { ParsedTime } from './types';

export interface TimeExtraction {
  time?: ParsedTime;
  /** `tokens` with the matched time (and a preceding "at") removed. */
  tokens: string[];
}

const MERIDIEM = /^(am|pm|a|p)$/i;
const COLON_MERIDIEM = /^(\d{1,2})[:.](\d{2})(am|pm|a|p)$/i;
const COLON_PLAIN = /^(\d{1,2})[:.](\d{2})$/;
const H_SEP = /^(\d{1,2})h(\d{2})?$/i;
const WORD_MERIDIEM = /^(\d{1,2})(am|pm|a|p)$/i;
const BARE_HOUR = /^(\d{1,2})$/;

interface Clock {
  hour: number;
  minute: number;
}

function isPm(word: string): boolean {
  return word.toLowerCase().startsWith('p');
}

function fromMeridiem(hourStr: string, minuteStr: string, meridiem: string): Clock | undefined {
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return undefined;
  const pm = isPm(meridiem);
  let normalised = hour;
  if (pm && normalised !== 12) normalised += 12;
  if (!pm && normalised === 12) normalised = 0;
  return { hour: normalised, minute };
}

function fromPlain24(hourStr: string, minuteStr: string): Clock | undefined {
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return { hour, minute };
}

/** Standalone (single-token) forms: "2:30pm", "2.30pm", "14:00", "14h30", "2pm", "noon", "midnight". */
function matchSingleToken(token: string): Clock | undefined {
  const colonMeridiem = COLON_MERIDIEM.exec(token);
  if (colonMeridiem) return fromMeridiem(colonMeridiem[1] as string, colonMeridiem[2] as string, colonMeridiem[3] as string);

  const colonPlain = COLON_PLAIN.exec(token);
  if (colonPlain) return fromPlain24(colonPlain[1] as string, colonPlain[2] as string);

  const hSep = H_SEP.exec(token);
  if (hSep) return fromPlain24(hSep[1] as string, hSep[2] ?? '0');

  const wordMeridiem = WORD_MERIDIEM.exec(token);
  if (wordMeridiem) return fromMeridiem(wordMeridiem[1] as string, '0', wordMeridiem[2] as string);

  if (/^noon$/i.test(token)) return { hour: 12, minute: 0 };
  if (/^midnight$/i.test(token)) return { hour: 0, minute: 0 };

  return undefined;
}

/** Two-token form where the number and the am/pm word are written apart: "2 pm", "4:30 pm". */
function matchTwoToken(token: string, next: string | undefined): Clock | undefined {
  if (!next || !MERIDIEM.test(next)) return undefined;
  const bare = BARE_HOUR.exec(token);
  if (bare) return fromMeridiem(bare[1] as string, '0', next);
  const colonPlain = COLON_PLAIN.exec(token);
  if (colonPlain) return fromMeridiem(colonPlain[1] as string, colonPlain[2] as string, next);
  return undefined;
}

/** A bare hour ("9") only counts as a time when written after "at"; it is then read as 24-hour. */
function matchBareHourAfterAt(token: string, prev: string | undefined): Clock | undefined {
  if (!prev || prev.toLowerCase() !== 'at') return undefined;
  const bare = BARE_HOUR.exec(token);
  if (!bare) return undefined;
  const hour = Number(bare[1]);
  if (hour < 0 || hour > 23) return undefined;
  return { hour, minute: 0 };
}

function toIso(clock: Clock): string {
  return `${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}`;
}

/**
 * Finds the first recognisable time expression in `tokens` and returns it along with the
 * remaining tokens (the matched tokens, plus a preceding "at", removed).
 */
export function extractTime(tokens: string[]): TimeExtraction {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] as string;
    const next = tokens[i + 1];
    const prev = i > 0 ? tokens[i - 1] : undefined;

    let clock = matchTwoToken(token, next);
    let span = 1;
    if (clock) {
      span = 2;
    } else {
      clock = matchSingleToken(token) ?? matchBareHourAfterAt(token, prev);
    }

    if (clock) {
      const removeAt = prev !== undefined && prev.toLowerCase() === 'at';
      const removed = new Set<number>();
      for (let k = i; k < i + span; k++) removed.add(k);
      if (removeAt) removed.add(i - 1);
      const raw = tokens.slice(i, i + span).join(' ');
      const remaining = tokens.filter((_, idx) => !removed.has(idx));
      return { time: { iso: toIso(clock), raw }, tokens: remaining };
    }
  }

  return { tokens: [...tokens] };
}
