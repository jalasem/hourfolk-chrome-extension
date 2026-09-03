import { useAppState, type View } from '@/app/providers/AppStateProvider';
import { useStore } from '@/app/providers/StoreProvider';
import { BellIcon, ClockIcon, PlanIcon } from './Icons';
import styles from './Nav.module.css';

const VIEWS = [
  { id: 'clocks', label: 'Clocks', icon: ClockIcon },
  { id: 'plan', label: 'Plan', icon: PlanIcon },
  { id: 'reminders', label: 'Reminders', icon: BellIcon },
] satisfies { id: View; label: string; icon: typeof ClockIcon }[];

export function Nav() {
  const { view, setView } = useAppState();
  const { state } = useStore();
  const upcoming = state.reminders.filter((r) => r.enabled && !r.firedAt).length;

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const index = VIEWS.findIndex((v) => v.id === view);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % VIEWS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + VIEWS.length) % VIEWS.length;
    else return;
    event.preventDefault();
    const target = VIEWS[next];
    if (!target) return;
    setView(target.id);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
  };

  return (
    <nav className={styles.nav} aria-label="Views">
      <div className={styles.tabs} role="tablist" onKeyDown={onKeyDown}>
        {VIEWS.map((item) => {
          const selected = item.id === view;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`view-${item.id}`}
              id={`tab-${item.id}`}
              tabIndex={selected ? 0 : -1}
              className={[styles.tab, selected ? styles.selected : ''].join(' ')}
              onClick={() => setView(item.id)}
            >
              <Icon size={15} />
              {item.label}
              {item.id === 'reminders' && upcoming > 0 ? (
                <span className={styles.count} aria-label={`${upcoming} upcoming`}>
                  {upcoming}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
