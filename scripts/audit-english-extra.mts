// Дополнение к audit-english.mts: вкладки Кристалл и Лаборатория и телефонная раскладка.
import { chromium, type Page } from '@playwright/test';
const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const seen = new Set<string>();
async function collect(page: Page, screen: string) {
  await page.waitForTimeout(1500);
  const found = await page.evaluate(() => {
    const re = /[А-Яа-яЁё]/;
    const out = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const p = n.parentElement;
      if (!p || /^(SCRIPT|STYLE|CODE|PRE)$/.test(p.tagName) || p.closest('.monaco-editor'))
        continue;
      const t = (n.textContent ?? '').trim();
      if (t && re.test(t)) out.add(t.slice(0, 110));
    }
    for (const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]'))
      for (const a of ['aria-label', 'title', 'placeholder', 'alt']) {
        const v = el.getAttribute(a);
        if (v && re.test(v)) out.add(`[${a}] ${v.slice(0, 100)}`);
      }
    return [...out];
  });
  console.log('· ' + screen + ' (' + found.length + ')');
  for (const t of found)
    if (!seen.has(t)) {
      seen.add(t);
      console.log('   ' + t);
    }
}
const browser = await chromium.launch();
async function session(mobile: boolean) {
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  await context.addInitScript(() => localStorage.setItem('yosis.language.v1', 'en'));
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  return page;
}
// проект из примера
async function makeProject(page: Page) {
  await page.goto(base + '/');
  const dialog = page.getByRole('dialog').first();
  await dialog.waitFor();
  await dialog.getByRole('button', { name: 'From an example', exact: false }).click();
  await dialog.getByRole('button', { name: 'Choose this example' }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: 'New project', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
}
{
  const page = await session(false);
  await makeProject(page);
  await page.getByRole('button', { name: /^Synthesize/ }).click();
  await page.getByRole('tab', { name: /^RTL · Done/ }).waitFor({ timeout: 90000 });
  await page.locator('.sh-tab-group-toggle').click();
  await page.getByRole('tab', { name: /^Chip/ }).click();
  await collect(page, 'chip: before');
  await page.getByRole('button', { name: 'Place and build', exact: true }).click();
  await page
    .getByRole('img', { name: 'Heat map of the placed FPGA elements' })
    .waitFor({ timeout: 300000 })
    .catch(() => undefined);
  await collect(page, 'chip: placed');
  await page
    .getByRole('tab', { name: /^Lab/ })
    .click()
    .catch(() => undefined);
  await collect(page, 'lab');
  await page.close();
}
{
  const page = await session(true);
  await makeProject(page);
  await collect(page, 'phone: code');
  for (const name of ['Designer', 'Waveforms', 'Lab', 'More']) {
    await page
      .getByRole('tab', { name, exact: false })
      .first()
      .click()
      .catch(() =>
        page
          .getByText(name, { exact: true })
          .first()
          .click()
          .catch(() => undefined),
      );
    await collect(page, 'phone: ' + name);
  }
}
await browser.close();
console.log('готово, уникальных русских строк: ' + seen.size);
