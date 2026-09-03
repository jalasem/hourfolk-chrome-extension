import { describe, expect, it } from 'vitest';

import { normalizeText, slugify } from './normalize';

describe('normalizeText', () => {
  it('strips diacritics', () => {
    expect(normalizeText('São Paulo')).toBe('sao paulo');
    expect(normalizeText('Zürich')).toBe('zurich');
    expect(normalizeText('‘Ibrī')).toBe('ibri');
  });

  it('folds underscores, hyphens, and other punctuation to spaces', () => {
    expect(normalizeText('New_York')).toBe('new york');
    expect(normalizeText('America/New_York')).toBe('america new york');
    expect(normalizeText('Washington, D.C.')).toBe('washington d c');
    expect(normalizeText("O'Fallon")).toBe('o fallon');
  });

  it('handles multi-word city names', () => {
    expect(normalizeText('Ho Chi Minh City')).toBe('ho chi minh city');
  });

  it('lowercases and collapses/trims whitespace', () => {
    expect(normalizeText('  New   YORK  ')).toBe('new york');
  });

  it('returns empty string for blank input', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText('   ')).toBe('');
  });
});

describe('slugify', () => {
  it('joins normalized words with hyphens', () => {
    expect(slugify('New York')).toBe('new-york');
    expect(slugify('São Paulo')).toBe('sao-paulo');
    expect(slugify('Washington, D.C.')).toBe('washington-d-c');
  });
});
