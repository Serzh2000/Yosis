import assert from 'node:assert/strict';
import test from 'node:test';
import { fixCarryHeads } from '../server/carry-head';

const cell = (parameters: Record<string, string>, connections: Record<string, unknown[]> = {}) => ({
  type: 'ALU',
  parameters,
  connections,
});
const BROKEN = '00000000000000000101000001011010';

test('the head of a carry chain fed from logic gets the corrected table', () => {
  const json = JSON.stringify({
    modules: {
      top: {
        cells: {
          head: cell({ CIN_NETTYPE: 'LOGIC', RAW_ALU_LUT: BROKEN }),
          // The same table in the middle of a chain (carry-in connected) is a real sum: untouched.
          body: cell({ RAW_ALU_LUT: BROKEN }, { CIN: [7] }),
          other: cell({ CIN_NETTYPE: 'LOGIC', RAW_ALU_LUT: '00000000000000001100000011000000' }),
        },
      },
    },
  });
  const result = fixCarryHeads(json);
  assert.equal(result.fixed, 1);
  const cells = JSON.parse(result.json).modules.top.cells;
  assert.equal(cells.head.parameters.RAW_ALU_LUT, '00000000000000000000000000001010');
  assert.equal(cells.body.parameters.RAW_ALU_LUT, BROKEN);
  assert.equal(cells.other.parameters.RAW_ALU_LUT, '00000000000000001100000011000000');
});

test('a placement without such cells is returned as it was', () => {
  const json = '{"modules":{"top":{"cells":{}}}}';
  assert.deepEqual(fixCarryHeads(json), { json, fixed: 0 });
});
