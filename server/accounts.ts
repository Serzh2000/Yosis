// Accounts of the textbook: students register themselves, a teacher sees the class.
//
// One JSON file holds everything (a class of a few dozen learners does not need a database).
// Passwords are kept only as a scrypt hash with a salt, sessions only as the sha256 of the
// token that lives in an HttpOnly cookie. There is no e-mail and no real name: a learner has a
// login and a display name of their own choosing.
import crypto from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import express from 'express';
import {
  cleanNote,
  emptyWireBook,
  ID_MAX,
  ID_PATTERN,
  mergeBook,
  sanitizeProgress,
  type WireProgress,
} from '../shared/learn-sync';
import {
  AttemptLimiter,
  findStuck,
  generatePassword,
  suggestLogin,
  type Attempt,
} from './accounts-util';

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

/** Version of the file format; an older file is migrated quietly and a copy of it is kept. */
export const DATA_VERSION = 1;
/** A login lasts two hours after the last request. */
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const SESSION_SAVE_DELAY_MS = 60 * 1000;
const ACTIVE_TOUCH_MS = 60 * 1000;
// Не 'yosis_session': так называется cookie ключей доступа (server/api-security.ts), и в режиме
// с публичным адресом браузер присылал бы на /api обе, а разборщики брали бы первую.
export const SESSION_COOKIE = 'yosis_account';
export const EXPECTED_USER_HEADER = 'x-yosis-user';
const LOGIN = /^[A-Za-z0-9_.-]{3,32}$/;
const ATTEMPTS_KEPT = 60;
const ATTEMPTS_WITH_CODE = 15;
const CODE_MAX = 4000;
const NOTE_MAX = 400;

// These routes set the cookie themselves.
const OWN_COOKIE_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/password',
]);

export class AccountError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ClassGroup {
  id: string;
  name: string;
  createdAt: number;
}
export interface User {
  id: string;
  role: 'teacher' | 'student';
  login: string;
  displayName: string;
  salt: string;
  hash: string;
  createdAt: number;
  lastActiveAt?: number;
  classId: string | null;
  /** The password was issued by the teacher: the learner is asked to change it. */
  mustChangePassword?: boolean;
  /** The teacher's note about the learner; the learner never sees it. */
  note?: string;
  books: WireProgress;
  attempts: Attempt[];
}
interface Session {
  tokenHash: string;
  userId: string;
  expiresAt: number;
}
interface Data {
  version: number;
  users: User[];
  sessions: Session[];
  classes: ClassGroup[];
}

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export async function hashPassword(
  password: string,
  salt = crypto.randomBytes(16).toString('hex'),
): Promise<{ salt: string; hash: string }> {
  return { salt, hash: (await scrypt(password, salt, 64)).toString('hex') };
}

