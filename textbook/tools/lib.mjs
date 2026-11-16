// Общие функции для снимков Logra. Переменные окружения:
//   LANG_UI=ru|en   язык интерфейса (по умолчанию ru)
//   OUT_DIR=...     куда писать PNG (по умолчанию img для ru, img/en для en; путь от textbook/)
//   SCALE=2..3      deviceScaleFactor
//   THEME=light|dark (по умолчанию light: книга печатается на белой бумаге)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const URL = process.env.APP_URL ?? 'http://127.0.0.1:5173/';
export const LANG = process.env.LANG_UI === 'en' ? 'en' : 'ru';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.resolve(root, process.env.OUT_DIR ?? (LANG === 'en' ? 'img/en' : 'img'));
mkdirSync(OUT, { recursive: true });
export const SCALE = Number(process.env.SCALE ?? 3);

/** Подписи элементов интерфейса на двух языках. */
const L = {
  ru: {
    create: 'Создать проект', wizard: 'Проекты', scratch: /^С нуля/, next: 'Далее',
    code: /^Код/, rtl: /^RTL/, rtlDone: /^RTL · Готово/, waves: /^Диаграммы/, gowin: /^Gowin/, pins: /^Выводы/,
    chip: /^Кристалл/, lab: /^Лаборатория/, connect: /^Подключение/, learn: /^Обучение/,
    synth: /^Синтезировать/, simulate: 'Симулировать', scenario: 'Настроить сценарий', sweep: 'Перебрать входы',
    close: 'Закрыть', place: 'Разместить и собрать', heat: 'Тепловая карта размещённых элементов FPGA',
    tabRun: /^Запуск/, tabInputs: /^Входы/, tabEvents: /^События/, cycles: /^Циклов$/, addStep: 'Добавить шаг',
    stepPeriod: (n) => `Период шага ${n}`, stepSig: (s, n) => `${s}, шаг ${n}`,
    signals: /^Сигналы/, hideAll: 'Скрыть все', closePicker: 'Закрыть выбор сигналов', hide: /крыть/,
    fullRange: 'Показать весь интервал диаграммы', examplesBtn: 'На основе примера',
  },
  en: {
    create: 'New project', wizard: 'Projects', scratch: /^From scratch/, next: 'Next',
    code: /^Code/, rtl: /^RTL/, rtlDone: /^RTL · Done/, waves: /^Waveforms/, gowin: /^Gowin/, pins: /^Pins/,
    chip: /^Chip/, lab: /^Lab/, connect: /^Connect/, learn: /^Learn/,
    synth: /^Synthesize/, simulate: 'Simulate', scenario: 'Set up the scenario', sweep: 'Sweep inputs',
    close: 'Close', place: 'Place and build', heat: 'Heat map of the placed FPGA elements',
    tabRun: /^Run/, tabInputs: /^Inputs/, tabEvents: /^Events/, cycles: /^Cycles$/, addStep: 'Add step',
    stepPeriod: (n) => `Period of step ${n}`, stepSig: (s, n) => `${s}, step ${n}`,
    signals: /^Signals/, hideAll: 'Hide all', closePicker: 'Close signal picker', hide: /Hide/,
    fullRange: 'Show the whole waveform interval', examplesBtn: 'From an example',
  },
};
export const T = L[LANG];

