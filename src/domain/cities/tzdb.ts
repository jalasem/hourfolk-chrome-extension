import { rawTimeZones, timeZonesNames } from '@vvo/tzdb';
import { getCountryForTimezone } from 'countries-and-timezones';

import type { IanaTimeZone } from '@/domain/time/types';
import { isValidTimeZone } from '@/domain/time/zone-clock';

import { normalizeCountryName } from './country-names';
import type { CityEntry, ZoneInfo } from './types';

const UTC_ZONE_INFO: ZoneInfo = {
  timeZone: 'UTC',
  alternativeName: 'Coordinated Universal Time',
  abbreviation: 'UTC',
  rawOffsetMinutes: 0,
  countryName: '',
  countryCode: '',
  mainCities: ['UTC'],
};

/**
 * `rawTimeZones` groups fold every alias/legacy IANA name into one canonical zone
 * (e.g. Asia/Dubai's group includes Indian/Mahe, which is really Seychelles). Build
 * a flat `zone -> ZoneInfo` index covering the canonical entry and every member,
 * correcting the country for members whose real country differs from the group's.
 */
function buildZoneInfoIndex(): Map<IanaTimeZone, ZoneInfo> {
  const index = new Map<IanaTimeZone, ZoneInfo>();
  index.set('UTC', UTC_ZONE_INFO);
  for (const raw of rawTimeZones) {
    const canonical: ZoneInfo = {
      timeZone: raw.name,
      alternativeName: raw.alternativeName,
      abbreviation: raw.abbreviation,
      rawOffsetMinutes: raw.rawOffsetInMinutes,
      countryName: normalizeCountryName(raw.countryName),
      countryCode: raw.countryCode,
      mainCities: raw.mainCities,
    };
    index.set(raw.name, canonical);
    for (const member of raw.group) {
      if (member === raw.name) continue;
      const actualCountry = getCountryForTimezone(member);
      index.set(member, {
        ...canonical,
        timeZone: member,
        countryName: actualCountry ? normalizeCountryName(actualCountry.name) : canonical.countryName,
        countryCode: actualCountry ? actualCountry.id : canonical.countryCode,
      });
    }
  }
  return index;
}

const zoneInfoIndex = buildZoneInfoIndex();

// Restrict to zone names this runtime's Intl actually resolves: tzdb ships the
// static IANA list, which can outrun the host's bundled ICU (e.g. brand-new zones).
const zoneNames: readonly IanaTimeZone[] = Array.from(
  new Set<IanaTimeZone>(['UTC', ...timeZonesNames.filter(isValidTimeZone)]),
);

export function getZoneInfo(zone: IanaTimeZone): ZoneInfo | undefined {
  return zoneInfoIndex.get(zone);
}

export function getZoneNames(): readonly IanaTimeZone[] {
  return zoneNames;
}

/** "America/Argentina/Buenos_Aires" -> "Buenos Aires"; "Etc/GMT+3" -> undefined (no city name). */
function nameFromZonePath(zone: IanaTimeZone): string | undefined {
  const last = zone.split('/').pop();
  if (!last || !/[A-Za-z]/.test(last)) return undefined;
  return last.replace(/_/g, ' ');
}

/**
 * Best-known city for a zone. Canonical tzdb entries use their first `mainCities`
 * entry; group members and other valid-but-unlisted zones derive a name from the
 * zone path's last segment.
 */
export function primaryCityForZone(zone: IanaTimeZone): CityEntry | undefined {
  if (!isValidTimeZone(zone)) return undefined;
  const canonical = rawTimeZones.find((z) => z.name === zone);
  const name = canonical ? canonical.mainCities[0] : nameFromZonePath(zone);
  if (!name) return undefined;
  const info = zoneInfoIndex.get(zone);
  return {
    kind: 'zone',
    id: `zone:${zone}`,
    name,
    country: info?.countryName ?? '',
    countryCode: info?.countryCode ?? '',
    timeZone: zone,
  };
}

/** tzdb's standard-time abbreviation, only when `offsetMinutes` reflects standard (non-DST) time. */
export function standardAbbreviationFor(zone: IanaTimeZone, offsetMinutes: number): string | undefined {
  const info = zoneInfoIndex.get(zone);
  if (!info) return undefined;
  return offsetMinutes === info.rawOffsetMinutes ? info.abbreviation : undefined;
}
