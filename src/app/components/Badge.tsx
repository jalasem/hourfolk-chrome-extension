import type { ReactNode } from 'react';
import styles from './Badge.module.css';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone | undefined; children: ReactNode; className?: string | undefined }) {
  return <span className={[styles.badge, styles[tone], className ?? ''].join(' ')}>{children}</span>;
}
