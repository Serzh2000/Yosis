import assert from 'node:assert/strict';
import test from 'node:test';
import { blankComments } from '../shared/text-scan';
import { findPrimitiveModules } from '../shared/gowin-primitives';
import { canonicalCst, reservedPinsUsed, usesConfigurationPins } from '../server/unconstrained';
// @ts-expect-error The runner helpers are plain JavaScript modules.
import { compatibleProject } from '../server/verilog-compat.mjs';

/** Hostile inputs of 512 KB must be handled in well under a second: the server is single-threaded. */
const SIZE = 512 * 1024;
const FAST_MS = 1000;

function timed(run: () => void): number {
  const started = performance.now();
  run();
  return performance.now() - started;
}

test('blankComments keeps length and line breaks', () => {
  const source = 'a // x\nb /* y\nz */ c\n"st"';
  const blank = blankComments(source);
  assert.equal(blank.length, source.length);
  assert.equal(blank.split('\n').length, source.split('\n').length);
  assert.ok(blank.includes('"st"'));
  assert.ok(!blank.includes('x'));
});

test('blankComments blanks strings on request and ends an unclosed comment at the end', () => {
  assert.equal(blankComments('a "// not" b', true), 'a          b');
  assert.equal(blankComments('a /* b\nc').replace(/\s+/g, ''), 'a');
});

test('blankComments is linear on unclosed block comments', () => {
  assert.ok(timed(() => blankComments('/* '.repeat(SIZE / 3))) < FAST_MS);
});

test('constraint statements are read regardless of case, tabs, comments and missing semicolons', () => {
  const cst =
    '﻿io_loc\t"led"  10 ; /* IO_LOC "x" 1; */ // IO_LOC "y" 2;\nIO_PORT "led"\tIO_TYPE=LVCMOS33;';
  assert.equal(canonicalCst(cst), 'IO_LOC "led" 10;\nIO_PORT "led" IO_TYPE=LVCMOS33;');
  assert.equal(canonicalCst('IO_LOC "a" 1\nIO_LOC "b" 2;'), 'IO_LOC "a" 1;\nIO_LOC "b" 2;');
});

test('configuration and reserved pins are found', () => {
  assert.equal(usesConfigurationPins('IO_LOC "a" 52;'), true);
  assert.equal(usesConfigurationPins('IO_LOC "a" 10;'), false);
  assert.deepEqual(reservedPinsUsed('IO_LOC "a" 61;'), [{ port: 'a', pin: 61, role: 'flash MOSI' }]);
});

for (const [name, cst] of [
  ['unclosed comments', '/* '.repeat(SIZE / 3)],
  ['statements without a semicolon', 'IO_LOC "a" 1 '.repeat(SIZE / 14)],
  ['whitespace runs', `IO_LOC "a"${' '.repeat(SIZE)}`],
  ['keywords without names', 'IO_LOC '.repeat(SIZE / 7)],
] as const)
  test(`.cst scanning is fast on ${name}`, () => {
    assert.ok(
      timed(() => {
        canonicalCst(cst);
        usesConfigurationPins(cst);
        reservedPinsUsed(cst);
      }) < FAST_MS,
    );
  });

test('a module named like a primitive is found, comments ignored', () => {
  const found = findPrimitiveModules([
    { name: 'a.v', content: '// module LUT4\n/* module DFF */\nmodule ALU(input a);\nendmodule' },
  ]);
  assert.deepEqual(found, [{ module: 'ALU', file: 'a.v', line: 3 }]);
});

for (const [name, content] of [
  ['unclosed comments', '/* '.repeat(SIZE / 3)],
  ['blank lines', '\n'.repeat(SIZE)],
  ['input reg without a name', 'input reg '.repeat(SIZE / 10)],
] as const)
  test(`source scanning is fast on ${name}`, () => {
    const project = { id: 'p', name: 'p', top: 't', files: [{ name: 'a.v', content }] };
    assert.ok(
      timed(() => {
        findPrimitiveModules(project.files);
        compatibleProject(project as never, () => undefined);
      }) < FAST_MS,
    );
  });

test('input reg becomes output only where this module assigns it', () => {
  const project = {
    id: 'p',
    name: 'p',
    top: 'a',
    files: [
      {
        name: 'a.v',
        content:
          'module a(input clk, input reg q);\nalways @(posedge clk) q <= 1;\nendmodule\n' +
          'module b(input clk, input reg q);\nwire w = q;\nendmodule\n',
      },
    ],
  };
  const text = compatibleProject(project as never, () => undefined).files[0].content;
  assert.ok(text.includes('module a(input clk, output reg q)'));
  assert.ok(text.includes('module b(input clk, input q)'));
});
