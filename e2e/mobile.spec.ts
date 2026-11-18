import { test, expect, type Page } from '@playwright/test';

/** Phone layout: bottom tab bar, sheets, no sideways scrolling, a working constructor canvas. */
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  locale: 'ru-RU',
});

// A cold dev server needs a while for the first paint.
const FIRST = { timeout: 30_000 };

const noSideScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/** Opens the app and makes a new project through the wizard (a sheet on a phone). */
async function newProject(page: Page, kind: string) {
  await page.goto('/');
  const hub = page.getByRole('dialog', { name: 'Проекты' });
  await expect(hub).toBeVisible(FIRST);
  await hub.getByText(kind).first().click();
  await hub.getByRole('button', { name: 'Далее' }).click();
  await hub.getByRole('button', { name: 'Создать проект' }).last().click();
  await expect(hub).not.toBeVisible();
}

test('phone: projects window, bottom navigation, constructor sheets', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');

  // The projects window opens first and fits the screen.
  await expect(page.getByRole('dialog', { name: 'Проекты' })).toBeVisible(FIRST);
  expect(await noSideScroll(page)).toBe(true);

  // A project made of logic blocks: the wizard works as a full-screen sheet.
  await newProject(page, 'Из логических элементов');

  // The bottom bar replaces the left rail.
  const bar = page.getByRole('navigation', { name: 'Рабочие вкладки' });
  await expect(bar).toBeVisible();
  const box = await bar.boundingBox();
  expect(box!.y + box!.height).toBeGreaterThan(844 - 4);
  for (const name of ['Код', 'Конструктор', 'Диаграммы', 'Лаборатория']) {
    await bar.getByRole('tab', { name }).click();
    await expect(bar.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
    expect(await noSideScroll(page)).toBe(true);
  }

  // The rest is behind "Ещё".
  for (const name of ['Выводы', 'RTL', 'Gowin', 'Кристалл', 'Подключение', 'Обучение']) {
    await bar.getByRole('button', { name: 'Ещё' }).click();
    const sheet = page.getByRole('dialog', { name: 'Ещё' });
    await sheet.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
    await expect(sheet).not.toBeVisible();
    await page.waitForTimeout(300);
    expect(await noSideScroll(page), `no side scroll on ${name}`).toBe(true);
  }

  // Constructor: the canvas is free, the library is a sheet, a block lands on the sheet of paper.
  await bar.getByRole('tab', { name: 'Конструктор' }).click();
  const canvas = page.getByRole('group', { name: 'Конструктор логической схемы' });
  await expect(canvas).toBeInViewport();
  await expect(page.locator('.circuit-palette')).toHaveCount(0);
  await page.getByRole('button', { name: 'Библиотека элементов' }).click();
  const palette = page.locator('.circuit-palette');
  await expect(palette).toBeVisible();
  const sheet = await palette.boundingBox();
  expect(sheet!.width).toBeGreaterThan(380);
  await palette.getByRole('button', { name: /^И \(AND\)/ }).click();
  await expect(palette).toHaveCount(0);
  await expect(canvas.locator('[data-pin]').first()).toBeVisible();
  // Pins have a touch-sized (invisible) hit area.
  const hit = await canvas.locator('.circuit-terminal-hit').first().boundingBox();
  expect(hit!.width).toBeGreaterThanOrEqual(30);
  expect(errors).toEqual([]);
});

