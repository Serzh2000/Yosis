import test from 'node:test';
import assert from 'node:assert/strict';
import type { BookDef, PageDef } from '../src/learn/content/schema';
import {
  achievementsKey,
  bookProgress,
  currentKey,
  defaultUi,
  earnedAchievements,
  emptyProgress,
  lessonState,
  loadAchievements,
  loadCurrent,
  loadPlace,
  loadProgress,
  loadUi,
  markDone,
  markSkipped,
  progressKey,
  recordQuiz,
  saveAchievements,
  saveCurrent,
  savePlace,
  placeKey,
  saveProgress,
  saveUi,
  uiKey,
} from '../src/learn/progress';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}
const memory = () => {
  const storage = new MemoryStorage();
  return { storage, get: () => storage as unknown as Storage };
};
const broken = (): Storage => {
  throw new Error('storage unavailable');
};
const throwing = {
  getItem() {
    throw new Error('denied');
  },
  setItem() {
    throw new Error('full');
  },
} as unknown as Storage;

const page = (id: string, task?: PageDef['task']): PageDef => ({ id, blocks: [], task });
const build = { kind: 'build', text: 'b', until: () => true } as const;
const firmware = { kind: 'sim', text: 'f', lessonId: 'blink' } as const;
const quiz = { kind: 'quiz', text: 'q' } as const;

const book: BookDef = {
  id: 'fixture',
  title: 'Fixture',
  mode: 'verilog',
  summary: 's',
  available: true,
  spine: { color: '#000' },
  chapters: [
    {
      id: 'c1',
      title: 'One',
      lessons: [
        { id: 'l1', title: 'L1', pages: [page('p1'), page('p2', build), page('p3', quiz)] },
        { id: 'l2', title: 'L2', pages: [page('p4', firmware)] },
      ],
    },
    { id: 'c2', title: 'Two', lessons: [{ id: 'l3', title: 'L3', pages: [page('p5', quiz)] }] },
    { id: 'c3', title: 'Empty', lessons: [{ id: 'l4', title: 'L4', pages: [page('p6')] }] },
  ],
  reference: [page('r1')],
};
const [l1, l2, l3, l4] = book.chapters.flatMap((chapter) => chapter.lessons);
const withDone = (...ids: string[]) => ids.reduce(markDone, emptyProgress());

test('empty storage gives defaults', () => {
  const { get } = memory();
  assert.equal(loadCurrent(get), null);
  assert.deepEqual(loadProgress('arduino', get), emptyProgress());
  assert.deepEqual(loadUi(get), defaultUi());
  assert.deepEqual(loadAchievements(get), []);
});

test('everything round-trips through storage', () => {
  const { get, storage } = memory();
  saveCurrent({ bookId: 'arduino', pageId: 'p2' }, get);
  const progress = recordQuiz(markSkipped(markDone(emptyProgress(), 'p1'), 'p2'), 'p3', 2);
  saveProgress('arduino', progress, get);
  saveUi({ collapsed: true, drawer: 'serial', sound: false }, get);
  saveAchievements(['first-led', 'book-done'], get);
  assert.deepEqual(loadCurrent(get), { bookId: 'arduino', pageId: 'p2' });
  assert.deepEqual(loadProgress('arduino', get), progress);
  assert.deepEqual(loadProgress('esp32s3', get), emptyProgress());
  assert.deepEqual(loadUi(get), { collapsed: true, drawer: 'serial', sound: false });
  assert.deepEqual(loadAchievements(get), ['first-led', 'book-done']);
  assert.ok(storage.data.has('yosis.learn.v1.book.arduino.progress'));
  assert.ok(storage.data.has('yosis.learn.v1.current'));
  assert.ok(storage.data.has('yosis.learn.v1.ui'));
  assert.ok(storage.data.has('yosis.learn.v1.achievements'));
});

test('broken JSON falls back to defaults', () => {
  const { get, storage } = memory();
  for (const key of [currentKey, progressKey('b'), uiKey, achievementsKey])
    storage.setItem(key, '{not json');
  assert.equal(loadCurrent(get), null);
  assert.deepEqual(loadProgress('b', get), emptyProgress());
  assert.deepEqual(loadUi(get), defaultUi());
  assert.deepEqual(loadAchievements(get), []);
});

test('wrong shapes and unknown fields are dropped', () => {
  const { get, storage } = memory();
  storage.setItem(currentKey, JSON.stringify({ bookId: 3, pageId: 'p' }));
  assert.equal(loadCurrent(get), null);
  storage.setItem(currentKey, JSON.stringify(['a', 'b']));
  assert.equal(loadCurrent(get), null);
  storage.setItem(currentKey, JSON.stringify({ bookId: 'a', pageId: 'p', extra: 1 }));
  assert.deepEqual(loadCurrent(get), { bookId: 'a', pageId: 'p' });

  storage.setItem(
    progressKey('b'),
    JSON.stringify({
      done: ['p1', 7, null, 'p1', 'p2'],
      skipped: ['p2', 'p9', {}],
      quiz: { p1: 1, p2: 'x', p3: -1, p4: 1.5, p5: 0 },
      other: true,
    }),
  );
  assert.deepEqual(loadProgress('b', get), {
    done: ['p1', 'p2'],
    skipped: ['p9'],
    quiz: { p1: 1, p5: 0 },
  });
  storage.setItem(progressKey('b'), JSON.stringify({ done: 'p1', skipped: null, quiz: [1] }));
  assert.deepEqual(loadProgress('b', get), emptyProgress());
  storage.setItem(progressKey('b'), '42');
  assert.deepEqual(loadProgress('b', get), emptyProgress());

  storage.setItem(uiKey, JSON.stringify({ collapsed: 'yes', drawer: 'wide', sound: false }));
  assert.deepEqual(loadUi(get), { ...defaultUi(), sound: false });
  storage.setItem(achievementsKey, JSON.stringify({ a: 1 }));
  assert.deepEqual(loadAchievements(get), []);
  storage.setItem(achievementsKey, JSON.stringify(['a', 1, 'a', 'b']));
  assert.deepEqual(loadAchievements(get), ['a', 'b']);
});

