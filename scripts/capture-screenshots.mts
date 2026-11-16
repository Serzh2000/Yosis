// Снимки экрана для README: запускает приложение (npm run dev) и проходит основной путь ученика.
// Использование: LANGS=ru,en npx tsx scripts/capture-screenshots.mts [адрес, по умолчанию http://127.0.0.1:5173]
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const out = 'docs/images';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();

async function open(
  locale: 'ru-RU' | 'en-US',
  size: { width: number; height: number },
  mobile = false,
) {
  const context = await browser.newContext({
    locale,
    viewport: size,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: 'dark',
  });
  await context.addInitScript(
    (language) => {
      localStorage.setItem('yosis.language.v1', language);
      localStorage.setItem('yosis.theme.v1', 'dark');
    },
    locale === 'en-US' ? 'en' : 'ru',
  );
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  return page;
}

const shot = (page: Page, name: string) => page.screenshot({ path: `${out}/${name}.png` });
const names = {
  ru: {
    example: 'На основе примера',
    choose: 'Выбрать этот пример',
    title: 'Название проекта',
    next: 'Далее',
    create: 'Создать проект',
    synth: /^Синтезировать/,
    rtl: /^RTL · Готово/,
    rtlTab: /^RTL/,
    waves: /^Диаграммы/,
    simulate: 'Симулировать',
    pins: /^Выводы/,
    schematic: 'Из логических элементов',
    designer: /^Конструктор/,
    examples: 'Примеры',
    search: 'Найти пример',
    query: 'счётчик',
    open: 'Открыть',
    library: 'Библиотека элементов',
    lab: /^Лаборатория/,
    learn: /^Обучение/,
    chip: /^Кристалл/,
    connect: /^Подключение/,
    place: 'Разместить и собрать',
    heat: 'Тепловая карта размещённых элементов FPGA',
  },
  en: {
    example: 'From an example',
    choose: 'Choose this example',
    title: 'Project name',
    next: 'Next',
    create: 'New project',
    synth: /^Synthesize/,
    rtl: /^RTL · Done/,
    rtlTab: /^RTL/,
    waves: /^Waveforms/,
    simulate: 'Simulate',
    pins: /^Pins/,
    schematic: 'From logic elements',
    designer: /^Designer/,
    examples: 'Examples',
    search: 'Find an example',
    query: 'counter',
    open: 'Open',
    library: 'Element library',
    lab: /^Lab/,
    learn: /^Learn/,
    chip: /^Chip/,
    connect: /^Connect/,
    place: 'Place and build',
    heat: 'Heat map of the placed FPGA elements',
  },
} as const;

async function desktop(lang: 'ru' | 'en') {
  const n = names[lang];
  const page = await open(lang === 'ru' ? 'ru-RU' : 'en-US', { width: 1440, height: 900 });
  const suffix = lang === 'ru' ? '' : '-en';
  await page.goto(base + '/');
  const dialog = page.getByRole('dialog').first();
  await dialog.waitFor();
  await page.waitForTimeout(600);
  await shot(page, `projects${suffix}`);

  // Пример → проект
  await dialog.getByRole('button', { name: n.example, exact: false }).click();
  await page.waitForTimeout(800);
  await shot(page, `examples${suffix}`);
  await dialog.getByLabel(n.search).fill(n.query);
  await dialog.locator('.examples-grid button').first().click();
  await dialog.getByRole('button', { name: n.choose }).click();
  await dialog.getByLabel(n.title).fill('blinker');
  await dialog.getByRole('button', { name: n.next }).click();
  await dialog.getByRole('button', { name: n.create, exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForTimeout(1200);
  await shot(page, `code${suffix}`);

  await page.getByRole('button', { name: n.synth }).click();
  await page.getByRole('tab', { name: n.rtl }).waitFor({ timeout: 120_000 });
  await page.getByRole('tab', { name: n.rtlTab }).click();
  await page.waitForTimeout(1500);
  await shot(page, `rtl${suffix}`);

  await page.getByRole('tab', { name: n.waves }).click();
  await page.getByRole('button', { name: n.simulate, exact: true }).click();
  await page.locator('.waveform-track-svg').first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(800);
  await shot(page, `waveforms${suffix}`);

  await page.getByRole('tab', { name: n.pins }).click();
  await page.waitForTimeout(1200);
  await shot(page, `pins${suffix}`);

  // Подключение и кристалл: вкладки группы «Настоящая плата»
  await page.locator('.sh-tab-group-toggle').click();
  await page.getByRole('tab', { name: n.connect }).click();
  await page.waitForTimeout(1200);
  await shot(page, `board${suffix}`);
  await page.getByRole('tab', { name: n.chip }).click();
  await page.getByRole('button', { name: n.place, exact: true }).click();
  await page.getByRole('img', { name: n.heat }).waitFor({ timeout: 300_000 });
  await page.waitForTimeout(1000);
  await shot(page, `chip${suffix}`);
  await page.getByRole('tab', { name: n.lab }).click();
  await page.waitForTimeout(5000);
  await shot(page, `lab${suffix}`);
  await page.getByRole('tab', { name: n.learn }).click();
  await page.waitForTimeout(2000);
  await shot(page, `learning${suffix}`);

  // Конструктор с готовой схемой из примеров
  await page
    .getByRole('button', { name: lang === 'ru' ? 'Создать проект' : 'New project', exact: true })
    .click();
  const hub = page.getByRole('dialog').first();
  await hub.getByRole('button', { name: n.schematic, exact: false }).click();
  await hub.getByRole('button', { name: n.next }).click();
  await hub.getByRole('button', { name: n.create, exact: true }).click();
  await hub.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: n.examples, exact: true }).first().click();
  await page.waitForTimeout(800);
  await shot(page, `designer-examples${suffix}`);
  await page.getByRole('button', { name: n.open, exact: true }).nth(3).click();
  await page.getByRole('button', { name: n.library, exact: true }).click();
  await page.waitForTimeout(1200);
  await shot(page, `designer${suffix}`);
  await page.context().close();
}

async function phone(lang: 'ru' | 'en') {
  const n = names[lang];
  const page = await open(lang === 'ru' ? 'ru-RU' : 'en-US', { width: 390, height: 844 }, true);
  const suffix = lang === 'ru' ? '' : '-en';
  await page.goto(base + '/');
  const dialog = page.getByRole('dialog').first();
  await dialog.waitFor();
  await page.waitForTimeout(600);
  await shot(page, `mobile-projects${suffix}`);
  await dialog.getByRole('button', { name: n.schematic, exact: false }).click();
  await dialog.getByRole('button', { name: n.next }).click();
  await dialog.getByRole('button', { name: n.create, exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: n.examples, exact: true }).first().click();
  await page.getByRole('button', { name: n.open, exact: true }).nth(3).click();
  await page.waitForTimeout(1200);
  await shot(page, `mobile-designer${suffix}`);
  await page.context().close();
}

for (const lang of (process.env.LANGS ?? 'ru,en').split(',')) {
  await desktop(lang as 'ru' | 'en');
  await phone(lang as 'ru' | 'en');
}
await browser.close();
