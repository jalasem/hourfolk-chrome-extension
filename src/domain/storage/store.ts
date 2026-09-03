import type { StorageArea, StorageChanges } from '@/platform/types';
import { jsonEqual } from './deep-equal';
import { migrateRaw } from './migrations';
import { createDefaultState, STORAGE_KEYS, type HourfolkState, type Reminder, type SavedCity, type Settings } from './schema';
import { normalizeCities, normalizeReminders, normalizeSettings } from './validate';

export interface HourfolkStore {
  /** Reads storage, migrates/normalizes it, persists any resulting change, and starts listening for external changes. */
  load(): Promise<HourfolkState>;
  /** The cached snapshot; `createDefaultState()` until `load()` resolves. */
  getState(): HourfolkState;
  /** Fires after any local write or externally-observed change. Returns an unsubscribe function. */
  subscribe(listener: (state: HourfolkState) => void): () => void;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  setCities(cities: SavedCity[]): Promise<void>;
  setReminders(reminders: Reminder[]): Promise<void>;
  upsertReminder(reminder: Reminder): Promise<void>;
  removeReminder(id: string): Promise<void>;
}

export function createHourfolkStore(area: StorageArea): HourfolkStore {
  let snapshot: HourfolkState = createDefaultState();
  const listeners = new Set<(state: HourfolkState) => void>();
  let unsubscribeExternal: (() => void) | undefined;

  function commit(next: HourfolkState): void {
    if (jsonEqual(next, snapshot)) return;
    snapshot = next;
    for (const listener of listeners) listener(snapshot);
  }

  function applyChanges(changes: StorageChanges): void {
    let next = snapshot;

    if (STORAGE_KEYS.schemaVersion in changes) {
      const value = changes[STORAGE_KEYS.schemaVersion]?.newValue;
      if (typeof value === 'number') next = { ...next, schemaVersion: value };
    }
    if (STORAGE_KEYS.settings in changes) {
      next = { ...next, settings: normalizeSettings(changes[STORAGE_KEYS.settings]?.newValue) };
    }
    if (STORAGE_KEYS.cities in changes) {
      next = { ...next, cities: normalizeCities(changes[STORAGE_KEYS.cities]?.newValue) };
    }
    if (STORAGE_KEYS.reminders in changes) {
      next = { ...next, reminders: normalizeReminders(changes[STORAGE_KEYS.reminders]?.newValue) };
    }

    commit(next);
  }

  async function persist(state: HourfolkState): Promise<void> {
    await area.set({
      [STORAGE_KEYS.schemaVersion]: state.schemaVersion,
      [STORAGE_KEYS.settings]: state.settings,
      [STORAGE_KEYS.cities]: state.cities,
      [STORAGE_KEYS.reminders]: state.reminders,
    });
  }

  async function load(): Promise<HourfolkState> {
    const raw = await area.get();
    const { state, changed } = migrateRaw(raw);
    if (changed) {
      await persist(state);
    }
    if (!unsubscribeExternal) {
      unsubscribeExternal = area.onChanged(applyChanges);
    }
    commit(state);
    return snapshot;
  }

  /**
   * Optimistic write: the snapshot (and therefore the UI) updates immediately, the promise
   * resolves once storage has the value, and a failed write restores the previous snapshot.
   */
  async function write(key: string, value: unknown, next: HourfolkState): Promise<void> {
    const previous = snapshot;
    commit(next);
    try {
      await area.set({ [key]: value });
    } catch (err) {
      commit(previous);
      throw err;
    }
  }

  async function updateSettings(patch: Partial<Settings>): Promise<void> {
    const settings: Settings = { ...snapshot.settings, ...patch };
    await write(STORAGE_KEYS.settings, settings, { ...snapshot, settings });
  }

  async function setCities(cities: SavedCity[]): Promise<void> {
    await write(STORAGE_KEYS.cities, cities, { ...snapshot, cities });
  }

  async function setReminders(reminders: Reminder[]): Promise<void> {
    await write(STORAGE_KEYS.reminders, reminders, { ...snapshot, reminders });
  }

  async function upsertReminder(reminder: Reminder): Promise<void> {
    const index = snapshot.reminders.findIndex((r) => r.id === reminder.id);
    const reminders =
      index === -1 ? [...snapshot.reminders, reminder] : snapshot.reminders.map((r, i) => (i === index ? reminder : r));
    await setReminders(reminders);
  }

  async function removeReminder(id: string): Promise<void> {
    await setReminders(snapshot.reminders.filter((r) => r.id !== id));
  }

  return {
    load,
    getState: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    updateSettings,
    setCities,
    setReminders,
    upsertReminder,
    removeReminder,
  };
}
