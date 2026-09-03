import { Temporal } from '@js-temporal/polyfill';
import { formatIsoDateShort, formatIsoTime, formatUtcOffset } from './format';
import { isIsoDate, isIsoTime, parseIsoDate, parseIsoTime, toIsoDate, toIsoTime } from './iso';
import type { Disambiguation, IanaTimeZone, WallClockRequest, WallClockResolution } from './types';
import { getOffsetMinutes, isValidTimeZone } from './zone-clock';

/** The zone's last path segment with underscores turned into spaces, e.g. "America/New_York" -> "New York". */
function cityName(zone: IanaTimeZone): string {
  const last = zone.split('/').pop() ?? zone;
  return last.replace(/_/g, ' ');
}

/** The wall-clock hour/minute an instant reads when interpreted at a given fixed offset (not the zone's actual offset). */
function wallTimeAtOffset(epochMs: number, offsetMinutes: number): { hour: number; minute: number } {
  const shifted = new Date(epochMs + offsetMinutes * 60_000);
  return { hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() };
}

function displayTime(hour: number, minute: number): string {
  return formatIsoTime(toIsoTime(hour, minute), '12h');
}

export function resolveWallClock(req: WallClockRequest): WallClockResolution {
  if (!isIsoDate(req.date)) throw new RangeError(`Invalid ISO date: ${req.date}`);
  if (!isIsoTime(req.time)) throw new RangeError(`Invalid ISO time: ${req.time}`);
  if (!isValidTimeZone(req.timeZone)) throw new RangeError(`Invalid IANA time zone: ${req.timeZone}`);

  const { year, month, day } = parseIsoDate(req.date);
  const { hour, minute } = parseIsoTime(req.time);
  const fields = { timeZone: req.timeZone, year, month, day, hour, minute };

  const earlier = Temporal.ZonedDateTime.from(fields, { disambiguation: 'earlier' });
  const later = Temporal.ZonedDateTime.from(fields, { disambiguation: 'later' });
  const earlierMs = earlier.epochMilliseconds;
  const laterMs = later.epochMilliseconds;

  if (earlierMs === laterMs) {
    return { kind: 'unique', epochMs: earlierMs };
  }

  const requestedPlainDateTime = Temporal.PlainDateTime.from({ year, month, day, hour, minute });
  const timeDisplay = formatIsoTime(req.time, '12h');
  const dateDisplay = formatIsoDateShort(req.date);
  const city = cityName(req.timeZone);
  const earlierOffset = formatUtcOffset(getOffsetMinutes(earlierMs, req.timeZone));
  const laterOffset = formatUtcOffset(getOffsetMinutes(laterMs, req.timeZone));

  if (earlier.toPlainDateTime().equals(requestedPlainDateTime)) {
    // Ambiguous: the requested wall-clock time occurs twice around a fall-back transition.
    const prefer: Disambiguation = req.prefer ?? 'earlier';
    const epochMs = prefer === 'later' ? laterMs : earlierMs;

    const transition = earlier.getTimeZoneTransition('next');
    if (!transition) throw new RangeError(`No time-zone transition found for ambiguous wall clock in ${req.timeZone}`);
    const earlierOffsetMin = getOffsetMinutes(earlierMs, req.timeZone);
    const laterOffsetMin = getOffsetMinutes(laterMs, req.timeZone);
    const foldFrom = wallTimeAtOffset(transition.epochMilliseconds, earlierOffsetMin);
    const foldTo = wallTimeAtOffset(transition.epochMilliseconds, laterOffsetMin);

    const explanation =
      `${timeDisplay} happens twice in ${city} on ${dateDisplay} because clocks fall back from ` +
      `${displayTime(foldFrom.hour, foldFrom.minute)} to ${displayTime(foldTo.hour, foldTo.minute)}. ` +
      `Choose the earlier (${earlierOffset}) or later (${laterOffset}) occurrence.`;

    return { kind: 'ambiguous', epochMs, chosen: prefer, earlierMs, laterMs, earlierOffset, laterOffset, explanation };
  }

  // Nonexistent: the requested wall-clock time falls inside a spring-forward gap.
  const transition = later.getTimeZoneTransition('previous');
  if (!transition) throw new RangeError(`No time-zone transition found for nonexistent wall clock in ${req.timeZone}`);
  const gapMinutes = (laterMs - earlierMs) / 60_000;
  const movedTo = {
    date: toIsoDate(transition.year, transition.month, transition.day),
    time: toIsoTime(transition.hour, transition.minute),
  };
  const earlierOffsetMin = getOffsetMinutes(earlierMs, req.timeZone);
  const skipFrom = wallTimeAtOffset(transition.epochMilliseconds, earlierOffsetMin);
  const movedDisplay = displayTime(transition.hour, transition.minute);

  const explanation =
    `${timeDisplay} doesn't exist in ${city} on ${dateDisplay} — clocks skip from ` +
    `${displayTime(skipFrom.hour, skipFrom.minute)} to ${movedDisplay}. Hourfolk uses ${movedDisplay}, the next valid local time.`;

  return { kind: 'nonexistent', epochMs: transition.epochMilliseconds, movedTo, gapMinutes, explanation };
}

export function instantFor(req: WallClockRequest): number {
  return resolveWallClock(req).epochMs;
}
