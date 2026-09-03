import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/app/providers/StoreProvider';
import { useNow } from '@/app/hooks/useNow';
import { useCityProviderReady } from '@/app/hooks/useCityProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { abbreviationFallback, describeLocalLocation } from '@/app/lib/local';
import { cityProvider } from '@/domain/cities';
import type { CityEntry } from '@/domain/cities/types';
import { getDeviceTimeZone } from '@/domain/time/zone-clock';
import { describeInstant } from '@/domain/time/format';
import { dayRelation, offsetDifference } from '@/domain/time/relations';
import type { SavedCity } from '@/domain/storage/schema';
import { Button } from '@/app/components/Button';
import { Badge } from '@/app/components/Badge';
import { EmptyState } from '@/app/components/EmptyState';
import { TimeOrbitIllustration } from '@/app/components/EmptyStateIllustrations';
import { MenuButton } from '@/app/components/MenuButton';
import { CityCombobox } from '@/app/components/CityCombobox';
import { PlusIcon } from '@/app/components/Icons';
import inputStyles from '@/app/components/inputs.module.css';
import styles from './ClocksView.module.css';

const SUGGESTIONS = ['New York', 'London', 'Tokyo', 'Sydney'];

export function ClocksView({ ready }: { ready: boolean }) {
  const { state, actions } = useStore();
  const { hourCycle, showSeconds } = state.settings;
  const localZone = useMemo(getDeviceTimeZone, []);
  const local = useMemo(() => describeLocalLocation(localZone), [localZone]);
  const now = useNow(showSeconds ? 'second' : 'minute');
  const [adding, setAdding] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const refocusAdd = useRef(false);
  const { notify } = useToast();

  useEffect(() => {
    if (!adding && refocusAdd.current) {
      refocusAdd.current = false;
      addButtonRef.current?.focus();
    }
  }, [adding, state.cities.length]);

  const hero = describeInstant(now, localZone, { hourCycle, abbreviationFallback });

  const addCity = async (entry: CityEntry) => {
    await actions.addCity(entry);
    refocusAdd.current = true;
    setAdding(false);
    notify(`Added ${entry.name}`);
  };

  return (
    <section id="view-clocks" role="tabpanel" aria-labelledby="tab-clocks" className={styles.view}>
      <article className={styles.hero} aria-label="Local time">
        <p className={styles.heroTime}>
          <span className={styles.heroClock}>{hero.clock}</span>
          {showSeconds ? <span className={styles.heroSeconds}>{hero.timeWithSeconds.replace(hero.period, '').trim().slice(-3)}</span> : null}
          {hero.period ? <span className={styles.heroPeriod}>{hero.period}</span> : null}
        </p>
        <p className={styles.heroDate}>
          {hero.weekday}, {hero.date}
        </p>
        <p className={styles.heroMeta}>
          <span className={styles.heroPlace}>{local.name}</span>
          <span className={styles.heroDetail}>{local.known ? local.detail : local.timeZone}</span>
          <span className={styles.heroZone}>
            {hero.abbreviation.startsWith('GMT') || hero.abbreviation.startsWith('UTC') ? '' : `${hero.abbreviation} · `}
            {hero.utcOffset}
          </span>
        </p>
      </article>

      {ready && adding ? (
        <div className={styles.addPanel}>
          <label className="visually-hidden" htmlFor="add-city-input">
            Search for a city to add
          </label>
          <CityCombobox id="add-city-input" value={null} onSelect={addCity} onCancel={() => setAdding(false)} autoFocus />
          <div className={styles.addActions}>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {!ready ? (
        <div className={styles.loading} aria-live="polite">
          Loading your cities…
        </div>
      ) : state.cities.length === 0 && !adding ? (
        <EmptyState
          title="Add the places you work with"
          illustration={<TimeOrbitIllustration />}
          action={
            <Button ref={addButtonRef} variant="primary" icon={<PlusIcon />} onClick={() => setAdding(true)}>
              Add city
            </Button>
          }
          footer={<Suggestions onPick={addCity} />}
        >
          <p>See their local time next to yours, plan meetings, and set reminders.</p>
        </EmptyState>
      ) : (
        <ul className={styles.list} aria-label="Saved cities">
          {state.cities.map((city, index) => (
            <CityRow key={city.id} city={city} index={index} count={state.cities.length} now={now} localZone={localZone} hourCycle={hourCycle} />
          ))}
        </ul>
      )}

      {ready && !adding && state.cities.length > 0 ? (
        <Button ref={addButtonRef} className={styles.addButton} icon={<PlusIcon />} onClick={() => setAdding(true)} block>
          Add city
        </Button>
      ) : null}
    </section>
  );
}

function Suggestions({ onPick }: { onPick(entry: CityEntry): void }) {
  const ready = useCityProviderReady();
  const entries = useMemo(
    () => (ready ? SUGGESTIONS.map((name) => cityProvider.search(name, 1)[0]?.entry).filter((e): e is CityEntry => Boolean(e)) : []),
    [ready],
  );
  if (entries.length === 0) return null;
  return (
    <div className={styles.suggestions} role="group" aria-label="Suggested cities">
      {entries.map((entry) => (
        <button key={entry.id} type="button" className={styles.chip} onClick={() => onPick(entry)}>
          {entry.name}
        </button>
      ))}
    </div>
  );
}

interface CityRowProps {
  city: SavedCity;
  index: number;
  count: number;
  now: number;
  localZone: string;
  hourCycle: '12h' | '24h';
}

function CityRow({ city, index, count, now, localZone, hourCycle }: CityRowProps) {
  const { actions } = useStore();
  const { notify } = useToast();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(city.label ?? city.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const description = describeInstant(now, city.timeZone, { hourCycle, abbreviationFallback });
  const relation = dayRelation(now, city.timeZone, localZone);
  const difference = offsetDifference(now, city.timeZone, localZone);
  const title = city.label ?? city.name;
  const location = [city.label ? city.name : city.region, city.country].filter(Boolean).join(', ');

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  const commitRename = async () => {
    setRenaming(false);
    await actions.renameCity(city.id, draft);
  };

  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        {renaming ? (
          <form
            className={styles.renameForm}
            onSubmit={(event) => {
              event.preventDefault();
              void commitRename();
            }}
          >
            <label className="visually-hidden" htmlFor={`rename-${city.id}`}>
              Label for {city.name}
            </label>
            <input
              ref={inputRef}
              id={`rename-${city.id}`}
              className={inputStyles.input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setDraft(city.label ?? city.name);
                  setRenaming(false);
                }
              }}
              onBlur={() => void commitRename()}
              maxLength={40}
            />
          </form>
        ) : (
          <>
            <p className={styles.rowName}>{title}</p>
            <p className={styles.rowLocation}>{location}</p>
          </>
        )}
      </div>
      <div className={styles.rowTime}>
        <p className={styles.rowClock}>
          <time dateTime={new Date(now).toISOString()}>{description.time}</time>
        </p>
        <p className={styles.rowMeta}>
          <Badge tone={relation.dayDelta === 0 ? 'neutral' : 'accent'}>{relation.label}</Badge>
          <span>{difference.label}</span>
        </p>
      </div>
      <MenuButton
        label={`Options for ${title}`}
        items={[
          { label: 'Rename', onSelect: () => setRenaming(true) },
          { label: 'Move up', onSelect: () => void actions.moveCity(city.id, -1), disabled: index === 0 },
          { label: 'Move down', onSelect: () => void actions.moveCity(city.id, 1), disabled: index === count - 1 },
          {
            label: 'Remove',
            tone: 'danger',
            onSelect: () => {
              void actions.removeCity(city.id);
              notify(`Removed ${title}`);
            },
          },
        ]}
      />
    </li>
  );
}
