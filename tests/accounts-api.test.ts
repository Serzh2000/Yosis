import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index';
import { BuildManager } from '../server/builds';
import { AccountStore, SESSION_COOKIE, checkPassword, ensureTeacher } from '../server/accounts';

interface Reply {
  status: number;
  json: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  cookie: string | null;
  setCookie: string;
}

/** A tiny browser: it keeps one cookie and sends JSON. */
class Client {
  cookie = '';
  userId = '';
  constructor(private base: string) {}
  async call(
    method: string,
    url: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<Reply> {
    const response = await fetch(this.base + url, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...(this.userId ? { 'X-Yosis-User': this.userId } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = response.headers.get('set-cookie') ?? '';
    const found = new RegExp(`${SESSION_COOKIE}=([^;]*)`).exec(setCookie);
    if (found) this.cookie = found[1] ? `${SESSION_COOKIE}=${found[1]}` : '';
    return {
      status: response.status,
      json: await response.json().catch(() => null),
      cookie: found?.[1] ?? null,
      setCookie,
    };
  }
}

async function withServer(run: (base: string, store: AccountStore) => Promise<void>) {
  const store = new AccountStore(null);
  const server = createApp(
    new BuildManager(path.join(mkdtempSync(path.join(tmpdir(), 'yosis-accounts-')), '.builds')),
    false,
    undefined,
    undefined,
    undefined,
    store,
  ).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, store);
  } finally {
    server.close();
  }
}

const register = (client: Client, login: string, displayName = 'Аня') =>
  client.call('POST', '/api/auth/register', { login, displayName, password: 'secret12' });

test('registration, login, session cookie and logout', () =>
  withServer(async (base) => {
    const anya = new Client(base);
    assert.deepEqual((await anya.call('GET', '/api/auth/me')).json, { user: null });
    assert.equal((await anya.call('GET', '/api/learn-progress')).status, 401);

    const created = await register(anya, 'anya');
    assert.equal(created.status, 201);
    assert.equal(created.json.user.role, 'student');
    assert.ok(!JSON.stringify(created.json).includes('hash'));
    assert.match(created.setCookie, /HttpOnly/);
    assert.match(created.setCookie, /SameSite=Lax/);
    assert.match(created.setCookie, /Max-Age=7200/);
    assert.doesNotMatch(created.setCookie, /Secure/);
    assert.equal((await anya.call('GET', '/api/auth/me')).json.user.login, 'anya');

    assert.equal((await register(new Client(base), 'ANYA')).status, 409);
    for (const bad of [
      { login: 'a', displayName: 'Аня', password: 'secret12' },
      { login: 'anya2', displayName: '', password: 'secret12' },
      { login: 'anya2', displayName: 'Аня', password: '123' },
    ])
      assert.equal((await new Client(base).call('POST', '/api/auth/register', bad)).status, 400);

    const second = new Client(base);
    assert.equal(
      (await second.call('POST', '/api/auth/login', { login: 'anya', password: 'wrong' })).status,
      401,
    );
    assert.equal(
      (await second.call('POST', '/api/auth/login', { login: 'anya', password: 'secret12' }))
        .status,
      200,
    );
    // Behind an https proxy the cookie is Secure.
    const secure = await new Client(base).call(
      'POST',
      '/api/auth/login',
      { login: 'anya', password: 'secret12' },
      { 'X-Forwarded-Proto': 'https' },
    );
    assert.match(secure.setCookie, /Secure/);

    assert.equal((await anya.call('POST', '/api/auth/logout', {})).status, 200);
    assert.deepEqual((await anya.call('GET', '/api/auth/me')).json, { user: null });
  }));

test('failed logins are limited per address and per login, successful ones are not', () =>
  withServer(async (base) => {
    await register(new Client(base), 'anya');
    const c = new Client(base);
    for (let i = 0; i < 30; i++)
      assert.equal(
        (await c.call('POST', '/api/auth/login', { login: 'anya', password: 'nope' + i })).status,
        401,
      );
    assert.equal(
      (await c.call('POST', '/api/auth/login', { login: 'anya', password: 'nope' })).status,
      429,
    );
    assert.equal(
      (await c.call('POST', '/api/auth/login', { login: 'anya', password: 'secret12' })).status,
      429,
    );
  }));

test('a class signing in together is not blocked', () =>
  withServer(async (base) => {
    await register(new Client(base), 'anya');
    for (let i = 0; i < 35; i++)
      assert.equal(
        (
          await new Client(base).call('POST', '/api/auth/login', {
            login: 'anya',
            password: 'secret12',
          })
        ).status,
        200,
      );
  }));

test('registration is limited to thirty tries per address', () =>
  withServer(async (base) => {
    const c = new Client(base);
    for (let i = 0; i < 30; i++) await register(c, `user${i}`);
    assert.equal((await register(c, 'one-more')).status, 429);
  }));

test('bodies are bounded and malformed JSON is refused', () =>
  withServer(async (base) => {
    const huge = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'x', displayName: 'y'.repeat(60_000), password: 'z' }),
    });
    assert.equal(huge.status, 413);
    const broken = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(broken.status, 400);
    const text = await fetch(`${base}/api/auth/login`, { method: 'POST', body: 'login=a' });
    assert.ok([400, 401].includes(text.status));
  }));

