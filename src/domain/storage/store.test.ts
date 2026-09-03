import { describe, expect, it, vi } from 'vitest';
import { createMemoryStorageArea } from '@/platform/memory/storage';
import { DEFAULT_SETTINGS, STORAGE_KEYS, type Reminder } from './schema';
import { createHourfolkStore } from './store';

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'r1',
    title: 'Test',
    targetMs: 1000,
    timeZone: 'UTC',
    cityLabel: 'UTC',
    requestedDate: '2026-01-01',
    requestedTime: '00:00',
    createdAt: 1000,
    updatedAt: 1000,
    enabled: true,
    ...overrides,
  };
}

describe('createHourfolkStore', () => {
  it('returns the default state before load() resolves', () => {
    const store = createHourfolkStore(createMemoryStorageArea());
    expect(store.getState().schemaVersion).toBe(2);
    expect(store.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(store.getState().cities).toEqual([]);
    expect(store.getState().reminders).toEqual([]);
  });

  it('load() persists migrated defaults into empty storage', async () => {
    const area = createMemoryStorageArea();
    const store = createHourfolkStore(area);
    const state = await store.load();
    expect(state.schemaVersion).toBe(2);

    const stored = await area.get();
    expect(stored[STORAGE_KEYS.schemaVersion]).toBe(2);
    expect(stored[STORAGE_KEYS.settings]).toEqual(DEFAULT_SETTINGS);
    expect(stored[STORAGE_KEYS.cities]).toEqual([]);
    expect(stored[STORAGE_KEYS.reminders]).toEqual([]);
  });

  it('updateSettings merges into current settings and notifies subscribers', async () => {
    const store = createHourfolkStore(createMemoryStorageArea());
    await store.load();
    const listener = vi.fn();
    store.subscribe(listener);

    await store.updateSettings({ hourCycle: '24h' });

    expect(store.getState().settings.hourCycle).toBe('24h');
    expect(store.getState().settings.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(listener).toHaveBeenCalled();
  });

  it('reflects an external write to the same storage area', async () => {
    const area = createMemoryStorageArea();
    const store = createHourfolkStore(area);
    await store.load();

    // Simulate another surface (e.g. the dashboard tab) writing directly to the shared area.
    await area.set({ [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS, hourCycle: '24h' } });

    expect(store.getState().settings.hourCycle).toBe('24h');
  });

  it('upsertReminder inserts new reminders and replaces existing ones by id', async () => {
    const store = createHourfolkStore(createMemoryStorageArea());
    await store.load();

    await store.upsertReminder(makeReminder({ id: 'a', title: 'First' }));
    await store.upsertReminder(makeReminder({ id: 'b', title: 'Second' }));
    expect(store.getState().reminders.map((r) => r.id)).toEqual(['a', 'b']);

    await store.upsertReminder(makeReminder({ id: 'a', title: 'First updated' }));
    expect(store.getState().reminders).toHaveLength(2);
    expect(store.getState().reminders.find((r) => r.id === 'a')?.title).toBe('First updated');
  });

  it('removeReminder removes by id', async () => {
    const store = createHourfolkStore(createMemoryStorageArea());
    await store.load();
    await store.upsertReminder(makeReminder({ id: 'a' }));
    await store.upsertReminder(makeReminder({ id: 'b' }));

    await store.removeReminder('a');
    expect(store.getState().reminders.map((r) => r.id)).toEqual(['b']);
  });

  it('unsubscribe stops further notifications', async () => {
    const store = createHourfolkStore(createMemoryStorageArea());
    await store.load();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    await store.updateSettings({ hourCycle: '24h' });
    expect(listener).not.toHaveBeenCalled();
  });
});
