import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { examples } from '../src/lib/examples';
import { systemExamples } from '../src/lib/examples-systems';

// Шесть счётчиков делали шаг на каждом такте 27 МГц и выглядели на плате ровным свечением.
// Теперь шаг делается раз в STEP_TICKS тактов. Ожидания считаются обычной арифметикой,
// а не переписыванием выражений Verilog.
const workspace = fileURLToPath(new URL('../', import.meta.url));
const portable = path.join(workspace, '.tools', 'iverilog', 'mingw64');
const bin = path.join(portable, 'bin');
const compiler =
  process.env.IVERILOG_PATH ??
  (process.platform === 'win32' ? path.join(bin, 'iverilog.exe') : 'iverilog');
const runtime =
  process.env.VVP_PATH ?? (process.platform === 'win32' ? path.join(bin, 'vvp.exe') : 'vvp');
const library =
  process.env.IVERILOG_LIB ??
  (process.platform === 'win32' ? path.join(portable, 'lib', 'ivl') : undefined);
const env = { ...process.env };
const pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
env[pathKey] = `${bin}${path.delimiter}${env[pathKey] ?? ''}`;
const probe = spawnSync(compiler, [...(library ? ['-B', library] : []), '-V'], {
  env,
  encoding: 'utf8',
  windowsHide: true,
});
const available = !probe.error && probe.status === 0;

const source = (id: string) =>
  examples.find((example) => example.id === id)!.project.files.find((f) => f.name === 'top.v')!
    .content;

const johnson = [0, 1, 3, 7, 15, 31, 63, 62, 60, 56, 48, 32];
const grayCode = (value: number) => value ^ (value >> 1);

interface Counter {
  id: string;
  /** Выходной порт и его полярность: LED активны при 0, count — прямой. */
  output: string;
  inverted: boolean;
  /** Входная кнопка: пауза или направление. */
  input: string;
  /** Логическое состояние после заданного числа шагов. */
  state: (steps: number) => number;
}

const counters: Counter[] = [
  { id: 'counter', output: 'count', inverted: false, input: 'pause', state: (n) => n % 64 },
  {
    id: 'saturating',
    output: 'led_n',
    inverted: true,
    input: 'pause',
    state: (n) => Math.min(n, 63),
  },
  { id: 'gray', output: 'led_n', inverted: true, input: 'pause', state: (n) => grayCode(n % 64) },
  { id: 'johnson', output: 'led_n', inverted: true, input: 'pause', state: (n) => johnson[n % 12] },
];

const EDGES = 200;
// Кнопка нажата на фронтах 20…49 (значение выставляется перед фронтом).
const pressedBefore = (edge: number) => edge >= 20 && edge < 50;

function simulate(counter: Counter, stepTicks: number, input: (edge: number) => boolean) {
  let lines = '';
  for (let edge = 1; edge <= EDGES; edge++)
    lines += `${counter.input}=${input(edge) ? 1 : 0}; #1; clk=1; #1; $display("%0d", ${counter.output}); clk=0;\n`;
  const bench = `module tb;
reg clk=0, reset=1, ${counter.input}=0;
wire [5:0] ${counter.output};
top #(.STEP_TICKS(${stepTicks})) dut(.clk(clk), .reset(reset), .${counter.input}(${counter.input}), .${counter.output}(${counter.output}));
initial begin
  #1; clk=1; #1; clk=0; #1; clk=1; #1; clk=0; #1; reset=0;
${lines}  $finish;
end
endmodule
`;
  return bench;
}

async function run(id: string, bench: string): Promise<number[]> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'yosis-counter-'));
  try {
    const top = path.join(directory, 'top.v'),
      tb = path.join(directory, 'tb.v'),
      output = path.join(directory, 'check.vvp');
    await writeFile(top, source(id));
    await writeFile(tb, bench);
    const compile = spawnSync(
      compiler,
      [...(library ? ['-B', library] : []), '-g2012', '-s', 'tb', '-o', output, top, tb],
      { cwd: directory, env, encoding: 'utf8', windowsHide: true, timeout: 20_000 },
    );
    assert.equal(compile.status, 0, `${compile.stdout}\n${compile.stderr}`);
    assert.ok(existsSync(output));
    const result = spawnSync(runtime, [output], {
      cwd: directory,
      env,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 20_000,
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout
      .split(/\r?\n/)
      .filter((line) => /^\d+$/.test(line))
      .map(Number);
  } finally {
    assert.equal(path.dirname(directory), os.tmpdir());
    await rm(directory, { recursive: true, force: true });
  }
}

test('пять счётчиков и «лево-право» по умолчанию делают 4 шага в секунду при 27 МГц', () => {
  for (const id of ['counter', 'updown', 'saturating', 'gray', 'johnson']) {
    const text = source(id);
    assert.match(text, /parameter integer STEP_TICKS = 6_750_000\b/, id);
    assert.equal(27_000_000 / 6_750_000, 4);
    assert.match(text, /STEP_TICKS = 1/, `${id}: комментарий называет значение для симуляции`);
    // Счётчик предделителя должен вмещать STEP_TICKS - 1.
    assert.match(text, /reg \[22:0\] ticks/, id);
    assert.ok(6_750_000 - 1 < 2 ** 23);
  }
});

test('divide-by-three — эксперимент только для диаграмм, без медленного делителя', () => {
  const example = systemExamples.find((item) => item.id === 'divide-by-three')!;
  const text = example.project.files.find((file) => file.name === 'top.v')!.content;
  assert.match(text, /ТОЛЬКО ДЛЯ ДИАГРАММ/);
  assert.doesNotMatch(text, /STEP_TICKS\s*=/);
  assert.match(example.description, /Только для диаграмм/);
});

for (const counter of counters) {
  for (const stepTicks of [1, 3]) {
    test(
      `Icarus: ${counter.id} делает шаг раз в ${stepTicks} тактов и учитывает паузу`,
      { skip: available ? false : 'Нужен Icarus Verilog (IVERILOG_PATH/VVP_PATH).' },
      async () => {
        const values = await run(counter.id, simulate(counter, stepTicks, pressedBefore));
        assert.equal(values.length, EDGES);
        let steps = 0;
        values.forEach((value, index) => {
          const edge = index + 1;
          if (edge % stepTicks === 0 && !pressedBefore(edge)) steps++;
          const expected = counter.inverted ? 63 ^ counter.state(steps) : counter.state(steps);
          assert.equal(value, expected, `${counter.id}, N=${stepTicks}, фронт ${edge}`);
        });
      },
    );
  }
}

for (const stepTicks of [1, 3]) {
  test(
    `Icarus: updown делает шаг раз в ${stepTicks} тактов, направление проходит синхронизацию`,
    { skip: available ? false : 'Нужен Icarus Verilog (IVERILOG_PATH/VVP_PATH).' },
    async () => {
      const counter: Counter = {
        id: 'updown',
        output: 'led_n',
        inverted: true,
        input: 'button_direction',
        state: (n) => n,
      };
      const values = await run('updown', simulate(counter, stepTicks, pressedBefore));
      assert.equal(values.length, EDGES);
      let position = 0;
      values.forEach((value, index) => {
        const edge = index + 1;
        // Решение на фронте принимает значение кнопки двумя фронтами раньше.
        const down = edge - 2 >= 1 && pressedBefore(edge - 2);
        if (edge % stepTicks === 0) position = (position + (down ? -1 : 1) + 64) % 64;
        assert.equal(value, 63 ^ position, `updown, N=${stepTicks}, фронт ${edge}`);
      });
      assert.ok(values.some((value) => 63 ^ value) && new Set(values).size > 8);
    },
  );
}
