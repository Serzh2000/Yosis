import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsImport } from 'tsx/esm/api';

const { parseVcd } = await tsImport('../src/lib/vcd.ts', import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 3100;
const base = `http://127.0.0.1:${port}`;
const active = new Set();
let output = '';
let exited = false;
// --import runs TypeScript in this process rather than leaving a CLI child behind on Windows.
const server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false,
  windowsHide: true,
});
const appendOutput = (chunk) => {
  output = (output + String(chunk)).slice(-80_000);
};
server.stdout.on('data', appendOutput);
server.stderr.on('data', appendOutput);
server.on('error', (error) => {
  appendOutput(error.message);
  exited = true;
});
server.on('exit', () => {
  exited = true;
});

const project = {
  name: 'simulation-smoke-counter',
  top: 'top',
  board: 'tangnano20k',
  files: [
    {
      name: 'top.v',
      content: `module top(
  input clk, input rst, input enable, output reg [7:0] count
);
  always @(posedge clk)
    if (rst) count <= 8'd0;
    else if (enable) count <= count + 8'd1;
endmodule
`,
    },
  ],
};
const config = {
  clock: 'clk',
  reset: 'rst',
  resetActiveLow: false,
  resetCycles: 2,
  cycles: 8,
  periodNs: 10,
  inputs: { enable: '1' },
};

