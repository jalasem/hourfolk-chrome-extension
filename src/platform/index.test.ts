import { afterEach, describe, expect, it, vi } from 'vitest';

describe('platform/index', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('falls back to memory-backed adapters outside an extension context', async () => {
    vi.resetModules();
    vi.stubGlobal('chrome', undefined);

    const { isExtensionContext, getStorageArea, getAlarmsAdapter } = await import('./index');
    expect(isExtensionContext()).toBe(false);

    const area = getStorageArea();
    await area.set({ a: 1 });
    expect(await area.get(['a'])).toEqual({ a: 1 });

    const alarms = getAlarmsAdapter();
    await alarms.create('x', Date.now() + 1000);
    expect((await alarms.getAll()).map((alarm) => alarm.name)).toEqual(['x']);
  });

  it('uses chrome-backed adapters when a chrome extension context is present', async () => {
    vi.resetModules();
    const fakeChrome = {
      storage: {
        local: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => undefined),
          remove: vi.fn(async () => undefined),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      alarms: {
        create: vi.fn(async () => undefined),
        clear: vi.fn(async () => true),
        getAll: vi.fn(async () => []),
      },
    };
    vi.stubGlobal('chrome', fakeChrome);

    const { isExtensionContext, getStorageArea, getAlarmsAdapter } = await import('./index');
    expect(isExtensionContext()).toBe(true);

    await getStorageArea().get(['x']);
    expect(fakeChrome.storage.local.get).toHaveBeenCalled();

    await getAlarmsAdapter().getAll();
    expect(fakeChrome.alarms.getAll).toHaveBeenCalled();
  });

  it('returns the same cached adapter instance on repeated calls', async () => {
    vi.resetModules();
    vi.stubGlobal('chrome', undefined);

    const { getStorageArea, getAlarmsAdapter } = await import('./index');
    expect(getStorageArea()).toBe(getStorageArea());
    expect(getAlarmsAdapter()).toBe(getAlarmsAdapter());
  });
});
