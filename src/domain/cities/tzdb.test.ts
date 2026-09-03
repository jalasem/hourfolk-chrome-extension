import { describe, expect, it } from 'vitest';

import { getZoneInfo, getZoneNames, primaryCityForZone, standardAbbreviationFor } from './tzdb';

describe('tzdb (eager, available before the dataset loads)', () => {
  it('resolves the primary city for a canonical zone', () => {
    expect(primaryCityForZone('Asia/Muscat')?.name).toBe('Muscat');
  });

  it('resolves a group member by deriving a name from the zone path', () => {
    expect(primaryCityForZone('America/New_York')?.name).toContain('New York');
    expect(primaryCityForZone('America/Detroit')?.name).toBe('Detroit');
  });

  it('returns undefined for an invalid zone', () => {
    expect(primaryCityForZone('Not/AZone')).toBeUndefined();
  });

  it('exposes ZoneInfo for canonical zones', () => {
    expect(getZoneInfo('Asia/Kolkata')?.alternativeName).toBe('India Time');
  });

  it('corrects the country for a group member whose real country differs', () => {
    expect(getZoneInfo('Indian/Mahe')?.countryName).toBe('Seychelles');
  });

  it('synthesizes a UTC zone entry', () => {
    expect(getZoneInfo('UTC')).toBeDefined();
    expect(getZoneNames()).toContain('UTC');
  });

  it('returns the standard-time abbreviation only when the offset matches raw (non-DST) offset', () => {
    expect(standardAbbreviationFor('Asia/Kolkata', 330)).toBe('IST');
    expect(standardAbbreviationFor('Europe/London', 60)).toBeUndefined();
  });
});
