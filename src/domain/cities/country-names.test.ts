import { describe, expect, it } from 'vitest';

import { countryCodeForAlias, normalizeCountryName } from './country-names';
import { normalizeText } from './normalize';

describe('normalizeCountryName', () => {
  it('normalizes known odd dataset country names', () => {
    expect(normalizeCountryName('United States of America')).toBe('United States');
    expect(normalizeCountryName('Korea, South')).toBe('South Korea');
    expect(normalizeCountryName('Korea, North')).toBe('North Korea');
    expect(normalizeCountryName('Congo (Kinshasa)')).toBe('DR Congo');
    expect(normalizeCountryName('Congo (Brazzaville)')).toBe('Republic of the Congo');
    expect(normalizeCountryName('Russia')).toBe('Russia');
    expect(normalizeCountryName('Czech Republic')).toBe('Czechia');
    expect(normalizeCountryName('Burma')).toBe('Myanmar');
    expect(normalizeCountryName('Bahamas, The')).toBe('Bahamas');
    expect(normalizeCountryName('Gambia, The')).toBe('Gambia');
    expect(normalizeCountryName("Cote d'Ivoire")).toBe('Ivory Coast');
    expect(normalizeCountryName('Macedonia')).toBe('North Macedonia');
    expect(normalizeCountryName('Swaziland')).toBe('Eswatini');
  });

  it('passes through names it does not recognize', () => {
    expect(normalizeCountryName('Japan')).toBe('Japan');
  });
});

describe('countryCodeForAlias', () => {
  it('resolves common country aliases', () => {
    expect(countryCodeForAlias(normalizeText('USA'))).toBe('US');
    expect(countryCodeForAlias(normalizeText('us'))).toBe('US');
    expect(countryCodeForAlias(normalizeText('United States'))).toBe('US');
    expect(countryCodeForAlias(normalizeText('America'))).toBe('US');
    expect(countryCodeForAlias(normalizeText('UK'))).toBe('GB');
    expect(countryCodeForAlias(normalizeText('Britain'))).toBe('GB');
    expect(countryCodeForAlias(normalizeText('Great Britain'))).toBe('GB');
    expect(countryCodeForAlias(normalizeText('England'))).toBe('GB');
    expect(countryCodeForAlias(normalizeText('UAE'))).toBe('AE');
    expect(countryCodeForAlias(normalizeText('Holland'))).toBe('NL');
    expect(countryCodeForAlias(normalizeText('South Korea'))).toBe('KR');
  });
});
