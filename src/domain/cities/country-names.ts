import { normalizeText } from './normalize';

/**
 * The `city-timezones` dataset carries dated/awkward country names (census-bureau
 * style like "Korea, South" or "Congo (Kinshasa)"). Map the ones we've found to
 * their common display names; anything not listed passes through unchanged.
 */
const COUNTRY_NAME_OVERRIDES: Readonly<Record<string, string>> = {
  'United States of America': 'United States',
  'Congo (Kinshasa)': 'DR Congo',
  'Congo (Brazzaville)': 'Republic of the Congo',
  'Czech Republic': 'Czechia',
  Burma: 'Myanmar',
  'The Bahamas': 'Bahamas',
  'Bahamas, The': 'Bahamas',
  'The Gambia': 'Gambia',
  'Gambia, The': 'Gambia',
  "Cote d'Ivoire": 'Ivory Coast',
  Macedonia: 'North Macedonia',
  Swaziland: 'Eswatini',
  'Korea, South': 'South Korea',
  'Korea, North': 'North Korea',
  'Hong Kong S.A.R.': 'Hong Kong',
  'Macau S.A.R': 'Macau',
  'Macau S.A.R.': 'Macau',
  'Vatican (Holy Sea)': 'Vatican City',
  'Cape Verde': 'Cabo Verde',
  Curacao: 'Curaçao',
  Aland: 'Åland Islands',
};

/** Display-normalized country name for a raw dataset value. */
export function normalizeCountryName(raw: string): string {
  return COUNTRY_NAME_OVERRIDES[raw] ?? raw;
}

/**
 * Normalized (see `normalizeText`) search aliases for country names/codes that
 * don't otherwise prefix-match the dataset's country string, keyed to ISO 3166-1
 * alpha-2 codes.
 */
const COUNTRY_ALIASES: Readonly<Record<string, string>> = {
  usa: 'US',
  us: 'US',
  'united states': 'US',
  america: 'US',
  uk: 'GB',
  britain: 'GB',
  'great britain': 'GB',
  england: 'GB',
  uae: 'AE',
  holland: 'NL',
  'south korea': 'KR',
  'north korea': 'KP',
  russia: 'RU',
  ivory: 'CI',
  'drc': 'CD',
  'dr congo': 'CD',
  congo: 'CG',
};

/** Country code for a normalized alias phrase, e.g. `normalizeText('USA')`. */
export function countryCodeForAlias(normalizedAlias: string): string | undefined {
  return COUNTRY_ALIASES[normalizedAlias];
}

/** All normalized alias phrases mapped to a country code (for building the search index). */
export function countryAliasEntries(): ReadonlyArray<readonly [string, string]> {
  return Object.entries(COUNTRY_ALIASES);
}

/** Guards against typos: every alias key must already be normalized text. */
export function isNormalizedCountryAliasTable(): boolean {
  return Object.keys(COUNTRY_ALIASES).every((key) => normalizeText(key) === key);
}
