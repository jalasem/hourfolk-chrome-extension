import type { IanaTimeZone } from '@/domain/time/types';

import { normalizeText } from './normalize';
import type { CityEntry } from './types';

export interface CityAliasTarget {
  /** The dataset entry's exact `name` (native spelling, as `city-timezones` has it). */
  name: string;
  countryCode: string;
  /** Disambiguates when more than one dataset entry shares name + countryCode. */
  region?: string;
}

/**
 * Curated colloquial/former-name aliases. Keys are already normalized (see
 * `normalizeText`) whole-query phrases; values point at the dataset entry to boost.
 * Every target is verified against the live dataset in aliases.test.ts.
 */
export const CITY_ALIASES: Readonly<Record<string, CityAliasTarget>> = {
  nyc: { name: 'New York', countryCode: 'US' },
  'new york city': { name: 'New York', countryCode: 'US' },
  la: { name: 'Los Angeles', countryCode: 'US' },
  sf: { name: 'San Francisco', countryCode: 'US' },
  dc: { name: 'Washington, D.C.', countryCode: 'US' },
  'washington dc': { name: 'Washington, D.C.', countryCode: 'US' },
  bombay: { name: 'Mumbai', countryCode: 'IN' },
  calcutta: { name: 'Kolkata', countryCode: 'IN' },
  madras: { name: 'Chennai', countryCode: 'IN' },
  bangalore: { name: 'Bengaluru', countryCode: 'IN' },
  peking: { name: 'Beijing', countryCode: 'CN' },
  canton: { name: 'Guangzhou', countryCode: 'CN' },
  saigon: { name: 'Ho Chi Minh City', countryCode: 'VN' },
  kiev: { name: 'Kyiv', countryCode: 'UA' },
  hk: { name: 'Hong Kong', countryCode: 'HK' },
  kl: { name: 'Kuala Lumpur', countryCode: 'MY' },
  rio: { name: 'Rio de Janeiro', countryCode: 'BR' },
  cdmx: { name: 'Mexico City', countryCode: 'MX' },
  philly: { name: 'Philadelphia', countryCode: 'US' },
  vegas: { name: 'Las Vegas', countryCode: 'US', region: 'Nevada' },
};

/** Zone-word aliases ("utc", "gmt", "zulu", "z") that should resolve straight to a zone. */
export const ZONE_ALIASES: Readonly<Record<string, IanaTimeZone>> = {
  utc: 'UTC',
  gmt: 'UTC',
  zulu: 'UTC',
  z: 'UTC',
};

/** Resolves an alias target to its dataset entry; picks the most populous match when ambiguous. */
export function resolveAliasTarget(entries: readonly CityEntry[], target: CityAliasTarget): CityEntry | undefined {
  const targetName = normalizeText(target.name);
  const targetRegion = target.region !== undefined ? normalizeText(target.region) : undefined;
  const candidates = entries.filter((entry) => {
    if (entry.kind !== 'city') return false;
    if (normalizeText(entry.name) !== targetName) return false;
    if (entry.countryCode !== target.countryCode) return false;
    if (targetRegion !== undefined && normalizeText(entry.region ?? '') !== targetRegion) return false;
    return true;
  });
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, candidate) => ((candidate.population ?? 0) > (best.population ?? 0) ? candidate : best));
}
