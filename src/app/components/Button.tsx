import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement> | undefined;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  block?: boolean | undefined;
}

export function Button({ variant = 'secondary', size = 'md', icon, block, className, children, type = 'button', ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], block ? styles.block : '', className ?? ''].join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement> | undefined;
  label: string;
  size?: Size;
  variant?: 'ghost' | 'secondary';
}

export function IconButton({ label, size = 'md', variant = 'ghost', className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} className={[styles.iconButton, styles[variant], styles[size], className ?? ''].join(' ')} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}
