import { describe, expect, it } from 'vitest';
import { parsePlanQuery } from './parser';
import { findCity, LOCAL_ZONE, NOW_MS } from './test-support';
import type { ParseContext } from './types';

const ctx: ParseContext = { nowMs: NOW_MS, localZone: LOCAL_ZONE, findCity };

describe('parsePlanQuery', () => {
  it('parses "2pm in New York"', () => {
    const result = parsePlanQuery('2pm in New York', ctx);
    expect(result.time?.iso).toBe('14:00');
    expect(result.city?.entry.name).toBe('New York');
    expect(result.date).toBeUndefined();
    expect(result.leftovers).toEqual([]);
    expect(result.explanation.some((line) => line.includes("next time it's 2:00 PM in New York"))).toBe(true);
  });

  it('parses "14:00 London"', () => {
    const result = parsePlanQuery('14:00 London', ctx);
    expect(result.time?.iso).toBe('14:00');
    expect(result.city?.entry.name).toBe('London');
  });

  it('parses "tomorrow at 9am Tokyo"', () => {
    const result = parsePlanQuery('tomorrow at 9am Tokyo', ctx);
    expect(result.time?.iso).toBe('09:00');
    expect(result.city?.entry.name).toBe('Tokyo');
    expect(result.date?.iso).toBe('2026-09-04');
    expect(result.date?.kind).toBe('relative');
  });

  it('parses "Sep 8 at 4:30pm in Toronto"', () => {
    const result = parsePlanQuery('Sep 8 at 4:30pm in Toronto', ctx);
    expect(result.time?.iso).toBe('16:30');
    expect(result.city?.entry.name).toBe('Toronto');
    expect(result.date?.iso).toBe('2026-09-08');
    expect(result.date?.kind).toBe('explicit');
  });

  it('parses "September 8th 2026 4:30 pm Toronto"', () => {
    const result = parsePlanQuery('September 8th 2026 4:30 pm Toronto', ctx);
    expect(result.time?.iso).toBe('16:30');
    expect(result.city?.entry.name).toBe('Toronto');
    expect(result.date?.iso).toBe('2026-09-08');
    expect(result.date?.kind).toBe('explicit');
  });

  it('parses "8 Sep 16:30 Toronto"', () => {
    const result = parsePlanQuery('8 Sep 16:30 Toronto', ctx);
    expect(result.time?.iso).toBe('16:30');
    expect(result.city?.entry.name).toBe('Toronto');
    expect(result.date?.iso).toBe('2026-09-08');
    expect(result.date?.kind).toBe('explicit');
  });

  it('parses "2026-09-08 09:00 Tokyo"', () => {
    const result = parsePlanQuery('2026-09-08 09:00 Tokyo', ctx);
    expect(result.time?.iso).toBe('09:00');
    expect(result.city?.entry.name).toBe('Tokyo');
    expect(result.date?.iso).toBe('2026-09-08');
    expect(result.date?.kind).toBe('explicit');
  });

  it('parses "Jan 5 9am Tokyo" as next year (already passed this year)', () => {
    const result = parsePlanQuery('Jan 5 9am Tokyo', ctx);
    expect(result.time?.iso).toBe('09:00');
    expect(result.city?.entry.name).toBe('Tokyo');
    expect(result.date?.iso).toBe('2027-01-05');
  });

  it('parses "monday 9am london" as the coming Monday', () => {
    const result = parsePlanQuery('monday 9am london', ctx);
    expect(result.date?.iso).toBe('2026-09-07');
    expect(result.date?.kind).toBe('weekday');
  });

  it('parses "thursday 9am london" as today (same weekday)', () => {
    const result = parsePlanQuery('thursday 9am london', ctx);
    expect(result.date?.iso).toBe('2026-09-03');
    expect(result.date?.kind).toBe('weekday');
  });

  it('parses "next thursday 9am london" as next week', () => {
    const result = parsePlanQuery('next thursday 9am london', ctx);
    expect(result.date?.iso).toBe('2026-09-10');
    expect(result.date?.kind).toBe('weekday');
  });

  it('parses "noon in Tokyo"', () => {
    const result = parsePlanQuery('noon in Tokyo', ctx);
    expect(result.time?.iso).toBe('12:00');
    expect(result.city?.entry.name).toBe('Tokyo');
  });

  it('parses "midnight London"', () => {
    const result = parsePlanQuery('midnight London', ctx);
    expect(result.time?.iso).toBe('00:00');
    expect(result.city?.entry.name).toBe('London');
  });

  it('parses "at 9 Tokyo"', () => {
    const result = parsePlanQuery('at 9 Tokyo', ctx);
    expect(result.time?.iso).toBe('09:00');
    expect(result.city?.entry.name).toBe('Tokyo');
  });

  it('does not parse "9 Tokyo" as having a time', () => {
    const result = parsePlanQuery('9 Tokyo', ctx);
    expect(result.time).toBeUndefined();
    expect(result.leftovers).toEqual(['9']);
    expect(result.city?.entry.name).toBe('Tokyo');
  });

  it('parses "2pm" with no city and mentions the local zone', () => {
    const result = parsePlanQuery('2pm', ctx);
    expect(result.time?.iso).toBe('14:00');
    expect(result.city).toBeUndefined();
    expect(result.explanation.some((line) => line.toLowerCase().includes('local'))).toBe(true);
  });

  it('parses "2pm in Atlantis" with no city and leaves it as a leftover', () => {
    const result = parsePlanQuery('2pm in Atlantis', ctx);
    expect(result.time?.iso).toBe('14:00');
    expect(result.city).toBeUndefined();
    expect(result.leftovers).toEqual(['Atlantis']);
  });

  it('parses "9am Portland Oregon"', () => {
    const result = parsePlanQuery('9am Portland Oregon', ctx);
    expect(result.time?.iso).toBe('09:00');
    expect(result.city?.entry.name).toBe('Portland');
    expect(result.city?.raw).toBe('Portland Oregon');
  });

  it('parses "New York 2pm"', () => {
    const result = parsePlanQuery('New York 2pm', ctx);
    expect(result.time?.iso).toBe('14:00');
    expect(result.city?.entry.name).toBe('New York');
    expect(result.leftovers).toEqual([]);
  });

  it('parses empty input as nothing', () => {
    const result = parsePlanQuery('', ctx);
    expect(result.time).toBeUndefined();
    expect(result.date).toBeUndefined();
    expect(result.city).toBeUndefined();
    expect(result.leftovers).toEqual([]);
  });

  it('rejects an invalid time and keeps it as a leftover', () => {
    const result = parsePlanQuery('25:00 London', ctx);
    expect(result.time).toBeUndefined();
    expect(result.leftovers).toContain('25:00');
  });

  it('produces a non-empty explanation for every non-empty input', () => {
    const inputs = [
      '2pm in New York',
      '14:00 London',
      'tomorrow at 9am Tokyo',
      'noon in Tokyo',
      '9 Tokyo',
      '2pm',
      '2pm in Atlantis',
      '25:00 London',
    ];
    for (const input of inputs) {
      const result = parsePlanQuery(input, ctx);
      expect(Array.isArray(result.explanation)).toBe(true);
      expect(result.explanation.length).toBeGreaterThan(0);
      for (const line of result.explanation) expect(typeof line).toBe('string');
    }
  });
});
