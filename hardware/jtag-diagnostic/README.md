# Независимое чтение JTAG через D2XX

`ftdi_read_probe.py` использует установленный Windows-драйвер FTDI и `C:\Windows\System32\ftd2xx.dll`. Драйверы и EEPROM не меняет. Команды FPGA жёстко ограничены чтением IDCODE (`11`), UserCode (`13`) и статуса (`41`). В скрипте отсутствуют операции конфигурации, SRAM, flash и перезагрузки FPGA.

Фиксированная цель: USB `0403:6010`, serial `2025030317` или `2025030317A`, interface A, location 529. При несовпадении или занятости интерфейса он останавливается. Первый регистр каждого прохода — IDCODE; значение должно быть `0000081B`.

```powershell
.tools/gowin/Scripts/python.exe hardware/jtag-diagnostic/test_ftdi_read_probe.py
.tools/gowin/Scripts/python.exe hardware/jtag-diagnostic/ftdi_read_probe.py --list --report hardware/jtag-diagnostic/devices.json
.tools/gowin/Scripts/python.exe hardware/jtag-diagnostic/ftdi_read_probe.py --probe --report hardware/jtag-diagnostic/read-probe-report.json
```

`--list` только перечисляет интерфейсы. `--probe` открывает A, включает MPSSE, проверяет эхо неподдерживаемой MPSSE-команды, выставляет TCK/TDI/TMS как выходы и TDO как вход. По умолчанию частота TCK — 100 кГц; поддержаны также 10 и 500 кГц. После чтения TAP возвращается в Idle, линии JTAG освобождаются, USB bit mode сбрасывается, исходный latency timer восстанавливается, дескриптор закрывается. В JSON остаются сырые TX/RX, ожидаемые и фактические размеры, коды API и ошибки очистки.

Программные проверки моделируют TAP независимо от скрипта: проверяют восемь тактов IR, ровно 32 такта DR, отсутствие лишних команд и декодирование каждого из 32 битов. Это проверяет формирование запросов, а не сам USB-транспорт. Аппаратное чтение не выполнялось при подготовке скрипта.

Ограничения: только Windows; требуется DLL той же разрядности, что Python. D2XX получает уже очищенные от USB-статусных байтов данные, поэтому их нельзя удалять повторно. Неполные ответы, лишние данные и неожиданный IDCODE считаются ошибкой, без догадок об их выравнивании. Sipeed эмулирует FTDI, поэтому поддержка MPSSE должна быть подтверждена фактическим ответом.

Основания для команд и битового порядка: [FTDI AN_108](https://www.ftdichip.com/Support/Documents/AppNotes/AN_108_Command_Processor_for_MPSSE_and_MCU_Host_Bus_Emulation_Modes.pdf), [FTDI TMS с чтением](https://www.ftdichip.com/Support/Knowledgebase/clkdatatmsread.htm), [openFPGALoader MPSSE](https://github.com/trabucayre/openFPGALoader/blob/master/src/ftdiJtagMPSSE.cpp), [Gowin readReg32](https://github.com/trabucayre/openFPGALoader/blob/master/src/gowin.cpp).

## Временная загрузка SRAM

Отдельный `ftdi_sram_programmer.py` повторяет SRAM-последовательность openFPGALoader на этом транспорте. Он принимает только стандартный несжатый `.fs` для ID `0000081B`, без шифрования и с SecurityBit OFF. Сначала проверяет структуру всех 1342 кадров и CRC, затем вновь читает ID перед первым изменением конфигурации. В поток передаются все двоичные строки `.fs`; каждый байт разворачивается ровно один раз для LSB-передачи. Пакет D2XX содержит до 509 байт данных и 3 байта команды, суммарно до 512 байт; промежуточные пакеты сохраняют Shift-DR.

```powershell
.tools/gowin/Scripts/python.exe hardware/jtag-diagnostic/test_ftdi_sram_programmer.py
.tools/gowin/Scripts/python.exe hardware/jtag-diagnostic/ftdi_sram_programmer.py --inspect hardware/io-pattern/impl/pnr/io-pattern-readable.fs --report hardware/jtag-diagnostic/offline-readable-report.json
# Следующая команда изменяет только временную SRAM и обязательна к проверке перед запуском:
.tools/gowin/Scripts/python.exe hardware/jtag-diagnostic/ftdi_sram_programmer.py --program hardware/io-pattern/impl/pnr/io-pattern-readable.fs --frequency 100000
# Перезагрузка сохранённой flash, без её стирания или записи:
.tools/gowin/Scripts/python.exe hardware/jtag-diagnostic/ftdi_sram_programmer.py --restore-existing-flash
```

После загрузки скрипт читает обратно все 1342 адреса, ровно по 3376 бит на адрес, и сравнивает каждый бит. Сохраняются полный двоичный readback, первые несовпадения, плотность единиц и дополнительное сравнение с разворотом строк. Дополнительное сравнение помогает выяснить порядок TDO и само по себе не помечает проверку успешной. Успех требует полного прямого совпадения и отсутствия ошибок FPGA/USB. `SecurityBit ON` не подходит: в этом режиме Gowin возвращает единицы вместо конфигурации.

Upstream `writeSRAM` передаёт в UserCode сумму 16-битных слов из `FsParser`, хотя сам проект отмечает, что алгоритм контрольной суммы GW2A пока не поддержан. Поэтому для `io-pattern-readable.fs` ожидается программируемое значение `EED7`, а в самом файле записано `4BE9`. Совпадение UserCode здесь не подтверждает корректность всей схемы; сравнивается SRAM. В случае ошибки скрипт пытается выйти из режима конфигурации и закрыть USB; исходную flash он автоматически не перезагружает.

Основание SRAM-последовательности: [openFPGALoader Gowin](https://github.com/trabucayre/openFPGALoader/blob/master/src/gowin.cpp), [FsParser](https://github.com/trabucayre/openFPGALoader/blob/master/src/fsparser.cpp). Чтение SRAM: установленное руководство Gowin UG290-2.8.1E, раздел 7.2.6, печатная страница 54. Подготовка скрипта включала только проверки программного формирования потока и офлайн-проверку файла; аппаратную загрузку через него ещё не выполняли.
