import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deleteProject,
  duplicateProject,
  getProjectSnapshot,
  identifyProject,
  listProjects,
  loadProject,
  renameProject,
  saveProject,
  validateProject,
} from '../src/lib/projects';
import { examples } from '../src/lib/examples';
import { createProject } from '../src/lib/project-templates';
import { IDBFactory } from 'fake-indexeddb';
import { validateProject as validateServerProject } from '../server/validation';

test('frontend and backend accept the same source and CST project structure', () => {
  const project = createProject('мой-проект', 'counter');
  project.files.push({ name: 'rtl/include/options.svh', content: '`define WIDTH 8' });
  assert.deepEqual(validateProject(project), validateServerProject(project));
  for (const name of [
    '../pins.cst',
    'C:/pins.cst',
    'pins\\board.cst',
    'dir./board.cst',
    'aux.cst',
    'dir/nul.svh',
    'a/b/c/d/e/f/board.cst',
  ]) {
    const unsafe = { ...project, files: [...project.files, { name, content: '' }] };
    assert.throws(() => validateProject(unsafe), Error, name);
    assert.throws(() => validateServerProject(unsafe), Error, name);
  }
  assert.throws(
    () => validateProject({ ...project, files: [{ name: 'board.cst', content: '' }] }),
    /исходный файл/,
  );
  assert.throws(
    () =>
      validateProject({
        ...project,
        files: [...project.files, { name: 'BOARD.cst', content: '' }],
      }),
    /повторяется/,
  );
  assert.throws(
    () =>
      validateProject({
        ...project,
        files: [{ name: 'top.v', content: ' '.repeat(512 * 1024 + 1) }],
      }),
    /512/,
  );
  for (const files of [
    [
      { name: 'top.v', content: '' },
      { name: 'TOP.v/child.v', content: '' },
    ],
    [
      { name: 'rtl.v/child.v', content: '' },
      { name: 'RTL.v', content: '' },
    ],
  ]) {
    assert.throws(() => validateProject({ ...project, files }), /файл и папка/);
    assert.throws(() => validateServerProject({ ...project, files }), /файл и папка/);
  }
});

test('new project templates include independent source and physical constraints', () => {
  const original = JSON.stringify(examples);
  for (const template of ['blank', 'logic', 'counter'] as const) {
    const project = createProject(`new-${template}`, template);
    assert.equal(project.top, 'top');
    assert.equal(project.files.filter((file) => file.name.endsWith('.cst')).length, 1);
    assert.match(project.files[0].content, /module top/);
    project.files[0].content = 'changed';
  }
  assert.equal(JSON.stringify(examples), original);
  assert.throws(() => createProject('', 'blank'), /Название/);
});

