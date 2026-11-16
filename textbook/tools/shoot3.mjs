// Снимки для расширенных глав (коды, шины, автоматы, АЦП, UART, процессор, тактирование).
// Запуск: node tools/shoot3.mjs [имя_снимка ...]
import { readFileSync } from 'node:fs';
import { open, newProject, synth, tab, shot, shotEl, rtlShot, waveStyle, T, LANG, OUT } from './lib.mjs';
const en = LANG === 'en';

const only = process.argv.slice(2);
const code = (d, f) => readFileSync(new URL(`../code/${d}/${f}`, import.meta.url), 'utf8');
const { b, page } = await open(1100, 760, 3);

async function rtl(name) { await rtlShot(page, name); }
async function openScenario() {
  await tab(page, T.waves);
  await page.getByRole('button', { name: T.scenario }).click();
}
async function runTab(cycles) {
  await page.getByRole('tab', { name: T.tabRun }).click();
  const field = page.locator('label').filter({ hasText: T.cycles }).locator('input');
  await field.fill(String(cycles));
  await field.press('Tab');
  console.log('cycles field value', await field.inputValue(), 'max', await field.getAttribute('max'));
}
async function inputs(values) {
  await page.getByRole('tab', { name: T.tabInputs }).click();
  for (const [name, value] of Object.entries(values)) {
    const row = page.locator('[role=tabpanel] >> text=' + name).first();
    const input = row.locator('xpath=ancestor::*[.//input][1]').locator('input').first();
    await input.fill(String(value));
  }
}
async function events(rows) {
  await page.getByRole('tab', { name: T.tabEvents }).click();
  let n = 0;
  for (const [period, values] of rows) {
    n += 1;
    await page.getByRole('button', { name: T.addStep }).click();
    await page.getByLabel(T.stepPeriod(n), { exact: true }).fill(String(period));
    for (const [sig, v] of Object.entries(values))
      await page.getByLabel(T.stepSig(sig, n), { exact: true }).fill(String(v));
  }
}
async function hideInternals() {
  for (let k = 0; k < 30; k++) {
    const btn = page.locator('button[aria-label]');
    const labels = await btn.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const i = labels.findIndex((l) => T.hide.test(l ?? '') && /\._/.test(l ?? ''));
    if (i < 0) break;
    await btn.nth(i).click();
    await page.waitForTimeout(150);
  }
}
async function onlySignals(names) {
  await page.getByRole('button', { name: T.signals }).click();
  await page.getByRole('button', { name: T.hideAll }).click();
  for (const n of names) {
    const item = page.locator('label[title]').and(page.getByTitle(new RegExp(String.raw`dut\.${n}(\[|$)`))).first();
    const box = item.locator('input[type=checkbox]');
    if (!(await box.isChecked())) await box.evaluate((el) => el.click());
  }
  await page.getByRole('button', { name: T.closePicker }).click({ force: true });
  await page.waitForTimeout(500);
}
async function waveShot(name, signals) {
  await waveStyle(page);
  await page.getByRole('button', { name: T.close }).first().click().catch(() => {});
  await page.getByRole('button', { name: T.simulate, exact: true }).click();
  await page.locator('.waveform-track-svg').first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(1200);
  if (signals) await onlySignals(signals); else await hideInternals();
  await page.getByRole('button', { name: T.fullRange }).click();
  await page.waitForTimeout(500);
  const rows = page.locator('.waveform-track-svg');
  const last = await rows.nth((await rows.count()) - 1).boundingBox();
  const top = await page.locator('.waveform-viewer').first().boundingBox();
  await page.mouse.move(5, 745);
  await page.waitForTimeout(300);
  await shot(page, name, { clip: { x: top.x, y: top.y, width: top.width, height: last.y + last.height + 8 - top.y } });
}
async function project(name, top, dir, file) {
  await newProject(page, name, top, code(dir, file));
  await synth(page);
}

const jobs = {
  async hamming() {
    await project('Код Хэмминга', 'hamming74', '00_theory', 'hamming74.v');
  },
  async iopad() {
    await project('Ножка с тремя состояниями', 'io_pad', '00_theory', 'io_pad.v');
    await rtl('n-iopad-rtl');
  },
  async vending() {
    await project('Автомат по продаже', 'vending', '00_theory', 'vending.v');
    await openScenario();
    await events([
      [3, { c5: 1 }], [4, { c5: 0 }], [5, { c5: 1 }], [6, { c5: 0 }], [7, { c5: 1 }], [8, { c5: 0 }],
      [10, { c10: 1 }], [11, { c10: 0 }], [12, { c5: 1 }], [13, { c5: 0 }],
      [15, { c5: 1 }], [16, { c5: 0 }], [17, { c10: 1 }], [18, { c10: 0 }],
    ]);
    await runTab(22);
    await waveShot('n-vend-wave', ['clk', 'c5', 'c10', 'state', 'vend']);
  },
  async fifo() {
    await project('Очередь FIFO', 'fifo8', '00_theory', 'fifo8.v');
    await openScenario();
    await events([
      [3, { wr: 1, din: 11 }], [4, { din: 22 }], [5, { din: 33 }], [6, { wr: 0, rd: 1 }],
      [9, { rd: 0 }],
    ]);
    await runTab(12);
    await waveShot('n-fifo-wave', ['clk', 'wr', 'rd', 'din', 'dout', 'count', 'empty', 'full']);
  },
  async sar() {
    await project('АЦП последовательного приближения', 'sar_demo', '00_theory', 'sar_adc.v');
    await rtl('n-sar-rtl');
    await openScenario();
    await events([[3, { start: 1 }], [4, { start: 0 }]]);
    await runTab(16);
    await waveShot('n-sar-wave', ['clk', 'start', 'cmp', 'dac', 'result', 'done']);
  },
  async pwm() {
    await project('ШИМ как ЦАП', 'pwm_dac', '00_theory', 'pwm_dac.v');
    await openScenario();
    await inputs({ level: 64 });
    await runTab(300);
    await waveShot('n-pwm-wave', ['cnt', 'level', 'pwm']);
  },
  async uart() {
    await project('UART', 'uart_demo', '08_uart', 'uart.v');
    await rtl('n-uart-rtl');
    await openScenario();
    await runTab(200);
    await waveShot('n-uart-wave', ['clk', 'tx', 'rx_valid', 'rx_data']);
  },
  async cpu() {
    await project('Процессор', 'tiny_cpu', '09_cpu', 'tiny_cpu.v');
    await rtl('n-cpu-rtl');
    await openScenario();
    await runTab(140);
    await waveShot('n-cpu-wave', ['clk', 'pc', 'ir', 'acc', 'out']);
  },
  async sync() {
    await project('Синхронизатор и дребезг', 'debounce', '10_clocks', 'sync2ff.v');
    await rtl('n-sync-rtl');
    await openScenario();
    await events([
      [4, { in: 1 }], [5, { in: 0 }], [6, { in: 1 }], [7, { in: 0 }], [8, { in: 1 }], [20, { in: 0 }],
    ]);
    await runTab(36);
    await waveShot('n-debounce-wave', ['clk', 'in', 's', 'out']);
  },
};

for (const [name, fn] of Object.entries(jobs)) {
  if (only.length && !only.includes(name)) continue;
  try {
    await fn();
    console.log('ok', name);
  } catch (e) {
    await page.screenshot({ path: OUT + '/_fail.png' });
    console.log('FAIL', name, String(e.message).split('\n')[0]);
  }
}
await b.close();
