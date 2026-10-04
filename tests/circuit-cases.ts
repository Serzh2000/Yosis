import type { BlockKind } from '../shared/schematic';
import type { Case } from './circuit-harness';

export const cases: Case[] = [];
const add = (kind: BlockKind, params: Case['params'], extra: Partial<Case> = {}) =>
  cases.push({ title: `${kind} ${JSON.stringify(params)}`, kind, params, ...extra });

for (const width of [1, 8, 64]) {
  add('const', { width, value: String((1n << BigInt(width)) - 1n) });
  for (const invert of [true, false]) add('buf', { width, invert });
  for (const op of ['and', 'or', 'xor']) {
    for (const invert of [false, true])
      for (const inputs of [2, 3, 8])
        add('gate', {
          op,
          invert,
          inputs,
          width,
          inverted: inputs === 3 ? 0b101 : inputs === 8 ? 0x80 : 0,
        });
    for (const invert of [false, true]) add('reduce', { op, invert, width });
  }
  for (const signed of [false, true])
    add('extend', { inWidth: Math.min(width, 63), outWidth: Math.min(64, width + 5), signed });
  add('addsub', { width, mode: 'add', cin: false, cout: false });
  add('addsub', { width, mode: 'add', cin: true, cout: true });
  add('addsub', { width, mode: 'sub', cin: true, cout: true });
  add('addsub', { width, mode: 'sub', cin: false, cout: true });
  add('addsub', { width, mode: 'select', cin: true, cout: true });
  add('addsub', { width, mode: 'select', cin: false, cout: false });
  add('incdec', { width, mode: 'inc' });
  add('incdec', { width, mode: 'dec' });
  for (const signed of [false, true])
    add('cmp', { width, signed, outs: ['eq', 'ne', 'lt', 'le', 'gt', 'ge'] });
  add('mux', { inputs: 2, width });
  add('mux', { inputs: 4, width });
  add('mux', { inputs: 8, width });
  add('demux', { outputs: 2, width });
  add('demux', { outputs: 8, width });
  for (const op of ['shl', 'shr', 'sar']) {
    add('shift', { width, op, source: 'input' });
    add('shift', { width, op, source: 'const', amount: width - 1 });
    add('shift', { width, op, source: 'const', amount: 0 });
  }
}
for (const width of [3, 13])
  for (const op of ['shl', 'shr', 'sar']) add('shift', { width, op, source: 'input' });
for (const bits of [1, 3, 6]) {
  add('decoder', { bits, enable: false });
  add('decoder', { bits, enable: true });
}
for (const width of [2, 5, 32]) add('priority', { width });
add('rom', { addrBits: 2, width: 4, words: ['0', '15', '7', '9'] }, { steps: 12 });
add('rom', {
  addrBits: 6,
  width: 64,
  words: Array.from({ length: 64 }, (_, i) => String((1n << 63n) + BigInt(i) * 12345678901n)),
});
for (const signed of [false, true]) {
  add('mult', { widthA: 4, widthB: 4, signed });
  add('mult', { widthA: 1, widthB: 1, signed });
  add('mult', { widthA: 8, widthB: 3, signed });
  add('mult', { widthA: 32, widthB: 32, signed });
}
add('slice', { inWidth: 8, lo: 2, hi: 5 });
add('slice', { inWidth: 1, lo: 0, hi: 0 });
add('slice', { inWidth: 64, lo: 0, hi: 63 });
add('concat', { parts: 3, w0: 4, w1: 1, w2: 7 });
add('concat', { parts: 8, w0: 8, w1: 8, w2: 8, w3: 8, w4: 8, w5: 8, w6: 8, w7: 8 });
add('split', { width: 4 });
add('split', { width: 16 });
add('merge', { width: 5 });
add('merge', { width: 16 });
// Хранение.
for (const width of [1, 5, 64])
  for (const flags of [
    { sreset: false, enable: false, aclr: false, apre: false },
    { sreset: true, enable: true, aclr: false, apre: false },
    // ACLR и APRE одновременно не сравниваем: в Verilog реакция идёт по фронту, в железе по уровню.
    { sreset: true, enable: true, aclr: true, apre: false },
    { sreset: true, enable: true, aclr: false, apre: true },
    { sreset: false, enable: false, aclr: true, apre: false },
    { sreset: false, enable: true, aclr: false, apre: true },
  ])
    add(
      'reg',
      { width, ...flags, resetValue: String((1n << BigInt(width)) - 1n - 1n), init: width === 5 },
      { noEdgeEvery: 7, steps: 80 },
    );
add('tff', { aclr: false, init: true });
add('tff', { aclr: true, init: false });
for (const dir of ['up', 'down', 'updown'])
  for (const modulus of [0, 10, 16])
    add(
      'counter',
      {
        width: 4,
        dir,
        modulus,
        enable: true,
        sclr: true,
        load: true,
        aclr: modulus === 10,
        tc: true,
        init: modulus !== 16,
      },
      { steps: 120 },
    );
add('counter', { width: 1, dir: 'up', modulus: 0, tc: true }, { steps: 20 });
add('counter', { width: 32, dir: 'down', modulus: 0, tc: false, load: true }, { steps: 60 });
add('counter', { width: 8, dir: 'up', modulus: 200, tc: true }, { steps: 400 });
for (const dir of ['left', 'right']) {
  add(
    'shreg',
    { width: 8, dir, enable: true, load: true, aclr: true, init: false },
    { steps: 100 },
  );
  add(
    'shreg',
    { width: 2, dir, enable: false, load: false, aclr: false, init: true },
    { steps: 20 },
  );
  add(
    'shreg',
    { width: 32, dir, enable: true, load: false, aclr: false, init: true },
    { steps: 60 },
  );
}
// Время: малый такт, чтобы счёт был виден за десятки шагов.
add('divider', { mode: 'square', hz: 100, clockHz: 1000 }, { steps: 120 });
add('divider', { mode: 'pulse', hz: 100, clockHz: 1000 }, { steps: 120 });
add('divider', { mode: 'pulse', hz: 500, clockHz: 1000 }, { steps: 20 });
add('divider', { mode: 'square', hz: 500, clockHz: 1000 }, { steps: 20 });
add('divider', { mode: 'square', hz: 7, clockHz: 100 }, { steps: 100 });
add('sync2', {}, { steps: 30 });
add('edge', { mode: 'rising' }, { steps: 60, hold: 1 });
add('edge', { mode: 'falling' }, { steps: 60, hold: 1 });
add('debounce', { ms: 1, clockHz: 5000 }, { steps: 200, hold: 2 });
add('debounce', { ms: 0.2, clockHz: 5000 }, { steps: 100, hold: 1 });
