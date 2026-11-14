// Проверка стадии «RTL»: Verilog → Yosys (proc, opt) → rtl.json → граф для схемы.
// Всё идёт через настоящий серверный конвейер (BuildManager), а не через заготовленные нетлисты.
//
// Тесты со свойством `todo` описывают найденные дефекты: они выполняются и показываются в отчёте,
// но не ломают сборку, пока дефект не исправлен. Когда дефект устранят, тест надо перевести
// в обычный (убрать `todo`).
import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import type { Bit, YosysNetlist } from '../shared/types';
import { buildGraph, getHierarchy, getSourceLocations } from '../src/lib/netlist';
import { corpus } from './rtl-gowin-corpus';
import {
  build,
  buildOk,
  cellTypes,
  closeHarness,
  exportRtlVerilog,
  iverilogAvailable,
  isLibrary,
  reachable,
  simulate,
  testbench,
  toProject,
  topPorts,
  type Design,
} from './rtl-gowin-harness';

after(closeHarness);

const files = (design: Design) => toProject(design).files;
const tristate = (design: Design) => design.id.startsWith('tristate');
const byId = (id: string) => corpus.find((item) => item.id === id)!;

for (const design of corpus) {
  test(`RTL [${design.id}]: синтез успешен и нетлист содержит ожидаемые элементы`, async () => {
    const result = await buildOk(design);
    const types = cellTypes(result.rtl);
    for (const type of design.rtl ?? [])
      assert.ok(types[type], `нет ${type} среди ${JSON.stringify(types)}`);
    for (const type of design.rtlNot ?? [])
      assert.equal(types[type], undefined, `лишний ${type}: ${JSON.stringify(types)}`);
    assert.ok(result.rtl.modules[design.top], 'нет верхнего модуля в rtl.json');
  });
}

// ---------------------------------------------------------------------------------------------
// Граф схемы: целостность того, что получает пользователь на экране.

interface GraphProblem {
  module: string;
  text: string;
}
function graphProblems(rtl: YosysNetlist, top: string, allowMultiDriver: boolean): GraphProblem[] {
  const problems: GraphProblem[] = [];
  for (const name of reachable(rtl, top)) {
    const module = rtl.modules[name];
    if (isLibrary(module)) continue;
    const graph = buildGraph(rtl, name, { maxCells: 1_000_000, maxEdges: 1_000_000 });
    const add = (text: string) => problems.push({ module: name, text });
    if (graph.hiddenCells || graph.hiddenEdges) add('граф обрезан');
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    const drivers = new Map<string, Set<string>>();
    for (const node of graph.nodes)
      if (node.kind === 'undriven') add(`сигнал без источника ${node.name}`);
    for (const edge of graph.edges) {
      const source = nodes.get(edge.source);
      const target = nodes.get(edge.target);
      if (!source || !target) {
        add(`ребро ${edge.id} ведёт в несуществующий узел`);
        continue;
      }
      const sourcePort = source.ports.find((port) => port.id === edge.sourcePort);
      const targetPort = target.ports.find((port) => port.id === edge.targetPort);
      if (!sourcePort || !targetPort) {
        add(`у ребра ${edge.id} нет порта`);
        continue;
      }
      for (const bit of edge.bits as Bit[]) {
        if (!sourcePort.bits.includes(bit) || !targetPort.bits.includes(bit))
          add(`бит ${bit} ребра ${edge.id} не принадлежит портам ${source.name}→${target.name}`);
        if (typeof bit === 'number') {
          const key = `${edge.targetPort}#${bit}`;
          const set = drivers.get(key) ?? new Set();
          set.add(edge.sourcePort);
          drivers.set(key, set);
        }
      }
    }
    if (!allowMultiDriver)
      for (const [key, set] of drivers)
        if (set.size > 1) add(`бит ${key} вызван несколькими источниками`);
  }
  return problems;
}

for (const design of corpus) {
  test(`RTL [${design.id}]: граф схемы согласован (рёбра, биты, источники)`, async () => {
    const result = await buildOk(design);
    assert.deepEqual(graphProblems(result.rtl, design.top, tristate(design)), []);
  });
}

