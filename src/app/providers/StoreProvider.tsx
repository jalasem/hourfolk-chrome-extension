import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { getAlarmsAdapter, getStorageArea } from '@/platform';
import { createHourfolkStore, type HourfolkStore } from '@/domain/storage';
import type { HourfolkState, Reminder, SavedCity, Settings } from '@/domain/storage/schema';
import { reconcileReminderAlarms } from '@/domain/reminders';
import type { CityEntry } from '@/domain/cities/types';

export interface StoreActions {
  updateSettings(patch: Partial<Settings>): Promise<void>;
  addCity(entry: CityEntry): Promise<SavedCity>;
  renameCity(id: string, label: string): Promise<void>;
  moveCity(id: string, direction: -1 | 1): Promise<void>;
  removeCity(id: string): Promise<void>;
  saveReminder(reminder: Reminder): Promise<void>;
  deleteReminder(id: string): Promise<void>;
  setReminderEnabled(id: string, enabled: boolean): Promise<void>;
}

interface StoreContextValue {
  state: HourfolkState;
  ready: boolean;
  actions: StoreActions;
}

const StoreContext = createContext<StoreContextValue | null>(null);

let sharedStore: HourfolkStore | undefined;
function getStore(): HourfolkStore {
  sharedStore ??= createHourfolkStore(getStorageArea());
  return sharedStore;
}

function newCityId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useMemo(getStore, []);
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void store.load().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const actions = useMemo<StoreActions>(() => {
    const reconcile = async (reminders: Reminder[]) => {
      await reconcileReminderAlarms(reminders, getAlarmsAdapter(), Date.now());
    };
    return {
      updateSettings: (patch) => store.updateSettings(patch),
      async addCity(entry) {
        const city: SavedCity = {
          id: newCityId(),
          cityId: entry.id,
          name: entry.name,
          ...(entry.region ? { region: entry.region } : {}),
          country: entry.country,
          countryCode: entry.countryCode,
          timeZone: entry.timeZone,
          addedAt: Date.now(),
        };
        await store.setCities([...store.getState().cities, city]);
        return city;
      },
      async renameCity(id, label) {
        const trimmed = label.trim();
        await store.setCities(
          store.getState().cities.map((c) => {
            if (c.id !== id) return c;
            const { label: _old, ...rest } = c;
            return trimmed && trimmed !== c.name ? { ...rest, label: trimmed } : rest;
          }),
        );
      },
      async moveCity(id, direction) {
        const cities = [...store.getState().cities];
        const index = cities.findIndex((c) => c.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= cities.length) return;
        const [item] = cities.splice(index, 1);
        if (!item) return;
        cities.splice(target, 0, item);
        await store.setCities(cities);
      },
      async removeCity(id) {
        await store.setCities(store.getState().cities.filter((c) => c.id !== id));
      },
      async saveReminder(reminder) {
        await store.upsertReminder(reminder);
        await reconcile(store.getState().reminders);
      },
      async deleteReminder(id) {
        await store.removeReminder(id);
        await reconcile(store.getState().reminders);
      },
      async setReminderEnabled(id, enabled) {
        const existing = store.getState().reminders.find((r) => r.id === id);
        if (!existing) return;
        const { firedAt: _fired, snoozedUntilMs: _snooze, ...rest } = existing;
        await store.upsertReminder({ ...rest, enabled, updatedAt: Date.now() });
        await reconcile(store.getState().reminders);
      },
    };
  }, [store]);

  const value = useMemo(() => ({ state, ready, actions }), [state, ready, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
