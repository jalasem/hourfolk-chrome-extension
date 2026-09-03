import { cityProvider } from '@/domain/cities';
import { normalizeText } from '@/domain/cities/normalize';
import type { CityEntry } from '@/domain/cities/types';

/**
 * Strict resolver for the planner parser: a phrase counts as a city only when it names
 * the place exactly (name, name + region/country, alias, country, or IANA zone), so
 * stray words like "call" never turn into "Callao".
 */
export function findCityStrict(text: string): CityEntry | undefined {
  const wanted = normalizeText(text);
  if (!wanted || !cityProvider.isReady()) return undefined;
  const results = cityProvider.search(text, 6);
  for (const result of results) {
    const { entry, matchedOn } = result;
    const name = normalizeText(entry.name);
    const candidates = [
      name,
      entry.region ? `${name} ${normalizeText(entry.region)}` : '',
      `${name} ${normalizeText(entry.country)}`,
      entry.region ? `${name} ${normalizeText(entry.region)} ${normalizeText(entry.country)}` : '',
      normalizeText(entry.timeZone),
      normalizeText(entry.timeZone.split('/').pop() ?? ''),
      normalizeText(entry.country),
    ].filter(Boolean);
    if (candidates.includes(wanted)) return entry;
    if (matchedOn === 'alias' || matchedOn === 'zone') return entry;
  }
  return undefined;
}
