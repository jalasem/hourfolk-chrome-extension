import { afterEach, describe, expect, it, vi } from 'vitest';
import { showNotification } from './notifications';

describe('showNotification', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [false, false],
    [true, true],
  ])('passes silent=%s to Chrome as %s', async (silent, expected) => {
    const create = vi.fn().mockResolvedValue('notification-id');
    vi.stubGlobal('chrome', {
      runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
      notifications: { create },
    });

    await showNotification('id', {
      title: 'Title',
      message: 'Message',
      contextMessage: 'Context',
      silent,
    });

    expect(create).toHaveBeenCalledWith('id', expect.objectContaining({ silent: expected }));
  });
});
