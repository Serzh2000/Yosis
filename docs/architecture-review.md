# Архитектурный разбор Yosis и план улучшений

Дата: 2026-10-13. Снимок: ветка `main`, коммит `97e67fa`.

Объём: ~73 тыс. строк TypeScript/CSS (src 59 тыс., server 5 тыс., shared 4.8 тыс., tests 16 тыс.),
402 файла под Git, 596 юнит-тестов, 7 e2e-сценариев.

## Что сделано хорошо

Эти вещи трогать не нужно, план их сохраняет.

- Слои `shared` / `server` / `src` разделены честно: ни одного импорта `src → server`,
  `server → src` или `shared → что-либо`. Валидация проекта одна на клиент и сервер.
- Тулчейн изолирован: каждое задание в дочернем процессе, очередь с ёмкостью, таймаутом,
  лимитами на пользователя и retention на диске. Сервер переживает рестарт с корректным
  статусом «прервано».
- Security-middleware (Host/Origin/Sec-Fetch, HttpOnly guest cookie, If-Match на сохранение)
  написан осознанно и покрыт тестами.
- Тяжёлые панели грузятся лениво, в CI стоит бюджет на стартовый JS и реальный e2e-пайплайн
  (синтез → симуляция → размещение).
- Примеры лаборатории описаны как рецепты: заголовок модуля, `.cst`, урок и готовый стол
  генерируются из одного источника и не расходятся.

## Недостатки по убыванию важности

### 1. `src/App.tsx` — god-компонент

1528 строк, 34 `useState`, 10 `useEffect`, 11 `useCallback/useMemo`. В одном компоненте:
роутинг (`replaceState`/`popstate`), тема, файловые диалоги и удаление с отменой, импорт JSON
и папок Gowin с выбором проекта, навигация «элемент схемы → строка кода» через `editorRef`,
выбор модуля/ячейки нетлиста, уведомление об устаревшем примере, горячие клавиши, рендер
всех десяти вкладок. Любая правка задевает всё, модульно тестировать нечего, а соседние
состояния (`projectSelectionGeneration`, `busyRef`, `pendingNavigation`) синхронизируются
вручную через ref'ы.

### 2. Библиотека примеров попадает в стартовый бандл

Цепочка `useProjectStore → lib/projects.ts → lib/examples.ts` тянет все 243 проекта
(Verilog-тексты, `.cst`, уроки) ради одного `examples[0].project` по умолчанию. В `dist`
чанк `examples-*.js` весит 472 КБ и входит в граф начальной загрузки вместе с
`index-*.js` (370 КБ). Стартовый JS около 850 КБ при бюджете 1 МБ: половина — данные,
которые нужны только в диалоге «Примеры» и в проверке устаревшей копии.

### 3. Три копии жизненного цикла задания на сервере

`server/builds.ts` (462 строки), `server/simulations.ts` (510), `server/physical.ts` (525)
повторяют одно и то же: `Map` записей, `JobQueue`, `JobRetention`, `persist`, `appendLog`
с лимитом 4 МБ, `finish`, `cancel`, `status`, `artifact`, проверка UUID. Одни и те же
константы названы по-разному (`TERMINAL`/`terminal`, `BUILD_ID`/`validId`,
`MAX_LOG_BYTES`/`MAX_LOG`). Остановка дерева процессов через `taskkill` продублирована в
`simulations.ts` и `physical.ts`. Исправление в одном менеджере не попадает в остальные.

### 4. Обход единого HTTP-клиента

`src/lib/api.ts` гарантирует, что гостевая cookie установлена до приватных запросов, и
единообразно разбирает `{error}`. Но прямой `fetch` используют ещё восемь мест:
`hooks/useServerSession.ts` (logout), `lib/server-sync.ts` (удаление проекта, выгрузка
прогресса), `lib/debugger-install.ts`, `lib/debugger-backup-recovery.ts`,
`lib/programming-client.ts`, `components/ChipPanel.tsx`, `components/ProgrammingPanel.tsx`.
Каждое — свой разбор ошибок и возможная гонка с установлением сессии.

