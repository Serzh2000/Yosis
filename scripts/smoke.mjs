import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 3099;
const base = `http://127.0.0.1:${port}`;
let output = '';
const server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server/index.ts'], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false,
});
server.stdout.on('data', (chunk) => {
  output += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  output += chunk.toString();
});
server.on('error', (error) => {
  output += error.message;
});

async function request(route, options) {
  const response = await fetch(`${base}${route}`, options);
  const data = await response.json();
  assert.ok(response.ok, `${route}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}
async function build(content, name = 'smoke') {
  let result = await request('/api/builds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: { name, top: 'top', board: 'tangnano20k', files: [{ name: 'top.v', content }] },
    }),
  });
  const deadline = Date.now() + 180_000;
  while (['queued', 'running'].includes(result.status)) {
    assert.ok(Date.now() < deadline, `Сборка ${result.id} превысила лимит`);
    await delay(150);
    result = await request(`/api/builds/${result.id}`);
  }
  return result;
}

try {
  let health;
  const deadline = Date.now() + 30_000;
  while (!health && Date.now() < deadline) {
    try {
      health = await request('/api/health');
    } catch {
      await delay(200);
    }
  }
  assert.ok(health, `Сервис не запустился:\n${output}`);
  assert.equal(health.capabilities.synthesis, true);
  assert.equal(health.board.family, 'GW2A-18C');

  const logic = await build(
    'module top(input a, b, c, output y); assign y = (a & b) | c; endmodule',
    'logic',
  );
  assert.equal(logic.status, 'success', logic.logs);
  assert.ok(logic.rtl.modules.top);
  const cells = Object.values(logic.technology.modules.top.cells);
  assert.ok(
    cells.some((cell) => /^LUT[1-4]$/.test(cell.type)),
    'Нет реальных LUT в технологическом нетлисте',
  );
  // Evaluate the synthesized LUT with the actual connections for all input combinations.
  const top = logic.technology.modules.top;
  const lut = cells.find((cell) => /^LUT[1-4]$/.test(cell.type));
  const inputPorts = ['a', 'b', 'c'];
  for (let value = 0; value < 8; value++) {
    const bits = new Map(
      inputPorts.map((name, index) => [top.ports[name].bits[0], (value >> index) & 1]),
    );
    for (const cell of cells.filter((cell) => cell.type === 'IBUF')) {
      const bit = bits.get(cell.connections.I[0]);
      assert.ok(bit === 0 || bit === 1, 'Неизвестный вход IBUF');
      bits.set(cell.connections.O[0], bit);
    }
    const count = Number(lut.type.slice(3));
    let lutIndex = 0;
    for (let index = 0; index < count; index++) {
      const connection = lut.connections[`I${index}`][0];
      const bit = typeof connection === 'number' ? bits.get(connection) : Number(connection);
      assert.ok(bit === 0 || bit === 1, 'Неизвестный вход LUT');
      lutIndex |= bit << index;
    }
    const init = String(lut.parameters.INIT);
    const actual = Number(init[init.length - 1 - lutIndex]);
    bits.set(lut.connections.F[0], actual);
    for (const cell of cells.filter((cell) => cell.type === 'OBUF')) {
      bits.set(cell.connections.O[0], bits.get(cell.connections.I[0]));
    }
    const expected = (value & 1 & ((value >> 1) & 1)) | ((value >> 2) & 1);
    assert.equal(actual, expected, `LUT: входы ${value.toString(2).padStart(3, '0')}`);
    assert.equal(
      bits.get(top.ports.y.bits[0]),
      expected,
      'Выход LUT должен быть связан с выходом модуля',
    );
  }
  const artifact = await request(`/api/builds/${logic.id}/artifacts/technology.json`);
  assert.deepEqual(artifact, logic.technology);
  console.log('✓ Реальный синтез логики, 8 комбинаций LUT, экспорт JSON');

  const counter = await build(
    'module top(input clk, rst, output reg [3:0] count); always @(posedge clk) if (rst) count <= 0; else count <= count + 1; endmodule',
    'counter',
  );
  assert.equal(counter.status, 'success', counter.logs);
  assert.ok(
    Object.values(counter.technology.modules.top.cells).some((cell) => /^DFF/.test(cell.type)),
    'Нет триггеров в счётчике',
  );
  console.log('✓ Синтез счётчика с регистрами');

  const hierarchy = await build(
    'module adder(input [3:0] a,b,output [3:0] y); assign y=a+b; endmodule\nmodule top(input [3:0] a,b,c,output [3:0] y); wire [3:0] mid; adder first(a,b,mid); adder second(mid,c,y); endmodule',
    'hierarchy',
  );
  assert.equal(hierarchy.status, 'success', hierarchy.logs);
  assert.equal(
    Object.values(hierarchy.technology.modules.top.cells).filter((cell) => cell.type === 'adder')
      .length,
    2,
  );
  assert.ok(hierarchy.technology.modules.adder);
  assert.ok(
    !Object.values(hierarchy.technology.modules.adder.cells).some((cell) =>
      /^(IBUF|OBUF|TBUF|IOBUF)$/.test(cell.type),
    ),
    'Вложенный модуль не должен содержать буферы выводов кристалла',
  );
  console.log('✓ Сохранение иерархии и двух экземпляров модуля');

  const error = await build('module top(input a, output y); assign y = ; endmodule', 'error');
  assert.equal(error.status, 'error');
  assert.ok(error.diagnostics.some((diagnostic) => diagnostic.severity === 'error'));
  console.log('✓ Ошибка Verilog и диагностика');

  const invalid = await fetch(`${base}/api/builds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: {
        name: 'bad',
        top: 'top; shell ls',
        board: 'tangnano20k',
        files: [{ name: '../top.v', content: 'module top; endmodule' }],
      },
    }),
  });
  assert.equal(invalid.status, 400);
  console.log('✓ Проверка входных данных');
} catch (error) {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
} finally {
  server.kill();
}