async function withStorage(run: (entries: Map<string, string>) => Promise<void>) {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
  const properties = ['localStorage', 'indexedDB'] as const;
  const prior = properties.map((key) => Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true });
  try {
    await run(entries);
  } finally {
    properties.forEach((key, index) => {
      if (prior[index]) Object.defineProperty(globalThis, key, prior[index]!);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
}

test('IndexedDB writes isolate projects with identical names and rename preserves the id', async () =>
  withStorage(async (entries) => {
    const first = await saveProject(identifyProject(createProject('same', 'blank')));
    const second = await saveProject(identifyProject(createProject('same', 'logic')));
    assert.notEqual(first.id, second.id);
    const firstEdited = {
      ...first,
      files: first.files.map((file) => ({ ...file, content: file.content + '\n// edit' })),
    };
    await saveProject(firstEdited);
    assert.deepEqual(await loadProject(second.id), second);
    const renamed = await renameProject(second.id!, '__proto__');
    assert.equal(renamed.id, second.id);
    assert.equal(renamed.name, '__proto__');
    assert.deepEqual(
      await loadProject(),
      firstEdited,
      'renaming another record must preserve the active project',
    );
    const list = await listProjects();
    assert.equal(list.length, 2);
    assert.ok(
      list.every((project) => !('files' in project)),
      'the chooser only reads metadata',
    );
    assert.equal(entries.size, 0, 'new projects never write a localStorage library');
  }));

test('duplicating produces independent files and deleting removes only the selected record', async () =>
  withStorage(async () => {
    const original = await saveProject(createProject('original', 'counter'));
    const copy = await duplicateProject(original.id!, 'copy');
    assert.notEqual(copy.id, original.id);
    assert.deepEqual(copy.files, original.files);
    copy.files[0].content = 'module top; endmodule';
    await saveProject(copy);
    assert.deepEqual((await loadProject(original.id)).files, original.files);
    await deleteProject(copy.id!);
    await assert.rejects(loadProject(copy.id), /не найден/);
    assert.deepEqual(
      (await listProjects()).map((item) => item.id),
      [original.id],
    );
    await assert.rejects(renameProject(original.id!, ''), /Название/);
    assert.deepEqual(await loadProject(original.id), original);
  }));

test('legacy current and library migrate atomically, once, keeping the latest unsaved source', async () =>
  withStorage(async (entries) => {
    const first = createProject('first', 'blank');
    const second = createProject('second', 'logic');
    const latest = {
      ...second,
      files: second.files.map((file) => ({
        ...file,
        content: file.content + '\n// current edits',
      })),
    };
    entries.set('yosis.projects.v1', JSON.stringify({ first, second }));
    entries.set('yosis.current.v1', JSON.stringify(latest));
    const [current, list] = await Promise.all([loadProject(), listProjects()]);
    assert.deepEqual(current.files, latest.files);
    assert.ok(current.id);
    assert.equal(list.length, 2);
    assert.equal(entries.has('yosis.projects.v1'), false);
    assert.equal(entries.has('yosis.current.v1'), false);
    assert.equal((await listProjects()).length, 2);
    assert.deepEqual(await loadProject(current.id), current);
  }));

test('migration keeps corrupted legacy content available while recovering valid records', async () =>
  withStorage(async (entries) => {
    const first = createProject('valid', 'blank');
    const raw = JSON.stringify({ first, broken: { name: 'broken' } });
    entries.set('yosis.projects.v1', raw);
    entries.set('yosis.current.v1', 'broken-json');
    const library = await listProjects();
    assert.equal(library.length, 1);
    assert.equal(library[0].name, 'valid');
    assert.equal(entries.get('yosis.projects.v1'), raw);
    assert.equal(entries.get('yosis.current.v1'), 'broken-json');
  }));

test('unavailable IndexedDB leaves the legacy project untouched', async () =>
  withStorage(async (entries) => {
    const raw = JSON.stringify(createProject('recover-me', 'counter'));
    entries.set('yosis.current.v1', raw);
    Reflect.deleteProperty(globalThis, 'indexedDB');
    await assert.rejects(loadProject(), /IndexedDB/);
    assert.equal(entries.get('yosis.current.v1'), raw);
  }));

test('project snapshots remain fresh across validation and become stale only after an edit', () => {
  const raw = identifyProject(createProject('fresh', 'counter'));
  const before = getProjectSnapshot(raw);
  const validated = validateProject(raw);
  assert.notEqual(
    JSON.stringify(raw),
    JSON.stringify(validated),
    'regression fixture changes id key order',
  );
  assert.equal(before, getProjectSnapshot(validated));
  const reordered = {
    files: raw.files.map((file) => ({ content: file.content, name: file.name })),
    board: raw.board,
    top: raw.top,
    name: raw.name,
    id: raw.id,
  };
  assert.equal(before, getProjectSnapshot(reordered));
  const edited = {
    ...raw,
    files: raw.files.map((file, index) =>
      index === 0 ? { ...file, content: file.content + '\n// source changed' } : file,
    ),
  };
  assert.notEqual(before, getProjectSnapshot(edited));
});
