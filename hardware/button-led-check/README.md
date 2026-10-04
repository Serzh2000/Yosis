# Проверка кнопок и светодиодов Tang Nano 20K

Схема должна сразу реагировать на две встроенные кнопки: без нажатий светится только LED5. Тактовый генератор, SDRAM и внешние провода не нужны. Такое поведение подтверждено в Icarus, но на подключённой плате новая конфигурация пока не заработала: пользователь видит все шесть LED. [Результаты диагностики](../README.md).

| Нажатие | Светящиеся LED | Маска света LED5…LED0 | Выход `led_n[5:0]` |
| --- | --- | --- | --- |
| Ни одной кнопки | LED5 | `100000` | `011111` |
| Только A (вывод 87) | LED0, LED2, LED4 | `010101` | `101010` |
| Только B (вывод 88) | LED1, LED2, LED4 | `010110` | `101001` |
| Обе | LED0, LED1, LED3, LED4, LED5 | `111011` | `000100` |

LED0 показывает A, LED1 — B, LED2 — XOR, LED3 — AND, LED4 — OR, LED5 — XNOR. Кнопка выдаёт 0 при нажатии; светодиод включается при 0 на выходе. `top.v` инвертирует эти уровни, чтобы внутри схемы 1 означала «кнопка нажата» или «LED светится».

## Проверка и сборка

Из корня Yosis:

```powershell
& 'C:\Program Files\nodejs\node.exe' --import tsx hardware/button-led-check/verify.ts
```

Скрипт проверяет все четыре сочетания через Icarus, собирает свежий битстрим средствами Yosis и сохраняет проект, логи, VCD, размещение, `design.fs` и SHA-256 в этой папке. `tb.sv` используется только для симуляции и не входит в синтез.

Это локальный стенд для сегодняшнего Windows-подключения. В Linux скрипт использует `iverilog` и `vvp` из PATH; переопределения `IVERILOG_PATH`, `VVP_PATH`, `IVERILOG_LIB` совпадают с настройками сервера Yosis. Когда приложение работает на Linux-сервере, USB ученика доступен его компьютеру: программирование должно выполняться браузером или локальным помощником ученика.

## Временная загрузка в FPGA

```powershell
openFPGALoader -b tangnano20k hardware/button-led-check/design.fs
```

Без `-f` битстрим загружается в SRAM конфигурации: после отключения питания плата снова загрузит прежний бегущий огонь из flash. SDRAM 64 Мбит — другая память; загрузка конфигурации её не использует. Параметр `-f` записывает flash, поэтому для этой проверки он не нужен.

В установленном официальном Gowin Programmer есть тот же режим SRAM Program. Обнаруженный на этом компьютере отладчик: USB Debugger A, cable-index 4, location 529. Исходный Apicula-файл требует диагностического заголовка: `programmer-header.py` проверяет CRC, добавляет метаданные и сохраняет данные конфигурации без изменений. Программатор принимает этот файл, но выполнение схемы на плате всё ещё не подтверждено. Команда диагностической загрузки:

```powershell
& 'C:\Gowin\Gowin_V1.9.11.03_Education_x64\Programmer\bin\programmer_cli.exe' --device GW2AR-18C --operation_index 2 --cable-index 4 --location 529 --frequency 2.5MHz --fsFile 'C:\Users\serzh\Documents\ChatGPT\Yosis\hardware\button-led-check\design-programmer.fs'
```

При переподключении платы сначала заново проверьте cable-index и location; эти номера относятся к текущему подключению. `verify.ts` только собирает файлы, а эту команду запускает отдельный оператор.

Источники: [распиновка Apicula](https://github.com/YosysHQ/apicula/blob/master/examples/tangnano20k.cst), [документация Sipeed](https://wiki.sipeed.com/hardware/en/tang/tang-nano-20k/nano-20k.html), [SRAM и flash в openFPGALoader](https://trabucayre.github.io/openFPGALoader/guide/first-steps.html).
