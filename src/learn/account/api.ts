import { t, translateServerMessage } from '../../lib/i18n';
// The textbook's talk with the accounts server. Every call returns parsed JSON or throws an
// ApiError whose message is already in Russian and safe to show.
import type { WireProgress } from '../../../shared/learn-sync';
import { requestRaw } from '../../lib/api';

export interface PublicUser {
  id: string;
  role: 'teacher' | 'student';
  login: string;
  displayName: string;
  mustChangePassword: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The id of the account this page believes it works as; the server refuses a different one. */
let expectedUser = '';
export const setExpectedUser = (id: string | null) => {
  expectedUser = id ?? '';
};

export async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  init: { keepalive?: boolean } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await requestRaw(url, {
      method,
      credentials: 'same-origin',
      keepalive: init.keepalive,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(expectedUser ? { 'X-Yosis-User': expectedUser } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, t('Нет связи с сервером. Проверь интернет и попробуй ещё раз.'));
  }
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok)
    throw new ApiError(
      response.status,
      typeof data?.error === 'string' ? translateServerMessage(data.error) : t('Сервер ответил с ошибкой. Попробуй позже.'),
    );
  return data as T;
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

export interface Stuck {
  bookId: string;
  pageId: string;
  fails: number;
  lastAt: number;
}

export interface StudentSummary extends PublicUser {
  createdAt: number;
  lastActiveAt: number | null;
  classId: string | null;
  note: string;
  done: Record<string, string[]>;
  skipped: Record<string, string[]>;
  attempts: { total: number; last7d: number; lastAt: number | null };
  stuck: Stuck | null;
}
export interface ClassInfo {
  id: string;
  name: string;
  createdAt: number;
  count: number;
}
export interface Overview {
  classes: ClassInfo[];
  students: StudentSummary[];
}
export interface StudentDetail {
  student: StudentSummary;
  books: WireProgress;
  attempts: Attempt[];
}
export interface CreatedStudent {
  id: string;
  displayName: string;
  login: string;
  password: string;
}

export const api = {
  me: () => request<{ user: PublicUser | null }>('GET', '/api/auth/me'),
  login: (login: string, password: string) =>
    request<{ user: PublicUser }>('POST', '/api/auth/login', { login, password }),
  register: (login: string, displayName: string, password: string) =>
    request<{ user: PublicUser }>('POST', '/api/auth/register', { login, displayName, password }),
  logout: () => request<{ ok: true }>('POST', '/api/auth/logout', {}),
  rename: (displayName: string) =>
    request<{ user: PublicUser }>('PATCH', '/api/auth/profile', { displayName }),
  password: (current: string, password: string) =>
    request<{ user: PublicUser }>('POST', '/api/auth/password', { current, password }),
  progress: () => request<{ books: WireProgress }>('GET', '/api/learn-progress'),
  sync: (books: WireProgress, keepalive = false) =>
    request<{ books: WireProgress }>('POST', '/api/learn-progress/sync', { books }, { keepalive }),
  attempt: (body: Omit<Attempt, 'at' | 'solved'>) =>
    request<{ ok: true }>('POST', '/api/learn-progress/attempt', body),
  overview: () => request<Overview>('GET', '/api/teacher/overview'),
  student: (id: string) => request<StudentDetail>('GET', `/api/teacher/students/${id}`),
  updateStudent: (
    id: string,
    changes: { displayName?: string; classId?: string | null; note?: string },
  ) => request<{ student: StudentSummary }>('PATCH', `/api/teacher/students/${id}`, changes),
  deleteStudent: (id: string) => request<{ ok: true }>('DELETE', `/api/teacher/students/${id}`),
  resetPassword: (id: string) =>
    request<{ password: string; login: string; displayName: string }>(
      'POST',
      `/api/teacher/students/${id}/reset-password`,
      {},
    ),
  credit: (id: string, bookId: string, pageId: string, note: string) =>
    request<{ books: WireProgress }>('PUT', `/api/teacher/students/${id}/credit`, {
      bookId,
      pageId,
      note,
    }),
  bulk: (names: string, classId: string | null) =>
    request<{ created: CreatedStudent[]; skipped: { line: string; reason: string }[] }>(
      'POST',
      '/api/teacher/students/bulk',
      { names, classId },
    ),
  createClass: (name: string) =>
    request<{ classGroup: { id: string; name: string } }>('POST', '/api/teacher/classes', { name }),
  renameClass: (id: string, name: string) =>
    request<{ classGroup: { id: string; name: string } }>('PATCH', `/api/teacher/classes/${id}`, {
      name,
    }),
  deleteClass: (id: string) => request<{ ok: true }>('DELETE', `/api/teacher/classes/${id}`),
};
