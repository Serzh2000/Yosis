# Архитектура Yosis

Документ описывает, как устроен проект: три пути проекта через инструменты, слои кода и правила
импортов, протокол заданий сервера, переменные окружения и реестр ключей браузерного хранилища.
Разбор недостатков и план улучшений лежат в [architecture-review.md](architecture-review.md).

## Слои

```
shared/   типы и чистая логика, одинаковые на клиенте и сервере (валидация проекта, схемы, лаборатория)
server/   Express-сервер, очереди заданий, дочерние процессы Yosys, Icarus, nextpnr
src/      клиент: React + Vite
  lib/        логика без React и без DOM-компонентов (проекты, примеры, симулятор лаборатории)
  hooks/      состояние приложения поверх lib
  components/ интерфейс
tests/    node:test; e2e/ — Playwright
```

Правила импортов проверяет ESLint (`npm run lint`):

| Откуда                        | Куда нельзя           | Почему                                   |
| ----------------------------- | --------------------- | ---------------------------------------- |
| `shared/**`                   | `src/**`, `server/**` | общий код не знает, кто его вызывает     |
| `src/lib/**`, `src/hooks/**`  | `src/components/**`   | доменная логика не зависит от интерфейса |
| `src/**` (кроме `lib/api.ts`) | глобальный `fetch`    | все запросы идут через единый клиент     |

Ни `src → server`, ни `server → src` не бывает: клиент и сервер общаются только по HTTP и через
типы из `shared/`.

## Три пути проекта

Проект — это `Project` из `shared/types.ts`: имя, верхний модуль, плата и список файлов
(`.v`, `.sv`, `.ysch`, `.cst`, данные памяти). `shared/project-validation.ts` проверяет его
одинаково в браузере и на сервере.

1. **Синтез (RTL и Gowin).** `POST /api/builds` → `BuildManager` → `yosys-runner.mjs` в дочернем
   процессе (YoWASP). Схемы `.ysch` сначала превращаются в Verilog (`materializeCircuitProject`).
   Результат: `rtl.json` и `technology.json` — нетлисты, по которым клиент рисует схемы.
2. **Размещение и битстрим.** `POST /api/physical` → `PhysicalManager` берёт нетлист успешной
   сборки, запускает `physical-yosys-runner.mjs`, затем nextpnr и упаковщик Gowin. Результат:
   отчёт, карта занятости, `.fs`. Загрузка в плату идёт из браузера по WebUSB или через
   локальный помощник (`server/programming-helper.ts`).
3. **Симуляция.** `POST /api/simulations` → `SimulationManager` генерирует тестбенч
   (`simulation-testbench.ts`), компилирует Icarus Verilog и возвращает VCD для временных
   диаграмм.

Лаборатория — четвёртый, облегчённый путь: `POST /api/lab` (`LabManager`) превращает проект в
вентили и триггеры, а исполняет их браузерный симулятор `src/lib/lab/`. Проверка синтаксиса на
лету — `POST /api/syntax` (`SyntaxManager`). Обе операции используют `JobQueue`, но ничего не
пишут на диск.

## Протокол заданий

Три менеджера с диском (`builds`, `simulations`, `physical`) работают одинаково и повторяют
один жизненный цикл:

- `create` резервирует место в очереди, создаёт папку `<корень>/<uuid>/` с `metadata.json`,
  `logs.txt` и маркером `.yosis-job`, затем ставит задание в очередь.
- Очередь (`JobQueue`) ограничена ёмкостью, числом одновременных заданий
  (`YOSIS_BUILD_CONCURRENCY` и аналоги) и таймаутом.
- Статус: `GET /api/<вид>/:id/status?logOffset=N` возвращает метаданные без тяжёлых полей,
  кусок журнала начиная с `logOffset`, `nextLogOffset` и `logReset`. Статусы:
  `queued` → `running` → `success` | `error` | `cancelled`.
- Артефакты: `GET /api/<вид>/:id/artifacts/:name` из белого списка имён.
- Отмена: `POST /api/<вид>/:id/cancel`.
- Хранение: `JobRetention` удаляет старые задания по числу, возрасту и объёму, справедливо между
  пользователями. После рестарта сервиса незавершённые задания получают статус «прервано».
- Журнал ограничен 4 МБ; превышение завершает задание ошибкой.

## Переменные окружения

| Переменная                                                                              | Назначение                                                      |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `PORT`, `YOSIS_API_PORT`                                                                | порт сервера (по умолчанию 3001; `YOSIS_API_PORT` приоритетнее) |
| `YOSIS_LISTEN_HOST`                                                                     | адрес прослушивания (по умолчанию `127.0.0.1`)                  |
| `YOSIS_API`                                                                             | адрес API для dev-прокси и e2e                                  |
| `YOSIS_WORKSPACE`                                                                       | корень репозитория (определяется по расположению файлов)        |
| `YOSIS_DATA_DIR`                                                                        | где хранить `.builds`, `.simulations`, `.physical`, `.users`    |
| `YOSIS_STANDALONE`                                                                      | `1` — локальный режим без входа                                 |
| `YOSIS_PUBLIC_ORIGIN`                                                                   | публичный адрес для проверки Origin/Host                        |
| `YOSIS_USERS_JSON`                                                                      | пользователи и токены школьного режима                          |
| `YOSIS_TRUSTED_PROXY_HOPS`                                                              | число доверенных прокси для определения адреса клиента          |
| `YOSIS_MAX_USER_JOBS`, `YOSIS_MAX_JOBS_PER_HOUR`                                        | лимиты заданий на пользователя                                  |
| `YOSIS_BUILD_CONCURRENCY`, `YOSIS_SIMULATION_CONCURRENCY`, `YOSIS_PHYSICAL_CONCURRENCY` | параллельные задания, 1–8                                       |
| `YOSIS_JOB_RETAIN_COUNT`, `YOSIS_JOB_RETAIN_DAYS`, `YOSIS_JOB_RETAIN_MB`                | политика хранения заданий                                       |
| `YOSIS_PREWARM`                                                                         | `0` — не держать прогретый воркер Yosys                         |
| `YOSIS_IVERILOG`, `YOSIS_VVP`, `IVERILOG_PATH`, `VVP_PATH`, `IVERILOG_LIB`              | пути к Icarus Verilog                                           |
| `YOSIS_NEXTPNR`, `YOSIS_GOWIN_PACK`, `YOSIS_PYTHON`                                     | пути к nextpnr и упаковщику Gowin                               |
| `YOSIS_OPENFPGALOADER`, `YOSIS_GOWIN_PROGRAMMER`                                        | программаторы для локального помощника                          |
| `YOSIS_DOWNLOAD_URL`, `YOSIS_DOWNLOAD_FILE`                                             | источник архивов для скриптов `setup:*`                         |
| `YOWASP_CACHE_DIR`                                                                      | кэш скомпилированного WebAssembly Yosys                         |

## Брейкпоинты CSS

Описываются после сведения медиазапросов (фаза 9 плана).