test('progress syncs both ways, merges and follows the learner to another device', () =>
  withServer(async (base) => {
    const phone = new Client(base);
    phone.userId = (await register(phone, 'anya')).json.user.id;
    const first = await phone.call('POST', '/api/learn-progress/sync', {
      books: {
        arduino: {
          done: { l1: { at: 10, by: 'student' } },
          skipped: { l2: 11 },
          quiz: { q1: { choice: 1, at: 12 } },
        },
      },
    });
    assert.equal(first.status, 200);
    assert.equal(first.json.books.arduino.done.l1.at, 10);

    // Another device signs in, brings its own facts and receives everything.
    const laptop = new Client(base);
    laptop.userId = (
      await laptop.call('POST', '/api/auth/login', { login: 'anya', password: 'secret12' })
    ).json.user.id;
    const second = await laptop.call('POST', '/api/learn-progress/sync', {
      books: {
        arduino: { done: { l2: { at: 20, by: 'student' } }, quiz: { q1: { choice: 3, at: 30 } } },
        esp32s3: { done: { e1: { at: 1, by: 'student' } } },
      },
    });
    assert.deepEqual(Object.keys(second.json.books.arduino.done).sort(), ['l1', 'l2']);
    assert.deepEqual(second.json.books.arduino.skipped, {});
    assert.deepEqual(second.json.books.arduino.quiz.q1, { choice: 3, at: 30 });
    assert.ok(second.json.books.esp32s3.done.e1);
    assert.deepEqual(
      (await phone.call('GET', '/api/learn-progress')).json.books,
      second.json.books,
    );

    // Junk is cleaned, not stored.
    const junk = await phone.call('POST', '/api/learn-progress/sync', {
      books: { arduino: { done: { '../x': { at: 1 }, ok2: { at: 3 } } }, __proto__: {}, 'a b': {} },
    });
    assert.equal(junk.status, 200);
    assert.ok(!('../x' in junk.json.books.arduino.done));
    assert.ok(junk.json.books.arduino.done.ok2);
    assert.deepEqual(Object.keys(junk.json.books).sort(), ['arduino', 'esp32s3']);
  }));

test('a page of another login in the same browser cannot write into the new account', () =>
  withServer(async (base) => {
    const tab = new Client(base);
    tab.userId = (await register(tab, 'anya')).json.user.id;
    const other = (
      await new Client(base).call('POST', '/api/auth/register', {
        login: 'boris',
        displayName: 'Борис',
        password: 'secret12',
      })
    ).json.user.id;
    // Boris signs in in the same browser: the cookie is replaced, the first tab still says it is Anya's.
    await tab.call('POST', '/api/auth/login', { login: 'boris', password: 'secret12' });
    const stale = await tab.call('POST', '/api/learn-progress/sync', {
      books: { arduino: { done: { l1: { at: 1, by: 'student' } } } },
    });
    assert.equal(stale.status, 401);
    tab.userId = other;
    assert.deepEqual((await tab.call('GET', '/api/learn-progress')).json.books, {});
  }));

test('firmware checks become attempts the teacher can see, with a stuck mark', () =>
  withServer(async (base, store) => {
    await ensureTeacher(store, {
      YOSIS_TEACHER_LOGIN: 'teacher',
      YOSIS_TEACHER_PASSWORD: 'teacherpw',
    });
    const anya = new Client(base);
    anya.userId = (await register(anya, 'anya')).json.user.id;
    for (let i = 0; i < 3; i++)
      assert.equal(
        (
          await anya.call('POST', '/api/learn-progress/attempt', {
            bookId: 'arduino',
            pageId: 'blink',
            total: 2,
            failed: 1,
            detail: 'ждали: 1',
            code: 'void loop(){}',
          })
        ).status,
        201,
      );
    assert.equal(
      (await anya.call('POST', '/api/learn-progress/attempt', { bookId: '../', pageId: 'x' }))
        .status,
      400,
    );
    assert.equal((await anya.call('GET', '/api/teacher/overview')).status, 403);

    const teacher = new Client(base);
    teacher.userId = (
      await teacher.call('POST', '/api/auth/login', { login: 'teacher', password: 'teacherpw' })
    ).json.user.id;
    assert.equal(
      (await teacher.call('POST', '/api/learn-progress/attempt', { bookId: 'a', pageId: 'b' }))
        .status,
      403,
    );
    const overview = (await teacher.call('GET', '/api/teacher/overview')).json;
    assert.equal(overview.students.length, 1);
    assert.deepEqual(overview.students[0].stuck.pageId, 'blink');
    assert.equal(overview.students[0].attempts.total, 3);
    assert.ok(!JSON.stringify(overview).includes('void loop'), 'the overview carries no code');
    assert.ok(!JSON.stringify(overview).includes('"hash"'));

    const detail = (await teacher.call('GET', `/api/teacher/students/${overview.students[0].id}`))
      .json;
    assert.equal(detail.attempts.length, 3);
    assert.equal(detail.attempts[0].code, 'void loop(){}');

    // Credit with a comment, seen by the learner on the next sync and not undone by the learner's own copy.
    const credit = await teacher.call(
      'PUT',
      `/api/teacher/students/${overview.students[0].id}/credit`,
      { bookId: 'arduino', pageId: 'blink', note: 'показал на плате' },
    );
    assert.equal(credit.json.books.arduino.done.blink.by, 'teacher');
    const synced = await anya.call('POST', '/api/learn-progress/sync', {
      books: { arduino: { done: { blink: { at: 1, by: 'student' } } } },
    });
    assert.equal(synced.json.books.arduino.done.blink.note, 'показал на плате');
    const after = (await teacher.call('GET', '/api/teacher/overview')).json;
    assert.equal(after.students[0].stuck, null, 'a credited page is not stuck');
  }));

