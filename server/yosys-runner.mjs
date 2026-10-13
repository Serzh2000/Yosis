// @ts-check
// Keep the WASM runtime in a separate process so cancellation also interrupts
// synchronous synthesis and cannot block the HTTP server event loop.
import { TextDecoder, stripVTControlCharacters } from 'node:util';
import { compatibleProject, readCommand } from './verilog-compat.mjs';
import { createWorkerChannel, loadYosys } from './worker-ipc.mjs';

/**
 * @typedef {import('../shared/worker-protocol').YosysRequest} YosysRequest
 * @typedef {import('../shared/types').Project} Project
 * @typedef {import('../shared/types').YosysNetlist} YosysNetlist
 * @typedef {import('./worker-ipc.mjs').Tree} Tree
 */
const channel =
  /** @type {ReturnType<typeof createWorkerChannel<import('../shared/worker-protocol').YosysWorkerMessage>>} */ (
    createWorkerChannel()
  );
const { send, disconnect } = channel;
let buffer = '';
let loggedBytes = 0;
const decoder = new TextDecoder();
function flush() {
  if (buffer) {
    send({ type: 'log', text: stripVTControlCharacters(buffer) });
    buffer = '';
  }
}
function output(/** @type {Uint8Array | null} */ bytes) {
  if (!bytes) {
    flush();
    return;
  }
  const text = decoder.decode(bytes, { stream: true });
  loggedBytes += Buffer.byteLength(text);
  if (loggedBytes > 4 * 1024 * 1024) throw new Error('Журнал синтеза превышает лимит 4 МБ.');
  buffer += text;
  if (buffer.length >= 4096 || text.includes('ERROR:')) flush();
}
const options = { stdout: output, stderr: output, decodeASCII: true, fetchProgress: () => {} };
function textFile(/** @type {Tree} */ files, /** @type {string} */ name) {
  const data = files[name];
  if (!(typeof data === 'string' || data instanceof Uint8Array))
    throw new Error(`Yosys не создал ${name}.`);
  const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
  if (text.length > 64 * 1024 * 1024)
    throw new Error('Нетлист превышает лимит 64 МБ. Уменьшите размер проекта.');
  const result = JSON.parse(text);
  if (!result.modules || typeof result.modules !== 'object')
    throw new Error(`Некорректный нетлист ${name}.`);
  return result;
}
function virtualSources(/** @type {Project} */ project) {
  const result = Object.create(null);
  for (const file of project.files) {
    const components = file.name.split('/');
    const name = /** @type {string} */ (components.pop());
    let directory = result;
    for (const component of components) {
      directory[component] ??= Object.create(null);
      directory = directory[component];
    }
    directory[name] = file.content;
  }
  return result;
}

// A spare worker is started before any job exists. It loads Yosys and runs a small design
// through the same passes, so V8 has already optimised the hot WebAssembly code when the
// real project arrives. Nothing from the warm-up reaches the job's log.
const WARMUP = `module warm(input clk, input rst, input [7:0] a, input [7:0] b, output reg [7:0] q);
  reg [15:0] count;
  reg [1:0] state;
  always @(posedge clk)
    if (rst) begin count <= 0; state <= 0; q <= 0; end
    else begin
      count <= count + 1;
      case (state)
        0: if (count[3]) state <= 1;
        1: begin q <= a + b; state <= 2; end
        2: begin q <= {q[6:0], q[7]} ^ a; state <= 3; end
        default: begin q <= (a > b) ? a - b : b - a; state <= 0; end
      endcase
    end
endmodule`;
async function warmUp() {
  const runYosys = await loadYosys();
  const quiet = { stdout: () => {}, stderr: () => {}, decodeASCII: true, fetchProgress: () => {} };
  const rtl = await runYosys(
    ['-T', '-p', 'read_verilog warm.v; hierarchy -check -top warm; proc; opt; write_json rtl.json'],
    { 'warm.v': WARMUP },
    quiet,
  );
  await runYosys(
    [
      '-T',
      '-p',
      'read_json rtl.json; synth_gowin -family gw2a -noflatten -noiopads -top warm; write_json technology.json',
    ],
    { 'rtl.json': rtl['rtl.json'] },
    quiet,
  );
}

