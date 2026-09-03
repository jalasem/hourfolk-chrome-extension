import type { IanaTimeZone } from '@/domain/time/types';

import { CITY_ALIASES, resolveAliasTarget, ZONE_ALIASES } from './aliases';
import { countryAliasEntries } from './country-names';
import { loadCityEntries } from './dataset';
import { normalizeText } from './normalize';
import { getZoneInfo, getZoneNames, primaryCityForZone as tzdbPrimaryCityForZone } from './tzdb';
import type { CityEntry, CityMatchKind, CityProvider, CitySearchResult, ZoneInfo } from './types';

const SCORE = {
  nameExact: 100,
  fastZone: 100,
  aliasExact: 95,
  namePrefix: 85,
  nameWordPrefix: 75,
  zoneMatch: 65,
  countryMatch: 45,
  regionMatch: 40,
} as const;

type PhraseAlias =
  | { kind: 'city'; entry: CityEntry }
  | { kind: 'zone'; timeZone: IanaTimeZone }
  | { kind: 'country'; countryCode: string };

interface SearchRecord {
  entry: CityEntry;
  normalizedName: string;
  nameWords: string[];
  zoneFull: string;
  zoneLast: string;
  regionNormalized?: string;
  countryNormalized: string;
  countryWords: string[];
}

interface QueryContext {
  normalizedQuery: string;
  tokens: string[];
  fastZone: IanaTimeZone | undefined;
  phraseAlias: PhraseAlias | undefined;
}

function wordsOf(normalized: string): string[] {
  return normalized ? normalized.split(' ') : [];
}

function lastZoneSegment(timeZone: IanaTimeZone): string {
  const last = timeZone.split('/').pop();
  return last ? normalizeText(last) : normalizeText(timeZone);
}

function toRecord(entry: CityEntry): SearchRecord {
  const normalizedName = normalizeText(entry.name);
  const region = entry.region;
  return {
    entry,
    normalizedName,
    nameWords: wordsOf(normalizedName),
    zoneFull: normalizeText(entry.timeZone),
    zoneLast: lastZoneSegment(entry.timeZone),
    ...(region !== undefined ? { regionNormalized: normalizeText(region) } : {}),
    countryNormalized: normalizeText(entry.country),
    countryWords: wordsOf(normalizeText(entry.country)),
  };
}

/** Drops zone entries shadowed by a city entry that shares the zone + normalized name. */
function dedupeZoneEntries(entries: readonly CityEntry[]): CityEntry[] {
  const cityKeys = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === 'city') cityKeys.add(`${entry.timeZone}|${normalizeText(entry.name)}`);
  }
  return entries.filter((entry) => entry.kind !== 'zone' || !cityKeys.has(`${entry.timeZone}|${normalizeText(entry.name)}`));
}

function buildPhraseAliasIndex(entries: readonly CityEntry[]): Map<string, PhraseAlias> {
  const index = new Map<string, PhraseAlias>();
  for (const [key, target] of Object.entries(CITY_ALIASES)) {
    const resolved = resolveAliasTarget(entries, target);
    if (resolved) index.set(key, { kind: 'city', entry: resolved });
  }
  for (const [key, timeZone] of Object.entries(ZONE_ALIASES)) {
    index.set(key, { kind: 'zone', timeZone });
  }
  for (const [key, countryCode] of countryAliasEntries()) {
    index.set(key, { kind: 'country', countryCode });
  }
  return index;
}

/** The most populous entry for each zone (population-less zone entries lose to any real city). */
function buildBestForZone(records: readonly SearchRecord[]): Map<IanaTimeZone, string> {
  const best = new Map<IanaTimeZone, { id: string; population: number }>();
  for (const { entry } of records) {
    const population = entry.population ?? 0;
    const current = best.get(entry.timeZone);
    if (!current || population > current.population) {
      best.set(entry.timeZone, { id: entry.id, population });
    }
  }
  return new Map([...best].map(([zone, v]) => [zone, v.id]));
}

interface TokenMatch {
  tier: number;
  kind: CityMatchKind;
}

/** Whether a single token prefix-matches some word of the record's searchable fields. */
function tokenMatch(record: SearchRecord, token: string): TokenMatch | undefined {
  if (record.normalizedName === token) return { tier: SCORE.nameExact, kind: 'name' };
  if (record.normalizedName.startsWith(token)) return { tier: SCORE.namePrefix, kind: 'name' };
  if (record.nameWords.some((w) => w.startsWith(token))) return { tier: SCORE.nameWordPrefix, kind: 'name' };

  if (record.zoneFull === token || record.zoneLast === token) return { tier: SCORE.zoneMatch, kind: 'zone' };
  if (wordsOf(record.zoneFull).some((w) => w.startsWith(token))) return { tier: SCORE.zoneMatch, kind: 'zone' };

  if (record.regionNormalized !== undefined) {
    if (record.regionNormalized === token || wordsOf(record.regionNormalized).some((w) => w.startsWith(token))) {
      return { tier: SCORE.regionMatch, kind: 'region' };
    }
  }

  if (record.countryNormalized === token || record.countryWords.some((w) => w.startsWith(token))) {
    return { tier: SCORE.countryMatch, kind: 'country' };
  }

  return undefined;
}

