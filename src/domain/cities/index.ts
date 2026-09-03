export { createCityProvider } from './provider';
export type { CityEntry, CityMatchKind, CityProvider, CitySearchResult, ZoneInfo } from './types';
export { formatCityLocation } from './types';

import { createCityProvider } from './provider';

/** Default singleton provider used by the app; `ready()` lazily loads the dataset. */
export const cityProvider = createCityProvider();