### 5. Клиентское хранилище без реестра

12 ключей `localStorage`/`sessionStorage` объявлены в восьми файлах
(`yosis.theme.v1`, `yosis.projects.v1`/`v2`, `yosis.current.v1`, `yosis.build.v1`,
`yosis.physical.v1`, `yosis.learning-course.v1`, `yosis.learning-drafts.v1`,
`yosis.lessons.v1`, `yosis.first-mission.v1`, `yosis.stale-example.dismissed.v1`,
`yosis.debugger-backups`). Try/catch вокруг каждого обращения и разбор JSON повторяются,
версии ключей и миграции нигде не собраны вместе.

### 6. Направление зависимостей `lib → components` нарушено типами

`WorkTab` объявлен в `components/StudioNavigation.tsx` и импортируется в
`lib/studio-route.ts`; `LearningGuide` и `LearningWorkspace` объявлены в
`components/LearningPanel.tsx` и нужны `App.tsx`. Доменные типы живут в UI-файлах, из-за
чего ленивый чанк панели становится зависимостью для кода вне панели.

### 7. CSS: глобальный неймспейс и война специфичности

14 тыс. строк в 29 файлах, 59 токенов в `:root`, но 619 захардкоженных hex-цветов
(`schematic.css` 119, `virtual-board.css` 105, `waveform.css` 86, `lab/lab.css` 79,
`lessons.css` 74). `design.css` держится на селекторе `:root:root … !important`, потому
что стили ленивых панелей подгружаются позже и перебивают общие. Десять разных
брейкпоинтов (630, 750, 760, 850, 900, 1050, 1100, 1200, 1700 px). Тёмная тема для
схем и осциллограмм зависит от того, где hex заменён на переменную, а где нет.

### 8. Лаборатория: ререндер всего стенда каждый кадр

`LabPanel.tsx` в цикле `requestAnimationFrame` делает `setTick` 60 раз в секунду, и
React заново рендерит стол со всеми деталями. `PartBody`, `BusPartBody`, `BoardView` не
мемоизированы. Симулятор работает в главном потоке с бюджетом 7 мс на кадр. Для текущих
примеров хватает, но это потолок роста: больше деталей или лента WS2812B на длинной шине
упрутся в кадр.

### 9. Тесты без разделения на быстрые и интеграционные

27 из 82 файлов тестов поднимают настоящий Yosys, Icarus или Express. `npm test` всегда
гоняет всё; быстрой петли «правка → секунды → результат» нет. Компонентных тестов два
(`project-wizard`, `rtl-symbols`), покрытия нет.

### 10. Контракт ошибок API — локализованная строка

Сервер возвращает `{error: 'русский текст'}`, клиент показывает его как есть. Любая
локализация интерфейса или смена формулировок потребует менять сервер и тесты.
Машиночитаемого `code` нет.

### 11. Воркеры сервера написаны на `.mjs` без типов

`yosys-runner.mjs`, `syntax-runner.mjs`, `physical-yosys-runner.mjs`, `verilog-compat.mjs`,
`worker-ipc.mjs`. Протокол сообщений (`type: 'log' | 'stage' | 'netlist' | …`) объявлен
отдельно в `builds.ts` и неявно в `simulations.ts`, `physical.ts`, `lab.ts`,
`syntax.ts`. Расхождение сторон компилятор не поймает.

### 12. Нет описания архитектуры и автоматических правил слоёв

README описывает папки, но не потоки данных, не правила импортов, не реестр переменных
окружения и ключей хранилища. Правила слоёв держатся на дисциплине, ESLint их не проверяет.

### 13. Гигиена рабочей папки

