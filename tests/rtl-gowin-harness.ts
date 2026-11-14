// Общие средства для проверки двух стадий синтеза: RTL (rtl.json) и отображения на примитивы
// Gowin (technology.json). Всё настоящее: BuildManager запускает тот же Yosys, что и сервер.
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runYosys } from '@yowasp/yosys';
import { BuildManager } from '../server/builds';
import type { BuildResult, Project, SourceFile, YosysModule, YosysNetlist } from '../shared/types';

export interface Design {
  id: string;
  top: string;
  /** Один файл top.v или несколько файлов. */
  src: string | SourceFile[];
  /** Типы ячеек, обязанные встретиться в rtl.json (по всем модулям). */
  rtl?: string[];
  /** Типы ячеек, которых в rtl.json быть не должно. */
  rtlNot?: string[];
  /** Примитивы, обязанные встретиться в technology.json (среди модулей, не являющихся библиотечными). */
  tech?: string[];
  /** Примитивы, которых быть не должно. */
  techNot?: string[];
  /** Точные числа примитивов в technology.json (по всей иерархии, с учётом экземпляров не считаем). */
  count?: Record<string, number>;
  /** Нужен ли такт: влияет на глубину проверки эквивалентности. */
  sequential?: boolean;
  /** Не проверять формально: например, внутри память или значения «x». */
  skipFormal?: string;
  /** Не сравнивать в Icarus: нет открытой поведенческой модели (DSP, PLL). */
  skipSim?: string;
}

export const toProject = (design: Design): Project => ({
  name: design.id,
  top: design.top,
  board: 'tangnano20k',
  files: typeof design.src === 'string' ? [{ name: 'top.v', content: design.src }] : design.src,
});

let shared: { manager: BuildManager; directory: string } | undefined;
async function manager() {
  if (!shared) {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'yosis-rtl-gowin-'));
    shared = { manager: new BuildManager(directory), directory };
  }
  return shared.manager;
}
export async function closeHarness() {
  if (!shared) return;
  const current = shared;
  shared = undefined;
  await current.manager.close();
  await rm(current.directory, { recursive: true, force: true });
}

const cache = new Map<string, Promise<BuildResult>>();
/** Полная сборка (RTL + Gowin) настоящим серверным конвейером. Результат кэшируется на файл тестов. */
export function build(design: Design): Promise<BuildResult> {
  let promise = cache.get(design.id);
  if (!promise) {
    promise = (async () => {
      const builds = await manager();
      let result = await builds.create(toProject(design));
      const deadline = Date.now() + 240_000;
      while (result.status === 'queued' || result.status === 'running') {
        assert.ok(Date.now() < deadline, `${design.id}: Yosys не уложился во время`);
        await new Promise((resolve) => setTimeout(resolve, 100));
        result = await builds.get(result.id);
      }
      return result;
    })();
    cache.set(design.id, promise);
  }
  return promise;
}
export async function buildOk(
  design: Design,
): Promise<Required<Pick<BuildResult, 'rtl' | 'technology'>> & BuildResult> {
  const result = await build(design);
  assert.equal(
    result.status,
    'success',
    `${design.id}: ${result.error}\n${result.logs.slice(-1500)}`,
  );
  assert.ok(result.rtl, `${design.id}: нет rtl.json`);
  assert.ok(result.technology, `${design.id}: нет technology.json`);
  return result as never;
}

export const isLibrary = (module: YosysModule | undefined) =>
  !module ||
  ['blackbox', 'whitebox', 'lib', 'library'].some((key) => {
    const value = module.attributes?.[key];
    return value !== undefined && value !== '' && /[1-9a-f]/i.test(String(value));
  });

/** Типы ячеек в модулях проекта (библиотечные модули Gowin и служебные не считаются). */
export function cellTypes(netlist: YosysNetlist): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const module of Object.values(netlist.modules)) {
    if (isLibrary(module)) continue;
    for (const cell of Object.values(module.cells))
      counts[cell.type] = (counts[cell.type] ?? 0) + 1;
  }
  return counts;
}

