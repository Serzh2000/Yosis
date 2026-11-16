// Проверка всех примеров Verilog книги в том же конвейере, что использует Logra.
//
//   node textbook/tools/check_code.mjs            -- всё (code, code-en, листинги глав tex и tex-en)
//   node textbook/tools/check_code.mjs --only blink     -- только единицы, в id которых есть «blink»
//   API=http://127.0.0.1:3001 node textbook/tools/check_code.mjs
//
// Нужно: запущенное приложение (npm run dev, API на :3001) и .tools/iverilog (npm run setup:iverilog).
// Для каждого модуля: POST /api/builds (Yosys: RTL + отображение на Gowin), ждём результат, смотрим
// статус, наличие rtl.json/technology.json, диагностики и предупреждения в журнале. Для tb_*.v:
// Icarus Verilog напрямую (iverilog -g2012 + vvp), в выводе должно быть «OK» и не должно быть «ОШИБОК»/«FAIL».
// Для «чистых» модулей без тестбенча дополнительно: POST /api/simulations с минимальным сценарием
// (проверяет, что нормализованный Yosys-ом Verilog проходит через Icarus).
// Результаты: textbook/build/codecheck/results.json и таблица в консоли. Листинги глав пишутся
// во временные файлы textbook/build/codecheck/listings/ (не в репозиторий).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.API ?? 'http://127.0.0.1:3001';
const here = path.dirname(fileURLToPath(import.meta.url));
const book = path.resolve(here, '..');
const repo = path.resolve(book, '..');
const out = path.join(book, 'build', 'codecheck');
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '';
mkdirSync(path.join(out, 'listings'), { recursive: true });

const ivBin = path.join(repo, '.tools', 'iverilog', 'mingw64', 'bin');
const ivLib = path.join(repo, '.tools', 'iverilog', 'mingw64', 'lib', 'ivl');
const exe = process.platform === 'win32' ? '.exe' : '';
const iverilog = process.env.IVERILOG_PATH ?? (existsSync(ivBin) ? path.join(ivBin, 'iverilog' + exe) : 'iverilog');
const vvp = process.env.VVP_PATH ?? (existsSync(ivBin) ? path.join(ivBin, 'vvp' + exe) : 'vvp');

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const modulesOf = (src) => {
  const code = stripComments(src);
  const names = [...code.matchAll(/\bmodule\s+([A-Za-z_]\w*)/g)].map((m) => m[1]);
  const inst = new Set();
  for (const name of names)
    for (const m of code.matchAll(new RegExp(`(?:^|;|\\))\\s*${name}\\s*(?:#\\s*\\([^;]*?\\)\\s*)?[A-Za-z_]\\w*\\s*\\(`, 'g')))
      if (!new RegExp(`\\bmodule\\s+${name}\\b`).test(m[0])) inst.add(name);
  return { names, tops: names.filter((n) => !inst.has(n)) };
};

// ---------- единицы проверки ----------
const units = [];
const skipped = [];
for (const lang of ['code', 'code-en']) {
  const root = path.join(book, lang);
  for (const dir of readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory() || dir.name === 'common') continue;
    const files = readdirSync(path.join(root, dir.name)).filter((f) => f.endsWith('.v'));
    const read = (f) => readFileSync(path.join(root, dir.name, f), 'utf8');
    const plain = files.filter((f) => !f.startsWith('tb_'));
    for (const f of files) {
      const src = read(f);
      const id = `${lang}/${dir.name}/${f}`;
      if (f.startsWith('tb_')) {
        units.push({
          id, kind: 'tb', lang,
          files: [...plain.map((p) => ({ name: p, content: read(p) })), { name: f, content: src }],
          tb: modulesOf(src).names[0],
        });
        continue;
      }
      const base = f.replace(/\.v$/, '');
      const cstFile = path.join(root, dir.name, base + '.cst');
      const cst = existsSync(cstFile) ? readFileSync(cstFile, 'utf8') : null;
      const { names, tops } = modulesOf(src);
      for (const top of new Set([...tops, ...names.filter((n) => n === base)])) {
        const useCst = cst && top === base;
        units.push({
          id: names.length > 1 ? `${id}#${top}` : id, kind: 'synth', lang, top,
          files: [{ name: f, content: src }, ...(useCst ? [{ name: base + '.cst', content: cst }] : [])],
          cst: !!useCst,
        });
      }
    }
  }
}

