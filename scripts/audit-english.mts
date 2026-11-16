// Обходит экраны приложения в английском интерфейсе и собирает русский текст, который остался на
// экране (видимый текст и aria-label/title/placeholder). Запуск при работающем `npm run dev`:
//   npx tsx scripts/audit-english.mts [адрес]
import { chromium, type Page } from '@playwright/test';

const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const cyrillic = /[А-Яа-яЁё]/;
const seen = new Map<string, Set<string>>();

async function collect(page: Page, screen: string) {
  console.log('· ' + screen);
  await page.waitForTimeout(700);
  const found = await page.evaluate((source) => {
    const re = new RegExp(source);
    const out = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|CODE|PRE)$/.test(parent.tagName)) continue;
      if (parent.closest('.monaco-editor, .view-lines, pre, code, .generated-verilog-text'))
        continue;
      const text = (node.textContent ?? '').trim();
      if (text && re.test(text)) out.add(text.slice(0, 110));
    }
    for (const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) {
      for (const name of ['aria-label', 'title', 'placeholder', 'alt']) {
        const value = el.getAttribute(name);
        if (value && re.test(value)) out.add(`[${name}] ${value.slice(0, 100)}`);
      }
    }
    return [...out];
  }, cyrillic.source);
  for (const text of found) {
    if (!seen.has(text)) {
      seen.set(text, new Set());
      console.log(`${screen} :: ${text}`);
    }
    seen.get(text)!.add(screen);
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({
  locale: 'en-US',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('yosis.language.v1', 'en');
  localStorage.setItem('yosis.theme.v1', 'dark');
});
let page = await context.newPage();
page.setDefaultTimeout(12_000);
const click = async (name: string | RegExp, role: 'button' | 'tab' = 'button', exact = false) => {
  await page
    .getByRole(role, { name, exact })
    .first()
    .click()
    .catch(() => undefined);
};

await page.goto(base + '/');
await page.getByRole('dialog').first().waitFor();
await collect(page, 'hub: start');
for (const tab of ['My projects', 'Current project', 'Create']) {
  await click(tab);
  await collect(page, `hub: ${tab}`);
}
// мастер: «С нуля», «Из логических элементов», «На основе примера»
for (const start of ['From scratch', 'From logic elements']) {
  await click(start);
  await collect(page, `wizard ${start}: step 1`);
  await click('Next', 'button', true);
  await collect(page, `wizard ${start}: step 2`);
  await click('Back', 'button', true);
  await click('Close the wizard');
  await page.keyboard.press('Escape').catch(() => undefined);
  await click('Create', 'button', true);
}
await click('From an example');
await collect(page, 'examples catalog');
await page
  .getByRole('dialog')
  .first()
  .locator('.examples-grid button')
  .first()
  .click()
  .catch(() => undefined);
await click('Choose this example');
await collect(page, 'wizard example: step 1');
await click('Next', 'button', true);
await collect(page, 'wizard example: step 2');
await click('New project', 'button', true);
await page.waitForTimeout(1500);
await collect(page, 'code');

await click(/^Synthesize/);
await page
  .getByRole('tab', { name: /^RTL · Done/ })
  .waitFor({ timeout: 60_000 })
  .catch(() => undefined);
for (const [tab, label] of [
  [/^RTL/, 'rtl'],
  [/^Waveforms/, 'waveforms'],
  [/^Pins/, 'pins'],
  [/^Learn/, 'learn tab'],
] as const) {
  await click(tab, 'tab');
  if (label === 'waveforms') await click('Simulate', 'button', true);
  await collect(page, label);
}
await page
  .locator('.sh-tab-group-toggle')
  .click()
  .catch(() => undefined);
for (const [tab, label] of [
  [/^Gowin/, 'gowin'],
  [/^Connect/, 'connect'],
] as const) {
  await click(tab, 'tab');
  await collect(page, label);
}
// конструктор: новая страница (после лаборатории вкладка могла упасть)
await page.close().catch(() => undefined);
page = await context.newPage();
page.setDefaultTimeout(30_000);
await page.goto(base + '/');
await page.getByRole('dialog').first().waitFor();
await click('From logic elements');
await click('Next', 'button', true);
await click('New project', 'button', true);
await page.waitForTimeout(1500);
await collect(page, 'designer: empty');
await click('Examples', 'button', true);
await collect(page, 'designer: examples');
await page
  .getByRole('button', { name: 'Open', exact: true })
  .nth(3)
  .click()
  .catch(() => undefined);
await page.waitForTimeout(1000);
await collect(page, 'designer: example');
await click('Element properties and issues');
await click('Properties and problems');
await collect(page, 'designer: properties');
await click('Verilog', 'button', true);
await collect(page, 'designer: verilog');
await click('Back to the schematic');
await click('Preview', 'button', true);
await collect(page, 'designer: preview');
await page
  .getByRole('button', { name: /AND/ })
  .first()
  .click()
  .catch(() => undefined);
await collect(page, 'designer: added block');
// учебник и кабинет
await page.goto(base + '/learn');
await collect(page, '/learn');
await page.goto(base + '/learn/schematic');
await collect(page, '/learn/schematic');
await page.goto(base + '/learn/verilog');
await collect(page, '/learn/verilog');
await browser.close().catch(() => undefined);

const rows = [...seen].map(([text, screens]) => ({ text, screens: [...screens] }));
for (const { text, screens } of rows) console.log(`${screens.join(', ')} :: ${text}`);
console.log(`\nрусских строк на экранах: ${rows.length}`);
