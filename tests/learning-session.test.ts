import test from 'node:test';
import assert from 'node:assert/strict';
import { guidedLessons } from '../src/lib/learning-course';
import {
  explainLearningFailure,
  explainLearningVerdicts,
  learningProject,
  parseLearningDrafts,
} from '../src/lib/learning-session';
import type { LessonVerdict } from '../src/lib/lessons';
import { validateProject } from '../server/validation';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('saved learning drafts accept only known practical lesson IDs and bounded text', () => {
  for (const invalid of [null, undefined, false, 3, [], 'malformed JSON', 'null', '[]', '42'])
    assert.deepEqual(parseLearningDrafts(invalid), {});
  const boundary = '//'.padEnd(100_000, ' ');
  const saved = {
    welcome: 'not a practical lesson',
    unknown: 'module top; endmodule',
    not: '',
    and: 42,
    mux: null,
    register: [],
    counter: { content: 'text' },
    ports: boundary,
    xor: 'x'.repeat(100_001),
    buses: '\u0000corrupt source',
  };
  assert.deepEqual(parseLearningDrafts(saved), { ports: boundary, not: '' });
  assert.deepEqual(parseLearningDrafts(JSON.stringify(saved)), { ports: boundary, not: '' });
  const source = 'module top(input a, output y);\n    assign y = ~a;\nendmodule\n';
  assert.deepEqual(parseLearningDrafts(JSON.stringify({ not: source })), { not: source });
});

test('learning project edits create an independent source copy while preserving every CST contract and source order', () => {
  const snapshot = JSON.stringify(guidedLessons);
  for (const lesson of guidedLessons.filter((item) => item.exercise)) {
    const starter = learningProject(lesson.id, {})!;
    assert.deepEqual(starter, lesson.exercise!.project);
    assert.notEqual(starter, lesson.exercise!.project);
    assert.notEqual(starter.files, lesson.exercise!.project.files);
    for (let index = 0; index < starter.files.length; index++)
      assert.notEqual(starter.files[index], lesson.exercise!.project.files[index]);
    assert.deepEqual(validateProject(starter), starter);
    const draft = '// мой учебный черновик\n' + starter.files[0].content;
    const edited = learningProject(lesson.id, { [lesson.id]: draft })!;
    assert.equal(edited.files[0].content, draft);
    assert.deepEqual(
      edited.files.map((file) => file.name),
      lesson.exercise!.project.files.map((file) => file.name),
    );
    assert.deepEqual(edited.files.slice(1), lesson.exercise!.project.files.slice(1));
    edited.files[0].content = 'independent mutation';
    for (const file of edited.files.slice(1)) file.content = 'edited pin copy';
  }
  assert.equal(JSON.stringify(guidedLessons), snapshot);
  assert.equal(
    learningProject('not', { not: '' })!.files[0].content,
    '',
    'empty editor must remain empty rather than secretly restoring a starter',
  );
  assert.equal(learningProject('welcome', {}), null);
  assert.equal(learningProject('unknown', {}), null);
  assert.ok(learningProject('ports', {})!.files.some((file) => file.name.endsWith('.cst')));
  assert.ok(learningProject('decoder', {})!.files.some((file) => file.name.endsWith('.cst')));
});

test('simulator errors explain syntax, signal names, elapsed time and unavailable service separately', () => {
  assert.match(explainLearningFailure('top.v:6: syntax error'), /;.*скобки.*begin.*end/);
  assert.match(explainLearningFailure('unexpected TOK_END'), /Номер строки/);
  assert.match(explainLearningFailure('Unable to bind wire/reg/memory `button`'), /имя сигнала/);
  assert.match(explainLearningFailure('unknown identifier A'), /A и a/);
  assert.match(explainLearningFailure('Simulation timed out'), /не завершилась вовремя/);
  assert.match(explainLearningFailure('Failed to fetch'), /Код сохранён/);
  assert.match(explainLearningFailure('HTTP 503'), /Сервис симуляции/);
  assert.match(explainLearningFailure('unsupported bidirectional port'), /сообщение симулятора/);
});

