import styles from './Segmented.module.css';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange(value: T): void;
  size?: 'sm' | 'md' | undefined;
  className?: string | undefined;
}

/** Radio-group semantics with arrow-key movement, rendered as a compact segmented control. */
export function Segmented<T extends string>({ label, value, options, onChange, size = 'md', className }: SegmentedProps<T>) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = options.findIndex((o) => o.value === value);
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else return;
    event.preventDefault();
    const option = options[next];
    if (option) {
      onChange(option.value);
      const target = event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next];
      target?.focus();
    }
  };

  return (
    <div className={[styles.group, styles[size], className ?? ''].join(' ')} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={[styles.item, selected ? styles.selected : ''].join(' ')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
