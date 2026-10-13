import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { examples } from '../src/lib/examples';
import { starterProject, STARTER_ID } from '../src/lib/starter-project';
import { validateProject } from '../shared/project-validation';

test('the starter project equals the first library example', () => {
  assert.equal(examples[0].id, STARTER_ID);
  assert.deepEqual(starterProject(), examples[0].project);
  assert.doesNotThrow(() => validateProject(starterProject()));
});

test('the starter project is a fresh copy on every call', () => {
  const first = starterProject();
  first.files[0].content = 'changed';
  assert.notEqual(starterProject().files[0].content, 'changed');
});

test('the example library stays out of the initial JavaScript graph', async () => {
  // Только исходники репозитория: пакеты внешние, CSS и шрифты пустые.
  const result = await build({
    entryPoints: [resolve('src/main.tsx')],
    bundle: true,
    splitting: true,
    format: 'esm',
    outdir: resolve('.test-out'),
    write: false,
    metafile: true,
    packages: 'external',
    jsx: 'automatic',
    logLevel: 'silent',
    loader: { '.css': 'empty' },
  });
  const outputs = result.metafile.outputs;
  const entry = Object.entries(outputs).find(([, output]) => output.entryPoint)![0];
  const staticChunks = new Set<string>();
  const visit = (name: string) => {
    if (staticChunks.has(name)) return;
    staticChunks.add(name);
    for (const item of outputs[name].imports)
      if (item.kind === 'import-statement' && outputs[item.path]) visit(item.path);
  };
  visit(entry);
  const inputs = [...staticChunks].flatMap((name) => Object.keys(outputs[name].inputs));
  const leaked = inputs.filter((file) => /src\/lib\/examples(-[a-z0-9-]+)?\.ts$/.test(file));
  assert.deepEqual(leaked, [], 'библиотека примеров попала в стартовый граф');
});
