import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { Project, SimulationResult, YosysNetlist } from '../shared/types';
import { SimulationManager } from '../server/simulations';
import {
  boardSimulationSetup,
  deriveWiring,
  hasStateElements,
  ledState,
  levelOfBinary,
  manualLeds,
  readInputBit,
  releaseCycle,
  writeInputBit,
} from '../src/lib/board-wiring';
import { topSignal, type BoardPort } from '../src/lib/virtual-board';
import { parseVcd } from '../src/lib/vcd';
import { valueAt } from '../src/lib/waveform';

const cst = `IO_LOC "clk" 4;
IO_PORT "clk" IO_TYPE=LVCMOS33;
IO_LOC "reset" 88;
IO_LOC "led_n[0]" 15;
IO_LOC "led_n[1]" 16;
IO_LOC "led_n[2]" 17;
IO_LOC "led_n[3]" 18;
IO_LOC "led_n[4]" 19;
IO_LOC "led_n[5]" 20;
// IO_LOC "ignored" 21;
`;
function projectWith(content: string, verilog = ''): Project {
  return {
    name: 'p',
    top: 'top',
    board: 'tangnano20k',
    files: [
      { name: 'top.v', content: verilog },
      { name: 'board.cst', content },
    ],
  };
}
const chaserPorts: BoardPort[] = [
  { name: 'clk', width: 1, direction: 'input' },
  { name: 'reset', width: 1, direction: 'input' },
  { name: 'led_n', width: 6, direction: 'output' },
];

test('LEDs, buttons and the clock are wired automatically from the .cst pins', () => {
  const wiring = deriveWiring(projectWith(cst), chaserPorts);
  assert.equal(wiring.fromConstraints, true);
  assert.equal(wiring.clock, 'clk');
  assert.deepEqual(wiring.buttons.S1, { port: 'reset', bit: 0, signal: 'reset' });
  assert.equal(wiring.buttons.S2, null);
  assert.deepEqual(
    wiring.leds.map((led) => [led.index, led.pin, led.ref?.signal, led.activeLow]),
    [0, 1, 2, 3, 4, 5].map((i) => [i, 15 + i, `led_n[${i}]`, true]),
  );
});

test('pins 87 and 88 are S2 and S1, and a shuffled bus keeps the pin order', () => {
  const wiring = deriveWiring(
    projectWith('IO_LOC "btn[1]" 87;\nIO_LOC "btn[0]" 88;\nIO_LOC "y[2]" 15;\nIO_LOC "y[0]" 20;\n'),
    [
      { name: 'btn', width: 2, direction: 'input' },
      { name: 'y', width: 3, direction: 'output' },
    ],
  );
  assert.deepEqual(wiring.buttons.S1, { port: 'btn', bit: 0, signal: 'btn[0]' });
  assert.deepEqual(wiring.buttons.S2, { port: 'btn', bit: 1, signal: 'btn[1]' });
  assert.equal(wiring.leds[0].ref?.signal, 'y[2]');
  assert.equal(wiring.leds[5].ref?.signal, 'y[0]');
  assert.equal(wiring.leds[1].ref, null);
  assert.equal(wiring.clock, null);
});

test('a single-bit vector port matches its [0] spelling in the .cst', () => {
  const wiring = deriveWiring(projectWith('IO_LOC "key[0]" 88;\n'), [
    { name: 'key', width: 1, direction: 'input', offset: 0 },
  ]);
  assert.equal(wiring.buttons.S1?.port, 'key');
});

test('wiring ignores wrong directions, unknown signals and pin pairs; no .cst means manual mode', () => {
  const wrong = deriveWiring(
    projectWith('IO_LOC "led" 88;\nIO_LOC "button" 15;\nIO_LOC "ghost" 16;\nIO_LOC "led" 4,5;\n'),
    [
      { name: 'led', width: 1, direction: 'output' },
      { name: 'button', width: 1, direction: 'input' },
    ],
  );
  assert.equal(wrong.buttons.S1, null);
  assert.equal(wrong.leds[0].ref, null);
  assert.equal(wrong.fromConstraints, false);
  const none = deriveWiring(
    { name: 'p', top: 'top', board: 'tangnano20k', files: [] },
    chaserPorts,
  );
  assert.equal(none.fromConstraints, false);
  assert.equal(none.clock, null);
});

test('a clock on pin 4 is recognised even when it is not called clk', () => {
  const wiring = deriveWiring(projectWith('IO_LOC "sys_clk" 4;\n'), [
    { name: 'sys_clk', width: 1, direction: 'input' },
  ]);
  assert.equal(wiring.clock, 'sys_clk');
  assert.equal(
    boardSimulationSetup([{ name: 'sys_clk', width: 1, direction: 'input' }], wiring).clock,
    'sys_clk',
  );
});

test('manual override shows consecutive bits and respects polarity and port width', () => {
  const leds = manualLeds(chaserPorts, 'led_n', 4, false);
  assert.deepEqual(
    leds.map((led) => led.ref?.signal ?? null),
    ['led_n[4]', 'led_n[5]', null, null, null, null],
  );
  assert.ok(leds.every((led) => !led.activeLow));
  assert.ok(manualLeds(chaserPorts, 'clk', 0, true).every((led) => led.ref === null));
});

test('LED states: active-low 0 is lit, 1 is dark, X and Z are unknown', () => {
  assert.equal(ledState('0', true), 'on');
  assert.equal(ledState('1', true), 'off');
  assert.equal(ledState('1', false), 'on');
  assert.equal(ledState('0', false), 'off');
  for (const level of ['x', 'z', null] as const) {
    assert.equal(ledState(level, true), 'unknown');
    assert.equal(ledState(level, false), 'unknown');
  }
  assert.equal(levelOfBinary('1x0', 0), '0');
  assert.equal(levelOfBinary('1x0', 1), 'x');
  assert.equal(levelOfBinary('1x0', 2), '1');
  assert.equal(levelOfBinary('1', 5), 'x');
  assert.equal(levelOfBinary(undefined, 0), 'x');
});

