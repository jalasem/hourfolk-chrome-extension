import type { StorageArea, StorageChanges } from '@/platform/types';

/** Wraps a `chrome.storage.StorageArea` (defaults to `local`) behind the platform-neutral `StorageArea` contract. */
export function createChromeStorageArea(area: chrome.storage.StorageArea = chrome.storage.local): StorageArea {
  return {
    async get(keys) {
      return (await area.get(keys ?? null)) as Record<string, unknown>;
    },
    async set(items) {
      await area.set(items);
    },
    async remove(keys) {
      await area.remove(keys);
    },
    onChanged(listener) {
      const handler = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
        if (areaName !== 'local') return;
        listener(changes as StorageChanges);
      };
      chrome.storage.onChanged.addListener(handler);
      return () => chrome.storage.onChanged.removeListener(handler);
    },
  };
}
