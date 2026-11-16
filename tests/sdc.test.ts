import assert from 'node:assert/strict';
import test from 'node:test';
import { pllClockConstraints, retargetToBufferNets, sanitizeSdc } from '../server/sdc';
import { findPrimitiveModules, GOWIN_PRIMITIVES } from '../shared/gowin-primitives';
import { yosysResource } from './rtl-gowin-harness';
import {
  canonicalCst,
  dropUnconstrainedPads,
  reservedPinsUsed,
  usesConfigurationPins,
} from '../server/unconstrained';
import { circuitIssues, emptyCircuit, newCircuitNode } from '../shared/schematic';
import { validateProject } from '../shared/project-validation';

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
  assert.equal(skipped.length, 1, 'only set_false_path is reported: comments are not commands');
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

test('sanitizeSdc keeps comments out of the skipped list and bracketed port names whole', () => {
  const { text, skipped } = sanitizeSdc(
    '//Copyright 2026\ncreate_clock -name c -period 20 [get_ports {clk[0]}]\n',
  );
  assert.equal(text, 'create_clock -name c -period 20 [get_ports {clk[0]}]\n');
  assert.deepEqual(skipped, []);
});

test('a clock on a port is moved to the net behind its input buffer, where timing is checked', () => {
  const flat = JSON.stringify({
    modules: {
      top: {
        ports: { clk: { direction: 'input', bits: [2] } },
        cells: { b: { type: 'IBUF', connections: { I: [2], O: [7] } } },
        netnames: { clk: { bits: [2] }, clk_IBUF_I_O: { bits: [7] } },
      },
    },
  });
  assert.equal(
    retargetToBufferNets('create_clock -period 10 [get_ports {clk}]\n', flat, 'top'),
    'create_clock -period 10 [get_nets {clk_IBUF_I_O}]\n',
  );
});

test('pins 52-57 (shared with SSPI/flash) switch the packer to ordinary I/O mode', () => {
  assert.equal(usesConfigurationPins('IO_LOC "led" 54;'), true);
  assert.equal(usesConfigurationPins('IO_LOC "led" 15;\nIO_LOC "k" 88;'), false);
  assert.equal(usesConfigurationPins('// IO_LOC "led" 54;'), false);
});

test('a module named like a Gowin primitive is found with its file and line', () => {
  const found = findPrimitiveModules([
    {
      name: 'top.v',
      content: '// module ALU\nmodule top; endmodule\nmodule DFF(input d); endmodule',
    },
    { name: 'ok.v', content: 'module dff(input d); endmodule' },
  ]);
  assert.deepEqual(found, [{ module: 'DFF', file: 'top.v', line: 3 }]);
});

test('the primitive list is complete: it equals the modules of the Yosys Gowin library', async () => {
  const names = new Set<string>();
  for (const file of ['gowin/cells_sim.v', 'gowin/cells_xtra_gw2a.v'])
    for (const match of (await yosysResource(file)).matchAll(/^module\s+(\w+)/gm))
      if (!match[1].startsWith('__')) names.add(match[1]);
  assert.deepEqual([...GOWIN_PRIMITIVES].sort(), [...names].sort());
});

test('a RAM block reserves the names of its memory and loop counter', () => {
  const doc = emptyCircuit();
  const ram = { ...newCircuitNode(doc, 'ram', {}, 'x'), name: 'x' };
  const clash = {
    ...newCircuitNode({ ...doc, nodes: [ram] }, 'const', {}, 'x_i'),
    name: 'x_i',
    id: 'n9',
  };
  const issues = circuitIssues({ ...doc, nodes: [ram, clash] });
  assert.ok(
    issues.some((issue) => /x_i/.test(issue.message)),
    JSON.stringify(issues),
  );
});

test('pins of the board configuration (JTAG, RECONFIG_N, flash) are named when a port uses them', () => {
  const used = reservedPinsUsed('IO_LOC "a" 15;\nIO_LOC "b" 6;\n// IO_LOC "c" 9;\nIO_LOC "d" 60;');
  assert.deepEqual(
    used.map((item) => [item.port, item.pin, item.role]),
    [
      ['b', 6, 'JTAG TCK'],
      ['d', 60, 'flash CS'],
    ],
  );
});

test('the on-package SDRAM ports are wired by nextpnr by name and are not thrown away', () => {
  const flat = JSON.stringify({
    modules: {
      top: {
        ports: {
          O_sdram_clk: { direction: 'output', bits: [3] },
          IO_sdram_dq: { direction: 'inout', bits: [4] },
          led: { direction: 'output', bits: [5] },
        },
        cells: {
          a: { type: 'OBUF', connections: { I: [10], O: [3] } },
          b: { type: 'IOBUF', connections: { I: [11], O: [12], IO: [4] } },
          c: { type: 'OBUF', connections: { I: [13], O: [5] } },
        },
      },
    },
  });
  const { json, dropped } = dropUnconstrainedPads(flat, 'IO_LOC "x" 15;', 'top');
  assert.deepEqual(dropped, ['led']);
  assert.deepEqual(Object.keys(JSON.parse(json).modules.top.cells), ['a', 'b']);
});

