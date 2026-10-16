import { chromium } from '@playwright/test';
export const URL = 'http://127.0.0.1:5173/';
export async function open() {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 1.5, colorScheme: 'light', permissions: ['clipboard-read', 'clipboard-write'] });
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