// Фрагменты, которые не модули, но их копируют в модуль: оборачиваем минимальным окружением.
// Ключ -- начало текста фрагмента; значение -- (текст) => исходник модуля `frag`.
const WRAPPERS = [
  [/^assign y = /, (b) => `module frag(input a, b, c, output y);\n${b}\nendmodule\n`],
  [/^wire \[7:0\] data;/, (b) => `module frag(input [7:0] data_in, output o);\nwire [7:0] data = data_in;\n${b.replace(/^wire \[7:0\] data;[^\n]*\n/, '')}\nassign o = ^{counter, bit3, low};\nendmodule\n`],
  [/^reg \[1:0\] y;/, (b) => `module frag(input [1:0] sel, a, b, c, output [1:0] q);\n${b}\nassign q = y;\nendmodule\n`],
  [/^reg \[3:0\] cnt = 0;/, (b) => `module frag(input clk, output [3:0] q);\n${b}\nassign q = cnt;\nendmodule\n`],
  [/^always @\(posedge clk\) begin\n\s+a <= b;/, (b) => `module frag(input clk, output [1:0] q);\nreg a = 0, b = 1;\n${b}\nassign q = {a, b};\nendmodule\n`],
  [/^always @\(posedge clk\) begin\n\s+a = b;/, (b) => `module frag(input clk, output [1:0] q);\nreg a = 0, b = 1;\n${b}\nassign q = {a, b};\nendmodule\n`],
  [/^always @\(posedge clk\) begin\n\s+if \(reset\)/, (b) => `module frag(input clk, reset, enable, output [3:0] q);\nreg [3:0] cnt;\n${b}\nassign q = cnt;\nendmodule\n`],
  [/^reg \[24:0\] cnt = 0;/, (b) => `module frag(input clk, output reg led);\ninitial led = 0;\n${b}\nendmodule\n`],
  [/^module top \(/, (b) => `${b}\nendmodule\n`],
];

const chapterMods = new Map(); // lang/глава -> [{name, body}] для зависимостей между листингами
for (const lang of ['tex', 'tex-en']) {
  const dir = path.join(book, lang, 'chapters');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.tex'))) {
    const text = readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
    const re = /\\begin\{vcode\}(?:\[([^\]]*)\])?\n([\s\S]*?)\\end\{vcode\}/g;
    let m;
    const blocks = [];
    while ((m = re.exec(text))) {
      blocks.push({ language: m[1] ?? 'verilog', body: m[2], line: text.slice(0, m.index).split('\n').length + 1, end: m.index + m[0].length, start: m.index });
    }
    // Склейка: блок, где module без endmodule, продолжается следующими блоками (через обычный текст) до endmodule.
    const listings = [];
    for (let i = 0; i < blocks.length; i++) {
      const bl = blocks[i];
      if (bl.language !== 'verilog') { skipped.push({ id: `${lang}/${f}:${bl.line}`, why: `язык ${bl.language}` }); continue; }
      let body = bl.body, line = `${bl.line}`;
      const open = (x) => /\bmodule\b/.test(stripComments(x)) && !/\bendmodule\b/.test(x);
      let j = i;
      while (open(body) && j + 1 < blocks.length && blocks[j + 1].language === 'verilog' && !/^module\b/m.test(blocks[j + 1].body.split('\n')[0])) {
        j++; body += blocks[j].body; line += `+${blocks[j].line}`;
      }
      if (j > i && /\bendmodule\b/.test(body)) i = j; else { body = bl.body; line = `${bl.line}`; }
      listings.push({ body, line });
    }
    const defs = [];
    for (const l of listings) if (/\bendmodule\b/.test(l.body)) for (const n of modulesOf(l.body).names) defs.push({ name: n, body: l.body, line: l.line });
    chapterMods.set(`${lang}/${f}`, defs);
    for (const l of listings) {
      const id = `${lang}/${f}:${l.line}`;
      const body = l.body;
      writeFileSync(path.join(out, 'listings', `${lang}_${f.replace('.tex', '')}_${l.line.replace('+', '_')}.v`), body);
      const code = stripComments(body);
      if (/\.\.\.\s*[;)]/.test(code)) { skipped.push({ id, why: 'шаблон/псевдокод с «...» (не предназначен для синтеза)', head: body.trim().split('\n')[0].slice(0, 70) }); continue; }
      if (!/\bendmodule\b/.test(body) || !/\bmodule\b/.test(code)) {
        const w = WRAPPERS.find(([re2]) => re2.test(body.trim()));
        if (!w) { skipped.push({ id, why: 'фрагмент, не модуль', head: body.trim().split('\n')[0].slice(0, 70) }); continue; }
        const wrapped = w[1](body.trim());
        units.push({ id: `${id} (в обёртке)`, kind: 'synth', lang: 'chapter', top: /^module\s+(\w+)/.exec(wrapped)[1], files: [{ name: 'listing.v', content: wrapped }] });
        continue;
      }
      const { names, tops } = modulesOf(body);
      if (names.length === 1 && /^tb_|_tb$/.test(names[0])) { skipped.push({ id, why: 'тестбенч в тексте', head: names[0] }); continue; }
      for (const top of tops.length ? tops : [names[0]]) {
        const own = new Set(names);
        const extra = (defs.filter((d) => !own.has(d.name) && d.line !== l.line));
        const files = [{ name: 'listing.v', content: body }];
        const seen = new Set();
        for (const d of extra) if (!seen.has(d.line) && new RegExp(`\\b${d.name}\\b`).test(code)) { seen.add(d.line); files.push({ name: `dep_${d.line.replace('+', '_')}.v`, content: d.body }); }
        units.push({ id: names.length > 1 ? `${id}#${top}` : id, kind: 'synth', lang: 'chapter', top, files });
      }
    }
  }
}

