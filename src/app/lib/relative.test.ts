import { describe, expect, it } from 'vitest';
import { formatRelativeDuration } from './relative';

const NOW = Date.UTC(2026, 8, 3, 12, 0);

describe('formatRelativeDuration', () => {
  it('shows hours and minutes for a future planned time', () => {
    expect(formatRelativeDuration(NOW + 2 * 60 * 60_000 + 15 * 60_000, NOW)).toBe('in 2 hours 15 minutes');
  });

  it('shows a concise two-unit duration for longer distances', () => {
    expect(formatRelativeDuration(NOW + 2 * 24 * 60 * 60_000 + 3 * 60 * 60_000 + 20 * 60_000, NOW)).toBe('in 2 days 3 hours');
  });

  it('describes past and current instants', () => {
    expect(formatRelativeDuration(NOW - 45 * 60_000, NOW)).toBe('45 minutes ago');
    expect(formatRelativeDuration(NOW + 20_000, NOW)).toBe('now');
  });
});
