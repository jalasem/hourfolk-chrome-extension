declare module 'city-timezones/data/cityMap.json' {
  interface CityTimezoneRow {
    city: string;
    city_ascii: string;
    lat: number;
    lng: number;
    pop: number;
    country: string;
    iso2: string | number;
    iso3: string;
    province: string;
    state_ansi?: string;
    timezone: string;
  }
  const rows: CityTimezoneRow[];
  export default rows;
}
