import { describe, expect, it } from 'vitest';
import { instantFor, resolveWallClock } from './resolve';

describe('resolveWallClock — nonexistent (spring-forward gap)', () => {
  it('moves a New York 02:30 request on 2026-03-08 to 03:00 EDT', () => {
    const result = resolveWallClock({ timeZone: 'America/New_York', date: '2026-03-08', time: '02:30' });
    expect(result.kind).toBe('nonexistent');
    if (result.kind !== 'nonexistent') throw new Error('expected nonexistent');
    expect(result.epochMs).toBe(Date.UTC(2026, 2, 8, 7, 0));
    expect(result.movedTo).toEqual({ date: '2026-03-08', time: '03:00' });
    expect(result.gapMinutes).toBe(60);
    expect(result.explanation).toContain('3:00 AM');
    expect(result.explanation).toContain('New York');
  });

  it('moves a London 01:30 request on 2026-03-29 to 02:00 BST', () => {
    const result = resolveWallClock({ timeZone: 'Europe/London', date: '2026-03-29', time: '01:30' });
    expect(result.kind).toBe('nonexistent');
    if (result.kind !== 'nonexistent') throw new Error('expected nonexistent');
    expect(result.epochMs).toBe(Date.UTC(2026, 2, 29, 1, 0));
    expect(result.movedTo).toEqual({ date: '2026-03-29', time: '02:00' });
    expect(result.gapMinutes).toBe(60);
  });
});

describe('resolveWallClock — ambiguous (fall-back)', () => {
  it('offers earlier/later occurrences for New York 01:30 on 2026-11-01', () => {
    const result = resolveWallClock({ timeZone: 'America/New_York', date: '2026-11-01', time: '01:30' });
    expect(result.kind).toBe('ambiguous');
    if (result.kind !== 'ambiguous') throw new Error('expected ambiguous');
    expect(result.earlierMs).toBe(Date.UTC(2026, 10, 1, 5, 30));
    expect(result.laterMs).toBe(Date.UTC(2026, 10, 1, 6, 30));
    expect(result.earlierOffset).toBe('UTC−4');
    expect(result.laterOffset).toBe('UTC−5');
    expect(result.chosen).toBe('earlier');
    expect(result.epochMs).toBe(result.earlierMs);
    expect(result.explanation).toContain('New York');
    expect(result.explanation).toContain('UTC−4');
    expect(result.explanation).toContain('UTC−5');
  });

  it('honors prefer: later', () => {
    const result = resolveWallClock({ timeZone: 'America/New_York', date: '2026-11-01', time: '01:30', prefer: 'later' });
    expect(result.kind).toBe('ambiguous');
    if (result.kind !== 'ambiguous') throw new Error('expected ambiguous');
    expect(result.chosen).toBe('later');
    expect(result.epochMs).toBe(result.laterMs);
  });

  it('handles Europe/Berlin 2026-10-25 02:30', () => {
    const result = resolveWallClock({ timeZone: 'Europe/Berlin', date: '2026-10-25', time: '02:30' });
    expect(result.kind).toBe('ambiguous');
    if (result.kind !== 'ambiguous') throw new Error('expected ambiguous');
    expect(result.earlierMs).toBeLessThan(result.laterMs);
    expect(result.chosen).toBe('earlier');
  });
});

describe('resolveWallClock — unique resolution', () => {
  it('resolves Asia/Tokyo 2026-09-08 09:00', () => {
    const result = resolveWallClock({ timeZone: 'Asia/Tokyo', date: '2026-09-08', time: '09:00' });
    expect(result).toEqual({ kind: 'unique', epochMs: Date.UTC(2026, 8, 8, 0, 0) });
  });

  it('resolves Asia/Kolkata 2026-09-08 09:00 (UTC+5:30)', () => {
    const result = resolveWallClock({ timeZone: 'Asia/Kolkata', date: '2026-09-08', time: '09:00' });
    expect(result).toEqual({ kind: 'unique', epochMs: Date.UTC(2026, 8, 8, 3, 30) });
  });

  it('resolves Asia/Kathmandu 2026-09-08 09:00 (UTC+5:45)', () => {
    const result = resolveWallClock({ timeZone: 'Asia/Kathmandu', date: '2026-09-08', time: '09:00' });
    expect(result).toEqual({ kind: 'unique', epochMs: Date.UTC(2026, 8, 8, 3, 15) });
  });

  it('resolves Pacific/Chatham 2026-07-01 09:00 (UTC+12:45)', () => {
    const result = resolveWallClock({ timeZone: 'Pacific/Chatham', date: '2026-07-01', time: '09:00' });
    expect(result).toEqual({ kind: 'unique', epochMs: Date.UTC(2026, 5, 30, 20, 15) });
  });

  it('resolves America/St_Johns 2026-07-01 09:00 (UTC-2:30 DST)', () => {
    const result = resolveWallClock({ timeZone: 'America/St_Johns', date: '2026-07-01', time: '09:00' });
    expect(result).toEqual({ kind: 'unique', epochMs: Date.UTC(2026, 6, 1, 11, 30) });
  });

  it('resolves UTC and Etc/UTC identically', () => {
    const utc = resolveWallClock({ timeZone: 'UTC', date: '2026-09-08', time: '09:00' });
    const etcUtc = resolveWallClock({ timeZone: 'Etc/UTC', date: '2026-09-08', time: '09:00' });
    expect(utc).toEqual({ kind: 'unique', epochMs: Date.UTC(2026, 8, 8, 9, 0) });
    expect(etcUtc).toEqual({ kind: 'unique', epochMs: Date.UTC(2026, 8, 8, 9, 0) });
  });
});

describe('resolveWallClock — invalid input', () => {
  it('throws RangeError for an invalid zone', () => {
    expect(() => resolveWallClock({ timeZone: 'Not/AZone', date: '2026-09-08', time: '09:00' })).toThrow(RangeError);
  });

  it('throws RangeError for an invalid date', () => {
    expect(() => resolveWallClock({ timeZone: 'UTC', date: '2026-02-30', time: '09:00' })).toThrow(RangeError);
  });

  it('throws RangeError for an invalid time', () => {
    expect(() => resolveWallClock({ timeZone: 'UTC', date: '2026-09-08', time: '24:00' })).toThrow(RangeError);
  });
});

describe('instantFor', () => {
  it('returns just the epochMs', () => {
    expect(instantFor({ timeZone: 'Asia/Tokyo', date: '2026-09-08', time: '09:00' })).toBe(Date.UTC(2026, 8, 8, 0, 0));
  });
});
