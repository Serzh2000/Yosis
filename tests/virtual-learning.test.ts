import test from 'node:test';
import assert from 'node:assert/strict';
import type { Project, YosysNetlist } from '../shared/types';
import {
  bitLevel,
  boardPorts,
  builtinTruthTableScenario,
  inputValuesAtTime,
  mergeInputEvent,
  nextStep,
  portBitName,
  simulationDefaults,
  stepTimes,
  topSignal,
  truthTableScenario,
} from '../src/lib/virtual-board';
import { examples } from '../src/lib/examples';
import { checkLessonTrace, lessons } from '../src/lib/lessons';
import { parseVcd, type VcdTrace } from '../src/lib/vcd';

const project: Project = { name: 'test', top: 'top', board: 'tangnano20k', files: [] };
test('virtual board derives only project top-level ports and excludes clock/reset from controls', () => {
  const rtl = {
    creator: 'test',
    modules: {
      top: {
        ports: {
          clk: { direction: 'input', bits: [2] },
          rst_n: { direction: 'input', bits: [3] },
          enable: { direction: 'input', bits: [4] },
          data: { direction: 'input', bits: [5, 6] },
          y: { direction: 'output', bits: [7] },
        },
        cells: {},
        netnames: {},
        attributes: {},
      },
      child: {
        ports: { hidden: { direction: 'input', bits: [9] } },
        cells: {},
        netnames: {},
        attributes: {},
      },
    },
  } as YosysNetlist;
  const ports = boardPorts(project, rtl);
  assert.deepEqual(
    ports.map((port) => port.name),
    ['clk', 'rst_n', 'enable', 'data', 'y'],
  );
  const config = simulationDefaults(ports);
  assert.equal(config.clock, 'clk');
  assert.equal(config.reset, 'rst_n');
  assert.equal(config.resetActiveLow, true);
  assert.deepEqual(config.inputs, { enable: '1', data: '0' });
});
test('virtual LEDs use little-endian bus indices and retain X/Z states', () => {
  const signal = {
    id: '!',
    name: 'count',
    width: 4,
    scope: ['dut'],
    changes: [{ time: 0, value: '10xz' }],
  };
  assert.equal(bitLevel(signal, 0, 0), 'z');
  assert.equal(bitLevel(signal, 0, 1), 'x');
  assert.equal(bitLevel(signal, 0, 2), '0');
  assert.equal(bitLevel(signal, 0, 3), '1');
  assert.equal(bitLevel(undefined, 0, 0), 'x');
  assert.equal(bitLevel(signal, 0, 4), 'x');
});
test('virtual board labels shifted and ascending Verilog buses correctly', () => {
  assert.equal(portBitName({ name: 'led', width: 4, direction: 'output', offset: 4 }, 0), 'led[4]');
  assert.equal(portBitName({ name: 'led', width: 8, direction: 'output', upto: 1 }, 0), 'led[7]');
  assert.equal(portBitName({ name: 'led', width: 8, direction: 'output', upto: 1 }, 7), 'led[0]');
  assert.equal(portBitName({ name: 'led', width: 1, direction: 'output' }, 0), 'led');
});
test('top-level DUT signal wins over identical child signal and parent alias', () => {
  const signal = (scope: string[], value: string) => ({
    id: scope.join('.'),
    name: 'y',
    width: 1,
    scope,
    changes: [{ time: 0, value }],
  });
  const trace: VcdTrace = {
    timescaleFs: 1000,
    startTime: 0,
    endTime: 100,
    signals: [signal(['tb', 'dut', 'child'], '0'), signal(['tb'], '0'), signal(['tb', 'dut'], '1')],
    warnings: [],
  };
  assert.equal(topSignal(trace, 'y')?.scope.join('.'), 'tb.dut');
});
test('clock stepping uses positive edges and includes end of trace', () => {
  const trace = parseVcd(
    '$timescale 1ns $end $scope module dut $end $var wire 1 ! clk $end $upscope $end $enddefinitions $end #0 0! #5 1! #10 0! #15 1! #20 0!',
  );
  assert.deepEqual(stepTimes(trace, 'clk'), [0, 5, 15, 20]);
  assert.equal(nextStep(stepTimes(trace, 'clk'), 5), 15);
  assert.equal(nextStep(stepTimes(trace, 'clk'), 20), 20);
});
test('lessons check all truth table rows at the actual VCD timescale', () => {
  const lesson = lessons.find((item) => item.id === 'and')!;
  const trace = parseVcd(
    '$timescale 1ps $end $scope module dut $end $var wire 1 ! y $end $upscope $end $enddefinitions $end #0 0! #30001 1! #50000',
  );
  const verdicts = checkLessonTrace(lesson, trace);
  assert.equal(verdicts.length, 4);
  assert.equal(
    verdicts.every((item) => item.passed),
    true,
  );
  trace.signals[0].changes = [{ time: 0, value: '0' }];
  assert.deepEqual(
    checkLessonTrace(lesson, trace).map((item) => item.passed),
    [true, true, true, false],
  );
});
test('lesson checks reject missing signal, wrong width, unknown and truncated simulation', () => {
  const lesson = lessons.find((item) => item.id === 'not')!;
  const trace: VcdTrace = {
    timescaleFs: 1e6,
    startTime: 0,
    endTime: 30,
    signals: [],
    warnings: [],
  };
  assert.equal(
    checkLessonTrace(lesson, trace).some((item) => item.passed),
    false,
  );
  trace.signals = [
    {
      id: '!',
      name: 'y',
      width: 2,
      scope: ['dut'],
      changes: [
        { time: 0, value: '01' },
        { time: 10, value: '00' },
      ],
    },
  ];
  assert.equal(
    checkLessonTrace(lesson, trace).some((item) => item.passed),
    false,
  );
  trace.signals[0].width = 1;
  trace.signals[0].changes = [{ time: 0, value: 'x' }];
  assert.equal(
    checkLessonTrace(lesson, trace).some((item) => item.passed),
    false,
  );
  trace.signals[0].changes = [
    { time: 0, value: '1' },
    { time: 10, value: '0' },
  ];
  trace.endTime = 12;
  assert.deepEqual(
    checkLessonTrace(lesson, trace).map((item) => item.passed),
    [true, false],
  );
});
test('counter lesson includes reset, enable pause, and resumed counting', () => {
  const lesson = lessons.find((item) => item.id === 'counter')!;
  assert.equal(lesson.config.resetCycles, 2);
  assert.deepEqual(lesson.config.stimuli, [
    { cycle: 4, inputs: { enable: '0' } },
    { cycle: 6, inputs: { enable: '1' } },
  ]);
  assert.deepEqual(
    lesson.cases.map((item) => item.expected),
    ['0000', '0000', '0001', '0010', '0010', '0010', '0011', '0100'],
  );
});

