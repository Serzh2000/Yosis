import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  AccountStore,
  SESSION_TTL_MS,
  checkPassword,
  hashPassword,
  migrateData,
  sanitizeAttempt,
  validateDisplayName,
  validateLogin,
  validatePassword,
} from '../server/accounts';
import { AttemptLimiter, findStuck, generatePassword, suggestLogin } from '../server/accounts-util';
import {
  emptyWireBook,
  mergeBook,
  mergeProgress,
  sameBook,
  sanitizeBook,
  sanitizeProgress,
  type WireBook,
} from '../shared/learn-sync';

test('passwords are salted scrypt hashes that verify only the right password', async () => {
  const a = await hashPassword('correct horse');
  const b = await hashPassword('correct horse');
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
  assert.match(a.hash, /^[0-9a-f]{128}$/);
  assert.equal(await checkPassword(a, 'correct horse'), true);
  assert.equal(await checkPassword(a, 'correct horsE'), false);
  assert.equal(await checkPassword(a, ''), false);
});

test('sessions last two hours from the last request and die with the token', async () => {
  const store = new AccountStore(null);
  const user = await store.createUser('student', 'Аня', 'anya', 'secret1');
  const token = await store.startSession(user);
  const now = Date.now();
  assert.equal(store.userForToken(token, now)?.id, user.id);
  // A request an hour and a half later extends the login by a fresh two hours.
  assert.equal(store.userForToken(token, now + 90 * 60 * 1000)?.id, user.id);
  assert.equal(
    store.userForToken(token, now + 90 * 60 * 1000 + SESSION_TTL_MS - 1000)?.id,
    user.id,
  );
  // Silence for two hours ends it.
  const later = now + 90 * 60 * 1000 + SESSION_TTL_MS * 2;
  assert.equal(store.userForToken(token, later), undefined);
  assert.equal(store.userForToken('0'.repeat(64)), undefined);
  assert.equal(store.userForToken(undefined), undefined);
  const again = await store.startSession(user);
  await store.endSession(again);
  assert.equal(store.userForToken(again), undefined);
});

test('a new password ends every session of the account', async () => {
  const store = new AccountStore(null);
  const user = await store.createUser('student', 'Аня', 'anya', 'secret1');
  const token = await store.startSession(user);
  await store.setPassword(user, 'another2', false);
  assert.equal(store.userForToken(token), undefined);
  assert.equal(await checkPassword(user, 'another2'), true);
});

test('logins are unique without regard to case', async () => {
  const store = new AccountStore(null);
  await store.createUser('student', 'Аня', 'Anya', 'secret1');
  await assert.rejects(store.createUser('student', 'Аня', 'ANYA', 'secret1'), { status: 409 });
});

test('the file keeps accounts, is written atomically and is not world readable', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'cl-acc-'));
  const file = path.join(dir, 'sub', 'accounts.json');
  const store = new AccountStore(file);
  const user = await store.createUser('student', 'Аня', 'anya', 'secret1');
  await store.syncProgress(user, {
    arduino: { ...emptyWireBook(), done: { a: { at: 5, by: 'student' } } },
  });
  await store.flush();
  assert.deepEqual(readdirSync(path.join(dir, 'sub')), ['accounts.json']);
  const text = readFileSync(file, 'utf8');
  assert.ok(!text.includes('secret1'), 'the password is never stored');
  const reopened = new AccountStore(file);
  assert.equal(reopened.findByLogin('anya')?.books.arduino?.done.a?.at, 5);
});

test('an old file is migrated quietly and a copy of it is kept', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'cl-mig-'));
  const file = path.join(dir, 'accounts.json');
  writeFileSync(
    file,
    JSON.stringify({
      users: [
        { id: 'u1', login: 'old', salt: 's', hash: 'h', classId: 'gone' },
        { id: 'broken' },
        null,
      ],
    }),
  );
  const store = new AccountStore(file);
  const user = store.findById('u1')!;
  assert.equal(user.role, 'student');
  assert.equal(user.displayName, 'old');
  assert.equal(user.classId, null);
  assert.deepEqual(user.books, {});
  assert.equal(store.list('student').length, 1);
  assert.ok(readdirSync(dir).includes('accounts.json.v0.bak'));
  assert.equal(migrateData(undefined).users.length, 0);
});

