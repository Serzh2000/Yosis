import test from 'node:test';
import assert from 'node:assert/strict';
import type { PageDef } from '../src/learn/content/schema';
import { deskFor, routeOf, stagesOfLesson } from '../src/learn/stages';

const page = (id: string, task?: PageDef['task'], blocks: PageDef['blocks'] = []): PageDef => ({
  id,
  blocks,
  task,
});
const quiz = { kind: 'quiz', text: 'q' } as const;
const sim = { kind: 'sim', text: 's', lessonId: 'x' } as const;
const build = { kind: 'build', text: 'b', until: () => true } as const;

test('a lesson goes from the idea through the guess to the practice, and never back', () => {
  const stages = stagesOfLesson([
    page('a'),
    page('b'),
    page('c', quiz),
    page('d'),
    page('e', sim),
    page('f', quiz),
    page('g'),
  ]);
  assert.deepEqual(stages, [
    'idea',
    'idea',
    'predict',
    'predict',
    'practice',
    'practice',
    'practice',
  ]);
});

test('the route lists only the stages a lesson really has, each with its first page', () => {
  const route = routeOf(stagesOfLesson([page('a'), page('b', build), page('c')]));
  assert.deepEqual(
    route.map((stop) => [stop.stage.id, stop.first, stop.count]),
    [
      ['idea', 0, 1],
      ['practice', 1, 2],
    ],
  );
  assert.equal(routeOf([]).length, 0);
});

test('a page of parts or of insertable code counts as practice', () => {
  assert.deepEqual(
    stagesOfLesson([
      page('a'),
      page('b', undefined, [{ kind: 'parts', items: [{ def: 'led', count: 1 }] }]),
    ]),
    ['idea', 'practice'],
  );
  assert.deepEqual(
    stagesOfLesson([page('a', undefined, [{ kind: 'code', code: 'x', insertable: true }])]),
    ['practice'],
  );
});

test('the desk turns to the code, to the circuit or to the board as the page asks', () => {
  assert.equal(deskFor(page('a', sim)), 'design');
  assert.equal(deskFor(page('b', { kind: 'circuit', text: 'c', exercise: {} as never })), 'design');
  assert.equal(deskFor(page('c', build)), 'bench');
  assert.equal(
    deskFor(page('d', undefined, [{ kind: 'parts', items: [{ def: 'led', count: 1 }] }])),
    'bench',
  );
  assert.equal(deskFor(page('e', quiz)), null);
  assert.equal(deskFor(page('f')), null);
});