// The laboratory simulates the design in the browser, so it needs nothing but two-input
// gates and plain rising-edge flip-flops. Numbers keep the message small.
/** @type {Record<string, number>} */
const LAB_OPS = {
  $_NOT_: 0,
  $_AND_: 1,
  $_NAND_: 2,
  $_OR_: 3,
  $_NOR_: 4,
  $_XOR_: 5,
  $_XNOR_: 6,
  $_ANDNOT_: 7,
  $_ORNOT_: 8,
  $_MUX_: 9,
  $_BUF_: 10,
};
// A tri-state buffer on a top-level pad: Y = E ? A : whatever the outside world drives.
const LAB_TRI = 11;
function labDesign(/** @type {YosysNetlist} */ netlist, /** @type {string} */ top) {
  const module = netlist.modules?.[top];
  if (!module) throw new Error(`Модуль ${top} не найден после подготовки.`);
  let nets = 2;
  const net = (/** @type {number | string} */ bit) => {
    if (typeof bit !== 'number') return bit === '1' ? 1 : 0;
    if (bit + 1 > nets) nets = bit + 1;
    return bit;
  };
  const init = new Map();
  for (const name of Object.values(module.netnames ?? {})) {
    const value = name.attributes?.init;
    if (typeof value !== 'string') continue;
    // Yosys writes the initial value most significant bit first.
    name.bits.forEach((bit, index) => {
      const digit = value[value.length - 1 - index];
      if (typeof bit === 'number' && (digit === '0' || digit === '1')) init.set(bit, Number(digit));
    });
  }
  const padBits = new Set(
    Object.values(module.ports ?? {})
      .filter((port) => port.direction !== 'input')
      .flatMap((port) => port.bits.filter((bit) => typeof bit === 'number')),
  );
  const gates = [];
  const dffs = [];
  for (const cell of Object.values(module.cells ?? {})) {
    const pin = (/** @type {string} */ name) => net(cell.connections[name]?.[0]);
    if (cell.type === '$_DFF_P_') dffs.push(pin('C'), pin('D'), pin('Q'), init.get(pin('Q')) ?? 0);
    else if (cell.type in LAB_OPS)
      gates.push(LAB_OPS[cell.type], pin('A'), pin('B'), pin('S'), pin('Y'));
    else if (/DLATCH|\$_SR_|\$dlatch/.test(cell.type))
      throw new Error(
        'В схеме есть защёлка (latch). Лаборатория работает только с регистрами по фронту: допишите else или значение по умолчанию в always.',
      );
    else if (cell.type === '$_TBUF_') {
      const pad = pin('Y');
      if (!padBits.has(pad))
        throw new Error(
          'Третье состояние (z) в лаборатории работает только на выводах верхнего модуля (inout). Внутренние шины с z замените мультиплексором.',
        );
      gates.push(LAB_TRI, pin('A'), pin('E'), 0, pad);
    } else if (/tribuf|TBUF/.test(cell.type))
      throw new Error('Выводы с третьим состоянием (z) в лаборатории пока не поддерживаются.');
    else if (!cell.type.startsWith('$'))
      throw new Error(
        `В схеме есть готовый блок кристалла Gowin (${cell.type}). Лаборатория моделирует только обычную логику и триггеры: такой проект проверяйте синтезом и на плате.`,
      );
    else throw new Error(`Элемент ${cell.type} не поддерживается лабораторией.`);
  }
  if (gates.length / 5 > 250000)
    throw new Error('Схема слишком велика для лаборатории: больше 250 000 вентилей.');
  const ports = Object.entries(module.ports ?? {}).map(([name, port]) => ({
    name,
    direction: port.direction,
    bits: port.bits.map(net),
    offset: port.offset ?? 0,
    upto: !!port.upto,
  }));
  return { top, nets, ports, gates, dffs };
}

// Projects made for the vendor's tools instantiate Gowin primitives (rPLL, CLKDIV, OSER10…)
// directly. Yosys ships their declarations: read as a library they let such a project pass the
// hierarchy check, and `-purge_lib` drops the ones the project does not use.
const GOWIN_LIBRARY = 'read_verilog -lib +/gowin/cells_sim.v +/gowin/cells_xtra_gw2a.v';

let warming = Promise.resolve();
process.on('message', (/** @type {YosysRequest} */ request) => {
  if (request?.warm) {
    // A failed warm-up only costs speed; the job itself reports real errors.
    warming = warmUp().then(
      () => send({ type: 'warm' }),
      () => {},
    );
    return;
  }
  void warming.then(() => handle(request));
});

