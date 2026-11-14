import assert from 'node:assert/strict';
import test from 'node:test';
import { dropUnconstrainedPads } from '../server/unconstrained';
// @ts-expect-error The runner helpers are plain JavaScript modules.
import { compatibleProject, integerRealParameters } from '../server/verilog-compat.mjs';

test('real-valued parameters are rounded up for synthesis, everything else is untouched', () => {
  const source = `module top;
parameter CLK = 27_000_000;        // 0.5 in a comment stays
parameter HIGH = (CLK / 1_000_000 * 0.85) - 1;
localparam A = 1.5, B = 3, C = A * 2;
parameter NAME = "v1.5";
parameter WIDTH = 8;
endmodule
`;
  const { text, rounded } = integerRealParameters(source) as { text: string; rounded: string[] };
  assert.deepEqual(rounded, ['HIGH', 'A']);
  assert.match(text, /parameter HIGH = \$rtoi\(\$ceil\(\(CLK \/ 1_000_000 \* 0\.85\) - 1\)\);/);
  assert.match(text, /localparam A = \$rtoi\(\$ceil\(1\.5\)\), B = 3, C = A \* 2;/);
  assert.ok(text.includes('// 0.5 in a comment stays') && text.includes('"v1.5"'));
  assert.equal(text.split('\n').length, source.split('\n').length, 'line numbers are kept');
  assert.equal(integerRealParameters(text).rounded.length, 0, 'a second pass changes nothing');
});

test('an input declared as reg is read as an output, with a note in the log', () => {
  const notes: string[] = [];
  const project = compatibleProject(
    {
      files: [
        {
          name: 'a.v',
          content:
            'module a(input clk, input reg out); // input reg here\nalways @(posedge clk) out <= 1;\nendmodule',
        },
        { name: 'board.cst', content: 'input reg' },
      ],
    },
    (text: string) => notes.push(text),
  ) as { files: { content: string }[] };
  assert.equal(
    project.files[0].content,
    'module a(input clk, output reg out); // input reg here\nalways @(posedge clk) out <= 1;\nendmodule',
  );
  assert.equal(project.files[1].content, 'input reg');
  assert.equal(notes.length, 1);
});

test('ports without a pin are left out of the bitstream and unplaced inputs read zero', () => {
  const flat = JSON.stringify({
    modules: {
      top: {
        ports: {
          clk: { direction: 'input', bits: [2] },
          key: { direction: 'input', bits: [3] },
          led: { direction: 'output', bits: [4, 5] },
          spare: { direction: 'output', bits: [6] },
        },
        cells: {
          clk_pad: { type: 'IBUF', connections: { I: [2], O: [10] } },
          key_pad: { type: 'IBUF', connections: { I: [3], O: [11] } },
          led0: { type: 'OBUF', connections: { I: [12], O: [4] } },
          led1: { type: 'OBUF', connections: { I: [13], O: [5] } },
          spare_pad: { type: 'OBUF', connections: { I: [14], O: [6] } },
          logic: { type: 'LUT2', connections: { I0: [10], I1: [11], F: [12] } },
        },
      },
    },
  });
  const cst = 'IO_LOC "clk" 4;\nIO_LOC "led[0]" 15; // IO_LOC "spare" 16;\nIO_LOC "led[1]" 16;\n';
  const { json, dropped } = dropUnconstrainedPads(flat, cst, 'top');
  assert.deepEqual(dropped, ['key', 'spare']);
  const top = JSON.parse(json).modules.top;
  assert.deepEqual(Object.keys(top.ports), ['clk', 'led']);
  assert.deepEqual(Object.keys(top.cells), ['clk_pad', 'led0', 'led1', 'logic']);
  assert.deepEqual(top.cells.logic.connections.I1, ['0'], 'the unplaced input reads zero');
  assert.equal(dropUnconstrainedPads(json, cst, 'top').dropped.length, 0);
});

test('a differential pair named by its P pin gets a pin for the N port as well', () => {
  const flat = JSON.stringify({
    modules: {
      top: {
        ports: {
          r: { direction: 'input', bits: [2] },
          tp: { direction: 'output', bits: [3] },
          tn: { direction: 'output', bits: [4] },
        },
        cells: {
          buf: { type: 'TLVDS_OBUF', connections: { I: [2], O: [3], OB: [4] } },
        },
      },
    },
  });
  const cst = 'IO_LOC "r" 15;\nIO_LOC "tp" 33,34;\nIO_PORT "tp" IO_TYPE=LVCMOS33D;\n';
  const result = dropUnconstrainedPads(flat, cst, 'top');
  assert.deepEqual(result.dropped, [], 'the N port is not thrown away');
  assert.match(result.cst, /IO_LOC "tn" 34;/);
  assert.deepEqual(Object.keys(JSON.parse(result.json).modules.top.cells), ['buf']);
});

test('an input that clocks a register must have a pin: no silent dead clock', () => {
  const flat = JSON.stringify({
    modules: {
      top: {
        ports: {
          clk: { direction: 'input', bits: [2] },
          q: { direction: 'output', bits: [3] },
        },
        cells: {
          clk_pad: { type: 'IBUF', connections: { I: [2], O: [10] } },
          ff: { type: 'DFF', connections: { CLK: [10], D: [11], Q: [12] } },
          q_pad: { type: 'OBUF', connections: { I: [12], O: [3] } },
        },
      },
    },
  });
  assert.throws(
    () => dropUnconstrainedPads(flat, 'IO_LOC "q" 15;', 'top'),
    /Тактовому входу clk не назначен вывод/,
  );
});

test('the P line of a differential pair keeps one pin, as nextpnr reads it', () => {
  const flat = JSON.stringify({
    modules: {
      top: {
        ports: {
          tp: { direction: 'output', bits: [3] },
          tn: { direction: 'output', bits: [4] },
        },
        cells: {
          buf: { type: 'TLVDS_OBUF', connections: { I: [2], O: [3], OB: [4] } },
        },
      },
    },
  });
  const { cst } = dropUnconstrainedPads(flat, 'IO_LOC "tp" 33,34;', 'top');
  assert.match(cst, /IO_LOC "tp" 33;/);
  assert.doesNotMatch(cst, /33,34/);
});

test('an input with a stray reg that the module only reads stays an input', () => {
  const notes: string[] = [];
  const project = compatibleProject(
    {
      files: [
        {
          name: 'a.v',
          content:
            'module a(input clk, input reg d, output reg q);\nalways @(posedge clk) q <= d;\nendmodule',
        },
      ],
    },
    (text: string) => notes.push(text),
  ) as { files: { content: string }[] };
  assert.match(project.files[0].content, /module a\(input clk, input d, output reg q\)/);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /обычный «input»/);
});

test('a byte-order mark at the start of a source file is removed', () => {
  const project = compatibleProject(
    { files: [{ name: 'top.v', content: '﻿module top; endmodule' }] },
    () => {},
  ) as { files: { content: string }[] };
  assert.equal(project.files[0].content, 'module top; endmodule');
});
