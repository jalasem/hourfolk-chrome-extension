import { cityProvider } from '@/domain/cities';
import { standardAbbreviationFor } from '@/domain/cities/tzdb';
import type { IanaTimeZone } from '@/domain/time/types';

export interface LocalLocation {
  /** "Muscat" when derivable, otherwise "Local". */
  name: string;
  /** "Oman" or the IANA zone when the city is unknown. */
  detail: string;
  timeZone: IanaTimeZone;
  known: boolean;
}

export function describeLocalLocation(timeZone: IanaTimeZone): LocalLocation {
  const city = cityProvider.primaryCityForZone(timeZone);
  if (city && city.name !== 'UTC') {
    return { name: city.name, detail: city.country || timeZone, timeZone, known: true };
  }
  return { name: 'Local', detail: timeZone, timeZone, known: false };
}

/** Standard-time abbreviation fallback for zones Intl only names as "GMT+x". */
export const abbreviationFallback = (timeZone: IanaTimeZone, offsetMinutes: number): string | undefined =>
  standardAbbreviationFor(timeZone, offsetMinutes);
