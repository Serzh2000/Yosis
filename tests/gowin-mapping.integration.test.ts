// Проверка стадии «блоки Gowin»: rtl.json → synth_gowin → iopadmap → technology.json,
// а также всё, что клиент делает с этим нетлистом (подсчёт ресурсов, дерево, таблицы LUT).
//
// Три независимых оракула:
//  1. формальное доказательство эквивалентности RTL и нетлиста Gowin (Yosys miter + SAT), где
//     примитивы кристалла раскрыты через их поведенческие модели cells_sim.v;
//  2. совместная симуляция исходника, RTL и нетлиста Gowin в Icarus Verilog (с теми же моделями);
//  3. разбор таблиц LUT клиентским кодом против вычисления выражения в JavaScript.
//
// Тесты со свойством `todo` описывают найденные дефекты (см. tests/rtl-generation…).
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import path from 'node:path';
import test, { after } from 'node:test';
import type { YosysCell, YosysNetlist } from '../shared/types';
import {
  getHierarchy,
  getLutTruthTable,
  getResources,
  resourceCategory,
  type LutTruthRow,
  type ResourceCounts,
} from '../src/lib/netlist';
import { corpus } from './rtl-gowin-corpus';
import {
  buildOk,
  closeHarness,
  exportTechnologyVerilog,
  gowinCellsSim,
  iverilogAvailable,
  isLibrary,
  projectCellTypes,
  proveEquivalent,
  simulate,
  testbench,
  toProject,
  topPorts,
  yosysResource,
  type Design,
} from './rtl-gowin-harness';

after(closeHarness);

const byId = (id: string) => corpus.find((item) => item.id === id)!;
const tristate = (design: Design) => design.id.startsWith('tristate');
const files = (design: Design) => toProject(design).files;

for (const design of corpus) {
  test(`Gowin [${design.id}]: нетлист содержит ожидаемые примитивы кристалла`, async () => {
    const { technology } = await buildOk(design);
    const types = projectCellTypes(technology, design.top);
    for (const type of design.tech ?? [])
      assert.ok(types[type], `нет ${type} среди ${JSON.stringify(types)}`);
    for (const type of design.techNot ?? [])
      assert.equal(types[type], undefined, `лишний ${type}: ${JSON.stringify(types)}`);
    for (const [type, count] of Object.entries(design.count ?? {}))
      assert.equal(types[type] ?? 0, count, `${type}: ${JSON.stringify(types)}`);
  });
}

// Всё, что осталось от Yosys-типов вида $_AND_, значит «до кристалла не дошло».
const unmapped = (technology: YosysNetlist, top: string) =>
  Object.keys(projectCellTypes(technology, top)).filter((type) => /^\$(?!paramod)/.test(type));

for (const design of corpus.filter((item) => !tristate(item))) {
  test(`Gowin [${design.id}]: отображение полное — внутренних ячеек Yosys не осталось`, async () => {
    const { technology } = await buildOk(design);
    assert.deepEqual(unmapped(technology, design.top), []);
  });
}

test('Gowin: вывод с третьим состоянием (TBUF/IOBUF) отображается без «потерянных» вентилей', async () => {
  for (const id of ['tristate-inout', 'tristate-output']) {
    const design = byId(id);
    const { technology } = await buildOk(design);
    assert.deepEqual(unmapped(technology, design.top), [], id);
  }
});

// ---------------------------------------------------------------------------------------------
// Выводы кристалла: каждый бит порта верхнего модуля получает свой буфер.

for (const design of corpus.filter((item) => !tristate(item))) {
  test(`Gowin [${design.id}]: каждый бит порта верхнего модуля получает IBUF/OBUF`, async () => {
    const { technology, rtl } = await buildOk(design);
    const ports = Object.values(rtl.modules[design.top].ports);
    const bits = (direction: string) =>
      ports
        .filter((port) => port.direction === direction)
        .reduce((sum, port) => sum + port.bits.length, 0);
    const own = technology.modules[design.top].cells;
    const count = (type: string) => Object.values(own).filter((cell) => cell.type === type).length;
    assert.equal(count('IBUF'), bits('input'), 'IBUF по входам');
    assert.equal(count('OBUF'), bits('output'), 'OBUF по выходам');
  });
}

test('Gowin [tristate-inout]: двунаправленный вывод получает IOBUF, а не пару буферов', async () => {
  const { technology } = await buildOk(byId('tristate-inout'));
  const types = Object.values(technology.modules.top.cells).map((cell) => cell.type);
  assert.equal(types.filter((type) => type === 'IOBUF').length, 1);
});

