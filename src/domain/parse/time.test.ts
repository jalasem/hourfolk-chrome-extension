import { describe, expect, it } from 'vitest';
import { extractTime } from './time';

describe('extractTime', () => {
  it.each([
    ['2pm', '14:00'],
    ['2p', '14:00'],
    ['9a', '09:00'],
    ['2:30pm', '14:30'],
    ['2.30pm', '14:30'],
    ['14:00', '14:00'],
    ['14h', '14:00'],
    ['14h30', '14:30'],
    ['2:30', '02:30'],
    ['noon', '12:00'],
    ['midnight', '00:00'],
    ['12pm', '12:00'],
    ['12am', '00:00'],
  ])('recognises %s as %s', (token, iso) => {
    const result = extractTime([token]);
    expect(result.time?.iso).toBe(iso);
    expect(result.tokens).toEqual([]);
  });

  it('recognises a two-token "2 pm" form', () => {
    const result = extractTime(['2', 'pm']);
    expect(result.time?.iso).toBe('14:00');
    expect(result.tokens).toEqual([]);
  });

  it('recognises a two-token "4:30 pm" form', () => {
    const result = extractTime(['4:30', 'pm']);
    expect(result.time?.iso).toBe('16:30');
    expect(result.tokens).toEqual([]);
  });

  it('does not treat a bare hour as a time', () => {
    const result = extractTime(['9', 'Tokyo']);
    expect(result.time).toBeUndefined();
    expect(result.tokens).toEqual(['9', 'Tokyo']);
  });

  it('treats "at 9" as 24-hour 09:00 and removes "at"', () => {
    const result = extractTime(['at', '9', 'Tokyo']);
    expect(result.time?.iso).toBe('09:00');
    expect(result.tokens).toEqual(['Tokyo']);
  });

  it('treats "at 9pm" as 21:00 and removes "at"', () => {
    const result = extractTime(['at', '9pm']);
    expect(result.time?.iso).toBe('21:00');
    expect(result.tokens).toEqual([]);
  });

  it('strips a preceding "at" alongside a fully-qualified time', () => {
    const result = extractTime(['Sep', '8', 'at', '4:30pm', 'in', 'Toronto']);
    expect(result.time?.iso).toBe('16:30');
    expect(result.tokens).toEqual(['Sep', '8', 'in', 'Toronto']);
  });

  it('finds a time anywhere among surrounding words', () => {
    const result = extractTime(['New', 'York', '2pm']);
    expect(result.time?.iso).toBe('14:00');
    expect(result.tokens).toEqual(['New', 'York']);
  });

  it.each([['25:00'], ['12:75'], ['13pm'], ['0am'], ['24h']])('rejects invalid time %s', (token) => {
    const result = extractTime([token]);
    expect(result.time).toBeUndefined();
    expect(result.tokens).toEqual([token]);
  });

  it('returns no time and the original tokens when none is present', () => {
    const result = extractTime(['New', 'York']);
    expect(result.time).toBeUndefined();
    expect(result.tokens).toEqual(['New', 'York']);
  });

  it('returns an empty tokens array for empty input', () => {
    const result = extractTime([]);
    expect(result.time).toBeUndefined();
    expect(result.tokens).toEqual([]);
  });
});
