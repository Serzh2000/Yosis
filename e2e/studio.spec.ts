import { test, expect, type Page } from '@playwright/test';

/** A fresh launch shows the projects window; tests that work in the editor close it first. */
async function dismissProjects(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Проекты' });
  await dialog.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
  if (await dialog.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  }
}

/** The app starts on the projects window; tests close it and open it from the header like a pupil. */
async function openProjects(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Проекты' });
  // On a fresh launch the window is loaded lazily: let it appear before deciding what to do.
  await dialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await dialog.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  }
  await page.getByRole('button', { name: 'Создать проект', exact: true }).click();
}

/** The tabs of the real board sit in a collapsed group of the menu: open it if it is closed. */
async function openRealBoardTabs(page: Page) {
  const chip = page.getByRole('tab', { name: /^Кристалл/ });
  if (!(await chip.isVisible())) await page.locator('.sh-tab-group-toggle').click();
}

test('create project, inspect RTL, simulate, place and reload the same workspace', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await openProjects(page);
  const wizard = page.getByRole('dialog', { name: 'Проекты' });
  await expect(wizard).toBeVisible();
  await wizard.getByRole('button', { name: 'На основе примера', exact: false }).click();
  await expect(wizard.getByRole('button', { name: 'Выбрать этот пример' })).toBeInViewport();
  await wizard.getByRole('button', { name: 'Выбрать этот пример' }).click();
  const projectName = `e2e-${Date.now()}`;
  await wizard.getByLabel('Название проекта').fill(projectName);
  await wizard.getByRole('button', { name: 'Далее' }).click();
  await wizard.getByRole('button', { name: 'Создать проект' }).click();
  await expect(wizard).not.toBeVisible();
  await page.getByRole('button', { name: /^Синтезировать/ }).click();
  await expect(page.getByRole('tab', { name: /^RTL · Готово/ })).toBeVisible({ timeout: 90_000 });
  // Editing a built example must invalidate it, and the next build must clear that state.
  const editor = page.getByRole('textbox', { name: 'Editor content', exact: true });
  await editor.press('Control+End');
  await page.keyboard.type('\n// Проверка новой версии исходников\n');
  await expect(page.getByRole('tab', { name: /^RTL · Нужна новая сборка/ })).toBeVisible();
  await page.getByRole('button', { name: /^Синтезировать/ }).click();
  await expect(page.getByRole('tab', { name: /^RTL · Готово/ })).toBeVisible({ timeout: 90_000 });
  await page.getByRole('tab', { name: /^RTL/ }).click();
  await expect(page.getByRole('tabpanel')).toBeVisible();
  await expect(page.getByRole('group', { name: /^Схема модуля/ })).toBeVisible();
  await expect(
    page.getByText('Исходники изменены. Схема относится к предыдущей сборке.', { exact: true }),
  ).not.toBeVisible();
  await page.getByRole('tab', { name: /^Диаграммы/ }).click();
  await page.getByRole('button', { name: 'Симулировать', exact: true }).click();
  await expect(page.locator('.waveform-track-svg').first()).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Показать led в RTL', exact: true }).last().click();
  await expect(page.getByRole('tab', { name: /^RTL/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.schematic-node.source-highlighted').first()).toBeVisible();
  expect(await page.locator('.schematic-edge.is-highlighted').count()).toBeGreaterThan(0);
  await page.getByRole('tab', { name: /^Выводы/ }).click();
  await page.getByRole('button', { name: 'led', exact: true }).click();
  // The pad picks the contact; a click on its printed names opens their explanation instead.
  await page
    .getByRole('button', { name: /^Вывод 16 ·/ })
    .locator('rect')
    .click();
  await page.getByRole('button', { name: 'Назначить', exact: true }).click();
  await expect(
    page.getByText('led → 16. Назначение записано в board.cst.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'led', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Текст .cst', exact: true }).click();
  await page.getByRole('textbox', { name: 'Editor content', exact: true }).press('Control+End');
  await expect(page.locator('.pin-text-editor .view-lines')).toContainText(/IO_LOC\s+"led"\s+16;/);
  await page.getByRole('button', { name: /^Синтезировать/ }).click();
  await expect(page.getByRole('tab', { name: /^RTL · Готово/ })).toBeVisible({ timeout: 90_000 });
  await openRealBoardTabs(page);
  await page.getByRole('tab', { name: /^Кристалл/ }).click();
  const place = page.getByRole('button', { name: 'Разместить и собрать', exact: true });
  await expect(place).toBeEnabled({ timeout: 90_000 });
  await place.click();
  await expect(
    page.getByRole('img', { name: 'Тепловая карта размещённых элементов FPGA' }),
  ).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole('tab', { name: /^Кристалл · Готово/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab', { name: /^Кристалл/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.project-switcher')).toHaveText(projectName);
  const originalId = new URL(page.url()).searchParams.get('project');
  // Server sync is one of the project actions in the «Проекты» window.
  await openProjects(page);
  await page
    .getByRole('dialog', { name: 'Проекты' })
    .getByRole('button', { name: 'Синхронизация', exact: true })
    .click();
  const serverDialog = page.getByRole('dialog', { name: 'Проекты и прогресс на сервере' });
  await serverDialog
    .getByRole('button', { name: `Сохранить «${projectName}» на сервере`, exact: true })
    .click();
  await expect(
    serverDialog.getByText('Проект сохранён на сервере.', { exact: true }),
  ).toBeVisible();
  await serverDialog
    .locator('.saved-project-row > button')
    .filter({ hasText: projectName })
    .click();
  await expect(serverDialog).not.toBeVisible();
  await expect(page.getByRole('tab', { name: /^Код/ })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => new URL(page.url()).searchParams.get('project')).not.toBe(originalId);
  expect(errors).toEqual([]);
});

test('editor checks changed Verilog before a full synthesis', async ({ page }) => {
  await page.goto('/?tab=code');
  await dismissProjects(page);
  const editor = page.getByRole('textbox', { name: 'Editor content', exact: true });
  await editor.press('Control+Home');
  await page.keyboard.type('.');
  await expect(page.getByText('Проверьте ошибки в коде', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await editor.press('Control+Z');
  await expect(page.getByText('Синтаксис проверен', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
});

for (const width of [1024, 1366]) {
  test(`navigation and dialogs stay usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto('/?tab=lessons');
    await dismissProjects(page);
    // The file panel is hidden on most tabs, but the tab bar must not shift when switching.
    const firstTab = page.getByRole('tab', { name: /^Код/ });
    const before = await firstTab.boundingBox();
    // The tabs of the real board sit in a collapsed group.
    await page.locator('.sh-tab-group-toggle').click();
    await page.getByRole('tab', { name: /^Подключение/ }).click();
    expect((await firstTab.boundingBox())?.x).toBe(before?.x);
    await page.getByRole('tab', { name: /^Код/ }).click();
    expect((await firstTab.boundingBox())?.x).toBe(before?.x);
    await expect(page.getByRole('button', { name: 'Файлы проекта', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: /^Код/ }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('tab', { name: /^Выводы/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await openProjects(page);
    const dialog = page.getByRole('dialog', { name: 'Проекты' });
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds?.width).toBe(width);
    expect(bounds?.height).toBe(768);
    await dialog.getByRole('button', { name: /^На основе примера/ }).click();
    const grid = await dialog.getByLabel('Примеры в учебном порядке').boundingBox();
    expect(grid?.height).toBeGreaterThan(768 / 2);
    await expect(dialog.getByRole('button', { name: 'Выбрать этот пример' })).toBeInViewport();
    await dialog.getByRole('button', { name: /^Все уровни/ }).click();
    await expect(dialog.locator('.example-card')).toHaveCount(275);
    await dialog.getByRole('button', { name: 'К выбору начала', exact: true }).click();
    await expect(dialog.getByRole('button', { name: /^Из логических элементов/ })).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Создать проект', exact: true })).toBeFocused();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });
}

test('graphical source is editable, reloadable and follows the real synthesis, simulation and bitstream pipeline', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await openProjects(page);
  const wizard = page.getByRole('dialog', { name: 'Проекты' });
  await wizard.getByRole('button', { name: /^Из логических элементов/ }).click();
  const name = `circuit-${Date.now()}`;
  await wizard.getByLabel('Название проекта').fill(name);
  await wizard.getByRole('button', { name: 'Далее', exact: true }).click();
  await wizard.getByRole('button', { name: 'Создать проект', exact: true }).click();
  await expect(page.getByRole('tab', { name: /^Конструктор/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  // Новый проект начинается с пустого поля; готовая схема открывается из «Примеров».
  const editor = page.getByRole('tabpanel');
  await expect(editor.getByText(/0 элементов · 0 проводов/).first()).toBeVisible();
  await editor.getByRole('button', { name: 'Примеры', exact: true }).first().click();
  await page.getByRole('button', { name: 'Открыть', exact: true }).first().click();
  await expect(editor.getByText(/2 элементов · 1 проводов/).first()).toBeVisible();
  // Свойства и проблемы лежат на холсте карточкой и по умолчанию закрыты.
  await editor.getByRole('button', { name: 'Свойства и проблемы' }).click();
  await expect(editor.getByText('Схема готова к сборке', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'И (AND)', exact: true }).click();
  await expect(editor.getByText(/3 элементов · 1 проводов/).first()).toBeVisible();
  await expect(editor.getByText('Схема готова к сборке', { exact: true })).toHaveCount(0);
  await editor.getByRole('button', { name: 'Отменить (Ctrl+Z)' }).click();
  await expect(editor.getByText(/2 элементов · 1 проводов/).first()).toBeVisible();
  await expect(editor.getByText('Схема готова к сборке', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Повторить (Ctrl+Y)' }).click();
  await expect(editor.getByText(/3 элементов · 1 проводов/).first()).toBeVisible();
  await editor.getByRole('button', { name: 'Отменить (Ctrl+Z)' }).click();
  await editor.getByRole('button', { name: 'Verilog', exact: true }).click();
  await expect(page.getByLabel('Verilog из схемы')).toContainText('module top');
  await editor.getByRole('button', { name: 'Вернуться к схеме', exact: true }).click();
  const scale = editor.getByLabel('Текущий масштаб');
  const initialScale = Number((await scale.innerText()).replace('%', ''));
  await editor.getByRole('button', { name: 'Увеличить масштаб (+)' }).click();
  expect(Number((await scale.innerText()).replace('%', ''))).toBeGreaterThan(initialScale);
  await editor.getByRole('button', { name: 'Показать всю схему (F)' }).click();
  await expect(page.getByText('Изменения сохранены в браузере', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/^Элемент led0:/)).toBeVisible();
  await page.getByRole('button', { name: /^Синтезировать/ }).click();
  await expect(page.getByRole('tab', { name: /^RTL · Готово/ })).toBeVisible({ timeout: 90000 });
  await page.getByRole('tab', { name: /^Диаграммы/ }).click();
  await page.getByRole('button', { name: 'Симулировать', exact: true }).click();
  await expect(page.locator('.waveform-track-svg').first()).toBeVisible({ timeout: 60000 });
  await page.getByRole('tab', { name: /^Выводы/ }).click();
  const pinZoom = page.getByRole('group', { name: /^Масштаб: Назначение портов/ });
  await pinZoom.getByRole('button', { name: 'Увеличить масштаб' }).click();
  await expect(pinZoom.getByLabel('Текущий масштаб')).toHaveText('125%');
  await openRealBoardTabs(page);
  await page.getByRole('tab', { name: /^Кристалл/ }).click();
  const place = page.getByRole('button', { name: 'Разместить и собрать', exact: true });
  await expect(place).toBeEnabled({ timeout: 90000 });
  await place.click();
  await expect(
    page.getByRole('img', { name: 'Тепловая карта размещённых элементов FPGA' }),
  ).toBeVisible({ timeout: 120000 });
  expect(errors).toEqual([]);
});

test('constructor tab of a Verilog project explains the conflict and opens the element wizard', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?tab=design');
  await dismissProjects(page);
  const empty = page.getByTestId('no-schematic');
  await expect(empty.getByRole('heading', { name: 'В этом проекте нет схемы' })).toBeVisible();
  await expect(empty).toContainText('уже есть файл top.v');
  await expect(empty.getByRole('button', { name: 'Добавить схему в этот проект' })).toHaveCount(0);
  await empty.getByRole('button', { name: 'Новый проект из элементов' }).click();
  const wizard = page.getByRole('dialog', { name: 'Проекты' });
  await expect(wizard.getByLabel('Название проекта')).toBeVisible();
  await wizard.getByLabel('Название проекта').fill(`from-elements-${Date.now()}`);
  await wizard.getByRole('button', { name: 'Далее', exact: true }).click();
  await wizard.getByRole('button', { name: 'Создать проект', exact: true }).click();
  await expect(page.getByRole('tab', { name: /^Конструктор/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByTestId('no-schematic')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'И (AND)', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('laboratory runs the design, puts a part on a breadboard and edits it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?tab=virtual');
  await dismissProjects(page);
  const lab = page.getByRole('region', { name: 'Лаборатория' }).last();
  // The starter project is combinational: it runs without a clock on pin 4.
  await expect(lab.getByRole('status').first()).toContainText('Время на плате', {
    timeout: 60_000,
  });
  // The bench is one WebGL scene, so parts are worked with through the list and the side panel.
  await expect(lab.getByRole('application', { name: /Монтажный стол/ })).toBeVisible();
  await lab.getByRole('button', { name: 'Добавить деталь: Макетная плата', exact: true }).click();
  await lab.getByRole('button', { name: 'Добавить деталь: Светодиод', exact: true }).click();
  const card = lab.getByRole('region', { name: 'Выбранное' });
  await expect(card.getByRole('heading', { name: 'Светодиод' })).toBeVisible();
  // A part has a plus and a minus, and nothing is wired to them yet.
  await expect(card.getByText('не подключён')).toHaveCount(3);
  // The properties window: changes show at once.
  await card.getByRole('button', { name: /Свойства/ }).click();
  const properties = page.getByRole('dialog', { name: 'Свойства детали' });
  await properties.getByRole('radio', { name: 'Синий' }).click();
  await expect(properties.getByRole('radio', { name: 'Синий' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await properties.getByRole('button', { name: 'Готово' }).click();
  await expect(properties).toHaveCount(0);
  // Remove the part, bring it back with undo, then clear the whole bench.
  await card.getByRole('button', { name: 'Убрать деталь' }).click();
  await expect(card.getByRole('heading', { name: 'Как пользоваться' })).toBeVisible();
  await lab.getByRole('button', { name: 'Отменить', exact: true }).click();
  await lab.getByRole('button', { name: 'Убрать всё со стола' }).click();
  await page
    .getByRole('dialog', { name: 'Убрать всё со стола?' })
    .getByRole('button', { name: 'Убрать всё' })
    .click();
  await expect(lab.getByText(/встанет на макетную плату/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the app starts on the «create a project» window', async ({ page }) => {
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Проекты' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'С чего начнём?' })).toBeVisible();
});

test('reloading a page with a project open returns to the work, not to the projects window', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('dialog', { name: 'Проекты' }).waitFor();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Проекты' })).not.toBeVisible();
  await expect(page).toHaveURL(/project=/);
  await page.reload();
  await expect(page.getByRole('button', { name: /^Синтезировать/ })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Проекты' })).not.toBeVisible();
});
