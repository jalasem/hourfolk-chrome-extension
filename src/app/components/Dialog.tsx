import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from './Icons';
import { IconButton } from './Button';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  title: string;
  onClose(): void;
  children: ReactNode;
}

/** Native <dialog> for focus containment and Escape handling. */
export function Dialog({ open, title, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="hourfolk-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 id="hourfolk-dialog-title" className={styles.title}>
            {title}
          </h2>
          <IconButton label="Close settings" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
