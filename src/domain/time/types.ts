/** An IANA time-zone identifier such as "America/New_York". Never a fixed offset. */
export type IanaTimeZone = string;
/** Calendar date as "YYYY-MM-DD". */
export type IsoDate = string;
/** Wall-clock time as "HH:MM" (24-hour). */
export type IsoTime = string;
export type HourCycle = '12h' | '24h';
export type Disambiguation = 'earlier' | 'later';

export interface WallClockRequest {
  timeZone: IanaTimeZone;
  date: IsoDate;
  time: IsoTime;
  /** Which occurrence to pick when the wall-clock time is ambiguous (fall-back). Default "earlier". */
  prefer?: Disambiguation;
}

export type WallClockResolution =
  | { kind: 'unique'; epochMs: number }
  | {
      kind: 'ambiguous';
      /** The instant chosen according to `prefer`. */
      epochMs: number;
      chosen: Disambiguation;
      earlierMs: number;
      laterMs: number;
      /** e.g. "UTC−4" / "UTC−5" so the UI can label the two occurrences. */
      earlierOffset: string;
      laterOffset: string;
      explanation: string;
    }
  | {
      kind: 'nonexistent';
      /** The instant of the moved-forward wall-clock time. */
      epochMs: number;
      movedTo: { date: IsoDate; time: IsoTime };
      gapMinutes: number;
      explanation: string;
    };

export interface WallClockParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 1 = Monday … 7 = Sunday (ISO). */
  weekday: number;
}

export interface InstantDescription {
  epochMs: number;
  timeZone: IanaTimeZone;
  isoDate: IsoDate;
  isoTime: IsoTime;
  /** "2:05 PM" or "14:05" depending on hour cycle. */
  time: string;
  /** "2:05:09 PM" or "14:05:09". */
  timeWithSeconds: string;
  /** Typographic split: { clock: "2:05", period: "PM" }; period is "" in 24-hour mode. */
  clock: string;
  period: string;
  /** "Monday" / "Mon". */
  weekday: string;
  weekdayShort: string;
  /** "Sep 8, 2026". */
  date: string;
  /** "Monday, September 8, 2026". */
  dateLong: string;
  /** "EDT", "BST", "GST" or "GMT+4" when no alphabetic abbreviation is available. */
  abbreviation: string;
  /** "UTC−4", "UTC+5:30", "UTC" (Unicode minus). */
  utcOffset: string;
  offsetMinutes: number;
}

export interface DescribeOptions {
  hourCycle: HourCycle;
  locale?: string;
  /**
   * Optional fallback used when Intl only yields a "GMT+x" style name.
   * Receives the zone and the offset in effect; return an alphabetic abbreviation or undefined.
   */
  abbreviationFallback?: (timeZone: IanaTimeZone, offsetMinutes: number) => string | undefined;
}

export interface DayRelation {
  /** Calendar-day difference: -1 yesterday, 0 today, +1 tomorrow, ±n otherwise. */
  dayDelta: number;
  /** "Yesterday" | "Today" | "Tomorrow" | "+2 days" | "−2 days". */
  label: string;
}

export interface OffsetDifference {
  /** zone offset minus reference offset, in minutes. */
  minutes: number;
  /** "8 hours behind" | "Same time" | "5½ hours ahead" | "12¾ hours ahead" | "1 hour ahead". */
  label: string;
}

export interface NextOccurrence {
  date: IsoDate;
  epochMs: number;
  /** True when today's occurrence in the zone is still upcoming. */
  isToday: boolean;
}
