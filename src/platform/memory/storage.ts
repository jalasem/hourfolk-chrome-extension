import type { StorageArea, StorageChanges } from '@/platform/types';

const PERSIST_KEY = 'hourfolk:storage';

export interface MemoryStorageOptions {
  /** When provided (e.g. `window.localStorage`), the store reads/writes through it for a plain-browser dev fallback. */
  persistTo?: Storage;
}

function readPersisted(storage: Storage | undefined): Record<string, unknown> | undefined {
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(PERSIST_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

/** In-memory `StorageArea` used by tests and (optionally, via `persistTo`) as the plain-browser dev fallback. */
export function createMemoryStorageArea(
  initial?: Record<string, unknown>,
  options: MemoryStorageOptions = {},
): StorageArea {
  const persistTo = options.persistTo;
  const data: Record<string, unknown> = structuredClone(initial ?? readPersisted(persistTo) ?? {});
  const listeners = new Set<(changes: StorageChanges) => void>();

  const persist = (): void => {
    if (!persistTo) return;
    try {
      persistTo.setItem(PERSIST_KEY, JSON.stringify(data));
    } catch {
      // Quota exceeded or privacy mode; the in-memory copy stays authoritative for this session.
    }
  };

  const emit = (changes: StorageChanges): void => {
    if (Object.keys(changes).length === 0) return;
    const snapshot = structuredClone(changes);
    for (const listener of listeners) listener(snapshot);
  };

  return {
    async get(keys) {
      if (!keys) return structuredClone(data);
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        if (key in data) result[key] = structuredClone(data[key]);
      }
      return result;
    },
    async set(items) {
      const changes: StorageChanges = {};
      for (const [key, value] of Object.entries(items)) {
        const hadKey = key in data;
        const newValue = structuredClone(value);
        changes[key] = hadKey ? { oldValue: structuredClone(data[key]), newValue } : { newValue };
        data[key] = newValue;
      }
      persist();
      emit(changes);
    },
    async remove(keys) {
      const changes: StorageChanges = {};
      for (const key of keys) {
        if (!(key in data)) continue;
        changes[key] = { oldValue: structuredClone(data[key]) };
        delete data[key];
      }
      persist();
      emit(changes);
    },
    onChanged(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
