import { formatIsoTime } from '@/domain/time/format';
import { extractDate } from './date';
import { extractTime } from './time';
import type { ParseContext, ParsedCity, ParsedTime, ParseResult } from './types';

const CONNECTORS = new Set(['in', 'at', 'on', 'for', 'time', 'local']);

function tokenize(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\s+/)
    .map((token) => token.replace(/,+$/, ''))
    .filter((token) => token.length > 0);
}

type FindCity = ParseContext['findCity'];
type CityEntry = NonNullable<ReturnType<FindCity>>;

interface CityRunMatch {
  entry: CityEntry;
  raw: string;
  start: number;
  end: number; // exclusive
}

/**
 * Tries `findCity` against contiguous runs of `tokens`, longest first: the whole text,
 * then shorter runs trimmed from the right and then the left at each length. This lets a
 * city phrase be recognised even when it's flanked by leftover words on either side.
 */
function findCityRun(tokens: string[], findCity: FindCity): CityRunMatch | undefined {
  const n = tokens.length;
  for (let len = n; len >= 1; len--) {
    for (let start = 0; start + len <= n; start++) {
      const raw = tokens.slice(start, start + len).join(' ');
      const entry = findCity(raw);
      if (entry) return { entry, raw, start, end: start + len };
    }
  }
  return undefined;
}

function noDateExplanation(time: ParsedTime | undefined, city: ParsedCity | undefined): string {
  if (time && city) {
    return `No date given — Hourfolk will use the next time it's ${formatIsoTime(time.iso, '12h')} in ${city.entry.name}.`;
  }
  if (time) {
    return `No date given — Hourfolk will use the next time it's ${formatIsoTime(time.iso, '12h')} locally.`;
  }
  if (city) {
    return `No date given — Hourfolk will use the next upcoming time in ${city.entry.name}.`;
  }
  return 'No date given — Hourfolk will use the next occurrence.';
}

/**
 * Parses a free-text plan query into a time, date and city, deterministically and without
 * any AI/fuzzy matching. Each step of the pipeline records a plain-English explanation line.
 */
export function parsePlanQuery(input: string, ctx: ParseContext): ParseResult {
  const tokens = tokenize(input);
  if (tokens.length === 0) {
    return { leftovers: [], explanation: [] };
  }

  const explanation: string[] = [];

  const timeExtraction = extractTime(tokens);
  const time = timeExtraction.time;
  if (time) {
    explanation.push(`Read "${time.raw}" as ${formatIsoTime(time.iso, '12h')}.`);
  } else {
    explanation.push('No time was found in the query.');
  }

  const postTimeTokens = timeExtraction.tokens;
  const provisionalDate = extractDate(postTimeTokens, { referenceZone: ctx.localZone, nowMs: ctx.nowMs });

  const remainingTokens = provisionalDate.tokens;
  const candidateEntries = remainingTokens.map((token, idx) => ({ token, idx })).filter((entry) => !CONNECTORS.has(entry.token.toLowerCase()));
  const candidateTokens = candidateEntries.map((entry) => entry.token);

  const cityMatch = findCityRun(candidateTokens, ctx.findCity);

  let city: ParsedCity | undefined;
  let leftovers: string[];
  if (cityMatch) {
    city = { entry: cityMatch.entry, raw: cityMatch.raw };
    const consumedIdx = new Set(candidateEntries.slice(cityMatch.start, cityMatch.end).map((entry) => entry.idx));
    leftovers = remainingTokens.filter((token, idx) => !CONNECTORS.has(token.toLowerCase()) && !consumedIdx.has(idx));
    explanation.push(`Matched "${city.raw}" to ${city.entry.name}.`);
  } else {
    leftovers = candidateTokens;
    if (candidateTokens.length > 0) {
      explanation.push(`Could not match "${candidateTokens.join(' ')}" to a known city.`);
    }
  }

  // Relative/weekday/no-year dates are about the source city's calendar, so re-derive
  // against its zone now that the city is known (an explicit year or ISO date is unaffected).
  let date = provisionalDate.date;
  if (date && city) {
    date = extractDate(postTimeTokens, { referenceZone: city.entry.timeZone, nowMs: ctx.nowMs }).date;
  }

  if (date) {
    explanation.push(`Read "${date.raw}" as ${date.iso}.`);
  }

  if (time && !city) {
    explanation.push('No city recognised — Hourfolk will use your local time zone.');
  }

  if (!date) {
    explanation.push(noDateExplanation(time, city));
  }

  return {
    ...(time ? { time } : {}),
    ...(date ? { date } : {}),
    ...(city ? { city } : {}),
    leftovers,
    explanation,
  };
}