Данные сервера (`.builds`, `.simulations`, `.physical`, `.users`, `.debugger-backups`) по
умолчанию создаются в корне репозитория (`dataDirectory = workspace`): рядом с исходниками
лежат десятки папок сборок. В корне лежат архивы `z.zip` (467 МБ) и `yosis.7z`; они в
`.gitignore`, но мешают поиску и индексации. `tsconfig.json` наследует tests-конфиг, из-за
чего IDE видит DOM-типы в `server/`.

## План улучшений

Порядок выбран так, чтобы каждая фаза была независимо проверяемой и давала эффект сразу.
Поведение приложения ни в одной фазе не меняется: это рефакторинг.

Проверка после каждой фазы:

```
npm run check
npm run lint
npm run format:check
npm run test:unit      (появится в фазе 0; до этого npm test)
```

После фаз 1, 5 и в конце: `npm run build && npm run check:bundle` и `npm run test:e2e`.

### Фаза 0. Барьеры и документация

1. ESLint, без новых зависимостей:
   - `no-restricted-imports` для `src/lib/**` и `src/hooks/**`: запрет путей, содержащих
     `/components/`.
   - `no-restricted-imports` для `shared/**`: запрет `../src/` и `../server/`.
   - `no-restricted-syntax` для `src/**` кроме `src/lib/api.ts`: запрет
     `CallExpression[callee.name='fetch']` с сообщением «используйте request/… из lib/api».
     Первый прогон покажет нарушения из пункта 4; до фазы 2 пометить их
     `eslint-disable-next-line` с комментарием «фаза 2».
2. Разделить тесты: файлы, которые поднимают Yosys/Icarus/nextpnr/Express, переименовать в
   `*.integration.test.ts`. Скрипты: `test:unit` (`tsx --test tests/*.test.ts tests/*.test.tsx`
   без интеграционных), `test:integration`, `test` = оба. CI оставляет `npm test`.
3. `docs/ARCHITECTURE.md`: три пути проекта (синтез, размещение, лаборатория), слои и правила
   импортов, протокол заданий (`status`/`logOffset`/артефакты), переменные окружения
   (`YOSIS_*`, `IVERILOG_PATH`, `VVP_PATH`, `IVERILOG_LIB`, `PORT`), реестр ключей
   хранилища (заполнится в фазе 3). Ссылка из README.

### Фаза 1. Стартовый бандл без библиотеки примеров

1. Создать `src/lib/starter-project.ts` с единственным стартовым проектом (сегодня это
   `examples[0].project`); `useProjectStore` и `projects.ts` берут его оттуда и не
   импортируют `examples`.
2. `projects.ts` перестаёт реэкспортировать `examples`; потребители (`App.tsx`,
   `ExamplesDialog`, `ProjectHub`, `ProjectLibraryDialog`, `LearningPanel`, `LessonsPanel`,
   `MissionTour`, `example-origin`, `example-catalog`, …) импортируют из
   `lib/examples` напрямую. Те, кто находится в стартовом графе (`App.tsx`, `useBuild`,
   `useSyntaxCheck`, `BuildLogs`), получают данные через `import('./lib/examples')` или
   через уже ленивые панели.
3. `findStaleExampleCopy` в `App.tsx` перевести на ленивую загрузку примеров
   (эффект после `ready`).
4. Проверить манифестом, что `examples-*.js` больше не в графе `index`. Опустить порог в
   `scripts/check-bundle.mjs` до 600 КиБ как регрессионный барьер.

Критерий: стартовый JS меньше 500 КиБ, e2e зелёные.

### Фаза 2. Один HTTP-клиент

1. В `src/lib/api.ts` добавить `requestVoid` (204/пустое тело), `requestRaw` (возвращает
   `Response` после проверки сессии и статуса) и `download` (бинарные артефакты), все через
   тот же гейт `pendingSession`.
2. Перевести восемь мест из пункта 4 на эти функции, снять временные `eslint-disable`.
3. Тест в `tests/api-client.test.ts`: приватный запрос ждёт завершения `/api/session`;
   ошибка `{error}` превращается в `ApiError` с кодом.

### Фаза 3. Реестр клиентского хранилища

