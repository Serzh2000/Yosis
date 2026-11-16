/** Английские тексты области «chip»: кристалл, RTL, выводы платы. Ключ — русская фраза из кода. */
export const chip: Record<string, string> = {
  // Планировщик выводов
  Вход: 'Input',
  Выход: 'Output',
  '{label}: назначено {count}. Записано в {fileName}.':
    '{label}: {count} assigned. Saved to {fileName}.',
  'Не удалось применить подсказки.': 'Could not apply the suggestions.',
  'Не удалось сохранить назначение.': 'Could not save the assignment.',
  'Сигнал {other} остался без вывода.': 'Signal {other} is left without a pin.',
  'Сигнал {other} переехал на вывод {old}.': 'Signal {other} moved to pin {old}.',
  '{name}: вывод освобождён.': '{name}: pin released.',
  '{name} → {pin}. Назначение записано в {fileName}.':
    '{name} → {pin}. Assignment saved to {fileName}.',
  '// Физические ограничения Tang Nano 20K.': '// Physical constraints for Tang Nano 20K.',
  '// Назначьте порты на рисунке корпуса или добавьте IO_LOC / IO_PORT вручную.':
    '// Assign ports on the package drawing or add IO_LOC / IO_PORT by hand.',
  'Вид назначений': 'Assignment view',
  'Планировщик выводов': 'Pin planner',
  'Текст .cst': '.cst text',
  Файл: 'File',
  'Файл назначений': 'Assignment file',
  'Файл назначений ещё не создан': 'The assignment file has not been created yet',
  'Создать {fileName}': 'Create {fileName}',
  'Как назначить вывод': 'How to assign a pin',
  готово: 'done',
  'Выберите сигнал': 'Pick a signal',
  'Порт вашей схемы в таблице слева': 'A port of your design in the table on the left',
  'Выберите контакт': 'Pick a pad',
  'Нажмите на рисунке микросхемы или в списке': 'Click it on the chip drawing or in the list',
  'Нажмите «Назначить»': 'Press "Assign"',
  Назначить: 'Assign',
  'Запись появится в файле .cst': 'The entry will appear in the .cst file',
  'Порты прочитаны из текста Verilog (предварительно). Нажмите «Прочитать порты», чтобы проверить их по настоящему синтезу.':
    'Ports were read from the Verilog text (preliminary). Press "Read ports" to check them against a real synthesis.',
  'Портов пока нет: проект ещё не проанализирован. Нажмите «Прочитать порты», и они появятся здесь, а после синтеза список обновляется сам.':
    'No ports yet: the project has not been analyzed. Press "Read ports" and they will appear here; after synthesis the list updates itself.',
  'Читаем порты…': 'Reading ports…',
  'Прочитать порты': 'Read ports',
  'Порты верхнего модуля': 'Top module ports',
  '{bits} бит портов · {count} назначений': '{bits} port bits · {count} assignments',
  'Найти порт': 'Find a port',
  'Найти порт…': 'Find a port…',
  Сигнал: 'Signal',
  Направление: 'Direction',
  Вывод: 'Pin',
  'Вывод для {name}': 'Pin for {name}',
  'занят: {holder}': 'taken by {holder}',
  '— нет': '— none',
  'После анализа здесь появятся отдельные биты входов и выходов. Имена берутся из настоящего нетлиста Yosys.':
    'After analysis the individual input and output bits will appear here. The names come from the real Yosys netlist.',
  Подсказки: 'Suggestions',
  'Подсказки по именам портов': 'Suggestions from port names',
  'Светодиоды по порядку': 'LEDs in order',
  'Назначить LED по порядку': 'Assign LEDs in order',
  вывод: 'pin',
  'Все подсказки': 'All suggestions',
  'Применить все подсказки': 'Apply all suggestions',
  'Назначение выбранного порта': 'Assignment of the selected port',
  служебный: 'service',
  'Вывод выбранного порта': 'Pin of the selected port',
  Подтяжка: 'Pull',
  'Подтяжка входа': 'Input pull',
  Нет: 'None',
  'К 1 (UP)': 'To 1 (UP)',
  'К 0 (DOWN)': 'To 0 (DOWN)',
  '3,3 В': '3.3 V',
  'Вывод {pin} сейчас у сигнала {swapWith}. При назначении они поменяются местами.':
    'Pin {pin} currently belongs to signal {swapWith}. When you assign it, they will swap places.',
  Освободить: 'Release',
  'Выберите порт в таблице. Наведите на контакт, чтобы увидеть его банк, функцию и текущее назначение.':
    'Pick a port in the table. Hover a pad to see its bank, function and current assignment.',
  'Проверка назначений': 'Assignment check',
  'Корпус и назначение': 'Package and assignment',
  Банк: 'Bank',
  'Фильтр I/O банка': 'I/O bank filter',
  Все: 'All',
  'Назначение портов на корпус QN88, вид сверху': 'Port assignment on the QN88 package, top view',
  'Вид сверху · номера корпуса': 'Top view · package numbers',
  питание: 'power',
  'Что написано у вывода {number}': 'What is written at pin {number}',
  'Закрыть пояснение': 'Close the explanation',
  Понятно: 'Got it',
  'Цвета и обозначения': 'Colors and symbols',
  'Условные обозначения': 'Legend',
  'Цвета контактов': 'Pad colors',
  'Свободный контакт: цвет показывает банк': 'Free pad: the color shows the bank',
  'Назначен: рядом подписан сигнал': 'Assigned: the signal is written next to it',
  'Подключён к детали платы (LED, кнопка, генератор, UART)':
    'Wired to a board part (LED, button, oscillator, UART)',
  'Служебный: питание, JTAG, флеш. Назначать нельзя':
    'Service: power, JTAG, flash. Cannot be assigned',
  'Цвета банков': 'Bank colors',
  банк: 'bank',
  'Что это значит': 'What this means',
  '— группа соседних контактов, у которых одно общее питание для сигналов.':
    '— a group of neighboring pads that share one supply voltage for their signals.',
  '— обычный цифровой сигнал: 0 — это 0 В, 1 — это 3,3 В.':
    '— an ordinary digital signal: 0 is 0 V, 1 is 3.3 V.',
  'Питание и JTAG недоступны для назначения. Дифференциальные пары редактируются в тексте .cst.':
    'Power and JTAG pads cannot be assigned. Differential pairs are edited in the .cst text.',
  'Схема платы': 'Board schematic',

  // Выводы платы: подписи и подсказки
  'светится при 0': 'lit when 0',
  'I/O · сверяйте подключение со схемой платы':
    'I/O · check the wiring against the board schematic',
  'Питание, земля или служебный контакт': 'Power, ground or a service pad',
  'Генератор 27 МГц': '27 MHz oscillator',
  'Кнопка S2 · нажата = 1': 'Button S2 · pressed = 1',
  'Кнопка S1 · нажата = 1': 'Button S1 · pressed = 1',
  'Верхний модуль содержит больше 4096 бит портов.': 'The top module has more than 4096 port bits.',
  'Вывод {number} занят питанием, конфигурацией или программатором платы.':
    'Pin {number} is used by power, configuration or the board programmer.',
  'Вывод {number}: {label}. Здесь нужен {kind} схемы.':
    'Pin {number}: {label}. This pin needs a design {kind}.',
  вход: 'input',
  выход: 'output',
  'Не удалось разобрать свойства {signal}. Исправьте IO_PORT в текстовом редакторе.':
    'Could not parse the properties of {signal}. Fix IO_PORT in the text editor.',
  'Для {signal} заданы противоречивые свойства {key} в .cst.':
    '{signal} has conflicting {key} properties in the .cst.',
  'Сигнал отсутствует в свежем верхнем модуле. Обновите порты.':
    'The signal is missing from the fresh top module. Refresh the ports.',
  'Это имя порта требует ручного назначения в .cst.':
    'This port name needs a manual assignment in the .cst.',
  'Выберите файл .cst.': 'Choose a .cst file.',
  'Неизвестная подтяжка.': 'Unknown pull mode.',
  'Такого вывода нет у QN88.': 'The QN88 package has no such pin.',
  'Вывод {pin} уже назначен сигналу {signal} ({file}:{line}).':
    'Pin {pin} is already assigned to signal {signal} ({file}:{line}).',
  'Дифференциальные и другие стандарты редактируйте в тексте .cst. Планировщик поддерживает LVCMOS33.':
    'Edit differential and other standards in the .cst text. The planner supports LVCMOS33.',
  'Парное или символьное назначение редактируйте в тексте .cst.':
    'Edit paired or symbolic assignments in the .cst text.',
  '// Назначения Tang Nano 20K: номера выводов корпуса QN88.':
    '// Tang Nano 20K assignments: pin numbers of the QN88 package.',
  '{signal}: несколько IO_LOC.': '{signal}: several IO_LOC lines.',
  '{signal}: нет такого порта в верхнем модуле.': '{signal}: no such port in the top module.',
  '{signal}: символьное назначение, проверяйте в .cst.':
    '{signal}: symbolic assignment, check it in the .cst.',
  'Вывод {number}: конфликт {first} и {second}.':
    'Pin {number}: conflict between {first} and {second}.',
  '{signal}: вывод {number} вне корпуса QN88.':
    '{signal}: pin {number} is outside the QN88 package.',
  'Вывод 4 подключён к кварцевому генератору 27 МГц.':
    'Pin 4 is wired to the 27 MHz crystal oscillator.',
  'Сброс удобно подать кнопкой S1 (вывод 88): нажата = 1.':
    'Reset is convenient to drive with button S1 (pin 88): pressed = 1.',
  'Кнопка S1 (вывод 88): нажата = 1, отпущена = 0.':
    'Button S1 (pin 88): pressed = 1, released = 0.',
  'Кнопка S2 (вывод 87): нажата = 1, отпущена = 0.':
    'Button S2 (pin 87): pressed = 1, released = 0.',
  'Вывод 70 принимает данные от компьютера через USB (UART RX).':
    'Pin 70 receives data from the computer over USB (UART RX).',
  'Вывод 69 передаёт данные в компьютер через USB (UART TX).':
    'Pin 69 sends data to the computer over USB (UART TX).',
  'Светодиод LED{led} (вывод {pin}) горит при 0.': 'LED{led} (pin {pin}) lights when the pin is 0.',
  'Бит {bit} → светодиод LED{position} (вывод {pin}).': 'Bit {bit} → LED{position} (pin {pin}).',
  'Этот вывод занят платой (питание, программатор или флеш). Его нельзя назначать.':
    'This pin is used by the board (power, programmer or flash). It cannot be assigned.',
  'Уже назначен: {names}.': 'Already assigned: {names}.',
  'К одному выводу назначено несколько сигналов: {names}.':
    'Several signals are assigned to one pin: {names}.',
  'На плате к этому выводу уже подключено: {title}. Назначайте сигнал, только если хотите им управлять.':
    'This pin is already wired on the board to: {title}. Assign a signal only if you want to drive it.',
  'Служебный контакт': 'Service pad',
  'Свободный вывод ввода-вывода': 'Free I/O pin',
  'Питание, земля или служебный контакт корпуса.': 'Power, ground or a service pad of the package.',
  'К этому выводу на плате ничего не припаяно, он выведен на разъём. Сигнал, назначенный сюда, появится на контакте разъёма как напряжение 0 или 3,3 В.':
    'Nothing is soldered to this pin on the board; it goes to a header. A signal assigned here appears on the header pin as a voltage of 0 or 3.3 V.',
  // Детали платы
  'Светодиод LED{index} на плате. Он горит, когда на выводе 0, и гаснет, когда на выводе 1.':
    'LED{index} on the board. It lights when the pin is 0 and goes dark when the pin is 1.',
  '27 МГц': '27 MHz',
  'Генератор тактов 27 МГц': '27 MHz clock oscillator',
  'Кварцевый генератор. Сигнал на этом выводе 27 миллионов раз в секунду меняется с 0 на 1 и обратно: это «метроном» для всей схемы.':
    'A crystal oscillator. The signal on this pin switches from 0 to 1 and back 27 million times a second: it is the "metronome" of the whole design.',
  'Светодиод LED{index}': 'LED{index}',
  'Кнопка S2': 'Button S2',
  'Кнопка S2. Пока она нажата, на выводе 1, когда отпущена — 0.':
    'Button S2. While it is pressed the pin is 1; when released it is 0.',
  'Кнопка S1': 'Button S1',
  'Кнопка S1. Пока она нажата, на выводе 1, когда отпущена — 0.':
    'Button S1. While it is pressed the pin is 1; when released it is 0.',
  'Передача данных в компьютер через USB: чип BL616 превращает эти сигналы в виртуальный COM-порт.':
    'Sending data to the computer over USB: the BL616 chip turns these signals into a virtual COM port.',
  'Приём данных из компьютера через USB (виртуальный COM-порт).':
    'Receiving data from the computer over USB (virtual COM port).',
  'Служебный вывод программатора JTAG: через него компьютер загружает схему в FPGA.':
    'A service pin of the JTAG programmer: the computer uses it to load the design into the FPGA.',
  'Служебный вывод: перезапуск загрузки конфигурации.':
    'A service pin: restarts configuration loading.',
  'Связь с микросхемой флеш-памяти, где хранится схема после выключения питания.':
    'Link to the flash memory chip that keeps the design after power-off.',
  // Глоссарий выводов
  левой: 'left',
  правой: 'right',
  верхней: 'top',
  нижней: 'bottom',
  'Буква A — первый вывод пары (в дифференциальной паре это «плюс»).':
    'Letter A is the first pad of the pair (in a differential pair it is the "plus").',
  'Буква B — второй вывод пары (в дифференциальной паре это «минус»).':
    'Letter B is the second pad of the pair (in a differential pair it is the "minus").',
  'Имя площадки внутри кристалла: IO — вывод ввода-вывода, {side} — он на {sideName} стороне кристалла, {index} — номер ячейки вдоль этой стороны.':
    'The pad name inside the die: IO is an input/output pad, {side} means it is on the {sideName} side of the die, {index} is the cell number along that side.',
  'Это имя встречается в отчётах размещения.': 'You will see this name in placement reports.',
  'JTAG, выбор режима. По линиям JTAG отладчик загружает схему в ПЛИС, поэтому занимать этот вывод своей схемой нельзя.':
    'JTAG, mode select. The debugger loads the design into the FPGA over the JTAG lines, so your design cannot use this pin.',
  'JTAG, тактовый сигнал загрузки. Занят отладчиком платы.':
    'JTAG, loading clock. Used by the board debugger.',
  'JTAG, данные от отладчика в ПЛИС. Занят отладчиком платы.':
    'JTAG, data from the debugger to the FPGA. Used by the board debugger.',
  'JTAG, данные из ПЛИС в отладчик. Занят отладчиком платы.':
    'JTAG, data from the FPGA to the debugger. Used by the board debugger.',
  'Перезапуск конфигурации: низкий уровень заставляет ПЛИС заново загрузить схему из памяти. Суффикс _N значит «активен при 0».':
    'Configuration restart: a low level makes the FPGA load the design from memory again. The _N suffix means "active when 0".',
  'Выбор способа загрузки схемы при включении питания (младший бит).':
    'Selects how the design is loaded at power-up (low bit).',
  'Выбор способа загрузки схемы при включении питания (старший бит).':
    'Selects how the design is loaded at power-up (high bit).',
  'Тактовый сигнал последовательной загрузки конфигурации.':
    'Clock for serial configuration loading.',
  'Вход данных последовательной загрузки конфигурации.':
    'Data input for serial configuration loading.',
  'Выход данных конфигурации для следующей микросхемы в цепочке.':
    'Configuration data output for the next chip in the chain.',
  'Приостановка тактового сигнала загрузки. Суффикс _N значит «активен при 0».':
    'Pauses the loading clock. The _N suffix means "active when 0".',
  'Разрешение записи при параллельной загрузке. Суффикс _N значит «активен при 0».':
    'Write enable for parallel loading. The _N suffix means "active when 0".',
  'Выбор микросхемы, когда схему загружает внешнее устройство по SPI. Суффикс _N значит «активен при 0».':
    'Chip select when an external device loads the design over SPI. The _N suffix means "active when 0".',
  'Выход данных при загрузке по SPI от внешнего устройства.':
    'Data output when an external device loads the design over SPI.',
  'Выбор быстрого чтения флеш-памяти при загрузке. Суффикс _N значит «активен при 0».':
    'Selects fast flash reading during loading. The _N suffix means "active when 0".',
  'Тактовый сигнал флеш-памяти, из которой ПЛИС читает схему при включении.':
    'Clock of the flash memory the FPGA reads its design from at power-up.',
  'Выбор флеш-памяти, из которой ПЛИС читает схему при включении. Суффикс _N значит «активен при 0».':
    'Select line of the flash memory the FPGA reads its design from at power-up. The _N suffix means "active when 0".',
  'Данные от ПЛИС к флеш-памяти конфигурации.': 'Data from the FPGA to the configuration flash.',
  'Данные от флеш-памяти конфигурации к ПЛИС.': 'Data from the configuration flash to the FPGA.',
  'Вход глобальной тактовой сети №{n}. Такт, поданный сюда, доходит до всех регистров почти одновременно.':
    'Input of global clock network #{n}. A clock fed here reaches all registers almost at the same time.',
  'T — прямой вывод пары (на него подают обычный такт).':
    'T is the true pad of the pair (feed an ordinary clock here).',
  'C — парный инверсный вывод; с обычным тактом не используется.':
    'C is the complementary pad of the pair; it is not used with an ordinary clock.',
  'Вывод умножителя частоты PLL №{n} на {side} стороне: {role}, {polarity} вывод пары. Пока PLL не используется, это обычный вывод.':
    'A pin of frequency multiplier PLL #{n} on the {side} side: {role}, {polarity} pad of the pair. While the PLL is unused, this is an ordinary pin.',
  'вход опорного такта': 'reference clock input',
  'вход обратной связи': 'feedback input',
  прямой: 'true',
  инверсный: 'complementary',
  'Линия данных {n} при параллельной загрузке схемы. После загрузки — обычный вывод.':
    'Data line {n} for parallel design loading. After loading it is an ordinary pin.',
  'Специальная функция вывода; подробности — в паспорте UG115.':
    'A special pin function; see the UG115 datasheet for details.',
  'Сигнал вашего проекта, назначенный на этот вывод в файле .cst.':
    'A signal of your project assigned to this pin in the .cst file.',
  'Вывод питания, земли или служебный. К нему нельзя подключить сигнал схемы; точное назначение — в паспорте UG115.':
    'A power, ground or service pin. You cannot connect a design signal to it; see the UG115 datasheet for its exact role.',
  'свободный вывод': 'free pin',
  'У вывода нет особой функции. Прежде чем назначать сигнал, проверьте по схеме платы, куда он выведен.':
    'This pin has no special function. Before assigning a signal, check on the board schematic where it goes.',
  // Карта кристалла
  Логика: 'Logic',
  'LUT: маленькие «таблицы ответов», из которых собраны ваши логические выражения.':
    'LUT: small "answer tables" that your logic expressions are built from.',
  Регистры: 'Registers',
  'Триггеры: ячейки, которые запоминают один бит между тактами.':
    'Flip-flops: cells that remember one bit between clock ticks.',
  'Память и DSP': 'Memory and DSP',
  'Блоки памяти и умножители. В учебных схемах их обычно нет.':
    'Memory blocks and multipliers. Learning designs usually have none.',
  Выводы: 'Pins',
  'Ячейки ввода-вывода у края кристалла: здесь схема выходит к ножкам микросхемы.':
    'I/O cells at the edge of the die: this is where the design reaches the chip pins.',
  Трассировка: 'Routing',
  'Сколько переключателей связей включено в тайле: чем темнее, тем больше проводов проходит.':
    'How many routing switches are turned on in a tile: the darker, the more wires pass through.',
  // Результат nextpnr / physical
  'Ожидается JSON из nextpnr --write с полем modules.':
    'Expected JSON from nextpnr --write with a modules field.',
  'В файле слишком много модулей.': 'The file has too many modules.',
  'В файле нет координат NEXTPNR_BEL. Загрузите результат размещения nextpnr, а не результат синтеза.':
    'The file has no NEXTPNR_BEL coordinates. Load a nextpnr placement result, not a synthesis result.',
  'Ожидается плоский результат nextpnr с одним размещённым модулем.':
    'Expected a flat nextpnr result with one placed module.',
  'Файл содержит больше 100 000 ячеек.': 'The file has more than 100,000 cells.',
  'Координаты файла не соответствуют формату Gowin X…Y…/BEL.':
    'The coordinates in the file do not match the Gowin X…Y…/BEL format.',
  'В файле слишком много сигналов.': 'The file has too many signals.',
  'Маршрутизация превышает лимит 2 000 000 переходов.':
    'Routing exceeds the limit of 2,000,000 hops.',
  '{count} ячеек не имеют распознанной физической координаты и исключены из карты.':
    '{count} cells have no recognized physical coordinate and are left out of the map.',
  'В файле нет распознанной трассировки ROUTING; доступна карта размещения.':
    'The file has no recognized ROUTING data; the placement map is available.',
  // Нетлист и подписи схемы
  '{count} бит': '{count} bits',
  '1 бит': '1 bit',
  'Нет драйвера': 'No driver',
  'Сигнал без источника': 'Signal with no source',
  Константа: 'Constant',
  'строка {line}': 'line {line}',
  '{count} бит.': '{count} bits.',
  'Подпись указывает разряды этой ветви в общей шине.':
    'The label shows which bits of the shared bus this branch carries.',
  'Повторяющиеся позиции содержат один и тот же сигнал.':
    'Repeated positions carry the same signal.',
  'Остальные разряды шины подключаются отдельными ветвями.':
    'The other bits of the bus connect through separate branches.',
  // Панель кристалла
  'JSON размещения превышает 64 МБ.': 'The placement JSON is larger than 64 MB.',
  'Размещение и трассировка': 'Placement and routing',
  Ограничения: 'Constraints',
  'Файл ограничений для размещения': 'Constraints file for placement',
  'Добавьте .cst в проект': 'Add a .cst to the project',
  'Частота, МГц': 'Frequency, MHz',
  'Целевая частота': 'Target frequency',
  Остановить: 'Stop',
  'Разместить и собрать': 'Place and build',
  'Открыть nextpnr JSON': 'Open nextpnr JSON',
  'Сначала выполните синтез проекта.': 'Run synthesis of the project first.',
  Синтезировать: 'Synthesize',
  'nextpnr пока недоступен.': 'nextpnr is not available yet.',
  'Карта также открывает готовые результаты': 'The map also opens ready-made results of',
  с: 's',
  'Скрыть журнал': 'Hide log',
  Журнал: 'Log',
  'Битстрим .fs': 'Bitstream .fs',
  'Журнал пока пуст.': 'The log is empty so far.',
  'Карта относится к предыдущей версии проекта. Повторите синтез и размещение после изменения файлов.':
    'The map belongs to an earlier version of the project. Repeat synthesis and placement after changing files.',
  'Ресурсы проекта после синтеза': 'Project resources after synthesis',
  Другие: 'Other',
  'Карта размещения на кристалле': 'Placement map on the chip',
  'Как читать карту?': 'How to read the map?',
  'Кристалл разбит на тайлы, у каждого есть координаты X и Y из nextpnr. Цвет тайла показывает, какого ресурса в нём больше всего, а полоска внизу тайла: сколько связей проходит через него. Это карта занятости по координатам. Температура, мощность и процент ёмкости тайла не рассчитываются.':
    'The chip is divided into tiles, each with X and Y coordinates from nextpnr. The tile color shows which resource it has the most of, and the bar at the bottom of the tile shows how many connections pass through it. This is an occupancy map by coordinates. Temperature, power and tile capacity percentage are not calculated.',
  'Границы 56 × 55 тайлов взяты из базы GW2A-18C Apicula.':
    'The 56 × 55 tile bounds come from the Apicula GW2A-18C database.',
  'Граница показана по максимальным координатам артефакта.':
    'The boundary is drawn from the maximum coordinates of the artifact.',
  'Тайл X{x} Y{y}': 'Tile X{x} Y{y}',
  'Выберите тайл': 'Pick a tile',
  '{cells} ячеек · {pips} переходов трассировки': '{cells} cells · {pips} routing hops',
  'Нажмите на окрашенную ячейку карты, чтобы увидеть физические элементы и их имена.':
    'Click a colored cell on the map to see the physical elements and their names.',
  'Результат nextpnr': 'nextpnr result',
  Размещено: 'Placed',
  'Тайлов с ячейками': 'Tiles with cells',
  Переходов: 'Hops',
  МГц: 'MHz',
  'Частота достигнута': 'Frequency reached',
  'Частота не достигнута': 'Frequency not reached',
  'Где ваша логика окажется в FPGA?': 'Where will your logic end up in the FPGA?',
  'После nextpnr здесь появятся реальные координаты LUT, триггеров, блоков памяти и выводов. Переключайте слои, исследуйте плотность и проваливайтесь в отдельный тайл.':
    'After nextpnr, the real coordinates of LUTs, flip-flops, memory blocks and pins will appear here. Switch layers, explore density and zoom into a single tile.',
  Память: 'Memory',
  // Карта ChipMap
  'Масштаб карты кристалла': 'Chip map zoom',
  'Приблизить к области, где разместилась ваша логика':
    'Zoom to the area where your logic was placed',
  'Моя логика': 'My logic',
  'Показать весь кристалл': 'Show the whole chip',
  'Весь кристалл': 'Whole chip',
  'Приблизить к выбранному тайлу или модулю': 'Zoom to the selected tile or module',
  'К выбору': 'To selection',
  Уменьшить: 'Zoom out',
  Масштаб: 'Zoom',
  'px/тайл': 'px/tile',
  Увеличить: 'Zoom in',
  'Тепловая карта размещённых элементов FPGA': 'Heat map of the placed FPGA elements',
  регистры: 'registers',
  выводы: 'pins',
  память: 'memory',
  'Свободный тайл': 'Free tile',
  'Включено связей: {count}': 'Connections on: {count}',
  'Модуль: {names}': 'Module: {names}',
  'Край кристалла (ввод-вывод)': 'Chip edge (I/O)',
  'Мини-карта: нажмите, чтобы перейти': 'Mini-map: click to jump',
  'Мини-карта всего кристалла. Рамка показывает, что вы видите сейчас.':
    'Mini-map of the whole chip. The frame shows what you see now.',
  'Тайлы X: 0–{maxX} · Y: 0–{maxY} · колесо — масштаб, перетаскивание — сдвиг':
    'Tiles X: 0–{maxX} · Y: 0–{maxY} · wheel to zoom, drag to pan',
  'Слои карты': 'Map layers',
  'Области кристалла': 'Chip regions',
  'Тонкая цветная подложка по краю: ряд ввода-вывода. Вертикальная полоса: колонка блочной памяти или DSP (видна, только если схема её использует).':
    'A thin colored backdrop along the edge: a row of I/O. A vertical stripe: a column of block memory or DSP (visible only if the design uses it).',
  'Модули вашей схемы': 'Modules of your design',
  'Выберите модуль: все его ячейки подсветятся на карте.':
    'Pick a module: all its cells will light up on the map.',
  '{cells} яч. · {tiles} тайл.': '{cells} cells · {tiles} tiles',
  'Ячейки модуля {module}': 'Cells of module {module}',
  'Показаны первые 40 из {count}.': 'Showing the first 40 of {count}.',
  'Шкала цвета': 'Color scale',
  Цвет: 'Color',
  'Цвет тайла: ресурс, которого в нём больше всего. Полоска внизу тайла: плотность трассировки от 1 до {max} связей. Это занятость, а не температура и не мощность.':
    'Tile color: the resource it has the most of. The bar at the bottom of the tile: routing density from 1 to {max} connections. This is occupancy, not temperature or power.',
  мало: 'few',
  'много связей': 'many connections',
  'ещё {count}…': '{count} more…',
  // Инспектор LUT
  'X — неопределено': 'X — undefined',
  'Z — высокое сопротивление': 'Z — high impedance',
  '? — значение отсутствует': '? — no value',
  'вход/выход': 'input/output',
  'Выберите элемент схемы': 'Pick an element of the schematic',
  'Здесь появятся его порты, параметры и таблица истинности LUT.':
    'Its ports, parameters and the LUT truth table will appear here.',
  'Так этот элемент называется внутри Yosys': 'This is what Yosys calls this element internally',
  'Тип в Yosys: {type}': 'Yosys type: {type}',
  'Таблица конфигурации': 'Configuration table',
  'Нет параметра': 'No parameter',
  '{bits} бит · {inputs} входа': '{bits} bits · {inputs} inputs',
  'Как читать LUT': 'How to read a LUT',
  'Каждая строка хранит один выходной бит. {name} — младший бит адреса: его переключение выбирает соседнюю строку.':
    'Each row stores one output bit. {name} is the lowest address bit: flipping it selects the neighboring row.',
  Адрес: 'Address',
  'Таблица истинности · {count} строк': 'Truth table · {count} rows',
  'Выбрать адрес {index}': 'Select address {index}',
  Порты: 'Ports',
  'Направление не указано в нетлисте': 'The direction is not given in the netlist',
  'Внутренние номера: {numbers}': 'Internal numbers: {numbers}',
  'Все подключения': 'All connections',
  'Сначала имя сигнала из вашего кода, затем внутренние номера цепей Yosys (после #). Константы показаны как «константа 0/1». Разряды перечислены от старшего к младшему.':
    'First the signal name from your code, then the internal Yosys net numbers (after #). Constants are shown as "constant 0/1". Bits are listed from the most significant to the least significant.',
  'Нажмите на название параметра, чтобы увидеть объяснение и исходную запись.':
    'Click a parameter name to see its explanation and the original value.',
  Параметры: 'Parameters',
  'Исходная запись: {raw}': 'Original value: {raw}',
  'Исходный код': 'Source code',
  'Указан источник в библиотеке Yosys. Ссылка на Verilog проекта для этого элемента не сохранилась.':
    'The source is in the Yosys library. A link to your project Verilog was not kept for this element.',
  'Синтез не сохранил ссылку на исходный код для этого элемента.':
    'Synthesis did not keep a source code link for this element.',
  // Схема
  'Не удалось построить схему': 'Could not build the schematic',
  '{cells} элементов · {edges} связей': '{cells} elements · {edges} connections',
  'Показать всю схему': 'Fit the whole schematic',
  'Найти выбранный элемент': 'Locate the selected element',
  'Показано {shown} из {total} элементов.': 'Showing {shown} of {total} elements.',
  'Связи со скрытыми элементами опущены. Откройте вложенный модуль для подробностей.':
    'Connections to hidden elements are omitted. Open a nested module for details.',
  '{count} связей опущено.': '{count} connections omitted.',
  'Раскладываем элементы…': 'Laying out the elements…',
  'Схема модуля {module}': 'Schematic of module {module}',
  Связь: 'Connection',
  'Двойной щелчок: открыть модуль': 'Double-click: open the module',
  'Двойной щелчок: открыть исходник': 'Double-click: open the source',
  '{name}: {count} бит': '{name}: {count} bits',
  'ветви с индексами подключают отдельные разряды шины':
    'branches with indices connect individual bits of the bus',
  'разряды шины': 'bus bits',
  'Закрыть сведения о связи': 'Close connection details',
  'Колесо — масштаб · перетаскивание — перемещение · щелчок — выбрать элемент':
    'Wheel to zoom · drag to move · click to select an element',
  // Символы RTL
  'логическое {input}→{output}': 'logical {input}→{output}',
  'свёртка {input}→{output}': 'reduction {input}→{output}',
  побитовое: 'bitwise',
  знаковый: 'signed',
  сравнение: 'comparison',
  знаковое: 'signed',
  'со знаком': 'signed',
  сдвиг: 'shift',
  'по уровню EN': 'level-sensitive EN',
  'спад тактового сигнала': 'falling clock edge',
  'фронт тактового сигнала': 'rising clock edge',
  'активный низкий уровень': 'active low',
  // Иерархия модулей
  'Свернуть модуль': 'Collapse module',
  'Раскрыть модуль': 'Expand module',
  '{count} элементов': '{count} elements',
  'Часть экземпляров скрыта': 'Some instances are hidden',
  'Иерархия модулей: выберите, какую часть устройства показать':
    'Module hierarchy: choose which part of the device to show',
  Модули: 'Modules',
  'Иерархия модулей': 'Module hierarchy',
  'Модули появятся после синтеза': 'Modules will appear after synthesis',
  // Плата
  'порт занят': 'port is busy',
  'Не удалось закрыть UART перед загрузкой: {reason}':
    'Could not close the UART before loading: {reason}',
  'USB-порт отключён.': 'The USB port was disconnected.',
  'Последовательный порт': 'Serial port',
  'Ошибка чтения UART.': 'UART read error.',
  'Не удалось открыть порт.': 'Could not open the port.',
  'Ошибка отправки UART.': 'UART send error.',
  'Подключение платы': 'Connect the board',
  'Tang Nano 20K, кристалл GW2AR-LV18QN88C8/I7': 'Tang Nano 20K, chip GW2AR-LV18QN88C8/I7',
  'Работа с платой': 'Working with the board',
  'Загрузить схему': 'Load the design',
  'UART-терминал': 'UART terminal',
  Отладчик: 'Debugger',
  'Паспорт платы': 'Board profile',
  Семейство: 'Family',
  Корпус: 'Package',
  Светодиоды: 'LEDs',
  '6 · выводы 15–20': '6 · pins 15–20',
  Кнопки: 'Buttons',
  'Выводы 87 / 88': 'Pins 87 / 88',
  'Назначения .cst': '.cst assignments',
  'Распиновка Apicula': 'Apicula pinout',
  'UART в браузере': 'UART in the browser',
  Подключено: 'Connected',
  'Нет подключения': 'Not connected',
  'Выберите USB Serial-порт платы. Терминал читает данные устройства и отправляет строки с окончанием CRLF.':
    'Pick the USB Serial port of the board. The terminal reads data from the device and sends lines ending in CRLF.',
  Скорость: 'Baud rate',
  'Скорость UART': 'UART baud rate',
  'Подключение…': 'Connecting…',
  Отключить: 'Disconnect',
  'Выбрать порт': 'Select port',
  'Этот браузер не предоставляет Web Serial. Откройте приложение в браузере с поддержкой Web Serial (например, Chrome или Edge) на localhost.':
    'This browser does not provide Web Serial. Open the app in a browser that supports Web Serial (for example Chrome or Edge) on localhost.',
  бод: 'baud',
  'Данные UART': 'UART data',
  'Порт открыт. Ожидаем данные…': 'The port is open. Waiting for data…',
  'Здесь появятся сообщения подключённого устройства.':
    'Messages from the connected device will appear here.',
  'Строка для UART': 'Line for UART',
  'Строка для устройства': 'Line for the device',
  'Отправка…': 'Sending…',
  Отправить: 'Send',
  Очистить: 'Clear',
  // Вкладки RTL и Gowin
  'RTL-схема': 'RTL schematic',
  'Примитивы Gowin': 'Gowin primitives',
  'Исходники изменены. Схема относится к предыдущей сборке.':
    'The sources have changed. This schematic belongs to the previous build.',
  Обновить: 'Refresh',
  схема: 'schematic',
  'Строим схему…': 'Building the schematic…',
  'ОТ VERILOG К ЛОГИКЕ': 'FROM VERILOG TO LOGIC',
  'Yosys строит схему…': 'Yosys is building the schematic…',
  'Проверьте исходный код': 'Check your source code',
  'Схема вашего устройства': 'The schematic of your device',
  'Готовое представление появится здесь. Ход работы доступен в журнале.':
    'The finished view will appear here. Progress is available in the log.',
  'Откройте диагностику сборки.': 'Open the build diagnostics.',
  'Вентили, сумматоры, мультиплексоры и регистры — с привычными схемными обозначениями.':
    'Gates, adders, multiplexers and registers, drawn with the usual schematic symbols.',
  'Реальные LUT, триггеры и другие примитивы Gowin. Выберите LUT, чтобы увидеть её таблицу истинности.':
    'Real LUTs, flip-flops and other Gowin primitives. Pick a LUT to see its truth table.',
  'Синтезировать проект': 'Synthesize the project',
  '{count} элементов в модуле': '{count} elements in the module',
  'Ожидаем результат синтеза': 'Waiting for the synthesis result',
  'До отображения на FPGA': 'Before mapping to the FPGA',
  'До упаковки и размещения': 'Before packing and placement',
  Инспектор: 'Inspector',
  инспектор: 'inspector',
  'Нажмите на элемент схемы': 'Click an element of the schematic',
  'Справа появятся его входы и выходы, параметры и таблица истинности LUT.':
    'Its inputs and outputs, parameters and the LUT truth table will appear on the right.',
  'Память и ввод-вывод': 'Memory and I/O',
  'Элементов в схеме': 'Elements in the schematic',
  'Другие элементы': 'Other elements',
  'Это элементы схемы до отображения на FPGA. LUT и триггеры появятся на вкладке Gowin.':
    'These are schematic elements before mapping to the FPGA. LUTs and flip-flops will appear on the Gowin tab.',
  'RTL-операции до технологического синтеза.': 'RTL operations before technology mapping.',
  'После synth_gowin; до упаковки и размещения.':
    'After synth_gowin; before packing and placement.',
  'Подсчёт ресурсов появится после синтеза.': 'Resource counts will appear after synthesis.',
  // Вкладка «Выводы»
  'назначение выводов': 'pin assignment',
  'Открываем выводы…': 'Opening pins…',
  // Названия ячеек Yosys
  Сумматор: 'Adder',
  Вычитатель: 'Subtractor',
  Умножитель: 'Multiplier',
  Деление: 'Divider',
  'Остаток от деления': 'Remainder',
  'Смена знака': 'Negation',
  Повторитель: 'Buffer',
  'Побитовое И': 'Bitwise AND',
  'Побитовое ИЛИ': 'Bitwise OR',
  'Побитовое исключающее ИЛИ': 'Bitwise XOR',
  'Побитовое равенство (XNOR)': 'Bitwise equality (XNOR)',
  'Побитовое НЕ': 'Bitwise NOT',
  'Логическое И': 'Logical AND',
  'Логическое ИЛИ': 'Logical OR',
  'Логическое НЕ': 'Logical NOT',
  'Все биты равны 1': 'All bits are 1',
  'Хотя бы один бит равен 1': 'At least one bit is 1',
  'Число единиц нечётно': 'Odd number of ones',
  'Число единиц чётно': 'Even number of ones',
  'Сравнение «равно»': 'Comparison "equal"',
  'Сравнение «не равно»': 'Comparison "not equal"',
  'Сравнение «меньше»': 'Comparison "less than"',
  'Сравнение «меньше или равно»': 'Comparison "less than or equal"',
  'Сравнение «больше»': 'Comparison "greater than"',
  'Сравнение «больше или равно»': 'Comparison "greater than or equal"',
  'Сдвиг влево': 'Shift left',
  'Сдвиг вправо': 'Shift right',
  'Арифметический сдвиг влево': 'Arithmetic shift left',
  'Арифметический сдвиг вправо': 'Arithmetic shift right',
  'Мультиплексор (выбор из двух)': 'Multiplexer (choose one of two)',
  'Мультиплексор (выбор из нескольких)': 'Multiplexer (choose one of several)',
  'Триггер (запоминает бит по такту)': 'Flip-flop (remembers a bit on the clock)',
  'Триггер с разрешением записи': 'Flip-flop with write enable',
  'Триггер с асинхронным сбросом': 'Flip-flop with asynchronous reset',
  'Триггер с асинхронным сбросом и разрешением': 'Flip-flop with asynchronous reset and enable',
  'Триггер с синхронным сбросом': 'Flip-flop with synchronous reset',
  'Триггер с синхронным сбросом и разрешением': 'Flip-flop with synchronous reset and enable',
  'Защёлка (запоминает, пока EN = 1)': 'Latch (remembers while EN = 1)',
  'Чтение из памяти': 'Memory read',
  'Запись в память': 'Memory write',
  'Начальное содержимое памяти': 'Initial memory contents',
  'Таблица LUT': 'LUT',
  'Вентиль НЕ': 'NOT gate',
  'Вентиль И': 'AND gate',
  'Вентиль И-НЕ': 'NAND gate',
  'Вентиль ИЛИ': 'OR gate',
  'Вентиль ИЛИ-НЕ': 'NOR gate',
  'Вентиль исключающее ИЛИ': 'XOR gate',
  'Вентиль равенства (XNOR)': 'Equality gate (XNOR)',
  'Мультиплексор на 1 бит': '1-bit multiplexer',
  'Арифметический блок ALU': 'Arithmetic block ALU',
  'Постоянный 0': 'Constant 0',
  'Постоянная 1': 'Constant 1',
  'Входной буфер вывода': 'Pin input buffer',
  'Выходной буфер вывода': 'Pin output buffer',
  'Двунаправленный буфер вывода': 'Bidirectional pin buffer',
  'Буфер с третьим состоянием': 'Tri-state buffer',
  'Буфер глобального такта': 'Global clock buffer',
  'Умножитель частоты (PLL)': 'Frequency multiplier (PLL)',
  'Таблица LUT на {count} {unit}': 'LUT with {count} {unit}',
  входа: 'inputs',
  входов: 'inputs',
  'Мультиплексор {type}': 'Multiplexer {type}',
  'Триггер {type}': 'Flip-flop {type}',
  'Блочная память {type}': 'Block memory {type}',
  'Умножитель {type}': 'Multiplier {type}',
  'Вход A со знаком': 'Signed input A',
  'Вход B со знаком': 'Signed input B',
  'Ширина входа A': 'Width of input A',
  'Ширина входа B': 'Width of input B',
  'Ширина выхода': 'Output width',
  'Число вариантов выбора': 'Number of choices',
  Ширина: 'Width',
  'Рабочий фронт такта': 'Active clock edge',
  'Уровень разрешения': 'Enable level',
  'Уровень асинхронного сброса': 'Asynchronous reset level',
  'Уровень синхронного сброса': 'Synchronous reset level',
  'Значение после сброса': 'Value after reset',
  'Таблица истинности (INIT)': 'Truth table (INIT)',
  'Число адресных бит': 'Number of address bits',
  'Число слов': 'Number of words',
  Смещение: 'Offset',
  'не подключено': 'not connected',
  константа: 'constant',
  'внутренний сигнал': 'internal signal',
};
