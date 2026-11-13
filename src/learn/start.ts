// Where the textbook opens: the address wins, then the page the book was left at, then the start.
import type { BookDef } from './content/schema';
import { flattenBook } from './content/schema';
import type { CurrentPlace } from './progress';
import type { LearnRoute } from './routes';

/**
 * The route to show for the address that was typed. An unknown or closed book falls back to the
 * book that was open last, then to the first book that opens; an unknown page to the place the
 * book was left at, then to its first page.
 */
export function resolveStart(
  route: LearnRoute,
  books: BookDef[],
  current: CurrentPlace | null,
  placeOf: (bookId: string) => string | null,
): { bookId: string; pageId: string } {
  const open = books.filter((book) => book.available);
  const first = open[0];
  if (!first) throw new Error('No book opens');
  const book =
    open.find((item) => item.id === route.bookId) ??
    open.find((item) => item.id === current?.bookId) ??
    first;
  const pages = flattenBook(book);
  const has = (id: string | null | undefined) => Boolean(id) && pages.some((p) => p.page.id === id);
  const pageId = has(route.pageId)
    ? route.pageId!
    : has(placeOf(book.id))
      ? placeOf(book.id)!
      : current?.bookId === book.id && has(current.pageId)
        ? current.pageId
        : pages[0]!.page.id;
  return { bookId: book.id, pageId };
}
