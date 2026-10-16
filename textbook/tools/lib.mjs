import { chromium } from '@playwright/test';
export const URL = 'http://127.0.0.1:5173/';
// Для снимков отдельных схем и диаграмм: узкое окно (крупный текст при печати) и высокая плотность.
// Для обзора всего окна: open(1400, 860, 2).
export async function open(width = 1100, height = 700, scale = 3) {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: scale, colorScheme: 'light', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(2000);
  return { b, page };
}
export async function newProject(page, name, top, verilog) {
  await page.getByRole('button', { name: 'Создать проект', exact: true }).click();
  const wiz = page.getByRole('dialog', { name: 'Проекты' });
  await wiz.getByRole('button', { name: /^С нуля/ }).click();
  await wiz.locator('#wizard-project-name').fill(name);
  await wiz.locator('#wizard-top-name').fill(top);
  await wiz.getByRole('button', { name: 'Далее' }).click();
  await wiz.getByRole('button', { name: 'Создать проект' }).click();
  await wiz.waitFor({ state: 'hidden' });
  await page.getByRole('tab', { name: /^Код/ }).click();
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
  await page.getByRole('button', { name: /^Синтезировать/ }).click();
  await page.getByRole('tab', { name: /^RTL · Готово/ }).waitFor({ timeout: 90000 });
}
export async function tab(page, re) { await page.getByRole('tab', { name: re }).click(); await page.waitForTimeout(800); }
export const shot = (page, f, opts = {}) => page.screenshot({ path: `img/${f}.png`, ...opts });

/** Снимок элемента по CSS-селектору: только схема или только диаграмма, без рамки приложения. */
export async function shotEl(page, selector, name, extra = {}) {
  const box = await page.locator(selector).first().boundingBox();
  const clip = { x: box.x, y: box.y, width: box.width, height: box.height, ...extra };
  await page.screenshot({ path: `img/${name}.png`, clip });
}
