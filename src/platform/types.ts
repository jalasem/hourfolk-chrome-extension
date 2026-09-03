/**
 * Thin, promise-based contracts over the Chrome APIs Hourfolk uses.
 * Domain code depends only on these interfaces so it can run under Vitest
 * with in-memory fakes and in a plain browser tab during development.
 */
export interface StorageChange {
  oldValue?: unknown;
  newValue?: unknown;
}

export type StorageChanges = Record<string, StorageChange>;

export interface StorageArea {
  get(keys?: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
  /** Returns an unsubscribe function. */
  onChanged(listener: (changes: StorageChanges) => void): () => void;
}

export interface AlarmInfo {
  name: string;
  /** Epoch milliseconds. */
  scheduledTime: number;
}

export interface AlarmsAdapter {
  create(name: string, whenMs: number): Promise<void>;
  clear(name: string): Promise<boolean>;
  getAll(): Promise<AlarmInfo[]>;
}