test('an SDC clock on a port the design does not have is reported, not lost silently', () => {
  const flat = JSON.stringify({
    modules: { top: { ports: {}, cells: {}, netnames: {} } },
  });
  const missing: string[] = [];
  retargetToBufferNets('create_clock -period 10 [get_ports {nope}]\n', flat, 'top', (port) =>
    missing.push(port),
  );
  assert.deepEqual(missing, ['nope']);
});

test('the constraint file nextpnr reads has one canonical form: tabs, case and BOM do not hide pins', () => {
  const text =
    '﻿io_loc\t"clk"\t4;\nIO_LOC   "rst"  88 ;\n// IO_LOC "x" 1;\nIO_PORT "rst"  IO_TYPE=LVCMOS33   PULL_MODE=NONE;';
  assert.equal(
    canonicalCst(text),
    'IO_LOC "clk" 4;\nIO_LOC "rst" 88;\nIO_PORT "rst" IO_TYPE=LVCMOS33 PULL_MODE=NONE;',
  );
});

test('the placement constraints keep a pin that was written with tabs and lower case', () => {
  const flat = JSON.stringify({
    modules: {
      top: {
        ports: { rst: { direction: 'input', bits: [2] } },
        cells: { b: { type: 'IBUF', connections: { I: [2], O: [7] } } },
      },
    },
  });
  const { cst, dropped } = dropUnconstrainedPads(flat, 'io_loc\t"rst"\t88;', 'top');
  assert.deepEqual(dropped, []);
  assert.match(cst, /^IO_LOC "rst" 88;/);
});

test('a keyword is not accepted as the top module name', () => {
  assert.throws(
    () =>
      validateProject({
        name: 'x',
        top: 'module',
        board: 'tangnano20k',
        files: [{ name: 'top.v', content: 'module top; endmodule' }],
      }),
    /имя верхнего модуля/,
  );
});

test('the clock a PLL makes is checked at its own frequency, worked out from its parameters', () => {
  const flat = JSON.stringify({
    modules: {
      top: {
        cells: {
          pll: {
            type: 'rPLL',
            parameters: {
              FCLKIN: '27',
              IDIV_SEL: '00000000000000000000000000001000',
              FBDIV_SEL: '00000000000000000000000000011111',
              DYN_SDIV_SEL: '00000000000000000000000000000100',
            },
            connections: { CLKOUT: [5], CLKOUTD: [6], CLKOUTP: [7] },
          },
        },
        netnames: { fast: { bits: [5] }, slow: { bits: [6] } },
      },
    },
  });
  // 27 MHz × 32 / 9 = 96 MHz; CLKOUTD divides by DYN_SDIV_SEL = 4 → 24 MHz; CLKOUTP has no name.
  assert.equal(
    pllClockConstraints(flat, 'top', new Set()),
    'create_clock -name fast -period 10.417 [get_nets {fast}]\ncreate_clock -name slow -period 41.667 [get_nets {slow}]\n',
  );
  assert.equal(
    pllClockConstraints(flat, 'top', new Set(['fast'])),
    'create_clock -name slow -period 41.667 [get_nets {slow}]\n',
    'a clock the pupil already constrained is left alone',
  );
});

test('rPLL: parameters of any binary width, the library default of FCLKIN, bypass and run-time dividers', () => {
  const flat = (parameters: Record<string, string>) =>
    JSON.stringify({
      modules: {
        top: {
          cells: { pll: { type: 'rPLL', parameters, connections: { CLKOUT: [5] } } },
          netnames: { fast: { bits: [5] } },
        },
      },
    });
  const period = (parameters: Record<string, string>) =>
    /-period ([\d.]+)/.exec(pllClockConstraints(flat(parameters), 'top', new Set()))?.[1];
  // 6-bit values (not 32): 27 × (3+1) / (1+1) = 54 MHz.
  assert.equal(period({ FCLKIN: '27', IDIV_SEL: '000001', FBDIV_SEL: '000011' }), '18.519');
  // The library default of FCLKIN is 100 MHz, not the 27 MHz of the board's oscillator.
  assert.equal(period({ IDIV_SEL: '0', FBDIV_SEL: '0' }), '10.000');
  // Bypass passes the input through.
  assert.equal(period({ FCLKIN: '27', FBDIV_SEL: '11', CLKOUT_BYPASS: 'true' }), '37.037');
  // Dividers that a port sets at run time are unknown: no clock is claimed.
  assert.equal(
    pllClockConstraints(flat({ FCLKIN: '27', DYN_FBDIV_SEL: 'true' }), 'top', new Set()),
    '',
  );
});