/** Окно: по умолчанию широкое, чтобы схемы и диаграммы были крупными. */
export async function open(width = 1440, height = 900, scale = SCALE) {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({
    viewport: { width, height }, deviceScaleFactor: scale,
    colorScheme: process.env.THEME === 'dark' ? 'dark' : 'light',
    locale: LANG === 'en' ? 'en-US' : 'ru-RU',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  await ctx.addInitScript(([lang, theme]) => {
    try { localStorage.setItem('yosis.language.v1', lang); localStorage.setItem('yosis.theme.v1', theme); } catch {}
  }, [LANG, process.env.THEME === 'dark' ? 'dark' : 'light']);
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(URL);
  await page.waitForTimeout(2500);
  return { b, page };
}
/** Окно «Создать проект» на чистом запуске открывается само; повторно открываем кнопкой. */
export async function openWizard(page) {
  const wiz = page.getByRole('dialog').first();
  if (!(await wiz.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: T.create, exact: true }).click();
  }
  await wiz.waitFor();
  return wiz;
}
export async function newProject(page, name, top, verilog) {
  const wiz = await openWizard(page);
  await wiz.getByRole('button', { name: T.scratch }).click();
  await wiz.locator('#wizard-project-name').fill(name);
  await wiz.locator('#wizard-top-name').fill(top);
  await wiz.getByRole('button', { name: T.next }).click();
  await wiz.getByRole('button', { name: T.create, exact: true }).click();
  await wiz.waitFor({ state: 'hidden' });
  await page.getByRole('tab', { name: T.code }).click();
  await setCode(page, verilog);
}
export async function setCode(page, text) {
  const ed = page.getByRole('textbox', { name: 'Editor content', exact: true });
  await ed.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.evaluate((t) => navigator.clipboard.writeText(t), text);
  await page.keyboard.press('Control+V');
  await page.waitForTimeout(500);
}
export async function synth(page) {
  await page.getByRole('button', { name: T.synth }).click();
  await page.getByRole('tab', { name: T.rtlDone }).waitFor({ timeout: 120000 });
}
export async function tab(page, re) {
  let t = page.getByRole('tab', { name: re });
  if (!(await t.first().isVisible().catch(() => false))) {
    // вкладки «Настоящая плата» свёрнуты
    await page.locator('.sh-tab-group-toggle').click().catch(() => {});
    t = page.getByRole('tab', { name: re });
  }
  await t.first().click();
  await page.waitForTimeout(800);
}
export const shot = (page, f, opts = {}) => page.screenshot({ path: path.join(OUT, `${f}.png`), ...opts });

/** Снимок элемента по CSS-селектору: только схема или только диаграмма, без рамки приложения. */
export async function shotEl(page, selector, name, extra = {}) {
  // Для книги убираем кнопки масштаба и подсказку про колесо мыши.
  await page.addStyleTag({ content: '.schematic-tools,.schematic-hint,.canvas-hint,.canvas-controls{visibility:hidden!important}' });
  const box = await page.locator(selector).first().boundingBox();
  const clip = { x: box.x, y: box.y, width: box.width, height: box.height, ...extra };
  await page.screenshot({ path: path.join(OUT, `${name}.png`), clip });
}

/** Для диаграмм: убираем служебную строку с именем области («__yosis_testbench.dut») под именем сигнала. */
export async function waveStyle(page) {
  await page.addStyleTag({ content: '.waveform-viewer :is(button,strong) + small{font-size:0!important}.waveform-viewer :is(button,strong) + small span{font-size:12px!important}' });
}

/** RTL-схема: окно временно вытягиваем по высоте (схема вписывается крупнее), кадр обрезаем по самой схеме. */
export async function rtlShot(page, name, { tall = true, margin = 16 } = {}) {
  const vp = page.viewportSize();
  if (tall) await page.setViewportSize({ width: vp.width, height: 2000 });
  await tab(page, T.rtl);
  await page.waitForTimeout(3500);
  await page.addStyleTag({ content: '.schematic-tools,.schematic-hint,.canvas-hint,.canvas-controls,.schematic-toolbar{visibility:hidden!important}' });
  const root = await page.locator('.schematic-root').first().boundingBox();
  const g = await page.evaluate(() => {
    const r = document.querySelector('.schematic-canvas > g').getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  const x0 = Math.max(root.x, g.x - margin), y0 = Math.max(root.y, g.y - margin);
  const x1 = Math.min(root.x + root.width, g.x + g.width + margin), y1 = Math.min(root.y + root.height, g.y + g.height + margin);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
  if (tall) await page.setViewportSize(vp);
}