test('pressing a button sets exactly its bit of a multi-bit input', () => {
  assert.equal(writeInputBit('0', 1, 1), '2');
  assert.equal(writeInputBit('2', 0, 1), '3');
  assert.equal(writeInputBit('3', 1, 0), '1');
  assert.equal(writeInputBit(undefined, 0, 1), '1');
  assert.equal(readInputBit('5', 2), 1);
  assert.equal(readInputBit('5', 1), 0);
  assert.equal(readInputBit('garbage', 0), 0);
});

test('a quick click is held for at least one whole clock period', () => {
  assert.equal(releaseCycle(7, 7), 8);
  assert.equal(releaseCycle(7, 6), 8);
  assert.equal(releaseCycle(7, 12), 12);
  assert.equal(releaseCycle(undefined, 3), 3);
});

function netlist(cells: Record<string, string>, extra: Record<string, string> = {}): YosysNetlist {
  const module = (types: Record<string, string>) => ({
    ports: {},
    cells: Object.fromEntries(
      Object.entries(types).map(([name, type]) => [
        name,
        { type, parameters: {}, attributes: {}, port_directions: {}, connections: {} },
      ]),
    ),
    netnames: {},
    attributes: {},
  });
  return {
    creator: 'test',
    modules: {
      top: module(cells),
      ...Object.fromEntries(Object.entries(extra).map(([n, t]) => [n, module({ x: t })])),
    },
  } as unknown as YosysNetlist;
}
test('only designs without registers, latches or memories count as combinational', () => {
  assert.equal(hasStateElements(netlist({ a: '$and', b: '$not' }), 'top'), false);
  assert.equal(hasStateElements(netlist({ a: '$and', r: '$dff' }), 'top'), true);
  assert.equal(hasStateElements(netlist({ a: '$adff' }), 'top'), true);
  assert.equal(hasStateElements(netlist({ a: '$dlatch' }), 'top'), true);
  assert.equal(hasStateElements(netlist({ a: '$mem_v2' }), 'top'), true);
  assert.equal(hasStateElements(netlist({ c: 'child' }, { child: '$dff' }), 'top'), true);
  assert.equal(hasStateElements(netlist({ c: 'child' }, { child: '$and' }), 'top'), false);
  assert.equal(hasStateElements(undefined, 'top'), false);
});

test('clockless designs get an immediate-mode setup; reset becomes an ordinary input', () => {
  const ports: BoardPort[] = [
    { name: 'rst', width: 1, direction: 'input' },
    { name: 'a', width: 1, direction: 'input' },
    { name: 'y', width: 1, direction: 'output' },
  ];
  const setup = boardSimulationSetup(ports, deriveWiring(projectWith(''), ports));
  assert.equal(setup.clock, null);
  assert.equal(setup.config.reset, null);
  assert.deepEqual(setup.config.inputs, { rst: '0', a: '0' });
  assert.equal(setup.config.cycles, 2);
});

test('clocked designs: reset on a button is held for the first cycles, otherwise generated', () => {
  const wiring = deriveWiring(projectWith(cst), chaserPorts);
  const wired = boardSimulationSetup(chaserPorts, wiring);
  assert.equal(wired.clock, 'clk');
  assert.equal(wired.resetOnButton, 'reset');
  assert.equal(wired.config.reset, null);
  assert.equal(wired.config.inputs.reset, '1');
  assert.deepEqual(wired.seedStimuli, [{ cycle: 2, inputs: { reset: '0' } }]);
  const free = boardSimulationSetup(chaserPorts, deriveWiring(projectWith(''), chaserPorts));
  assert.equal(free.resetOnButton, null);
  assert.equal(free.config.reset, 'reset');
  assert.equal(free.config.resetCycles, 2);
  assert.equal('reset' in free.config.inputs, false);
});

async function runLive(
  manager: SimulationManager,
  project: Project,
  inputs: Record<string, string>,
): Promise<SimulationResult> {
  let result = await manager.create(project, {
    clock: null,
    reset: null,
    resetActiveLow: false,
    resetCycles: 0,
    cycles: 2,
    periodNs: 10,
    inputs,
  });
  const deadline = Date.now() + 20_000;
  while (result.status === 'queued' || result.status === 'running') {
    assert.ok(Date.now() < deadline);
    await delay(25);
    result = await manager.get(result.id);
  }
  assert.equal(result.status, 'success', result.error);
  return result;
}

test('real simulator: a clockless button design reacts to the button without any clock cycle', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-board-live-'));
  const manager = new SimulationManager(directory);
  try {
    const project = projectWith(
      'IO_LOC "button" 88;\nIO_LOC "led" 15;\n',
      'module top(input button, output led); assign led = ~button; endmodule',
    );
    const read = async (button: string) => {
      const result = await runLive(manager, project, { button });
      const trace = parseVcd(result.vcd!);
      return valueAt(topSignal(trace, 'led')!, trace.endTime);
    };
    // Pressed button = 1, LED lights at 0: pressing lights the LED, releasing turns it off.
    assert.equal(await read('1'), '0');
    assert.equal(await read('0'), '1');
    const ports = [
      { name: 'button', width: 1, direction: 'input' as const },
      { name: 'led', width: 1, direction: 'output' as const },
    ];
    const wiring = deriveWiring(project, ports);
    assert.equal(ledState(levelOfBinary('0', 0), wiring.leds[0].activeLow), 'on');
    assert.equal(ledState(levelOfBinary('1', 0), wiring.leds[0].activeLow), 'off');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
