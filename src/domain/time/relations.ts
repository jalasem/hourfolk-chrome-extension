import { diffDays } from './iso';
import type { DayRelation, IanaTimeZone, OffsetDifference } from './types';
import { getOffsetMinutes, isoDateAt } from './zone-clock';

const MINUS = '−';
const FRACTION_GLYPHS: Record<number, string> = { 15: '¼', 30: '½', 45: '¾' };

export function formatDayDelta(delta: number): string {
  if (delta === -1) return 'Yesterday';
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  return delta > 0 ? `+${delta} days` : `${MINUS}${Math.abs(delta)} days`;
}

/** Calendar-day delta between the date of `epochMs` in `zone` and the date of `referenceEpochMs` in `referenceZone`. */
export function dayRelation(
  epochMs: number,
  zone: IanaTimeZone,
  referenceZone: IanaTimeZone,
  referenceEpochMs: number = epochMs,
): DayRelation {
  const date = isoDateAt(epochMs, zone);
  const referenceDate = isoDateAt(referenceEpochMs, referenceZone);
  const dayDelta = diffDays(referenceDate, date);
  return { dayDelta, label: formatDayDelta(dayDelta) };
}

function formatOffsetLabel(minutes: number): string {
  if (minutes === 0) return 'Same time';
  const direction = minutes > 0 ? 'ahead' : 'behind';
  const abs = Math.abs(minutes);
  if (abs < 60) return `${abs} minutes ${direction}`;

  const hours = Math.floor(abs / 60);
  const remainder = abs % 60;
  const fraction = FRACTION_GLYPHS[remainder];
  if (fraction) return `${hours}${fraction} hours ${direction}`;
  if (remainder === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${direction}`;
  return `${hours} h ${remainder} m ${direction}`;
}

/** Offset of `zone` minus offset of `referenceZone`, in minutes, at `epochMs`. */
export function offsetDifference(epochMs: number, zone: IanaTimeZone, referenceZone: IanaTimeZone): OffsetDifference {
  const minutes = getOffsetMinutes(epochMs, zone) - getOffsetMinutes(epochMs, referenceZone);
  return { minutes, label: formatOffsetLabel(minutes) };
}
