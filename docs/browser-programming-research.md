# Штатная Tang Nano 20K в браузере: проверка источников

Исследование 2 октября 2026; обновлено 3 октября. Первоначальное условие исключало подготовку платы. Позже пользователь явно выбрал установку DirtyJTAG через штатный BOOT. Актуальный сценарий допускает замену firmware BL616 из браузера; ручная установка драйверов и локальных инструментов остаётся исключённой.

## Что даёт openFPGALoader_webUSB

Предложенный пользователем [репозиторий автора openFPGALoader](https://github.com/trabucayre/openFPGALoader_webUSB) собирает настоящий C++ программатор и libftdi/libusb через Emscripten. Установка программатора на компьютер ученика для такой архитектуры не нужна.

| Участок | Проверенный исходник | Результат |
| --- | --- | --- |
| Выбор платы | [html/main.js](https://github.com/trabucayre/openFPGALoader_webUSB/blob/main/html/main.js#L30) | `navigator.usb.requestDevice`. |
| Запуск | [npmjs/lib/api.js](https://github.com/trabucayre/openFPGALoader_webUSB/blob/main/npmjs/lib/api.js#L86) | Файлы помещаются в WASM FS, затем вызывается `main`. |
| Захват интерфейса | [закреплённый libusb 03b119c](https://github.com/libusb/libusb/blob/03b119c48dba7075225451b74b358b87efa122b0/libusb/os/emscripten_webusb.cpp#L712) | Тот же браузерный `claimInterface`, который сейчас не проходит на нашей плате. |
| Windows | [Chromium USB backend](https://github.com/chromium/chromium/blob/main/services/device/usb/usb_device_handle_win.cc#L782) | Драйвер функции должен быть WinUSB; FTDIBUS отклоняется. |
| Linux-клиент | [html/index.html](https://github.com/trabucayre/openFPGALoader_webUSB/blob/main/html/index.html#L25) | Демостраница требует освобождения `ftdi_sio`, что также является подготовкой компьютера. |
| Linux-сервер | [nginx.conf](https://github.com/trabucayre/openFPGALoader_webUSB/blob/main/server_config/nginx.conf) | HTTPS, COOP `same-origin`, COEP `require-corp` для WASM/libusb threads. Эти настройки не управляют драйвером компьютера ученика. |

В проекте нет транспорта JTAG через Web Serial. Перенос его WASM в Yosis не устранит наблюдаемый отказ FTDIBUS. Полезные части: эталон SRAM-последовательности, поддержка устройств и упаковка WASM. Включение полного программатора отложено до подтверждения доступного штатного транспорта; пользовательский экран сохраняет проверку FS и ограниченную SRAM-операцию.

## YoWASP и сборка без pthread

Дополнительно проверены ссылки из сообщения Claude, исходники и опубликованный npm-архив. [YoWASP/openFPGALoader-web](https://github.com/YoWASP/openFPGALoader-web) архивирован владельцем 11 марта 2026 года. На 2 октября [npm registry](https://registry.npmjs.org/@yowasp%2fopenfpgaloader) отдаёт `@yowasp/openfpgaloader@1.1.1-179.268` как `latest`; архив исследован без установки в проект.

Реальный [JavaScript API](https://github.com/YoWASP/openFPGALoader-web/blob/develop/npmjs/lib/api.js#L86) экспортирует `runOpenFPGALoader(args, filesIn, options)`, также доступный как `commands.openFPGALoader`. Файл передаётся через дерево `filesIn`, например `{ 'design.fs': Uint8Array }`; `stdout`/`stderr` получают байтовые фрагменты. Браузерный выбор USB нужно вызвать из пользовательского клика до запуска: libusb перечисляет уже разрешённые устройства через `navigator.usb.getDevices()`.

| Вариант | Что меняет | Что остаётся |
| --- | --- | --- |
| [YoWASP](https://github.com/YoWASP/openFPGALoader-web/blob/develop/build.sh) | Готовый WASM/npm API; сборка с `-pthread` и общей памятью. | Для SharedArrayBuffer нужны COOP/COEP, а USB-интерфейс должен быть доступен браузеру. |
| [sylefeb/openFPGALoader-online](https://github.com/sylefeb/openFPGALoader-online/blob/main/build-no-pthread.sh) | Собирает libusb без pthread/SharedArrayBuffer. | Упрощает размещение приложения, но сохраняет WebUSB-захват интерфейса. |

Это проверено по закреплённым версиям: [YoWASP libusb `37dee8f`](https://github.com/libusb/libusb/blob/37dee8f9dd429558e4d5bc4a804ab586abe7262a/libusb/os/emscripten_webusb.cpp#L707-L709) и [sylefeb libusb `7793a84`](https://github.com/sylefeb/libusb/blob/7793a8437cc954054e54f9789c961c7c6e9cff7f/libusb/os/emscripten_webusb.cpp#L712-L714) вызывают тот же `USBDevice.claimInterface`. Браузерный backend не реализует снятие системного драйвера. Поэтому устранение pthread не устраняет подтверждённый отказ FTDIBUS на Windows. [Emscripten](https://emscripten.org/docs/porting/pthreads.html) отдельно описывает требования COOP/COEP к общей памяти.

[bl616_dirtyjtag](https://github.com/pepijndevos/bl616_dirtyjtag) заменяет firmware отладчика. Старый README упоминает `0x40000`, но закреплённый [flash_prog_cfg.ini](https://github.com/pepijndevos/bl616_dirtyjtag/blob/64fe564b82e509e9aa0ff3372a95ca5e2edf9230/flash_prog_cfg.ini) использует загрузчик Sipeed по адресу 0 и вторичную прошивку по `0x20000`. По последнему выбору пользователя этот путь реализован в браузере. Zadig не входит в сценарий.

## Проверяемая альтернатива: ROM CDC и временный RAM-мост

[Sipeed](https://wiki.sipeed.com/hardware/en/tang/common-doc/update_debugger.html) описывает вход штатного BL616 в загрузчик: UPDATE удерживается при подключении USB. Появляется CDC-порт. Для нашего исследования это временный режим; процедуры обновления прошивки из статьи не выполняются.

Безопасный первый шаг уже написан в `src/lib/bl616-rom.ts`:

1. Фильтр известных Bouffalo CDC USB IDs, включая реально обнаруженный на штатной плате `349b:6160` (Windows COM12).
2. Handshake: 69 байтов `55` при 115200. Остаточные ответы на handshake дочитываются до запроса информации.
3. GetBootInfo: `10 00 00 00`.
4. Ответ `OK`, длина uint16 LE, содержимое; либо `FL` и код ошибки.
5. Чтение версии, полей подписи/шифрования и исходного ответа, затем закрытие порта.

Формат проверен по [Bouffalo interface UART](https://github.com/openbouffalo/bflb-mcu-tool/blob/main/bflb_mcu_tool/libs/bflb_interface_uart.py) и [BL616 image loader](https://github.com/openbouffalo/bflb-mcu-tool/blob/main/bflb_mcu_tool/libs/bflb_img_loader.py). Независимый 24-байтный вектор взят из [журнала производителя Ai-Thinker BL616](https://docs.ai-thinker.com/ai-m6x_devel/best_practice/quick_start/hello_world_example.html).

Официальная [структура BootInfo](https://github.com/bouffalolab/bouffalo_sdk/blob/master/bsp/common/msg_router/linux_host/kernel/bootrom/mr_bootrom.h#L176-L198) называет эти поля `sign_type` и `encry_type` из eFuse. [Код SDK на компьютере](https://github.com/bouffalolab/bouffalo_sdk/blob/master/bsp/common/msg_router/linux_host/kernel/bootrom/mr_bootrom.c#L190-L212) проверяет совпадение этих режимов с загружаемым образом до передачи. Python-инструмент тоже использует их при выборе зашифрованного загрузчика; `ram=true` не доказывает отмену требований ROM. Это проверка на стороне хоста, а не наблюдавшийся аппаратный отказ mask ROM от обычного RAM-образа.

Для RAM-образа в [официальном linker script BL616](https://github.com/bouffalolab/bouffalo_sdk/blob/master/bsp/board/bl616dk/bl616_common.ld.in) есть режим `CONFIG_FLASH_XIP_ADDRESS=0`. Пока мост JTAG/CDC, его образ и загрузка не реализованы. В диагностике отсутствуют команды загрузки образа, выполнения, записи flash и eFuse.

Аппаратный результат: Yosis получил BootInfo из штатного ROM через Web Serial, USB `349b:6160`, Windows COM12/`usbser`, версия `0x06160001`, `sign=0`, `encrypt=1`. По правилам SDK для такого режима ожидается совместимый зашифрованный образ. Загрузка обычного собственного RAM-образа не выполнялась; её результат и политика этой ревизии mask ROM аппаратно не проверены. Чтение подтверждено; исполнение моста — нет. [Аппаратный журнал](../hardware/browser-programming/README.md).

## Команды доступа к GPIO через ROM: пока только исследование

Проверен другой возможный транспорт: управление JTAG-выводами через штатные команды памяти вместо загрузки RAM-кода. Python-инструмент Bouffalo объявляет `memory_write=0x50` и `memory_read=0x51`, но само объявление не подтверждает доступность команд на этой защищённой ревизии ROM.

В открытом [boot2 ISP](https://github.com/bouffalolab/bouffalo_sdk/blob/master/examples/boot2_isp/bflb_eflash_loader_cmds.c#L715-L761) команда `0x50` принимает пары адрес/значение uint32 LE и запрещается при включённой защите. Это отдельный программный загрузчик, поэтому его правило нельзя автоматически переносить на mask ROM версии `0x06160001`. Точный payload `0x51` не удалось подтвердить в найденных первичных реализациях; пакет не формируется по предположению.

Для будущей проверки найден безопасный адрес чтения: GPIO10 config `0x200008EC`, ровно 4 байта. [Официальная карта GLB](https://github.com/bouffalolab/bouffalo_sdk/blob/master/drivers/soc/bl616/std/include/hardware/glb_reg.h#L3831) и [SDK GPIO](https://github.com/bouffalolab/bouffalo_sdk/blob/master/drivers/soc/bl616/std/src/bl616_glb_gpio.c#L151-L159) подтверждают адрес и обычное чтение без clear-on-read. Команды памяти, изменение GPIO и исполнение кода на плату не отправлялись. Этот путь остаётся гипотезой до подтверждения протокола и аппаратного ответа.

## Реализованный путь: нативные команды flash ROM

В исследованном [host-инструменте openbouffalo/bflb-mcu-tool `9caeb5d7`](https://github.com/openbouffalo/bflb-mcu-tool/blob/9caeb5d7e01ce344227bbb34d20cb3a91f5c1545/bflb_mcu_tool/libs/bflb_eflash_loader.py) BL616 поддерживает `load_function=2` — `bootrom load`. Этот файл производного проекта не следует называть Python-исходником закреплённого SDK v2.3.16. Путь обращается к flash через ROM без загрузки собственного IF/RAM-образа; форматы команд дополнительно сопоставлены с открытым boot2 ISP Bouffalo. Наблюдённое `encrypt=1` нельзя использовать как доказательство запрета этого пути, но выполнение полного пути на нашей mask ROM ещё не подтверждено.

В `src/lib/bl616-flash.ts` реализованы BootInfo `10`, clock `22`, flash config `3B`, JEDEC `36`, raw read `32`, sector erase `30`, write `31`, write check `3A` и raw-flash SHA-256 `3D`. Команды памяти, eFuse и chip erase отсутствуют. Параметры flash должны быть подтверждены ROM до стирания.

Подготовка сохраняет всю flash в IndexedDB и проверяет её после перечитывания. Установка записывает вторичную firmware раньше загрузчика, сохраняет нетронутые области и проверяет каждый сектор и всю flash. Восстановление использует самую раннюю копию конкретного BL616. [Комплект и проверки](../hardware/dirtyjtag/README.md).

Собственная сборка добавляет BOS и MS OS 2.0 для WinUSB на vendor interface 0; CDC UART остаётся отдельно. Формат проверен по [Microsoft OS 2.0 descriptors](https://learn.microsoft.com/en-us/windows-hardware/drivers/usbcon/microsoft-defined-usb-descriptors). Присутствие дескрипторов в образе проверено; аппаратное назначение драйвера ещё не подтверждено.

## Критерий завершения текущего сценария

Чтение BootInfo выполнено; 3 октября Windows снова обнаружила Bouffalo CDC на COM12 после UPDATE. LED FPGA при этом продолжали работать. Остаются аппаратные чтение и резервирование всей flash, установка DirtyJTAG, автоматический WinUSB после переподключения, JTAG и контрольный FPGA-битстрим. Восстановление исходной копии проверено программной моделью и требует отдельного аппаратного испытания. Затем проверяются ревизии платы и клиентские ОС.
