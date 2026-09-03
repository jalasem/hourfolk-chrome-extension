import type { IanaTimeZone } from '@/domain/time/types';
import { isValidTimeZone } from '@/domain/time/zone-clock';

import { normalizeCountryName } from './country-names';
import { slugify } from './normalize';
import { getZoneNames, primaryCityForZone } from './tzdb';
import type { CityEntry } from './types';

// `city-timezones` gives a handful of unrecognized-state rows (Kosovo, Somaliland)
// an iso2 of -99 (no ISO 3166-1 code exists). Use the codes commonly assigned in
// practice rather than dropping cities entirely.
const ISO2_OVERRIDE_BY_COUNTRY: Readonly<Record<string, string>> = {
  Kosovo: 'XK',
  Somaliland: 'SO',
};

function resolveIso2(row: { iso2: string | number; country: string }): string | undefined {
  if (typeof row.iso2 === 'string' && row.iso2.length === 2) return row.iso2.toUpperCase();
  return ISO2_OVERRIDE_BY_COUNTRY[row.country];
}

function uniqueId(used: Map<string, number>, base: string): string {
  const seen = used.get(base) ?? 0;
  used.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen + 1}`;
}

let cache: Promise<CityEntry[]> | undefined;

/** Memoized. Loads the (dynamically imported) primary city dataset plus one entry per IANA zone. */
export function loadCityEntries(): Promise<CityEntry[]> {
  if (!cache) cache = build();
  return cache;
}

async function build(): Promise<CityEntry[]> {
  const { default: rows } = await import('city-timezones/data/cityMap.json');

  const distinctZones = new Set(rows.map((r) => r.timezone).filter((tz): tz is IanaTimeZone => Boolean(tz)));
  const validZones = new Set([...distinctZones].filter(isValidTimeZone));

  const usedIds = new Map<string, number>();
  const entries: CityEntry[] = [];

  for (const row of rows) {
    if (!row.timezone || !validZones.has(row.timezone)) continue;
    const iso2 = resolveIso2(row);
    if (!iso2) continue;

    // Kept even when it matches `name` (e.g. "New York, New York"): a state/province
    // sharing a city's name is real information, not dataset noise. `formatCityLocation`
    // (types.ts) already collapses that case for display.
    const region = row.province ? row.province : undefined;
    const idBase = `${slugify(row.city_ascii)}-${iso2.toLowerCase()}${region ? `-${slugify(region)}` : ''}`;

    entries.push({
      id: `city:${uniqueId(usedIds, idBase)}`,
      kind: 'city',
      name: row.city,
      ...(region ? { region } : {}),
      country: normalizeCountryName(row.country),
      countryCode: iso2,
      timeZone: row.timezone,
      population: row.pop,
    });
  }

  for (const zone of getZoneNames()) {
    const zoneEntry = primaryCityForZone(zone);
    if (zoneEntry) entries.push(zoneEntry);
  }

  return entries;
}
