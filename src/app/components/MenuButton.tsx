import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { MoreIcon } from './Icons';
import styles from './MenuButton.module.css';

export interface MenuItem {
  label: string;
  onSelect(): void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}

/** Accessible menu button: arrow keys move, Enter/Space select, Escape closes, focus returns. */
export function MenuButton({ label, items, trigger }: { label: string; items: MenuItem[]; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  useEffect(() => {
    if (open) {
      const first = items.findIndex((i) => !i.disabled);
      setActive(first < 0 ? 0 : first);
      requestAnimationFrame(() => menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[first < 0 ? 0 : first]?.focus());
    }
  }, [open, items]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const move = (delta: number) => {
    let next = active;
    for (let i = 0; i < items.length; i += 1) {
      next = (next + delta + items.length) % items.length;
      if (!items[next]?.disabled) break;
    }
    setActive(next);
    menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[next]?.focus();
  };

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      close();
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(items.length - 1);
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[items.length - 1]?.focus();
    }
  };

  return (
    <div className={styles.wrapper}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {trigger ?? <MoreIcon />}
      </button>
      {open ? (
        <div ref={menuRef} id={menuId} role="menu" aria-label={label} className={styles.menu} onKeyDown={onMenuKeyDown}>
          {items.map((item, index) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={index === active ? 0 : -1}
              disabled={item.disabled}
              aria-disabled={item.disabled}
              className={[styles.item, item.tone === 'danger' ? styles.danger : ''].join(' ')}
              onClick={() => {
                close();
                item.onSelect();
              }}
              onFocus={() => setActive(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
