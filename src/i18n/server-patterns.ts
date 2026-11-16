/**
 * Шаблоны серверных сообщений со значениями: `Файл ${name} не найден` и подобные. Русский шаблон
 * пишется с `{0}`, `{1}`… вместо значений (по порядку появления), английский — с теми же номерами.
 * Сообщение разбирается построчно, поэтому каждый шаблон описывает одну строку целиком.
 */
export interface ServerPattern {
  pattern: RegExp;
  en: (match: RegExpExecArray) => string;
}

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Короткие русские слова, которые сервер подставляет в сообщения как значения. */
const words: Record<string, string> = {
  Книга: 'Book',
  Страница: 'Page',
  'начальный блок': 'initial block',
  'маркер формата': 'format marker',
  'сброс адреса': 'address reset',
  'параметр SecurityBit': 'SecurityBit parameter',
  'параметры несжатого потока': 'uncompressed stream parameters',
  'адрес SPI': 'SPI address',
  'служебный блок': 'service block',
  'завершение конфигурации': 'configuration end',
};
const word = (value: string): string => words[value] ?? value;

/** Собирает шаблон: `{0}`, `{1}` в русском тексте становятся группами захвата. */
function pat(ru: string, en: string): ServerPattern {
  const parts = ru.split(/\{\d+\}/);
  const source = `^${parts.map(escape).join('(.*?)')}$`;
  return {
    pattern: new RegExp(source),
    en: (match) =>
      en.replace(/\{(\d+)\}/g, (_whole, index: string) => word(match[Number(index) + 1] ?? '')),
  };
}

