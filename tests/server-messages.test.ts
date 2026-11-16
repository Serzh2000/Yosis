import assert from 'node:assert/strict';
import test from 'node:test';
import { setLanguage } from '../shared/i18n';
import { server } from '../src/i18n/en-server';
import { serverPatterns } from '../src/i18n/server-patterns';
import { translateServerMessage } from '../src/lib/i18n';

/** Реальные сообщения кода сервера со значениями и их английский вид. */
const samples: Array<[string, string]> = [
  ['Книга: неверный адрес.', 'Book: invalid address.'],
  [
    'a.v:3: имя модуля GND занято примитивом Gowin. Переименуйте модуль, например в my_gnd.',
    'a.v:3: the module name GND is taken by a Gowin primitive. Rename the module, for example to my_gnd.',
  ],
  ['\nERROR: Время сборки превысило 300 секунд.\n', '\nERROR: The build exceeded 300 seconds.\n'],
  [
    'Yosys завершился без полного результата (код 1).',
    'Yosys exited without a complete result (code 1).',
  ],
  ['Yosys не создал netlist.json.', 'Yosys did not produce netlist.json.'],
  ['Некорректный нетлист flat.json.', 'Invalid netlist flat.json.'],
  ['Модуль top не найден после подготовки.', 'Module top was not found after preparation.'],
  [
    'В схеме есть готовый блок кристалла Gowin (PLL). Лаборатория моделирует только обычную логику и триггеры: такой проект проверяйте синтезом и на плате.',
    'The design contains a ready-made Gowin chip block (PLL). The lab simulates only ordinary logic and flip-flops: check such a project with synthesis and on the board.',
  ],
  ['Элемент $foo не поддерживается лабораторией.', 'Element $foo is not supported by the lab.'],
  [
    'Файл ip.v зашифрован производителем (pragma protect). Это закрытый IP-блок Gowin: открытые инструменты его прочитать не могут, такой проект собирается только в Gowin EDA.',
    'File ip.v is encrypted by the vendor (pragma protect). It is a closed Gowin IP block: open tools cannot read it, and such a project can only be built in Gowin EDA.',
  ],
  [
    'top.v: параметры N, M заданы дробными числами. Для синтеза они округлены вверх до целых: счётчик, сравниваемый с 21,95, ведёт себя так же, как с 22.\n',
    'top.v: parameters N, M are given as fractional numbers. For synthesis they are rounded up to integers: a counter compared with 21.95 behaves the same as with 22.\n',
  ],
  [
    'top.v: порт объявлен как «input reg» — так бывает только у выхода. Для синтеза он считается «output reg».',
    'top.v: the port is declared as "input reg", which only an output can be. For synthesis it is treated as "output reg".',
  ],
  [
    'top.v: у входа написано «reg», но модуль ничего в него не присваивает. Для синтеза это обычный «input».',
    'top.v: the input is written as "reg", but the module assigns nothing to it. For synthesis it is a plain "input".',
  ],
  [
    'Порту led[0] назначен вывод 5 (JTAG): он занят конфигурацией платы, и сигнал на нём не появится. Выберите другой вывод во вкладке «Выводы».',
    'Port led[0] is assigned pin 5 (JTAG): it is used by the board configuration, and the signal will not appear on it. Choose another pin in the Pins tab.',
  ],
  ['Инструменты: nextpnr 0.7\n', 'Tools: nextpnr 0.7\n'],
  [
    '\nПредупреждение: портам a, b не назначен вывод в top.cst. Они не попали в битстрим: выходы никуда не выведены, входы читаются как 0. Назначьте им выводы во вкладке «Выводы», если они нужны.\n',
    '\nWarning: ports a, b have no pin assigned in top.cst. They did not make it into the bitstream: outputs go nowhere, inputs read as 0. Assign pins to them in the Pins tab if you need them.\n',
  ],
  [
    '\nПредупреждение: в t.sdc порт clk не найден среди входов проекта, ограничение для него не применено.\n',
    '\nWarning: in t.sdc the port clk was not found among the project inputs; the constraint for it was not applied.\n',
  ],
  [
    '\nПредупреждение: из t.sdc применены только create_clock; пропущены команды: set_false_path; set_input_delay\n',
    '\nWarning: only create_clock was applied from t.sdc; skipped commands: set_false_path; set_input_delay\n',
  ],
  [
    "\nПредупреждение: схема не успевает на заданной частоте: Max frequency for clock 'clk': 20.1 MHz (FAIL at 27.00 MHz)\n",
    "\nWarning: the design does not meet the requested frequency: Max frequency for clock 'clk': 20.1 MHz (FAIL at 27.00 MHz)\n",
  ],
  [
    '\nИсправлена таблица в начале цепочки переноса (2): nextpnr этой версии ставит туда 0x505a, из-за чего результат зависел от места на кристалле.\n',
    '\nFixed the table at the head of the carry chain (2): this nextpnr version puts 0x505a there, which made the result depend on the location on the chip.\n',
  ],
  [
    'Инструмент nextpnr завершился с кодом 1: ERROR: no clock',
    'The tool nextpnr exited with code 1: ERROR: no clock',
  ],
  [
    'Инструмент nextpnr завершился с кодом 1. Подробности в журнале.',
    'The tool nextpnr exited with code 1. See the log for details.',
  ],
  [
    'Тактовому входу clk не назначен вывод в .cst: без него схема осталась бы без такта. Назначьте ему вывод во вкладке «Выводы».',
    'The clock input clk has no pin assigned in the .cst file: without it the design would have no clock. Assign a pin to it in the Pins tab.',
  ],
  ['iverilog завершился с кодом 2.', 'iverilog exited with code 2.'],
  ['Некорректный служебный блок битстрима.', 'Invalid service block of the bitstream.'],
  [
    'vvp завершился с кодом 1. Подробности — в журнале.',
    'vvp exited with code 1. See the log for details.',
  ],
  ['Симуляция превысила 60 секунд.', 'The simulation exceeded 60 seconds.'],
  [
    'Имя tb_top__ зарезервировано для тестового окружения.',
    'The name tb_top__ is reserved for the test environment.',
  ],
  ['Ошибка подготовки RTL (код 3).', 'RTL preparation error (code 3).'],
  ['Вход rst должен существовать и иметь ширину 1 бит.', 'Input rst must exist and be 1 bit wide.'],
  ['Вход a отсутствует в верхнем модуле.', 'Input a is missing from the top module.'],
  [
    'Вход clk управляется генератором такта или сброса.',
    'Input clk is driven by the clock or reset generator.',
  ],
  [
    'Вход clk уже управляется генератором такта или сброса.',
    'Input clk is already driven by the clock or reset generator.',
  ],
  ['Значение входа d не помещается в 4 бит.', 'The value of input d does not fit in 4 bits.'],
  [
    'Имя порта \\x должно быть другим. не поддерживается'.replace(
      /^.*$/,
      'Имя порта \\x пока не поддерживается в симуляции.',
    ),
    'The port name \\x is not supported in simulation yet.',
  ],
  [
    'Двунаправленный порт io требует отдельного testbench. В этом режиме поддерживаются input/output.',
    'The bidirectional port io needs a separate testbench. Only input/output are supported in this mode.',
  ],
  [
    'Ширина порта bus выходит за пределы 1–4096 бит.',
    'The width of port bus is outside 1-4096 bits.',
  ],
  ['Проверяемый порт q отсутствует.', 'The port to check, q, does not exist.'],
  ['Некорректное имя входа 1a.', 'Invalid input name 1a.'],
  [
    'Значение входа d: ожидается неотрицательное число в десятичном, 0x или 0b формате.',
    'Value of input d: a non-negative number in decimal, 0x or 0b format is expected.',
  ],
  ['Ожидаемое значение не помещается в 8 бит.', 'The expected value does not fit in 8 bits.'],
  ['Проект должен содержать от 1 до 64 файлов.', 'The project must contain from 1 to 64 files.'],
  ['Недопустимое имя файла: ../x.v.', 'Invalid file name: ../x.v.'],
  ['Имя файла повторяется: a.v.', 'Duplicate file name: a.v.'],
  [
    'Путь src используется одновременно как файл и папка.',
    'The path src is used as both a file and a folder.',
  ],
  ['Файл a.v должен содержать текст.', 'File a.v must contain text.'],
  ['Файл a.v превышает 512 КБ.', 'File a.v is larger than 512 KB.'],
  [
    'Не удалось запустить программатор: spawn ENOENT',
    'Could not start the programmer: spawn ENOENT',
  ],
  [
    'Программатор завершился с ошибкой (1). Error: cable not found',
    'The programmer exited with an error (1). Error: cable not found',
  ],
  ['\nНе удалось сохранить квитанцию: EACCES\n', '\nCould not save the receipt: EACCES\n'],
  ['Некорректный размер или окончание кадра 4.', 'Invalid size or end of frame 4.'],
  [
    'Ошибка CRC в кадре 7; файл не будет загружен.',
    'CRC error in frame 7; the file will not be loaded.',
  ],
];

