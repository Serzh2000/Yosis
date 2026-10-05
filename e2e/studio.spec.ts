import { test, expect, type Locator } from '@playwright/test';

test('create project, inspect RTL, simulate, place and reload the same workspace', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Создать проект', exact: true }).click();
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
  await page.getByRole('button', { name: 'Создать проект', exact: true }).click();
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
    // The file panel is hidden on most tabs, but the tab bar must not shift when switching.
    const firstTab = page.getByRole('tab', { name: /^Код/ });
    const before = await firstTab.boundingBox();
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
    await page.getByRole('button', { name: 'Создать проект', exact: true }).click();
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
    await expect(dialog.locator('.example-card')).toHaveCount(243);
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
  await page.getByRole('button', { name: 'Создать проект', exact: true }).click();
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
  // Стартовая схема: button → invert → led_n. Новый элемент без связей — это проблема на схеме.
  const editor = page.getByRole('tabpanel');
  await expect(editor.getByText(/3 элементов · 2 проводов/)).toBeVisible();
  await expect(editor.getByText('Схема готова к сборке', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'И (AND)', exact: true }).click();
  await expect(editor.getByText(/4 элементов · 2 проводов/)).toBeVisible();
  await expect(editor.getByText('Схема готова к сборке', { exact: true })).toHaveCount(0);
  await editor.getByRole('button', { name: 'Отменить (Ctrl+Z)' }).click();
  await expect(editor.getByText(/3 элементов · 2 проводов/)).toBeVisible();
  await expect(editor.getByText('Схема готова к сборке', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Повторить (Ctrl+Y)' }).click();
  await expect(editor.getByText(/4 элементов · 2 проводов/)).toBeVisible();
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
  await expect(page.getByLabel(/^Элемент invert:/)).toBeVisible();
  await page.getByRole('button', { name: /^Синтезировать/ }).click();
  await expect(page.getByRole('tab', { name: /^RTL · Готово/ })).toBeVisible({ timeout: 90000 });
  await page.getByRole('tab', { name: /^Диаграммы/ }).click();
  await page.getByRole('button', { name: 'Симулировать', exact: true }).click();
  await expect(page.locator('.waveform-track-svg').first()).toBeVisible({ timeout: 60000 });
  await page.getByRole('tab', { name: /^Выводы/ }).click();
  const pinZoom = page.getByRole('group', { name: /^Масштаб: Назначение портов/ });
  await pinZoom.getByRole('button', { name: 'Увеличить масштаб' }).click();
  await expect(pinZoom.getByLabel('Текущий масштаб')).toHaveText('125%');
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

test('laboratory runs the design, wires a part to the board and reports an unassigned contact', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?tab=virtual');
  const lab = page.getByRole('region', { name: 'Лаборатория' }).last();
  // The starter project is combinational: it runs without a clock on pin 4.
  await expect(lab.getByRole('status').first()).toContainText('на плате прошло', {
    timeout: 60_000,
  });
  await lab.getByRole('button', { name: 'Добавить деталь: Светодиод', exact: true }).click();
  const led = lab.getByRole('group', { name: 'Светодиод', exact: true });
  const pin = lab.getByRole('button', { name: 'Светодиод, вывод A', exact: true });
  // The bench is scaled to fit, so the middle of a part is found from its box.
  const middle = async (part: Locator) => {
    const box = (await part.boundingBox())!;
    return { x: box.width / 2, y: box.height / 2 };
  };
  // The properties window: a double click opens it, changes show at once.
  await led.dblclick({ position: await middle(led) });
  const properties = page.getByRole('dialog', { name: 'Свойства детали' });
  await properties.getByRole('radio', { name: 'Синий' }).click();
  await expect(properties.getByRole('radio', { name: 'Синий' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await properties.getByRole('button', { name: 'Готово' }).click();
  await expect(properties).toHaveCount(0);
  // The context menu rotates: pins move from the bottom to the left.
  await expect(led).toHaveClass(/rot-0/);
  await led.click({ button: 'right', position: await middle(led) });
  await page.getByRole('menuitem', { name: /^Повернуть по часовой/ }).click();
  await expect(led).toHaveClass(/rot-90/);
  // Wiring by two clicks: the pin, then the contact.
  await pin.click();
  await expect(lab.getByText(/Теперь нажмите контакт на гребёнке платы/)).toBeVisible();
  await lab.getByRole('button', { name: 'Контакт платы 15', exact: true }).click();
  await expect(lab.getByText(/идёт из схемы в деталь/)).toBeVisible();
  // A second jumper to a contact no signal uses is drawn but flagged.
  await pin.click();
  await lab.getByRole('button', { name: 'Контакт платы 75', exact: true }).click();
  await expect(lab.getByText('Контакт 75 не назначен ни одному сигналу схемы.')).toBeVisible();
  await expect(lab.getByRole('group', { name: 'Назначить сигнал контакту 75' })).toBeVisible();
  await lab.getByRole('button', { name: 'Убрать провод' }).click();
  // Delete removes the selected part, Ctrl+Z brings it back.
  await led.click({ position: await middle(led) });
  await page.keyboard.press('Delete');
  await expect(pin).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(pin).toHaveCount(1);
  await lab.getByRole('button', { name: 'Убрать всё со стола' }).click();
  await page
    .getByRole('dialog', { name: 'Убрать всё со стола?' })
    .getByRole('button', { name: 'Убрать всё' })
    .click();
  await expect(pin).toHaveCount(0);
  expect(errors).toEqual([]);
});
