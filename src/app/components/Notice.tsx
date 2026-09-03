import type { ReactNode } from 'react';
import styles from './Notice.module.css';

type Tone = 'info' | 'warning' | 'danger' | 'success';

export function Notice({ tone = 'info', title, children, className }: { tone?: Tone; title?: string | undefined; children: ReactNode; className?: string | undefined }) {
  return (
    <div className={[styles.notice, styles[tone], className ?? ''].join(' ')} role={tone === 'danger' ? 'alert' : 'note'}>
      {title ? <p className={styles.title}>{title}</p> : null}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