export async function checkPassword(
  user: Pick<User, 'salt' | 'hash'>,
  password: string,
): Promise<boolean> {
  const candidate = Buffer.from((await hashPassword(password, user.salt)).hash, 'hex');
  const expected = Buffer.from(user.hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

/* Validation: every message is for the learner, none says more than it must. */

export function validateLogin(raw: unknown): string {
  const login = typeof raw === 'string' ? raw.trim() : '';
  if (!LOGIN.test(login))
    throw new AccountError(
      400,
      'Логин: от 3 до 32 символов, латинские буквы, цифры, точка, дефис и подчёркивание.',
    );
  return login;
}
export function validatePassword(raw: unknown): string {
  const password = typeof raw === 'string' ? raw : '';
  if (password.length < 6 || password.length > 128)
    throw new AccountError(400, 'Пароль: от 6 до 128 символов.');
  return password;
}
export function validateDisplayName(raw: unknown): string {
  // eslint-disable-next-line no-control-regex
  const name = (typeof raw === 'string' ? raw : '').replace(/[\u0000-\u001f\u007f]/g, ' ');
  const clean = name.replace(/\s+/g, ' ').trim();
  if (clean.length < 2 || clean.length > 40)
    throw new AccountError(400, 'Имя: от 2 до 40 символов. Настоящее ФИО не нужно, подойдёт ник.');
  return clean;
}
export function validateClassName(raw: unknown): string {
  const name = (typeof raw === 'string' ? raw : '').replace(/\s+/g, ' ').trim();
  if (name.length < 1 || name.length > 40)
    throw new AccountError(400, 'Название класса: от 1 до 40 символов.');
  return name;
}
const validId = (raw: unknown, what: string): string => {
  const id = typeof raw === 'string' ? raw : '';
  if (id.length > ID_MAX || !ID_PATTERN.test(id))
    throw new AccountError(400, `${what}: неверный адрес.`);
  return id;
};
const count = (raw: unknown, max: number): number => {
  const n = typeof raw === 'number' && Number.isInteger(raw) ? raw : 0;
  return Math.min(Math.max(n, 0), max);
};
const text = (raw: unknown, max: number): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  const value = raw.replace(/\r/g, '').trim().slice(0, max);
  return value || undefined;
};

/** Builds a clean attempt from a request body; throws when the page is unknown. */
export function sanitizeAttempt(raw: unknown, now = Date.now()): Attempt {
  const body = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const total = count(body.total, 1000);
  const failed = Math.min(count(body.failed, 1000), total);
  const attempt: Attempt = {
    at: now,
    bookId: validId(body.bookId, 'Книга'),
    pageId: validId(body.pageId, 'Страница'),
    total,
    failed,
    solved: false,
  };
  const error = text(body.error, 300);
  const detail = text(body.detail, 300);
  const code = text(body.code, CODE_MAX);
  if (error) attempt.error = error;
  if (detail) attempt.detail = detail;
  if (code) attempt.code = code;
  attempt.solved = !error && total > 0 && failed === 0;
  return attempt;
}

/**
 * Brings a file of any version to the current one: missing fields are filled in, known ones are
 * kept, and records that are not accounts (no id, login or hash) are dropped.
 */
export function migrateData(raw: unknown): Data {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
  const classes = list<ClassGroup>(source.classes).filter(
    (item) => item && typeof item.id === 'string' && typeof item.name === 'string',
  );
  const classIds = new Set(classes.map((item) => item.id));
  const users = list<Partial<User>>(source.users)
    .filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.login === 'string' &&
        typeof item.hash === 'string' &&
        typeof item.salt === 'string',
    )
    .map((item): User => {
      const user = item as User;
      user.role = user.role === 'teacher' ? 'teacher' : 'student';
      user.displayName =
        typeof user.displayName === 'string' && user.displayName ? user.displayName : user.login;
      user.createdAt = Number.isFinite(user.createdAt) ? user.createdAt : Date.now();
      user.classId = user.classId && classIds.has(user.classId) ? user.classId : null;
      user.books = sanitizeProgress(user.books);
      user.attempts = Array.isArray(user.attempts) ? user.attempts.slice(-ATTEMPTS_KEPT) : [];
      return user;
    });
  const sessions = list<Session>(source.sessions).filter(
    (item) =>
      item &&
      typeof item.tokenHash === 'string' &&
      typeof item.userId === 'string' &&
      Number.isFinite(item.expiresAt),
  );
  return { version: DATA_VERSION, users, sessions, classes };
}

export class AccountStore {
  private data: Data = { version: DATA_VERSION, users: [], sessions: [], classes: [] };
  private writing: Promise<void> = Promise.resolve();
  private touchTimer: NodeJS.Timeout | null = null;

  /** `file` is null for a store that lives in memory only (tests). */
  constructor(private file: string | null) {
    if (!file || !existsSync(file)) return;
    let content: string;
    try {
      content = readFileSync(file, 'utf8');
      const raw = JSON.parse(content) as { version?: unknown };
      this.data = migrateData(raw);
      // A file of another version: keep a copy before the first write in the new format.
      if (raw?.version !== DATA_VERSION) {
        const backup = `${file}.v${String(raw?.version ?? 0)}.bak`;
        if (!existsSync(backup)) writeFileSync(backup, content, { mode: 0o600 });
      }
    } catch (error) {
      throw new Error(`Не удалось прочитать файл аккаунтов ${file}: ${(error as Error).message}`, {
        cause: error,
      });
    }
    // A session never outlives the present time limit.
    const limit = Date.now() + SESSION_TTL_MS;
    for (const session of this.data.sessions)
      session.expiresAt = Math.min(session.expiresAt, limit);
  }