test('RTL: каждый элемент проекта указывает на строку исходника (переход «схема → код»)', async () => {
  const missing: string[] = [];
  for (const design of corpus) {
    const result = await buildOk(design);
    const known = new Set(files(design).map((file) => file.name));
    for (const [name, cell] of Object.entries(result.rtl.modules[design.top].cells)) {
      // Вложенные модули и примитивы кристалла показываются как есть; нужны ячейки самого проекта.
      if (!cell.type.startsWith('$') || name.startsWith('$auto$')) continue;
      const locations = getSourceLocations(cell.attributes);
      if (!locations.length || !locations.some((item) => known.has(item.file)))
        missing.push(`${design.id}: ${cell.type} ${name}`);
    }
  }
  assert.deepEqual(missing, []);
});

test(
  'RTL: вспомогательные ячейки Yosys ($auto$…) тоже ведут к строке исходника',
  { todo: '$ne из разбора case в fsm-3state создаётся без атрибута src' },
  async () => {
    const missing: string[] = [];
    for (const design of corpus) {
      const result = await buildOk(design);
      for (const [name, cell] of Object.entries(result.rtl.modules[design.top].cells))
        if (
          cell.type.startsWith('$') &&
          name.startsWith('$auto$') &&
          !getSourceLocations(cell.attributes).length
        )
          missing.push(`${design.id}: ${cell.type}`);
    }
    assert.deepEqual(missing, []);
  },
);

test('RTL: иерархия сохраняется — подмодули остаются отдельными модулями и видны в дереве', async () => {
  const { rtl } = await buildOk(byId('hierarchy-two-levels'));
  const own = Object.keys(rtl.modules).filter((name) => !isLibrary(rtl.modules[name]));
  assert.deepEqual(own.sort(), ['full', 'half', 'top']);
  const tree = getHierarchy(rtl, 'top');
  assert.equal(tree.children.length, 4, 'четыре полных сумматора из generate');
  for (const child of tree.children) {
    assert.equal(child.moduleName, 'full');
    assert.equal(child.children.length, 2);
    assert.ok(child.source.length, 'у экземпляра есть строка исходника');
  }
});

