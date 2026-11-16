// Снимки интерфейса Logra для учебника. Запуск (из корня репозитория):
//   LANG_UI=ru node textbook/tools/shoot.mjs [tour|bridge|gates|all]
//   LANG_UI=en node textbook/tools/shoot.mjs all
// Нужен запущенный Logra (npm run dev) на http://127.0.0.1:5173
import { readFileSync } from 'node:fs';
import { open, newProject, openWizard, synth, tab, shot, shotEl, rtlShot, waveStyle, T, LANG } from './lib.mjs';

const src = (f) => readFileSync(new URL(`../code/00_theory/${f}`, import.meta.url), 'utf8');
const which = process.argv[2] ?? 'all';
const en = LANG === 'en';
const tourMode = which === 'tour';
// Обзор окна: 1500x940 при плотности 2 (3000 px по ширине); схемы и диаграммы: 1100 px при плотности 3.
const { b, page } = tourMode ? await open(1500, 1000, 2) : await open(1100, 760, 3);

async function waveShot(name) {
  await page.waitForTimeout(800);
  await waveStyle(page);
  const rows = page.locator('.waveform-track-svg');
  const n = await rows.count();
  const last = await rows.nth(n - 1).boundingBox();
  const top = await page.locator('.waveform-viewer').first().boundingBox();
  await page.mouse.move(5, 745);
  await page.waitForTimeout(300);
  await shot(page, name, { clip: { x: top.x, y: top.y, width: top.width, height: last.y + last.height + 8 - top.y } });
}
async function hideInternals() {
  // скрыть служебные сигналы _0_, _1_ ...
  for (let k = 0; k < 20; k++) {
    const labels = await page.locator('button[aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const i = labels.findIndex((l) => T.hide.test(l ?? '') && /\._[^.]*$/.test(l ?? ''));
    if (i < 0) break;
    await page.locator('button[aria-label]').nth(i).click();
    await page.waitForTimeout(200);
  }
}
async function simulate(exhaustive) {
  await tab(page, T.waves);
  if (exhaustive) {
    await page.getByRole('button', { name: T.scenario }).click();
    await page.getByRole('button', { name: T.sweep }).click();
    await page.getByRole('button', { name: T.close }).first().click().catch(() => {});
  }
  await page.getByRole('button', { name: T.simulate, exact: true }).click();
  await page.locator('.waveform-track-svg').first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(1200);
}
async function rtl(name) { await rtlShot(page, name, { tall: !tourMode }); }

if (which === 'tour') {
  const wiz = await openWizard(page);
  await page.waitForTimeout(800);
  await shot(page, 'app-wizard', { clip: { x: 0, y: 0, width: 1500, height: 640 } });
  await page.keyboard.press('Escape');
  await newProject(page, en ? 'Running light' : 'Бегущий огонь', 'top', `module top(
    input        clk,
    input        reset,
    output [5:0] led_n
);
    // 27 MHz / 8 = 8 steps per second
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
`.replace('// 27 MHz / 8 = 8 steps per second', en ? '// 27 MHz / 8 = 8 steps per second' : '// 27 МГц / 8 = 8 переключений в секунду'));
  await shot(page, 'app-code');
  await synth(page);
  await rtl('app-rtl');
  await tab(page, T.gowin); await page.waitForTimeout(3000); await shot(page, 'app-gowin');
  await tab(page, T.pins); await page.waitForTimeout(1500); await shot(page, 'app-pins');
  await tab(page, T.chip); await page.waitForTimeout(1500);
  await page.getByRole('button', { name: T.place, exact: true }).click();
  await page.getByRole('img', { name: T.heat }).waitFor({ timeout: 300000 });
  await page.waitForTimeout(1500);
  await shot(page, 'app-chip');
  await tab(page, T.lab); await page.waitForTimeout(5000); await shot(page, 'app-lab');
  await tab(page, T.connect); await page.waitForTimeout(1500); await shot(page, 'app-conn');
  await tab(page, T.learn); await page.waitForTimeout(2000); await shot(page, 'app-learn');
}

if (which === 'all' || which === 'bridge') {
  const N = en
    ? { add: 'Full adder', dec: 'Decoder 2 to 4', cnt: 'Counter', latch: 'Latch and flip-flop', fsm: 'Traffic light FSM' }
    : { add: 'Полный сумматор', dec: 'Дешифратор 2 в 4', cnt: 'Счётчик', latch: 'Защёлка и триггер', fsm: 'Светофор-автомат' };
  await newProject(page, N.add, 'full_adder', src('full_adder.v'));
  await synth(page);
  await rtl('br-adder-rtl');
  await simulate(true); await hideInternals(); await waveShot('br-adder-wave');
  await tab(page, T.gowin); await page.waitForTimeout(3000);
  const lut = page.locator('.schematic-node', { hasText: 'LUT' }).first();
  if (await lut.count()) { await lut.click(); await page.waitForTimeout(800); }
  await shot(page, 'br-adder-lut');

  await newProject(page, N.dec, 'decoder2to4', src('decoder2to4.v'));
  await synth(page);
  await rtl('br-dec-rtl');
  await simulate(true); await hideInternals(); await waveShot('br-dec-wave');

  await newProject(page, N.cnt, 'counter4', src('counter4.v'));
  await synth(page);
  await rtl('br-cnt-rtl');
  await simulate(false); await hideInternals(); await waveShot('br-cnt-wave');

  await newProject(page, N.latch, 'dff_vs_latch', src('dff_vs_latch.v'));
  await synth(page);
  await rtl('br-latch-rtl');

  await newProject(page, N.fsm, 'traffic_fsm', src('traffic_fsm.v'));
  await synth(page);
  await simulate(false); await hideInternals(); await waveShot('br-fsm-wave');
}
if (which === 'all' || which === 'gates') {
  await newProject(page, en ? 'Logic gates' : 'Логические элементы', 'gates', readFileSync(new URL('../code/01_gates/gates.v', import.meta.url), 'utf8'));
  await synth(page);
  await rtl('ex-gates-rtl');
}
await b.close();
