import assert from 'node:assert/strict';
import test from 'node:test';
import {
  blockKinds,
  blocks,
  circuitIssues,
  compileCircuit,
  type BlockKind,
} from '../shared/schematic';
import { buildDut, compareWithVerilog } from './circuit-harness';
import { cases } from './circuit-cases';

test('every block kind is covered by at least one behaviour case or a dedicated test', () => {
  const dedicated = new Set<BlockKind>([
    'input',
    'output',
    'button',
    'clock27',
    'led',
    'ledbank',
    'tag_out',
    'tag_in',
    'note',
  ]);
  const covered = new Set(cases.map((item) => item.kind));
  for (const kind of blockKinds)
    assert.ok(covered.has(kind) || dedicated.has(kind), `${kind} не покрыт`);
});
test('defaults of every block are valid parameters with specs', () => {
  for (const kind of blockKinds) {
    const def = blocks[kind];
    assert.deepEqual(
      Object.keys(def.defaults).sort(),
      def.params.map((spec) => spec.key).sort(),
      `${kind}: параметры и значения по умолчанию должны совпадать`,
    );
  }
});
test('the preview evaluator agrees with generated Verilog in Icarus for every block kind', async () => {
  const mismatches = await compareWithVerilog(cases);
  const titles = [...new Set(mismatches.map((item) => item.title))];
  assert.deepEqual(
    titles,
    [],
    `${mismatches.length} расхождений из ${cases.length} случаев; первое: ${JSON.stringify(mismatches[0])}`,
  );
});
test('generated Verilog of every case is valid and free of validation errors', () => {
  for (const item of cases) {
    const { doc } = buildDut(item);
    assert.deepEqual(circuitIssues(doc), [], item.title);
    assert.match(compileCircuit(doc, 'dut_top'), /endmodule/);
  }
});
