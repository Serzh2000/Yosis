// Addresses of the textbook: /learn, /learn/<bookId>, /learn/<bookId>/<pageId>.
// Parsing never throws: anything else under /learn is the start of the last open book.
export interface LearnRoute {
  bookId?: string;
  pageId?: string;
}

export const LEARN_ROOT = '/learn';
const idPattern = /^[a-z0-9][a-z0-9_-]*$/i;

export const isLearnPath = (pathname: string) =>
  pathname === LEARN_ROOT || pathname.startsWith(`${LEARN_ROOT}/`);

export function parseLearnRoute(pathname: string): LearnRoute {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts[0] !== 'learn') return {};
  const [, bookId, pageId] = parts;
  if (!bookId || !idPattern.test(bookId)) return {};
  if (!pageId || !idPattern.test(pageId)) return { bookId };
  return { bookId, pageId };
}

export function learnRoutePath(route: LearnRoute): string {
  if (!route.bookId) return LEARN_ROOT;
  if (!route.pageId) return `${LEARN_ROOT}/${route.bookId}`;
  return `${LEARN_ROOT}/${route.bookId}/${route.pageId}`;
}

/** The cabinets live beside the books: /learn/cabinet for a learner, /learn/teacher for the teacher. */
export type LearnView = 'book' | 'cabinet' | 'teacher';
export function learnView(pathname: string): LearnView {
  const [, first, second] = pathname.replace(/\/+$/, '').split('/');
  if (first !== 'learn' || second === undefined) return 'book';
  return second === 'cabinet' || second === 'teacher' ? second : 'book';
}
