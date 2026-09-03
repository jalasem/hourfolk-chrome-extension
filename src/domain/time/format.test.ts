import { describe, expect, it } from 'vitest';
import { describeInstant, formatUtcOffset } from './format';

const SEPT_8_2026_1405_UTC = Date.UTC(2026, 8, 8, 14, 5, 9);

describe('formatUtcOffset', () => {
  it('formats zero as UTC', () => {
    expect(formatUtcOffset(0)).toBe('UTC');
  });

  it('formats a whole-hour negative offset with the Unicode minus by default', () => {
    expect(formatUtcOffset(-240)).toBe('UTC−4');
  });

  it('formats a fractional offset', () => {
    expect(formatUtcOffset(330)).toBe('UTC+5:30');
  });

  it('formats with ascii hyphen when requested', () => {
    expect(formatUtcOffset(-210, { ascii: true })).toBe('UTC-3:30');
  });
});

describe('describeInstant', () => {
  it('formats 12-hour time, clock and period', () => {
    const d = describeInstant(SEPT_8_2026_1405_UTC, 'UTC', { hourCycle: '12h' });
    expect(d.time).toBe('2:05 PM');
    expect(d.clock).toBe('2:05');
    expect(d.period).toBe('PM');
    expect(d.timeWithSeconds).toBe('2:05:09 PM');
  });

  it('formats 24-hour time with no period', () => {
    const d = describeInstant(SEPT_8_2026_1405_UTC, 'UTC', { hourCycle: '24h' });
    expect(d.time).toBe('14:05');
    expect(d.period).toBe('');
  });

  it('formats weekday, date and dateLong', () => {
    const d = describeInstant(SEPT_8_2026_1405_UTC, 'UTC', { hourCycle: '24h' });
    expect(d.weekday).toBe('Tuesday');
    expect(d.weekdayShort).toBe('Tue');
    expect(d.date).toBe('Sep 8, 2026');
    expect(d.dateLong).toBe('Tuesday, September 8, 2026');
  });

  it('reports a positive utcOffset for Tokyo', () => {
    const d = describeInstant(Date.UTC(2026, 8, 8, 0, 0), 'Asia/Tokyo', { hourCycle: '24h' });
    expect(d.utcOffset).toBe('UTC+9');
  });

  it('reports a negative utcOffset for New York in September', () => {
    const d = describeInstant(SEPT_8_2026_1405_UTC, 'America/New_York', { hourCycle: '24h' });
    expect(d.utcOffset).toBe('UTC−4');
    expect(d.abbreviation).toBe('EDT');
  });

  it('reports a fractional positive utcOffset for Kolkata', () => {
    const d = describeInstant(Date.UTC(2026, 8, 8, 3, 30), 'Asia/Kolkata', { hourCycle: '24h' });
    expect(d.utcOffset).toBe('UTC+5:30');
  });

  it('reports UTC+5:45 for Kathmandu', () => {
    const d = describeInstant(Date.UTC(2026, 8, 8, 3, 15), 'Asia/Kathmandu', { hourCycle: '24h' });
    expect(d.utcOffset).toBe('UTC+5:45');
  });

  it('reports UTC-3:30 for St_Johns in January (standard time)', () => {
    const d = describeInstant(Date.UTC(2026, 0, 1, 12, 30), 'America/St_Johns', { hourCycle: '24h' });
    expect(d.utcOffset).toBe('UTC−3:30');
  });

  it('reports UTC for Etc/UTC', () => {
    const d = describeInstant(SEPT_8_2026_1405_UTC, 'Etc/UTC', { hourCycle: '24h' });
    expect(d.utcOffset).toBe('UTC');
  });

  it('resolves BST for London in summer', () => {
    const d = describeInstant(Date.UTC(2026, 6, 1, 12, 0), 'Europe/London', { hourCycle: '24h' });
    expect(d.abbreviation).toBe('BST');
  });

  it('resolves IST for Kolkata', () => {
    const d = describeInstant(Date.UTC(2026, 8, 8, 3, 30), 'Asia/Kolkata', {
      hourCycle: '24h',
      abbreviationFallback: (zone) => (zone === 'Asia/Kolkata' ? 'IST' : undefined),
    });
    expect(d.abbreviation).toBe('IST');
  });

  it('falls back to a GMT-style abbreviation for Tokyo without a fallback function', () => {
    const d = describeInstant(Date.UTC(2026, 8, 8, 0, 0), 'Asia/Tokyo', { hourCycle: '24h', abbreviationFallback: () => undefined });
    expect(d.abbreviation).toBe('GMT+9');
  });

  it('uses the abbreviationFallback for a zone with no alphabetic name', () => {
    const d = describeInstant(Date.UTC(2026, 8, 8, 0, 0), 'Asia/Tokyo', {
      hourCycle: '24h',
      abbreviationFallback: (zone) => (zone === 'Asia/Tokyo' ? 'JST' : undefined),
    });
    expect(d.abbreviation).toBe('JST');
  });
});