test('every pattern is covered by a real server message and translates it', () => {
  setLanguage('en');
  try {
    const used = new Set<RegExp>();
    for (const [ru, en] of samples) {
      assert.equal(translateServerMessage(ru), en, ru);
      const line = ru.trim();
      for (const { pattern } of serverPatterns) if (pattern.test(line)) used.add(pattern);
    }
    for (const { pattern } of serverPatterns) assert.ok(used.has(pattern), `no sample: ${pattern}`);
    for (const [, en] of samples) assert.doesNotMatch(en.replace(/«|»/g, ''), /[А-Яа-яЁё]/);
  } finally {
    setLanguage('ru');
  }
});

test('an exact phrase is translated, including with surrounding whitespace', () => {
  setLanguage('en');
  try {
    assert.equal(translateServerMessage('Неверный логин или пароль.'), 'Wrong login or password.');
    assert.equal(
      translateServerMessage('\nСборка отменена пользователем.\n'),
      '\nBuild cancelled by the user.\n',
    );
    for (const [ru, en] of Object.entries(server)) {
      if (ru.includes('{')) continue;
      assert.equal(translateServerMessage(ru), en, ru);
    }
  } finally {
    setLanguage('ru');
  }
});

test('a multi-line log is translated line by line and tool output is left alone', () => {
  setLanguage('en');
  try {
    const log =
      'Info: Placing\r\n\nПредупреждение: в t.sdc порт clk не найден среди входов проекта, ограничение для него не применено.\nPlaced 12 cells\nНечто неизвестное';
    assert.equal(
      translateServerMessage(log),
      'Info: Placing\r\n\nWarning: in t.sdc the port clk was not found among the project inputs; the constraint for it was not applied.\nPlaced 12 cells\nНечто неизвестное',
    );
  } finally {
    setLanguage('ru');
  }
});

test('an unknown phrase stays Russian in English mode', () => {
  setLanguage('en');
  try {
    assert.equal(translateServerMessage('Совсем новая фраза 42.'), 'Совсем новая фраза 42.');
    assert.equal(translateServerMessage(''), '');
  } finally {
    setLanguage('ru');
  }
});

test('Russian mode changes nothing', () => {
  setLanguage('ru');
  for (const [ru] of samples) assert.equal(translateServerMessage(ru), ru);
  assert.equal(translateServerMessage('Неверный логин или пароль.'), 'Неверный логин или пароль.');
});
