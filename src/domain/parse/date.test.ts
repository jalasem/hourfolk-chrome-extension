import { describe, expect, it } from 'vitest';
import { extractDate } from './date';
import { LOCAL_ZONE, NOW_MS } from './test-support';

const opts = { referenceZone: LOCAL_ZONE, nowMs: NOW_MS };

describe('extractDate', () => {
  it('recognises "today"', () => {
    const result = extractDate(['today'], opts);
    expect(result.date).toEqual({ iso: '2026-09-03', raw: 'today', kind: 'relative' });
    expect(result.tokens).toEqual([]);
  });

  it('recognises "tomorrow"', () => {
    const result = extractDate(['tomorrow'], opts);
    expect(result.date).toEqual({ iso: '2026-09-04', raw: 'tomorrow', kind: 'relative' });
  });

  it('recognises "tonight" as today', () => {
    const result = extractDate(['tonight'], opts);
    expect(result.date?.iso).toBe('2026-09-03');
    expect(result.date?.kind).toBe('relative');
  });

  it('recognises "day after tomorrow"', () => {
    const result = extractDate(['day', 'after', 'tomorrow'], opts);
    expect(result.date).toEqual({ iso: '2026-09-05', raw: 'day after tomorrow', kind: 'relative' });
    expect(result.tokens).toEqual([]);
  });

  it('does not recognise "yesterday"', () => {
    const result = extractDate(['yesterday'], opts);
    expect(result.date).toBeUndefined();
    expect(result.tokens).toEqual(['yesterday']);
  });

  it('resolves a bare weekday equal to today as today', () => {
    const result = extractDate(['thursday'], opts);
    expect(result.date).toEqual({ iso: '2026-09-03', raw: 'thursday', kind: 'weekday' });
  });

  it('resolves a bare weekday ahead of today to the coming occurrence', () => {
    const result = extractDate(['monday'], opts);
    expect(result.date).toEqual({ iso: '2026-09-07', raw: 'monday', kind: 'weekday' });
  });

  it('resolves "next <weekday>" equal to today to next week', () => {
    const result = extractDate(['next', 'thursday'], opts);
    expect(result.date).toEqual({ iso: '2026-09-10', raw: 'next thursday', kind: 'weekday' });
    expect(result.tokens).toEqual([]);
  });

  it('accepts short weekday spellings (mon, tues, thurs, sat)', () => {
    expect(extractDate(['thurs'], opts).date?.iso).toBe('2026-09-03');
    expect(extractDate(['mon'], opts).date?.iso).toBe('2026-09-07');
    expect(extractDate(['tues'], opts).date?.iso).toBe('2026-09-08');
    expect(extractDate(['sat'], opts).date?.iso).toBe('2026-09-05');
  });

  it('recognises an ISO date', () => {
    const result = extractDate(['2026-09-08'], opts);
    expect(result.date).toEqual({ iso: '2026-09-08', raw: '2026-09-08', kind: 'explicit' });
  });

  it.each([
    [['Sep', '8'], '2026-09-08'],
    [['September', '8th'], '2026-09-08'],
    [['8', 'Sep'], '2026-09-08'],
    [['8', 'September'], '2026-09-08'],
    [['Sept', '8th'], '2026-09-08'],
  ])('recognises month-day form %j', (tokens, iso) => {
    const result = extractDate(tokens, opts);
    expect(result.date?.iso).toBe(iso);
    expect(result.date?.kind).toBe('explicit');
    expect(result.tokens).toEqual([]);
  });

  it('honours an explicit year', () => {
    const result = extractDate(['Sep', '8', '2026'], opts);
    expect(result.date).toEqual({ iso: '2026-09-08', raw: 'Sep 8 2026', kind: 'explicit' });
    expect(result.tokens).toEqual([]);
  });

  it('infers next year for a month-day already passed this year', () => {
    const result = extractDate(['Jan', '5'], opts);
    expect(result.date?.iso).toBe('2027-01-05');
  });

  it('infers this year for a month-day today-or-later', () => {
    const result = extractDate(['Sep', '3'], opts);
    expect(result.date?.iso).toBe('2026-09-03');
  });

  it('does not support ambiguous numeric month/day forms', () => {
    const result = extractDate(['9/8'], opts);
    expect(result.date).toBeUndefined();
  });

  it('drops a preceding "on"', () => {
    const result = extractDate(['on', 'monday'], opts);
    expect(result.date?.iso).toBe('2026-09-07');
    expect(result.tokens).toEqual([]);
  });

  it('finds a date among surrounding words and leaves the rest', () => {
    const result = extractDate(['Sep', '8', 'in', 'Toronto'], opts);
    expect(result.date?.iso).toBe('2026-09-08');
    expect(result.tokens).toEqual(['in', 'Toronto']);
  });

  it('re-derives against a different reference zone', () => {
    // Sep 3 12:00 UTC is Sep 3 16:00 in Muscat (UTC+4) but already Sep 4 02:00 in
    // Kiritimati (UTC+14), so "today" — and therefore "tomorrow" — differs by zone.
    const farAheadOpts = { referenceZone: 'Pacific/Kiritimati', nowMs: NOW_MS };
    expect(extractDate(['tomorrow'], opts).date?.iso).toBe('2026-09-04');
    expect(extractDate(['tomorrow'], farAheadOpts).date?.iso).toBe('2026-09-05');
  });

  it('returns no date and the original tokens when none is present', () => {
    const result = extractDate(['New', 'York'], opts);
    expect(result.date).toBeUndefined();
    expect(result.tokens).toEqual(['New', 'York']);
  });
});