  /** Writes the file whole through a temporary one, so a crash leaves the old or the new, never half. */
  private save(): Promise<void> {
    if (!this.file) return Promise.resolve();
    const file = this.file;
    const json = JSON.stringify(this.data);
    this.writing = this.writing
      .then(async () => {
        await mkdir(path.dirname(file), { recursive: true });
        const temp = `${file}.${process.pid}.tmp`;
        await writeFile(temp, json, { mode: 0o600 });
        await rename(temp, file);
      })
      .catch((error) => {
        console.error('[accounts] не удалось сохранить файл аккаунтов', error);
      });
    return this.writing;
  }

  /** Resolves when everything queued so far is on disk. */
  flush(): Promise<void> {
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;
      return this.save();
    }
    return this.writing;
  }

  get classes(): readonly ClassGroup[] {
    return this.data.classes;
  }
  findClass(id: unknown): ClassGroup | undefined {
    return this.data.classes.find((item) => item.id === id);
  }
  findByLogin(login: string): User | undefined {
    const wanted = login.toLowerCase();
    return this.data.users.find((user) => user.login.toLowerCase() === wanted);
  }
  findById(id: string): User | undefined {
    return this.data.users.find((user) => user.id === id);
  }
  hasTeacher(): boolean {
    return this.data.users.some((user) => user.role === 'teacher');
  }
  list(role: User['role']): User[] {
    return this.data.users.filter((user) => user.role === role);
  }

  async createClass(name: string): Promise<ClassGroup> {
    if (this.data.classes.some((item) => item.name.toLowerCase() === name.toLowerCase()))
      throw new AccountError(409, 'Класс с таким названием уже есть.');
    const group = { id: crypto.randomUUID(), name, createdAt: Date.now() };
    this.data.classes.push(group);
    await this.save();
    return group;
  }
  async renameClass(group: ClassGroup, name: string): Promise<void> {
    if (
      this.data.classes.some(
        (item) => item.id !== group.id && item.name.toLowerCase() === name.toLowerCase(),
      )
    )
      throw new AccountError(409, 'Класс с таким названием уже есть.');
    group.name = name;
    await this.save();
  }
  /** Learners stay, without a class. */
  async deleteClass(group: ClassGroup): Promise<void> {
    this.data.classes = this.data.classes.filter((item) => item.id !== group.id);
    for (const user of this.data.users) if (user.classId === group.id) user.classId = null;
    await this.save();
  }

  async createUser(
    role: User['role'],
    displayName: string,
    login: string,
    password: string,
    extra: { classId?: string | null; mustChangePassword?: boolean } = {},
  ): Promise<User> {
    if (this.findByLogin(login)) throw new AccountError(409, 'Такой логин уже занят.');
    const user: User = {
      id: crypto.randomUUID(),
      role,
      login,
      displayName,
      ...(await hashPassword(password)),
      createdAt: Date.now(),
      classId: extra.classId ?? null,
      books: {},
      attempts: [],
    };
    if (extra.mustChangePassword) user.mustChangePassword = true;
    // The check above ran before the hash: look again so two requests cannot take one login.
    if (this.findByLogin(login)) throw new AccountError(409, 'Такой логин уже занят.');
    this.data.users.push(user);
    await this.save();
    return user;
  }

  async setPassword(user: User, password: string, temporary: boolean): Promise<void> {
    Object.assign(user, await hashPassword(password));
    if (temporary) user.mustChangePassword = true;
    else delete user.mustChangePassword;
    // Every other login of this account ends with the password.
    this.data.sessions = this.data.sessions.filter((session) => session.userId !== user.id);
    await this.save();
  }

  async update(
    user: User,
    changes: { displayName?: string; classId?: string | null; note?: string },
  ): Promise<void> {
    if (changes.displayName !== undefined) user.displayName = changes.displayName;
    if (changes.classId !== undefined) user.classId = changes.classId;
    if (changes.note !== undefined) {
      if (changes.note) user.note = changes.note;
      else delete user.note;
    }
    await this.save();
  }

  async deleteUser(user: User): Promise<void> {
    this.data.users = this.data.users.filter((item) => item.id !== user.id);
    this.data.sessions = this.data.sessions.filter((session) => session.userId !== user.id);
    await this.save();
  }

  async startSession(user: User): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    this.data.sessions = this.data.sessions.filter((session) => session.expiresAt > now);
    this.data.sessions.push({
      tokenHash: sha256(token),
      userId: user.id,
      expiresAt: now + SESSION_TTL_MS,
    });
    user.lastActiveAt = now;
    await this.save();
    return token;
  }

  async endSession(token: string): Promise<void> {
    const hash = sha256(token);
    this.data.sessions = this.data.sessions.filter((session) => session.tokenHash !== hash);
    await this.save();
  }

  /** The user of a token. A live session is extended to two hours from this request. */
  userForToken(token: string | undefined, now = Date.now()): User | undefined {
    if (!token) return undefined;
    const hash = sha256(token);
    const session = this.data.sessions.find((item) => item.tokenHash === hash);
    if (!session) return undefined;
    if (session.expiresAt <= now) {
      this.data.sessions = this.data.sessions.filter((item) => item !== session);
      return undefined;
    }
    session.expiresAt = now + SESSION_TTL_MS;
    const user = this.findById(session.userId);
    if (user && now - (user.lastActiveAt ?? 0) > ACTIVE_TOUCH_MS) user.lastActiveAt = now;
    this.scheduleSave();
    return user;
  }

  /** Extensions of a session reach the disk at most once a minute. */
  private scheduleSave(): void {
    if (this.touchTimer || !this.file) return;
    this.touchTimer = setTimeout(() => {
      this.touchTimer = null;
      void this.save();
    }, SESSION_SAVE_DELAY_MS);
    this.touchTimer.unref?.();
  }

  /** Merges the learner's copy into the stored one and returns everything stored. */
  async syncProgress(user: User, incoming: WireProgress): Promise<WireProgress> {
    for (const [bookId, book] of Object.entries(incoming))
      user.books[bookId] = mergeBook(user.books[bookId] ?? emptyWireBook(), book);
    await this.save();
    return user.books;
  }

  async addAttempt(user: User, attempt: Attempt): Promise<void> {
    user.attempts.push(attempt);
    if (user.attempts.length > ATTEMPTS_KEPT)
      user.attempts.splice(0, user.attempts.length - ATTEMPTS_KEPT);
    // Old code is dropped first: the file stays small however long a learner tries.
    for (const old of user.attempts.slice(0, -ATTEMPTS_WITH_CODE)) delete old.code;
    user.lastActiveAt = attempt.at;
    await this.save();
  }

  /** The teacher credits a page, with a comment. A page already done keeps its time. */
  async credit(user: User, bookId: string, pageId: string, note: string): Promise<void> {
    const book = (user.books[bookId] ??= emptyWireBook());
    const have = book.done[pageId];
    const entry: { at: number; by: 'teacher'; note?: string } = {
      at: have?.at ?? Date.now(),
      by: 'teacher',
    };
    if (note) entry.note = note;
    book.done[pageId] = entry;
    delete book.skipped[pageId];
    await this.save();
  }
}