// Однострочники из \code{...} в тексте глав (русские и английские совпадают по коду): каждый в минимальном модуле
// с портами, которые перечислены в самом тексте главы.
const INLINE = {
  'board: assign led = ~value': 'module t(input [5:0] value, output [5:0] led); assign led = ~value; endmodule',
  'board: wire pressed = ~btn[0]': 'module t(input [1:0] btn, output y); wire pressed = ~btn[0]; assign y = pressed; endmodule',
  'logic: alarm': 'module t(input door, night, armed, output alarm); assign alarm = door & (night | armed); endmodule',
  'adder: {co,s}=a+b+ci': 'module t(input [3:0] a, b, input ci, output [3:0] s, output co); assign {co, s} = a + b + ci; endmodule',
  'compare: loud': 'module t(input [3:0] noise, output loud); assign loud = noise > 4\'d9; endmodule',
  'decoder: en ? 4\'d1<<a': 'module t(input en, input [1:0] a, output [3:0] y); assign y = en ? (4\'d1 << a) : 4\'d0; endmodule',
  'dff: q <= d': 'module t(input clk, d, output reg q); always @(posedge clk) q <= d; endmodule',
  'counter: q <= q + 1': 'module t(input clk, output reg [3:0] q); initial q = 0; always @(posedge clk) q <= q + 1; endmodule',
  'counter: en && q != 15': 'module t(input clk, en, output reg [3:0] q); initial q = 0; always @(posedge clk) if (en && q != 4\'d15) q <= q + 4\'d1; endmodule',
  'sr: mem': 'module t(input clk, key, trig, output reg mem); initial mem = 0; always @(posedge clk) if (key) mem <= 1\'b0; else if (trig) mem <= 1\'b1; endmodule',
  'sub: {bo,d}': 'module t(input [3:0] a, b, output [3:0] d, output bo); assign {bo, d} = {1\'b0, a} - {1\'b0, b}; endmodule',
  'mux: y = d[s]': 'module t(input [3:0] d, input [1:0] s, output y); assign y = d[s]; endmodule',
  'mux: y = s ? b : a': 'module t(input a, b, s, output y); assign y = s ? b : a; endmodule',
  'tristate: pin = oe ? d : 1\'bz': 'module t(input oe, d, inout pin); assign pin = oe ? d : 1\'bz; endmodule',
  'sdram: {ba,row,col}=addr': 'module t(input [20:0] addr, output [1:0] ba, output [10:0] row, output [7:0] col); assign {ba, row, col} = addr; endmodule',
  'sdram: reg [7:0] mem [0:15]': 'module t(input clk, we, input [3:0] a, input [7:0] d, output reg [7:0] q); reg [7:0] mem [0:15]; always @(posedge clk) begin if (we) mem[a] <= d; q <= mem[a]; end endmodule',
  'cpu: 4\'d10 jnz': 'module t(input clk, input [3:0] op, input [7:0] acc, arg, output reg [7:0] pc); initial pc = 0; always @(posedge clk) case (op) 4\'d10: if (acc != 8\'d0) pc <= arg; default: pc <= pc + 8\'d1; endcase endmodule',
  'async reset: or posedge rst': 'module t(input clk, rst, d, output reg q); always @(posedge clk or posedge rst) if (rst) q <= 0; else q <= d; endmodule',
  'slow_clk divider (a2_answers/07a)': 'module t(input clk, output reg led); reg en = 0; initial led = 0; always @(posedge clk) en <= ~en; always @(posedge clk) if (en) led <= ~led; endmodule',
};
for (const [name, src] of Object.entries(INLINE))
  units.push({ id: `inline: ${name}`, kind: 'synth', lang: 'inline', top: 't', files: [{ name: 'listing.v', content: src + '\n' }] });

