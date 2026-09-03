import type { HourCycle, IanaTimeZone, IsoDate, IsoTime } from '@/domain/time/types';

export const SCHEMA_VERSION = 2;

export type SurfacePreference = 'popup' | 'sidepanel' | 'page';
export type ThemePreference = 'system' | 'light' | 'dark';
export type AdvanceMinutes = 5 | 10 | 15 | 30;

export interface Settings {
  hourCycle: HourCycle;
  theme: ThemePreference;
  /** "Open Hourfolk as" — controls toolbar-button behavior. */
  surface: SurfacePreference;
  showSeconds: boolean;
  /** Suppresses sound and vibration for Hourfolk notifications. */
  notificationsMuted: boolean;
}

export interface SavedCity {
  id: string;
  /** Provider id when the city came from search; undefined for hand-entered zones. */
  cityId?: string;
  name: string;
  region?: string;
  country: string;
  countryCode: string;
  timeZone: IanaTimeZone;
  /** User-provided label overriding `name`. */
  label?: string;
  addedAt: number;
}

export interface Reminder {
  id: string;
  title: string;
  /** Exact target instant, epoch milliseconds. */
  targetMs: number;
  timeZone: IanaTimeZone;
  cityLabel: string;
  requestedDate: IsoDate;
  requestedTime: IsoTime;
  createdAt: number;
  updatedAt: number;
  enabled: boolean;
  /** Optional additional notifications before the exact target time. */
  advanceMinutes?: AdvanceMinutes[];
  /** Lead times whose advance notifications have already been shown. */
  advanceFiredMinutes?: AdvanceMinutes[];
  /** Set when the notification was shown. */
  firedAt?: number;
  /** When the user snoozed from the notification, the alarm targets this instant instead. */
  snoozedUntilMs?: number;
}

export interface HourfolkState {
  schemaVersion: number;
  settings: Settings;
  cities: SavedCity[];
  reminders: Reminder[];
}

export const STORAGE_KEYS = {
  schemaVersion: 'schemaVersion',
  settings: 'settings',
  cities: 'cities',
  reminders: 'reminders',
  uiState: 'uiState',
} as const;

export const DEFAULT_SETTINGS: Settings = {
  hourCycle: '12h',
  theme: 'system',
  surface: 'popup',
  showSeconds: true,
  notificationsMuted: false,
};

export function createDefaultState(): HourfolkState {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    cities: [],
    reminders: [],
  };
}
