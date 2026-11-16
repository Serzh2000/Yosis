/** Английские тексты области «designer». Ключ — русская фраза из кода. */
export const designer: Record<string, string> = {
  // --- Блоки: основа (circuit-blocks-basic) ---
  'Ширина, бит': 'Width, bits',
  бит: 'bits',
  Вход: 'Input',
  'Сигнал, который приходит в устройство снаружи: кнопка, переключатель, такт.':
    'A signal that comes into the device from outside: a button, a switch, a clock.',
  'Вход устройства, {width} бит': 'Device input, {width}-bit',
  Выход: 'Output',
  'Сигнал, который устройство отдаёт наружу, например на светодиод.':
    'A signal the device sends out, for example to an LED.',
  'Выход устройства, {width} бит': 'Device output, {width}-bit',
  Константа: 'Constant',
  'Постоянное число. Логическая 1 и логический 0 — это однобитные константы.':
    'A fixed number. Logic 1 and logic 0 are one-bit constants.',
  Значение: 'Value',
  'число {value} не помещается в {width} бит': 'the number {value} does not fit in {width} bits',
  'Константа {value}, {width} бит': 'Constant {value}, {width}-bit',
  'Буфер / NOT': 'Buffer / NOT',
  'NOT меняет каждый бит на противоположный. Буфер просто передаёт сигнал дальше.':
    'NOT flips every bit. A buffer simply passes the signal on.',
  'Инвертировать (NOT)': 'Invert (NOT)',
  'NOT: инверсия': 'NOT: inversion',
  'Буфер: передача сигнала': 'Buffer: passes the signal on',
  'Логический элемент': 'Logic gate',
  'И, ИЛИ, исключающее ИЛИ с 2–8 входами. Кружок на выходе или входе означает инверсию.':
    'AND, OR, XOR with 2–8 inputs. A small circle on an output or input means inversion.',
  Функция: 'Function',
  'И (AND)': 'AND',
  'ИЛИ (OR)': 'OR',
  'Исключающее ИЛИ (XOR)': 'Exclusive OR (XOR)',
  'Инвертировать результат (NAND, NOR, XNOR)': 'Invert the result (NAND, NOR, XNOR)',
  'Число входов': 'Number of inputs',
  'Ширина шины, бит': 'Bus width, bits',
  'Инверсия входов': 'Input inversion',
  И: 'AND',
  ИЛИ: 'OR',
  'Исключающее ИЛИ': 'Exclusive OR',
  ' с инверсией': ' inverted',
  '{op}{inverted}, {inputs} входа(ов)': '{op}{inverted}, {inputs} input(s)',
  'Свёртка шины в бит': 'Bus reduction to a bit',
  'Объединяет все биты шины в один: И — все единицы, ИЛИ — есть хотя бы одна единица, XOR — нечётное число единиц.':
    'Combines all bits of a bus into one: AND — all ones, OR — at least one 1, XOR — an odd number of ones.',
  'И — все биты равны 1': 'AND — all bits are 1',
  'ИЛИ — хотя бы один бит равен 1': 'OR — at least one bit is 1',
  'XOR — нечётное число единиц': 'XOR — an odd number of ones',
  'Инвертировать результат': 'Invert the result',
  'Ширина входной шины, бит': 'Input bus width, bits',
  'свёртка {width} бит': 'reduce {width}-bit',
  'Свёртка {op} шины {width} бит в один бит': '{op} reduction of a {width}-bit bus to one bit',
  Мультиплексор: 'Multiplexer',
  'Переключатель: код на входе S выбирает, какой из входов D0, D1… попадёт на выход Y.':
    'A switch: the code on input S selects which of inputs D0, D1… reaches output Y.',
  'Ширина данных, бит': 'Data width, bits',
  Выбор: 'Select',
  'Мультиплексор {inputs}:1': '{inputs}:1 multiplexer',
  Демультиплексор: 'Demultiplexer',
  'Направляет вход A на один из выходов Y0, Y1… по коду S. Остальные выходы равны 0.':
    'Routes input A to one of outputs Y0, Y1… by code S. The other outputs are 0.',
  'Число выходов': 'Number of outputs',
  'Демультиплексор 1:{outputs}': '1:{outputs} demultiplexer',
  Дешифратор: 'Decoder',
  'Из двоичного числа на входе делает «один из N»: на выходе единица стоит в разряде с номером этого числа.':
    'Turns the binary number on the input into "one of N": the output has a 1 in the position with that number.',
  'Разрядов на входе': 'Input bits',
  'Вход разрешения EN': 'Enable input EN',
  Разрешение: 'Enable',
  'Дешифратор {bits} → {v2}': 'Decoder {bits} → {v2}',
  'Приоритетный шифратор': 'Priority encoder',
  'Находит номер самой старшей единицы на входе. Выход V = 1, если на входе есть хотя бы одна единица.':
    'Finds the index of the highest 1 on the input. Output V = 1 if there is at least one 1.',
  'Число входных бит': 'Number of input bits',
  Номер: 'Index',
  'Есть единица': 'Has a 1',
  'приоритет {width}': 'priority {width}',
  'Приоритетный шифратор {width} → {v2}': 'Priority encoder {width} → {v2}',
  'Таблица (ПЗУ)': 'Table (ROM)',
  'Небольшая таблица: по адресу на входе выдаёт записанное число. Таблицу редактируют в свойствах.':
    'A small table: outputs the stored number for the address on the input. Edit the table in the properties.',
  'Разрядов адреса': 'Address bits',
  'Ширина слова, бит': 'Word width, bits',
  Содержимое: 'Contents',
  Адрес: 'Address',
  'в таблице должно быть {v1} слов, сейчас {length}':
    'the table must have {v1} words, it has {length}',
  'слово {i}: нужно целое неотрицательное число':
    'word {i}: a non-negative whole number is required',
  'слово {i}: число {word} не помещается в {width} бит':
    'word {i}: the number {word} does not fit in {width} bits',
  'Таблица из {v1} слов по {width} бит': 'Table of {v1} words, {width} bits each',
  'Расширение шины': 'Bus extension',
  'Делает шину шире. Нулевое расширение добавляет нули, знаковое — копию старшего бита (для чисел со знаком).':
    'Makes a bus wider. Zero extension adds zeros, sign extension copies the top bit (for signed numbers).',
  'Ширина входа, бит': 'Input width, bits',
  'Ширина выхода, бит': 'Output width, bits',
  'Знаковое расширение': 'Sign extension',
  'выход должен быть шире входа': 'the output must be wider than the input',
  Знаковое: 'Sign',
  Нулевое: 'Zero',
  '{kind} расширение {inWidth} → {outWidth} бит': '{kind} extension {inWidth} → {outWidth} bits',
  'Срез шины': 'Bus slice',
  'Выделяет часть шины: биты от младшего до старшего включительно.':
    'Picks a part of a bus: the bits from the lowest to the highest, inclusive.',
  'Младший бит': 'Low bit',
  'Старший бит': 'High bit',
  'срез выходит за входную шину': 'the slice goes beyond the input bus',
  срез: 'slice',
  'Срез: биты {hi}..{lo}': 'Slice: bits {hi}..{lo}',
  'Объединение шин': 'Bus concatenation',
  'Склеивает несколько шин в одну. A — самые старшие биты, последний вход — младшие.':
    'Joins several buses into one. A is the highest bits, the last input is the lowest.',
  'Число частей': 'Number of parts',
  'Ширина {v1}, бит': 'Width of {v1}, bits',
  'объединённая шина шире 64 бит': 'the combined bus is wider than 64 bits',
  склейка: 'concat',
  'Склейка шин: {v1} бит': 'Bus concatenation: {v1} bits',
  'Разделитель шины на биты': 'Bus splitter',
  'Выдаёт каждый бит шины на отдельный контакт B0 (младший), B1…':
    'Sends each bit of a bus to its own pin B0 (lowest), B1…',
  биты: 'bits',
  'Разделение шины {width} бит на отдельные биты': 'Splitting a {width}-bit bus into single bits',
  'Сборка шины из битов': 'Bus from bits',
  'Собирает шину из отдельных битов: B0 — младший.':
    'Builds a bus from single bits: B0 is the lowest.',
  шина: 'bus',
  'Сборка шины {width} бит из отдельных битов': 'Building a {width}-bit bus from single bits',
  'Метка цепи: передать': 'Net label: send',
  'Даёт имя сигналу. Метка «принять» с таким же именем получит этот сигнал без проведённого провода.':
    'Names a signal. A "receive" label with the same name gets this signal without a drawn wire.',
  'Метка цепи ({width} бит)': 'Net label ({width}-bit)',
  'Метка цепи: принять': 'Net label: receive',
  'Берёт сигнал с одноимённой метки «передать». Имя должно совпадать.':
    'Takes the signal from the "send" label with the same name. The names must match.',
  'Текстовая заметка': 'Text note',
  'Подпись на схеме для себя и других. В устройство не попадает.':
    'A caption on the schematic for you and others. It does not end up in the device.',
  Заметка: 'Note',
  Текст: 'Text',
  // --- Блоки: дополнительные ---
  'Начальное значение при включении платы': 'Initial value at power-up',
  'Если выключено, до первого действия значение неизвестно (X, в предпросмотре «?»).':
    'If off, the value is unknown (X, shown as "?" in the preview) until the first action.',
  'Асинхронный сброс ACLR (в 0)': 'Asynchronous clear ACLR (to 0)',
  'Асинхронный сброс в 0': 'Asynchronous clear to 0',
  'JK-триггер': 'JK flip-flop',
  'По фронту такта: J = 1, K = 0 — установить 1; J = 0, K = 1 — сбросить в 0; J = K = 1 — переключить; J = K = 0 — хранить.':
    'On the clock edge: J = 1, K = 0 sets to 1; J = 0, K = 1 resets to 0; J = K = 1 toggles; J = K = 0 holds.',
  Установить: 'Set',
  Сбросить: 'Reset',
  'JK-триггер: J — установить, K — сбросить, J = K = 1 — переключить':
    'JK flip-flop: J sets, K resets, J = K = 1 toggles',
  'RS-триггер (по такту)': 'RS flip-flop (clocked)',
  'По фронту такта: S = 1 — установить 1, R = 1 — сбросить в 0, S = R = 0 — хранить. Если S = R = 1, побеждает сброс R.':
    'On the clock edge: S = 1 sets to 1, R = 1 resets to 0, S = R = 0 holds. If S = R = 1, reset R wins.',
  'RS-триггер: S — установить, R — сбросить (R сильнее)':
    'RS flip-flop: S sets, R resets (R is stronger)',
  'D-защёлка': 'D latch',
  'Пока G = 1, выход Q повторяет вход D (защёлка «прозрачна»). Когда G = 0, Q хранит последнее значение. Работает по уровню, а не по фронту.':
    'While G = 1, output Q follows input D (the latch is "transparent"). When G = 0, Q holds the last value. It works on a level, not on an edge.',
  '1 — прозрачна, 0 — хранит': '1 — transparent, 0 — holds',
  '{width} бит': '{width}-bit',
  'D-защёлка, {width} бит, прозрачна при G = 1': 'D latch, {width}-bit, transparent when G = 1',
  'ОЗУ (RAM)': 'RAM',
  'Память для чтения и записи. Запись в слово по адресу A — по фронту CLK, когда WE = 1. Чтение по адресу A выдаётся на Q сразу. После включения все слова равны 0.':
    'Read/write memory. A word at address A is written on the CLK edge when WE = 1. The word at address A appears on Q immediately. After power-up all words are 0.',
  'Данные для записи': 'Data to write',
  'Разрешение записи': 'Write enable',
  'Слово по адресу A': 'Word at address A',
  'ОЗУ из {v1} слов по {width} бит': 'RAM of {v1} words, {width} bits each',
  Делитель: 'Divider',
  'Делит A на B нацело: на выходе частное Q и, если нужно, остаток R. Деление на ноль даёт неизвестный результат.':
    'Divides A by B as whole numbers: the output is quotient Q and, if needed, remainder R. Division by zero gives an unknown result.',
  'Числа со знаком': 'Signed numbers',
  'Выход остатка R': 'Remainder output R',
  Делимое: 'Dividend',
  Частное: 'Quotient',
  Остаток: 'Remainder',
  'со знаком': 'signed',
  'без знака': 'unsigned',
  'Делитель {width} бит{v2}': 'Divider, {width}-bit{v2}',
  ' со знаком': ', signed',
  'Модуль / смена знака': 'Absolute value / negate',
  'Модуль числа со знаком (отбрасывает минус) или число с противоположным знаком. У самого маленького числа (например, −8 для 4 бит) результат совпадает с исходным: положительного −(−8) не существует.':
    'The absolute value of a signed number (drops the minus) or the number with the opposite sign. For the smallest number (for example −8 in 4 bits) the result equals the original: a positive −(−8) does not exist.',
  Операция: 'Operation',
  'Модуль |A|': 'Absolute value |A|',
  'Смена знака −A': 'Negate −A',
  'Модуль числа со знаком': 'Absolute value of a signed number',
  'Смена знака числа': 'Negate a number',
  'Код Грея': 'Gray code',
  'Переводит двоичное число в код Грея (соседние числа отличаются одним битом) или обратно.':
    'Converts a binary number to Gray code (neighbouring numbers differ by one bit) or back.',
  Направление: 'Direction',
  'Двоичный → Грея': 'Binary → Gray',
  'Грея → двоичный': 'Gray → binary',
  'Двоичный код → код Грея': 'Binary code → Gray code',
  'Код Грея → двоичный код': 'Gray code → binary code',
  'Дешифратор для семисегментного индикатора': 'Seven-segment display decoder',
  'Превращает цифру 0…9 (4 бита) в семь сегментов a…g (бит 0 — сегмент a). Как микросхема 7447. Можно показывать и буквы A…F, и инвертировать выходы для индикатора с общим анодом.':
    'Turns a digit 0…9 (4 bits) into seven segments a…g (bit 0 is segment a). Like the 7447 chip. It can also show letters A…F and invert the outputs for a common-anode display.',
  'Показывать A…F для кодов 10…15': 'Show A…F for codes 10…15',
  'Сегмент горит при 0 (общий анод)': 'Segment is lit at 0 (common anode)',
  Цифра: 'Digit',
  'Сегменты g f e d c b a': 'Segments g f e d c b a',
  'Дешифратор для семисегментного индикатора{v1}': 'Seven-segment display decoder{v1}',
  'Приоритетный шифратор с каскадированием': 'Cascadable priority encoder',
  'Выдаёт номер старшего активного входа. Как микросхема 74148: вход разрешения EI, выход EO («здесь пусто, включай следующую микросхему») и GS («есть активный вход»). С активным низким уровнем все сигналы инвертированы, как у настоящей микросхемы.':
    'Outputs the index of the highest active input. Like the 74148 chip: enable input EI, output EO ("nothing here, enable the next chip") and GS ("an input is active"). With active-low, all signals are inverted, as on the real chip.',
  'Выводы EI, EO, GS для каскадирования': 'Pins EI, EO, GS for cascading',
  'Активный низкий уровень (как у 74148)': 'Active low (like the 74148)',
  Входы: 'Inputs',
  'Нет входов': 'No inputs',
  'Есть вход': 'Has an input',
  'Приоритетный шифратор {width} → {v2}{v3}': 'Priority encoder {width} → {v2}{v3}',
  ' с EI, EO, GS': ' with EI, EO, GS',
  'Двоичный ↔ BCD': 'Binary ↔ BCD',
  'Переводит двоичное число в двоично-десятичный код (каждая десятичная цифра в своих четырёх битах) или обратно. Как микросхемы 74184 и 74185.':
    'Converts a binary number to binary-coded decimal (each decimal digit in its own four bits) or back. Like the 74184 and 74185 chips.',
  'Ширина двоичного числа, бит': 'Binary number width, bits',
  'Двоичный → BCD': 'Binary → BCD',
  'BCD → двоичный': 'BCD → binary',
  'Цифры BCD': 'BCD digits',
  '{bits} бит': '{bits}-bit',
  'Двоичный код → BCD': 'Binary code → BCD',
  'BCD → двоичный код': 'BCD → binary code',
  'Дешифратор BCD → «один из десяти»': 'BCD decoder → "one of ten"',
  'Цифра 0…9 в BCD превращается в «один из десяти». Для кодов 10…15 все выходы неактивны. Как микросхема 7442.':
    'A BCD digit 0…9 becomes "one of ten". For codes 10…15 all outputs are inactive. Like the 7442 chip.',
  'Активный низкий уровень (как у 7442)': 'Active low (like the 7442)',
  'Одна из десяти линий': 'One of ten lines',
  'Дешифратор BCD → десять линий': 'BCD decoder → ten lines',
  // --- Блоки: арифметика ---
  'Сумматор / вычитатель': 'Adder / subtractor',
  'Складывает или вычитает два числа без знака. Перенос (заём) за пределами ширины можно вывести отдельно.':
    'Adds or subtracts two unsigned numbers. The carry (borrow) beyond the width can be output separately.',
  'Сложение A + B': 'Addition A + B',
  'Вычитание A − B': 'Subtraction A − B',
  'Выбирается входом SUB': 'Chosen by input SUB',
  'Вход переноса CIN': 'Carry input CIN',
  'Выход переноса COUT': 'Carry output COUT',
  Заём: 'Borrow',
  Перенос: 'Carry',
  '1 — вычитать': '1 — subtract',
  'Перенос / заём': 'Carry / borrow',
  '{v1}, {width} бит': '{v1}, {width}-bit',
  Сумматор: 'Adder',
  Вычитатель: 'Subtractor',
  'Сумматор/вычитатель': 'Adder/subtractor',
  'Инкремент / декремент': 'Increment / decrement',
  'Прибавляет или вычитает единицу. После максимума инкремент даёт 0, после 0 декремент даёт максимум.':
    'Adds or subtracts one. After the maximum, increment gives 0; after 0, decrement gives the maximum.',
  'Прибавить 1': 'Add 1',
  'Вычесть 1': 'Subtract 1',
  Умножитель: 'Multiplier',
  'Умножает два числа. Результат шире: его ширина равна сумме ширин A и B, поэтому ничего не теряется.':
    'Multiplies two numbers. The result is wider: its width is the sum of the widths of A and B, so nothing is lost.',
  'Ширина A, бит': 'Width of A, bits',
  'Ширина B, бит': 'Width of B, bits',
  'произведение шире 64 бит': 'the product is wider than 64 bits',
  'Умножитель {widthA}×{widthB} бит{v3}': 'Multiplier {widthA}×{widthB} bits{v3}',
  Компаратор: 'Comparator',
  'Сравнивает A и B. Выберите, какие результаты нужны: равно, не равно, меньше, больше… Каждый — отдельный выход в 1 бит.':
    'Compares A and B. Choose which results you need: equal, not equal, less, greater… Each is a separate 1-bit output.',
  Выходы: 'Outputs',
  'выберите хотя бы один результат сравнения': 'choose at least one comparison result',
  'Компаратор {width} бит ({v2}){v3}': 'Comparator {width} bits ({v2}){v3}',
  ', со знаком': ', signed',
  Сдвиг: 'Shift',
  'Сдвигает биты числа влево или вправо. Количество шагов задано числом или приходит на вход N (бочечный сдвигатель).':
    'Shifts the bits of a number left or right. The number of steps is fixed or comes on input N (a barrel shifter).',
  'Влево (умножение на 2)': 'Left (multiply by 2)',
  'Вправо, сверху нули': 'Right, zeros on top',
  'Вправо с сохранением знака': 'Right, keeping the sign',
  'Откуда величина сдвига': 'Where the shift amount comes from',
  'Задана числом': 'A fixed number',
  'Приходит на вход N': 'Comes on input N',
  'Сдвиг на, бит': 'Shift by, bits',
  'Сколько шагов': 'Number of steps',
  'сдвиг не меньше ширины шины': 'the shift is not less than the bus width',
  'на {amount}': 'by {amount}',
  'по входу N': 'by input N',
  'Сдвиг {dir} {amount}': 'Shift {dir} {amount}',
  влево: 'left',
  вправо: 'right',
  'вправо со знаком': 'right, signed',
  'на N': 'by N',
  // --- Блоки: память и время ---
  'Если выключено, до сброса значение неизвестно (X, в предпросмотре «?»).':
    'If off, the value is unknown (X, shown as "?" in the preview) until a reset.',
  'Асинхронная установка в 1': 'Asynchronous preset to 1',
  'Регистр (D-триггер)': 'Register (D flip-flop)',
  'Запоминает вход D по положительному фронту такта CLK. Может иметь синхронный сброс, разрешение записи и асинхронные сброс/установку.':
    'Stores input D on the rising edge of clock CLK. It can have a synchronous reset, a write enable and asynchronous clear/preset.',
  'Синхронный сброс RST': 'Synchronous reset RST',
  'Значение при сбросе': 'Reset value',
  'Разрешение записи EN': 'Write enable EN',
  'Асинхронная установка APRE (в 1)': 'Asynchronous preset APRE (to 1)',
  'Не включайте одновременно ACLR и APRE и не подавайте на них 1 вместе: результат зависит от порядка.':
    'Do not enable ACLR and APRE together and do not drive both with 1: the result depends on the order.',
  'Сброс по такту': 'Reset on clock',
  'значение сброса {resetValue} не помещается в {width} бит':
    'the reset value {resetValue} does not fit in {width} bits',
  'асинхронный сброс и асинхронная установка вместе нельзя сочетать с начальным значением: отключите одно из трёх':
    'asynchronous clear and asynchronous preset cannot be combined with an initial value: turn one of the three off',
  'Регистр {width} бит: запись по фронту CLK{v2}{v3}{v4}{v5}':
    'Register, {width}-bit: written on the CLK edge{v2}{v3}{v4}{v5}',
  ', синхронный сброс': ', synchronous reset',
  ', разрешение EN': ', enable EN',
  ', асинхронный сброс': ', asynchronous clear',
  ', асинхронная установка': ', asynchronous preset',
  'T-триггер': 'T flip-flop',
  'На каждом положительном фронте такта меняет значение на противоположное, если T = 1. Если T = 0, значение сохраняется.':
    'On every rising clock edge it flips its value if T = 1. If T = 0, the value is kept.',
  '1 — переключать': '1 — toggle',
  'T-триггер: переключается по фронту CLK, если T = 1':
    'T flip-flop: toggles on the CLK edge if T = 1',
  Счётчик: 'Counter',
  'Считает такты: вверх, вниз или в обе стороны. Можно ограничить счёт модулем (например, до 9), обнулить, загрузить число и получить сигнал переполнения.':
    'Counts clock ticks: up, down or both ways. You can limit the count with a modulus (for example up to 9), clear it, load a number and get an overflow signal.',
  Вверх: 'Up',
  Вниз: 'Down',
  'Выбирается входом DIR': 'Chosen by input DIR',
  'Модуль (0 — без ограничения)': 'Modulus (0 — no limit)',
  'Счёт идёт от 0 до модуль−1 и затем начинается заново.':
    'The count goes from 0 to modulus−1 and then starts over.',
  'Разрешение счёта EN': 'Count enable EN',
  'Синхронное обнуление CLR': 'Synchronous clear CLR',
  'Параллельная загрузка LOAD/D': 'Parallel load LOAD/D',
  'Асинхронный сброс ACLR': 'Asynchronous clear ACLR',
  'Выход TC (последнее значение)': 'Output TC (last value)',
  'Разрешение счёта': 'Count enable',
  'Обнулить по такту': 'Clear on clock',
  'Загрузить D': 'Load D',
  '1 — вверх, 0 — вниз': '1 — up, 0 — down',
  'Конец счёта': 'End of count',
  'модуль должен быть 0 или от 2 до {v1}': 'the modulus must be 0 or from 2 to {v1}',
  'Сдвиговый регистр': 'Shift register',
  'На каждом такте сдвигает биты на одну позицию и принимает новый бит SI. Выпавший бит выходит на SO; все биты доступны на Q.':
    'On every clock tick it shifts the bits by one position and takes a new bit SI. The bit that falls out goes to SO; all bits are available on Q.',
  'Направление сдвига': 'Shift direction',
  'Влево (к старшему биту)': 'Left (towards the high bit)',
  'Вправо (к младшему биту)': 'Right (towards the low bit)',
  'Разрешение сдвига EN': 'Shift enable EN',
  'Новый бит': 'New bit',
  'Разрешение сдвига': 'Shift enable',
  'Выпавший бит': 'Bit shifted out',
  'нужно хотя бы 2 бита': 'at least 2 bits are required',
  '{width} бит {v2}': '{width}-bit {v2}',
  'Сдвиговый регистр {width} бит, сдвиг {v2}': 'Shift register, {width}-bit, shifting {v2}',
  'частота {hz} Гц слишком высока для такта {clockHz} Гц':
    'the frequency {hz} Hz is too high for a {clockHz} Hz clock',
  'частота слишком низкая: нужен счётчик шире 32 бит':
    'the frequency is too low: a counter wider than 32 bits would be needed',
  '{v1} МГц': '{v1} MHz',
  '{v1} кГц': '{v1} kHz',
  '{v1} Гц': '{v1} Hz',
  '{v1} с': '{v1} s',
  '{v1} мс': '{v1} ms',
  '{v1} мкс': '{v1} µs',
  'Частота входного такта, Гц': 'Input clock frequency, Hz',
  Гц: 'Hz',
  'На плате Tang Nano 20K такт равен 27 000 000 Гц. Меняйте только для учебных экспериментов.':
    'On the Tang Nano 20K board the clock is 27,000,000 Hz. Change it only for learning experiments.',
  'Делитель частоты': 'Frequency divider',
  'Превращает быстрый такт 27 МГц в медленный сигнал, заметный глазу: либо короткий импульс «раз в период» (разрешение для счётчиков), либо ровный меандр.':
    'Turns the fast 27 MHz clock into a slow signal you can see: either a short "once per period" pulse (an enable for counters) or a steady square wave.',
  'Что выдавать': 'What to output',
  'Меандр (0 и 1 по очереди)': 'Square wave (0 and 1 in turn)',
  'Короткий импульс раз в период': 'A short pulse once per period',
  'Частота, Гц': 'Frequency, Hz',
  'Делитель частоты: {v1} {v2} (счёт до {cycles})':
    'Frequency divider: {v1} {v2} (counts to {cycles})',
  меандр: 'square wave',
  импульс: 'pulse',
  'Синхронизатор (2 триггера)': 'Synchronizer (2 flip-flops)',
  'Пропускает асинхронный сигнал, например кнопку, через два триггера. Так сигнал надёжно привязывается к такту. Задерживает его на 2 такта.':
    'Passes an asynchronous signal, such as a button, through two flip-flops. This ties the signal reliably to the clock. It delays it by 2 clock ticks.',
  '2 триггера': '2 flip-flops',
  'Синхронизатор: два триггера подряд': 'Synchronizer: two flip-flops in a row',
  'Детектор фронта («нажатие»)': 'Edge detector ("press")',
  'Выдаёт ровно один такт единицы в момент, когда сигнал меняется с 0 на 1 (нажатие) или с 1 на 0 (отпускание).':
    'Outputs a 1 for exactly one clock tick when the signal changes from 0 to 1 (press) or from 1 to 0 (release).',
  'Какой фронт': 'Which edge',
  'Нажатие (0 → 1)': 'Press (0 → 1)',
  'Отпускание (1 → 0)': 'Release (1 → 0)',
  'Импульс на 1 такт': 'One-tick pulse',
  фронт: 'edge',
  'Детектор {v1}': 'Detector of {v1}',
  'нажатия (фронт 0 → 1)': 'press (edge 0 → 1)',
  'отпускания (фронт 1 → 0)': 'release (edge 1 → 0)',
  Антидребезг: 'Debounce',
  'Кнопка при нажатии «дребезжит»: несколько раз быстро меняет значение. Блок меняет выход, только когда вход держится одинаково заданное время.':
    'A button "bounces" when pressed: it changes value several times quickly. This block changes its output only when the input stays the same for the set time.',
  'Время устойчивости, мс': 'Stable time, ms',
  мс: 'ms',
  'время устойчивости слишком велико для 32-битного счётчика':
    'the stable time is too long for a 32-bit counter',
  '{ms} мс': '{ms} ms',
  'Антидребезг: выход меняется после {v1} тактов устойчивого входа':
    'Debounce: the output changes after {v1} clock ticks of a steady input',
  'Кнопка платы': 'Board button',
  'Кнопка S1 или S2 на Tang Nano 20K. Пока кнопка нажата, на выходе 1; когда отпущена — 0.':
    'Button S1 or S2 on the Tang Nano 20K. While the button is pressed the output is 1; when released, 0.',
  Кнопка: 'Button',
  '1 — нажата': '1 — pressed',
  кнопка: 'button',
  'Кнопка {v1} на плате (нажата = 1)': 'Button {v1} on the board (pressed = 1)',
  'Такт 27 МГц': '27 MHz clock',
  'Главный такт платы: 27 миллионов импульсов в секунду. От него работают все триггеры и счётчики.':
    'The main board clock: 27 million pulses per second. All flip-flops and counters run from it.',
  '27 МГц': '27 MHz',
  такт: 'clock',
  'Такт платы 27 МГц': 'Board clock, 27 MHz',
  'Светодиод платы': 'Board LED',
  'Один из шести светодиодов платы. Светится, когда на входе 1. Особенность платы (светодиод включается нулём) учтена автоматически.':
    'One of the six LEDs on the board. It lights when the input is 1. The board quirk (an LED turns on with 0) is handled automatically.',
  'Номер светодиода (LED0…LED5)': 'LED number (LED0…LED5)',
  '1 — светится': '1 — lit',
  светодиод: 'LED',
  'Светодиод LED{index}: светится при 1 (инверсия для платы добавлена)':
    'LED{index}: lit at 1 (inversion for the board is added)',
  'Шесть светодиодов': 'Six LEDs',
  'Все шесть светодиодов платы как одна 6-битная шина: бит 0 — LED0, бит 5 — LED5. Светится бит, равный 1.':
    'All six board LEDs as one 6-bit bus: bit 0 is LED0, bit 5 is LED5. A bit equal to 1 lights up.',
  'Бит = 1 — светится': 'Bit = 1 — lit',
  '6 светодиодов': '6 LEDs',
  'Шесть светодиодов платы: бит = 1 — светится (инверсия добавлена)':
    'Six board LEDs: bit = 1 — lit (inversion added)',
  'вверх/вниз': 'up/down',
  вверх: 'up',
  вниз: 'down',
  'Счётчик {width} бит, {dir}{modulus}': 'Counter, {width}-bit, counting {dir}{modulus}',
  ', модуль {modulus}': ', modulus {modulus}',
  // --- Библиотека: категории ---
  'Входы и выходы': 'Inputs and outputs',
  'Через них схема общается с внешним миром.':
    'Through these the schematic talks to the outside world.',
  Логика: 'Logic',
  'И, ИЛИ, НЕ и другие элементы.': 'AND, OR, NOT and other gates.',
  'Выбор и кодирование': 'Selecting and encoding',
  'Переключатели, дешифраторы, таблицы.': 'Switches, decoders, tables.',
  'Арифметика и сравнение': 'Arithmetic and comparison',
  'Числа: сложение, сравнение, сдвиги.': 'Numbers: addition, comparison, shifts.',
  Память: 'Memory',
  'Триггеры, счётчики, регистры. Работают по такту.':
    'Flip-flops, counters, registers. They work on the clock.',
  Шины: 'Buses',
  'Работа с группами проводов.': 'Working with groups of wires.',
  'Время и плата': 'Time and board',
  'Кнопки, светодиоды, такт и замедление.': 'Buttons, LEDs, the clock and slowing it down.',
  'Подписи и метки': 'Captions and labels',
  'Заметки и соединение по имени.': 'Notes and connecting by name.',
  // --- Библиотека: карточки ---
  'Сигнал, который приходит в устройство снаружи.':
    'A signal that comes into the device from outside.',
  'Сигнал, который устройство отдаёт наружу.': 'A signal the device sends out.',
  'Постоянное число.': 'A fixed number.',
  'Логическая 1 (VCC)': 'Logic 1 (VCC)',
  'Постоянная единица: на выходе всегда 1.': 'A constant one: the output is always 1.',
  'Логический 0 (GND)': 'Logic 0 (GND)',
  'Постоянный ноль: на выходе всегда 0.': 'A constant zero: the output is always 0.',
  'НЕ (NOT)': 'NOT',
  'Меняет 0 на 1 и 1 на 0.': 'Turns 0 into 1 and 1 into 0.',
  Буфер: 'Buffer',
  'Передаёт сигнал без изменений.': 'Passes the signal on unchanged.',
  '1 только когда все входы равны 1. Входов можно сделать до 8.':
    '1 only when all inputs are 1. You can have up to 8 inputs.',
  '1, когда хотя бы один вход равен 1.': '1 when at least one input is 1.',
  '1, когда входы разные (нечётное число единиц).':
    '1 when the inputs differ (an odd number of ones).',
  'И-НЕ (NAND)': 'NAND',
  'Инверсия И: 0 только когда все входы равны 1.': 'Inverted AND: 0 only when all inputs are 1.',
  'ИЛИ-НЕ (NOR)': 'NOR',
  'Инверсия ИЛИ: 1 только когда все входы равны 0.': 'Inverted OR: 1 only when all inputs are 0.',
  'Исключающее ИЛИ-НЕ (XNOR)': 'Exclusive NOR (XNOR)',
  '1, когда входы одинаковые.': '1 when the inputs are the same.',
  'Побитовое И шин': 'Bitwise AND of buses',
  'И для каждой пары битов двух шин.': 'AND for each pair of bits of two buses.',
  'Побитовое ИЛИ шин': 'Bitwise OR of buses',
  'ИЛИ для каждой пары битов двух шин.': 'OR for each pair of bits of two buses.',
  'Побитовое XOR шин': 'Bitwise XOR of buses',
  'XOR для каждой пары битов двух шин.': 'XOR for each pair of bits of two buses.',
  'Все биты шины равны 1': 'All bits of the bus are 1',
  'Свёртка И: 1, если все биты шины равны 1.': 'AND reduction: 1 if all bits of the bus are 1.',
  'Хотя бы один бит равен 1': 'At least one bit is 1',
  'Свёртка ИЛИ: 1, если в шине есть единица.': 'OR reduction: 1 if the bus has a 1.',
  'Чётность шины': 'Bus parity',
  'Свёртка XOR: 1, если единиц нечётное число.': 'XOR reduction: 1 if the number of ones is odd.',
  'Мультиплексор 2:1': '2:1 multiplexer',
  'S = 0 выбирает D0, S = 1 выбирает D1.': 'S = 0 selects D0, S = 1 selects D1.',
  'Мультиплексор 4:1': '4:1 multiplexer',
  'Двухбитный код S выбирает один из четырёх входов.':
    'A two-bit code S selects one of four inputs.',
  'Мультиплексор 8:1': '8:1 multiplexer',
  'Трёхбитный код S выбирает один из восьми входов.':
    'A three-bit code S selects one of eight inputs.',
  'Направляет вход на один из выходов, остальные равны 0.':
    'Routes the input to one of the outputs; the others are 0.',
  'Двоичное число → «один из N»: единица в разряде с этим номером.':
    'A binary number → "one of N": a 1 in the position with that number.',
  'Номер старшей единицы; V = 1, если единица есть.':
    'Index of the highest 1; V = 1 if there is a 1.',
  'По адресу выдаёт число из таблицы. До 64 слов.':
    'Outputs a number from the table by address. Up to 64 words.',
  'A + B. Лишний перенос можно вывести на COUT.': 'A + B. The extra carry can be sent to COUT.',
  'A − B. Заём можно вывести на COUT.': 'A − B. The borrow can be sent to COUT.',
  'Операцию выбирает вход SUB: 0 — сложить, 1 — вычесть.':
    'Input SUB selects the operation: 0 — add, 1 — subtract.',
  'Прибавляет единицу к числу; после максимума получается 0.':
    'Adds one to a number; after the maximum it becomes 0.',
  'Вычитает единицу из числа; после 0 получается максимум.':
    'Subtracts one from a number; after 0 it becomes the maximum.',
  'A × B; результат шире входов.': 'A × B; the result is wider than the inputs.',
  'Равно (A = B)': 'Equal (A = B)',
  'Выдаёт 1, если числа равны.': 'Outputs 1 if the numbers are equal.',
  'Сравнивает A и B: равно, меньше, больше…': 'Compares A and B: equal, less, greater…',
  'Сдвиг влево': 'Shift left',
  'Сдвигает биты влево: число умножается на 2 за каждый шаг.':
    'Shifts bits left: the number is multiplied by 2 at each step.',
  'Сдвиг вправо': 'Shift right',
  'Сдвигает биты вправо: число делится на 2 за каждый шаг.':
    'Shifts bits right: the number is divided by 2 at each step.',
  'Сдвигатель с входом N': 'Shifter with input N',
  'Количество шагов сдвига приходит на вход N.': 'The number of shift steps comes on input N.',
  'D-триггер': 'D flip-flop',
  'Запоминает D по фронту CLK.': 'Stores D on the CLK edge.',
  'D-триггер с разрешением': 'D flip-flop with enable',
  'Запоминает D по фронту CLK, только если EN = 1.': 'Stores D on the CLK edge only if EN = 1.',
  Регистр: 'Register',
  'Запоминает число по фронту CLK; есть сброс RST.':
    'Stores a number on the CLK edge; has a reset RST.',
  'Переключается при каждом такте, если T = 1.': 'Toggles on every clock tick if T = 1.',
  'Считает такты вверх. Можно добавить сброс, загрузку, модуль.':
    'Counts clock ticks up. You can add a reset, a load, a modulus.',
  'Счётчик по модулю 10': 'Modulo-10 counter',
  'Считает 0…9 и снова с нуля; TC = 1 на девятке.': 'Counts 0…9 and starts over; TC = 1 at nine.',
  'Сдвигает биты на каждом такте; новый бит берёт с SI.':
    'Shifts bits on every clock tick; takes the new bit from SI.',
  'Часть шины: биты от младшего до старшего.':
    'A part of a bus: bits from the lowest to the highest.',
  'Склеивает шины в одну; A — старшие биты.': 'Joins buses into one; A is the high bits.',
  'Шина → биты': 'Bus → bits',
  'Разделяет шину на отдельные провода.': 'Splits a bus into separate wires.',
  'Биты → шина': 'Bits → bus',
  'Собирает шину из отдельных проводов.': 'Gathers a bus from separate wires.',
  'Дополнить нулями': 'Pad with zeros',
  'Расширяет шину, добавляя нули слева.': 'Widens a bus by adding zeros on the left.',
  'Расширяет шину, копируя старший (знаковый) бит.': 'Widens a bus by copying the top (sign) bit.',
  'Кнопка S1': 'Button S1',
  'Кнопка на плате: нажата = 1.': 'A button on the board: pressed = 1.',
  'Кнопка S2': 'Button S2',
  'Главный такт платы.': 'The main board clock.',
  Светодиод: 'LED',
  'Светится, когда на входе 1.': 'Lights up when the input is 1.',
  'Шина из 6 бит на все светодиоды платы.': 'A 6-bit bus for all the LEDs on the board.',
  'Генератор меандра': 'Square-wave generator',
  'Из 27 МГц делает ровное мигание заданной частоты.':
    'Turns 27 MHz into a steady blink at the chosen frequency.',
  'Импульсы с частотой': 'Pulses at a frequency',
  'Короткий импульс раз в период. Служит разрешением для счётчиков.':
    'A short pulse once per period. Serves as an enable for counters.',
  Синхронизатор: 'Synchronizer',
  'Два триггера подряд: делают кнопку безопасной для работы по такту.':
    'Two flip-flops in a row: make a button safe to use with a clock.',
  'Игнорирует дребезг контактов кнопки.': 'Ignores the contact bounce of a button.',
  'Нажатие (фронт 0 → 1)': 'Press (edge 0 → 1)',
  'Один такт единицы в момент нажатия.': 'One clock tick of 1 at the moment of the press.',
  'И на 3 входа (AND3)': '3-input AND (AND3)',
  '1 только когда все три входа равны 1.': '1 only when all three inputs are 1.',
  'И на 4 входа (AND4)': '4-input AND (AND4)',
  '1 только когда все четыре входа равны 1.': '1 only when all four inputs are 1.',
  'ИЛИ на 3 входа (OR3)': '3-input OR (OR3)',
  '1, когда хотя бы один из трёх входов равен 1.': '1 when at least one of the three inputs is 1.',
  'ИЛИ на 4 входа (OR4)': '4-input OR (OR4)',
  '1, когда хотя бы один из четырёх входов равен 1.':
    '1 when at least one of the four inputs is 1.',
  'И-НЕ на 3 входа (NAND3)': '3-input NAND (NAND3)',
  '0 только когда все три входа равны 1.': '0 only when all three inputs are 1.',
  'ИЛИ-НЕ на 3 входа (NOR3)': '3-input NOR (NOR3)',
  '1 только когда все три входа равны 0.': '1 only when all three inputs are 0.',
  'Исключающее ИЛИ на 3 входа (XOR3)': '3-input XOR (XOR3)',
  '1, когда число единиц на входах нечётное. Так считают бит чётности.':
    '1 when the number of ones on the inputs is odd. This is how a parity bit is computed.',
  'Дешифратор 3→8 с разрешением (как 74138)': '3→8 decoder with enable (like the 74138)',
  'Из трёх бит делает «один из восьми»; вход EN включает дешифратор.':
    'Turns three bits into "one of eight"; input EN enables the decoder.',
  'Приоритетный шифратор 8→3 (как 74148)': '8→3 priority encoder (like the 74148)',
  'Номер старшей единицы из восьми входов; V = 1, если есть хоть одна.':
    'Index of the highest 1 among eight inputs; V = 1 if there is at least one.',
  'BCD → 7 сегментов (как 7447)': 'BCD → 7 segments (like the 7447)',
  'Цифра 0…9 превращается в сегменты индикатора a…g. Для 10…15 индикатор гаснет.':
    'A digit 0…9 becomes the display segments a…g. For 10…15 the display goes dark.',
  'Шестнадцатеричная цифра → 7 сегментов': 'Hexadecimal digit → 7 segments',
  'Цифра 0…F превращается в сегменты индикатора a…g.':
    'A digit 0…F becomes the display segments a…g.',
  'Двоичный → код Грея': 'Binary → Gray code',
  'Соседние числа в коде Грея отличаются одним битом.':
    'Neighbouring numbers in Gray code differ by one bit.',
  'Код Грея → двоичный': 'Gray code → binary',
  'Обратное преобразование из кода Грея в обычное двоичное число.':
    'The reverse conversion from Gray code to a plain binary number.',
  Полусумматор: 'Half adder',
  'Складывает два бита: сумма Y и перенос COUT.': 'Adds two bits: sum Y and carry COUT.',
  'Полный сумматор': 'Full adder',
  'Складывает два бита и перенос из младшего разряда: сумма Y и перенос COUT.':
    'Adds two bits and the carry from the lower position: sum Y and carry COUT.',
  '4-разрядный сумматор с переносом (как 7483)': '4-bit adder with carry (like the 7483)',
  'Складывает два 4-битных числа; есть вход и выход переноса.':
    'Adds two 4-bit numbers; has a carry input and output.',
  'Компаратор 4 бита (как 7485)': '4-bit comparator (like the 7485)',
  'Сравнивает два 4-битных числа: меньше, равно, больше.':
    'Compares two 4-bit numbers: less, equal, greater.',
  'Делитель (LPM_DIVIDE)': 'Divider (LPM_DIVIDE)',
  'Делит A на B нацело: частное Q и остаток R. Деление на ноль даёт неизвестный результат.':
    'Divides A by B as whole numbers: quotient Q and remainder R. Division by zero gives an unknown result.',
  'Модуль числа (LPM_ABS)': 'Absolute value (LPM_ABS)',
  'Модуль числа со знаком: убирает минус.':
    'The absolute value of a signed number: drops the minus.',
  'Смена знака': 'Negate',
  'Число с противоположным знаком (дополнительный код).':
    "The number with the opposite sign (two's complement).",
  'J — установить, K — сбросить, J = K = 1 — переключить.': 'J sets, K resets, J = K = 1 toggles.',
  'S — установить, R — сбросить, оба нули — хранить.': 'S sets, R resets, both zero — hold.',
  'D-защёлка (LATCH)': 'D latch (LATCH)',
  'Пока G = 1, Q повторяет D. При G = 0 Q хранит значение.':
    'While G = 1, Q follows D. When G = 0, Q holds the value.',
  'D-триггер с асинхронным сбросом': 'D flip-flop with asynchronous clear',
  'D-триггер, который сбрасывается сигналом ACLR сразу, не дожидаясь такта.':
    'A D flip-flop that is cleared by signal ACLR at once, without waiting for the clock.',
  'D-триггер с асинхронной установкой': 'D flip-flop with asynchronous preset',
  'D-триггер, который устанавливается в 1 сигналом APRE сразу, не дожидаясь такта.':
    'A D flip-flop that is set to 1 by signal APRE at once, without waiting for the clock.',
  'Реверсивный счётчик': 'Up/down counter',
  'Считает вверх или вниз: направление задаёт вход DIR.':
    'Counts up or down: input DIR sets the direction.',
  'Память для чтения и записи. Запись по фронту, если WE = 1; чтение по адресу сразу.':
    'Read/write memory. Written on the edge if WE = 1; read by address immediately.',
  'Приоритетный шифратор 8→3 с EI, EO, GS (как 74148)':
    '8→3 priority encoder with EI, EO, GS (like the 74148)',
  'Номер старшего активного входа. Все сигналы с активным низким уровнем, как у микросхемы; EO и GS позволяют соединять шифраторы в цепочку.':
    'Index of the highest active input. All signals are active low, as on the chip; EO and GS let you chain encoders.',
  'Шифратор 10→4: десятичная цифра в BCD (как 74147)':
    '10→4 encoder: decimal digit to BCD (like the 74147)',
  'Номер старшей нажатой цифры 0…9 в виде BCD с активным низким уровнем. Подходит для клавиатуры.':
    'The highest pressed digit 0…9 as active-low BCD. Good for a keypad.',
  'Двоичный → BCD (как 74184)': 'Binary → BCD (like the 74184)',
  'Переводит двоичное число в десятичные цифры, по четыре бита на цифру.':
    'Converts a binary number to decimal digits, four bits per digit.',
  'BCD → двоичный (как 74185)': 'BCD → binary (like the 74185)',
  'Собирает двоичное число из десятичных цифр BCD.':
    'Builds a binary number from BCD decimal digits.',
  'Дешифратор BCD → 10 линий (как 7442)': 'BCD → 10-line decoder (like the 7442)',
  'Цифра 0…9 превращается в «одну из десяти» линий. Для 10…15 все линии неактивны.':
    'A digit 0…9 becomes "one of ten" lines. For 10…15 all lines are inactive.',
  'Дешифратор 4→16 с разрешением (как 74154)': '4→16 decoder with enable (like the 74154)',
  'Из четырёх бит делает «один из шестнадцати»; вход EN включает дешифратор.':
    'Turns four bits into "one of sixteen"; input EN enables the decoder.',
  'Метка: передать': 'Label: send',
  'Даёт сигналу имя. Принять его можно в любом месте схемы.':
    'Gives a signal a name. It can be received anywhere in the schematic.',
  'Метка: принять': 'Label: receive',
  'Получает сигнал с одноимённой метки «передать».':
    'Gets the signal from the "send" label of the same name.',
  'Текст на схеме для пояснений.': 'Text on the schematic for explanations.',
  // --- Библиотека: схемы-эскизы ---
  'Q повторяет D после фронта CLK': 'Q follows D after the CLK edge',
  'EN = 0 — значение хранится': 'EN = 0 — the value is kept',
  'EN = 1 — по фронту CLK Q := D': 'EN = 1 — on the CLK edge Q := D',
  'T = 1: Q меняется на каждом фронте': 'T = 1: Q changes on every edge',
  '(модуль 4: после 3 снова 0)': '(modulus 4: after 3 comes 0 again)',
  'TC = 1 только при Q = 9': 'TC = 1 only when Q = 9',
  'SI = 1, затем 0 0 0:': 'SI = 1, then 0 0 0:',
  '(сдвиг влево на каждом такте)': '(shift left on every clock tick)',
  '27 МГц → 1 Гц:': '27 MHz → 1 Hz:',
  '   0,5 с  горит, 0,5 с нет': '   0.5 s on, 0.5 s off',
  '   один такт раз в период': '   one tick per period',
  '(позже на 2 такта)': '(2 clock ticks later)',
  'выход меняется, когда вход спокоен': 'the output changes when the input is calm',
  '(один такт)': '(one clock tick)',
  'A │ Y (2 бита → 4)': 'A │ Y (2 bits → 4)',
  '4 бита: 9 + 8 = 17 → Y = 1, COUT = 1': '4 bits: 9 + 8 = 17 → Y = 1, COUT = 1',
  'A[7..0] → срез [5..2]': 'A[7..0] → slice [5..2]',
  // --- Схема: проверки и сообщения ---
  'Схема: {message}': 'Schematic: {message}',
  'неверное значение параметра «{label}»': 'invalid value of the parameter "{label}"',
  '{bad}: нужно целое от {min} до {max}': '{bad}: a whole number from {min} to {max} is required',
  '{bad}: нужно число от {min} до {max}': '{bad}: a number from {min} to {max} is required',
  'нет параметров элемента.': 'the element has no parameters.',
  'неизвестные параметры элемента {title}.': 'unknown parameters of the element {title}.',
  'у элемента {title} нет параметра {key}.': 'the element {title} has no parameter {key}.',
  'файл .ysch должен содержать JSON.': 'a .ysch file must contain JSON.',
  'нет документа.': 'there is no document.',
  'неподдерживаемый формат или версия .ysch.': 'unsupported .ysch format or version.',
  'в документе есть неизвестные поля.': 'the document has unknown fields.',
  'максимум {MAX_NODES} элементов и {MAX_WIRES} соединений.':
    'at most {MAX_NODES} elements and {MAX_WIRES} connections.',
  'неверный или повторяющийся ID элемента.': 'invalid or duplicate element ID.',
  'неверные свойства элемента {id}.': 'invalid properties of the element {id}.',
  'неверный или повторяющийся ID соединения.': 'invalid or duplicate connection ID.',
  'неверный контакт в {id}.': 'invalid pin in {id}.',
  '{name}: префикс __ys_ зарезервирован для внутренних связей.':
    '{name}: the prefix __ys_ is reserved for internal nets.',
  'Имя {name} повторяется. Дайте элементам разные имена: двойным щелчком по элементу.':
    'The name {name} is used twice. Give the elements different names: double-click an element.',
  'Имя цепи {name} получается у двух элементов ({v2} и {name2}). Переименуйте один из них.':
    'The net name {name} would come from two elements ({v2} and {name2}). Rename one of them.',
  '{name}: вывод платы {pin} уже занят элементом {name2}. Каждую кнопку и светодиод можно использовать один раз.':
    '{name}: board pin {pin} is already used by the element {name2}. Each button and LED can be used once.',
  'Метка «принять» {name} не нашла метку «передать» с таким именем. Поставьте метку «передать» на нужный провод.':
    'The "receive" label {name} found no "send" label with that name. Put a "send" label on the wire you need.',
  'Метки {name} имеют разную ширину: {width} и {width2} бит.':
    'The labels {name} have different widths: {width} and {width2} bits.',
  '{id}: контакт отсутствует. Удалите этот провод и проведите его заново.':
    '{id}: the pin is missing. Delete this wire and draw it again.',
  '{id}: соединяйте выход с входом.': '{id}: connect an output to an input.',
  '{v1}.{name} ({width} бит) → {v4}.{name2} ({width2} бит): ширины не совпадают. Вставьте «Срез шины» или «Расширение шины» либо поменяйте ширину.':
    '{v1}.{name} ({width} bits) → {v4}.{name2} ({width2} bits): the widths do not match. Insert a "Bus slice" or "Bus extension", or change the width.',
  '{v1}.{name}: такт должен приходить непосредственно со входа устройства или «Такта 27 МГц». Для медленной работы используйте «Делитель частоты» и вход разрешения EN.':
    '{v1}.{name}: the clock must come directly from a device input or the "27 MHz clock". For slow operation use a "Frequency divider" and the enable input EN.',
  '{name}.{name2}: несколько источников. К одному входу можно подключить только один провод.':
    '{name}.{name2}: several sources. Only one wire can be connected to an input.',
  '{name}.{name2}: вход не соединён. Протяните провод от выхода другого элемента к этому входу.':
    "{name}.{name2}: the input is not connected. Draw a wire from another element's output to this input.",
  'Комбинационная петля. Выход элемента возвращается на его же вход без триггера. Обратная связь должна проходить через регистр или счётчик.':
    "Combinational loop. An element's output returns to its own input without a flip-flop. Feedback must go through a register or a counter.",
  'Добавьте хотя бы один выход устройства или светодиод.':
    'Add at least one device output or an LED.',
  '{name}: вход устройства нигде не используется.':
    '{name}: the device input is not used anywhere.',
  '{name}: выход никуда не подключён, элемент ничего не делает. Подключите его или удалите.':
    '{name}: the output is connected to nothing, so the element does nothing. Connect it or delete it.',
  'выберите выход, затем вход.': 'choose an output, then an input.',
  'ширины {width} и {width2} не совпадают.': 'the widths {width} and {width2} do not match.',
  'этот вход уже соединён. Удалите старое соединение.':
    'this input is already connected. Delete the old connection.',
  'достигнут предел соединений.': 'the connection limit is reached.',
  'Комбинационная петля': 'Combinational loop',
  'это соединение создаёт комбинационную петлю.': 'this connection creates a combinational loop.',
  'достигнут предел {MAX_NODES} элементов.': 'the limit of {MAX_NODES} elements is reached.',
  'в библиотеке нет элемента {entryId}.': 'there is no element {entryId} in the library.',
  'неверное имя верхнего модуля.': 'invalid top module name.',
  'в первой версии допустим один документ .ysch на проект.':
    'in the first version only one .ysch document per project is allowed.',
  'файл {generated} уже существует и будет перезаписан. Переименуйте его.':
    'the file {generated} already exists and would be overwritten. Rename it.',
  'в буфере обмена нет схемы.': 'there is no schematic in the clipboard.',
  'в буфере обмена нет схемы Logra.': 'there is no Logra schematic in the clipboard.',
  'максимум 200 элементов и 2000 соединений.': 'at most 200 elements and 2000 connections.',
  Такт: 'Clock',
  // --- Примеры ---
  'Кнопка → светодиод': 'Button → LED',
  'Самая простая схема: пока нажата S1, светится LED0.':
    'The simplest schematic: while S1 is pressed, LED0 is lit.',
  'Нажмите S1 — загорается LED0. Отпустите — гаснет.':
    'Press S1 and LED0 lights up. Release it and it goes out.',
  'И, ИЛИ, исключающее ИЛИ на двух кнопках': 'AND, OR, XOR on two buttons',
  'Две кнопки и три элемента: каждый показывает результат на своём светодиоде.':
    'Two buttons and three gates: each shows its result on its own LED.',
  'LED0 — обе кнопки нажаты (И); LED1 — хотя бы одна (ИЛИ); LED2 — ровно одна (XOR).':
    'LED0: both buttons pressed (AND); LED1: at least one (OR); LED2: exactly one (XOR).',
  'Мигалка 1 Гц': '1 Hz blinker',
  'Делитель частоты превращает 27 МГц в ровное мигание раз в секунду.':
    'A frequency divider turns 27 MHz into a steady blink once per second.',
  'LED0 сам мигает: полсекунды горит, полсекунды не горит. Кнопки не нужны.':
    'LED0 blinks on its own: half a second on, half a second off. No buttons needed.',
  'Счётчик на светодиодах': 'LED counter',
  'Раз в четверть секунды счётчик увеличивается на 1; число показано на шести светодиодах двоичным кодом.':
    'Every quarter of a second the counter increases by 1; the number is shown on six LEDs in binary.',
  'Светодиоды считают от 0 до 63 в двоичном коде и начинают заново. Кнопка S1 обнуляет счёт.':
    'The LEDs count from 0 to 63 in binary and start over. Button S1 clears the count.',
  'Бегущий огонь на сдвиговом регистре': 'Running light on a shift register',
  'Единица «бежит» по шести светодиодам и возвращается в начало.':
    'A single 1 "runs" along six LEDs and returns to the start.',
  'Один светящийся светодиод перемещается от LED0 к LED5 примерно три раза в секунду.':
    'One lit LED moves from LED0 to LED5 about three times a second.',
  'Кнопка с антидребезгом переключает светодиод': 'A debounced button toggles an LED',
  'Кнопку «чистят» синхронизатором и антидребезгом; каждое нажатие меняет состояние LED0 на противоположное.':
    'The button is "cleaned" with a synchronizer and debounce; each press flips the state of LED0.',
  'Каждое нажатие S1 включает или выключает LED0, без случайных двойных срабатываний.':
    'Each press of S1 turns LED0 on or off, with no accidental double triggers.',
  // --- Библиотека, свойства, добавление схемы ---
  'Символ: {title}': 'Symbol: {title}',
  'Библиотека элементов': 'Element library',
  Библиотека: 'Library',
  'Поиск элемента': 'Search for an element',
  'Найти: счётчик, И, кнопка…': 'Search: counter, AND, button…',
  'Ничего не найдено. Попробуйте другое слово.': 'Nothing found. Try another word.',
  'Нажмите на элемент или перетащите его на схему.':
    'Click an element or drag it onto the schematic.',
  'Счёт до {v1}: {v2} {v3}.': 'Counts to {v1}: {v2} {v3}.',
  'смена уровня каждые': 'the level flips every',
  'импульс каждые': 'a pulse every',
  ' тактов': ' ticks',
  'Точная частота: {v1}, период {v2}.': 'Exact frequency: {v1}, period {v2}.',
  'Выход меняется, когда вход устойчив {v1} тактов.':
    'The output changes when the input has been steady for {v1} ticks.',
  'Считает 0…{v1} и начинает заново.': 'Counts 0…{v1} and starts over.',
  'Вход {name}': 'Input {name}',
  'Таблица значений': 'Table of values',
  'Слово {index}': 'Word {index}',
  'Проверьте свойства.': 'Check the properties.',
  'Свойства: {title}': 'Properties: {title}',
  'Что получится': 'What you will get',
  'Имя в схеме и в Verilog': 'Name in the schematic and in Verilog',
  'Латинские буквы, цифры и подчёркивание; начинается с буквы':
    'Latin letters, digits and underscore; starts with a letter',
  Применить: 'Apply',
  'Вывод платы назначается автоматически, вкладку «Выводы» трогать не нужно.':
    'The board pin is assigned automatically; you do not need to touch the "Pins" tab.',
  'Назначить вывод платы': 'Assign a board pin',
  'Удалить элемент': 'Delete element',
  'Временная диаграмма': 'Timing diagram',
  'В проекте уже есть схема: допустим один файл .ysch.':
    'The project already has a schematic: only one .ysch file is allowed.',
  'В проекте уже есть файл {name}. Из схемы получился бы тот же {generated}, и сборка не станет его перезаписывать.':
    'The project already has a file {name}. The schematic would produce the same {generated}, and the build will not overwrite it.',
  'Верхний модуль «{top}» уже описан в {name}. Схема тоже создаёт модуль с этим именем, а подмодулей схема не поддерживает, поэтому у проекта получились бы два верхних модуля.':
    'The top module "{top}" is already described in {name}. The schematic would also create a module with this name, and schematics do not support submodules, so the project would end up with two top modules.',
  'Вывод {pin} уже занят портом {signal}. Для {signal2} назначение не добавлено.':
    'Pin {pin} is already used by port {signal}. No assignment was added for {signal2}.',
  '{signal}: назначение не удалось.': '{signal}: the assignment failed.',
  'Такого контакта нет.': 'There is no such pin.',
  'Это два выхода. Провод должен соединять выход одного элемента со входом другого.':
    'These are two outputs. A wire must connect the output of one element to the input of another.',
  'Это два входа. Начните провод с выхода элемента.':
    "These are two inputs. Start the wire at an element's output.",
  'Ширины не совпадают: {width} и {width2} бит. Вставьте «Срез шины» или «Расширение шины».':
    'The widths do not match: {width} and {width2} bits. Insert a "Bus slice" or "Bus extension".',
  'К этому входу уже подключён провод. Удалите его или перетащите его конец.':
    'A wire is already connected to this input. Delete it or drag its end.',
  'Соединение невозможно.': 'The connection is not possible.',
  // --- Редактор ---
  '{v1} и ещё {v2}': '{v1} and {v2} more',
  'Выводы платы назначены: {v1}.': 'Board pins assigned: {v1}.',
  'Выводы платы не назначены ({length}): {v2}': 'Board pins not assigned ({length}): {v2}',
  'Перетащить от контакта': 'Drag from a pin',
  'Провести провод; цель подсвечивается': 'Draw a wire; the target is highlighted',
  'Щелчок на выход, затем на вход': 'Click an output, then an input',
  'Соединить без перетаскивания': 'Connect without dragging',
  'Shift + щелчок': 'Shift + click',
  'Добавить к выделению или убрать': 'Add to or remove from the selection',
  'Рамка на пустом месте': 'Drag a box on empty space',
  'Выделить несколько элементов': 'Select several elements',
  'Выделить всё': 'Select all',
  'Копировать, вырезать, вставить (в том числе в другой проект)':
    'Copy, cut, paste (including into another project)',
  Дублировать: 'Duplicate',
  'Удалить выделенное': 'Delete the selection',
  'Повернуть на 90°': 'Rotate by 90°',
  'Отразить по горизонтали': 'Flip horizontally',
  Стрелки: 'Arrow keys',
  'Сдвинуть выделенное на шаг сетки (Shift — на 5 шагов)':
    'Move the selection by a grid step (Shift — 5 steps)',
  'F2 или двойной щелчок': 'F2 or double-click',
  'Переименовать элемент': 'Rename the element',
  'Найти элемент по имени': 'Find an element by name',
  'Показать всю схему; Z — приблизить к выделению':
    'Show the whole schematic; Z — zoom to the selection',
  'Масштаб; колесо мыши — масштаб к курсору': 'Zoom; mouse wheel — zoom towards the cursor',
  'Пробел + перетаскивание, колёсико мыши или «Рука»':
    'Space + drag, the mouse wheel or the "Hand"',
  'Двигать полотно': 'Pan the canvas',
  'Отменить и повторить': 'Undo and redo',
  'Отменить действие или снять выделение': 'Cancel the action or clear the selection',
  '? или F1': '? or F1',
  'Эта подсказка': 'This help',
  'Элемент {name}: {v2}{v3}': 'Element {name}: {v2}{v3}',
  ', есть ошибка': ', has an error',
  вход: 'input',
  выход: 'output',
  ', не соединён': ', not connected',
  'Не удалось прочитать схему.': 'Could not read the schematic.',
  'Действие невозможно.': 'The action is not possible.',
  'Провод {name}.{pin} → {v3}.{pin2}, {width} бит. Delete — удалить.':
    'Wire {name}.{pin} → {v3}.{pin2}, {width}-bit. Delete — remove.',
  'Скопировано элементов: {length}.': 'Elements copied: {length}.',
  'Буфер пуст. Сначала скопируйте элементы (Ctrl+C).':
    'The clipboard is empty. Copy some elements first (Ctrl+C).',
  'Элемент «{find}» не найден.': 'Element "{find}" not found.',
  'Найдено: {name} ({v2} из {length}).': 'Found: {name} ({v2} of {length}).',
  'Проверьте имя верхнего модуля.': 'Check the top module name.',
  'Отпустите кнопку мыши, чтобы соединить.': 'Release the mouse button to connect.',
  'Ведите провод к контакту. Подходящие контакты подсвечены зелёным, неподходящие — красным.':
    'Move the wire to a pin. Suitable pins are highlighted green, unsuitable ones red.',
  'Выбран контакт {v1}.{pin}. Нажмите другой контакт, чтобы соединить. Esc — отмена.':
    'Pin {v1}.{pin} selected. Click another pin to connect. Esc — cancel.',
  'Предпросмотр: нажимайте входы и кнопки, шагайте тактом. Это быстрая проверка; точное моделирование — на вкладках «Диаграммы» и «Виртуальная».':
    'Preview: click the inputs and buttons, step the clock. This is a quick check; accurate simulation is on the "Waveforms" and "Virtual" tabs.',
  'Перетащите элемент из библиотеки. Протяните провод от контакта к контакту. Подсказки — клавиша «?».':
    'Drag an element from the library. Draw a wire from pin to pin. Press "?" for tips.',
  'В буфере нет схемы Logra.': 'There is no Logra schematic in the clipboard.',
  'Инструменты конструктора': 'Designer tools',
  'Отменить (Ctrl+Z)': 'Undo (Ctrl+Z)',
  'Повторить (Ctrl+Y)': 'Redo (Ctrl+Y)',
  'Вырезать (Ctrl+X)': 'Cut (Ctrl+X)',
  'Копировать (Ctrl+C)': 'Copy (Ctrl+C)',
  'Вставить (Ctrl+V)': 'Paste (Ctrl+V)',
  'Повернуть на 90° (R)': 'Rotate by 90° (R)',
  'Отразить (M)': 'Flip (M)',
  'Удалить (Delete)': 'Delete (Delete)',
  'Найти по имени': 'Find by name',
  'Рука: двигать полотно': 'Hand: pan the canvas',
  'Уменьшить масштаб (−)': 'Zoom out (−)',
  'Текущий масштаб': 'Current zoom',
  'Увеличить масштаб (+)': 'Zoom in (+)',
  'Показать всю схему (F)': 'Show the whole schematic (F)',
  'Стиль обозначений элементов': 'Element symbol style',
  'Вентили привычной формы: И, ИЛИ, НЕ': 'Gates in the familiar shapes: AND, OR, NOT',
  ЕСКД: 'IEC',
  'Прямоугольники с обозначениями &, ≥1, =1 по ГОСТ 2.743 и IEC 60617':
    'Rectangles with the labels &, ≥1, =1 per GOST 2.743 and IEC 60617',
  Предпросмотр: 'Preview',
  Примеры: 'Examples',
  'Вернуться к схеме': 'Back to the schematic',
  'Свойства и проблемы': 'Properties and problems',
  'Горячие клавиши (?)': 'Keyboard shortcuts (?)',
  'Verilog из схемы': 'Verilog from the schematic',
  'Сначала исправьте схему:\n{v1}': 'Fix the schematic first:\n{v1}',
  'Конструктор логической схемы': 'Logic schematic designer',
  'Схема пуста. Выберите элемент в библиотеке слева или откройте готовый пример.':
    'The schematic is empty. Pick an element in the library on the left or open a ready-made example.',
  'Открыть примеры': 'Open examples',
  'Текст заметки': 'Note text',
  'Новое имя элемента': 'New element name',
  Копировать: 'Copy',
  Вырезать: 'Cut',
  Вставить: 'Paste',
  'Повернуть (R)': 'Rotate (R)',
  'Переименовать (F2)': 'Rename (F2)',
  'Приблизить к выделению (Z)': 'Zoom to the selection (Z)',
  Удалить: 'Delete',
  'Свойства и проверка схемы': 'Properties and schematic check',
  'Предпросмотр значений': 'Preview of values',
  Стоп: 'Stop',
  Ход: 'Run',
  'По левому краю': 'Align left',
  'По верху': 'Align top',
  'По центру ↔': 'Center ↔',
  'По центру ↕': 'Center ↕',
  'Распределить ↔': 'Distribute ↔',
  'Распределить ↕': 'Distribute ↕',
  передаёт: 'sends',
  принимает: 'receives',
  'Исправьте перед сборкой · {length}': 'Fix before building · {length}',
  'Схема готова · замечаний {length}': 'Schematic ready · notes: {length}',
  'Схема готова к сборке': 'The schematic is ready to build',
  'Горячие клавиши конструктора': 'Designer keyboard shortcuts',
  'Готовые схемы': 'Ready-made schematics',
  '{nodes} элементов · {wires} проводов': '{nodes} elements · {wires} wires',
  '{nodes} элементов · {wires} проводов · рамка — выделение · колесо — масштаб · пробел + мышь — сдвиг':
    '{nodes} elements · {wires} wires · drag a box to select · wheel to zoom · space + mouse to pan',
  'Быстрая проверка в браузере: показывает значения на проводах. Точное моделирование выполняют вкладки «Диаграммы» и «Виртуальная».':
    'A quick check in the browser: it shows the values on the wires. Accurate simulation is done on the "Waveforms" and "Virtual" tabs.',
  Сброс: 'Reset',
  'Ускорить делители частоты (период — несколько тактов)':
    'Speed up the frequency dividers (the period becomes a few ticks)',
  'Выполнено тактов: {cycles}. «?» — значение неизвестно до сброса или загрузки.':
    'Clock ticks done: {cycles}. "?" means the value is unknown until a reset or load.',
  'Выбрано элементов: {count}': 'Elements selected: {count}',
  'Выберите элемент, чтобы изменить имя, ширину и другие свойства.':
    'Select an element to change its name, width and other properties.',
  'Связанные метки «{name}»:': 'Linked labels "{name}":',
  'Можно синтезировать и проверить диаграммы. Выводы платы для кнопок и светодиодов назначаются автоматически.':
    'You can synthesize and check the waveforms. Board pins for buttons and LEDs are assigned automatically.',
  'Горячие клавиши': 'Keyboard shortcuts',
  Закрыть: 'Close',
  'Выбранный пример заменит текущую схему. Это можно отменить кнопкой «Отменить» (Ctrl+Z). Кнопки, светодиоды и такт получат выводы платы автоматически.':
    'The chosen example will replace the current schematic. You can undo this with the Undo button (Ctrl+Z). Buttons, LEDs and the clock get their board pins automatically.',
  Открыть: 'Open',
  'конструктор схем': 'schematic designer',
  'Открываем конструктор…': 'Opening the designer…',
  'В этом проекте нет схемы': 'This project has no schematic',
  'Добавить схему в этот проект': 'Add a schematic to this project',
  'Безопасный выбор — новый проект из логических элементов: текущий проект останется в библиотеке без изменений.':
    'The safe choice is a new project from logic elements: the current project stays in the library unchanged.',
  'Новый проект из элементов': 'New project from elements',
  'Логическое выражение': 'Logic expression',
  'AND + OR: от выражения к таблице LUT.': 'AND + OR: from an expression to a LUT table.',
};
