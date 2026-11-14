import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeSdc } from '../server/sdc';
import { dropUnconstrainedPads } from '../server/unconstrained';
import { circuitIssues, emptyCircuit, newCircuitNode } from '../shared/schematic';

test('SDC from Gowin EDA is reduced to what nextpnr understands', () => {
  const { text, skipped } = sanitizeSdc(
    [
      '// comment is not SDC but must not break us',
      '# comment',
      'create_clock -name clk -period 37.037 -waveform {0 18.518} [get_ports {clk}]',
      'create_clock -name div -period 100 -add [get_nets {div}]',
      'set_false_path -from [get_clocks {clk}] -to [get_clocks {div}]',
    ].join('\n'),
  );
  assert.equal(
    text,
    'create_clock -name clk -period 37.037 [get_ports {clk}]\ncreate_clock -name div -period 100 [get_nets {div}]\n',
  );
  assert.equal(skipped.length, 2, 'the // line and set_false_path are reported');
  assert.match(skipped.join('|'), /set_false_path/);
});

test('an SDC with no create_clock becomes empty, so --sdc is not passed', () => {
  assert.equal(sanitizeSdc('set_false_path -to [get_ports {a}]').text, '');
});

const netlist = JSON.stringify({
  modules: {
    top: {
      ports: { y: { direction: 'output', bits: [3] }, z: { direction: 'output', bits: [4] } },
      cells: {
        yb: { type: 'OBUF', connections: { I: [10], O: [3] } },
        zb: { type: 'OBUF', connections: { I: [11], O: [4] } },
      },
    },
  },
});

test('comments in .cst are not constraints: nextpnr would read lines inside /* */', () => {
  const { cst, dropped } = dropUnconstrainedPads(
    netlist,
    '/*\nIO_LOC "z" 16;\n*/\nIO_LOC "y" 25;\nIO_PORT "y" IO_TYPE=LVCMOS33;',
    'top',
  );
  assert.deepEqual(dropped, ['z']);
  assert.doesNotMatch(cst, /\/\*|"z"/);
});

test('a pin without IO_TYPE gets LVCMOS33 instead of the packer default LVCMOS18', () => {
  const { cst } = dropUnconstrainedPads(netlist, 'IO_LOC "y" 25;\nIO_LOC "z" 26;', 'top');
  assert.match(cst, /IO_PORT "y" IO_TYPE=LVCMOS33;/);
  assert.match(cst, /IO_PORT "z" IO_TYPE=LVCMOS33;/);
  const typed = dropUnconstrainedPads(
    netlist,
    'IO_LOC "y" 25;\nIO_PORT "y" IO_TYPE=LVCMOS18;\nIO_LOC "z" 26;',
    'top',
  ).cst;
  assert.doesNotMatch(typed, /IO_PORT "y" IO_TYPE=LVCMOS33/);
});

test('a register with async set AND reset AND a power-on value is rejected before synthesis', () => {
  const node = newCircuitNode(emptyCircuit(), 'reg', { aclr: true, apre: true, init: true });
  node.params = { ...node.params, aclr: true, apre: true, init: true };
  const issues = circuitIssues({ ...emptyCircuit(), nodes: [node] });
  assert.ok(
    issues.some((issue) => /асинхронный сброс и асинхронная установка/.test(issue.message)),
  );
  node.params = { ...node.params, init: false };
  const without = circuitIssues({ ...emptyCircuit(), nodes: [node] });
  assert.ok(
    !without.some((issue) => /асинхронный сброс и асинхронная установка/.test(issue.message)),
  );
});
