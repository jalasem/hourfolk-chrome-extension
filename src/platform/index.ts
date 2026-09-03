import { createChromeAlarmsAdapter } from './chrome/alarms';
import { createChromeStorageArea } from './chrome/storage';
import { createMemoryAlarmsAdapter } from './memory/alarms';
import { createMemoryStorageArea } from './memory/storage';
import type { AlarmsAdapter, StorageArea } from './types';

export function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

let storageArea: StorageArea | undefined;
let alarmsAdapter: AlarmsAdapter | undefined;

/** The Chrome-backed storage area in the extension, or an in-memory one (persisted to `localStorage` when available) in a plain tab. */
export function getStorageArea(): StorageArea {
  if (!storageArea) {
    if (isExtensionContext()) {
      storageArea = createChromeStorageArea();
    } else {
      const persistTo = typeof window !== 'undefined' ? window.localStorage : undefined;
      storageArea = createMemoryStorageArea(undefined, persistTo ? { persistTo } : {});
    }
  }
  return storageArea;
}

/** The Chrome-backed alarms adapter in the extension, or an in-memory one in a plain tab. */
export function getAlarmsAdapter(): AlarmsAdapter {
  if (!alarmsAdapter) {
    alarmsAdapter = isExtensionContext() ? createChromeAlarmsAdapter() : createMemoryAlarmsAdapter();
  }
  return alarmsAdapter;
}

export type { AlarmInfo, AlarmsAdapter, StorageArea, StorageChange, StorageChanges } from './types';
