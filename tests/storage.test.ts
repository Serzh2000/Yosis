import test from 'node:test';
import assert from 'node:assert/strict';
import { DATABASES, localStore, sessionStore, STORAGE_KEYS } from '../src/lib/storage';

class MemoryStorage {
  entries = new Map<string, string>();
  getItem(key: string) {
    return this.entries.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.entries.set(key, String(value));
  }
  removeItem(key: string) {
    this.entries.delete(key);
  }
}
function install(name: 'localStorage' | 'sessionStorage', value: unknown) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true });
  return () => {
    if (previous) Object.defineProperty(globalThis, name, previous);
    else delete (globalThis as Record<string, unknown>)[name];
  };
}

test('the registry keeps the key names and versions of data already stored in browsers', () => {
  assert.deepEqual(
    Object.entries(STORAGE_KEYS).filter(([, value]) => typeof value === 'string'),
    [
      ['theme', 'yosis.theme.v1'],
      ['legacyProjects', 'yosis.projects.v1'],
      ['legacyCurrentProject', 'yosis.current.v1'],
      ['lastBuild', 'yosis.build.v1'],
      ['physicalJob', 'yosis.physical.v1'],
      ['lessons', 'yosis.lessons.v1'],
      ['learningCourse', 'yosis.learning-course.v1'],
      ['learningDrafts', 'yosis.learning-drafts.v1'],
      ['firstMission', 'yosis.first-mission.v1'],
      ['staleExampleDismissed', 'yosis.stale-example.dismissed.v1'],
    ],
  );
  assert.equal(STORAGE_KEYS.labLayout('abc'), 'yosis.lab.v1.abc');
  assert.deepEqual(DATABASES, {
    projects: { name: 'yosis.projects.v2', version: 1 },
    debuggerBackups: { name: 'yosis.debugger-backups', version: 1 },
  });
});

test('values round-trip through the chosen storage area only', (context) => {
  const local = new MemoryStorage(),
    session = new MemoryStorage();
  context.after(install('localStorage', local));
  context.after(install('sessionStorage', session));
  assert.equal(localStore.writeJson('k', { a: [1, 2] }), true);
  assert.equal(local.getItem('k'), '{"a":[1,2]}');
  assert.equal(session.getItem('k'), null);
  assert.deepEqual(
    localStore.readJson('k', (value) => value, null),
    { a: [1, 2] },
  );
  assert.equal(sessionStore.setItem('s', 'text'), true);
  assert.equal(sessionStore.getItem('s'), 'text');
  localStore.removeItem('k');
  assert.equal(local.getItem('k'), null);
});

test('missing, damaged or rejected data yields the fallback instead of an exception', (context) => {
  const local = new MemoryStorage();
  context.after(install('localStorage', local));
  assert.equal(
    localStore.readJson('none', () => 'parsed', 'fallback'),
    'fallback',
  );
  local.setItem('broken', '{not json');
  assert.equal(
    localStore.readJson('broken', () => 'parsed', 'fallback'),
    'fallback',
  );
  local.setItem('wrong', '1');
  assert.equal(
    localStore.readJson(
      'wrong',
      () => {
        throw new Error('invalid shape');
      },
      'fallback',
    ),
    'fallback',
  );
});

test('a blocked or full storage never throws from the safe API but strict writes report it', (context) => {
  const blocked = {
    getItem() {
      throw new DOMException('denied', 'SecurityError');
    },
    setItem() {
      throw new DOMException('full', 'QuotaExceededError');
    },
    removeItem() {
      throw new DOMException('denied', 'SecurityError');
    },
  };
  context.after(install('localStorage', blocked));
  assert.equal(localStore.getItem('k'), null);
  assert.equal(localStore.setItem('k', 'v'), false);
  assert.equal(localStore.writeJson('k', 1), false);
  assert.doesNotThrow(() => localStore.removeItem('k'));
  assert.equal(
    localStore.readJson('k', () => 1, 0),
    0,
  );
  assert.throws(() => localStore.setItemStrict('k', 'v'), { name: 'QuotaExceededError' });
});

test('an environment without web storage behaves like an empty one', (context) => {
  context.after(install('localStorage', undefined));
  assert.equal(localStore.getItem('k'), null);
  assert.equal(localStore.setItem('k', 'v'), false);
  assert.throws(() => localStore.setItemStrict('k', 'v'));
  assert.equal(
    localStore.readJson('k', () => 1, 0),
    0,
  );
});

test('values that cannot be serialised are reported, not thrown', (context) => {
  context.after(install('localStorage', new MemoryStorage()));
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  assert.equal(localStore.writeJson('k', cycle), false);
});
