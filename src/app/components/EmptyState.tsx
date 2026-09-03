import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export function EmptyState({ title, children, action, footer, illustration }: { title: string; children?: ReactNode; action?: ReactNode; footer?: ReactNode; illustration?: ReactNode }) {
  return (
    <div className={styles.empty}>
      {illustration ? <div className={styles.illustration}>{illustration}</div> : null}
      <p className={styles.title}>{title}</p>
      {children ? <div className={styles.body}>{children}</div> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
}
