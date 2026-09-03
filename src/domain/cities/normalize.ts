/**
 * NFD-decompose, strip combining marks (diacritics), lowercase, fold punctuation
 * (underscores, hyphens, commas, periods, slashes, apostrophes, ...) to spaces,
 * then collapse whitespace. Used for every fuzzy comparison in city search.
 */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\p{P}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalized text with spaces joined by hyphens, for stable id fragments. */
export function slugify(s: string): string {
  const normalized = normalizeText(s);
  return normalized ? normalized.replace(/ /g, '-') : normalized;
}
