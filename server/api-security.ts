import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import { RequestError } from './validation';

export interface ApiOptions {
  publicOrigin?: string;
  users?: Record<string, string>;
  maxUserJobs?: number;
  maxJobsPerHour?: number;
}
const identity = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const jobId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const digest = (value: string) => createHash('sha256').update(value).digest();

export function environmentApiOptions(): ApiOptions {
  const publicOrigin = process.env.YOSIS_PUBLIC_ORIGIN;
  const users = process.env.YOSIS_USERS_JSON
    ? (JSON.parse(process.env.YOSIS_USERS_JSON) as Record<string, string>)
    : undefined;
  return {
    publicOrigin,
    users,
    maxUserJobs: positiveIntegerEnv('YOSIS_MAX_USER_JOBS'),
    maxJobsPerHour: positiveIntegerEnv('YOSIS_MAX_JOBS_PER_HOUR'),
  };
}

function positiveIntegerEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  if (!/^\d+$/.test(raw.trim()) || !Number.isSafeInteger(value) || value < 1)
    throw new Error(`${name} должен быть положительным целым числом.`);
  return value;
}

export const DEFAULT_ACTIVE_JOB_LIMIT = 4;
export const DEFAULT_HOURLY_JOB_LIMIT = 30;
/** Локальный режим: один пользователь, часовой квоты нет, а число одновременных задач лишь ограничено сверху. */
export const LOCAL_ACTIVE_JOB_LIMIT = 16;

export function createJobLimits(options: ApiOptions, local: boolean) {
  return local
    ? new UserJobLimits(LOCAL_ACTIVE_JOB_LIMIT, Number.POSITIVE_INFINITY)
    : new UserJobLimits(
        options.maxUserJobs ?? DEFAULT_ACTIVE_JOB_LIMIT,
        options.maxJobsPerHour ?? DEFAULT_HOURLY_JOB_LIMIT,
      );
}

export class ApiSecurity {
  readonly publicOrigin?: URL;
  private tokens: Array<{ user: string; hash: Buffer }> = [];
  private sessions = new Map<string, { user: string; expires: number }>();
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(options: ApiOptions) {
    if (options.publicOrigin) {
      this.publicOrigin = new URL(options.publicOrigin);
      if (
        this.publicOrigin.protocol !== 'https:' ||
        this.publicOrigin.pathname !== '/' ||
        this.publicOrigin.username ||
        this.publicOrigin.password ||
        this.publicOrigin.search ||
        this.publicOrigin.hash
      )
        throw new Error('YOSIS_PUBLIC_ORIGIN должен быть HTTPS origin без пути.');
      if (
        !options.users ||
        typeof options.users !== 'object' ||
        Array.isArray(options.users) ||
        !Object.keys(options.users).length
      )
        throw new Error(
          'Для публичного сервера нужен YOSIS_USERS_JSON с персональными ключами доступа.',
        );
      for (const [user, token] of Object.entries(options.users)) {
        if (
          !identity.test(user) ||
          typeof token !== 'string' ||
          token.length < 32 ||
          token.length > 512
        )
          throw new Error(
            'Ключ пользователя должен содержать 32–512 символов, имя — безопасный идентификатор.',
          );
        const hash = digest(token);
        if (this.tokens.some((item) => timingSafeEqual(item.hash, hash)))
          throw new Error('Ключи пользователей должны различаться.');
        this.tokens.push({ user, hash });
      }
    }
  }
  user(request: Request): string | undefined {
    if (!this.publicOrigin) return 'local';
    const bearer = request.get('authorization')?.match(/^Bearer (.{32,512})$/)?.[1];
    if (bearer) return this.matchToken(bearer);
    const cookie = request
      .get('cookie')
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('yosis_session='))
      ?.slice(14);
    if (!cookie || !/^[0-9a-f]{64}$/.test(cookie)) return undefined;
    const key = digest(cookie).toString('hex'),
      session = this.sessions.get(key);
    if (!session || session.expires < Date.now()) {
      this.sessions.delete(key);
      return undefined;
    }
    return session.user;
  }
  login(request: Request, response: Response) {
    if (!this.publicOrigin) return response.json({ user: 'local', local: true });
    const address = request.socket.remoteAddress ?? 'unknown';
    let attempts = this.attempts.get(address);
    if (attempts && attempts.until < Date.now()) {
      this.attempts.delete(address);
      attempts = undefined;
    }
    if (attempts && attempts.count >= 10)
      throw new RequestError('Слишком много попыток входа. Повторите через минуту.', 429);
    const token =
      typeof request.body?.token === 'string' && request.body.token.length <= 512
        ? request.body.token
        : '';
    const user = token.length >= 32 ? this.matchToken(token) : undefined;
    if (!user) {
      if (this.attempts.size > 10000) this.attempts.clear();
      this.attempts.set(address, {
        count: (attempts?.count ?? 0) + 1,
        until: attempts?.until ?? Date.now() + 60000,
      });
      throw new RequestError('Неверный ключ доступа.', 401);
    }
    this.attempts.delete(address);
    for (const [key, session] of this.sessions)
      if (session.expires < Date.now()) this.sessions.delete(key);
    if (this.sessions.size >= 10000)
      throw new RequestError('Лимит открытых сессий достигнут.', 503);
    const cookie = randomBytes(32).toString('hex');
    this.sessions.set(digest(cookie).toString('hex'), { user, expires: Date.now() + 8 * 3600000 });
    response.cookie('yosis_session', cookie, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 8 * 3600000,
      path: '/api',
    });
    response.json({ user, local: false });
  }
  logout(request: Request, response: Response) {
    const cookie = request
      .get('cookie')
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('yosis_session='))
      ?.slice(14);
    if (cookie) this.sessions.delete(digest(cookie).toString('hex'));
    response.clearCookie('yosis_session', {
      httpOnly: true,
      secure: Boolean(this.publicOrigin),
      sameSite: 'strict',
      path: '/api',
    });
    response.status(204).end();
  }
  private matchToken(token: string) {
    const hash = digest(token);
    return this.tokens.find((item) => timingSafeEqual(item.hash, hash))?.user;
  }
}

