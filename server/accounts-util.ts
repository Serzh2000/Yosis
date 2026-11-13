// Small pure helpers of the accounts module: the attempt limiter, generated logins and
// passwords, and the «stuck» rule. No disk, no network, so plain tests can check them.
import crypto from 'node:crypto';

/**
 * A fixed-window counter per key. `blocked` says whether the key used up its attempts in the
 * current window; `hit` spends one. Windows end by themselves; `sweep` forgets expired keys so
 * the map stays small on a server that runs for months.
 */
export class AttemptLimiter {
  private windows = new Map<string, { start: number; count: number }>();
  constructor(
    private limit = 30,
    private windowMs = 15 * 60 * 1000,
  ) {}

  private current(key: string, now: number) {
    const found = this.windows.get(key);
    if (found && now - found.start < this.windowMs) return found;
    if (found) this.windows.delete(key);
    return undefined;
  }

  blocked(key: string, now = Date.now()): boolean {
    return (this.current(key, now)?.count ?? 0) >= this.limit;
  }

  hit(key: string, now = Date.now()): void {
    const found = this.current(key, now);
    if (found) found.count++;
    else {
      if (this.windows.size > 10_000) this.sweep(now);
      this.windows.set(key, { start: now, count: 1 });
    }
  }

  /** Seconds until the key may try again; 0 when it is not blocked. */
  retryAfter(key: string, now = Date.now()): number {
    const found = this.current(key, now);
    if (!found || found.count < this.limit) return 0;
    return Math.max(1, Math.ceil((found.start + this.windowMs - now) / 1000));
  }

  clear(key: string): void {
    this.windows.delete(key);
  }

  sweep(now = Date.now()): void {
    for (const [key, item] of this.windows)
      if (now - item.start >= this.windowMs) this.windows.delete(key);
  }
}

const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

/** «Иванов Иван» → «ivanov.ivan»; a taken login gets a number: ivanov.ivan2. */
export function suggestLogin(name: string, isTaken: (login: string) => boolean): string {
  const words = name.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 2);
  const latin = words
    .map((word) =>
      [...word].map((char) => TRANSLIT[char] ?? (/[a-z0-9]/.test(char) ? char : '')).join(''),
    )
    .filter(Boolean);
  let base = (latin.join('.') || 'user').slice(0, 28);
  if (base.length < 3) base = `${base}user`.slice(0, 28);
  if (!isTaken(base)) return base;
  for (let n = 2; n < 1000; n++) if (!isTaken(`${base}${n}`)) return `${base}${n}`;
  return `${base}${crypto.randomInt(1000, 99999)}`;
}

/** Readable characters only: no 0/O, 1/l/I, so a password can be read from a printed sheet. */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generatePassword(length = 8): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

export interface Attempt {
  at: number;
  bookId: string;
  pageId: string;
  total: number;
  failed: number;
  solved: boolean;
  detail?: string;
  error?: string;
  code?: string;
}

/** So many failed checks in a row on one unfinished page, and the learner is stuck. */
export const STUCK_FAILS = 3;
const STUCK_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export interface Stuck {
  bookId: string;
  pageId: string;
  fails: number;
  lastAt: number;
}

/**
 * The page where the learner keeps failing: not done and the last STUCK_FAILS or more checks in
 * a row failed, the last of them within two weeks. The worst page wins.
 */
export function findStuck(
  attempts: Attempt[],
  isDone: (bookId: string, pageId: string) => boolean,
  now = Date.now(),
): Stuck | null {
  const byPage = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const key = `${attempt.bookId}\n${attempt.pageId}`;
    const list = byPage.get(key);
    if (list) list.push(attempt);
    else byPage.set(key, [attempt]);
  }
  let worst: Stuck | null = null;
  for (const list of byPage.values()) {
    const last = list[list.length - 1]!;
    if (isDone(last.bookId, last.pageId) || now - last.at > STUCK_WINDOW_MS) continue;
    let fails = 0;
    for (let i = list.length - 1; i >= 0 && !list[i]!.solved; i--) fails++;
    if (fails >= STUCK_FAILS && (!worst || fails > worst.fails))
      worst = { bookId: last.bookId, pageId: last.pageId, fails, lastAt: last.at };
  }
  return worst;
}
