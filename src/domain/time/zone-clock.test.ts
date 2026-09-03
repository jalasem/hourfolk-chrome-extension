import { describe, expect, it } from 'vitest';
import { getDeviceTimeZone, getOffsetMinutes, getWallClockParts, isValidTimeZone, isoDateAt, isoTimeAt, todayInZone } from './zone-clock';

describe('isValidTimeZone', () => {
  it('accepts real IANA zones', () => {
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
  });

  it('rejects garbage and empty input', () => {
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });
});

describe('getOffsetMinutes', () => {
  it('returns 345 for Asia/Kathmandu (UTC+5:45)', () => {
    const epochMs = Date.UTC(2026, 8, 8, 3, 15);
    expect(getOffsetMinutes(epochMs, 'Asia/Kathmandu')).toBe(345);
  });

  it('returns a negative offset for America/New_York in September (EDT, UTC-4)', () => {
    const epochMs = Date.UTC(2026, 8, 8, 14, 0);
    expect(getOffsetMinutes(epochMs, 'America/New_York')).toBe(-240);
  });

  it('returns 0 for UTC', () => {
    expect(getOffsetMinutes(Date.UTC(2026, 8, 8), 'UTC')).toBe(0);
  });
});

describe('getWallClockParts', () => {
  it('reports hour 0, not 24, at local midnight', () => {
    // 2026-09-08T04:00:00Z is exactly local midnight in Asia/Tokyo (UTC+9).
    const epochMs = Date.UTC(2026, 8, 7, 15, 0);
    const parts = getWallClockParts(epochMs, 'Asia/Tokyo');
    expect(parts.hour).toBe(0);
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(9);
    expect(parts.day).toBe(8);
  });

  it('reports the correct ISO weekday', () => {
    const epochMs = Date.UTC(2026, 8, 8, 12, 0);
    const parts = getWallClockParts(epochMs, 'UTC');
    expect(parts.weekday).toBe(2); // Tuesday
  });
});

describe('isoDateAt / isoTimeAt', () => {
  it('cross midnight correctly in Pacific/Auckland', () => {
    const epochMs = Date.UTC(2026, 8, 8, 14, 30);
    expect(isoDateAt(epochMs, 'Pacific/Auckland')).toBe('2026-09-09');
    expect(isoTimeAt(epochMs, 'Pacific/Auckland')).toBe('02:30');
  });
});

describe('todayInZone', () => {
  it('crosses midnight relative to a reference instant', () => {
    // 23:30 UTC on 2026-09-08 is already 2026-09-09 08:30 in Asia/Tokyo.
    const nowMs = Date.UTC(2026, 8, 8, 23, 30);
    expect(todayInZone('Asia/Tokyo', nowMs)).toBe('2026-09-09');
    expect(todayInZone('America/Los_Angeles', nowMs)).toBe('2026-09-08');
  });
});

describe('getDeviceTimeZone', () => {
  it('returns a valid IANA zone', () => {
    expect(isValidTimeZone(getDeviceTimeZone())).toBe(true);
  });
});
