import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { getFocusableElements, getFocusLoopTarget } from '../lib/accessibility';

export interface DialogProps {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  labelledBy?: string;
  descriptionId?: string;
  className?: string;
  backdropClassName?: string;
  closeDisabled?: boolean;
  initialFocus?: string;
  busy?: boolean;
  embedded?: boolean;
}

// Only the top dialog handles keys; Help can be opened from another dialog.
const dialogStack: { token: symbol; element: HTMLElement }[] = [];
let savedRootInert = false;
let savedBodyOverflow = '';

export function Dialog({
  children,
  onClose,
  title,
  labelledBy,
  descriptionId,
  className = 'dialog',
  backdropClassName = 'modal-backdrop',
  closeDisabled = false,
  initialFocus,
  busy,
  embedded = false,
}: DialogProps) {
  const titleId = useId();
  const container = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onClose, closeDisabled });
  handlers.current = { onClose, closeDisabled };

  useEffect(() => {
    const dialog = container.current;
    if (!dialog) return;
    const token = Symbol('dialog');
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousDialog = dialogStack.at(-1)?.element;
    const previousDialogInert = previousDialog?.inert ?? false;
    if (previousDialog) previousDialog.inert = true;
    const root = document.getElementById('root');
    if (!dialogStack.length) {
      savedRootInert = root?.inert ?? false;
      savedBodyOverflow = document.body.style.overflow;
      if (root) root.inert = true;
      document.body.style.overflow = 'hidden';
    }
    dialogStack.push({ token, element: dialog });
    const isTop = () => dialogStack.at(-1)?.token === token;
    const focusFirst = () => {
      const items = getFocusableElements(dialog);
      const preferred = initialFocus ? dialog.querySelector<HTMLElement>(initialFocus) : null;
      (preferred && items.includes(preferred) ? preferred : (items[0] ?? dialog)).focus();
    };
    focusFirst();

    const keydown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!handlers.current.closeDisabled) handlers.current.onClose();
      } else if (event.key === 'Tab') {
        const items = getFocusableElements(dialog);
        const active =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const target = getFocusLoopTarget(items, active, event.shiftKey);
        if (!items.length || target) {
          event.preventDefault();
          (target ?? dialog).focus();
        }
      }
    };
    const focusin = (event: FocusEvent) => {
      if (isTop() && !dialog.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focusin);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focusin);
      const wasTop = isTop();
      dialogStack.splice(
        dialogStack.findIndex((item) => item.token === token),
        1,
      );
      if (previousDialog?.isConnected) previousDialog.inert = previousDialogInert;
      if (!dialogStack.length) {
        if (root) root.inert = savedRootInert;
        document.body.style.overflow = savedBodyOverflow;
      }
      if (wasTop && previousFocus?.isConnected && !previousFocus.closest('[inert]'))
        previousFocus.focus();
    };
  }, [initialFocus, embedded]);

  if (embedded) return <section className={className}>{children}</section>;

  const content = (
    <div
      className={backdropClassName}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !handlers.current.closeDisabled)
          handlers.current.onClose();
      }}
    >
      <div
        className={className}
        ref={container}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
        aria-label={!labelledBy && !title ? 'Диалог' : undefined}
        aria-describedby={descriptionId}
        aria-busy={busy}
        data-dialog="true"
      >
        {title && <h2 id={titleId}>{title}</h2>}
        {children}
      </div>
    </div>
  );
  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
