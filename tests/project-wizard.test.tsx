import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWizardProject,
  suggestWizardName,
  validateWizardFields,
  wizardStartingPoints,
} from '../src/lib/project-wizard';
import { examples } from '../src/lib/examples';
import { parseCstPins } from '../src/lib/physical';
import { validateProject as validateServerProject } from '../server/validation';
import { materializeCircuitProject } from '../shared/schematic';

test('wizard creates independent commented projects for every starting point and renames only the top declaration', () => {
  const originals = JSON.stringify(wizardStartingPoints);
  for (const start of wizardStartingPoints) {
    const project = createWizardProject({
      start: start.id,
      name: `Учебный ${start.id}`,
      top: 'my_device',
    });
    assert.equal(project.top, 'my_device');
    assert.deepEqual(project, validateServerProject(project));
    const source = materializeCircuitProject(project)
      .files.filter((file) => /\.(?:v|sv)$/.test(file.name))
      .map((file) => file.content)
      .join('\n');
    assert.equal((source.match(/\bmodule my_device\b/g) ?? []).length, 1, start.id);
    assert.equal((source.match(/\bmodule top\s*[#(]/g) ?? []).length, 0, start.id);
    const cst = project.files.find((file) => file.name.endsWith('.cst'))!;
    assert.ok(cst.content.includes('//'), start.id);
    assert.deepEqual(
      parseCstPins(project.files),
      parseCstPins(start.project.files),
      `${start.id}: top name does not alter port contracts`,
    );
    project.files[0].content = 'edited';
    project.files[1].content = 'edited too';
  }
  assert.equal(JSON.stringify(wizardStartingPoints), originals);
  const alu = createWizardProject({ start: 'alu', name: 'CPU lab', top: 'cpu_demo' });
  assert.match(alu.files.find((file) => file.name === 'alu.v')!.content, /module alu\b/);
  assert.deepEqual(
    alu.files.slice(1),
    examples.find((example) => example.id === 'alu')!.project.files.slice(1),
  );
});

test('wizard guards saved names, malformed identifiers and collisions with child modules', () => {
  const valid = { start: 'alu', name: 'Мой проект', top: 'top' };
  assert.deepEqual(validateWizardFields(valid), {});
  assert.match(validateWizardFields(valid, [' мой ПРОЕКТ ']).name!, /уже есть/);
  for (const top of [
    '2top',
    'two words',
    'module',
    'always',
    'wire',
    'join',
    'join_any',
    'join_none',
    'forkjoin',
    'alias',
    'rcmos',
    'real',
    'realtime',
    'instance',
    'interconnect',
    'top; module other',
    'x'.repeat(129),
  ]) {
    assert.ok(validateWizardFields({ ...valid, top }).top, top);
    assert.throws(() => createWizardProject({ ...valid, top }), /Имя|буквы/);
  }
  assert.match(validateWizardFields({ ...valid, top: 'alu' }).top!, /уже есть внутри/);
  assert.deepEqual(
    validateWizardFields({ ...valid, top: 'decoder_join' }),
    {},
    'Keywords inside a valid name are allowed',
  );
  assert.throws(() => createWizardProject({ ...valid, top: 'alu' }), /уже есть внутри/);
  assert.match(validateWizardFields({ ...valid, start: 'unknown' }).start!, /Выберите/);
  assert.ok(validateWizardFields({ ...valid, name: ' ' }).name);
  assert.ok(validateWizardFields({ ...valid, name: 'a'.repeat(101) }).name);
  assert.equal(suggestWizardName(['my-first-fpga', 'my-first-fpga-2']), 'my-first-fpga-3');
  assert.equal(suggestWizardName([' DEMO ', 'demo-2'], 'demo'), 'demo-3');
  assert.equal(suggestWizardName([], '  '), 'my-first-fpga');
});

test('own-scheme starter has a complete clock/reset/LED board contract', () => {
  const project = createWizardProject({ start: 'blank', name: 'Своя схема', top: 'top' });
  assert.deepEqual(
    parseCstPins(project.files).map((pin) => [pin.signal, pin.pin]),
    [
      ['clk', '4'],
      ['reset', '88'],
      ...Array.from({ length: 6 }, (_, bit) => [`led_n[${bit}]`, String(15 + bit)]),
    ],
  );
  assert.match(project.files[0].content, /input wire clk/);
  assert.match(project.files[0].content, /assign led_n = 6'b111111/);
  assert.match(project.files[1].content, /CLOCK_LOC "clk" BUFG;/);
  assert.doesNotMatch(project.files[1].content, /"enable"|"count\[/);
});
