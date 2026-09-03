import { describe, expect, it } from 'vitest';
import { nextOccurrence } from './occurrence';

describe('nextOccurrence', () => {
  const NOW_MS = Date.UTC(2026, 8, 8, 12, 0); // 08:00 in America/New_York

  it('returns today when the requested time is still ahead', () => {
    const result = nextOccurrence('America/New_York', '14:00', NOW_MS);
    expect(result.date).toBe('2026-09-08');
    expect(result.epochMs).toBe(Date.UTC(2026, 8, 8, 18, 0));
    expect(result.isToday).toBe(true);
  });

  it('rolls over to tomorrow when the requested time has already passed today', () => {
    const result = nextOccurrence('America/New_York', '07:00', NOW_MS);
    expect(result.date).toBe('2026-09-09');
    expect(result.isToday).toBe(false);
  });

  it('rolls over to tomorrow when the requested time exactly equals now (strictly future)', () => {
    const result = nextOccurrence('America/New_York', '08:00', NOW_MS);
    expect(result.isToday).toBe(false);
    expect(result.date).toBe('2026-09-09');
  });

  it('uses the moved instant when today is a spring-forward gap', () => {
    const nowMs = Date.UTC(2026, 2, 8, 5, 0); // just before the New York gap
    const result = nextOccurrence('America/New_York', '02:30', nowMs);
    expect(result.isToday).toBe(true);
    expect(result.date).toBe('2026-03-08');
    expect(result.epochMs).toBe(Date.UTC(2026, 2, 8, 7, 0));
  });

  it('handles cross-midnight zones correctly', () => {
    const nowMs = Date.UTC(2026, 8, 8, 23, 30); // already 08:30 on Sep 9 in Tokyo
    const result = nextOccurrence('Asia/Tokyo', '09:00', nowMs);
    expect(result.date).toBe('2026-09-09');
    expect(result.isToday).toBe(true);
    expect(result.epochMs).toBe(Date.UTC(2026, 8, 9, 0, 0));
  });
});
