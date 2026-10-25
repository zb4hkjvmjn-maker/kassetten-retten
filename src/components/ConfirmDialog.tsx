import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface DialogAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
}

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  actions: DialogAction[];
  cancelLabel?: string;
  onCancel: () => void;
}

/**
 * Bestätigungsdialog auf Basis des nativen <dialog>-Elements:
 * Fokus bleibt im Dialog, Escape bricht ab, danach springt der Fokus zurück.
 */
export function ConfirmDialog({ open, title, children, actions, cancelLabel = 'Abbrechen', onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (open) return;
    const target = returnFocus.current;
    returnFocus.current = null;
    if (target && document.contains(target)) {
      target.focus();
    } else if (target) {
      // Das auslösende Element existiert nicht mehr (z. B. nach dem Löschen): Fokus auf die Seitenüberschrift.
      document.querySelector<HTMLElement>('main h1')?.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
    >
      <div className="dialog__inner">
        <h2 id={titleId} className="dialog__title">
          {title}
        </h2>
        <div id={bodyId} className="dialog__body">
          {children}
        </div>
        <div className="dialog__actions">
          <button ref={cancelRef} type="button" className="btn btn--secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={`btn btn--${a.variant ?? 'primary'}`}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}