/** Модули нетлиста, до которых можно дойти от верхнего: в technology.json лежит ещё ~150 служебных. */
export function reachable(netlist: YosysNetlist, top: string): string[] {
  const seen = new Set<string>();
  const visit = (name: string) => {
    const module = netlist.modules[name];
    if (!module || seen.has(name)) return;
    seen.add(name);
    for (const cell of Object.values(module.cells)) visit(cell.type);
  };
  visit(top);
  return [...seen];
}
/** Типы ячеек только в достижимых от верха модулях (с учётом вложенных экземпляров не раскрываем). */
export function projectCellTypes(netlist: YosysNetlist, top: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const name of reachable(netlist, top)) {
    const module = netlist.modules[name];
    if (isLibrary(module)) continue;
    for (const cell of Object.values(module.cells))
      counts[cell.type] = (counts[cell.type] ?? 0) + 1;
  }
  return counts;
}

async function yosys(script: string, files: Record<string, string>) {
  let log = '';
  const sink = (bytes: Uint8Array | null) => {
    if (bytes) log += Buffer.from(bytes).toString();
  };
  try {
    await runYosys(['-p', script], files, { stdout: sink, stderr: sink, decodeASCII: true });
    return { ok: true, log };
  } catch (error) {
    return { ok: false, log: `${log}\n${String((error as Error).message).slice(0, 300)}` };
  }
}

/**
 * Формальная проверка: «золотой» RTL и нетлист Gowin (с ячейками, раскрытыми через
 * модели кристалла cells_sim.v) дают одинаковые выходы при любых входах. Для схем с памятью
 * регистров проверка ограничена `cycles` тактами от нулевого состояния.
 */
export async function proveEquivalent(
  rtl: YosysNetlist,
  technology: YosysNetlist,
  top: string,
  cycles = 4,
): Promise<{ ok: boolean; log: string }> {
  const script = [
    'read_json gate.json',
    'techmap -autoproc -map +/gowin/cells_sim.v',
    `hierarchy -top ${top}`,
    'flatten',
    'memory',
    'opt_clean',
    'async2sync',
    `rename ${top} gate`,
    'design -stash gate',
    'read_json gold.json',
    `hierarchy -top ${top}`,
    'flatten',
    'memory',
    'async2sync',
    `rename ${top} gold`,
    'design -stash gold',
    'design -import gold -as gold',
    'design -import gate -as gate',
    'miter -equiv -flatten -make_assert gold gate miter',
    'hierarchy -top miter',
    `sat -verify -prove-asserts -set-init-zero -seq ${cycles} miter`,
  ].join('; ');
  const result = await yosys(script, {
    'gate.json': JSON.stringify(technology),
    'gold.json': JSON.stringify(rtl),
  });
  return { ok: result.ok && /SUCCESS!/.test(result.log), log: result.log.slice(-1500) };
}

// ---------------------------------------------------------------------------------------------
// Icarus Verilog: независимый от Yosys «оракул» поведения исходного текста.
const workspace = fileURLToPath(new URL('../', import.meta.url));
const portable = path.join(workspace, '.tools/iverilog/mingw64');
const compiler =
  process.env.IVERILOG_PATH ??
  (process.platform === 'win32' ? path.join(portable, 'bin/iverilog.exe') : 'iverilog');
const runtime =
  process.env.VVP_PATH ??
  (process.platform === 'win32' ? path.join(portable, 'bin/vvp.exe') : 'vvp');
const library =
  process.env.IVERILOG_LIB ??
  (process.platform === 'win32' ? path.join(portable, 'lib/ivl') : undefined);
const iverilogEnv = { ...process.env };
const pathKey = Object.keys(iverilogEnv).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
iverilogEnv[pathKey] =
  `${path.join(portable, 'bin')}${path.delimiter}${iverilogEnv[pathKey] ?? ''}`;

export const iverilogAvailable = (() => {
  const probe = spawnSync(compiler, ['-V'], {
    env: iverilogEnv,
    windowsHide: true,
    encoding: 'utf8',
  });
  return probe.status === 0;
})();

