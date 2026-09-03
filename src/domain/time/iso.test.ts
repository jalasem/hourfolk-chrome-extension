import { describe, expect, it } from 'vitest';
import { addDays, compareIsoDates, compareIsoTimes, diffDays, isIsoDate, isIsoTime, isoWeekday } from './iso';

describe('isIsoDate', () => {
  it('accepts a valid leap day', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
  });

  it('rejects an invalid leap day on a non-leap year', () => {
    expect(isIsoDate('2027-02-29')).toBe(false);
  });

  it('rejects malformed dates', () => {
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-00-01')).toBe(false);
    expect(isIsoDate('not-a-date')).toBe(false);
  });
});

describe('isIsoTime', () => {
  it('accepts valid times', () => {
    expect(isIsoTime('00:00')).toBe(true);
    expect(isIsoTime('23:59')).toBe(true);
  });

  it('rejects invalid times', () => {
    expect(isIsoTime('24:00')).toBe(false);
    expect(isIsoTime('12:60')).toBe(false);
    expect(isIsoTime('nope')).toBe(false);
  });
});

describe('addDays', () => {
  it('crosses a month end', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('crosses a year end', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('crosses a leap-day month end backwards', () => {
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('handles multi-day jumps across a year boundary', () => {
    expect(addDays('2026-12-29', 5)).toBe('2027-01-03');
  });
});

describe('diffDays', () => {
  it('computes b - a in whole days', () => {
    expect(diffDays('2026-09-08', '2026-09-11')).toBe(3);
    expect(diffDays('2026-09-11', '2026-09-08')).toBe(-3);
    expect(diffDays('2026-09-08', '2026-09-08')).toBe(0);
  });
});

describe('compareIsoDates', () => {
  it('orders dates', () => {
    expect(compareIsoDates('2026-09-08', '2026-09-11')).toBeLessThan(0);
    expect(compareIsoDates('2026-09-11', '2026-09-08')).toBeGreaterThan(0);
    expect(compareIsoDates('2026-09-08', '2026-09-08')).toBe(0);
  });
});

describe('isoWeekday', () => {
  it('returns 2 (Tuesday) for 2026-09-08', () => {
    expect(isoWeekday('2026-09-08')).toBe(2);
  });

  it('returns 7 (Sunday) for 2026-11-01', () => {
    expect(isoWeekday('2026-11-01')).toBe(7);
  });
});

describe('compareIsoTimes', () => {
  it('orders times', () => {
    expect(compareIsoTimes('01:30', '02:30')).toBeLessThan(0);
    expect(compareIsoTimes('14:00', '09:00')).toBeGreaterThan(0);
    expect(compareIsoTimes('09:00', '09:00')).toBe(0);
  });
});
