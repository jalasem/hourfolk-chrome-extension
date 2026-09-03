import type { IanaTimeZone } from '@/domain/time/types';

export interface CityEntry {
  /** Stable id, e.g. "city:new-york-us-new-york" or "zone:America/New_York". */
  id: string;
  kind: 'city' | 'zone';
  /** Display name: "New York". */
  name: string;
  /** State / province when known: "New York", "Ontario". */
  region?: string;
  /** "United States", "United Kingdom". */
  country: string;
  /** ISO 3166-1 alpha-2, upper case. */
  countryCode: string;
  timeZone: IanaTimeZone;
  population?: number;
}

export type CityMatchKind = 'name' | 'alias' | 'zone' | 'region' | 'country';

export interface CitySearchResult {
  entry: CityEntry;
  score: number;
  matchedOn: CityMatchKind;
}

export interface ZoneInfo {
  timeZone: IanaTimeZone;
  /** "Eastern Time", "Gulf Time". */
  alternativeName: string;
  /** Standard-time abbreviation from tzdb, e.g. "EST", "GST". */
  abbreviation: string;
  rawOffsetMinutes: number;
  countryName: string;
  countryCode: string;
  mainCities: string[];
}

export interface CityProvider {
  /** Loads the lazily bundled city dataset. Safe to call repeatedly. */
  ready(): Promise<void>;
  /** True once `ready()` has resolved. */
  isReady(): boolean;
  /** Synchronous search over the loaded dataset; returns [] until ready. */
  search(query: string, limit?: number): CitySearchResult[];
  findById(id: string): CityEntry | undefined;
  /** Best-known city for a zone (from tzdb, available before `ready()`), e.g. "Muscat" for Asia/Muscat. */
  primaryCityForZone(timeZone: IanaTimeZone): CityEntry | undefined;
  zoneInfo(timeZone: IanaTimeZone): ZoneInfo | undefined;
  /** All IANA zone identifiers known to the dataset. */
  zoneNames(): readonly IanaTimeZone[];
}

/** "Oregon, United States" / "Oman" — the part that disambiguates a city. */
export function formatRegionCountry(entry: Pick<CityEntry, 'name' | 'region' | 'country'>): string {
  const region = entry.region && entry.region !== entry.name ? entry.region : undefined;
  return [region, entry.country].filter((p): p is string => Boolean(p)).join(', ');
}

/** "Portland, Oregon, United States" / "Muscat, Oman". */
export function formatCityLocation(entry: Pick<CityEntry, 'name' | 'region' | 'country'>): string {
  const rest = formatRegionCountry(entry);
  return rest ? `${entry.name}, ${rest}` : entry.name;
}
