import { beforeAll, describe, expect, it } from 'vitest';

import { CITY_ALIASES, resolveAliasTarget } from './aliases';
import { createCityProvider } from './provider';
import { normalizeText } from './normalize';
import type { CityProvider, CityEntry } from './types';

describe('CityProvider (before ready)', () => {
  const provider = createCityProvider();

  it('search returns [] before ready', () => {
    expect(provider.search('london')).toEqual([]);
    expect(provider.isReady()).toBe(false);
  });

  it('zone helpers work before ready (backed by eager tzdb data)', () => {
    expect(provider.primaryCityForZone('Asia/Muscat')?.name).toBe('Muscat');
    expect(provider.primaryCityForZone('America/New_York')?.name).toContain('New York');
    expect(provider.primaryCityForZone('America/Detroit')?.name).toBe('Detroit');
    expect(provider.primaryCityForZone('Not/AZone')).toBeUndefined();
    expect(provider.zoneInfo('Asia/Kolkata')?.alternativeName).toBe('India Time');
    expect(provider.zoneInfo('Indian/Mahe')?.countryName).toBe('Seychelles');
    expect(provider.zoneInfo('UTC')).toBeDefined();
  });
});

describe('CityProvider (after ready)', () => {
  const provider: CityProvider = createCityProvider();

  beforeAll(async () => {
    await provider.ready();
  });

  it('isReady is true once ready() resolves', () => {
    expect(provider.isReady()).toBe(true);
  });

  it('"" and whitespace-only queries return []', () => {
    expect(provider.search('')).toEqual([]);
    expect(provider.search('   ')).toEqual([]);
  });

  it('respects the limit parameter', () => {
    const results = provider.search('san', 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('defaults to a limit of 8', () => {
    const results = provider.search('a');
    expect(results.length).toBeLessThanOrEqual(8);
  });

  it('"new york" -> New York, US first with region "New York"', () => {
    const [top] = provider.search('new york');
    expect(top).toBeDefined();
    expect(top!.entry.name).toBe('New York');
    expect(top!.entry.countryCode).toBe('US');
    expect(top!.entry.region).toBe('New York');
  });

  it('"nyc" -> New York', () => {
    const [top] = provider.search('nyc');
    expect(top?.entry.name).toBe('New York');
    expect(top?.entry.countryCode).toBe('US');
  });

  it('"london" -> UK first, and includes London, Ontario, Canada', () => {
    const results = provider.search('london', 10);
    expect(results[0]?.entry.name).toBe('London');
    expect(results[0]?.entry.countryCode).toBe('GB');
    const ontario = results.find((r) => r.entry.countryCode === 'CA' && r.entry.name === 'London');
    expect(ontario).toBeDefined();
    expect(ontario!.entry.region).toBe('Ontario');
  });

  it('"london ontario" -> Ontario first', () => {
    const [top] = provider.search('london ontario');
    expect(top?.entry.name).toBe('London');
    expect(top?.entry.countryCode).toBe('CA');
    expect(top?.entry.region).toBe('Ontario');
  });

  it('"portland oregon" -> Oregon', () => {
    const [top] = provider.search('portland oregon');
    expect(top?.entry.name).toBe('Portland');
    expect(top?.entry.region).toBe('Oregon');
  });

  it('"portland" -> Oregon first, Maine present', () => {
    const results = provider.search('portland', 10);
    expect(results[0]?.entry.name).toBe('Portland');
    expect(results[0]?.entry.region).toBe('Oregon');
    const maine = results.find((r) => r.entry.region === 'Maine');
    expect(maine).toBeDefined();
  });

  it('"oman" -> Muscat, matchedOn country', () => {
    const [top] = provider.search('oman');
    expect(top?.entry.name).toBe('Muscat');
    expect(top?.matchedOn).toBe('country');
  });

  it('"Asia/Muscat" and "asia/muscat" -> entry with timeZone Asia/Muscat first', () => {
    for (const q of ['Asia/Muscat', 'asia/muscat']) {
      const [top] = provider.search(q);
      expect(top?.entry.timeZone).toBe('Asia/Muscat');
    }
  });

  it('"america/new_york" -> timeZone America/New_York first', () => {
    const [top] = provider.search('america/new_york');
    expect(top?.entry.timeZone).toBe('America/New_York');
  });

  it('"sao paulo" and "são paulo" both resolve to São Paulo, Brazil', () => {
    for (const q of ['sao paulo', 'são paulo']) {
      const [top] = provider.search(q);
      expect(top).toBeDefined();
      expect(normalizeText(top!.entry.name)).toBe('sao paulo');
      expect(top!.entry.timeZone).toBe('America/Sao_Paulo');
      expect(top!.entry.countryCode).toBe('BR');
    }
  });

  it('"zurich" -> Zürich', () => {
    const [top] = provider.search('zurich');
    expect(normalizeText(top!.entry.name)).toBe('zurich');
    expect(top!.entry.timeZone).toBe('Europe/Zurich');
  });

  it('"bombay" -> Mumbai', () => {
    const [top] = provider.search('bombay');
    expect(top?.entry.name).toBe('Mumbai');
  });

  it('"saigon" -> Ho Chi Minh City', () => {
    const [top] = provider.search('saigon');
    expect(top?.entry.name).toBe('Ho Chi Minh City');
  });

  it('"utc" -> zone entry with timeZone UTC', () => {
    const [top] = provider.search('utc');
    expect(top?.entry.timeZone).toBe('UTC');
  });

  it('"gmt" / "zulu" / "z" also resolve to UTC', () => {
    for (const q of ['gmt', 'zulu', 'z']) {
      const [top] = provider.search(q);
      expect(top?.entry.timeZone).toBe('UTC');
    }
  });

  it('"tokyo" -> Tokyo, Japan', () => {
    const [top] = provider.search('tokyo');
    expect(top?.entry.name).toBe('Tokyo');
    expect(top?.entry.countryCode).toBe('JP');
  });

  it('"toronto" -> America/Toronto', () => {
    const [top] = provider.search('toronto');
    expect(top?.entry.timeZone).toBe('America/Toronto');
  });

  it('"muscat" -> exactly one Muscat result (city preferred over zone)', () => {
    const results = provider.search('muscat', 20);
    const muscats = results.filter((r) => normalizeText(r.entry.name) === 'muscat');
    expect(muscats.length).toBe(1);
    expect(muscats[0]!.entry.kind).toBe('city');
  });

  it('every curated alias target resolves against the loaded dataset', async () => {
    const entries = await (async () => {
      // reuse provider internals indirectly: findById is populated once ready
      const results: CityEntry[] = [];
      for (const [, target] of Object.entries(CITY_ALIASES)) {
        const resolved = resolveAliasTargetViaProvider(provider, target);
        if (resolved) results.push(resolved);
      }
      return results;
    })();
    expect(entries.length).toBe(Object.keys(CITY_ALIASES).length);
  });
});

function resolveAliasTargetViaProvider(provider: CityProvider, target: { name: string; countryCode: string; region?: string }): CityEntry | undefined {
  const results = provider.search(target.name, 50);
  return results
    .map((r) => r.entry)
    .find(
      (e) =>
        e.kind === 'city' &&
        normalizeText(e.name) === normalizeText(target.name) &&
        e.countryCode === target.countryCode &&
        (target.region === undefined || normalizeText(e.region ?? '') === normalizeText(target.region)),
    );
}
