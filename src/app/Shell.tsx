import { useEffect } from 'react';
import type { Surface } from './surface';
import { useStore } from './providers/StoreProvider';
import { useAppState } from './providers/AppStateProvider';
import { useTheme } from './hooks/useTheme';
import { useCityProviderReady } from './hooks/useCityProvider';
import { TopBar } from './components/TopBar';
import { Nav } from './components/Nav';
import { ClocksView } from './views/ClocksView';
import { PlanView } from './views/PlanView';
import { RemindersView } from './views/RemindersView';
import { SettingsDialog } from './views/SettingsDialog';
import styles from './Shell.module.css';

export function Shell({ surface }: { surface: Surface }) {
  const { state, ready } = useStore();
  const { view, settingsOpen, setSettingsOpen } = useAppState();
  useTheme(state.settings.theme);
  useCityProviderReady();

  useEffect(() => {
    document.body.dataset['surface'] = surface;
  }, [surface]);

  return (
    <div className={styles.shell} data-surface={surface}>
      <div className={styles.column}>
        <TopBar surface={surface} onOpenSettings={() => setSettingsOpen(true)} />
        <Nav />
        <main className={styles.main} aria-busy={!ready}>
          {view === 'clocks' ? <ClocksView ready={ready} /> : null}
          {view === 'plan' ? <PlanView /> : null}
          {view === 'reminders' ? <RemindersView /> : null}
        </main>
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} surface={surface} />
    </div>
  );
}
