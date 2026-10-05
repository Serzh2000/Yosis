/** Tabs use automatic activation and a single stop in the Tab order; both arrow axes move. */
export function getTabDestination(key: string, current: number, count: number): number | null {
  if (count < 1) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowRight' || key === 'ArrowDown') return (current + 1 + count) % count;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (current - 1 + count) % count;
  return null;
}

/** null lets the browser move between controls; a value wraps or recovers focus. */
export function getFocusLoopTarget<T>(
  items: readonly T[],
  active: T | null,
  backwards: boolean,
): T | null {
  if (!items.length) return null;
  if (active === null || !items.includes(active))
    return backwards ? items[items.length - 1] : items[0];
  if (backwards && active === items[0]) return items[items.length - 1];
  if (!backwards && active === items[items.length - 1]) return items[0];
  return null;
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return [
    ...container.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, summary, [tabindex], [contenteditable="true"]',
    ),
  ].filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      !element.closest('[inert], [hidden], [aria-hidden="true"]') &&
      element.getClientRects().length > 0,
  );
}
