import type { Surface } from '@/app/surface';
import { useAppState } from '@/app/providers/AppStateProvider';
import { GearIcon } from './Icons';
import { IconButton } from './Button';
import styles from './TopBar.module.css';

export function TopBar({ surface, onOpenSettings }: { surface: Surface; onOpenSettings(): void }) {
  const { view, planSource } = useAppState();
  const planning = view === 'plan' && planSource !== null;
  return (
    <header className={styles.bar} data-surface={surface}>
      <div className={styles.brand}>
        <span className={styles.wordmark}>Hourfolk</span>
        <span className={[styles.status, planning ? styles.planning : styles.live].join(' ')}>
          <span className={styles.dot} aria-hidden="true" />
          {planning ? 'Planning' : 'Live'}
        </span>
      </div>
      <IconButton label="Settings" onClick={onOpenSettings}>
        <GearIcon size={18} />
      </IconButton>
    </header>
  );
}
