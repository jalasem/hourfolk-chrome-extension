import { isIsoDate, isIsoTime } from '@/domain/time/iso';
import type { HourCycle, IsoDate, IsoTime } from '@/domain/time/types';
import { isValidTimeZone } from '@/domain/time/zone-clock';
import {
  DEFAULT_SETTINGS,
  type Reminder,
  type SavedCity,
  type Settings,
  type SurfacePreference,
  type ThemePreference,
} from './schema';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const HOUR_CYCLES: readonly HourCycle[] = ['12h', '24h'];
const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];
const SURFACES: readonly SurfacePreference[] = ['popup', 'sidepanel', 'page'];
const ADVANCE_MINUTES = [30, 15, 10, 5] as const;

function normalizeAdvanceMinutes(value: unknown): (typeof ADVANCE_MINUTES)[number][] {
  const candidates = Array.isArray(value) ? value : [value];
  return ADVANCE_MINUTES.filter((minutes) => candidates.includes(minutes));
}

/** Fills in defaults for missing fields and rejects out-of-range enum values. */
export function normalizeSettings(raw: unknown): Settings {
  const source = isRecord(raw) ? raw : {};
  const hourCycle = HOUR_CYCLES.includes(source.hourCycle as HourCycle)
    ? (source.hourCycle as HourCycle)
    : DEFAULT_SETTINGS.hourCycle;
  const theme = THEMES.includes(source.theme as ThemePreference) ? (source.theme as ThemePreference) : DEFAULT_SETTINGS.theme;
  const surface = SURFACES.includes(source.surface as SurfacePreference)
    ? (source.surface as SurfacePreference)
    : DEFAULT_SETTINGS.surface;
  const showSeconds = typeof source.showSeconds === 'boolean' ? source.showSeconds : DEFAULT_SETTINGS.showSeconds;
  const notificationsMuted = typeof source.notificationsMuted === 'boolean' ? source.notificationsMuted : DEFAULT_SETTINGS.notificationsMuted;
  return { hourCycle, theme, surface, showSeconds, notificationsMuted };
}

/** Drops entries missing id/name/timeZone or with an invalid zone; dedupes by id (first occurrence wins). */
export function normalizeCities(raw: unknown): SavedCity[] {
  if (!Array.isArray(raw)) return [];
  const seenIds = new Set<string>();
  const cities: SavedCity[] = [];

  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const { id, name, timeZone } = entry;
    if (!isNonEmptyString(id) || !isNonEmptyString(name) || !isNonEmptyString(timeZone)) continue;
    if (!isValidTimeZone(timeZone)) continue;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const city: SavedCity = {
      id,
      name,
      country: isNonEmptyString(entry.country) ? entry.country : '',
      countryCode: isNonEmptyString(entry.countryCode) ? entry.countryCode : '',
      timeZone,
      addedAt: isFiniteNumber(entry.addedAt) ? entry.addedAt : Date.now(),
    };
    if (isNonEmptyString(entry.cityId)) city.cityId = entry.cityId;
    if (isNonEmptyString(entry.region)) city.region = entry.region;
    if (isNonEmptyString(entry.label)) city.label = entry.label;
    cities.push(city);
  }

  return cities;
}

/** Drops entries with a missing id, non-finite targetMs, invalid zone, or invalid requested date/time. */
export function normalizeReminders(raw: unknown): Reminder[] {
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  const reminders: Reminder[] = [];

  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const { id, targetMs, timeZone, requestedDate, requestedTime } = entry;
    if (!isNonEmptyString(id)) continue;
    if (!isFiniteNumber(targetMs)) continue;
    if (!isNonEmptyString(timeZone) || !isValidTimeZone(timeZone)) continue;
    if (!isNonEmptyString(requestedDate) || !isIsoDate(requestedDate)) continue;
    if (!isNonEmptyString(requestedTime) || !isIsoTime(requestedTime)) continue;

    const reminder: Reminder = {
      id,
      title: typeof entry.title === 'string' ? entry.title : String(entry.title ?? ''),
      targetMs,
      timeZone,
      cityLabel: typeof entry.cityLabel === 'string' ? entry.cityLabel : '',
      requestedDate: requestedDate as IsoDate,
      requestedTime: requestedTime as IsoTime,
      createdAt: isFiniteNumber(entry.createdAt) ? entry.createdAt : now,
      updatedAt: isFiniteNumber(entry.updatedAt) ? entry.updatedAt : now,
      enabled: Boolean(entry.enabled),
    };
    const advanceMinutes = normalizeAdvanceMinutes(entry.advanceMinutes);
    if (advanceMinutes.length > 0) reminder.advanceMinutes = advanceMinutes;
    const advanceFiredMinutes = normalizeAdvanceMinutes(entry.advanceFiredMinutes);
    if (advanceFiredMinutes.length > 0) reminder.advanceFiredMinutes = advanceFiredMinutes;
    if (isFiniteNumber(entry.firedAt)) reminder.firedAt = entry.firedAt;
    if (isFiniteNumber(entry.snoozedUntilMs)) reminder.snoozedUntilMs = entry.snoozedUntilMs;
    reminders.push(reminder);
  }

  return reminders;
}
