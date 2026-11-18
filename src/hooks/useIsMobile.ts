import { useSyncExternalStore } from 'react';

/** The single mobile breakpoint (narrow window, or a phone held sideways); mobile.css repeats it. */
export const MOBILE_QUERY = '(max-width: 768px), (max-height: 500px) and (pointer: coarse)';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
const snapshot = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;

/** True on a phone or a narrow tablet window; the markup only differs where CSS cannot do it. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
