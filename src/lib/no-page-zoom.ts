/**
 * iOS Safari ignores touch-action for the page pinch, so the gesture events are cancelled on
 * phones: canvases zoom themselves, the page layout must never scale under the fingers.
 */
export function blockPagePinch(): void {
  if (typeof window === 'undefined' || !window.matchMedia?.('(max-width: 768px)').matches) return;
  for (const name of ['gesturestart', 'gesturechange', 'gestureend'])
    document.addEventListener(name, (event) => event.preventDefault(), { passive: false });
}
