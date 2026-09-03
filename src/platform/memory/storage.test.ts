import { describe, expect, it, vi } from 'vitest';
import { createMemoryStorageArea } from './storage';

describe('createMemoryStorageArea', () => {
  it('sets and gets values', async () => {
    const area = createMemoryStorageArea();
    await area.set({ a: 1, b: 'two' });
    expect(await area.get()).toEqual({ a: 1, b: 'two' });
    expect(await area.get(['a'])).toEqual({ a: 1 });
    expect(await area.get(['missing'])).toEqual({});
  });

  it('removes values', async () => {
    const area = createMemoryStorageArea({ a: 1, b: 2 });
    await area.remove(['a']);
    expect(await area.get()).toEqual({ b: 2 });
  });

  it('emits onChanged with old/new values on set', async () => {
    const area = createMemoryStorageArea({ a: 1 });
    const listener = vi.fn();
    area.onChanged(listener);
    await area.set({ a: 2, c: 3 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      a: { oldValue: 1, newValue: 2 },
      c: { newValue: 3 },
    });
  });

  it('emits onChanged with oldValue only on remove', async () => {
    const area = createMemoryStorageArea({ a: 1 });
    const listener = vi.fn();
    area.onChanged(listener);
    await area.remove(['a']);
    expect(listener).toHaveBeenCalledWith({ a: { oldValue: 1 } });
  });

  it('does not emit when removing a missing key', async () => {
    const area = createMemoryStorageArea();
    const listener = vi.fn();
    area.onChanged(listener);
    await area.remove(['missing']);
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops emitting after unsubscribe', async () => {
    const area = createMemoryStorageArea();
    const listener = vi.fn();
    const unsubscribe = area.onChanged(listener);
    unsubscribe();
    await area.set({ a: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('clones stored values so callers cannot mutate internal state', async () => {
    const area = createMemoryStorageArea();
    const original = { nested: { count: 1 } };
    await area.set({ obj: original });
    original.nested.count = 999;

    const stored = (await area.get(['obj'])).obj as typeof original;
    expect(stored.nested.count).toBe(1);

    stored.nested.count = 42;
    const storedAgain = (await area.get(['obj'])).obj as typeof original;
    expect(storedAgain.nested.count).toBe(1);
  });

  it('reads initial data provided to the constructor', async () => {
    const area = createMemoryStorageArea({ seeded: true });
    expect(await area.get()).toEqual({ seeded: true });
  });
});