export async function claimJob(root: string, id: string, owner: string) {
  if (!jobId.test(id) || !identity.test(owner)) throw new Error('Invalid job ownership identity.');
  await writeFile(path.join(root, id, '.owner.json'), JSON.stringify({ owner }), { flag: 'wx' });
}
export async function requireJobOwner(root: string, id: string, owner: string, local: boolean) {
  if (!jobId.test(id)) throw new RequestError('Задание не найдено.', 404);
  if (local) return;
  try {
    const saved = JSON.parse(await readFile(path.join(root, id, '.owner.json'), 'utf8'));
    if (saved.owner === owner) return;
  } catch {
    /* Legacy and unknown jobs have no public owner. */
  }
  throw new RequestError('Задание не найдено.', 404);
}

export class UserJobLimits {
  private jobs = new Map<
    string,
    Array<{ id: string; status: () => Promise<{ status?: unknown }> }>
  >();
  private starts = new Map<string, number[]>();
  private reservations = new Map<string, number>();
  constructor(
    private activeLimit = 4,
    private hourlyLimit = 30,
  ) {}
  async reserve(user: string) {
    // Reserve before async status checks to prevent concurrent admission bypasses.
    const reserved = this.reservations.get(user) ?? 0;
    this.reservations.set(user, reserved + 1);
    const release = () =>
      this.reservations.set(user, Math.max(0, (this.reservations.get(user) ?? 1) - 1));
    try {
      const jobs = this.jobs.get(user) ?? [];
      const active = [] as typeof jobs;
      for (const job of jobs) {
        try {
          if (['queued', 'running'].includes(String((await job.status()).status))) active.push(job);
        } catch {
          /* Expired jobs no longer consume slots. */
        }
      }
      const activeIds = new Set(active.map((job) => job.id));
      const checkedIds = new Set(jobs.map((job) => job.id));
      const latest = (this.jobs.get(user) ?? []).filter(
        (job) => !checkedIds.has(job.id) || activeIds.has(job.id),
      );
      this.jobs.set(user, latest);
      const starts = (this.starts.get(user) ?? []).filter((time) => Date.now() - time < 3600000);
      if (
        latest.length + (this.reservations.get(user) ?? 0) > this.activeLimit ||
        starts.length >= this.hourlyLimit
      )
        throw new RequestError(
          'Лимит заданий пользователя достигнут. Дождитесь завершения задач или обновления часовой квоты.',
          429,
        );
      starts.push(Date.now());
      this.starts.set(user, starts);
      return {
        release,
        register: (id: string, status: () => Promise<{ status?: unknown }>) => {
          this.jobs.set(user, [...(this.jobs.get(user) ?? []), { id, status }]);
        },
      };
    } catch (error) {
      release();
      throw error;
    }
  }
}