interface PortInfo {
  name: string;
  width: number;
  direction: 'input' | 'output' | 'inout';
}
export function topPorts(rtl: YosysNetlist, top: string): PortInfo[] {
  return Object.entries(rtl.modules[top].ports).map(([name, port]) => ({
    name,
    width: port.bits.length,
    direction: port.direction,
  }));
}

/** Тестбенч со случайными входами (LFSR, повторяемо); печатает все выходы после каждого такта. */
export function testbench(top: string, ports: PortInfo[], cycles = 400): string {
  const inputs = ports.filter((port) => port.direction === 'input');
  const outputs = ports.filter((port) => port.direction === 'output');
  const clock = inputs.find((port) => /^(clk|clock|CLK)$/.test(port.name));
  const reset = inputs.find((port) => /^(rst|reset|rst_n|resetn|RST)$/i.test(port.name));
  const lines: string[] = ['`timescale 1ns/1ps', 'module tb;'];
  for (const port of inputs) lines.push(`  reg [${port.width - 1}:0] ${port.name};`);
  for (const port of outputs) lines.push(`  wire [${port.width - 1}:0] ${port.name};`);
  lines.push(
    `  ${top} dut(${ports.map((port) => `.${port.name}(${port.name})`).join(', ')});`,
    '  reg [63:0] seed; integer i;',
    '  function [63:0] next(input [63:0] s); next = {s[62:0], s[63] ^ s[62] ^ s[60] ^ s[59]}; endfunction',
    '  initial begin',
    `    seed = 64'hACE1_BEEF_1234_5678;`,
  );
  for (const port of inputs) lines.push(`    ${port.name} = 0;`);
  lines.push(`    for (i = 0; i < ${cycles}; i = i + 1) begin`);
  for (const port of inputs) {
    if (port === clock) continue;
    lines.push(
      `      seed = next(next(next(seed))); ${port.name} = seed[${port.width - 1}:0] ^ seed[63:${64 - port.width}];`,
    );
  }
  if (reset) {
    // Сброс в первые такты; затем изредка, чтобы не заглушить поведение.
    const active = /_n$|n$/i.test(reset.name) && /rst_n|resetn/i.test(reset.name) ? '0' : '1';
    const idle = active === '1' ? '0' : '1';
    lines.push(
      `      ${reset.name} = (i < 3) ? ${active} : ((i % 61 == 60) ? ${active} : ${idle});`,
    );
  }
  if (clock) lines.push(`      ${clock.name} = 0;`);
  lines.push('      #5;');
  if (clock) lines.push(`      ${clock.name} = 1;`);
  lines.push('      #5;');
  const bus = outputs.map((port) => port.name).join(', ');
  lines.push(`      if (i >= 3) $display("%0d %b", i, {${bus}});`);
  lines.push('    end', '    $finish;', '  end', 'endmodule');
  return lines.join('\n');
}

