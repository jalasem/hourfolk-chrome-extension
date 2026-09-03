import { describe, expect, it } from 'vitest';
import { dayRelation, formatDayDelta, offsetDifference } from './relations';

const CROSS_MIDNIGHT_MS = Date.UTC(2026, 8, 8, 14, 30);

describe('dayRelation', () => {
  it('is "Tomorrow" (+1) when Auckland is a day ahead of New York', () => {
    const result = dayRelation(CROSS_MIDNIGHT_MS, 'Pacific/Auckland', 'America/New_York');
    expect(result.dayDelta).toBe(1);
    expect(result.label).toBe('Tomorrow');
  });

  it('is "Yesterday" (-1) when Tokyo is a day behind Auckland', () => {
    const result = dayRelation(CROSS_MIDNIGHT_MS, 'Asia/Tokyo', 'Pacific/Auckland');
    expect(result.dayDelta).toBe(-1);
    expect(result.label).toBe('Yesterday');
  });

  it('is "Today" (0) for the same zone', () => {
    const result = dayRelation(CROSS_MIDNIGHT_MS, 'America/New_York', 'America/New_York');
    expect(result.dayDelta).toBe(0);
    expect(result.label).toBe('Today');
  });

  it('formats +N / −N days for a multi-day reference', () => {
    const nowMs = CROSS_MIDNIGHT_MS;
    const threeDaysLaterMs = Date.UTC(2026, 8, 11, 14, 30);
    const ahead = dayRelation(threeDaysLaterMs, 'UTC', 'UTC', nowMs);
    expect(ahead.dayDelta).toBe(3);
    expect(ahead.label).toBe('+3 days');

    const behind = dayRelation(nowMs, 'UTC', 'UTC', threeDaysLaterMs);
    expect(behind.dayDelta).toBe(-3);
    expect(behind.label).toBe('−3 days');
  });
});

describe('formatDayDelta', () => {
  it('labels -1, 0, 1 specially', () => {
    expect(formatDayDelta(-1)).toBe('Yesterday');
    expect(formatDayDelta(0)).toBe('Today');
    expect(formatDayDelta(1)).toBe('Tomorrow');
  });

  it('uses +N/−N days for other deltas', () => {
    expect(formatDayDelta(2)).toBe('+2 days');
    expect(formatDayDelta(-2)).toBe('−2 days');
  });
});

describe('offsetDifference', () => {
  it('is 13 hours ahead for Tokyo vs New York in September', () => {
    const epochMs = Date.UTC(2026, 8, 8, 12, 0);
    const result = offsetDifference(epochMs, 'Asia/Tokyo', 'America/New_York');
    expect(result.minutes).toBe(780);
    expect(result.label).toBe('13 hours ahead');
  });

  it('is 13 hours behind for New York vs Tokyo', () => {
    const epochMs = Date.UTC(2026, 8, 8, 12, 0);
    const result = offsetDifference(epochMs, 'America/New_York', 'Asia/Tokyo');
    expect(result.minutes).toBe(-780);
    expect(result.label).toBe('13 hours behind');
  });

  it('is 4½ hours ahead for Kolkata vs London in September (BST)', () => {
    const epochMs = Date.UTC(2026, 8, 8, 12, 0);
    const result = offsetDifference(epochMs, 'Asia/Kolkata', 'Europe/London');
    expect(result.minutes).toBe(270);
    expect(result.label).toBe('4½ hours ahead');
  });

  it('is 1¾ hours ahead for Kathmandu vs Dubai', () => {
    const epochMs = Date.UTC(2026, 8, 8, 12, 0);
    const result = offsetDifference(epochMs, 'Asia/Kathmandu', 'Asia/Dubai');
    expect(result.minutes).toBe(105);
    expect(result.label).toBe('1¾ hours ahead');
  });

  it('is 45 minutes ahead for Chatham vs Auckland', () => {
    const epochMs = Date.UTC(2026, 8, 8, 12, 0);
    const result = offsetDifference(epochMs, 'Pacific/Chatham', 'Pacific/Auckland');
    expect(result.minutes).toBe(45);
    expect(result.label).toBe('45 minutes ahead');
  });

  it('is "Same time" for the same zone', () => {
    const epochMs = Date.UTC(2026, 8, 8, 12, 0);
    const result = offsetDifference(epochMs, 'America/New_York', 'America/New_York');
    expect(result.minutes).toBe(0);
    expect(result.label).toBe('Same time');
  });

  it('is "1 hour ahead" for exactly 60 minutes', () => {
    // America/St_Johns (-2:30 DST) vs America/Halifax (-3:00 DST) in July = 30 min, not 60;
    // use a synthetic pair known to be exactly one whole hour apart: New York vs Chicago in September.
    const epochMs = Date.UTC(2026, 8, 8, 12, 0);
    const result = offsetDifference(epochMs, 'America/New_York', 'America/Chicago');
    expect(result.minutes).toBe(60);
    expect(result.label).toBe('1 hour ahead');
  });
});
