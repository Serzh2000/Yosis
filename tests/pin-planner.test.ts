import assert from 'node:assert/strict';
import test from 'node:test';
import type { Project, YosysNetlist } from '../shared/types';
import {
  applyPinEdit,
  hasSameHdlSources,
  packagePins,
  plannerIssues,
  plannerSignals,
  readCst,
  readPinProperties,
} from '../src/lib/pin-planner';
const project: Project = {
  name: 'pins',
  top: 'top',
  board: 'tangnano20k',
  files: [
    {
      name: 'top.v',
      content:
        'module top(input wire key, output wire [3:1] leds); assign leds={3{~key}}; endmodule',
    },
    {
      name: 'pins.cst',
      content:
        '// Keep this explanation\nIO_LOC "key" 87;\nIO_PORT "key" IO_TYPE=LVCMOS33 PULL_MODE=DOWN;\n// led[1] wiring\nIO_LOC "leds[1]" 15;\nIO_PORT "leds[1]" IO_TYPE=LVCMOS33 DRIVE=8 SLEW_RATE=SLOW;\n',
    },
    {
      name: 'other.cst',
      content: '/* IO_LOC "fake" 15; */\nIO_LOC "leds[2]" 16;\n// IO_LOC "fake" 17;\n',
    },
  ],
};
const rtl: YosysNetlist = {
  creator: 'pin-planner-test',
  modules: {
    top: {
      attributes: {},
      cells: {},
      netnames: {},
      ports: {
        key: { direction: 'input', bits: [2] },
        leds: { direction: 'output', bits: [3, 4, 5], offset: 1 },
      },
    },
  },
};
const signals = plannerSignals(project, rtl);
test('repeated assignments do not grow blank lines and inline comments survive the patch', () => {
  const edit = { signal: 'leds[1]', pin: 18, file: 'pins.cst', pull: 'NONE' as const };
  const first = applyPinEdit(project, signals, edit);
  assert.equal(applyPinEdit(first, signals, edit).files[1].content, first.files[1].content);
  const inline = {
    ...project,
    files: project.files.map((file) =>
      file.name === 'pins.cst'
        ? {
            ...file,
            content: file.content.replace(
              'IO_LOC "leds[1]" 15;',
              'IO_LOC /* keep internal */ "leds[1]" 15; // keep trailing',
            ),
          }
        : file,
    ),
  };
  const changed = applyPinEdit(inline, signals, edit);
  assert.match(changed.files[1].content, /keep internal/);
  assert.match(changed.files[1].content, /keep trailing/);
  assert.equal(
    readCst(changed).find((item) => item.kind === 'IO_LOC' && item.signal === 'leds[1]')?.value,
    '18',
  );
  assert.throws(
    () => applyPinEdit(project, signals, { ...edit, file: '../unsafe.cst' }),
    /Имена файлов/,
  );
});
test('planner uses Yosys port bit offsets and all actual QN88 I/O banks', () => {
  assert.deepEqual(
    signals.map((value) => value.name),
    ['key', 'leds[1]', 'leds[2]', 'leds[3]'],
  );
  const ascending = {
    ...rtl,
    modules: {
      top: {
        ...rtl.modules.top,
        ports: { bus: { direction: 'input' as const, bits: [2, 3, 4], offset: 5, upto: 1 } },
      },
    },
  };
  assert.deepEqual(
    plannerSignals(project, ascending).map((value) => value.name),
    ['bus[7]', 'bus[6]', 'bus[5]'],
  );
  assert.equal(packagePins.length, 88);
  assert.equal(packagePins.filter((pin) => pin.io).length, 66);
  assert.equal(packagePins[14].bank, 6);
  assert.equal(packagePins[86].bank, 3);
});
test('pin changes preserve other files, comments and unrelated electrical properties', () => {
  const next = applyPinEdit(project, signals, {
    signal: 'leds[1]',
    pin: 17,
    file: 'pins.cst',
    pull: 'UP',
  });
  assert.equal(next.files[0].content, project.files[0].content);
  assert.equal(next.files[2].content, project.files[2].content);
  assert.match(next.files[1].content, /Keep this explanation/);
  assert.match(next.files[1].content, /led\[1\] wiring/);
  assert.equal(
    readCst(next).find((command) => command.signal === 'leds[1]' && command.kind === 'IO_LOC')
      ?.value,
    '17',
  );
  assert.deepEqual(readPinProperties(readCst(next), 'leds[1]'), {
    IO_TYPE: 'LVCMOS33',
    DRIVE: '8',
    SLEW_RATE: 'SLOW',
    PULL_MODE: 'UP',
  });
  assert.equal(readCst(project).filter((command) => command.signal === 'fake').length, 0);
});
test('assignment refuses pin conflicts across files, power, JTAG and wrong board direction', () => {
  const edit = { signal: 'leds[1]', pin: 16, file: 'pins.cst', pull: 'NONE' as const };
  assert.throws(() => applyPinEdit(project, signals, edit), /уже назначен.*leds\[2\]/);
  for (const pin of [1, 5, 9, 60, 89])
    assert.throws(() => applyPinEdit(project, signals, { ...edit, pin }));
  assert.throws(() => applyPinEdit(project, signals, { ...edit, pin: 87 }), /нужен вход/);
  assert.throws(
    () => applyPinEdit(project, signals, { ...edit, signal: 'key', pin: 17 }),
    /нужен выход/,
  );
  assert.throws(
    () => applyPinEdit(project, signals, { ...edit, signal: 'missing', pin: 17 }),
    /отсутствует/,
  );
});
test('unassign frees only the signal location; properties and all other bindings remain', () => {
  const next = applyPinEdit(project, signals, {
    signal: 'leds[1]',
    pin: null,
    file: 'pins.cst',
    pull: 'NONE',
  });
  assert.equal(
    readCst(next).some((command) => command.kind === 'IO_LOC' && command.signal === 'leds[1]'),
    false,
  );
  assert.equal(readPinProperties(readCst(next), 'leds[1]').DRIVE, '8');
  assert.equal(
    readCst(next).find((command) => command.signal === 'key' && command.kind === 'IO_LOC')?.value,
    '87',
  );
});
test('manual differential pairs and contradictory properties cannot be overwritten silently', () => {
  const paired = {
    ...project,
    files: [
      ...project.files,
      { name: 'pairs.cst', content: 'IO_LOC "leds[3]" 33,34; IO_PORT "leds[3]" IO_TYPE=LVDS25;' },
    ],
  };
  assert.throws(
    () =>
      applyPinEdit(paired, signals, { signal: 'leds[3]', pin: 18, file: 'pins.cst', pull: 'NONE' }),
    /Дифференциальные/,
  );
  const ambiguous = {
    ...project,
    files: [...project.files, { name: 'duplicate.cst', content: 'IO_PORT "leds[1]" DRIVE=4;' }],
  };
  assert.throws(
    () =>
      applyPinEdit(ambiguous, signals, {
        signal: 'leds[1]',
        pin: 18,
        file: 'pins.cst',
        pull: 'NONE',
      }),
    /противоречивые/,
  );
});
test('validation shows orphan/duplicate assignments and HDL freshness survives only CST edits', () => {
  assert.deepEqual(plannerIssues(project, signals), []);
  const broken = {
    ...project,
    files: [
      ...project.files,
      { name: 'bad.cst', content: 'IO_LOC "missing" 16; IO_LOC "key" 88;' },
    ],
  };
  assert.match(plannerIssues(broken, signals).join('\n'), /нет такого порта/);
  assert.match(plannerIssues(broken, signals).join('\n'), /конфликт/);
  const changed = applyPinEdit(project, signals, {
    signal: 'leds[1]',
    pin: 18,
    file: 'pins.cst',
    pull: 'NONE',
  });
  assert.equal(hasSameHdlSources(changed, JSON.stringify(project)), true);
  assert.equal(
    hasSameHdlSources(
      {
        ...changed,
        files: [
          { ...changed.files[0], content: 'module top; endmodule' },
          ...changed.files.slice(1),
        ],
      },
      JSON.stringify(project),
    ),
    false,
  );
  assert.equal(hasSameHdlSources(changed, ''), false);
});