async function handle(/** @type {YosysRequest} */ request) {
  try {
    send({ type: 'stage', stage: 'Загрузка Yosys WebAssembly' });
    const runYosys = await loadYosys();
    if (request.probe) {
      await runYosys(['-V'], {}, options);
      flush();
      send({ type: 'probe-success' });
      await disconnect();
      return;
    }
    const project = compatibleProject(/** @type {Project} */ (request.project), (text) =>
      send({ type: 'log', text }),
    );
    // Vendor IP is often shipped encrypted. No open tool can read it, and Yosys reports only
    // an unknown directive: say what the matter is.
    const sealed = project.files.find((file) => /`pragma\s+protect/.test(file.content));
    if (sealed)
      throw new Error(
        `Файл ${sealed.name} зашифрован производителем (pragma protect). Это закрытый IP-блок Gowin: открытые инструменты его прочитать не могут, такой проект собирается только в Gowin EDA.`,
      );
    const files = virtualSources(project);
    const sourceCommands = project.files
      .filter((file) => /\.(v|sv)$/.test(file.name))
      .map((file) => readCommand(project, file));
    if (request.lab) {
      files['lab.ys'] = [
        GOWIN_LIBRARY,
        ...sourceCommands,
        `hierarchy -check -top ${project.top} -purge_lib`,
        'proc',
        // Keep tri-state drivers of top-level pads; everything inside becomes plain logic.
        'tribuf -logic',
        `synth -flatten -noabc -top ${project.top}`,
        'async2sync',
        'dfflegalize -cell $_DFF_P_ 01',
        'abc -g AND,NAND,OR,NOR,XOR,XNOR,ANDNOT,ORNOT,MUX',
        'opt_clean -purge',
        'write_json lab.json',
      ].join('\n');
      send({ type: 'stage', stage: 'Подготовка схемы для лаборатории' });
      const labFiles = await runYosys(['-q', '-T', '-s', 'lab.ys'], files, options);
      flush();
      send({ type: 'lab', design: labDesign(textFile(labFiles, 'lab.json'), project.top) });
      send({ type: 'success' });
      await disconnect();
      return;
    }
    files['rtl.ys'] = [
      GOWIN_LIBRARY,
      ...sourceCommands,
      `hierarchy -check -top ${project.top} -purge_lib`,
      'proc',
      'opt',
      'write_json rtl.json',
    ].join('\n');
    send({ type: 'stage', stage: 'Синтез RTL' });
    const rtlFiles = await runYosys(['-T', '-s', 'rtl.ys'], files, options);
    const rtl = textFile(rtlFiles, 'rtl.json');
    flush();
    send({ type: 'netlist', name: 'rtl', netlist: rtl });
    if (request.prepareSimulation) {
      const exported = await runYosys(
        ['-T', '-p', 'read_json rtl.json; write_verilog -noattr design.v'],
        { 'rtl.json': rtlFiles['rtl.json'] },
        options,
      );
      const data = exported['design.v'];
      if (!(typeof data === 'string' || data instanceof Uint8Array))
        throw new Error('Не удалось экспортировать RTL для симуляции.');
      flush();
      send({
        type: 'simulation-design',
        ports: rtl.modules[project.top].ports,
        modules: Object.keys(rtl.modules),
        design: typeof data === 'string' ? data : new TextDecoder().decode(data),
      });
      send({ type: 'success' });
      await disconnect();
      return;
    }
    send({ type: 'stage', stage: 'Отображение на примитивы Gowin' });
    // Mapping pads during a hierarchy-preserving synthesis would add package
    // buffers to every submodule. Only the actual top-level ports face pins.
    const technologyScript = [
      'read_json rtl.json',
      `synth_gowin -family gw2a -noflatten -noiopads -top ${project.top}`,
      `iopadmap -bits -inpad IBUF O:I -outpad OBUF I:O -toutpad TBUF ~OEN:I:O -tinoutpad IOBUF ~OEN:O:I:IO ${project.top}`,
      'check -noinit',
      'write_json technology.json',
    ].join('; ');
    const technologyFiles = await runYosys(
      ['-T', '-p', technologyScript],
      {
        'rtl.json': rtlFiles['rtl.json'],
      },
      options,
    );
    const technology = textFile(technologyFiles, 'technology.json');
    flush();
    send({ type: 'netlist', name: 'technology', netlist: technology });
    send({ type: 'success' });
    await disconnect();
  } catch (error) {
    flush();
    // This build of Yosys overflows its stack instead of reporting some unsupported
    // constructs; real numbers in constant expressions are the usual cause.
    const failure = /** @type {Error | undefined} */ (error);
    const crashed = /Maximum call stack size exceeded/.test(failure?.message ?? '');
    send({
      type: 'failure',
      error: crashed
        ? 'Yosys аварийно остановился на этой схеме. Частая причина — вещественные числа в выражениях (например, 0.85): синтез их не поддерживает. Замените их целыми: вместо N * 0.85 пишите N * 85 / 100.'
        : failure?.message || String(error),
    });
    // A cancelled parent can close IPC while WASM is still producing logs.
    // Its delivery error is already handled by the send callback.
    try {
      await disconnect();
    } catch {
      /* Parent no longer receives results. */
    }
    process.exitCode = 1;
  }
}