const pass: LessonVerdict = {
  title: 'Первый случай',
  inputs: { a: '0', b: '1' },
  expected: '1',
  actual: '1',
  passed: true,
};
test('verdict explanation reports the first concrete mismatch including tested inputs', () => {
  const failure: LessonVerdict = {
    title: 'Два разрешения',
    inputs: { a: '1', b: '0' },
    expected: '0',
    actual: '1',
    passed: false,
  };
  const message = explainLearningVerdicts([pass, failure, { ...failure, actual: 'x' }], 'y');
  assert.match(message, /Два разрешения/);
  assert.match(message, /a = 1, b = 0/);
  assert.match(message, /ожидается y = 0.*получается 1/);
  assert.doesNotMatch(message, /не определён/);
  assert.match(explainLearningVerdicts([pass], 'y'), /Все проверки прошли: 1 из 1/);
});

test('missing output and unknown X/Z values receive different diagnoses; no verdict is not a success', () => {
  const missing = explainLearningVerdicts(
    [{ ...pass, actual: 'нет сигнала', passed: false }],
    'led_n',
  );
  assert.match(missing, /led_n/);
  assert.match(missing, /выход.*модул|имя.*порт|объявлен.*output/i);
  assert.doesNotMatch(missing, /память получает сброс/);
  for (const value of ['x', 'z', '10x0', '00Z1', '?']) {
    const message = explainLearningVerdicts([{ ...pass, actual: value, passed: false }], 'q');
    assert.match(message, /не определён/);
    assert.match(message, /сброс/);
  }
  const empty = explainLearningVerdicts([], 'y');
  assert.doesNotMatch(empty, /прошли/);
  assert.match(empty, /не провер|нет результатов|не получены/i);
});

test('learning panel renders its introductory playground and locked route without browser storage', async () => {
  // Bundle source-owned CSS as empty for server rendering. Dependencies remain external
  // so the renderer and component share one React runtime rather than duplicate copies.
  const bundled = await build({
    entryPoints: [fileURLToPath(new URL('../src/components/LearningPanel.tsx', import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    loader: { '.css': 'empty' },
    logLevel: 'silent',
  });
  const loaded = {
    exports: {} as {
      LearningPanel: ComponentType<{
        project: ReturnType<typeof learningProject>;
        available: boolean;
        projectBusy: boolean;
        onLoadProject: () => void;
        onExplore: () => void;
      }>;
    },
  };
  new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(
    createRequire(import.meta.url),
    loaded,
    loaded.exports,
  );
  const markup = renderToStaticMarkup(
    createElement(loaded.exports.LearningPanel, {
      project: learningProject('ports', {}),
      available: true,
      projectBusy: false,
      onLoadProject: () => {},
      onExplore: () => {},
    }),
  );
  assert.match(markup, /Твоя мастерская/);
  // The course now opens with the no-code beginner strand; the logic playground belongs to the
  // later orientation lesson and is checked in the browser.
  assert.match(markup, /Что у нас в руках/);
  assert.match(markup, /Привет!/);
  assert.match(markup, /Словарь/);
  assert.match(markup, /С наставником/);
  assert.match(markup, /Свободные задания/);
  assert.match(markup, /Маршрут обучения/);
  const picker = markup.match(/<select aria-label="Выбрать урок"[\s\S]*?<\/select>/)?.[0];
  assert.ok(picker, 'compact screens retain a route selector');
  assert.equal((picker.match(/<optgroup /g) ?? []).length, 6);
  assert.equal((picker.match(/<option /g) ?? []).length, guidedLessons.length);
  assert.equal(
    (picker.match(/<option[^>]*disabled=""/g) ?? []).length,
    guidedLessons.length - 1,
    'future lessons remain locked in compact navigation',
  );
  assert.match(markup, /Заверши предыдущий урок/);
  assert.ok(
    (markup.match(/disabled=""/g) ?? []).length >= guidedLessons.length,
    'route is unavailable until browser progress restoration finishes',
  );
});