function scoreEntry(record: SearchRecord, ctx: QueryContext, bestForZone: Map<IanaTimeZone, string>): CitySearchResult | undefined {
  const { entry } = record;
  const { normalizedQuery, tokens, fastZone, phraseAlias } = ctx;

  let bestTier = -Infinity;
  let bestKind: CityMatchKind = 'name';
  let forced = false;
  const consider = (tier: number, kind: CityMatchKind) => {
    if (tier > bestTier) {
      bestTier = tier;
      bestKind = kind;
    }
  };

  if (phraseAlias) {
    if (phraseAlias.kind === 'city' && phraseAlias.entry.id === entry.id) {
      consider(SCORE.aliasExact, 'alias');
      forced = true;
    } else if (phraseAlias.kind === 'zone' && entry.timeZone === phraseAlias.timeZone && bestForZone.get(phraseAlias.timeZone) === entry.id) {
      // Zone words ("utc", "gmt", "zulu", "z") must beat ordinary name matches even
      // against very short, generic queries (e.g. "z" vs. "Zhengzhou").
      consider(SCORE.aliasExact, 'zone');
      forced = true;
    } else if (phraseAlias.kind === 'country' && entry.countryCode === phraseAlias.countryCode) {
      consider(SCORE.countryMatch, 'country');
      forced = true;
    }
  }

  if (fastZone && entry.timeZone === fastZone && bestForZone.get(fastZone) === entry.id) {
    consider(SCORE.fastZone, 'zone');
    forced = true;
  }

  if (record.normalizedName === normalizedQuery) consider(SCORE.nameExact, 'name');
  else if (record.normalizedName.startsWith(normalizedQuery)) consider(SCORE.namePrefix, 'name');
  else if (record.nameWords.some((w) => w.startsWith(normalizedQuery))) consider(SCORE.nameWordPrefix, 'name');

  if (record.zoneFull === normalizedQuery || record.zoneLast === normalizedQuery) consider(SCORE.zoneMatch, 'zone');
  else if (record.zoneFull.startsWith(normalizedQuery) || record.zoneLast.startsWith(normalizedQuery)) consider(SCORE.zoneMatch, 'zone');

  if (record.regionNormalized !== undefined && (record.regionNormalized === normalizedQuery || record.regionNormalized.startsWith(normalizedQuery))) {
    consider(SCORE.regionMatch, 'region');
  }

  if (record.countryNormalized === normalizedQuery || record.countryNormalized.startsWith(normalizedQuery)) {
    consider(SCORE.countryMatch, 'country');
  }

  if (bestTier === -Infinity) {
    // No single field matched the whole query: require every token to independently
    // match some field (e.g. "portland oregon" = name token + region token).
    let sum = 0;
    let matchedAll = true;
    let compoundBest = -Infinity;
    let compoundKind: CityMatchKind = 'name';
    for (const token of tokens) {
      const match = tokenMatch(record, token);
      if (!match) {
        matchedAll = false;
        break;
      }
      sum += match.tier;
      if (match.tier > compoundBest) {
        compoundBest = match.tier;
        compoundKind = match.kind;
      }
    }
    if (matchedAll && tokens.length > 0) {
      consider(sum / tokens.length, compoundKind);
    } else if (!forced) {
      return undefined;
    }
  }

  if (bestTier === -Infinity) return undefined;

  const populationBonus = Math.log10((entry.population ?? 0) + 1);
  return { entry, score: bestTier + populationBonus, matchedOn: bestKind };
}

export function createCityProvider(): CityProvider {
  let allEntries: CityEntry[] = [];
  let byId = new Map<string, CityEntry>();
  let searchRecords: SearchRecord[] = [];
  let phraseAliasIndex = new Map<string, PhraseAlias>();
  let bestForZone = new Map<IanaTimeZone, string>();
  let readyFlag = false;
  let readyPromise: Promise<void> | undefined;

  const zoneNamesLower = new Map<string, IanaTimeZone>(getZoneNames().map((z) => [z.toLowerCase(), z]));

  function resolveFastZone(rawQuery: string): IanaTimeZone | undefined {
    const trimmed = rawQuery.trim();
    if (!trimmed) return undefined;
    const lower = trimmed.toLowerCase();
    if (trimmed.includes('/') || zoneNamesLower.has(lower)) {
      return zoneNamesLower.get(lower);
    }
    return undefined;
  }

  async function load(): Promise<void> {
    const entries = await loadCityEntries();
    allEntries = entries;
    byId = new Map(entries.map((e) => [e.id, e]));

    const searchable = dedupeZoneEntries(entries);
    searchRecords = searchable.map(toRecord);
    phraseAliasIndex = buildPhraseAliasIndex(entries);
    bestForZone = buildBestForZone(searchRecords);
    readyFlag = true;
  }

  return {
    ready(): Promise<void> {
      if (!readyPromise) readyPromise = load();
      return readyPromise;
    },

    isReady(): boolean {
      return readyFlag;
    },

    search(query: string, limit = 8): CitySearchResult[] {
      if (!readyFlag) return [];
      const normalizedQuery = normalizeText(query);
      if (!normalizedQuery) return [];
      const tokens = normalizedQuery.split(' ').filter(Boolean);
      const ctx: QueryContext = {
        normalizedQuery,
        tokens,
        fastZone: resolveFastZone(query),
        phraseAlias: phraseAliasIndex.get(normalizedQuery),
      };

      const results: CitySearchResult[] = [];
      for (const record of searchRecords) {
        const scored = scoreEntry(record, ctx, bestForZone);
        if (scored) results.push(scored);
      }

      results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const popDiff = (b.entry.population ?? 0) - (a.entry.population ?? 0);
        if (popDiff !== 0) return popDiff;
        return a.entry.name.localeCompare(b.entry.name);
      });

      return results.slice(0, limit);
    },

    findById(id: string): CityEntry | undefined {
      return byId.get(id);
    },

    primaryCityForZone(timeZone: IanaTimeZone): CityEntry | undefined {
      return tzdbPrimaryCityForZone(timeZone);
    },

    zoneInfo(timeZone: IanaTimeZone): ZoneInfo | undefined {
      return getZoneInfo(timeZone);
    },

    zoneNames(): readonly IanaTimeZone[] {
      return getZoneNames();
    },
  };
}
