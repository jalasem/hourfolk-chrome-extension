import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cityProvider } from '@/domain/cities';
import { formatCityLocation, formatRegionCountry, type CityEntry } from '@/domain/cities/types';
import { formatTime } from '@/domain/time/format';
import { useNow } from '@/app/hooks/useNow';
import { useCityProviderReady } from '@/app/hooks/useCityProvider';
import { useStore } from '@/app/providers/StoreProvider';
import { SearchIcon } from './Icons';
import styles from './CityCombobox.module.css';
import inputStyles from './inputs.module.css';

interface CityComboboxProps {
  id: string;
  value: CityEntry | null;
  onSelect(entry: CityEntry): void;
  onCancel?(): void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Keeps the list open on focus even with an existing value. */
  clearOnFocus?: boolean;
}

/** WAI-ARIA combobox over the lazily loaded city dataset. */
export function CityCombobox({ id, value, onSelect, onCancel, placeholder = 'Search a city, country, or time zone', autoFocus, clearOnFocus }: CityComboboxProps) {
  const ready = useCityProviderReady();
  const { state } = useStore();
  const now = useNow('minute');
  const [text, setText] = useState(value ? formatCityLocation(value) : '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(value ? formatCityLocation(value) : '');
  }, [value]);

  const query = text.trim();
  const results = useMemo(() => (ready && query ? cityProvider.search(query, 8) : []), [ready, query]);

  useEffect(() => {
    setActive(0);
  }, [results]);

  const choose = (entry: CityEntry) => {
    setOpen(false);
    setText(formatCityLocation(entry));
    onSelect(entry);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      const entry = results[active]?.entry;
      if (open && entry) {
        event.preventDefault();
        choose(entry);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (open && query) {
        setOpen(false);
      } else {
        onCancel?.();
      }
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const showList = open && query.length > 0;
  const activeId = showList && results[active] ? `${listId}-${active}` : undefined;

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputWrap}>
        <SearchIcon className={styles.icon} />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          className={[inputStyles.input, styles.input].join(' ')}
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          {...(activeId ? { 'aria-activedescendant': activeId } : {})}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onFocus={(event) => {
            if (clearOnFocus) event.target.select();
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
      </div>
      <div id={listId} role="listbox" aria-label="City suggestions" className={[styles.list, showList ? styles.listOpen : ''].join(' ')}>
        {showList && !ready ? <div className={styles.message}>Loading cities…</div> : null}
        {showList && ready && results.length === 0 ? (
          <div className={styles.message}>
            No places match “{query}”. Try a country, or a time zone like Asia/Muscat.
          </div>
        ) : null}
        {showList
          ? results.map((result, index) => {
              const entry = result.entry;
              const selected = index === active;
              return (
                <div
                  key={entry.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={selected}
                  className={[styles.option, selected ? styles.optionActive : ''].join(' ')}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(entry);
                  }}
                  onMouseEnter={() => setActive(index)}
                >
                  <span className={styles.optionMain}>
                    <span className={styles.optionName}>{entry.name}</span>
                    <span className={styles.optionLocation}>
                      {formatRegionCountry(entry) || entry.timeZone}
                    </span>
                  </span>
                  <span className={styles.optionTime}>
                    {formatTime(now, entry.timeZone, state.settings.hourCycle)}
                    <span className={styles.optionZone}>{entry.timeZone}</span>
                  </span>
                </div>
              );
            })
          : null}
      </div>
    </div>
  );
}
