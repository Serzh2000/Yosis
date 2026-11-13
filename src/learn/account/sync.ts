// Local-first progress: the learner always works on localStorage, as a guest would. With an
// account, the same facts are merged with the server's copy and sent there a moment after every
// change. The pure parts (stamps, conversion to the wire form) are tested on their own.
import {
  emptyWireBook,
  mergeBook,
  sameBook,
  type WireBook,
  type WireProgress,
} from '../../../shared/learn-sync';
import {
  achievementsKey,
  currentKey,
  emptyProgress,
  loadProgress,
  placeKey,
  progressKey,
  saveProgress,
  type BookProgress,
  defaultStorage,
  type StorageGetter,
} from '../progress';
import { ApiError, api } from './api';

/** When each fact happened, kept beside the progress: the plain progress has no times. */
export interface Stamps {
  done: Record<string, number>;
  skipped: Record<string, number>;
  quiz: Record<string, number>;
}
export const emptyStamps = (): Stamps => ({ done: {}, skipped: {}, quiz: {} });

const prefix = 'yosis.learn.v1.';
export const stampsKey = (bookId: string) => `${prefix}book.${bookId}.stamps`;
/** The account whose progress is in this browser; absent for a guest. */
export const ownerKey = `${prefix}owner`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const numbers = (value: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (isRecord(value))
    for (const [id, at] of Object.entries(value))
      if (typeof at === 'number' && Number.isFinite(at)) out[id] = at;
  return out;
};
export function parseStamps(value: unknown): Stamps {
  if (!isRecord(value)) return emptyStamps();
  return { done: numbers(value.done), skipped: numbers(value.skipped), quiz: numbers(value.quiz) };
}

/**
 * Stamps after a change of progress: a fact that appeared or changed gets `now`, a fact that
 * went away loses its stamp, everything else keeps its time.
 */
export function stampChanges(
  stamps: Stamps,
  before: BookProgress,
  after: BookProgress,
  now: number,
): Stamps {
  const next = emptyStamps();
  for (const id of after.done)
    next.done[id] = before.done.includes(id) ? (stamps.done[id] ?? now) : now;
  for (const id of after.skipped)
    next.skipped[id] = before.skipped.includes(id) ? (stamps.skipped[id] ?? now) : now;
  for (const [id, choice] of Object.entries(after.quiz))
    next.quiz[id] = before.quiz[id] === choice ? (stamps.quiz[id] ?? now) : now;
  return next;
}

/**
 * The wire form of local progress. A fact without a stamp (progress made before accounts) is
 * dated `now` if it is a page, and 0 if it is a quiz answer, so any later answer wins over it.
 */
export function toWire(progress: BookProgress, stamps: Stamps, now: number): WireBook {
  const book = emptyWireBook();
  for (const id of progress.done) book.done[id] = { at: stamps.done[id] ?? now, by: 'student' };
  for (const id of progress.skipped)
    if (!book.done[id]) book.skipped[id] = stamps.skipped[id] ?? now;
  for (const [id, choice] of Object.entries(progress.quiz))
    book.quiz[id] = { choice, at: stamps.quiz[id] ?? 0 };
  return book;
}

export function fromWire(book: WireBook): { progress: BookProgress; stamps: Stamps } {
  const progress = emptyProgress();
  const stamps = emptyStamps();
  for (const [id, item] of Object.entries(book.done)) {
    progress.done.push(id);
    stamps.done[id] = item.at;
  }
  for (const [id, at] of Object.entries(book.skipped)) {
    progress.skipped.push(id);
    stamps.skipped[id] = at;
  }
  for (const [id, item] of Object.entries(book.quiz)) {
    progress.quiz[id] = item.choice;
    stamps.quiz[id] = item.at;
  }
  return { progress, stamps };
}

export const DEBOUNCE_MS = 1500;
const RETRY_MS = 15_000;

export interface SyncServer {
  sync(books: WireProgress, keepalive?: boolean): Promise<{ books: WireProgress }>;
}

/**
 * Keeps one browser's progress and the server's copy in step. Local changes call `touch`; a
 * request goes out after DEBOUNCE_MS of quiet. Whatever the server answers is merged with the
 * current local state again, so a click made while the request was in flight is not lost.
 */
export class ProgressSync {
  private userId: string | null = null;
  private dirty = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  /** Changes were made after the login ended and are not on the server. */
  private unsynced = false;
  private listeners = new Set<(books: string[]) => void>();
  /** Called when the server says the login is over. */
  onSignedOut: (() => void) | null = null;

