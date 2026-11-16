import { useSyncExternalStore } from 'react';

/** The single mobile breakpoint; src/mobile.css repeats it in its @media rules. */
export const MOBILE_QUERY = '(max-width: 768px)';

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