// ---------- запуск ----------
async function api(url, init) {
  let r;
  for (let attempt = 0; ; attempt++) {
    try { r = await fetch(API + url, init); break; }
    catch (e) { if (attempt > 5) throw e; await new Promise((x) => setTimeout(x, 2000)); } // сервер могли перезапустить
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${url}: ${r.status} ${body.error ?? ''}`);
  return body;
}
async function job(kind, payload) {
  let result;
  // 429 «Очередь заполнена»: у сервера лимит на число заданий пользователя; ждём и повторяем.
  for (let attempt = 0; ; attempt++) {
    try {
      result = await api(`/api/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      break;
    } catch (e) {
      if (!String(e.message).includes(': 429') || attempt > 120) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  const t0 = Date.now();
  while (result.status === 'queued' || result.status === 'running') {
    if (Date.now() - t0 > 900000) throw new Error('таймаут');
    await new Promise((r) => setTimeout(r, 150));
    result = await api(`/api/${kind}/${result.id}`);
  }
  return result;
}
const warnLines = (logs) =>
  [...new Set((logs ?? '').split('\n').filter((l) => /warning/i.test(l)).map((l) => l.trim()))].slice(0, 6);

async function checkSynth(u) {
  const res = { id: u.id, top: u.top };
  const project = { name: 'codecheck', top: u.top, board: 'tangnano20k', files: u.files };
  const b = await job('builds', { project });
  const errs = (b.diagnostics ?? []).filter((d) => d.severity === 'error');
  const warns = (b.diagnostics ?? []).filter((d) => d.severity === 'warning');
  res.rtl = b.status === 'success' && b.rtl && b.rtl.modules?.[u.top] ? 'OK' : `FAIL (${b.status}: ${b.error ?? ''})`;
  res.gowin = b.technology ? 'OK' : b.status === 'success' ? 'нет technology.json' : '-';
  res.errors = errs.map((d) => `${d.file ?? ''}:${d.line ?? ''} ${d.message}`);
  // Предупреждения, которые Logra показывает ученику (диагностики), и шум журнала Yosys, который она скрывает.
  res.warnings = warns.map((d) => `${d.file ?? ''}:${d.line ?? ''} ${d.message}`);
  res.logNoise = warnLines(b.logs).filter((l) => !warns.some((d) => l.includes(d.message)) && !/\/share\/|network is combinational|Selection "top"|No modules selected/.test(l));
  // Проверка набора текста в редакторе (то же, что Logra делает при вводе).
  try {
    let sx;
    for (let attempt = 0; attempt < 4; attempt++) {
      sx = await api('/api/syntax', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ project }) });
      if (!/заменена новым/.test(sx.error ?? JSON.stringify(sx.diagnostics))) break; // проверку вытеснил другой запрос
      await new Promise((x) => setTimeout(x, 1500));
    }
    const sxErr = (sx.diagnostics ?? []).filter((d) => d.severity === 'error');
    res.syntax = sxErr.length || sx.error ? `FAIL (${sxErr.map((d) => d.message).join('; ') || sx.error})` : 'OK';
  } catch (e) { res.syntax = `FAIL (${e.message})`; }
  if (res.syntax.startsWith('FAIL')) res.errors.push('syntax: ' + res.syntax);
  res.logTail = b.status === 'success' ? '' : (b.logs ?? '').slice(-1200);
  if (b.status === 'success' && u.cst) {
    // Проекты с .cst: размещение и трассировка (nextpnr) тем же API, что вкладка «Выводы»/«Кристалл».
    try {
      const p = await job('physical', { project, buildId: b.id, config: { cstFile: u.files.find((f) => f.name.endsWith('.cst')).name, frequencyMHz: 27 } });
      res.pnr = p.status === 'success' ? 'OK' : `FAIL (${p.error ?? p.status})`;
      if (p.status !== 'success') res.logTail += (p.logs ?? '').slice(-600);
    } catch (e) { res.pnr = `FAIL (${e.message})`; }
    if (res.pnr.startsWith('FAIL')) res.errors.push('pnr: ' + res.pnr);
  }
  if (b.status === 'success' && !u.cst) {
    // Минимальная симуляция нормализованного RTL: только для проектов, где есть вход/выход.
    const ports = b.rtl.modules[u.top].ports ?? {};
    const inputs = Object.keys(ports).filter((p) => ports[p].direction === 'input');
    const clock = inputs.find((p) => /^(clk|clock|sys_clk|clk_in|wclk)/i.test(p)) ?? null;
    const reset = inputs.find((p) => /^(rst|reset|rst_n|rstn|nrst)/i.test(p)) ?? null;
    const has = (p) => ports[p].direction === 'inout';
    if (!Object.keys(ports).some(has)) {
      const config = {
        clock, reset, resetActiveLow: reset ? /n$|_n$|^n/i.test(reset) : false, resetCycles: 2, cycles: 8, periodNs: 10,
        inputs: Object.fromEntries(inputs.filter((p) => p !== clock && p !== reset).map((p) => [p, '0'])),
      };
      try {
        const s = await job('simulations', { project, config });
        res.sim = s.status === 'success' ? 'OK' : `FAIL (${s.error ?? s.status})`;
        if (s.status !== 'success') res.logTail += (s.logs ?? '').slice(-600);
      } catch (e) { res.sim = `FAIL (${e.message})`; }
    } else res.sim = 'пропуск (inout)';
  } else res.sim = '-';
  return res;
}
function checkTb(u) {
  const dir = path.join(out, 'tb', u.id.replace(/[\\/:#]/g, '_'));
  mkdirSync(dir, { recursive: true });
  for (const f of u.files) writeFileSync(path.join(dir, f.name), f.content);
  const env = { ...process.env, PATH: `${ivBin}${path.delimiter}${process.env.PATH}` };
  const lib = existsSync(ivLib) ? ['-B', ivLib] : [];
  const c = spawnSync(iverilog, [...lib, '-g2012', '-s', u.tb, '-o', 'sim.vvp', ...u.files.map((f) => f.name)], { cwd: dir, env, encoding: 'utf8' });
  const res = { id: u.id, top: u.tb, rtl: '-', gowin: '-' };
  if (c.status !== 0) return { ...res, sim: `FAIL (iverilog)`, errors: [(c.stderr + c.stdout).trim().slice(0, 600)], warnings: [] };
  const r = spawnSync(vvp, [...(existsSync(ivLib) ? ['-M', ivLib] : []), 'sim.vvp'], { cwd: dir, env, encoding: 'utf8', timeout: 120000 });
  const text = (r.stdout ?? '') + (r.stderr ?? '');
  const ok = r.status === 0 && /\bOK\b/.test(text) && !/ОШИБОК|FAIL|ERROR/i.test(text);
  const gates = u.id.endsWith('tb_gates.v') || u.id.endsWith('tb_blink.v'); // эти печатают таблицу/ничего
  return { ...res, sim: ok || (gates && r.status === 0) ? 'OK' : 'FAIL', errors: [], warnings: [], simOut: text.trim().split('\n').slice(-3).join(' | ') };
}

const onlyRe = only ? new RegExp(only) : null; // --only принимает регулярное выражение
const todo = units.filter((u) => !onlyRe || onlyRe.test(u.id));
const results = [];
let next = 0;
async function worker() {
  while (next < todo.length) {
    const u = todo[next++];
    try { results.push(u.kind === 'tb' ? checkTb(u) : await checkSynth(u)); }
    catch (e) { results.push({ id: u.id, top: u.top, rtl: `FAIL (${e.message})`, errors: [e.message], warnings: [] }); }
  }
}
await Promise.all([worker(), worker()]);
results.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(path.join(out, only ? `results-${only.replace(/[^\w.-]/g, '_')}.json` : 'results.json'), JSON.stringify({ results, skipped }, null, 1));
let bad = 0;
for (const r of results) {
  const fail = String(r.rtl).startsWith('FAIL') || String(r.sim ?? '').startsWith('FAIL') || (r.errors ?? []).length;
  if (fail) bad++;
  console.log(`${fail ? 'FAIL' : 'ok  '} ${r.id.padEnd(60)} rtl=${r.rtl} gowin=${r.gowin} syntax=${r.syntax ?? "-"} pnr=${r.pnr ?? "-"} sim=${r.sim}${r.simOut ? ' [' + r.simOut + ']' : ''}`);
  for (const e of r.errors ?? []) console.log('       E:', e.replace(/\n/g, ' ').slice(0, 300));
  for (const w of r.warnings ?? []) console.log('       W:', w.slice(0, 300));
  for (const w of r.logNoise ?? []) console.log('       log:', w.slice(0, 300));
}
console.log(`\nПроверено: ${results.length}, с ошибками: ${bad}, пропущено фрагментов: ${skipped.length}`);
for (const s of skipped) console.log('  skip', s.id, '-', s.why, s.head ?? '');
process.exit(bad ? 1 : 0);
