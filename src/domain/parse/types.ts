import type { CityEntry } from '@/domain/cities/types';
import type { IanaTimeZone, IsoDate, IsoTime } from '@/domain/time/types';

export interface ParseContext {
  nowMs: number;
  /** The user's device zone; used for relative dates when no city is recognised. */
  localZone: IanaTimeZone;
  /** Resolves free text ("new york", "tokyo", "Asia/Muscat") to a city, or undefined. */
  findCity: (text: string) => CityEntry | undefined;
}

export interface ParsedTime {
  iso: IsoTime;
  raw: string;
}

export interface ParsedDate {
  iso: IsoDate;
  raw: string;
  kind: 'explicit' | 'relative' | 'weekday';
}

export interface ParsedCity {
  entry: CityEntry;
  raw: string;
}

export interface ParseResult {
  time?: ParsedTime;
  date?: ParsedDate;
  city?: ParsedCity;
  /** Words that were not understood, in input order. */
  leftovers: string[];
  /** Human-readable, deterministic explanation of each decision. */
  explanation: string[];
}