export const publicUser = (user: User) => ({
  id: user.id,
  role: user.role,
  login: user.login,
  displayName: user.displayName,
  mustChangePassword: user.mustChangePassword === true,
});

/** The first teacher: from the environment, else a random password shown once in the log. */
export async function ensureTeacher(
  store: AccountStore,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const login = env.YOSIS_TEACHER_LOGIN?.trim();
  const password = env.YOSIS_TEACHER_PASSWORD;
  if (login && password) {
    if (!store.findByLogin(login))
      await store.createUser(
        'teacher',
        env.YOSIS_TEACHER_NAME?.trim() || 'Учитель',
        validateLogin(login),
        validatePassword(password),
      );
    return;
  }
  if (store.hasTeacher()) return;
  const generated = generatePassword(14);
  await store.createUser('teacher', 'Учитель', 'teacher', generated);
  console.warn(
    `[accounts] Создан учитель: логин "teacher", пароль "${generated}". Он показан один раз: ` +
      'смените его в кабинете или задайте YOSIS_TEACHER_LOGIN и YOSIS_TEACHER_PASSWORD.',
  );
}

export function resolveAccountsFile(
  workspace: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env.YOSIS_ACCOUNTS_FILE
    ? path.resolve(env.YOSIS_ACCOUNTS_FILE)
    : path.join(workspace, '.accounts', 'accounts.json');
}

/* HTTP */