test('missing top-level lesson output cannot be substituted by a child output', () => {
  const lesson = lessons.find((item) => item.id === 'not')!;
  const trace: VcdTrace = {
    timescaleFs: 1e6,
    startTime: 0,
    endTime: 30,
    warnings: [],
    signals: [
      {
        id: '!',
        name: 'a',
        width: 1,
        scope: ['tb', 'dut'],
        changes: [
          { time: 0, value: '0' },
          { time: 10, value: '1' },
        ],
      },
      {
        id: '"',
        name: 'y',
        width: 1,
        scope: ['tb', 'dut', 'child'],
        changes: [
          { time: 0, value: '1' },
          { time: 10, value: '0' },
        ],
      },
    ],
  };
  assert.equal(topSignal(trace, 'y'), undefined);
  assert.equal(
    checkLessonTrace(lesson, trace).some((item) => item.passed),
    false,
  );
});

test('rewinding virtual board restores switch values from the committed trace', () => {
  const trace = parseVcd(
    '$timescale 1ns $end $scope module dut $end $var wire 1 ! a $end $var wire 4 " data [3:0] $end $upscope $end $enddefinitions $end #0 0! b0010 " #20 1! b1010 " #40',
  );
  const initial = { a: '0', data: '0x2', missing: '0xF' };
  assert.deepEqual(inputValuesAtTime(trace, 25, initial), { a: '1', data: '10', missing: '0xF' });
  assert.deepEqual(inputValuesAtTime(trace, 5, initial), { a: '0', data: '2', missing: '0xF' });
});