test('unavailable storage never throws', () => {
  for (const get of [() => throwing, broken]) {
    assert.equal(loadCurrent(get), null);
    assert.deepEqual(loadProgress('b', get), emptyProgress());
    assert.deepEqual(loadUi(get), defaultUi());
    assert.deepEqual(loadAchievements(get), []);
    assert.doesNotThrow(() => {
      saveCurrent({ bookId: 'a', pageId: 'p' }, get);
      saveProgress('b', emptyProgress(), get);
      saveUi(defaultUi(), get);
      saveAchievements(['x'], get);
    });
  }
});

test('markDone, markSkipped and recordQuiz are pure and idempotent', () => {
  const start = emptyProgress();
  const skipped = markSkipped(start, 'p2');
  assert.deepEqual(start, emptyProgress());
  assert.deepEqual(skipped.skipped, ['p2']);
  assert.equal(markSkipped(skipped, 'p2'), skipped);
  const done = markDone(skipped, 'p2');
  assert.deepEqual(done.skipped, []);
  assert.deepEqual(done.done, ['p2']);
  assert.equal(markDone(done, 'p2'), done);
  assert.equal(markSkipped(done, 'p2'), done, 'a done page cannot become skipped');
  const answered = recordQuiz(done, 'p3', 1);
  assert.deepEqual(answered.quiz, { p3: 1 });
  assert.equal(recordQuiz(answered, 'p3', 1), answered);
  assert.deepEqual(recordQuiz(answered, 'p3', 0).quiz, { p3: 0 });
});

test('lesson states', () => {
  assert.equal(lessonState(l1, emptyProgress()), 'new');
  assert.equal(lessonState(l1, markSkipped(emptyProgress(), 'p2')), 'started');
  assert.equal(lessonState(l1, recordQuiz(emptyProgress(), 'p3', 0)), 'started');
  assert.equal(lessonState(l1, withDone('p2')), 'started');
  assert.equal(lessonState(l1, withDone('p2', 'p3')), 'done');
  assert.equal(lessonState(l1, withDone('p1', 'p2')), 'started', 'p1 has no task');
  assert.equal(lessonState(l4, withDone('p6')), 'started', 'no task pages: never done');
  assert.equal(lessonState(l4, emptyProgress()), 'new');
});

test('book progress counts pages with a task', () => {
  assert.deepEqual(bookProgress(book, emptyProgress()), { done: 0, total: 4 });
  assert.deepEqual(bookProgress(book, withDone('p1', 'p2', 'r1', 'zzz')), { done: 1, total: 4 });
  assert.deepEqual(bookProgress(book, withDone('p2', 'p3', 'p4', 'p5')), { done: 4, total: 4 });
});

test('achievements', () => {
  assert.deepEqual(earnedAchievements(book, emptyProgress()), []);
  assert.deepEqual(earnedAchievements(book, withDone('p2')), ['first-led']);
  assert.deepEqual(earnedAchievements(book, withDone('p4')), ['first-program', 'no-hints']);
  assert.deepEqual(earnedAchievements(book, withDone('p2', 'p3')), ['first-led', 'no-hints']);
  assert.deepEqual(earnedAchievements(book, withDone('p2', 'p3', 'p4')), [
    'first-led',
    'first-program',
    'chapter:c1',
    'no-hints',
  ]);
  assert.deepEqual(earnedAchievements(book, withDone('p2', 'p3', 'p4', 'p5')), [
    'first-led',
    'first-program',
    'chapter:c1',
    'chapter:c2',
    'no-hints',
    'book-done',
  ]);
  // A skipped page is not done, so the lesson does not count.
  const skipped = markSkipped(withDone('p3'), 'p2');
  assert.deepEqual(earnedAchievements(book, skipped), []);
  assert.equal(l2.pages.length, 1);
  assert.equal(l3.pages.length, 1);
});

test('a book without tasks earns nothing', () => {
  const plain: BookDef = { ...book, chapters: [{ id: 'c', title: 'C', lessons: [l4] }] };
  assert.deepEqual(earnedAchievements(plain, withDone('p6')), []);
  assert.deepEqual(bookProgress(plain, withDone('p6')), { done: 0, total: 0 });
});

test('the page a book was left at is remembered per book and survives bad data', () => {
  const { storage, get } = memory();
  assert.equal(loadPlace('arduino', get), null);
  savePlace('arduino', 'blink-code', get);
  savePlace('esp32s3', 'hello-idea', get);
  assert.equal(loadPlace('arduino', get), 'blink-code');
  assert.equal(loadPlace('esp32s3', get), 'hello-idea');
  storage.setItem(placeKey('arduino'), '{broken');
  assert.equal(loadPlace('arduino', get), null);
  storage.setItem(placeKey('arduino'), JSON.stringify(42));
  assert.equal(loadPlace('arduino', get), null);
  assert.equal(loadPlace('arduino', broken), null);
  assert.doesNotThrow(() => savePlace('arduino', 'x', broken));
});
