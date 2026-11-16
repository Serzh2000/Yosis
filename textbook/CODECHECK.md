# Проверка кода книги в конвейере Logra

Скрипт: `textbook/tools/check_code.mjs`. Запуск (приложение уже работает: API на :3001, Icarus в `.tools/iverilog`):

    node textbook/tools/check_code.mjs                       # всё
    node textbook/tools/check_code.mjs --only "^code/0[1-4]"  # --only: регулярное выражение по id единицы
    API=http://127.0.0.1:3001 node textbook/tools/check_code.mjs

Что делает скрипт для каждой единицы проверки:

* **Синтезируемый модуль** (`.v` из `code/**`, `code-en/**`, целые модули из `\begin{vcode}` в `tex/` и `tex-en/`;
  если в файле несколько модулей, каждый неинстанцированный проверяется как `top`):
  `POST /api/builds` (тот же Yosys 0.70 YoWASP, что у кнопки «Синтезировать»: RTL + `synth_gowin`),
  требует статус `success`, `rtl.json` с модулем `top`, `technology.json`, ноль диагностик уровня error;
  `POST /api/syntax` (проверка при наборе); `POST /api/simulations` с минимальным сценарием
  (нормализованный RTL проходит через Icarus; пропускается для `inout`);
  для проектов с `.cst` ещё `POST /api/physical` (nextpnr, 27 МГц).
* **Тестбенч** `tb_*.v`: Icarus напрямую (`iverilog -g2012`, `vvp`) вместе с модулями той же папки;
  в выводе должно быть `OK` и не должно быть `ОШИБОК`/`FAIL`/`ERROR`.
* **Фрагменты** глав, не являющиеся модулями (строки `assign`, куски `always`, `reg ...`): оборачиваются
  в минимальный модуль `frag` (таблица `WRAPPERS` в скрипте). Однострочники из `\code{...}`: таблица `INLINE`.
  Листинг, разбитый на два блока `vcode` (модуль `guard_panel`), склеивается.
* Результаты: `textbook/build/codecheck/results*.json` (временные, не в репозиторий), таблица в консоли, код выхода 1 при ошибках.

Замечание: сервер делит очередь между всеми запросами (лимит 429 «Очередь заполнена»); скрипт повторяет запрос.
Не запускайте несколько копий одновременно: проверки начинают превышать время ожидания.

## Результат

Проверено (первый полный прогон до правок): 70 единиц + 19 однострочников + 22 тестбенча/модуля на английской стороне
в той же группе; всё, что есть в `code/**` и `code-en/**` (русские и английские файлы идентичны по коду),
листинги глав `tex/` и `tex-en/`. **Ошибок книги, из-за которых RTL не синтезируется, не найдено.**
Единственная неудача, действительно относящаяся к коду книги: `08_uart/tb_uart.v` не компилировался в режиме `-g2012`.

| Файл / листинг | RTL (Yosys) | Gowin | syntax | PnR (.cst) | Симуляция | Причина / что исправлено |
|---|---|---|---|---|---|---|
| `00_theory/*.v` (counter4, decoder2to4, dff_vs_latch, fifo8, full_adder, hamming74, io_pad, pwm_dac, sar_adc [sar_adc, sar_demo], traffic_fsm, vending) | OK | OK | OK | - | OK (io_pad: inout, пропуск) | Предупреждения только намеренные: `dff_vs_latch` (латч, пример «латч против триггера»), `io_pad` (tri-state) |
| `00_theory/tb_fifo8, tb_hamming74, tb_sar_adc, tb_vending` | - | - | - | - | OK (печатают OK) | - |
| `01_gates/gates.v` | OK | OK | OK | OK | - | - |
| `01_gates/tb_gates.v`, `02_blink/tb_blink.v` | - | - | - | - | OK (таблица / монитор) | печатают таблицу, а не OK, так задумано |
| `02_blink`, `03_running_lights`, `04_button_edge`, `05_traffic_light`, `06_pwm_breath`, `07_mux_demux` | OK | OK | OK | OK | - | - |
| `08_uart/uart.v` (uart_demo; uart_tx, uart_rx в составе) | OK | OK | OK | - | OK | - |
| `08_uart/tb_uart.v` | - | - | - | - | **FAIL при `-g2012`**, затем OK | A: переменная `expect` является ключевым словом SystemVerilog; в режиме `iverilog -g2005` (как в книге) работало, под `-g2012` (как симулятор Logra) синтаксическая ошибка. **Исправлено:** `expect` переименована в `want` в `code/` и `code-en/`; теперь `uart: OK, принято 196 байт` |
| `09_cpu/tiny_cpu.v`, `tb_tiny_cpu.v` | OK | OK | OK | - | OK (Фибоначчи) | - |
| `10_clocks/sync2ff.v` (sync2ff, debounce), `tb_debounce.v` | OK | OK | OK | - | OK | - |
| Листинги глав `05_verilog` (half_adder, full_adder + half_adder), `a1_cheatsheet` | OK / шаблон | OK | OK | - | OK | `a1_cheatsheet` не модуль, а шаблон с `...` (C) |
| `05a_bridge` `guard_panel` (два блока `vcode`) | OK | OK | OK | - | OK | собран из двух половин, вместе проходит |
| Фрагменты в обёртке: `assign y=...`, шины, `case`, счётчик, обмен `a<=b`, `if(reset)`, `tick` (07a), заголовок `module top` SDRAM | OK | OK | OK | - | OK | предупреждение `counter used but no driver` для фрагмента про шины: это артефакт обёртки (в фрагменте `counter` только объявлен) |
| 19 однострочников из `\code{...}` (`{co,s}=a+b+ci`, `y=d[s]`, `pin=oe?d:1'bz`, `{ba,row,col}=addr` и др.) | OK | OK | OK | - | OK | для `pin = oe ? d : 1'bz` Yosys предупреждает про ограниченную поддержку tri-state (ожидаемо) |
| Новые папки `code/05_verilog`, `05a_bridge`, `b*_*` (добавлены другими агентами во время проверки) | см. ниже | | | | | скрипт подхватывает их автоматически; на момент этого отчёта прогнаны `05_verilog`, `05a_bridge`, `code/0*`: все проходят (латч `pitfalls.v#latch_bad` намеренный) |