async function rawRequest(route, options = {}, timeout = 10_000) {
  const response = await fetch(`${base}${route}`, {
    ...options,
    signal: AbortSignal.timeout(timeout),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { response, data };
}
async function request(route, options) {
  const { response, data } = await rawRequest(route, options);
  assert.ok(response.ok, `${route}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}
const post = (value) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value),
});

async function waitSimulation(result) {
  const deadline = Date.now() + 180_000;
  while (result.status === 'queued' || result.status === 'running') {
    assert.ok(Date.now() < deadline, `Симуляция ${result.id} превысила лимит 180 секунд.`);
    await delay(150);
    result = await request(`/api/simulations/${result.id}`);
  }
  active.delete(result.id);
  return result;
}
async function simulate(simulationProject, simulationConfig) {
  const { response, data } = await rawRequest(
    '/api/simulations',
    post({ project: simulationProject, config: simulationConfig }),
  );
  assert.equal(response.status, 202, `Симуляция не принята: ${JSON.stringify(data)}`);
  assert.equal(data.status, 'queued', 'POST должен возвращать очередь, GET — итоговый статус.');
  active.add(data.id);
  return waitSimulation(data);
}
function signal(trace, name, width) {
  const matches = trace.signals.filter(
    (item) =>
      item.name === name || item.name.startsWith(`${name}[`) || item.name.startsWith(`${name} [`),
  );
  matches.sort((a, b) => a.scope.length - b.scope.length);
  assert.ok(
    matches.length,
    `В VCD нет сигнала ${name}. Доступны: ${trace.signals.map((item) => [...item.scope, item.name].join('.')).join(', ')}`,
  );
  assert.equal(matches[0].width, width, `${name}: неправильная разрядность.`);
  return matches[0];
}
function valueAt(signal, time) {
  let low = 0;
  let high = signal.changes.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (signal.changes[middle].time <= time) low = middle + 1;
    else high = middle;
  }
  return low ? signal.changes[low - 1].value : '?';
}
function checkClockAndCounter(trace, enabled) {
  const clock = signal(trace, 'clk', 1);
  const reset = signal(trace, 'rst', 1);
  const enable = signal(trace, 'enable', 1);
  const counter = signal(trace, 'count', 8);
  assert.deepEqual(trace.warnings, [], 'Штатный VCD не должен требовать исправлений парсера.');
  const rising = clock.changes.filter(
    (change, index) => change.value === '1' && index > 0 && clock.changes[index - 1].value === '0',
  );
  assert.equal(
    rising.length,
    config.cycles,
    'Число фронтов должно совпадать с заданным числом циклов.',
  );
  for (let index = 1; index < rising.length; index++) {
    assert.equal(
      (rising[index].time - rising[index - 1].time) * trace.timescaleFs,
      config.periodNs * 1e6,
      'Реальный период clock должен быть 10 нс.',
    );
  }
  for (let index = 0; index < rising.length; index++) {
    const time = rising[index].time;
    const inReset = index < config.resetCycles;
    assert.equal(valueAt(reset, time), inReset ? '1' : '0', `rst на фронте ${index + 1}`);
    assert.equal(valueAt(enable, time), enabled ? '1' : '0', `enable на фронте ${index + 1}`);
    const value = valueAt(counter, time);
    assert.match(
      value,
      /^[01]{8}$/,
      `count должен быть известен после фронта ${index + 1}: ${value}`,
    );
    assert.equal(
      parseInt(value, 2),
      !enabled || inReset ? 0 : index - config.resetCycles + 1,
      `count на фронте ${index + 1}`,
    );
  }
  assert.equal(
    valueAt(counter, trace.endTime),
    enabled ? '00000110' : '00000000',
    'Итог счётчика после двух циклов reset и шести рабочих циклов.',
  );
}

try {
  let health;
  const deadline = Date.now() + 60_000;
  while (!health && Date.now() < deadline) {
    assert.ok(!exited, `Сервис завершился во время запуска:\n${output}`);
    try {
      const reply = await rawRequest('/api/health', {}, 6000);
      if (reply.response.ok) health = reply.data;
    } catch {
      await delay(200);
    }
  }
  assert.ok(health && !exited, `API не запустился:\n${output}`);
  assert.equal(health.capabilities.synthesis, true, 'Нужен установленный YoWASP Yosys.');
  assert.equal(
    health.capabilities.simulation,
    true,
    'Нужен Icarus Verilog. На Windows выполните npm run setup:iverilog.',
  );
  assert.equal(health.simulator?.available, true);

  const counter = await simulate(project, config);
  assert.equal(counter.status, 'success', `${counter.error ?? ''}\n${counter.logs}`);
  assert.ok(
    counter.vcd?.includes('$enddefinitions'),
    'Результат API должен содержать настоящий VCD.',
  );
  assert.match(counter.engine, /icarus|iverilog/i);
  assert.ok(counter.elapsedMs > 0);
  const trace = parseVcd(counter.vcd);
  checkClockAndCounter(trace, true);
  console.log('✓ Реальная цепочка Yosys RTL → Icarus → VCD: clock 10 нс, reset 2 цикла, count 1…6');

  const waveform = await request(`/api/simulations/${counter.id}/artifacts/wave.vcd`);
  assert.equal(waveform, counter.vcd, 'Скачиваемый VCD должен совпадать с результатом API.');
  const logs = await request(`/api/simulations/${counter.id}/artifacts/logs.txt`);
  assert.equal(typeof logs, 'string');
  assert.ok(
    logs.trim().length > 0,
    'Журнал симуляции должен содержать сообщения реальных инструментов.',
  );
  assert.match(logs, /Yosys/i, 'В журнале должны быть команды нормализации RTL.');
  assert.match(
    logs,
    /VCD|Icarus|iverilog|vvp/i,
    'В журнале должны быть сообщения реального симулятора.',
  );
  console.log('✓ Экспорт wave.vcd и журнала симуляции');

  const held = await simulate(
    { ...project, name: 'simulation-smoke-disabled' },
    { ...config, inputs: { enable: '0' } },
  );
  assert.equal(held.status, 'success', `${held.error ?? ''}\n${held.logs}`);
  checkClockAndCounter(parseVcd(held.vcd), false);
  console.log('✓ enable=0 удерживает счётчик в нуле после reset');

  const invalid = await rawRequest(
    '/api/simulations',
    post({ project, config: { ...config, cycles: 0 } }),
  );
  assert.equal(invalid.response.status, 400);
  assert.ok(
    typeof invalid.data.error === 'string' && invalid.data.error.length > 10,
    'Ошибочная конфигурация должна получить понятное описание.',
  );
  console.log('✓ Ошибочная конфигурация отклоняется с HTTP 400');

  const badClock = await rawRequest(
    '/api/simulations',
    post({ project, config: { ...config, clock: 'missing_clock' } }),
  );
  let clockError;
  if (badClock.response.status === 202) {
    active.add(badClock.data.id);
    const result = await waitSimulation(badClock.data);
    assert.equal(
      result.status,
      'error',
      'Отсутствующий тактовый вход должен остановить симуляцию.',
    );
    clockError = `${result.error ?? ''}\n${result.logs}`;
  } else {
    assert.equal(badClock.response.status, 400);
    clockError = badClock.data.error;
  }
  assert.match(
    clockError,
    /missing_clock|такт|clock|вход/i,
    'Ошибка должна указывать на отсутствующий тактовый вход.',
  );
  console.log('✓ Отсутствующий clock сообщает причину ошибки');

  const broken = await simulate(
    {
      ...project,
      name: 'simulation-smoke-syntax-error',
      files: [
        {
          name: 'top.v',
          content:
            'module top(input clk, rst, enable, output [7:0] count); assign count = ; endmodule',
        },
      ],
    },
    config,
  );
  assert.equal(broken.status, 'error');
  assert.ok(
    broken.error && broken.diagnostics.some((item) => item.severity === 'error'),
    'Ошибка Verilog должна возвращать описание и диагностику.',
  );
  console.log('✓ Ошибка Verilog возвращает диагностику вместо диаграммы');
} catch (error) {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
} finally {
  await Promise.allSettled(
    [...active].map((id) => rawRequest(`/api/simulations/${id}/cancel`, { method: 'POST' }, 3000)),
  );
  if (!exited) {
    const stopped = new Promise((resolve) => server.once('exit', resolve));
    server.kill();
    await Promise.race([stopped, delay(2000)]);
  }
}
