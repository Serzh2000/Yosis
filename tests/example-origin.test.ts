import test from 'node:test';
import assert from 'node:assert/strict';
import type { Project } from '../shared/types';
import { validateProject as validateServerProject } from '../server/validation';
import { examples } from '../src/lib/examples';
import { loadExample, validateProject } from '../src/lib/projects';
import { createWizardProject } from '../src/lib/project-wizard';
import {
  contentSimilarity,
  findStaleExampleCopy,
  hashFiles,
  markExampleOrigin,
} from '../src/lib/example-origin';

const logicLab = examples.find((example) => example.id === 'logic')!;
// Библиотека «стала новее»: тот же пример с исправленной строкой.
const fixedLibrary = (library = examples) =>
  library.map((example) =>
    example.id === logicLab.id
      ? {
          ...example,
          project: {
            ...example.project,
            files: example.project.files.map((file) =>
              file.name.endsWith('.v')
                ? { ...file, content: `${file.content}// исправление библиотеки\n` }
                : file,
            ),
          },
        }
      : example,
  );
const sourceName = logicLab.project.files.find((file) => file.name.endsWith('.v'))!.name;

test('идентификаторы примеров подходят для метки происхождения', () => {
  for (const example of examples) assert.match(example.id, /^[a-z0-9][a-z0-9-]{0,63}$/);
});

test('отпечаток не зависит от порядка файлов и перевода строк, но замечает правки', () => {
  const files = logicLab.project.files;
  assert.equal(hashFiles(files), hashFiles([...files].reverse()));
  assert.equal(
    hashFiles(files),
    hashFiles(files.map((file) => ({ ...file, content: file.content.replace(/\n/g, '\r\n') }))),
  );
  assert.notEqual(
    hashFiles(files),
    hashFiles(files.map((file) => ({ ...file, content: `${file.content} ` }))),
  );
  assert.match(hashFiles(files), /^[0-9a-f]{16}$/);
});

test('новая копия помечается происхождением и проходит проверку клиента и сервера', () => {
  const copy = loadExample(logicLab, []);
  assert.equal(copy.origin?.exampleId, 'logic');
  assert.equal(copy.origin?.sourceHash, hashFiles(logicLab.project.files));
  assert.equal(copy.origin?.copyHash, hashFiles(copy.files));
  assert.deepEqual(validateProject(copy).origin, copy.origin);
  assert.deepEqual(validateServerProject(copy).origin, copy.origin);
  // Повреждённая метка не отклоняет проект, а отбрасывается.
  const broken = { ...copy, origin: { exampleId: 'X', sourceHash: 'nope', copyHash: 1 } };
  assert.equal(validateProject(broken).origin, undefined);
});

test('мастер помечает копию примера, но не заготовки; переименование модуля не считается правкой', () => {
  const fromExample = createWizardProject({ start: 'logic', name: 'my-logic', top: 'my_top' }, []);
  assert.equal(fromExample.origin?.exampleId, 'logic');
  assert.equal(findStaleExampleCopy(fromExample, examples), null);
  assert.equal(findStaleExampleCopy(fromExample, fixedLibrary())?.certainty, 'marked');
  const blank = createWizardProject({ start: 'blank', name: 'mine', top: 'top' }, []);
  assert.equal(blank.origin, undefined);
});

test('отмеченная копия: уведомление при изменении библиотеки, но не после правок ученика', () => {
  const copy = loadExample(logicLab, []);
  assert.equal(findStaleExampleCopy(copy, examples), null, 'библиотека не менялась');
  const stale = findStaleExampleCopy(copy, fixedLibrary());
  assert.equal(stale?.certainty, 'marked');
  assert.equal(stale?.example.id, 'logic');
  assert.equal(
    stale?.currentHash,
    hashFiles(fixedLibrary().find((e) => e.id === 'logic')!.project.files),
  );
  // Ученик менял файл: проект его собственный, напоминания нет.
  const edited: Project = {
    ...copy,
    files: copy.files.map((file) =>
      file.name === sourceName ? { ...file, content: `${file.content}// моё\n` } : file,
    ),
  };
  assert.equal(findStaleExampleCopy(edited, fixedLibrary()), null);
  // Пример удалён из библиотеки.
  assert.equal(
    findStaleExampleCopy(
      copy,
      examples.filter((example) => example.id !== 'logic'),
    ),
    null,
  );
});

test('старый проект без метки: осторожное распознавание по имени, модулю, файлам и сходству', () => {
  const { origin: _origin, ...legacy } = loadExample(logicLab, []);
  // Сохранён со старым текстом: «нажата = 0» вместо исправленного.
  const old: Project = {
    ...legacy,
    files: legacy.files.map((file) =>
      file.name === sourceName
        ? { ...file, content: file.content.replace(/нажата = 1/g, 'нажата = 0') }
        : file,
    ),
  };
  assert.notEqual(
    hashFiles(old.files),
    hashFiles(logicLab.project.files),
    'пример действительно отличается',
  );
  const found = findStaleExampleCopy(old, examples);
  assert.equal(found?.certainty, 'guess');
  assert.equal(found?.example.id, 'logic');
  // Имя «logic-lab-2» тоже подходит, чужое имя — нет.
  assert.equal(
    findStaleExampleCopy({ ...old, name: `${logicLab.project.name}-2` }, examples)?.certainty,
    'guess',
  );
  assert.equal(
    findStaleExampleCopy({ ...old, name: `${logicLab.project.name}-final` }, examples),
    null,
  );
  assert.equal(findStaleExampleCopy({ ...old, name: 'my-logic' }, examples), null);
  // Другой верхний модуль или набор файлов — не копия.
  assert.equal(findStaleExampleCopy({ ...old, top: 'other' }, examples), null);
  assert.equal(
    findStaleExampleCopy(
      { ...old, files: [...old.files, { name: 'extra.v', content: '' }] },
      examples,
    ),
    null,
  );
  // Полностью переписанный проект с тем же именем не трогаем.
  assert.equal(
    findStaleExampleCopy(
      {
        ...old,
        files: old.files.map((file) =>
          file.name === sourceName ? { ...file, content: 'module top;\nendmodule\n' } : file,
        ),
      },
      examples,
    ),
    null,
  );
  // Точная копия текущей версии — устаревшей не считается.
  assert.equal(findStaleExampleCopy({ ...legacy, files: logicLab.project.files }, examples), null);
});

test('сходство содержимого: одинаковые — 1, непохожие — около 0', () => {
  const a = [{ name: 'a.v', content: 'one\ntwo\nthree\nfour\n' }];
  assert.equal(contentSimilarity(a, a), 1);
  assert.equal(contentSimilarity(a, [{ name: 'a.v', content: 'x\ny\n' }]), 0);
  assert.equal(contentSimilarity(a, [{ name: 'a.v', content: 'one\ntwo\nthree\nfive\n' }]), 0.75);
  assert.equal(markExampleOrigin(legacyProject(), logicLab).origin?.exampleId, 'logic');
});

function legacyProject(): Project {
  return { name: 'p', top: 'top', board: 'tangnano20k', files: [{ name: 'top.v', content: 'x' }] };
}
