# Работающий тест Tang Nano 20K

Три LED через один горят полсекунды, затем включаются другие три. Пользователь подтвердил этот рисунок на настоящей плате после загрузки битстрима Yosis. Flash с исходным бегущим огнём сохранена; текущий тест находится в SRAM и исчезнет после отключения питания.

`top.v` делит 27 МГц на интервалы по 13 500 000 тактов и переключает фазу. Вход `clk` назначен на вывод корпуса 4; активные низким уровнем `led_n[0…5]` — на выводы 15…20. В каждой фазе ровно три нуля, поэтому светятся три LED.

## Проверки

- Icarus: начальное состояние и 20 тактов с уменьшенным делителем; пять переключений проходят проверку.
- Yosys → nextpnr → Apicula: 25 FF, 21 LUT, 26 ALU, 7 IOB; 295 PIP, 16 занятых тайлов. Ограничение такта 27 МГц выполнено.
- Все 1342 CRC корректны. Добавленные метаданные для Gowin Programmer не меняют двоичные строки конфигурации.
- Реальная загрузка SRAM: exit 0, UserCode `35B1`, status `6020`; правильный рисунок подтверждён пользователем.

Исходный `design.fs`: SHA256 `7549f57d31ee6a1bd48bf3bfc4da8a80a2e63b60dc48cdbeecfaf1e2cceb3115`.
Адаптированный `design-programmer.fs`: SHA256 `f54b7ad72f4f5d8c5c84f5a4e4ba3fe10935cae7bfaea217044b64e918fe97ea`.

## Повторная сборка

Из корня Yosis:

```powershell
& 'C:\Program Files\nodejs\node.exe' --import tsx hardware/clocked-pattern/verify.ts
```

Скрипт выполняет симуляцию и открытую сборку, создаёт `design.fs`, `design-programmer.fs`, `project.json`, `receipt.json` и данные размещения. `project.json` можно импортировать через меню проекта в Yosis. Testbench не входит в синтез.

## Проверенная загрузка на этом Windows-компьютере

```powershell
& 'C:\Gowin\Gowin_V1.9.11.03_Education_x64\Programmer\bin\programmer_cli.exe' --device GW2AR-18C --cable-index 4 --location 529 --frequency 2.5MHz --operation 2 --fsFile 'C:\Users\serzh\Documents\ChatGPT\Yosis\hardware\clocked-pattern\design-programmer.fs'
```

Операция 2 записывает только SRAM. Cable index и location относятся к проверенному подключению; перед работой на другом компьютере их нужно заново определить. Этот локальный способ использует установленный Gowin Programmer. Для Linux-сервера битстрим передаётся клиенту, а загрузка выполняется на компьютере ученика. Программирование через браузер требует отдельного JTAG-транспорта.

Логи загрузки: `open-programming.log`. Подробная история контрольных тестов: [hardware/README.md](../README.md).