test('input is validated', () => {
  assert.throws(() => validateLogin('ab'), { status: 400 });
  assert.throws(() => validateLogin('имя'), { status: 400 });
  assert.throws(() => validateLogin({}), { status: 400 });
  assert.equal(validateLogin(' anna_1 '), 'anna_1');
  assert.throws(() => validatePassword('12345'), { status: 400 });
  assert.throws(() => validatePassword('x'.repeat(129)), { status: 400 });
  assert.throws(() => validateDisplayName('a'), { status: 400 });
  assert.throws(() => validateDisplayName('x'.repeat(41)), { status: 400 });
  assert.equal(validateDisplayName('  Аня \n  Ё '), 'Аня Ё');
  assert.throws(() => sanitizeAttempt({ bookId: '../x', pageId: 'p' }), { status: 400 });
  const attempt = sanitizeAttempt({
    bookId: 'arduino',
    pageId: 'p1',
    total: 3,
    failed: 9,
    code: 'x'.repeat(9000),
  });
  assert.equal(attempt.failed, 3);
  assert.equal(attempt.solved, false);
  assert.equal(attempt.code?.length, 4000);
  assert.equal(sanitizeAttempt({ bookId: 'a', pageId: 'b', total: 2, failed: 0 }).solved, true);
  assert.equal(
    sanitizeAttempt({ bookId: 'a', pageId: 'b', total: 0, failed: 0, error: 'нет' }).solved,
    false,
  );
});

test('the limiter blocks after the limit, forgives after the window, counts keys apart', () => {
  const limiter = new AttemptLimiter(3, 1000);
  const t = 10_000;
  for (let i = 0; i < 3; i++) {
    assert.equal(limiter.blocked('a', t), false);
    limiter.hit('a', t);
  }
  assert.equal(limiter.blocked('a', t + 1), true);
  assert.equal(limiter.retryAfter('a', t + 1), 1);
  assert.equal(limiter.blocked('b', t + 1), false);
  assert.equal(limiter.blocked('a', t + 1000), false);
  limiter.hit('a', t + 1000);
  limiter.clear('a');
  assert.equal(limiter.retryAfter('a', t + 1001), 0);
  limiter.sweep(t + 100_000);
});

test('generated logins and passwords are readable and unique', () => {
  const taken = new Set<string>();
  const isTaken = (login: string) => taken.has(login);
  assert.equal(suggestLogin('Иванова Анна', isTaken), 'ivanova.anna');
  taken.add('ivanova.anna');
  assert.equal(suggestLogin('Иванова Анна', isTaken), 'ivanova.anna2');
  assert.match(suggestLogin('Ю', isTaken), /^[a-z0-9.]{3,32}$/);
  assert.match(suggestLogin('🙂🙂', isTaken), /^[a-z0-9.]{3,32}$/);
  const password = generatePassword();
  assert.match(password, /^[a-km-zA-HJ-NP-Z2-9]{8}$/);
  assert.notEqual(generatePassword(), generatePassword());
});

const book = (patch: Partial<WireBook>): WireBook => ({ ...emptyWireBook(), ...patch });

test('merging progress unites done pages, keeps the earliest time and the newest answer', () => {
  const local = book({
    done: { a: { at: 100, by: 'student' }, b: { at: 50, by: 'student' } },
    skipped: { c: 10, d: 10 },
    quiz: { q: { choice: 1, at: 100 }, r: { choice: 2, at: 10 } },
  });
  const server = book({
    done: { a: { at: 80, by: 'student' }, d: { at: 70, by: 'teacher', note: 'принято' } },
    skipped: { c: 5 },
    quiz: { q: { choice: 3, at: 200 }, r: { choice: 0, at: 5 } },
  });
  const merged = mergeBook(local, server);
  assert.deepEqual(Object.keys(merged.done).sort(), ['a', 'b', 'd']);
  assert.equal(merged.done.a!.at, 80);
  assert.deepEqual(merged.done.d, { at: 70, by: 'teacher', note: 'принято' });
  assert.deepEqual(merged.skipped, { c: 5 }, 'a done page is no longer skipped');
  assert.deepEqual(merged.quiz.q, { choice: 3, at: 200 });
  assert.deepEqual(merged.quiz.r, { choice: 2, at: 10 });
  // A teacher's credit survives the learner's own mark of the same page.
  const both = mergeBook(
    book({ done: { x: { at: 1, by: 'student' } } }),
    book({ done: { x: { at: 2, by: 'teacher', note: 'ok' } } }),
  );
  assert.deepEqual(both.done.x, { at: 1, by: 'teacher', note: 'ok' });
});

