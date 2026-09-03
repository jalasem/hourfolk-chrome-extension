import { beforeAll, describe, expect, it } from 'vitest';

import { loadCityEntries } from './dataset';
import { isValidTimeZone } from '@/domain/time/zone-clock';
import type { CityEntry } from './types';

describe('dataset invariants', () => {
  let entries: CityEntry[];

  beforeAll(async () => {
    entries = await loadCityEntries();
  });

  it('loads a substantial number of city and zone entries', () => {
    const cities = entries.filter((e) => e.kind === 'city');
    const zones = entries.filter((e) => e.kind === 'zone');
    expect(cities.length).toBeGreaterThan(5000);
    expect(zones.length).toBeGreaterThan(300);
  });

  it('every entry has a valid IANA time zone', () => {
    for (const entry of entries) {
      expect(isValidTimeZone(entry.timeZone), `${entry.id} has invalid timeZone ${entry.timeZone}`).toBe(true);
    }
  });

  it('ids are unique', () => {
    const ids = new Set<string>();
    for (const entry of entries) {
      expect(ids.has(entry.id), `duplicate id ${entry.id}`).toBe(false);
      ids.add(entry.id);
    }
  });

  it('never carries an empty-string region', () => {
    for (const entry of entries) {
      if (entry.region !== undefined) {
        expect(entry.region.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('city ids start with "city:" and zone ids with "zone:"', () => {
    for (const entry of entries) {
      expect(entry.id.startsWith(`${entry.kind}:`)).toBe(true);
    }
  });
});