test('RTL: параметризованные модули получают отдельные варианты с разной шириной', async () => {
  const { rtl } = await buildOk(byId('parameterised-module'));
  const widths = Object.keys(rtl.modules)
    .filter((name) => name.startsWith('$paramod'))
    .map((name) => /W=s32'(\d+)/.exec(name)?.[1])
    .map((bits) => (bits ? parseInt(bits, 2) : -1))
    .sort((a, b) => a - b);
  assert.deepEqual(widths, [3, 8]);
});

// Память, заполненная в initial, даёт в rtl.json по одной ячейке $meminit_v2 на слово.
// Схема по умолчанию показывает первые 180 ячеек, и инициализация вытесняет сами порты памяти.
test(
  'RTL: инициализация памяти не раздувает схему (одна ячейка на память, а не на слово)',
  { todo: 'RAM 64×8 даёт 64 ячейки $meminit_v2, RAM 2048×8 — 2048' },
  async () => {
    const { rtl } = await buildOk(byId('ram-sync'));
    const inits = Object.values(rtl.modules.top.cells).filter((cell) =>
      cell.type.startsWith('$meminit'),
    );
    assert.ok(inits.length <= 1, `ячеек инициализации: ${inits.length}`);
  },
);

test(
  'RTL: в схеме по умолчанию видны порты чтения и записи памяти',
  { todo: 'в 2К-памяти из 180 видимых узлов 179 — $meminit_v2, порт чтения и регистр скрыты' },
  async () => {
    const { rtl } = await buildOk(byId('bram-2k'));
    const types = new Set(buildGraph(rtl, 'top').nodes.map((node) => node.type));
    assert.ok(types.has('$memrd') || types.has('$memrd_v2'), 'нет порта чтения');
    assert.ok(types.has('$memwr_v2') || types.has('$memwr'), 'нет порта записи');
  },
);

test('RTL: сборка воспроизводима — тот же проект даёт тот же нетлист', async () => {
  const design = byId('fsm-3state');
  const first = await buildOk(design);
  const second = await buildOk({ ...design, id: 'fsm-3state-again' });
  assert.deepEqual(second.rtl, first.rtl);
  assert.deepEqual(second.technology, first.technology);
});

// ---------------------------------------------------------------------------------------------
// Смысл: поведение RTL совпадает с поведением исходного Verilog. Оракул — Icarus Verilog,
// независимый от Yosys. Тот же тестбенч (повторяемые случайные входы) гоняется на исходнике
// и на Verilog, выгруженном из rtl.json; сравниваются все выходы после каждого такта.

for (const design of corpus) {
  const skip = design.skipSim ?? (iverilogAvailable ? false : 'Icarus Verilog не установлен');
  test(
    `RTL [${design.id}]: поведение совпадает с исходным Verilog (Icarus)`,
    { skip },
    async () => {
      const { rtl, top } = await buildOk(design);
      const bench = testbench(top, topPorts(rtl, top));
      const gold = await simulate(files(design), bench);
      assert.ok(gold.split('\n').length > 300, 'тестбенч выдал слишком мало тактов');
      const exported = await exportRtlVerilog(rtl);
      const actual = await simulate([{ name: 'rtl.v', content: exported }], bench);
      assert.equal(actual, gold);
    },
  );
}

// ---------------------------------------------------------------------------------------------
// Ошибки: что видит ученик, когда проект не собирается или собирается с замечаниями.

const broken = (id: string, src: string, top = 'top'): Design => ({ id: `err-${id}`, top, src });
const messages = (result: { diagnostics: { message: string }[] }) =>
  result.diagnostics.map((item) => item.message).join(' | ');

test('ошибка синтаксиса: диагностика указывает файл и строку', async () => {
  const result = await build(
    broken('syntax', 'module top(input a output y);\n assign y = a;\nendmodule'),
  );
  assert.equal(result.status, 'error');
  const error = result.diagnostics.find((item) => item.severity === 'error');
  assert.ok(error);
  assert.equal(error.file, 'top.v');
  assert.equal(error.line, 1);
});

test('неизвестный модуль и отсутствующий верхний модуль завершаются ошибкой, а не успехом', async () => {
  const unknown = await build(
    broken('unknown', 'module top(input a, output y);\n foo u(.a(a), .y(y));\nendmodule'),
  );
  assert.equal(unknown.status, 'error');
  assert.match(messages(unknown), /foo/);
  const missing = await build(
    broken('missing-top', 'module top(input a, output y); assign y = a; endmodule', 'nope'),
  );
  assert.equal(missing.status, 'error');
  assert.match(messages(missing), /nope/);
});

test('закрытый IP-блок (pragma protect) объясняется по-русски', async () => {
  const result = await build(
    broken(
      'protect',
      'module top(input a, output y);\n`pragma protect begin\n assign y = a;\nendmodule',
    ),
  );
  assert.equal(result.status, 'error');
  assert.match(result.error ?? '', /pragma protect/);
});

test('необъявленный идентификатор даёт предупреждение со строкой исходника', async () => {
  const result = await build(
    broken('undeclared', 'module top(input a, output y);\n assign y = a & nothing;\nendmodule'),
  );
  const warning = result.diagnostics.find((item) => /implicitly declared/.test(item.message));
  assert.ok(warning, messages(result));
  assert.equal(warning.line, 2);
});

test('комбинационная петля и конфликт драйверов не проходят молча', async () => {
  const loop = await build(
    broken(
      'loop',
      'module top(input a, output y);\n wire w;\n assign w = ~(w & a);\n assign y = w;\nendmodule',
    ),
  );
  assert.match(messages(loop), /logic loop/);
  const drivers = await build(
    broken(
      'drivers',
      'module top(input a, input b, output y);\n assign y = a;\n assign y = b;\nendmodule',
    ),
  );
  assert.match(messages(drivers), /conflicting drivers/);
});

test('предупреждение о защёлке (самая частая ошибка новичка) указывает файл и строку', async () => {
  const result = await build(
    broken(
      'latch',
      'module top(input en, input d, output reg q);\n always @* if (en) q = d;\nendmodule',
    ),
  );
  const warning = result.diagnostics.find((item) => /Latch inferred/.test(item.message));
  assert.ok(warning);
  assert.equal(warning.file, 'top.v');
  assert.equal(warning.line, 2);
});

test(
  'ошибка «модуль не найден» указывает, где он вызван',
  {
    todo: 'в сообщении Yosys нет «файл:строка» для ссылки на модуль; диагностика остаётся без места',
  },
  async () => {
    const result = await build(
      broken('unknown-loc', 'module top(input a, output y);\n foo u(.a(a), .y(y));\nendmodule'),
    );
    const error = result.diagnostics.find((item) => item.severity === 'error');
    assert.ok(error?.file && error.line);
  },
);

test('обычный проект без ошибок не показывает служебных предупреждений Yosys', async () => {
  const { diagnostics } = await buildOk(byId('adder8'));
  assert.deepEqual(
    diagnostics.filter((item) => item.severity === 'warning').map((item) => item.message),
    [],
  );
});
