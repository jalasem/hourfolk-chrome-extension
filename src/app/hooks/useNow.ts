import { useSyncExternalStore } from 'react';
import { getClockNow, subscribeClock } from '@/app/clock-store';

/** Current time from the shared loop, rounded to the requested granularity so renders stay cheap. */
export function useNow(granularity: 'second' | 'minute' = 'second'): number {
  const unit = granularity === 'minute' ? 60_000 : 1000;
  return useSyncExternalStore(
    subscribeClock,
    () => Math.floor(getClockNow() / unit) * unit,
    () => Math.floor(Date.now() / unit) * unit,
  );
}