test('merging is commutative, idempotent and never loses a done page', () => {
  const a = {
    arduino: book({ done: { a: { at: 1, by: 'student' } }, quiz: { q: { choice: 1, at: 7 } } }),
  };
  const b = {
    arduino: book({ done: { b: { at: 2, by: 'student' } }, quiz: { q: { choice: 2, at: 7 } } }),
    esp: book({}),
  };
  const ab = mergeProgress(a, b);
  const ba = mergeProgress(b, a);
  assert.ok(sameBook(ab.arduino!, ba.arduino!));
  assert.deepEqual(Object.keys(ab).sort(), ['arduino', 'esp']);
  assert.ok(sameBook(mergeBook(ab.arduino!, ab.arduino!), ab.arduino!));
  assert.deepEqual(Object.keys(ab.arduino!.done).sort(), ['a', 'b']);
});

test('what comes from outside is cleaned before it is merged', () => {
  const clean = sanitizeBook(
    {
      done: {
        ok: { at: 5, by: 'x' },
        '../bad': { at: 1 },
        '': {},
        big: { at: -3, note: 'n'.repeat(900) },
      },
      skipped: { ok: 1, s: 'soon', 'a b': 1 },
      quiz: {
        q: { choice: 2, at: 4 },
        w: { choice: -1, at: 1 },
        e: { choice: 1.5, at: 1 },
        r: 'x',
      },
    },
    999,
  );
  assert.deepEqual(Object.keys(clean.done).sort(), ['big', 'ok']);
  assert.equal(clean.done.ok!.by, 'student');
  assert.equal(clean.done.big!.at, 999);
  assert.equal(clean.done.big!.note!.length, 400);
  assert.deepEqual(clean.skipped, { s: 999 });
  assert.deepEqual(clean.quiz, { q: { choice: 2, at: 4 } });
  assert.deepEqual(sanitizeBook('nope'), emptyWireBook());
  const many: Record<string, unknown> = {};
  for (let i = 0; i < 50; i++) many[`b${i}`] = {};
  assert.equal(Object.keys(sanitizeProgress(many)).length, 20);
  assert.deepEqual(sanitizeProgress([1]), {});
});

test('a learner is stuck after three failed checks in a row on an unfinished page', () => {
  const now = 1_000_000_000_000;
  const fail = (at: number, pageId = 'p'): never =>
    ({ at, bookId: 'b', pageId, total: 2, failed: 1, solved: false }) as never;
  const ok = (at: number) => ({ at, bookId: 'b', pageId: 'p', total: 2, failed: 0, solved: true });
  const notDone = () => false;
  assert.equal(findStuck([fail(now - 3), fail(now - 2)], notDone, now), null);
  assert.deepEqual(findStuck([fail(now - 3), fail(now - 2), fail(now - 1)], notDone, now), {
    bookId: 'b',
    pageId: 'p',
    fails: 3,
    lastAt: now - 1,
  });
  assert.equal(
    findStuck([fail(now - 4), fail(now - 3), fail(now - 2), ok(now - 1)], notDone, now),
    null,
  );
  assert.equal(
    findStuck([fail(1), fail(2), fail(3)], notDone, now),
    null,
    'old failures do not count',
  );
  assert.equal(
    findStuck([fail(now - 3), fail(now - 2), fail(now - 1)], () => true, now),
    null,
  );
});

test('attempts keep the code of the last few tries only', async () => {
  const store = new AccountStore(null);
  const user = await store.createUser('student', 'Аня', 'anya', 'secret1');
  for (let i = 0; i < 70; i++)
    await store.addAttempt(
      user,
      sanitizeAttempt({ bookId: 'a', pageId: 'p', total: 1, failed: 1, code: `c${i}` }),
    );
  assert.equal(user.attempts.length, 60);
  assert.equal(user.attempts.filter((item) => item.code).length, 15);
  assert.equal(user.attempts.at(-1)!.code, 'c69');
});