test('Gowin: служебные вспомогательные модули не попадают в иерархию проекта', async () => {
  const { technology } = await buildOk(byId('hierarchy-two-levels'));
  const tree = getHierarchy(technology, 'top');
  const seen = new Set<string>();
  const visit = (node: typeof tree) => {
    seen.add(node.moduleName);
    node.children.forEach(visit);
  };
  visit(tree);
  assert.deepEqual([...seen].sort(), ['full', 'half', 'top']);
});

// ---------------------------------------------------------------------------------------------
// Формальная эквивалентность RTL ↔ Gowin.

for (const design of corpus) {
  test(
    `Gowin [${design.id}]: нетлист формально эквивалентен RTL`,
    { skip: design.skipFormal ?? false },
    async () => {
      const { rtl, technology } = await buildOk(design);
      const result = await proveEquivalent(rtl, technology, design.top, design.sequential ? 5 : 1);
      assert.ok(result.ok, result.log);
    },
  );
}

// Проверка самого доказательства: если подменить функцию или тип триггера, оно обязано упасть.
// Без этого «эквивалентно» могло бы значить «ничего не проверялось».
function mutateFirst(
  technology: YosysNetlist,
  top: string,
  predicate: (cell: YosysCell) => boolean,
  change: (cell: YosysCell) => void,
): YosysNetlist {
  const copy: YosysNetlist = structuredClone(technology);
  for (const name of Object.keys(copy.modules)) {
    if (isLibrary(copy.modules[name])) continue;
    const cell = Object.values(copy.modules[name].cells).find(predicate);
    if (cell) {
      change(cell);
      return copy;
    }
  }
  throw new Error(`нечего менять в ${top}`);
}

test('доказательство эквивалентности замечает изменённую таблицу LUT', async () => {
  const design = byId('and4');
  const { rtl, technology } = await buildOk(design);
  const mutated = mutateFirst(
    technology,
    design.top,
    (cell) => cell.type === 'LUT4',
    (cell) => {
      // Инвертируем одну строку таблицы истинности.
      const init = String(cell.parameters.INIT);
      cell.parameters.INIT = init.slice(0, -1) + (init.endsWith('1') ? '0' : '1');
    },
  );
  assert.ok((await proveEquivalent(rtl, technology, design.top, 1)).ok, 'исходный нетлист');
  assert.equal((await proveEquivalent(rtl, mutated, design.top, 1)).ok, false);
});

test('доказательство эквивалентности замечает подмену триггера (фронт ↔ спад)', async () => {
  const design = byId('counter-sync-reset');
  const { rtl, technology } = await buildOk(design);
  const mutated = mutateFirst(
    technology,
    design.top,
    (cell) => cell.type === 'DFFRE',
    (cell) => {
      cell.type = 'DFFNE';
    },
  );
  assert.equal((await proveEquivalent(rtl, mutated, design.top, 5)).ok, false);
});

// ---------------------------------------------------------------------------------------------
// Симуляция «исходник = RTL = Gowin» в Icarus.

for (const design of corpus) {
  const skip = design.skipSim ?? (iverilogAvailable ? false : 'Icarus Verilog не установлен');
  test(
    `Gowin [${design.id}]: поведение нетлиста совпадает с исходным Verilog (Icarus)`,
    { skip },
    async () => {
      const { rtl, technology, top } = await buildOk(design);
      const bench = testbench(top, topPorts(rtl, top));
      const gold = await simulate(files(design), bench);
      assert.ok(gold.split('\n').length > 300, 'тестбенч выдал слишком мало тактов');
      const actual = await simulate(
        [
          { name: 'gate.v', content: await exportTechnologyVerilog(technology) },
          { name: 'cells_sim.v', content: await gowinCellsSim() },
        ],
        bench,
      );
      assert.equal(actual, gold);
    },
  );
}

// ---------------------------------------------------------------------------------------------
// Таблицы LUT: клиент разбирает INIT сам (getLutTruthTable), и порядок битов легко перепутать.
// Сверяем таблицу с выражением, вычисленным в JavaScript, для всех комбинаций входов.

