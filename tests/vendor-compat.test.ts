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
          content: 'module a(input clk, input reg out); // input reg here\nendmodule',
        },
        { name: 'board.cst', content: 'input reg' },
      ],
    },
    (text: string) => notes.push(text),
  ) as { files: { content: string }[] };
  assert.equal(
    project.files[0].content,
    'module a(input clk, output reg out); // input reg here\nendmodule',
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
