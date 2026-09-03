import type { Surface } from './surface';
import { StoreProvider } from './providers/StoreProvider';
import { AppStateProvider } from './providers/AppStateProvider';
import { ToastProvider } from './providers/ToastProvider';
import { Shell } from './Shell';

export function App({ surface }: { surface: Surface }) {
  return (
    <StoreProvider>
      <AppStateProvider>
        <ToastProvider>
          <Shell surface={surface} />
        </ToastProvider>
      </AppStateProvider>
    </StoreProvider>
  );
}
