import test from 'node:test';
import assert from 'node:assert/strict';
import type { Project } from '../shared/types';
import { materializeCircuitProject, starterCircuit } from '../shared/schematic';
import { validateProject } from '../shared/project-validation';
import { planSchematicAddition } from '../src/lib/circuit-add';
import { examples } from '../src/lib/examples';
import { createWizardProject } from '../src/lib/project-wizard';

const hdl = (files: Array<[string, string]>, top = 'top'): Project => ({
  name: 'p',
  top,
  board: 'tangnano20k',
  files: files.map(([name, content]) => ({ name, content })),
});

test('в проект с описанным верхним модулем схему добавлять нельзя и объясняется почему', () => {
  const plan = planSchematicAddition(
    hdl([['top.v', 'module top(input a, output y); assign y = a; endmodule']]),
  );
  assert.equal(plan.ok, false);
  if (!plan.ok) assert.match(plan.reason, /top\.v/);
  // Модуль объявлен в другом файле: файл top.v свободен, но модуль занят.
  const other = planSchematicAddition(
    hdl([['main.v', 'module top(input a, output y); assign y = a; endmodule']]),
  );
  assert.equal(other.ok, false);
  if (!other.ok) assert.match(other.reason, /main\.v/);
});

test('каждый встроенный Verilog-пример упирается в тот же конфликт', () => {
  for (const example of examples) {
    const plan = planSchematicAddition(example.project);
    assert.equal(plan.ok, false, example.id);
  }
});

test('упоминание модуля в комментарии не считается объявлением', () => {
  const plan = planSchematicAddition(
    hdl([
      [
        'helpers.v',
        '// module top(...) будет в схеме\nmodule helper(input a, output y); assign y = a; endmodule',
      ],
    ]),
  );
  assert.deepEqual(plan, { ok: true, fileName: 'top.ysch' });
});

test('схема, добавленная по плану, проходит проверку и собирается в Verilog', () => {
  const project = hdl([
    ['helpers.v', 'module helper(input a, output y); assign y = a; endmodule'],
    ['board.cst', 'IO_LOC "button" 88;\n'],
  ]);
  const plan = planSchematicAddition(project);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  const next = {
    ...project,
    files: [
      ...project.files,
      { name: plan.fileName, content: JSON.stringify(starterCircuit(), null, 2) },
    ],
  };
  validateProject(next);
  const built = materializeCircuitProject(next);
  assert.ok(built.files.some((file) => file.name === 'top.v' && /module top\b/.test(file.content)));
});

test('конфликт имени файла и существующая схема отклоняются', () => {
  const clash = planSchematicAddition(hdl([['TOP.v', '// пусто\n']], 'top'));
  assert.equal(clash.ok, false);
  const withSchematic = planSchematicAddition(
    hdl([['top.ysch', JSON.stringify(starterCircuit())]]),
  );
  assert.equal(withSchematic.ok, false);
});

test('безопасный путь из пустого состояния: новый проект из элементов создаётся из заготовки', () => {
  const created = createWizardProject({ start: 'schematic', name: 'my-schematic', top: 'top' }, [
    'p',
  ]);
  assert.ok(created.files.some((file) => file.name.endsWith('.ysch')));
  assert.equal(planSchematicAddition(created).ok, false, 'уже есть схема');
});