const expressions: [string, (a: number, b: number, c: number, d: number) => number][] = [
  ['a & b', (a, b) => a & b],
  ['a | b', (a, b) => a | b],
  ['a ^ b', (a, b) => a ^ b],
  ['~(a & b)', (a, b) => (a & b) ^ 1],
  ['a & ~b', (a, b) => a & (b ^ 1)],
  ['(a & b) | c', (a, b, c) => (a & b) | c],
  ['a ? b : c', (a, b, c) => (a ? b : c)],
  ['a ^ b ^ c', (a, b, c) => a ^ b ^ c],
  ['~a & b & ~c', (a, b, c) => (a ^ 1) & b & (c ^ 1)],
  ['(a & b) | (c & d)', (a, b, c, d) => (a & b) | (c & d)],
  ['(a | b) & (c | d)', (a, b, c, d) => (a | b) & (c | d)],
  ['a & b & c & ~d', (a, b, c, d) => a & b & c & (d ^ 1)],
  ['(a ^ d) & (b | ~c)', (a, b, c, d) => (a ^ d) & (b | (c ^ 1))],
];
for (const [expression, evaluate] of expressions) {
  test(`таблица LUT совпадает с выражением ${expression}`, async () => {
    const design: Design = {
      id: `lut-${expression}`,
      top: 'top',
      src: `module top(input a, input b, input c, input d, output y); assign y = ${expression}; endmodule`,
    };
    const { technology } = await buildOk(design);
    const top = technology.modules.top;
    const portOfNet = new Map<number, string>();
    for (const cell of Object.values(top.cells))
      if (cell.type === 'IBUF') {
        const [pad] = cell.connections.I;
        const [net] = cell.connections.O;
        const port = Object.entries(top.ports).find(([, value]) => value.bits.includes(pad))?.[0];
        if (typeof net === 'number' && port) portOfNet.set(net, port);
      }
    const lut = Object.values(top.cells).find((cell) => /^LUT[1-4]$/.test(cell.type));
    assert.ok(lut, 'нет LUT');
    const rows = getLutTruthTable(lut);
    assert.ok(rows);
    const inputs = Object.entries(lut.connections)
      .filter(([pin]) => /^I\d$/.test(pin))
      .map(([pin, bits]) => ({ index: Number(pin.slice(1)), bit: bits[0] }));
    assert.equal(rows.length, 2 ** inputs.length);
    for (let mask = 0; mask < 16; mask++) {
      const value = { a: mask & 1, b: (mask >> 1) & 1, c: (mask >> 2) & 1, d: (mask >> 3) & 1 };
      let address: number = 0;
      for (const input of inputs) {
        const port = typeof input.bit === 'number' ? portOfNet.get(input.bit) : undefined;
        const level: number = port ? value[port as keyof typeof value] : input.bit === '1' ? 1 : 0;
        address |= level << input.index;
      }
      const row: LutTruthRow = rows[address];
      assert.equal(
        row.output,
        String(evaluate(value.a, value.b, value.c, value.d)),
        `a=${value.a} b=${value.b} c=${value.c} d=${value.d}: адрес ${address}`,
      );
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Учёт ресурсов: getResources считает по иерархии с учётом числа экземпляров.

function expandedCounts(netlist: YosysNetlist, name: string, ancestors = new Set<string>()) {
  const counts: Record<string, number> = {};
  const module = netlist.modules[name];
  if (!module || ancestors.has(name)) return counts;
  const next = new Set(ancestors).add(name);
  for (const cell of Object.values(module.cells)) {
    const child = netlist.modules[cell.type];
    if (child && !isLibrary(child)) {
      for (const [type, n] of Object.entries(expandedCounts(netlist, cell.type, next)))
        counts[type] = (counts[type] ?? 0) + n;
    } else counts[cell.type] = (counts[cell.type] ?? 0) + 1;
  }
  return counts;
}
const bucket = (type: string): keyof ResourceCounts =>
  /^LUT[1-4]$/.test(type)
    ? 'LUT'
    : /^DFF/.test(type)
      ? 'FF'
      : type === 'ALU'
        ? 'ALU'
        : /^(IBUF|OBUF|IOBUF|TBUF)$/.test(type)
          ? 'IO'
          : /^MULT/.test(type)
            ? 'DSP'
            : 'other';

for (const design of corpus.filter((item) => !/^(gowin|latch|bram)/.test(item.id))) {
  test(`Gowin [${design.id}]: getResources считает примитивы с учётом числа экземпляров`, async () => {
    const { technology, top } = await buildOk(design);
    const raw = expandedCounts(technology, top);
    const expected: Record<string, number> = {};
    let total = 0;
    for (const [type, n] of Object.entries(raw)) {
      expected[bucket(type)] = (expected[bucket(type)] ?? 0) + n;
      total += n;
    }
    const actual = getResources(technology, top);
    assert.equal(actual.total, total);
    for (const key of ['LUT', 'FF', 'ALU', 'IO', 'DSP'] as const)
      assert.equal(actual[key], expected[key] ?? 0, `${key}: ${JSON.stringify(raw)}`);
    // Корень дерева иерархии несёт те же числа, что и getResources.
    assert.deepEqual(getHierarchy(technology, top).resources, actual);
  });
}

// ---------------------------------------------------------------------------------------------
// Готовые примитивы кристалла в исходнике проходят конвейер насквозь.

test('Gowin [gowin-primitive-instance]: rPLL остаётся примитивом и подключён к тактовой цепи', async () => {
  const { technology } = await buildOk(byId('gowin-primitive-instance'));
  const top = technology.modules.top;
  const pll = Object.values(top.cells).find((cell) => cell.type === 'rPLL');
  assert.ok(pll, 'нет rPLL');
  const [clkout] = pll.connections.CLKOUT;
  const flops = Object.values(top.cells).filter((cell) => /^DFF/.test(cell.type));
  assert.ok(flops.length > 0);
  for (const flop of flops)
    assert.equal(flop.connections.CLK[0], clkout, 'триггер не на тактах PLL');
  const clkin = pll.connections.CLKIN[0];
  const ibuf = Object.values(top.cells).find((cell) => cell.type === 'IBUF');
  assert.equal(ibuf?.connections.O[0], clkin, 'вход CLKIN не от вывода clk');
  assert.equal(resourceCategory('rPLL'), 'other');
});

// ---------------------------------------------------------------------------------------------
// Классификация: каждому примитиву кристалла — свой ресурс. Список берётся из исходников Yosys.

async function gowinPrimitives(): Promise<string[]> {
  const names = new Set<string>();
  for (const file of ['gowin/cells_sim.v', 'gowin/cells_xtra_gw2a.v'])
    for (const match of (await yosysResource(file)).matchAll(/^module\s+(\w+)/gm))
      names.add(match[1]);
  names.delete('GND');
  return [...names].filter((name) => !name.startsWith('__'));
}
const only = (names: string[], pattern: RegExp) => names.filter((name) => pattern.test(name));

test('классификация: таблицы, АЛУ, триггеры и умножители отнесены к своим ресурсам', async () => {
  const names = await gowinPrimitives();
  assert.ok(names.length > 100, 'библиотека примитивов не прочиталась');
  for (const name of only(names, /^LUT[1-4]$/)) assert.equal(resourceCategory(name), 'LUT', name);
  assert.equal(resourceCategory('ALU'), 'ALU');
  for (const name of only(names, /^DFF/)) assert.equal(resourceCategory(name), 'FF', name);
  for (const name of only(names, /^(MULT|PADD|ALU54D)/))
    assert.equal(resourceCategory(name), 'DSP', name);
  for (const name of only(names, /^(IBUF|OBUF|IOBUF|TBUF)/))
    assert.equal(resourceCategory(name), 'IO', name);
});

const BLOCK_RAM = /^(SP|SPX9|SDP|SDPX9|DP|DPX9|DPB|DPX9B|SDPB|SDPX9B|pROM|pROMX9|ROM|ROMX9)$/;
test('классификация: все блочные RAM/ROM кристалла (BSRAM) считаются как BRAM', async () => {
  const names = only(await gowinPrimitives(), BLOCK_RAM);
  assert.ok(names.length >= 12, names.join(' '));
  const wrong = names.filter((name) => resourceCategory(name) !== 'BRAM');
  assert.deepEqual(wrong, []);
});

test('классификация: распределённая память (RAM16*, ROM16) не считается блочной', async () => {
  for (const name of only(await gowinPrimitives(), /^(RAM16|ROM16)/))
    assert.notEqual(resourceCategory(name), 'BRAM', name);
});

test('учёт ресурсов: блочная память, выведенная Yosys, попадает в счётчик BRAM', async () => {
  const design = byId('bram-2k');
  const { technology, top } = await buildOk(design);
  assert.equal(projectCellTypes(technology, top).SPX9, 1);
  assert.equal(getResources(technology, top).BRAM, 1);
});

test('классификация: защёлки Gowin (DL, DLC, DLE…) — элементы хранения, как триггеры', async () => {
  const latches = only(await gowinPrimitives(), /^DL[A-Z]*$/).filter((name) => name !== 'DLLDLY');
  assert.ok(latches.length >= 8);
  assert.deepEqual(
    latches.filter((name) => resourceCategory(name) !== 'FF'),
    [],
  );
});

test('классификация: глобальные буферы тактов (BUFG, BUFS) не считаются ячейками ввода-вывода', async () => {
  assert.notEqual(resourceCategory('BUFG'), 'IO');
  assert.notEqual(resourceCategory('BUFS'), 'IO');
});

// ---------------------------------------------------------------------------------------------
// Качество отображения: учебная среда показывает ученику число LUT, и оно должно быть
// близким к тому, что получится у специалиста. `synth_gowin` по умолчанию использует
// «широкие LUT» (MUX2_LUT5…8); для чётности, сдвигов и приоритетов это даёт до 5-кратного
// перерасхода. Измерения (LUT1–4): xor-chain-8 — 16 против 2+1 с `-nowidelut`; priority-encoder —
// 28 против 7; case-mux4 — 4 против 3; barrel-shift — 62 против 46; compare — 11 против 7.
const lutBudget: [string, number][] = [
  ['xor-chain-8', 4],
  ['case-mux4', 4],
  ['priority-encoder', 10],
  ['compare', 9],
  ['barrel-shift', 55],
];
test('качество: число LUT на типовых функциях близко к оптимальному (без широких LUT)', async () => {
  const over: string[] = [];
  for (const [id, budget] of lutBudget) {
    const design = byId(id);
    const { technology, top } = await buildOk(design);
    const luts = getResources(technology, top).LUT;
    if (luts > budget) over.push(`${id}: ${luts} LUT при допустимых ${budget}`);
  }
  assert.deepEqual(over, []);
});

test('качество: простые функции укладываются в минимум примитивов', async () => {
  for (const [id, expected] of [
    ['not', 1],
    ['and4', 1],
    ['mux2-vector', 4],
  ] as const) {
    const { technology, top } = await buildOk(byId(id));
    assert.equal(getResources(technology, top).LUT, expected, id);
  }
});

test('качество: сумматор и счётчик используют цепочку переноса ALU, а не LUT', async () => {
  const adder = await buildOk(byId('adder8'));
  assert.equal(projectCellTypes(adder.technology, 'top').ALU, 9);
  assert.equal(getResources(adder.technology, 'top').LUT, 0);
  const counter = await buildOk(byId('counter-sync-reset'));
  const types = projectCellTypes(counter.technology, 'top');
  assert.equal(types.ALU, 8);
  assert.equal(types.DFFRE, 8, 'синхронный сброс и разрешение — в самом триггере DFFRE');
  assert.ok((types.LUT1 ?? 0) <= 1);
});

test('качество: мёртвая логика удаляется, неиспользуемый вход не порождает LUT', async () => {
  const { technology } = await buildOk(byId('unused-and-dead-logic'));
  assert.equal(getResources(technology, 'top').LUT, 0);
});

// Физический этап: плоский нетлист для nextpnr не должен содержать внутренних ячеек Yosys,
// иначе размещение падает («no BELs remaining to implement cell type $_TBUF_»).
const flatten = (rtl: YosysNetlist, top: string): Promise<YosysNetlist> =>
  new Promise((resolve, reject) => {
    const child = fork(path.resolve('server/physical-yosys-runner.mjs'), [], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let text = '';
    child.on('message', (message: { type: string; text?: string; error?: string }) => {
      if (message.type === 'flat') text = message.text ?? '';
      if (message.type === 'error') reject(new Error(message.error));
    });
    child.on('close', () =>
      text ? resolve(JSON.parse(text)) : reject(new Error('нет flat.json')),
    );
    child.send({ technology: { creator: 'test', modules: {} }, rtl, top });
  });

test('физический нетлист: tri-state внутри подмодуля доходит до IOBUF, внутренних ячеек нет', async () => {
  const design: Design = {
    id: 'tristate-in-submodule',
    top: 'top',
    src: `module bus(input oe, input d, inout sda, output q); assign sda = oe ? d : 1'bz; assign q = sda; endmodule
module top(input oe, input d, inout sda, output q); bus u(.oe(oe), .d(d), .sda(sda), .q(q)); endmodule`,
  };
  const { rtl } = await buildOk(design);
  const flat = await flatten(rtl, 'top');
  const types = Object.values(flat.modules.top.cells).map((cell) => cell.type);
  assert.deepEqual(
    types.filter((type) => type.startsWith('$')),
    [],
  );
  assert.equal(types.filter((type) => type === 'IOBUF').length, 1);
});
