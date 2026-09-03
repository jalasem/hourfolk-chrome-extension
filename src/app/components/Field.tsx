import type { ReactNode } from 'react';
import styles from './Field.module.css';

interface FieldProps {
  label: string;
  htmlFor?: string | undefined;
  hint?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
}

export function Field({ label, htmlFor, hint, children, className }: FieldProps) {
  return (
    <div className={[styles.field, className ?? ''].join(' ')}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}
