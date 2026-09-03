import { jsonEqual } from './deep-equal';
import { DEFAULT_SETTINGS, SCHEMA_VERSION, STORAGE_KEYS, type HourfolkState } from './schema';
import { normalizeCities, normalizeReminders, normalizeSettings } from './validate';

export interface Migration {
  from: number;
  to: number;
  run(raw: Record<string, unknown>): Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** V2 expands one optional advance alert into a list while preserving existing user choices. */
export const migrations: Migration[] = [
  { from: 0, to: 1, run: (raw) => raw },
  {
    from: 1,
    to: 2,
    run: (raw) => {
      const storedReminders = raw[STORAGE_KEYS.reminders];
      const reminders = Array.isArray(storedReminders)
        ? storedReminders.map((value) => {
            if (!isRecord(value) || typeof value.advanceMinutes !== 'number') return value;
            const { advanceFiredAt, ...rest } = value;
            return {
              ...rest,
              advanceMinutes: [value.advanceMinutes],
              ...(typeof advanceFiredAt === 'number' ? { advanceFiredMinutes: [value.advanceMinutes] } : {}),
            };
          })
        : [];
      return { ...raw, [STORAGE_KEYS.reminders]: reminders };
    },
  },
];

export interface MigrateResult {
  state: HourfolkState;
  changed: boolean;
  fromVersion: number;
}

function readVersion(raw: Record<string, unknown>): number {
  const value = raw[STORAGE_KEYS.schemaVersion];
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

/**
 * Applies `steps` (ascending by `from`) starting at the stored schema version up to `targetVersion`,
 * then normalizes each slice. A stored version newer than `targetVersion` is left as-is (normalized)
 * rather than downgraded.
 */
export function migrateRaw(
  raw: Record<string, unknown>,
  steps: Migration[] = migrations,
  targetVersion: number = SCHEMA_VERSION,
): MigrateResult {
  const fromVersion = readVersion(raw);
  let version = fromVersion;
  let data: Record<string, unknown> = { ...raw };

  const ordered = [...steps].sort((a, b) => a.from - b.from);
  for (const step of ordered) {
    if (version >= targetVersion) break;
    if (step.from !== version) continue;
    data = step.run(data);
    version = step.to;
  }

  const migratedSettings = data[STORAGE_KEYS.settings];
  const migratedCities = data[STORAGE_KEYS.cities];
  const migratedReminders = data[STORAGE_KEYS.reminders];

  const settings = normalizeSettings(migratedSettings);
  const cities = normalizeCities(migratedCities);
  const reminders = normalizeReminders(migratedReminders);

  const normalizationChanged =
    !jsonEqual(migratedSettings ?? DEFAULT_SETTINGS, settings) ||
    !jsonEqual(migratedCities ?? [], cities) ||
    !jsonEqual(migratedReminders ?? [], reminders);

  // Treat a missing slice as "changed" (it will be written for the first time), even if it
  // happens to normalize to the same shape as an equivalent default.
  const hadAllSlices =
    STORAGE_KEYS.settings in data && STORAGE_KEYS.cities in data && STORAGE_KEYS.reminders in data;

  const changed = version !== fromVersion || normalizationChanged || !hadAllSlices;

  const state: HourfolkState = { schemaVersion: version, settings, cities, reminders };
  return { state, changed, fromVersion };
}
