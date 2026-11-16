import { test, expect, type Page } from '@playwright/test';

/** Phone layout: bottom tab bar, sheets, no sideways scrolling, a working constructor canvas. */
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  locale: 'ru-RU',
});

const noSideScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('phone: projects window, bottom navigation, constructor sheets', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');

  // The projects window opens first and fits the screen.
  const hub = page.getByRole('dialog', { name: 'Проекты' });
  await expect(hub).toBeVisible();
  expect(await noSideScroll(page)).toBe(true);

  // A project made of logic blocks: the wizard works as a full-screen sheet.
  await hub.getByText('Из логических элементов').first().click();
  await hub.getByRole('button', { name: 'Далее' }).click();
  await hub.getByRole('button', { name: 'Создать проект' }).last().click();
  await expect(hub).not.toBeVisible();

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