test('virtual input edits preserve unrelated earlier and later switch changes', () => {
  const events = [{ cycle: 4, inputs: { a: '1' } }];
  const changed = mergeInputEvent(events, 2, { b: '1' });
  assert.deepEqual(changed, [
    { cycle: 2, inputs: { b: '1' } },
    { cycle: 4, inputs: { a: '1' } },
  ]);
  const together = mergeInputEvent(changed, 4, { b: '0' });
  assert.deepEqual(together, [
    { cycle: 2, inputs: { b: '1' } },
    { cycle: 4, inputs: { a: '1', b: '0' } },
  ]);
  assert.deepEqual(events, [{ cycle: 4, inputs: { a: '1' } }]);
});

test('truth-table scenario covers each combination with the first input changing slowest', () => {
  const ports = ['a', 'b', 'c'].map((name) => ({ name, width: 1, direction: 'input' as const }));
  const scenario = truthTableScenario(ports)!;
  assert.equal(scenario.cycles, 8);
  assert.deepEqual(scenario.inputs, { a: '0', b: '0', c: '0' });
  assert.deepEqual(
    scenario.stimuli.map((event) => Object.values(event.inputs).join('')),
    ['001', '010', '011', '100', '101', '110', '111'],
  );
  assert.deepEqual(
    scenario.stimuli.map((event) => event.cycle),
    [1, 2, 3, 4, 5, 6, 7],
  );
});

test('truth-table scenario handles buses, ignores outputs and limits exhaustive exploration', () => {
  const scenario = truthTableScenario([
    { name: 'data', width: 2, direction: 'input' },
    { name: 'select', width: 1, direction: 'input' },
    { name: 'led', width: 6, direction: 'output' },
  ])!;
  assert.deepEqual(scenario.stimuli[4], { cycle: 5, inputs: { data: '2', select: '1' } });
  assert.equal(truthTableScenario([{ name: 'data', width: 8, direction: 'input' }])?.cycles, 256);
  assert.equal(truthTableScenario([{ name: 'data', width: 9, direction: 'input' }]), null);
  assert.equal(truthTableScenario([{ name: 'data', width: 0, direction: 'input' }]), null);
  assert.equal(truthTableScenario([]), null);
});

test('explicit truth-table exploration reserves reset periods before testing data inputs', () => {
  const scenario = truthTableScenario([{ name: 'enable', width: 1, direction: 'input' }], 8, 2)!;
  assert.equal(scenario.cycles, 4);
  assert.deepEqual(scenario.inputs, { enable: '0' });
  assert.deepEqual(scenario.stimuli, [{ cycle: 3, inputs: { enable: '1' } }]);
  assert.equal(
    truthTableScenario([{ name: 'enable', width: 1, direction: 'input' }], 8, 9999),
    null,
  );
});

test('prepared scenarios recognise teaching source copies independently of project name and CST edits', () => {
  const logic = examples.find((example) => example.id === 'logic')!.project;
  const ports = ['a', 'b', 'c'].map((name) => ({ name, width: 1, direction: 'input' as const }));
  const copy = {
    ...logic,
    name: 'моё исследование',
    files: logic.files.map((file) => ({
      ...file,
      content: file.name.endsWith('.cst') ? `${file.content}\n// my pin notes` : file.content,
    })),
  };
  assert.equal(builtinTruthTableScenario(copy, ports)?.cycles, 8);
  const edited = {
    ...copy,
    files: copy.files.map((file) => ({
      ...file,
      content: file.name.endsWith('.v') ? `${file.content}\n// edited source` : file.content,
    })),
  };
  assert.equal(builtinTruthTableScenario(edited, ports), null);
  assert.equal(builtinTruthTableScenario({ ...copy, top: 'different_top' }, ports), null);
});

test('diagram starter scenarios never change interactive virtual-board defaults', () => {
  const logic = examples.find((example) => example.id === 'logic')!.project;
  const ports = ['a', 'b', 'c'].map((name) => ({ name, width: 1, direction: 'input' as const }));
  assert.ok(builtinTruthTableScenario(logic, ports));
  assert.deepEqual(simulationDefaults(ports).inputs, { a: '0', b: '0', c: '0' });
  assert.equal(simulationDefaults(ports).stimuli, undefined);
  const counter = examples.find((example) => example.id === 'counter')!.project;
  assert.equal(
    builtinTruthTableScenario(counter, [
      { name: 'clk', width: 1, direction: 'input' },
      { name: 'reset_n', width: 1, direction: 'input' },
      { name: 'enable', width: 1, direction: 'input' },
    ]),
    null,
  );
});
