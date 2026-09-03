import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS, type Settings } from './schema';
import { migrateRaw, type Migration } from './migrations';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validSettings(overrides: Partial<Settings> = {}): Settings {
  return { hourCycle: '24h', theme: 'dark', surface: 'sidepanel', showSeconds: false, notificationsMuted: false, ...overrides };
}

function validCity() {
  return {
    id: 'city1',
    cityId: 'geo1',
    name: 'Paris',
    region: 'Ile-de-France',
    country: 'France',
    countryCode: 'FR',
    timeZone: 'Europe/Paris',
    label: 'Home Paris',
    addedAt: 1000,
  };
}

function validReminder() {
  return {
    id: 'rem1',
    title: 'Standup',
    targetMs: 2000,
    timeZone: 'Europe/Paris',
    cityLabel: 'Paris',
    requestedDate: '2026-01-02',
    requestedTime: '09:00',
    createdAt: 500,
    updatedAt: 500,
    enabled: true,
  };
}

describe('migrateRaw', () => {
  it('turns empty storage into defaults at schemaVersion 2, marked changed', () => {
    const result = migrateRaw({});
    expect(result.fromVersion).toBe(0);
    expect(result.state.schemaVersion).toBe(2);
    expect(result.state.cities).toEqual([]);
    expect(result.state.reminders).toEqual([]);
    expect(result.changed).toBe(true);
  });

  it('leaves valid v2 data unchanged', () => {
    const raw = {
      [STORAGE_KEYS.schemaVersion]: 2,
      [STORAGE_KEYS.settings]: validSettings(),
      [STORAGE_KEYS.cities]: [validCity()],
      [STORAGE_KEYS.reminders]: [validReminder()],
    };
    const result = migrateRaw(raw);
    expect(result.changed).toBe(false);
    expect(result.state.schemaVersion).toBe(2);
    expect(result.state.settings).toEqual(validSettings());
    expect(result.state.cities).toEqual([validCity()]);
    expect(result.state.reminders).toEqual([validReminder()]);
  });

  it('fills in missing settings keys and marks changed', () => {
    const raw = {
      [STORAGE_KEYS.schemaVersion]: 1,
      [STORAGE_KEYS.settings]: { hourCycle: '24h' },
      [STORAGE_KEYS.cities]: [],
      [STORAGE_KEYS.reminders]: [],
    };
    const result = migrateRaw(raw);
    expect(result.changed).toBe(true);
    expect(result.state.settings).toEqual({ hourCycle: '24h', theme: 'system', surface: 'popup', showSeconds: true, notificationsMuted: false });
  });

  it('resets an invalid hourCycle to the default', () => {
    const raw = {
      [STORAGE_KEYS.schemaVersion]: 1,
      [STORAGE_KEYS.settings]: { hourCycle: 'bogus', theme: 'dark', surface: 'popup', showSeconds: true },
      [STORAGE_KEYS.cities]: [],
      [STORAGE_KEYS.reminders]: [],
    };
    const result = migrateRaw(raw);
    expect(result.changed).toBe(true);
    expect(result.state.settings.hourCycle).toBe('12h');
  });

  it('drops cities with an invalid time zone', () => {
    const raw = {
      [STORAGE_KEYS.schemaVersion]: 1,
      [STORAGE_KEYS.settings]: validSettings(),
      [STORAGE_KEYS.cities]: [validCity(), { ...validCity(), id: 'city2', timeZone: 'Not/AZone' }],
      [STORAGE_KEYS.reminders]: [],
    };
    const result = migrateRaw(raw);
    expect(result.changed).toBe(true);
    expect(result.state.cities).toEqual([validCity()]);
  });

  it('drops reminders with a bad requested date', () => {
    const raw = {
      [STORAGE_KEYS.schemaVersion]: 1,
      [STORAGE_KEYS.settings]: validSettings(),
      [STORAGE_KEYS.cities]: [],
      [STORAGE_KEYS.reminders]: [validReminder(), { ...validReminder(), id: 'rem2', requestedDate: '2026-13-40' }],
    };
    const result = migrateRaw(raw);
    expect(result.changed).toBe(true);
    expect(result.state.reminders).toEqual([validReminder()]);
  });

  it('preserves data and does not downgrade a schemaVersion newer than known', () => {
    const raw = {
      [STORAGE_KEYS.schemaVersion]: 3,
      [STORAGE_KEYS.settings]: validSettings(),
      [STORAGE_KEYS.cities]: [validCity()],
      [STORAGE_KEYS.reminders]: [validReminder()],
    };
    const result = migrateRaw(raw);
    expect(result.fromVersion).toBe(3);
    expect(result.state.schemaVersion).toBe(3);
    expect(result.changed).toBe(false);
  });

  it('migrates a v1 single advance alert and its fired state to arrays', () => {
    const raw = {
      [STORAGE_KEYS.schemaVersion]: 1,
      [STORAGE_KEYS.settings]: { ...validSettings(), notificationsMuted: undefined },
      [STORAGE_KEYS.cities]: [],
      [STORAGE_KEYS.reminders]: [{ ...validReminder(), advanceMinutes: 15, advanceFiredAt: 123 }],
    };
    const result = migrateRaw(raw);
    expect(result.state.schemaVersion).toBe(2);
    expect(result.state.settings.notificationsMuted).toBe(false);
    expect(result.state.reminders[0]?.advanceMinutes).toEqual([15]);
    expect(result.state.reminders[0]?.advanceFiredMinutes).toEqual([15]);
    expect(result.state.reminders[0]).not.toHaveProperty('advanceFiredAt');
  });

  it('applies an injected extra migration step in ascending order when targetVersion is overridden', () => {
    const step1: Migration = {
      from: 0,
      to: 1,
      run: (raw) => ({
        ...raw,
        settings: { ...(isPlainObject(raw.settings) ? raw.settings : {}), hourCycle: '24h' },
      }),
    };
    const step2: Migration = {
      from: 1,
      to: 2,
      run: (raw) => {
        const settings = isPlainObject(raw.settings) ? raw.settings : {};
        const theme = settings.hourCycle === '24h' ? 'dark' : 'light';
        return { ...raw, settings: { ...settings, theme } };
      },
    };

    // Passed out of order on purpose to prove migrateRaw sorts by `from` before applying.
    const result = migrateRaw({}, [step2, step1], 2);

    expect(result.fromVersion).toBe(0);
    expect(result.state.schemaVersion).toBe(2);
    expect(result.state.settings.hourCycle).toBe('24h');
    // Only reachable if step1 ran before step2 (step2 reads the hourCycle step1 set).
    expect(result.state.settings.theme).toBe('dark');
    expect(result.changed).toBe(true);
  });
});
