import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
import { examples } from '../src/lib/examples';
import { filterExampleCatalog } from '../src/lib/example-catalog';
import {
  compareCurriculumExamples,
  curriculumLevels,
  getExampleLesson,
} from '../src/lib/example-curriculum';

// Node's TS loader does not load CSS. Bundle only repository source for SSR;
// React remains external so the components use the renderer's actual dispatcher.
const require = createRequire(import.meta.url);
async function component<Props>(file: string, name: string): Promise<ComponentType<Props>> {
  const result = await build({
    entryPoints: [resolve(file)],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    jsx: 'automatic',
    loader: { '.css': 'empty' },
  });
  const compiled = { exports: {} as Record<string, ComponentType<Props>> };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(
    require,
    compiled,
    compiled.exports,
  );
  return compiled.exports[name];
}

test('catalog starts with authored novice progression and does not mutate projects', () => {
  const originalIds = examples.map((example) => example.id);
  const originalProjects = JSON.stringify(examples);
  const novice = filterExampleCatalog(examples, { level: 1 });
  assert.equal(novice.length, 25);
  assert.deepEqual(
    novice.slice(0, 3).map((example) => example.id),
    ['button', 'not', 'gates'],
  );
  assert.ok(novice.every((example) => getExampleLesson(example.id)?.level === 1));
  const all = filterExampleCatalog(examples, { level: 'all', topic: 'all', query: ' \n ' });
  assert.equal(all.length, 108);
  assert.deepEqual(all, [...examples].sort(compareCurriculumExamples));
  assert.deepEqual(
    examples.map((example) => example.id),
    originalIds,
  );
  assert.equal(JSON.stringify(examples), originalProjects);
});

test('level, topic and search terms intersect, including objectives and ё/е spelling', () => {
  const dsp = filterExampleCatalog(examples, { level: 3, topic: 'dsp' });
  assert.deepEqual(
    dsp.map((example) => example.id),
    [
      'duty-cycle',
      'event-window',
      'majority-filter',
      'capture-minmax',
      'lookup-sine',
      'moving-average',
      'dds-tone',
    ],
  );
  assert.deepEqual(
    filterExampleCatalog(examples, { level: 4, topic: 'dsp', query: 'signed коэффициенты' }).map(
      (example) => example.id,
    ),
    ['fir-filter'],
  );
  assert.ok(
    filterExampleCatalog(examples, { query: 'СЧЕТЧИК' }).some(
      (example) => example.id === 'counter',
    ),
  );
  assert.deepEqual(
    filterExampleCatalog(examples, { query: 'предел пропускной' }).map((example) => example.id),
    ['async-toggle-sync'],
    'search uses the learning objective',
  );
  assert.deepEqual(filterExampleCatalog(examples, { level: 1, query: 'UART' }), []);
  assert.deepEqual(filterExampleCatalog(examples, { topic: 'memory', query: 'FIR' }), []);
  assert.deepEqual(filterExampleCatalog(examples, { query: 'никакого такого примера нет' }), []);
  assert.deepEqual(filterExampleCatalog([{ ...examples[0], id: 'custom-unknown' }], {}), []);
});

test('example dialog renders four accessible levels and a useful novice lesson before opening a project', async () => {
  const Dialog = await component<{ onChoose: (id: string) => void; onClose: () => void }>(
    'src/components/ExamplesDialog.tsx',
    'ExamplesDialog',
  );
  const html = renderToStaticMarkup(createElement(Dialog, { onChoose() {}, onClose() {} }));
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby="examples-heading"/);
  assert.match(html, /aria-label="Найти пример"/);
  assert.match(html, /aria-label="Тема примеров"/);
  assert.match(html, /aria-label="Закрыть примеры"/);
  const nav = html.match(/<nav class="example-levels"[\s\S]*?<\/nav>/)![0];
  for (const level of curriculumLevels) assert.ok(nav.includes(level.title), level.title);
  assert.match(nav, /aria-pressed="true"><b>1<\/b><span>Первые схемы/);
  assert.equal((html.match(/class="example-card"/g) ?? []).length, 25);
  assert.ok(
    !html.includes('Маленький процессор: fetch и execute'),
    'advanced projects are not dumped into the first view',
  );
  const lesson = html.match(/<aside class="example-lesson"[\s\S]*?<\/aside>/)![0];
  assert.ok(lesson.includes('Кнопка → LED'));
  assert.ok(lesson.includes(getExampleLesson('button')!.objective));
  assert.ok(lesson.includes(getExampleLesson('button')!.observe));
  assert.ok(lesson.includes(getExampleLesson('button')!.experiment));
  assert.match(lesson, /До этого полезно пройти/);
  assert.match(lesson, /Можно начинать с этого примера/);
  assert.match(lesson, /<button type="button"[^>]*>Открыть проект/);
});

test('wizard groups every additional project by its curriculum level without duplicating quick starts', async () => {
  const Wizard = await component<{
    onCreate: () => void;
    onClose: () => void;
    existingNames: string[];
  }>('src/components/ProjectWizard.tsx', 'ProjectWizard');
  const html = renderToStaticMarkup(
    createElement(Wizard, { onCreate() {}, onClose() {}, existingNames: [] }),
  );
  assert.match(html, /<label[^>]*for="wizard-example"/);
  const select = html.match(/<select id="wizard-example"[\s\S]*?<\/select>/)![0];
  const groups = [...select.matchAll(/<optgroup label="([^"<>]+)">([\s\S]*?)<\/optgroup>/g)];
  assert.equal(groups.length, 4);
  const quickStarts = new Set(['button', 'logic', 'counter', 'blank']);
  const allOptions: string[] = [];
  for (const [index, group] of groups.entries()) {
    const level = curriculumLevels[index];
    assert.equal(group[1], `${level.id}. ${level.title}`);
    const ids = [...group[2].matchAll(/<option value="([^"<>]+)"/g)].map((match) => match[1]);
    const expected = examples
      .filter(
        (example) =>
          !quickStarts.has(example.id) && getExampleLesson(example.id)?.level === level.id,
      )
      .sort(compareCurriculumExamples)
      .map((example) => example.id);
    assert.deepEqual(ids, expected);
    allOptions.push(...ids);
  }
  assert.equal(new Set(allOptions).size, allOptions.length);
  assert.equal(allOptions.length, examples.length - 3, 'blank is separate from built-in examples');
  for (const id of quickStarts) assert.ok(!allOptions.includes(id));
  assert.match(html, /aria-label="Начальная схема"/);
  assert.match(html, /Своя схема/);
  assert.match(html, /Для первого знакомства/);
});
