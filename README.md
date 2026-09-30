# ПЛИС на практике: Sipeed Tang Nano 20K

Учебное пособие для школьников и студентов, которые уже знакомы с основами цифровой
схемотехники (сигналы, элементы И, ИЛИ, НЕ, И-НЕ, ИЛИ-НЕ).

📄 **[Открыть PDF](./Tang_Nano_20K.pdf)**

## Содержание

1. Что такое ПЛИС: сравнение с микроконтроллером и ASIC, где применяются ПЛИС
2. Что внутри ПЛИС: LUT, триггеры, ячейки CFU, трассировка, BSRAM, DSP, PLL
3. Плата Tang Nano 20K: характеристики, структурная схема, выводы
4. Маршрут проектирования: синтез, размещение и трассировка, битстрим; Gowin EDA и открытые инструменты
5. Основы Verilog
6. Шесть проектов: логические элементы, мигалка, бегущий огонь, кнопка с антидребезгом, светофор (конечный автомат), ШИМ
7. Симуляция в Icarus Verilog и GTKWave
8. Встроенная SDRAM на 64 Мбит
9. Задания для самостоятельной работы
10. Приложение: шпаргалка

## Структура

```
tex/        исходники XeLaTeX (main.tex, chapters/, styles/)
code/       примеры на Verilog, общий файл выводов common/tang_nano_20k.cst, Makefile
build.sh    сборка PDF в Linux/macOS
build.bat   сборка PDF в Windows
```

## Сборка PDF

Понадобятся XeLaTeX (TeX Live или MiKTeX) и Python-пакет Pygments (для `minted`):

```bash
./build.sh          # результат: Tang_Nano_20K.pdf
```

## Сборка примеров открытыми инструментами

```bash
cd code
make PROJECT=02_blink TOP=blink load     # синтез, трассировка и загрузка в SRAM
make PROJECT=02_blink TOP=blink flash    # запись во Flash
```

Симуляция:

```bash
cd code/01_gates && iverilog -o tb tb_gates.v gates.v && vvp tb
```