Итог повторной проверки после правок: `tb_uart` OK в обеих папках; все примеры `code/01..07` с `.cst` проходят RTL + Gowin + syntax + nextpnr; все `tb_*` печатают OK.

## Почему могло казаться, что «RTL не синтезируется»

1. **Тестбенчи.** Если загрузить `tb_*.v` во вкладку «Код» как верхний модуль, Logra вернёт ошибку
   (`System task $finish executed`, `Ignoring call to system task $dumpfile/$monitor/$display`): тестбенч с `initial`,
   `#10` и `$finish` не синтезируется, это случай C. Проверено на `tb_gates`, `tb_blink`, `tb_uart`: статус `error`, RTL нет.
   В тексте главы 7 говорилось о запрещённых для синтеза конструкциях, но не было прямой фразы, что `tb_*.v` нельзя класть
   в Logra. **Добавлен абзац** после списка конструкций в `tex/chapters/07_simulation.tex` и `tex-en/chapters/07_simulation.tex`:
   тестбенч запускается через `iverilog`/`vvp`, а для Logra служит вкладка «Диаграммы».
2. **Фрагменты глав** (`always @(posedge clk) ...`, `module top (` с одним списком портов, `module blink #(...) (...)`):
   это куски, а не файлы; в обёртке они синтезируются (см. таблицу), сами по себе нет (C).
3. Копирование из PDF: в главе подключён `codecopy.tex` (`/ActualText`), в `.v`-файлах нет не-ASCII символов вне комментариев и строк тестбенчей.

## Дефекты приложения (B)

Конструкций книги, которые допустимы, но Yosys/Logra не принимает, **не найдено**. Замечания (не блокируют):

* **Шум журнала Yosys.** В `logs` каждой сборки остаётся
  `Lexer warning: The SystemVerilog keyword 'bit' (at /share/abc9_map.v:35) is not recognized unless read_verilog is called with -sv!`
  и `ABC: Warning: The network is combinational.` (служебные файлы самого Yosys). `parseDiagnostics` в `server/validation.ts`
  их отфильтровывает (`/share/`, `network is combinational`), в диагностиках ученика их нет; видны только в полном журнале.
  Воспроизведение: `POST /api/builds` с любым модулем, смотреть поле `logs`.
* **Пустой/комбинационный верх.** `module top(...)` без тела (заголовок из главы про SDRAM) даёт в журнале
  `Selection "top" did not match any module` и `No modules selected for ABC9 techmapping`, сборка при этом `success`.
* **Параллельная нагрузка.** Очередь заданий пользователя ограничена: при 3 одновременных сборках с симуляциями
  `POST /api/builds` отвечает `429 Очередь заполнена`; `POST /api/syntax` отвечает `Проверка заменена новым изменением`,
  если подряд присланы два запроса одного пользователя. Для клиента UI это нормально, для скриптов нужен повтор (он есть в `check_code.mjs`).
* Симуляция Logra (`/api/simulations`) не принимает `inout`-порты верхнего модуля (`io_pad`): сообщение сервера прямо говорит,
  что нужен отдельный testbench. Это по замыслу.

## Пропущенные фрагменты (C)

Не проверяются на синтез и по замыслу не предназначены для него:

* `tex*/04_flow.tex` (две строки `bash`, два блока `text`), `07_simulation.tex` (команды `iverilog`/`vvp`, вывод симулятора), `b5a_electrical.tex` (блок `text`), `05_verilog.tex` (блок `text`): не Verilog.
* `05_verilog.tex`, `localparam integer CLK_HZ = ...; module blink #(...) (...)`: пояснение с `(...)`, псевдокод.
* `a1_cheatsheet.tex`: шаблон модуля с `...` (`case ... default: ...;`, `.out(...)`).
* Тестбенч в тексте `05_verilog.tex` (`tb_full_adder`): запускается Icarus, а не синтезатором (оформлен как тестбенч).
* Списки номеров листингов могут меняться, пока другие агенты правят главы; точный перечень печатает скрипт (`skip ...`) в конце прогона.

## Что изменено

* `textbook/code/08_uart/tb_uart.v` и `textbook/code-en/08_uart/tb_uart.v`: `expect` -> `want`.
* `textbook/tex/chapters/07_simulation.tex`, `textbook/tex-en/chapters/07_simulation.tex`: абзац про то, что `tb_*.v` не для вкладки «Код».
* Листинги глав (`vfile`) подключают файлы `code*/` напрямую, поэтому после правки `tb_uart.v` расхождений нет; `tb_uart.v` в главах не печатается, ссылок на его строки нет.
* Новый скрипт `textbook/tools/check_code.mjs`, этот отчёт.