test('phone: pin picker sheet and full-screen map with a bottom action bar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await newProject(page, 'С нуля');

  const bar = page.getByRole('navigation', { name: 'Рабочие вкладки' });
  await bar.getByRole('tab', { name: 'Выводы' }).click();

  // The sheet replaces the native drop-down: search, pick, the row shows the pin.
  const rowPick = page.getByRole('button', { name: /^Вывод для / }).first();
  await rowPick.click(FIRST);
  const picker = page.getByRole('dialog', { name: /^Выберите вывод для / });
  await expect(picker).toBeVisible();
  await picker.getByRole('textbox').fill('1');
  await picker.locator('.pin-sheet-list button:not(.pin-sheet-free)').first().click();
  await expect(picker).toBeHidden();
  await expect(rowPick).toHaveText(/\d+/);

  await page.getByRole('button', { name: 'Открыть карту' }).click();
  const map = page.locator('.pin-map-panel.full');
  await expect(map).toBeVisible();
  // Banks are chips, not a drop-down.
  const chips = page.getByRole('group', { name: 'Фильтр I/O банка' });
  await chips.getByRole('button', { name: '3', exact: true }).click();
  await expect(chips.getByRole('button', { name: '3', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await chips.getByRole('button', { name: 'Все' }).click();

  const box = await map.boundingBox();
  expect(box!.height).toBeGreaterThan(800);
  const actions = page.getByRole('group', { name: 'Назначение на карте' });
  await expect(actions).toBeVisible();

  // A near miss is fixed with the arrows; the chosen pin is named in the bar.
  await actions.getByRole('button', { name: 'Следующий вывод' }).click();
  await expect(actions.getByText(/^Вывод \d+/)).toBeVisible();
  await actions.getByRole('button', { name: 'Следующий вывод' }).click();
  const assign = actions.getByRole('button', { name: 'Назначить' });
  await expect(assign).toBeVisible();
  const target = await assign.boundingBox();
  expect(target!.height).toBeGreaterThanOrEqual(44);
  expect(await noSideScroll(page)).toBe(true);

  await page.getByRole('button', { name: 'Закрыть карту' }).click();
  await expect(map).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('phone: lab bench takes the screen, parts come from a sheet, two fingers zoom, long press opens the menu', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await newProject(page, 'С нуля');

  const bar = page.getByRole('navigation', { name: 'Рабочие вкладки' });
  await bar.getByRole('tab', { name: 'Лаборатория' }).click();
  const bench = page.locator('.bench');
  await expect(bench).toBeVisible({ timeout: 30_000 });
  const area = await bench.boundingBox();
  expect(area!.height).toBeGreaterThan(844 * 0.6);

  await page.getByRole('button', { name: 'Деталь', exact: true }).click();
  const library = page.locator('.lab-library');
  await expect(library).toBeVisible();
  await library.getByRole('button', { name: 'Добавить деталь: Светодиод', exact: true }).click();
  await expect(library).toBeHidden();

  // The selected part is removed from the details sheet with a full-size button.
  await page.getByRole('button', { name: 'Детали стола' }).click();
  const remove = page.getByRole('button', { name: 'Убрать деталь' });
  await expect(remove).toBeVisible();
  expect((await remove.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await remove.click();
  await expect(remove).toBeHidden();
  // Put a part back for the gestures below.
  await page.getByRole('button', { name: 'Деталь', exact: true }).click();
  await library.getByRole('button', { name: 'Добавить деталь: Светодиод', exact: true }).click();

  // Two fingers: the bench zooms, the page does not.
  const cdp = await context.newCDPSession(page);
  const canvas = (await page.locator('.bench-canvas').boundingBox())!;
  const cx = canvas.x + canvas.width / 2;
  const cy = canvas.y + canvas.height / 2 - 60;
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: [number, number][]) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y], id) => ({ x, y, id })),
    });
  await touch('touchStart', [
    [cx - 40, cy],
    [cx + 40, cy],
  ]);
  for (let step = 1; step <= 6; step++)
    await touch('touchMove', [
      [cx - 40 - step * 12, cy],
      [cx + 40 + step * 12, cy],
    ]);
  await touch('touchEnd', []);
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  expect(await noSideScroll(page)).toBe(true);

  // A finger held on the bench opens the menu a right click would.
  await touch('touchStart', [[cx, cy + 250]]);
  await page.waitForTimeout(800);
  await touch('touchEnd', []);
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');

  expect(errors).toEqual([]);
});

for (const size of [
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
]) {
  test(`layout holds at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await newProject(page, 'С нуля');
    const bar = page.getByRole('navigation', { name: 'Рабочие вкладки' });
    for (const name of ['Код', 'Выводы', 'Диаграммы', 'Лаборатория']) {
      await bar.getByRole('tab', { name }).click();
      await page.waitForTimeout(300);
      expect(await noSideScroll(page), name).toBe(true);
    }
    const bench = page.locator('.bench');
    await expect(bench).toBeVisible({ timeout: 30_000 });
    const area = await bench.boundingBox();
    // The bench keeps a usable share of a short landscape screen.
    expect(area!.height).toBeGreaterThan(size.height * 0.4);
  });
}
