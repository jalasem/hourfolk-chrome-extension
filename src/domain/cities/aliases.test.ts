import { beforeAll, describe, expect, it } from 'vitest';

import { CITY_ALIASES, resolveAliasTarget, ZONE_ALIASES } from './aliases';
import { loadCityEntries } from './dataset';
import type { CityEntry } from './types';

describe('city aliases', () => {
  let entries: CityEntry[];

  beforeAll(async () => {
    entries = await loadCityEntries();
  });

  it('every alias target resolves to a dataset entry', () => {
    for (const [alias, target] of Object.entries(CITY_ALIASES)) {
      const resolved = resolveAliasTarget(entries, target);
      expect(resolved, `alias "${alias}" -> ${JSON.stringify(target)} did not resolve`).toBeDefined();
    }
  });

  it('frisco is not aliased', () => {
    expect(CITY_ALIASES['frisco']).toBeUndefined();
  });

  it('every zone alias points at the UTC zone', () => {
    for (const zone of Object.values(ZONE_ALIASES)) {
      expect(zone).toBe('UTC');
    }
    expect(ZONE_ALIASES['utc']).toBe('UTC');
    expect(ZONE_ALIASES['gmt']).toBe('UTC');
    expect(ZONE_ALIASES['zulu']).toBe('UTC');
    expect(ZONE_ALIASES['z']).toBe('UTC');
  });
});