function readCookie(req: express.Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function setSessionCookie(
  req: express.Request,
  res: express.Response,
  token: string,
  maxAgeMs: number,
): void {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}${secure ? '; Secure' : ''}`,
  );
}

type Handler = (req: express.Request, res: express.Response) => Promise<void> | void;
const wrap =
  (handler: Handler): express.RequestHandler =>
  async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof AccountError) res.status(error.status).json({ error: error.message });
      else {
        console.error('[accounts]', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
      }
    }
  };

const DAY = 24 * 60 * 60 * 1000;

function studentSummary(user: User, now: number) {
  const done: Record<string, string[]> = {};
  const skipped: Record<string, string[]> = {};
  for (const [bookId, book] of Object.entries(user.books)) {
    done[bookId] = Object.keys(book.done);
    skipped[bookId] = Object.keys(book.skipped);
  }
  const stuck = findStuck(user.attempts, (bookId, pageId) =>
    Boolean(user.books[bookId]?.done[pageId]),
  );
  return {
    ...publicUser(user),
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt ?? null,
    classId: user.classId,
    note: user.note ?? '',
    done,
    skipped,
    attempts: {
      total: user.attempts.length,
      last7d: user.attempts.filter((item) => now - item.at <= 7 * DAY).length,
      lastAt: user.attempts.length ? user.attempts[user.attempts.length - 1]!.at : null,
    },
    stuck,
  };
}

export interface AccountRouterOptions {
  limiter?: AttemptLimiter;
}

/** Routes of accounts, progress and the teacher's cabinet. Mount at `/api`. */
export function createAccountsRouter(
  store: AccountStore,
  options: AccountRouterOptions = {},
): express.Router {
  const router = express.Router();
  const limiter = options.limiter ?? new AttemptLimiter(30, 15 * 60 * 1000);
  const writeLimiter = new AttemptLimiter(240, 60 * 1000);
  const paths = ['/auth', '/learn-progress', '/teacher'];

  // Small bodies: only progress may be large, and even that is bounded.
  router.use('/learn-progress/sync', express.json({ limit: '256kb', strict: true }));
  router.use(paths, express.json({ limit: '32kb', strict: true }));

  // Every request of a live login extends it, in the browser too: two hours count from the last action.
  router.use(paths, (req, res, next) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token && !OWN_COOKIE_PATHS.has(req.originalUrl.split('?')[0]!) && store.userForToken(token))
      setSessionCookie(req, res, token, SESSION_TTL_MS);
    next();
  });

  const currentUser = (req: express.Request) => store.userForToken(readCookie(req, SESSION_COOKIE));
  const requireUser = (req: express.Request): User => {
    const user = currentUser(req);
    if (!user) throw new AccountError(401, 'Нужно войти в аккаунт.');
    // One cookie per browser: a page whose learner was replaced by a login in another tab says
    // whose page it is, and nothing it did is written into the new account.
    const expected = req.headers[EXPECTED_USER_HEADER];
    if (typeof expected === 'string' && expected && expected !== user.id)
      throw new AccountError(401, 'В этом браузере вошёл другой пользователь. Войдите заново.');
    return user;
  };
  const requireTeacher = (req: express.Request): User => {
    const user = requireUser(req);
    if (user.role !== 'teacher') throw new AccountError(403, 'Доступно только учителю.');
    return user;
  };
  const requireStudent = (req: express.Request): User => {
    const user = requireUser(req);
    if (user.role !== 'student') throw new AccountError(403, 'Прогресс ведётся только у учеников.');
    return user;
  };
  const studentFromParams = (req: express.Request): User => {
    const student = store.findById(String(req.params.id));
    if (!student || student.role !== 'student') throw new AccountError(404, 'Ученик не найден.');
    return student;
  };
  const body = (req: express.Request): Record<string, unknown> =>
    typeof req.body === 'object' && req.body !== null ? req.body : {};

  const ipKey = (req: express.Request) => `ip:${req.ip ?? 'unknown'}`;
  const guard = (keys: string[]) => {
    const wait = Math.max(...keys.map((key) => limiter.retryAfter(key)));
    if (wait > 0) throw new AccountError(429, 'Слишком много попыток. Подождите несколько минут.');
  };

  const fakeUser = { salt: 'x'.repeat(32), hash: 'y'.repeat(128) };

  router.post(
    '/auth/register',
    wrap(async (req, res) => {
      const input = body(req);
      const keys = [`reg:${ipKey(req)}`];
      guard(keys);
      // Registration counts every try: it is the way to fill the file with accounts.
      keys.forEach((key) => limiter.hit(key));
      const displayName = validateDisplayName(input.displayName);
      const login = validateLogin(input.login);
      const password = validatePassword(input.password);
      const user = await store.createUser('student', displayName, login, password);
      setSessionCookie(req, res, await store.startSession(user), SESSION_TTL_MS);
      res.status(201).json({ user: publicUser(user) });
    }),
  );

  router.post(
    '/auth/login',
    wrap(async (req, res) => {
      const input = body(req);
      const login =
        typeof input.login === 'string' ? input.login.trim().toLowerCase().slice(0, 64) : '';
      const keys = [ipKey(req), `login:${login}`];
      guard(keys);
      const user = store.findByLogin(login);
      const password = typeof input.password === 'string' ? input.password.slice(0, 128) : '';
      // A missing account costs the same time as a wrong password.
      const ok = await checkPassword(user ?? fakeUser, password);
      if (!user || !ok) {
        // Only failures count: a class that signs in together from one address is not a flood.
        keys.forEach((key) => limiter.hit(key));
        throw new AccountError(401, 'Неверный логин или пароль.');
      }
      setSessionCookie(req, res, await store.startSession(user), SESSION_TTL_MS);
      res.json({ user: publicUser(user) });
    }),
  );

  router.post(
    '/auth/logout',
    wrap(async (req, res) => {
      const token = readCookie(req, SESSION_COOKIE);
      if (token) await store.endSession(token);
      setSessionCookie(req, res, '', 0);
      res.json({ ok: true });
    }),
  );

  router.get(
    '/auth/me',
    wrap((req, res) => {
      const user = currentUser(req);
      res.json({ user: user ? publicUser(user) : null });
    }),
  );

  router.patch(
    '/auth/profile',
    wrap(async (req, res) => {
      const user = requireUser(req);
      await store.update(user, { displayName: validateDisplayName(body(req).displayName) });
      res.json({ user: publicUser(user) });
    }),
  );

  router.post(
    '/auth/password',
    wrap(async (req, res) => {
      const user = requireUser(req);
      const input = body(req);
      const keys = [`pw:${user.id}`];
      guard(keys);
      const current = typeof input.current === 'string' ? input.current.slice(0, 128) : '';
      if (!(await checkPassword(user, current))) {
        keys.forEach((key) => limiter.hit(key));
        throw new AccountError(403, 'Текущий пароль неверный.');
      }
      await store.setPassword(user, validatePassword(input.password), false);
      setSessionCookie(req, res, await store.startSession(user), SESSION_TTL_MS);
      res.json({ user: publicUser(user) });
    }),
  );

  /* Progress of the learner */

  router.get(
    '/learn-progress',
    wrap((req, res) => {
      res.json({ books: requireStudent(req).books });
    }),
  );

  // Merge in both directions: what the browser knows goes in, everything stored comes back.
  router.post(
    '/learn-progress/sync',
    wrap(async (req, res) => {
      const user = requireStudent(req);
      if (writeLimiter.blocked(`w:${user.id}`)) throw new AccountError(429, 'Слишком часто.');
      writeLimiter.hit(`w:${user.id}`);
      const books = await store.syncProgress(user, sanitizeProgress(body(req).books));
      res.json({ books });
    }),
  );

  router.post(
    '/learn-progress/attempt',
    wrap(async (req, res) => {
      const user = requireStudent(req);
      if (writeLimiter.blocked(`w:${user.id}`)) throw new AccountError(429, 'Слишком часто.');
      writeLimiter.hit(`w:${user.id}`);
      await store.addAttempt(user, sanitizeAttempt(req.body));
      res.status(201).json({ ok: true });
    }),
  );

  /* The teacher's cabinet */

  router.get(
    '/teacher/overview',
    wrap((req, res) => {
      requireTeacher(req);
      const now = Date.now();
      const students = store.list('student');
      res.json({
        classes: store.classes.map((group) => ({
          ...group,
          count: students.filter((student) => student.classId === group.id).length,
        })),
        students: students
          .map((student) => studentSummary(student, now))
          .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru')),
      });
    }),
  );

  router.post(
    '/teacher/classes',
    wrap(async (req, res) => {
      requireTeacher(req);
      res
        .status(201)
        .json({ classGroup: await store.createClass(validateClassName(body(req).name)) });
    }),
  );
  const classFromParams = (req: express.Request) => {
    const group = store.findClass(String(req.params.id));
    if (!group) throw new AccountError(404, 'Класс не найден.');
    return group;
  };
  router.patch(
    '/teacher/classes/:id',
    wrap(async (req, res) => {
      requireTeacher(req);
      const group = classFromParams(req);
      await store.renameClass(group, validateClassName(body(req).name));
      res.json({ classGroup: group });
    }),
  );
  router.delete(
    '/teacher/classes/:id',
    wrap(async (req, res) => {
      requireTeacher(req);
      await store.deleteClass(classFromParams(req));
      res.json({ ok: true });
    }),
  );

  const classIdOf = (raw: unknown): string | null => {
    if (raw === undefined || raw === null || raw === '') return null;
    if (typeof raw !== 'string' || !store.findClass(raw))
      throw new AccountError(400, 'Такого класса нет.');
    return raw;
  };

  // A list of learners at once: one display name per line; logins and temporary passwords are made here.
  router.post(
    '/teacher/students/bulk',
    wrap(async (req, res) => {
      requireTeacher(req);
      const input = body(req);
      const lines = (typeof input.names === 'string' ? input.names : '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) throw new AccountError(400, 'Впишите хотя бы одно имя.');
      if (lines.length > 100)
        throw new AccountError(400, 'За один раз можно добавить до 100 учеников.');
      const classId = classIdOf(input.classId);
      const created: { id: string; displayName: string; login: string; password: string }[] = [];
      const skipped: { line: string; reason: string }[] = [];
      for (const line of lines) {
        try {
          const displayName = validateDisplayName(line);
          const login = suggestLogin(displayName, (candidate) =>
            Boolean(store.findByLogin(candidate)),
          );
          const password = generatePassword();
          const user = await store.createUser('student', displayName, login, password, {
            classId,
            mustChangePassword: true,
          });
          created.push({ id: user.id, displayName, login, password });
        } catch (error) {
          skipped.push({
            line: line.slice(0, 60),
            reason: error instanceof AccountError ? error.message : 'Не удалось создать.',
          });
        }
      }
      res.status(201).json({ created, skipped });
    }),
  );

  router.get(
    '/teacher/students/:id',
    wrap((req, res) => {
      requireTeacher(req);
      const student = studentFromParams(req);
      res.json({
        student: studentSummary(student, Date.now()),
        books: student.books,
        attempts: [...student.attempts].reverse(),
      });
    }),
  );

  router.patch(
    '/teacher/students/:id',
    wrap(async (req, res) => {
      requireTeacher(req);
      const student = studentFromParams(req);
      const input = body(req);
      await store.update(student, {
        ...(input.displayName !== undefined
          ? { displayName: validateDisplayName(input.displayName) }
          : {}),
        ...(input.classId !== undefined ? { classId: classIdOf(input.classId) } : {}),
        ...(input.note !== undefined
          ? { note: (typeof input.note === 'string' ? input.note : '').trim().slice(0, NOTE_MAX) }
          : {}),
      });
      res.json({ student: studentSummary(student, Date.now()) });
    }),
  );

  router.delete(
    '/teacher/students/:id',
    wrap(async (req, res) => {
      requireTeacher(req);
      await store.deleteUser(studentFromParams(req));
      res.json({ ok: true });
    }),
  );

  router.post(
    '/teacher/students/:id/reset-password',
    wrap(async (req, res) => {
      requireTeacher(req);
      const student = studentFromParams(req);
      const password = generatePassword();
      await store.setPassword(student, password, true);
      res.json({ password, login: student.login, displayName: student.displayName });
    }),
  );

  // Manual credit with a comment. It can only be added: the learner's own copy would bring a removed page back.
  router.put(
    '/teacher/students/:id/credit',
    wrap(async (req, res) => {
      requireTeacher(req);
      const student = studentFromParams(req);
      const input = body(req);
      await store.credit(
        student,
        validId(input.bookId, 'Книга'),
        validId(input.pageId, 'Страница'),
        cleanNote(input.note),
      );
      res.json({ books: student.books });
    }),
  );

  return router;
}
