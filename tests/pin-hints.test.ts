import test from 'node:test';
import assert from 'node:assert/strict';
import type { Project } from '../shared/types';
import {
  applySuggestions,
  ledBusPlan,
  parsePortsFromSource,
  pinDetails,
  quickSuggestions,
  suggestPinForSignal,
} from '../src/lib/pin-hints';
import { packagePins, plannerIssues, readCst, type PlannerSignal } from '../src/lib/pin-planner';

const sig = (name: string, direction: PlannerSignal['direction']): PlannerSignal => ({
  name,
  direction,
});
const bus = (name: string, width: number, direction: PlannerSignal['direction'] = 'output') =>
  Array.from({ length: width }, (_, i) => sig(`${name}[${i}]`, direction));
const empty = (content = ''): Project => ({
  name: 'p',
  top: 'top',
  board: 'tangnano20k',
  files: [{ name: 'board.cst', content }],
});
const pinOf = (name: string, direction: PlannerSignal['direction']) =>
  suggestPinForSignal(sig(name, direction))?.pin;

test('typical port names are matched to the on-board parts', () => {
  assert.equal(pinOf('clk', 'input'), 4);
  assert.equal(pinOf('clock', 'input'), 4);
  assert.equal(pinOf('reset', 'input'), 88);
  assert.equal(pinOf('rst_n', 'input'), 88);
  assert.equal(pinOf('button', 'input'), 88);
  assert.equal(pinOf('btn[0]', 'input'), 88);
  assert.equal(pinOf('btn[1]', 'input'), 87);
  assert.equal(pinOf('button2', 'input'), 87);
  assert.equal(pinOf('led', 'output'), 15);
  assert.equal(pinOf('led_n[0]', 'output'), 15);
  assert.equal(pinOf('led_n[5]', 'output'), 20);
  assert.equal(pinOf('uart_tx', 'output'), 69);
  assert.equal(pinOf('rx', 'input'), 70);
});

test('suggestions respect direction, range and unrelated names', () => {
  assert.equal(pinOf('led_n[6]', 'output'), undefined);
  assert.equal(pinOf('led', 'input'), undefined);
  assert.equal(pinOf('clk', 'output'), undefined);
  assert.equal(pinOf('data', 'input'), undefined);
  assert.equal(pinOf('tx', 'input'), undefined);
});

test('quick suggestions skip assigned signals and pins that are already taken', () => {
  const signals = [
    sig('clk', 'input'),
    sig('reset', 'input'),
    sig('button', 'input'),
    ...bus('led', 2),
  ];
  const directives = readCst(empty('IO_LOC "clk" 4;\nIO_LOC "x" 15;\n'));
  const result = quickSuggestions(signals, directives);
  assert.deepEqual(
    result.map((item) => [item.signal, item.pin]),
    [
      ['reset', 88],
      ['led[1]', 16],
    ],
  );
});

test('LED bus plan numbers bits in order and leaves foreign pins alone', () => {
  const signals = [sig('clk', 'input'), ...bus('led_n', 6)];
  const plan = ledBusPlan(signals, []);
  assert.deepEqual(
    plan.map((item) => item.pin),
    [15, 16, 17, 18, 19, 20],
  );
  assert.equal(plan[3].signal, 'led_n[3]');
  const blocked = ledBusPlan(signals, readCst(empty('IO_LOC "other" 17;')));
  assert.equal(blocked.length, 5);
  assert.ok(!blocked.some((item) => item.pin === 17));
  assert.deepEqual(ledBusPlan([sig('a', 'output'), sig('b', 'output')], []), []);
  assert.equal(ledBusPlan(bus('q', 8), []).length, 0);
});

test('applying a plan writes valid .cst commands without conflicts', () => {
  const signals = [sig('clk', 'input'), sig('reset', 'input'), ...bus('led_n', 6)];
  const base = empty();
  base.files.unshift({ name: 'top.v', content: 'module top; endmodule' });
  const project = applySuggestions(
    base,
    signals,
    [...quickSuggestions(signals, []), ...ledBusPlan(signals, [])],
    'board.cst',
  );
  const content = project.files.find((file) => file.name === 'board.cst')!.content;
  assert.match(content, /IO_LOC "clk" 4;/);
  assert.match(content, /IO_LOC "reset" 88;/);
  assert.match(content, /IO_PORT "reset" IO_TYPE=LVCMOS33 PULL_MODE=DOWN;/);
  assert.match(content, /IO_LOC "led_n\[5\]" 20;/);
  assert.deepEqual(plannerIssues(project, signals), []);
});

test('pin details explain the part, warn about reserved pins, occupied pins and wrong direction', () => {
  const led = packagePins.find((pin) => pin.number === 15)!;
  const details = pinDetails(led, [], sig('x', 'output'));
  assert.match(details.title, /LED0/);
  assert.match(details.effect, /горит, когда на выводе 0/);
  assert.ok(details.warnings.some((text) => /уже подключено/.test(text)));
  const input = pinDetails(led, [], sig('x', 'input'));
  assert.ok(input.warnings.some((text) => /нужен выход/.test(text)));
  const taken = pinDetails(led, readCst(empty('IO_LOC "y" 15;')), sig('x', 'output'));
  assert.deepEqual(taken.assignedTo, ['y']);
  assert.ok(taken.warnings.some((text) => /Уже назначен: y/.test(text)));
  const jtag = pinDetails(
    packagePins.find((pin) => pin.number === 5)!,
    [],
  );
  assert.ok(jtag.warnings.some((text) => /нельзя назначать/.test(text)));
  const free = pinDetails(
    packagePins.find((pin) => pin.number === 25)!,
    [],
  );
  assert.match(free.effect, /разъём/);
});

const withSource = (content: string): Project => ({
  ...empty(),
  files: [{ name: 'top.v', content }],
});
test('ports of the top module are read from ANSI headers before the first synthesis', () => {
  const ports = parsePortsFromSource(
    withSource(`// comment with module top(
module top #(parameter integer N = 4) (
  input wire clk, // clock
  input reset,
  output wire [5:0] led_n,
  output reg [7:4] hi,
  input a, b
);
endmodule`),
  );
  assert.deepEqual(
    ports?.map((p) => `${p.direction}:${p.name}`),
    [
      'input:clk',
      'input:reset',
      ...[0, 1, 2, 3, 4, 5].map((i) => `output:led_n[${i}]`),
      ...[4, 5, 6, 7].map((i) => `output:hi[${i}]`),
      'input:a',
      'input:b',
    ],
  );
});

test('the source reader gives up instead of guessing', () => {
  assert.equal(
    parsePortsFromSource(withSource('module top(a, b); input a; output b; endmodule')),
    null,
  );
  assert.equal(parsePortsFromSource(withSource('module top(input [W-1:0] a); endmodule')), null);
  assert.equal(parsePortsFromSource(withSource('module other(input a); endmodule')), null);
  assert.deepEqual(parsePortsFromSource(withSource('module top(); endmodule')), []);
});
