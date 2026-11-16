/**
 * Английские тексты интерфейса. Ключ — русская фраза, как она написана в коде (`t('…')`).
 * Чего здесь нет, показывается по-русски: перевод добавляется по частям.
 */
export const shell: Record<string, string> = {
  // Шапка
  'Без имени': 'Untitled',
  'Светлая тема': 'Light theme',
  'Тёмная тема': 'Dark theme',
  'Создать проект': 'New project',
  'Создание, примеры и сохранённые проекты': 'Create, examples and saved projects',
  'Сохранение проектов и учебного прогресса на сервере':
    'Save projects and learning progress on the server',
  'Как пользоваться IDE': 'How to use the studio',
  Остановить: 'Stop',
  Синтезировать: 'Synthesize',
  'Язык интерфейса': 'Interface language',
  // Вкладки
  Обучение: 'Learn',
  'От первого бита к своему устройству': 'From your first bit to your own device',
  Код: 'Code',
  'Исходники проекта': 'Project sources',
  Конструктор: 'Designer',
  'Схема из логических элементов без ручного Verilog':
    'A schematic of logic elements, no hand-written Verilog',
  Выводы: 'Pins',
  'Физические выводы и ограничения .cst': 'Physical pins and .cst constraints',
  Диаграммы: 'Waveforms',
  'Сигналы во времени': 'Signals over time',
  Лаборатория: 'Lab',
  'Плата на столе: детали, провода и схема в работе':
    'The board on the desk: parts, wires and the circuit at work',
  Кристалл: 'Chip',
  'Размещение и карта занятости': 'Placement and the usage map',
  Подключение: 'Connect',
  'Работа с настоящей платой': 'Working with a real board',
  'Логические элементы и связи': 'Logic elements and connections',
  'LUT, регистры и ресурсы': 'LUTs, registers and resources',
  // Левое меню
  Узнать: 'Learn',
  Создать: 'Create',
  Проверить: 'Check',
  'Настоящая плата': 'Real board',
  'Рабочие вкладки': 'Workspace tabs',
  'Показать вкладки для настоящей платы': 'Show the real-board tabs',
  'Свернуть вкладки настоящей платы': 'Hide the real-board tabs',
  'Развернуть меню': 'Expand',
  'Свернуть меню': 'Collapse',
  'Показать названия вкладок': 'Show tab names',
  'Оставить в меню только значки': 'Keep only icons in the menu',
  'Файлы проекта': 'Project files',
  'Показать или скрыть файлы проекта': 'Show or hide the project files',
  Файлы: 'Files',
  // Окно «Проекты»
  Проекты: 'Projects',
  Создание: 'Create',
  'Мои проекты': 'My projects',
  'Текущий проект': 'Current project',
  Синхронизация: 'Sync',
  'Создайте своё устройство или продолжите сохранённое':
    'Build your own device or continue a saved one',
  'С чего начнём?': 'Where do we start?',
  'Все варианты создают отдельный проект. Текущие исходники сохранятся в библиотеке.':
    'Every option creates a separate project. Your current sources stay in the library.',
  'С нуля': 'From scratch',
  'Напишите Verilog и назначьте физические выводы платы.':
    'Write Verilog and assign the physical pins of the board.',
  'Из логических элементов': 'From logic elements',
  'Соберите схему на холсте. Приложение создаст Verilog для сборки.':
    'Build a schematic on the canvas. The app generates the Verilog for the build.',
  'На основе примера': 'From an example',
  'Импорт проекта': 'Import a project',
  'Продолжите работу из сохранённого файла JSON.': 'Continue from a saved JSON file.',
  'Папка проекта Gowin': 'Gowin project folder',
  'Откройте папку с файлом .gprj или просто с файлами Verilog и .cst.':
    'Open a folder with a .gprj file, or just Verilog and .cst files.',
  'Выбрать этот пример': 'Choose this example',
  'Название проекта': 'Project name',
  'Сохранить название': 'Save name',
  'Сохранить сейчас': 'Save now',
  'Экспорт проекта JSON': 'Export project as JSON',
  'Ссылка на вкладку': 'Link to this tab',
  'Нетлист RTL': 'RTL netlist',
  'Нетлист Gowin': 'Gowin netlist',
  'Название сохранено.': 'Name saved.',
  'Проект сохранён в браузере.': 'Project saved in the browser.',
  'Не удалось выполнить действие.': 'The action failed.',
  'Закрыть проекты': 'Close projects',
  'Разделы проектов': 'Project sections',
  // Мастер
  'Новый проект': 'New project',
  Начало: 'Start',
  'Проект и плата': 'Project and board',
  Проверка: 'Review',
  'Шаги создания проекта': 'Project creation steps',
  'Как назовём устройство?': 'What do we call the device?',
  'Всё готово для первого эксперимента': 'Ready for the first experiment',
  'Параметры платы': 'Board settings',
  'Выводы и электрические уровни': 'Pins and voltage levels',
  'Для первого знакомства': 'For a first look',
  'Ещё примеры': 'More examples',
  Проект: 'Project',
  'Верхний модуль': 'Top module',
  'Верхний модуль Verilog': 'Verilog top module',
  Плата: 'Board',
  'Модель платы': 'Board model',
  '27 МГц': '27 MHz',
  '6 светодиодов': '6 LEDs',
  '2 кнопки': '2 buttons',
  'уровни 3,3 В': '3.3 V levels',
  'В этой версии мастер настроен на Tang Nano 20K.':
    'In this version the wizard is set up for the Tang Nano 20K.',
  Старт: 'Start',
  'Порт схемы': 'Port',
  Вывод: 'Pin',
  'На плате': 'On the board',
  'Порты → физические выводы': 'Ports → physical pins',
  'Уровни LVCMOS33 · 3,3 В': 'LVCMOS33 levels · 3.3 V',
  Назад: 'Back',
  Далее: 'Next',
  Отмена: 'Cancel',
  'Создаём…': 'Creating…',
  'Проверьте настройки проекта.': 'Check the project settings.',
  'Не удалось создать проект. Попробуйте ещё раз.': 'Could not create the project. Try again.',
  // Библиотека проектов и диалоги
  'Ваши проекты': 'Your projects',
  'Создайте первый проект.': 'Create your first project.',
  'Импорт JSON': 'Import JSON',
  'Создать копию': 'Duplicate',
  Удалить: 'Delete',
  'Удалить проект': 'Delete project',
  Название: 'Name',
  'Переименовать проект': 'Rename project',
  'Проверьте название.': 'Check the name.',
  'Не удалось изменить проект.': 'Could not change the project.',
  'Исходники этого проекта будут удалены из библиотеки браузера.':
    "This project's sources will be removed from the browser library.",
  'Новый файл': 'New file',
  'Переименовать файл': 'Rename file',
  'Создать файл': 'Create file',
  Переименовать: 'Rename',
  'Имя файла': 'File name',
  Диалог: 'Dialog',
  // Файлы проекта
  'открыть назначения выводов': 'open the pin assignments',
  'открыть конструктор': 'open the designer',
  'открыть код': 'open the code',
  // Вкладка «Код»
  'Verilog из вашей схемы': 'Verilog from your schematic',
  'Открыть конструктор': 'Open the designer',
  Копировать: 'Copy',
  Скопировано: 'Copied',
  'В проекте нет схемы.': 'The project has no schematic.',
  'Схему пока нельзя превратить в Verilog.': 'The schematic cannot be turned into Verilog yet.',
  // Журнал сборки
  'Журнал сборки': 'Build log',
  Диагностика: 'Diagnostics',
  'В очереди': 'Queued',
  'Синтез выполняется': 'Synthesis running',
  'Синтез завершён': 'Synthesis finished',
  'Ошибка сборки': 'Build error',
  'Сборка отменена': 'Build cancelled',
  'Свернуть журнал': 'Collapse the log',
  'Развернуть журнал': 'Expand the log',
  'Сборка в очереди. Ожидаем запуск Yosys…': 'The build is queued. Waiting for Yosys to start…',
  'Запустите синтез, чтобы увидеть команды и сообщения Yosys.':
    'Run synthesis to see the Yosys commands and messages.',
  Предупреждение: 'Warning',
  'Подробности доступны в журнале.': 'Details are in the log.',
  'Ошибки и предупреждения не обнаружены.': 'No errors or warnings found.',
  'Здесь появятся сообщения сборки.': 'Build messages will appear here.',
  // Конструктор: подсказка и состояние
  'Схема пуста. Выберите элемент в библиотеке слева или откройте готовый пример.':
    'The schematic is empty. Pick an element in the library on the left or open a ready example.',
  'Открыть примеры': 'Open examples',
  Библиотека: 'Library',
  'Библиотека элементов': 'Element library',
  'Свойства и проблемы': 'Properties and issues',
  'Горячие клавиши (?)': 'Keyboard shortcuts (?)',
  Предпросмотр: 'Preview',
  Примеры: 'Examples',
  Войти: 'Sign in',
  '{count} проектов с комментариями, заданиями и назначенными выводами.':
    '{count} projects with comments, tasks and assigned pins.',
  Подготовка: 'Preparing',
  'Подготовка проекта': 'Preparing the project',
  'RTL-представление': 'RTL view',
  'Синтез Gowin': 'Gowin synthesis',
  Завершено: 'Done',
  Синтез: 'Synthesis',
  'Проверяем инструменты…': 'Checking the tools…',
  'Yosys готов': 'Yosys ready',
  'Тулчейн недоступен': 'Toolchain unavailable',
  'Изменения сохранены в браузере': 'Changes saved in the browser',
  'Сохраняем…': 'Saving…',
  'Ошибка сохранения': 'Save error',
  'Icarus Verilog готов': 'Icarus Verilog ready',
  'Симулятор недоступен': 'Simulator unavailable',
  'Вернуться к схеме': 'Back to the schematic',
  'Только для чтения: он пересобирается при каждом изменении схемы. Чтобы изменить логику, правьте схему в конструкторе.':
    'Read-only: it is rebuilt on every change to the schematic. To change the logic, edit the schematic in the designer.',
  Готово: 'Done',
  Ошибка: 'Error',
  'Нужна новая сборка': 'Needs a new build',
  Выполняется: 'Running',
  с: 's',
  'Открыть {name}': 'Open {name}',
  'Переименовать {name}': 'Rename {name}',
  'Удалить {name}': 'Delete {name}',
  'Добавить файл': 'Add a file',
  'Скрыть файлы проекта': 'Hide the project files',
  '.v и .sv — код, .ysch — конструктор, .cst — выводы. Проект сохраняется в браузере.':
    '.v and .sv are code, .ysch is the designer, .cst is pins. The project is saved in the browser.',
  'Скачать журнал': 'Download the log',
  'Запустить Yosys · Ctrl+Enter': 'Run Yosys · Ctrl+Enter',
  '{count} файлов ограничений': '{count} constraint files',
  '{count} файлов · верхний модуль': '{count} files · top module',
  '{count} файлов': '{count} files',
  'Ссылка скопирована. Для передачи исходников используйте экспорт проекта.':
    'The link is copied. To pass the sources on, use the project export.',
  'Изменения сохраняются автоматически. Проекты этого браузера доступны в разделе «Мои проекты».':
    'Changes are saved automatically. The projects of this browser are in the "My projects" section.',
  'Каждый проект сохраняется отдельно в этом браузере. Название можно менять, не теряя исходники.':
    'Every project is saved separately in this browser. You can rename it without losing the sources.',
  'Удалить «{name}»?': 'Delete "{name}"?',
  'Создать копию проекта': 'Duplicate the project',
  '{name} — копия': '{name} (copy)',
  'Генератор 27 МГц': '27 MHz clock',
  'Кнопка на выводе 87 · нажата = 1': 'Button on pin 87 · pressed = 1',
  'Кнопка на выводе 88 · нажата = 1': 'Button on pin 88 · pressed = 1',
  'UART_RX от USB-UART': 'UART_RX from the USB-UART',
  'LED{n} · светится при 0': 'LED{n} · lit at 0',
  'Вывод FPGA': 'FPGA pin',
  'От идеи к схеме и выводам платы': 'From an idea to a schematic and board pins',
  'Закрыть мастер проекта': 'Close the project wizard',
  'Выберите небольшую схему с объяснениями или заготовку для своей идеи. Каждый вариант содержит Verilog и файл выводов .cst.':
    'Pick a small schematic with explanations or a starter for your own idea. Every option contains Verilog and a .cst pin file.',
  'Начальная схема': 'Starting design',
  'Выберите пример по уровню сложности…': 'Choose an example by difficulty…',
  'Выбрано:': 'Selected:',
  'Название видно в списке проектов. Верхний модуль — точка входа вашей схемы; обычно его называют top.':
    'The name is shown in the project list. The top module is the entry point of your design; it is usually called top.',
  'Как он называется и с какого модуля начинается схема':
    'What it is called and which module the design starts from',
  'Любое понятное название, например «Светофор».': 'Any clear name, for example "Traffic light".',
  'Имя модуля устройства. Оно используется при сборке схемы.':
    'The name of the device module. It is used when the design is built.',
  'Для неё готовы выводы и параметры сборки': 'Its pins and build settings are ready',
  'Схема с комментариями': 'Schematic with comments',
  'Такт 27 МГц → clk': '27 MHz clock → clk',
  'Схема без тактового сигнала': 'A design without a clock',
  'Генератор платы подключён к выводу 4. В .cst задан глобальный буфер BUFG.':
    'The board oscillator is on pin 4. The .cst sets a global BUFG buffer.',
  'Выход меняется вслед за входами. Такт для этого примера не нужен.':
    'The output follows the inputs. This example needs no clock.',
  'Номера ниже относятся к корпусу FPGA. Мастер уже включит эти назначения в .cst.':
    'The numbers below refer to the FPGA package. The wizard will put these assignments into the .cst.',
  'После создания откроется конструктор. Затем можно синтезировать схему, запустить диаграммы или виртуальную плату.':
    'After creation the designer opens. Then you can synthesize the design, run waveforms or the virtual board.',
  'После создания откроется код. Затем можно синтезировать схему, запустить диаграммы или виртуальную плату.':
    'After creation the code opens. Then you can synthesize the design, run waveforms or the virtual board.',
  'Шаг {n} из {total}': 'Step {n} of {total}',
  'Генератор платы: 27 МГц.': 'The board oscillator: 27 MHz.',
  'Кнопка S1 на выводе 88: нажата = 1, отпущена = 0.':
    'Button S1 on pin 88: pressed = 1, released = 0.',
  'LED{bit}: 0 включает свет, 1 выключает.': 'LED{bit}: 0 turns it on, 1 turns it off.',
  'Заготовка для своего устройства на Tang Nano 20K.':
    'A starter for your own device on the Tang Nano 20K.',
  'Порты — договор между схемой и платой. Их выводы заданы в board.cst.':
    'The ports are the contract between the design and the board. Their pins are set in board.cst.',
  'clk: генератор 27 МГц; reset: кнопка сброса S1, нажата = 1.':
    'clk: the 27 MHz oscillator; reset: the S1 button, pressed = 1.',
  'led_n[5:0]: шесть LED. Уровень 0 включает свет, 1 выключает.':
    'led_n[5:0]: six LEDs. Level 0 turns them on, 1 turns them off.',
  'Начните с комбинационной связи assign или добавьте регистр с always.':
    'Start with a combinational assign or add a register with always.',
  'Пока своей логики нет, все LED выключены.': 'There is no logic yet, so all LEDs are off.',
  'Например, assign led_n = {6{~reset}}; включит их при нажатии кнопки.':
    'For example, assign led_n = {6{~reset}}; turns them on while the button is pressed.',
  'Выводы своей схемы для Tang Nano 20K (GW2AR-LV18QN88C8/I7).':
    'Pins of your design for the Tang Nano 20K (GW2AR-LV18QN88C8/I7).',
  'Эти имена соответствуют портам заготовки top.v. Если измените порты, обновите .cst.':
    'These names match the ports of the starter top.v. If you change the ports, update the .cst.',
  'IO_LOC указывает номер вывода корпуса FPGA, а не контакт разъёма платы.':
    'IO_LOC gives the pin number of the FPGA package, not a board header contact.',
  'IO_PORT задаёт стандарт LVCMOS33: логические уровни 3,3 В.':
    'IO_PORT sets the LVCMOS33 standard: 3.3 V logic levels.',
  'Каждый бит led_n имеет отдельное назначение физическому LED.':
    'Every bit of led_n is assigned to its own physical LED.',
  'Глобальный буфер такта уменьшает разницу задержек между регистрами.':
    'A global clock buffer reduces the delay difference between registers.',
  'Конструктор логических элементов': 'Logic element designer',
  'Чистое поле: берите элементы из библиотеки и соединяйте их без ручного Verilog.':
    'A clean canvas: take elements from the library and connect them without hand-written Verilog.',
  'Выводы платы для элементов схемы назначает Конструктор: правьте их во вкладке «Выводы».':
    'The designer assigns board pins to the schematic elements: edit them on the Pins tab.',
  'Своя схема': 'Your own design',
  'Заготовка с тактом, сбросом и шестью LED.': 'A starter with a clock, a reset and six LEDs.',
  'Выберите заготовку или встроенный пример.': 'Choose a starter or a built-in example.',
  'Введите название от 1 до 100 символов.': 'Enter a name of 1 to 100 characters.',
  'Проект «{name}» уже есть. Выберите другое название.':
    'A project "{name}" already exists. Choose another name.',
  'Используйте латинские буквы, цифры и _. Начните с буквы или _. Имя не должно быть словом Verilog.':
    'Use Latin letters, digits and _. Start with a letter or _. The name must not be a Verilog keyword.',
  'Модуль «{top}» уже есть внутри примера. Выберите другое имя верхнего модуля.':
    'A module "{top}" already exists inside the example. Choose another top module name.',
  'В заготовке должен быть один верхний модуль. Выберите другой пример.':
    'The starter must have exactly one top module. Choose another example.',
};