export async function simulate(files: SourceFile[], tb: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'yosis-rtl-sim-'));
  try {
    const names: string[] = [];
    for (const file of files) {
      const target = path.join(directory, file.name.replace(/\//g, '_'));
      await writeFile(target, file.content);
      names.push(target);
    }
    const bench = path.join(directory, 'tb.v');
    await writeFile(bench, tb);
    const out = path.join(directory, 'out.vvp');
    const compiled = spawnSync(
      compiler,
      [...(library ? ['-B', library] : []), '-g2012', '-s', 'tb', '-o', out, ...names, bench],
      { env: iverilogEnv, windowsHide: true, encoding: 'utf8', timeout: 60_000 },
    );
    assert.equal(compiled.status, 0, String(compiled.error ?? compiled.stderr));
    const run = spawnSync(runtime, [out], {
      env: iverilogEnv,
      windowsHide: true,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    assert.equal(run.status, 0, String(run.error ?? run.stderr));
    // Только строки с данными: сообщение $finish содержит временный путь.
    return run.stdout
      .split(/\r?\n/)
      .filter((line) => /^\d+ [01xz]+$/.test(line))
      .join('\n');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** Экспорт rtl.json обратно в Verilog тем же способом, что и сервер для симуляции. */
export async function exportRtlVerilog(rtl: YosysNetlist): Promise<string> {
  let log = '';
  const files = await runYosys(
    ['-p', 'read_json rtl.json; write_verilog -noattr design.v'],
    { 'rtl.json': JSON.stringify(rtl) },
    {
      stdout: () => {},
      stderr: (bytes) => {
        if (bytes) log += Buffer.from(bytes).toString();
      },
      decodeASCII: true,
    },
  );
  const data = files?.['design.v'];
  assert.ok(typeof data === 'string' || data instanceof Uint8Array, `нет design.v\n${log}`);
  return typeof data === 'string' ? data : new TextDecoder().decode(data);
}

// ---------------------------------------------------------------------------------------------
// Физический этап: nextpnr + упаковщик. Выводы раздаются по порядку из заведомо свободных ног
// Tang Nano 20K; такт — на ногу кварца 4.
const FREE_PINS = [
  15, 16, 17, 18, 19, 20, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 41, 42, 48, 49, 51, 52, 53,
  54, 55, 56, 57, 69, 70, 71, 72, 73, 74, 75, 76, 77, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  90, 91, 92, 93,
];
export function constraintsFor(rtl: YosysNetlist, top: string): string {
  const lines: string[] = [];
  let next = 0;
  for (const [name, port] of Object.entries(rtl.modules[top].ports)) {
    const bits = port.bits.length;
    for (let index = 0; index < bits; index++) {
      const label = bits === 1 ? name : `${name}[${port.upto ? bits - 1 - index : index}]`;
      const pin = name === 'clk' ? 4 : FREE_PINS[next++];
      assert.ok(pin !== undefined, 'не хватило ног для проверки');
      lines.push(
        `IO_LOC "${label}" ${pin};`,
        `IO_PORT "${label}" IO_TYPE=LVCMOS33 PULL_MODE=NONE;`,
      );
    }
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------------------------
// Поведенческие модели кристалла Gowin (cells_sim.v) лежат в архиве ресурсов Yosys. Читаем нужный
// файл прямо из tar: 512-байтные заголовки, имя — первые 100 байт, размер — восьмеричное поле.
import { readFile } from 'node:fs/promises';
const resources = new Map<string, Promise<string>>();
/** Файл из share-каталога Yosys, например 'gowin/cells_sim.v'. */
export function yosysResource(file: string): Promise<string> {
  let promise = resources.get(file);
  if (!promise) {
    promise = (async () => {
      const root = path.join(workspace, 'node_modules/@yowasp/yosys');
      const tar = await readFile(path.join(root, 'gen/yosys-resources.0.tar'));
      let offset = 0;
      while (offset + 512 <= tar.length) {
        const name = tar.toString('utf8', offset, offset + 100).replace(/\0.*$/s, '');
        if (!name) break;
        const field = tar
          .toString('ascii', offset + 124, offset + 136)
          .replace(/\0.*$/s, '')
          .trim();
        const size = parseInt(field || '0', 8);
        if (name === file || name.endsWith('/' + file))
          return tar.toString('utf8', offset + 512, offset + 512 + size);
        offset += 512 + Math.ceil(size / 512) * 512;
      }
      throw new Error('в архиве Yosys нет ' + file);
    })();
    resources.set(file, promise);
  }
  return promise;
}
export const gowinCellsSim = () => yosysResource('gowin/cells_sim.v');

/** Нетлист Gowin → Verilog, который можно исполнить вместе с cells_sim.v. */
export async function exportTechnologyVerilog(technology: YosysNetlist): Promise<string> {
  let log = '';
  const files = await runYosys(
    ['-p', 'read_json t.json; write_verilog -noattr gate.v'],
    { 't.json': JSON.stringify(technology) },
    {
      stdout: () => {},
      stderr: (bytes) => {
        if (bytes) log += Buffer.from(bytes).toString();
      },
      decodeASCII: true,
    },
  );
  const data = files?.['gate.v'];
  assert.ok(typeof data === 'string' || data instanceof Uint8Array, `нет gate.v\n${log}`);
  return typeof data === 'string' ? data : new TextDecoder().decode(data);
}
