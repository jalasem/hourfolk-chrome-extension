import type { CityEntry } from '@/domain/cities/types';

/** Thu Sep 3 2026, 12:00 UTC. */
export const NOW_MS = Date.UTC(2026, 8, 3, 12, 0);
export const LOCAL_ZONE = 'Asia/Muscat';

const CITIES: Record<string, CityEntry> = {
  'new york': { id: 'city:new-york', kind: 'city', name: 'New York', country: 'United States', countryCode: 'US', timeZone: 'America/New_York' },
  london: { id: 'city:london', kind: 'city', name: 'London', country: 'United Kingdom', countryCode: 'GB', timeZone: 'Europe/London' },
  tokyo: { id: 'city:tokyo', kind: 'city', name: 'Tokyo', country: 'Japan', countryCode: 'JP', timeZone: 'Asia/Tokyo' },
  toronto: { id: 'city:toronto', kind: 'city', name: 'Toronto', country: 'Canada', countryCode: 'CA', timeZone: 'America/Toronto' },
  'portland oregon': {
    id: 'city:portland-or',
    kind: 'city',
    name: 'Portland',
    region: 'Oregon',
    country: 'United States',
    countryCode: 'US',
    timeZone: 'America/Los_Angeles',
  },
  muscat: { id: 'city:muscat', kind: 'city', name: 'Muscat', country: 'Oman', countryCode: 'OM', timeZone: 'Asia/Muscat' },
};

/** Deterministic stub matching the fixed city set the parser tests exercise; unknown text resolves to undefined. */
export function findCity(text: string): CityEntry | undefined {
  return CITIES[text.trim().toLowerCase()];
}