export const serverPatterns: ServerPattern[] = [
  // Аккаунты
  pat('{0}: неверный адрес.', '{0}: invalid address.'),

  // Сборка (синтез)
  pat(
    '{0}:{1}: имя модуля {2} занято примитивом Gowin. Переименуйте модуль, например в my_{3}.',
    '{0}:{1}: the module name {2} is taken by a Gowin primitive. Rename the module, for example to my_{3}.',
  ),
  pat('ERROR: Время сборки превысило {0} секунд.', 'ERROR: The build exceeded {0} seconds.'),
  pat(
    'Yosys завершился без полного результата (код {0}).',
    'Yosys exited without a complete result (code {0}).',
  ),
  pat('Yosys не создал {0}.', 'Yosys did not produce {0}.'),
  pat('Некорректный нетлист {0}.', 'Invalid netlist {0}.'),
  pat('Модуль {0} не найден после подготовки.', 'Module {0} was not found after preparation.'),
  pat(
    'В схеме есть готовый блок кристалла Gowin ({0}). Лаборатория моделирует только обычную логику и триггеры: такой проект проверяйте синтезом и на плате.',
    'The design contains a ready-made Gowin chip block ({0}). The lab simulates only ordinary logic and flip-flops: check such a project with synthesis and on the board.',
  ),
  pat('Элемент {0} не поддерживается лабораторией.', 'Element {0} is not supported by the lab.'),
  pat(
    'Файл {0} зашифрован производителем (pragma protect). Это закрытый IP-блок Gowin: открытые инструменты его прочитать не могут, такой проект собирается только в Gowin EDA.',
    'File {0} is encrypted by the vendor (pragma protect). It is a closed Gowin IP block: open tools cannot read it, and such a project can only be built in Gowin EDA.',
  ),

  // Предупреждения совместимости Verilog
  pat(
    '{0}: параметры {1} заданы дробными числами. Для синтеза они округлены вверх до целых: счётчик, сравниваемый с 21,95, ведёт себя так же, как с 22.',
    '{0}: parameters {1} are given as fractional numbers. For synthesis they are rounded up to integers: a counter compared with 21.95 behaves the same as with 22.',
  ),
  pat(
    '{0}: порт объявлен как «input reg» — так бывает только у выхода. Для синтеза он считается «output reg».',
    '{0}: the port is declared as "input reg", which only an output can be. For synthesis it is treated as "output reg".',
  ),
  pat(
    '{0}: у входа написано «reg», но модуль ничего в него не присваивает. Для синтеза это обычный «input».',
    '{0}: the input is written as "reg", but the module assigns nothing to it. For synthesis it is a plain "input".',
  ),

  // Размещение (nextpnr)
  pat(
    'Порту {0} назначен вывод {1} ({2}): он занят конфигурацией платы, и сигнал на нём не появится. Выберите другой вывод во вкладке «Выводы».',
    'Port {0} is assigned pin {1} ({2}): it is used by the board configuration, and the signal will not appear on it. Choose another pin in the Pins tab.',
  ),
  pat('Инструменты: {0}', 'Tools: {0}'),
  pat(
    'Предупреждение: портам {0} не назначен вывод в {1}. Они не попали в битстрим: выходы никуда не выведены, входы читаются как 0. Назначьте им выводы во вкладке «Выводы», если они нужны.',
    'Warning: ports {0} have no pin assigned in {1}. They did not make it into the bitstream: outputs go nowhere, inputs read as 0. Assign pins to them in the Pins tab if you need them.',
  ),
  pat(
    'Предупреждение: в {0} порт {1} не найден среди входов проекта, ограничение для него не применено.',
    'Warning: in {0} the port {1} was not found among the project inputs; the constraint for it was not applied.',
  ),
  pat(
    'Предупреждение: из {0} применены только create_clock; пропущены команды: {1}',
    'Warning: only create_clock was applied from {0}; skipped commands: {1}',
  ),
  pat(
    'Предупреждение: схема не успевает на заданной частоте: {0}',
    'Warning: the design does not meet the requested frequency: {0}',
  ),
  pat(
    'Исправлена таблица в начале цепочки переноса ({0}): nextpnr этой версии ставит туда 0x505a, из-за чего результат зависел от места на кристалле.',
    'Fixed the table at the head of the carry chain ({0}): this nextpnr version puts 0x505a there, which made the result depend on the location on the chip.',
  ),
  pat('Инструмент {0} завершился с кодом {1}: {2}', 'The tool {0} exited with code {1}: {2}'),
  pat(
    'Инструмент {0} завершился с кодом {1}. Подробности в журнале.',
    'The tool {0} exited with code {1}. See the log for details.',
  ),
  pat(
    'Тактовому входу {0} не назначен вывод в .cst: без него схема осталась бы без такта. Назначьте ему вывод во вкладке «Выводы».',
    'The clock input {0} has no pin assigned in the .cst file: without it the design would have no clock. Assign a pin to it in the Pins tab.',
  ),
  pat('Некорректный {0} битстрима.', 'Invalid {0} of the bitstream.'),

  // Симуляция
  pat(
    '{0} завершился с кодом {1}. Подробности — в журнале.',
    '{0} exited with code {1}. See the log for details.',
  ),
  pat('Симуляция превысила {0} секунд.', 'The simulation exceeded {0} seconds.'),
  pat(
    'Имя {0} зарезервировано для тестового окружения.',
    'The name {0} is reserved for the test environment.',
  ),
  pat('Ошибка подготовки RTL (код {0}).', 'RTL preparation error (code {0}).'),
  pat(
    'Вход {0} должен существовать и иметь ширину 1 бит.',
    'Input {0} must exist and be 1 bit wide.',
  ),
  pat('Вход {0} отсутствует в верхнем модуле.', 'Input {0} is missing from the top module.'),
  pat(
    'Вход {0} уже управляется генератором такта или сброса.',
    'Input {0} is already driven by the clock or reset generator.',
  ),
  pat(
    'Вход {0} управляется генератором такта или сброса.',
    'Input {0} is driven by the clock or reset generator.',
  ),
  pat(
    'Значение входа {0} не помещается в {1} бит.',
    'The value of input {0} does not fit in {1} bits.',
  ),
  pat(
    'Имя порта {0} пока не поддерживается в симуляции.',
    'The port name {0} is not supported in simulation yet.',
  ),
  pat(
    'Двунаправленный порт {0} требует отдельного testbench. В этом режиме поддерживаются input/output.',
    'The bidirectional port {0} needs a separate testbench. Only input/output are supported in this mode.',
  ),
  pat(
    'Ширина порта {0} выходит за пределы 1–4096 бит.',
    'The width of port {0} is outside 1-4096 bits.',
  ),
  pat('Проверяемый порт {0} отсутствует.', 'The port to check, {0}, does not exist.'),
  pat('Некорректное имя входа {0}.', 'Invalid input name {0}.'),
  pat(
    'Значение входа {0}: ожидается неотрицательное число в десятичном, 0x или 0b формате.',
    'Value of input {0}: a non-negative number in decimal, 0x or 0b format is expected.',
  ),
  pat(
    'Ожидаемое значение не помещается в {0} бит.',
    'The expected value does not fit in {0} bits.',
  ),

  // Проект
  pat(
    'Проект должен содержать от 1 до {0} файлов.',
    'The project must contain from 1 to {0} files.',
  ),
  pat('Недопустимое имя файла: {0}.', 'Invalid file name: {0}.'),
  pat('Имя файла повторяется: {0}.', 'Duplicate file name: {0}.'),
  pat(
    'Путь {0} используется одновременно как файл и папка.',
    'The path {0} is used as both a file and a folder.',
  ),
  pat('Файл {0} должен содержать текст.', 'File {0} must contain text.'),
  pat('Файл {0} превышает 512 КБ.', 'File {0} is larger than 512 KB.'),

  // Загрузка в плату
  pat('Не удалось запустить программатор: {0}', 'Could not start the programmer: {0}'),
  pat(
    'Программатор завершился с ошибкой ({0}). {1}',
    'The programmer exited with an error ({0}). {1}',
  ),
  pat('Не удалось сохранить квитанцию: {0}', 'Could not save the receipt: {0}'),

  // Битстрим
  pat('Некорректный размер или окончание кадра {0}.', 'Invalid size or end of frame {0}.'),
  pat(
    'Ошибка CRC в кадре {0}; файл не будет загружен.',
    'CRC error in frame {0}; the file will not be loaded.',
  ),

  // Самый общий шаблон: последним, чтобы не перехватывать более точные.
  pat('{0} завершился с кодом {1}.', '{0} exited with code {1}.'),
];
