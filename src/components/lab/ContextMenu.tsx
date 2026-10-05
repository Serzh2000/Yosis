import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

export type MenuItem =
  | {
      kind?: 'item';
      label: string;
      /** The shortcut shown at the right. */
      shortcut?: string;
      danger?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    }
  | { kind: 'separator' }
  | {
      kind: 'colors';
      label: string;
      value?: string;
      colors: readonly { value: string; label: string }[];
      onSelect: (color: string) => void;
    };

interface Props {
  /** Where the menu opens, in screen pixels; it moves to stay inside the window. */
  x: number;
  y: number;
  label: string;
  items: readonly MenuItem[];
  onClose: () => void;
}

const FOCUSABLE = '[role^="menuitem"]:not(:disabled)';

/** A context menu: arrow keys move, Enter chooses, Escape and any outside click close it. */
export function ContextMenu({ x, y, label, items, onClose }: Props) {
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  const close = useRef(onClose);
  close.current = onClose;

  useLayoutEffect(() => {
    const box = menu.current?.getBoundingClientRect();
    if (!box) return;
    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - box.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - box.height - 8)),
    });
  }, [x, y, items]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    menu.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const outside = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) close.current();
    };
    const dismiss = () => close.current();
    window.addEventListener('pointerdown', outside, true);
    window.addEventListener('wheel', dismiss, { capture: true, passive: true });
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('blur', dismiss);
    return () => {
      window.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('wheel', dismiss, true);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('blur', dismiss);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  function onKeyDown(event: KeyboardEvent) {
    const entries = [...(menu.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const index = entries.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      event.preventDefault();
      entries[(to + entries.length) % entries.length]?.focus();
    };
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') move(index + 1);
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(entries.length - 1);
    else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  }

  return createPortal(
    <div
      ref={menu}
      className="lab-menu"
      role="menu"
      aria-label={label}
      style={position}
      onKeyDown={onKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item, index) => {
        if (item.kind === 'separator') return <hr key={index} role="separator" />;
        if (item.kind === 'colors')
          return (
            <div key={index} className="lab-menu-colors" role="group" aria-label={item.label}>
              <span>{item.label}</span>
              <div>
                {item.colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={color.value === item.value}
                    aria-label={color.label}
                    title={color.label}
                    style={{ background: color.value }}
                    onClick={() => {
                      item.onSelect(color.value);
                      onClose();
                    }}
                  />
                ))}
              </div>
            </div>
          );
        return (
          <button
            key={index}
            type="button"
            role="menuitem"
            className={item.danger ? 'danger' : undefined}
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
          >
            {item.label}
            {item.shortcut && <kbd>{item.shortcut}</kbd>}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