  constructor(
    private bookIds: string[],
    private server: SyncServer = api,
    private storage: StorageGetter = defaultStorage,
    private clock: () => number = Date.now,
  ) {}

  /** Subscribes to «these books changed in storage»; returns the way out. */
  onApplied(listener: (books: string[]) => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }
  private emit(books: string[]) {
    if (books.length) for (const listener of this.listeners) listener(books);
  }

  private read(key: string): unknown {
    try {
      const text = this.storage().getItem(key);
      return text === null ? undefined : JSON.parse(text);
    } catch {
      return undefined;
    }
  }
  private write(key: string, value: unknown) {
    try {
      this.storage().setItem(key, JSON.stringify(value));
    } catch {
      /* the book works without storage */
    }
  }
  private remove(key: string) {
    try {
      this.storage().removeItem(key);
    } catch {
      /* nothing to remove */
    }
  }

  loadStamps(bookId: string): Stamps {
    return parseStamps(this.read(stampsKey(bookId)));
  }
  /** Called by the book after it saved a changed progress. */
  recordChange(bookId: string, before: BookProgress, after: BookProgress) {
    this.write(
      stampsKey(bookId),
      stampChanges(this.loadStamps(bookId), before, after, this.clock()),
    );
    if (this.userId) this.touch(bookId);
  }

  private wipe() {
    for (const id of this.bookIds) {
      this.remove(progressKey(id));
      this.remove(stampsKey(id));
      this.remove(placeKey(id));
    }
    this.remove(achievementsKey);
    this.remove(currentKey);
  }

  /**
   * An account is signed in. Progress that belongs to another account is not mixed in; a guest's
   * progress (no owner) joins this account's. Then everything is merged with the server.
   */
  async start(userId: string): Promise<void> {
    this.userId = userId;
    this.unsynced = false;
    const owner = this.read(ownerKey);
    if (typeof owner === 'string' && owner !== userId) {
      this.wipe();
      this.dirty.clear();
      this.emit([...this.bookIds]);
    }
    this.write(ownerKey, userId);
    this.dirty = new Set(this.bookIds);
    await this.flush();
  }

  /** Sign-out: whatever is waiting goes out first, then the browser forgets the account's progress. */
  async stop(): Promise<void> {
    if (this.userId) await this.flush();
    const sent = this.dirty.size === 0 && !this.unsynced;
    this.userId = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (sent) {
      this.wipe();
      this.remove(ownerKey);
      this.emit([...this.bookIds]);
    }
  }

  /** The login is gone (expired, or another account took the cookie): stop sending, keep what is here. */
  detach() {
    this.unsynced = true;
    this.userId = null;
    this.dirty.clear();
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  touch(bookId: string) {
    if (!this.userId) return;
    this.dirty.add(bookId);
    this.arm(DEBOUNCE_MS);
  }

  private arm(delay: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), delay);
  }

  /** Sends the books that changed and merges the answer. Concurrent calls share one request. */
  async flush(keepalive = false): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.running) {
      await this.running;
      if (this.dirty.size === 0) return;
    }
    if (!this.userId || this.dirty.size === 0) return;
    this.running = this.send(keepalive).finally(() => (this.running = null));
    await this.running;
  }

  private async send(keepalive: boolean) {
    const ids = [...this.dirty];
    this.dirty.clear();
    const now = this.clock();
    const payload: WireProgress = {};
    for (const id of ids)
      payload[id] = toWire(loadProgress(id, this.storage), this.loadStamps(id), now);
    try {
      const answer = await this.server.sync(payload, keepalive);
      const changed: string[] = [];
      for (const id of this.bookIds) {
        const remote = answer.books[id];
        if (!remote) continue;
        const local = toWire(loadProgress(id, this.storage), this.loadStamps(id), now);
        const merged = mergeBook(local, remote);
        // A fact that arrived only now is stored as it is; one the learner already has is left alone.
        if (sameBook(merged, local)) continue;
        const { progress, stamps } = fromWire(merged);
        saveProgress(id, progress, this.storage);
        this.write(stampsKey(id), stamps);
        changed.push(id);
        // Facts the server did not have yet go out with the next request.
        if (!sameBook(merged, remote)) this.dirty.add(id);
      }
      this.emit(changed);
      if (this.dirty.size) this.arm(DEBOUNCE_MS);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.detach();
        this.onSignedOut?.();
        return;
      }
      // Offline or a server hiccup: try again later with the same books.
      ids.forEach((id) => this.dirty.add(id));
      this.arm(RETRY_MS);
    }
  }
}