1. `src/lib/storage.ts`: объект `STORAGE_KEYS` со всеми ключами и их версиями;
   `readJson<T>(key, parse)` и `writeJson(key, value)` с try/catch и `removeItem`;
   отдельно для `sessionStorage`.
2. Перевести `App.tsx` (тема), `projects.ts`, `example-origin.ts`, `lab/runtime.ts`,
   `learning-course.ts`, `learning-session.ts`, `lessons.ts`, `first-mission.ts`,
   `server-sync.ts`, `debugger-backups.ts`, `MissionTour.tsx`, `LessonsPanel.tsx`,
   `LearningPanel.tsx` на эти функции. Ключи не менять: данные пользователей сохраняются.
3. ESLint: `no-restricted-globals` на `localStorage`/`sessionStorage` вне `storage.ts`.
4. Реестр ключей скопировать в `docs/ARCHITECTURE.md`.

### Фаза 4. Доменные типы из компонентов в `lib`

1. `WorkTab` и список вкладок с подписями: в `src/lib/studio-tabs.ts`;
   `StudioNavigation.tsx` и `studio-route.ts` импортируют оттуда.
2. `LearningGuide`, `LearningWorkspace`: в `src/lib/learning-types.ts`.
3. После этого правило из фазы 0 (`lib` не импортирует `components`) должно проходить без
   исключений.

### Фаза 5. Декомпозиция `App.tsx`

Цель: `App.tsx` меньше 450 строк, только композиция. Хуки в `src/hooks/`, каждый с
юнит-тестом логики, где она есть. Поведение и разметка не меняются, e2e — критерий.

1. `useTheme()` — чтение/запись темы, `data-theme`, `colorScheme`.
2. `useStudioRoute(ready, projectRef, openProject)` — `replaceState` при смене вкладки,
   `popstate`, начальный маршрут; возвращает `workTab`, `setWorkTab`, `lessonId`,
   `setLessonId`, `visited`.
3. `useNetlistView(build, project, workTab)` — `view`, `netlist`, `selectedModule`,
   `selectedCell`, `moduleName`, `hierarchy`, `resources`, `currentCell`, сброс при смене
   вкладки.
4. `useSourceNavigation(projectRef, setWorkTab, setActiveFile)` — `editorRef`,
   `pendingNavigation`, `highlightedSource`, `navigateSource`, `canNavigateSource`.
5. `useProjectFiles(project, setProject, activeFile, …)` — `fileDialog`, `fileError`,
   `submitFile`, `deleteFile`, `deletedFile`/восстановление, `addSchematic`, `openFile`,
   шаблоны новых файлов (вынести в `lib/file-templates.ts`).
6. `useProjectImport(openProject, busyRef)` — импорт JSON, импорт папки Gowin,
   `folderChoice`, оба `input[type=file]` ref'а.
7. `useStaleExample(project, ready)` — кандидат, скрытие, версия уведомления (с ленивой
   загрузкой примеров из фазы 1).
8. Горячие клавиши — `useStudioShortcuts({startBuild, flushSave, onEscape})`.
9. JSX вкладок разнести по файлам-обёрткам: `components/workspaces/CodeWorkspace.tsx`,
   `LogicWorkspace.tsx` (RTL/технология + инспектор), `PinsWorkspace.tsx`,
   `DesignWorkspace.tsx`, остальные вкладки уже являются панелями. Пропсы передавать
   явно; контекст вводить только если у обёртки больше 12 пропсов.
10. `renderEditor` остаётся render-prop, но объявляется в `CodeWorkspace`/`PinsWorkspace`
    через общий компонент `ProjectSourceEditor`, а не в `App`.

### Фаза 6. Базовый класс заданий на сервере

1. `server/job-manager.ts`: абстрактный `JobManager<TResult extends JobResult, TRecord>`
   с общими `records`, `scheduler`, `retention`, `create`-каркасом (uuid, директория,
   `metadata.json`, `logs.txt`, `markJob`), `status`, `get`, `cancel`, `appendLog` с
   лимитом, `finish`, `persist`, `close`, `prune`, валидацией id. Абстрактные методы:
   `start(record)`, `stop(record)`, `artifactNames`.
