import { useEffect, useState } from 'react';
import { cityProvider } from '@/domain/cities';

/** Kicks off the lazy dataset load and reports readiness. */
export function useCityProviderReady(): boolean {
  const [ready, setReady] = useState(cityProvider.isReady());
  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    void cityProvider.ready().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);
  return ready;
}
