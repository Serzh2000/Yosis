// Снимки интерфейса Yosis для учебника. Запуск: node tools/shoot.mjs [tour|bridge]
// Нужен запущенный Yosis (npm run dev) на http://127.0.0.1:5173
import { readFileSync } from 'node:fs';
import { open, newProject, synth, tab, shot, shotEl } from './lib.mjs';

const src = (f) => readFileSync(new URL(`../code/00_theory/${f}`, import.meta.url), 'utf8');
const which = process.argv[2] ?? 'all';
const tourMode = (process.argv[2] ?? 'all') === 'tour';
const { b, page } = tourMode ? await open(1400, 860, 2) : await open();

async function waveShot(name, extra = {}) {
  await page.waitForTimeout(800);
  const rows = page.locator('.waveform-track-svg');
  const n = await rows.count();
  const last = await rows.nth(n - 1).boundingBox();
  const top = (await page.locator('.waveform-viewer').first().boundingBox());
  await shot(page, name, { clip: { x: top.x, y: top.y, width: top.width, height: last.y + last.height + 8 - top.y }, ...extra });
}
async function hideInternals() {
  // скрыть служебные сигналы _0_, _1_ ...
  for (let k = 0; k < 20; k++) {
    const btn = page.locator('button[aria-label*="крыть"]').filter({ hasNot: page.locator('x') });
    const labels = await btn.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const i = labels.findIndex((l) => /\._[^.]*$/.test(l ?? ''));
    if (k === 0) console.log(labels);
    if (i < 0) break;
    await btn.nth(i).click();
    await page.waitForTimeout(200);
  }
}
async function simulate(exhaustive) {
  await tab(page, /^Диаграммы/);
  if (exhaustive) {
    await page.getByRole('button', { name: 'Настроить сценарий' }).click();
    await page.getByRole('button', { name: 'Перебрать входы' }).click();
    await page.getByRole('button', { name: 'Закрыть' }).first().click().catch(() => {});
  }
  await page.getByRole('button', { name: 'Симулировать', exact: true }).click();
  await page.locator('.waveform-track-svg').first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(1200);
}
async function rtl(name) {
  await tab(page, /^RTL/); await page.waitForTimeout(3500);
  await shotEl(page, '.schematic-root', name);
}

if (which === 'tour') {
  await page.getByRole('button', { name: 'Создать проект', exact: true }).click();
  await page.waitForTimeout(800);
  await shot(page, 'app-wizard', { clip: { x: 0, y: 0, width: 1400, height: 640 } });
  await page.keyboard.press('Escape');
  await newProject(page, 'Бегущий огонь', 'top', `module top(
    input        clk,
    input        reset,
    output [5:0] led_n
);
    // 27 МГц / 8 = 8 переключений в секунду
    localparam DIV = 27_000_000 / 8;

    reg [21:0] cnt  = 0;
    reg        tick = 0;
    reg [5:0]  ring = 6'b000001;

    always @(posedge clk) begin
        if (cnt == DIV - 1) begin
            cnt  <= 0;
            tick <= 1;
        end else begin
            cnt  <= cnt + 1;
            tick <= 0;
        end
        if (tick) ring <= {ring[4:0], ring[5]};
    end

    assign led_n = ~ring;
endmodule
`);
  await shot(page, 'app-code', { clip: { x: 0, y: 0, width: 1400, height: 420 } });
  await synth(page);
  await rtl('app-rtl');
  await tab(page, /^Gowin/); await page.waitForTimeout(3000); await shot(page, 'app-gowin');
  await tab(page, /^Выводы/); await page.waitForTimeout(1500); await shot(page, 'app-pins');
  await tab(page, /^Кристалл/); await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Разместить и собрать', exact: true }).click();
  await page.getByRole('img', { name: 'Тепловая карта размещённых элементов FPGA' }).waitFor({ timeout: 120000 });
  await page.waitForTimeout(1500);
  await shot(page, 'app-chip');
  await tab(page, /^Лаборатория/); await page.waitForTimeout(4000); await shot(page, 'app-lab');
  await tab(page, /^Подключение/); await page.waitForTimeout(1500); await shot(page, 'app-conn');
  await tab(page, /^Обучение/); await page.waitForTimeout(1500); await shot(page, 'app-learn');
}

if (which === 'all' || which === 'bridge') {
  // --- Полный сумматор
  await newProject(page, 'Полный сумматор', 'full_adder', src('full_adder.v'));
  await synth(page);
  await rtl('br-adder-rtl');
  await simulate(true); await hideInternals(); await waveShot('br-adder-wave');
  await tab(page, /^Gowin/); await page.waitForTimeout(3000);
  const lut = page.locator('.schematic-node', { hasText: 'LUT' }).first();
  if (await lut.count()) { await lut.click(); await page.waitForTimeout(800); }
  await shot(page, 'br-adder-lut');

  // --- Дешифратор 2->4
  await newProject(page, 'Дешифратор 2 в 4', 'decoder2to4', src('decoder2to4.v'));
  await synth(page);
  await rtl('br-dec-rtl');
  await simulate(true); await hideInternals(); await waveShot('br-dec-wave');

  // --- Счётчик
  await newProject(page, 'Счётчик', 'counter4', src('counter4.v'));
  await synth(page);
  await rtl('br-cnt-rtl');
  await simulate(false); await hideInternals(); await waveShot('br-cnt-wave');

  // --- Защёлка и триггер
  await newProject(page, 'Защёлка и триггер', 'dff_vs_latch', src('dff_vs_latch.v'));
  await synth(page);
  await rtl('br-latch-rtl');

  // --- Автомат
  await newProject(page, 'Светофор-автомат', 'traffic_fsm', src('traffic_fsm.v'));
  await synth(page);
    await simulate(false); await hideInternals(); await waveShot('br-fsm-wave');
}
if (which === 'all' || which === 'gates') {
  await newProject(page, 'Логические элементы', 'gates', readFileSync(new URL('../code/01_gates/gates.v', import.meta.url), 'utf8'));
  await synth(page);
  await rtl('ex-gates-rtl');
}
await b.close();