2. Общие константы в `server/job-constants.ts`: `JOB_ID`, `TERMINAL`, `MAX_LOG_BYTES`.
3. `stopProcess` (включая `taskkill /T`) перенести в `server/process-limits.ts`, убрать
   копии из `simulations.ts` и `physical.ts`.
4. `BuildManager`, `SimulationManager`, `PhysicalManager` наследуют базу; публичный API
   (`create`, `get`, `status`, `cancel`, `artifact`, `health`, `close`, `prune`, `root`)
   не меняется, `server/index.ts` не трогается.
5. Критерий: `tests/backend`, `simulation-backend`, `physical-manager`,
   `server-reliability`, `job-retention-fairness`, `worker-delivery`, `yosys-prewarm`
   проходят без изменений в тестах; суммарный размер трёх менеджеров меньше на 30 %.

### Фаза 7. Протокол воркеров

1. `shared/worker-protocol.ts`: типы сообщений воркера (`WorkerMessage`) и команд к нему.
2. В `.mjs`-воркерах включить `// @ts-check` и типизировать через JSDoc
   `@type {import('../shared/worker-protocol').WorkerMessage}`. `tsconfig.server.json`:
   `allowJs: true, checkJs: true` для `server/*.mjs`.
3. Менеджеры используют общий тип вместо локальных интерфейсов.

### Фаза 8. Производительность стенда лаборатории

1. `React.memo` для `PartBody`, `BusPartBody`, `BoardView` с ключом сравнения по
   `device.view`-версии: устройство увеличивает счётчик `viewVersion` при изменении вида.
2. `setTick` не чаще 30 раз в секунду (накапливать кадры), симуляция по-прежнему каждый
   кадр.
3. Интерфейс `LabRuntime` оформить так, чтобы `advance`/`devices`/`wireState` можно было
   позже вынести в Web Worker: никаких обращений к DOM и React внутри `lib/lab/`.
   Проверить grep'ом, зафиксировать правилом `no-restricted-globals` (`document`,
   `window`) для `src/lib/lab/**`.
4. Критерий: `tests/lab-engine`, `lab-devices`, `lab-part-examples` зелёные; e2e-сценарий
   лаборатории зелёный.

### Фаза 9. CSS: токены и слои

Отдельная фаза, выполняется последней и может быть разбита на части по файлам.

1. `@layer tokens, base, components, panels` в `styles.css`; `design.css` переходит в
   `components`, панельные файлы — в `panels`. Убрать `:root:root` и `!important`,
   которые существовали только ради порядка.
2. Семантические токены для схем, осциллограмм, лаборатории и платы (`--sch-wire`,
   `--sch-gate`, `--wave-high`, `--lab-pad`, …) с версиями для `[data-theme='dark']`.
   Заменить hex в `schematic.css`, `waveform.css`, `virtual-board.css`, `lab.css`,
   `bus-parts.css`, `lessons.css`. Цель: меньше 60 hex во всём `src/**/*.css`.
3. Брейкпоинты свести к четырём (630, 900, 1100, 1700) и задокументировать в
   `ARCHITECTURE.md`.
4. Критерий: e2e `navigation and dialogs stay usable at …px` зелёный на всех ширинах,
   визуальная сверка скриншотов `docs/images` вручную.

### Вне плана (отметить как следующие шаги)

- Машиночитаемые коды ошибок API (`RequestError(message, status, code)`), клиентский
  словарь текстов.
- `LabSim` в Web Worker с `SharedArrayBuffer`.
- `YOSIS_DATA_DIR` по умолчанию в `.data/` вместо корня репозитория (меняет расположение
  существующих данных, нужна миграция).
- Компонентные тесты для панелей с наибольшей логикой (`SimulationPanel`, `PinPlanner`).