test('the teacher manages classes and learners and issues temporary passwords', () =>
  withServer(async (base, store) => {
    await ensureTeacher(store, {
      YOSIS_TEACHER_LOGIN: 'teacher',
      YOSIS_TEACHER_PASSWORD: 'teacherpw',
    });
    const teacher = new Client(base);
    teacher.userId = (
      await teacher.call('POST', '/api/auth/login', { login: 'teacher', password: 'teacherpw' })
    ).json.user.id;
    const group = (await teacher.call('POST', '/api/teacher/classes', { name: '8Б' })).json
      .classGroup;
    assert.equal((await teacher.call('POST', '/api/teacher/classes', { name: '8б' })).status, 409);

    const bulk = await teacher.call('POST', '/api/teacher/students/bulk', {
      names: 'Иванова Анна\nИванова Анна\n\nПетров Пётр\nx',
      classId: group.id,
    });
    assert.equal(bulk.status, 201);
    assert.deepEqual(
      bulk.json.created.map((item: { login: string }) => item.login),
      ['ivanova.anna', 'ivanova.anna2', 'petrov.petr'],
    );
    assert.equal(bulk.json.skipped.length, 1);
    const first = bulk.json.created[0];
    assert.match(first.password, /^[A-Za-z0-9]{8}$/);

    // The temporary password works and is flagged for a change; changing it clears the flag.
    const pupil = new Client(base);
    const login = await pupil.call('POST', '/api/auth/login', {
      login: first.login,
      password: first.password,
    });
    pupil.userId = login.json.user.id;
    assert.equal(login.json.user.mustChangePassword, true);
    assert.equal(
      (
        await pupil.call('POST', '/api/auth/password', {
          current: 'wrong-one',
          password: 'brand-new1',
        })
      ).status,
      403,
    );
    const changed = await pupil.call('POST', '/api/auth/password', {
      current: first.password,
      password: 'brand-new1',
    });
    assert.equal(changed.json.user.mustChangePassword, false);
    assert.equal(
      (
        await new Client(base).call('POST', '/api/auth/login', {
          login: first.login,
          password: first.password,
        })
      ).status,
      401,
    );

    const reset = await teacher.call(
      'POST',
      `/api/teacher/students/${first.id}/reset-password`,
      {},
    );
    assert.match(reset.json.password, /^[A-Za-z0-9]{8}$/);
    assert.equal(
      (await pupil.call('GET', '/api/learn-progress')).status,
      401,
      'a reset ends the old logins',
    );

    const patched = await teacher.call('PATCH', `/api/teacher/students/${first.id}`, {
      displayName: 'Анна И.',
      note: 'левша',
      classId: null,
    });
    assert.equal(patched.json.student.displayName, 'Анна И.');
    assert.equal(patched.json.student.classId, null);
    assert.equal(
      (await teacher.call('PATCH', `/api/teacher/students/${first.id}`, { classId: 'nope' }))
        .status,
      400,
    );
    assert.equal((await teacher.call('GET', '/api/teacher/students/unknown')).status, 404);
    assert.equal((await teacher.call('DELETE', `/api/teacher/classes/${group.id}`)).status, 200);
    assert.equal(
      (await teacher.call('GET', '/api/teacher/overview')).json.students.every(
        (item: { classId: unknown }) => item.classId === null,
      ),
      true,
    );
    assert.equal((await teacher.call('DELETE', `/api/teacher/students/${first.id}`)).status, 200);
    assert.equal((await teacher.call('GET', '/api/teacher/overview')).json.students.length, 2);
  }));

test('the first teacher gets a one-time password from the log when nothing is configured', async () => {
  const store = new AccountStore(null);
  const logged: string[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => void logged.push(args.join(' '));
  try {
    await ensureTeacher(store, {});
    await ensureTeacher(store, {});
  } finally {
    console.warn = warn;
  }
  assert.equal(logged.length, 1);
  const password = /пароль "([^"]+)"/.exec(logged[0]!)![1]!;
  assert.equal(store.list('teacher').length, 1);
  assert.ok(password.length >= 12);
  assert.equal(await checkPassword(store.findByLogin('teacher')!, password), true);
});
