/** Английские тексты области «run». Ключ — русская фраза из кода. */
export const run: Record<string, string> = {
  // Симуляция
  'Не удалось запустить симуляцию.': 'Could not start the simulation.',
  'Симуляция отменена': 'Simulation cancelled',
  'Симуляция отменена.': 'Simulation cancelled.',
  'Размер VCD превышает 16 МБ.': 'The VCD file is larger than 16 MB.',
  'Не удалось открыть VCD.': 'Could not open the VCD file.',
  комбинация: 'combination',
  комбинации: 'combinations',
  комбинаций: 'combinations',
  период: 'period',
  периода: 'periods',
  периодов: 'periods',
  'Перебор · {count}': 'Sweep · {count}',
  'Постоянные входы': 'Constant inputs',
  'Свои шаги · {count}': 'Custom steps · {count}',
  Запуск: 'Run',
  Входы: 'Inputs',
  'События {count}': 'Events {count}',
  'Проверки {count}': 'Checks {count}',
  'Симуляция выполняется…': 'Simulation running…',
  'Ошибка симуляции': 'Simulation error',
  '{count} сигналов': '{count} signals',
  'Готов к запуску': 'Ready to run',
  'Параметры симуляции': 'Simulation settings',
  'Настроить запуск, начальные входы и последовательность':
    'Set up the run, initial inputs and sequence',
  Параметры: 'Settings',
  'Открыть VCD': 'Open VCD',
  'Скачать VCD': 'Download VCD',
  'Остановить симуляцию': 'Stop simulation',
  'Запустить функциональную симуляцию': 'Run a functional simulation',
  'Для запуска нужен Icarus Verilog на сервере': 'Icarus Verilog is required on the server',
  Симулировать: 'Simulate',
  'Подробности ошибки доступны в журнале симуляции.': 'Details are in the simulation log.',
  'Исходники изменены. Диаграмма относится к предыдущему запуску.':
    'The sources have changed. This waveform is from the previous run.',
  'Проверки запуска: {passed}/{total} совпало': 'Run checks: {passed}/{total} matched',
  ' · предыдущие исходники': ' · previous sources',
  ' · предыдущий сценарий': ' · previous scenario',
  'Моделируем RTL…': 'Simulating RTL…',
  'Подготовка проекта': 'Preparing the project',
  'Посмотрите, как меняются сигналы': 'Watch how the signals change',
  '{scenario}. {periods} по {period} нс. Запустите симуляцию или настройте входы.':
    '{scenario}. {periods} of {period} ns each. Run the simulation or set up the inputs.',
  'Синтезируйте проект, чтобы получить его входы. Можно также открыть готовый VCD.':
    'Synthesize the project to get its inputs. You can also open a ready-made VCD.',
  'Для запуска нужен Icarus Verilog. Готовый VCD можно открыть сразу.':
    'Icarus Verilog is required to run. You can open a ready-made VCD right away.',
  'Сначала синтезировать проект': 'Synthesize the project first',
  'Сценарий симуляции': 'Simulation scenario',
  Сценарий: 'Scenario',
  '{periods} · {period} нс': '{periods} · {period} ns',
  'Закрыть параметры симуляции': 'Close simulation settings',
  'Разделы настроек симуляции': 'Simulation settings sections',
  'Тактовый вход': 'Clock input',
  'Без тактового входа': 'No clock input',
  Сброс: 'Reset',
  'Сигнал сброса': 'Reset signal',
  'Без сброса': 'No reset',
  'Период, нс': 'Period, ns',
  'Период тактового сигнала, нс': 'Clock period, ns',
  Циклов: 'Cycles',
  'Число циклов': 'Number of cycles',
  'Циклов сброса': 'Reset cycles',
  'Активный 0': 'Active low',
  'Период задаёт полный цикл тактового сигнала. Входы меняются в начале периода.':
    'The period is one full clock cycle. Inputs change at the start of a period.',
  'Без тактового входа период задаёт интервал между изменениями входов.':
    'With no clock input, the period is the interval between input changes.',
  'Режим входных воздействий': 'Input stimulus mode',
  'Все комбинации, по одной за период. Заменяет текущую последовательность.':
    'Every combination, one per period. Replaces the current sequence.',
  'Перебор доступен для 1–8 битов входных данных.':
    'Sweeping is available for 1–8 bits of input data.',
  'Перебрать входы': 'Sweep inputs',
  ' После периодов сброса.': ' After the reset periods.',
  'Все сочетания от нулей до единиц: {combinations}.{reset} Каждый шаг можно изменить в «Последовательности».':
    'All combinations from zeros to ones: {combinations}.{reset} You can edit each step in “Sequence”.',
  'Эти уровни сохраняются весь запуск. Для изменений добавьте шаги в «Последовательности».':
    'These levels hold for the whole run. To change them, add steps in “Sequence”.',
  'Начальные уровни действуют до первого изменения в «Последовательности».':
    'Initial levels apply until the first change in “Sequence”.',
  '{count} бит': '{count} bit',
  'Значение входа {name}': 'Value of input {name}',
  'Свободных входов нет. Такт и сброс задаются в «Запуске».':
    'There are no free inputs. Clock and reset are set in “Run”.',
  'Первый период — 0. Изменение через 0,001 нс после начала периода.':
    'The first period is 0. The change happens 0.001 ns after the period starts.',
  'Время от начала запуска, точность 0,001 нс. На совпавшем фронте регистр прочитает прежний вход.':
    'Time from the start of the run, 0.001 ns resolution. On a coinciding edge the register reads the previous input.',
  'Пустое поле сохраняет прежний уровень; начальные уровни заданы во «Входах».':
    'An empty field keeps the previous level; initial levels are set in “Inputs”.',
  'Шкала событий': 'Event timeline',
  'По периодам': 'By periods',
  'В наносекундах': 'In nanoseconds',
  Период: 'Period',
  'Время, нс': 'Time, ns',
  'Период шага {n}': 'Period of step {n}',
  'Время события {n}, нс': 'Time of event {n}, ns',
  '{name}, шаг {n}': '{name}, step {n}',
  'Удалить шаг {n}': 'Delete step {n}',
  'Изменений пока нет.': 'No changes yet.',
  'Добавить шаг': 'Add step',
  'Функциональная RTL симуляция · изменения входов по периодам · без задержек распространения':
    'Functional RTL simulation · inputs change per period · no propagation delays',
  Скрыть: 'Hide',
  Показать: 'Show',
  'Скрыть журнал симуляции': 'Hide the simulation log',
  'Показать журнал симуляции': 'Show the simulation log',
  'Диаграмма {name}; значение на курсоре {value}. Стрелки перемещают курсор, Shift и стрелки сдвигают интервал.':
    'Waveform {name}; value at the cursor {value}. Arrow keys move the cursor, Shift with arrows pans the interval.',
  // Проверки
  'Задайте время и ожидаемый уровень порта. Значение снимается через 0,001 нс после указанного момента, когда изменения RTL уже обработаны. X — неизвестно, Z — отключённый выход.':
    'Set a time and the expected port level. The value is sampled 0.001 ns after that moment, once RTL changes are processed. X is unknown, Z is a disconnected output.',
  'Время проверки {n}, нс': 'Check {n} time, ns',
  Порт: 'Port',
  'Порт проверки {n}': 'Check {n} port',
  '{name} · отсутствует': '{name} · missing',
  Ожидается: 'Expected',
  'Ожидаемое значение {n}': 'Expected value {n}',
  'Удалить проверку {n}': 'Delete check {n}',
  Совпало: 'Matched',
  'Не совпало': 'Did not match',
  фактически: 'actual',
  'нет образца': 'no sample',
  'Проверок пока нет. Диаграммы можно смотреть и без них.':
    'No checks yet. You can view waveforms without them.',
  'Добавить проверку': 'Add check',
  // Диаграммы
  'Много переходов — увеличьте масштаб': 'Many transitions: zoom in',
  'Поиск сигнала': 'Search signals',
  'Найти сигнал…': 'Find a signal…',
  Сигналы: 'Signals',
  'Закрыть выбор сигналов': 'Close signal picker',
  'Показать найденные': 'Show matches',
  'Скрыть все': 'Hide all',
  'Первые 500 сигналов. Уточните поиск.': 'First 500 signals. Narrow your search.',
  'Сигналы не найдены.': 'No signals found.',
  Формат: 'Format',
  'Формат значений шин': 'Bus value format',
  'Сдвинуть влево · Shift + ←': 'Pan left · Shift + ←',
  'Сдвинуть диаграмму влево': 'Pan waveform left',
  'Уменьшить масштаб · −': 'Zoom out · −',
  'Уменьшить масштаб диаграммы': 'Zoom the waveform out',
  'Увеличить масштаб · +': 'Zoom in · +',
  'Увеличить масштаб диаграммы': 'Zoom the waveform in',
  'Показать весь интервал': 'Show the whole interval',
  'Показать весь интервал диаграммы': 'Show the whole waveform interval',
  'Сдвинуть вправо · Shift + →': 'Pan right · Shift + →',
  'Сдвинуть диаграмму вправо': 'Pan waveform right',
  Курсор: 'Cursor',
  Сигнал: 'Signal',
  'На курсоре': 'At cursor',
  'Скрыть сигнал': 'Hide signal',
  'Скрыть сигнал {name}': 'Hide signal {name}',
  'Показать {name} в RTL': 'Show {name} in RTL',
  'Открыть RTL и подсветить связи этого сигнала':
    'Open RTL and highlight this signal’s connections',
  'Нет соответствия в RTL текущей сборки': 'No match in the RTL of the current build',
  'верхний уровень': 'top level',
  '{width} бит': '{width} bit',
  'Двоичное значение: {value}': 'Binary value: {value}',
  'Подходящих видимых сигналов нет. Измените поиск или выбор сигналов.':
    'No matching visible signals. Change the search or the signal selection.',
  'Выберите сигналы в меню над диаграммой.': 'Choose signals in the menu above the waveform.',
  'Перемещение по времени': 'Time navigation',
  'Сдвигает видимый интервал, сохраняя масштаб': 'Moves the visible interval, keeping the zoom',
  'Клик — курсор · Shift + перетаскивание — сдвиг': 'Click: cursor · Shift + drag: pan',
  'Предупреждения диаграмм': 'Waveform warnings',
  '{count} сигналов содержат более 2000 переходов в окне. Их диаграммы скрыты: увеличьте масштаб, чтобы увидеть переходы.':
    '{count} signals have more than 2000 transitions in the window. Their waveforms are hidden: zoom in to see the transitions.',
  'Операция отменена': 'Operation cancelled',
  'Симулятор не вернул VCD.': 'The simulator did not return a VCD file.',
  // единицы времени
  с: 's',
  мс: 'ms',
  мкс: 'µs',
  нс: 'ns',
  пс: 'ps',
  фс: 'fs',
  'USB-плата отключена. Подключите её и выберите снова.':
    'The USB board was unplugged. Plug it in and select it again.',
  'SHA-256 недоступен. Откройте приложение через HTTPS или localhost.':
    'SHA-256 is unavailable. Open the app over HTTPS or localhost.',
  'Не удалось получить битстрим. Повторите размещение.':
    'Could not get the bitstream. Run placement again.',
  'Ошибка чтения битстрима.': 'Error reading the bitstream.',
  'Не удалось получить доступ к USB.': 'Could not access USB.',
  'Выберите Gowin .fs размером до 16 МБ.': 'Choose a Gowin .fs file up to 16 MB.',
  'Не удалось открыть файл.': 'Could not open the file.',
  'Выберите ROM-порт…': 'Choose the ROM port…',
  'Не удалось прочитать ROM.': 'Could not read the ROM.',
  Подготовка: 'Preparing',
  'Проект изменился. Повторите синтез и размещение.':
    'The project has changed. Run synthesis and placement again.',
  'Битстрим изменился. Выберите файл заново.': 'The bitstream has changed. Choose the file again.',
  'Ошибка USB/JTAG.': 'USB/JTAG error.',
  'Ошибка загрузки': 'Programming failed',
  'Загрузка завершена': 'Programming finished',
  'Загрузка битстрима в плату': 'Loading a bitstream onto the board',
  'Обслуживание USB-отладчика': 'USB debugger maintenance',
  'Загрузка в FPGA': 'Load into the FPGA',
  'Запустите схему на плате. Загрузка в SRAM действует до отключения питания.':
    'Run your circuit on the board. SRAM loading lasts until the power is turned off.',
  готово: 'done',
  'Подключите плату': 'Connect the board',
  'FPGA отвечает по JTAG': 'FPGA responds over JTAG',
  'USB подключён': 'USB connected',
  'Выберите USB в окне браузера…': 'Choose the USB device in the browser window…',
  'Проверяем JTAG…': 'Checking JTAG…',
  'Выбрать другую плату': 'Choose another board',
  'Выбрать USB-плату': 'Choose a USB board',
  'Отключить USB-плату': 'Disconnect the USB board',
  'WebUSB недоступен. Откройте Logra через HTTPS или localhost в браузере с WebUSB, например Chrome или Edge.':
    'WebUSB is unavailable. Open Logra over HTTPS or localhost in a browser with WebUSB, such as Chrome or Edge.',
  'FPGA GW2AR-18C распознана': 'FPGA GW2AR-18C detected',
  'Как исправить подключение': 'How to fix the connection',
  'Выбран DirtyJTAG. Ошибка захвата требует проверки WinUSB и доступа к interface 0. Переподключите USB без UPDATE и закройте другие программы, работающие с платой.':
    'DirtyJTAG is selected. A claim error means you should check WinUSB and access to interface 0. Reconnect USB without UPDATE and close other programs that use the board.',
  'Штатная FTDI-эмуляция на Windows может блокировать WebUSB. Откройте раздел «Отладчик» и выберите Bouffalo CDC в режиме UPDATE. Закройте другие программы, работающие с платой.':
    'The standard FTDI emulation on Windows can block WebUSB. Open the “Debugger” section and choose Bouffalo CDC in UPDATE mode. Close other programs that use the board.',
  'Открыть настройку отладчика': 'Open debugger setup',
  'Выберите схему': 'Choose a circuit',
  'Источник битстрима': 'Bitstream source',
  'Сборка проекта': 'Project build',
  'Свой .fs': 'Your own .fs',
  'Проверяем битстрим…': 'Checking the bitstream…',
  '{name} · {size} МБ': '{name} · {size} MB',
  'Проверка файла': 'File check',
  'Модель FPGA и CRC проверены.': 'FPGA model and CRC verified.',
  'Сборка относится к предыдущим исходникам': 'The build is from the previous sources',
  'Битстрим проекта ещё не готов': 'The project bitstream is not ready yet',
  'Синтезируйте проект и выполните размещение во вкладке «Кристалл».':
    'Synthesize the project and run placement in the “Chip” tab.',
  'Открыть кристалл': 'Open the chip',
  'Выберите текстовый битстрим .fs': 'Choose a text .fs bitstream',
  'Проверим модель FPGA и CRC каждого кадра.':
    'We will check the FPGA model and the CRC of every frame.',
  'Запустите на FPGA': 'Run it on the FPGA',
  'Загрузка…': 'Loading…',
  'Загрузить в SRAM': 'Load into SRAM',
  'Перед JTAG-проверкой UART будет закрыт.': 'UART will be closed before the JTAG check.',
  'Скрыть журнал': 'Hide log',
  Журнал: 'Log',
  'Ход загрузки': 'Programming progress',
  'Подробности загрузки': 'Programming details',
  'FPGA подтвердила конфигурацию. Проверьте LED и поведение устройства на плате.':
    'The FPGA confirmed the configuration. Check the LEDs and how the device behaves on the board.',
  'Передача ещё не началась.': 'The transfer has not started yet.',
  'Диагностика: прочитать BootInfo': 'Diagnostics: read BootInfo',
  'Отключите USB. Зажмите UPDATE за разъёмом HDMI, подключите USB и отпустите кнопку. Выберите новый порт «Устройство с последовательным интерфейсом USB» или Bouffalo CDC. Проверка читает BootInfo; прошивка отладчика, flash и eFuse сохраняются.':
    'Unplug USB. Hold UPDATE behind the HDMI connector, plug USB in and release the button. Choose the new port “USB Serial Device” or Bouffalo CDC. The check reads BootInfo; the debugger firmware, flash and eFuse are kept.',
  'Прочитать BootInfo': 'Read BootInfo',
  'Нужен браузер с Web Serial через HTTPS или localhost.':
    'A browser with Web Serial over HTTPS or localhost is required.',
  'Ответ ROM получен · USB {usbId} · версия {version}':
    'ROM response received · USB {usbId} · version {version}',
  'Подпись IF: {signing} · шифрование IF: {encryption}':
    'IF signature: {signing} · IF encryption: {encryption}',
  'Исходный ответ BootInfo': 'Raw BootInfo response',
  'Файл больше flash BL616.': 'The file is larger than the BL616 flash.',
  'ROM-порт отключён. Подключи плату с UPDATE и выбери порт заново.':
    'The ROM port was disconnected. Plug the board in with UPDATE held and choose the port again.',
  ' из файла': ' from file',
  'Проверяем BL616 и пакет прошивки…': 'Checking the BL616 and the firmware package…',
  'Подготовка завершена: копия {hash}, секторов к записи: {sectors}':
    'Preparation finished: backup {hash}, sectors to write: {sectors}',
  'Подготовка остановлена: {message}': 'Preparation stopped: {message}',
  'Запись · {mode} · {time}': 'Write · {mode} · {time}',
  'Запись завершена: секторов {sectors}, SHA-256 всей flash совпал':
    'Write finished: {sectors} sectors, SHA-256 of the whole flash matched',
  'Запись остановлена: {message}': 'Write stopped: {message}',
  'Установка и восстановление отладчика': 'Debugger install and restore',
  'Отладчик для работы в браузере': 'Debugger for working in the browser',
  'DirtyJTAG заменяет FTDI-эмуляцию в отладчике платы. Пакет содержит загрузчик Sipeed и JTAG с дескрипторами для WinUSB; UART остаётся отдельным портом. Инструменты на компьютере ученика не требуются.':
    'DirtyJTAG replaces the FTDI emulation in the board’s debugger. The package contains the Sipeed bootloader and JTAG with WinUSB descriptors; UART stays a separate port. No tools are needed on the student’s computer.',
  'Отключи USB. Зажми UPDATE (BOOT) за HDMI, подключи USB и отпусти кнопку. LED могут продолжать бегущий огонь: режим загрузчика определяется появлением Bouffalo CDC.':
    'Unplug USB. Hold UPDATE (BOOT) behind HDMI, plug USB in and release the button. The LEDs may keep running their chase pattern: bootloader mode is recognized by the Bouffalo CDC device appearing.',
  'Выбери Bouffalo CDC. Приложение прочитает flash BL616, сохранит копии в браузере и на сервере и проверит их SHA-256.':
    'Choose Bouffalo CDC. The app will read the BL616 flash, save copies in the browser and on the server, and verify their SHA-256.',
  'Проверь сведения о плате, затем запусти установку. После записи переподключи USB без UPDATE.':
    'Check the board details, then start the install. After writing, replug USB without UPDATE.',
  'Подготовить установку': 'Prepare the install',
  'Восстановить сохранённую прошивку': 'Restore the saved firmware',
  'Выбрать другой ROM-порт': 'Choose another ROM port',
  'Восстановить из файла…': 'Restore from file…',
  'Файл копии проверен': 'Backup file verified',
  '{hash}… · совпал с именем': '{hash}… · matches the file name',
  Размер: 'Size',
  '{size} МБ': '{size} MB',
  'Восстановить из этого файла': 'Restore from this file',
  'Убрать файл': 'Remove file',
  'Резервная копия сохранена и перечитана': 'Backup saved and read back',
  'SHA-256 копии': 'Backup SHA-256',
  Запись: 'Write',
  '{count} секторов': '{count} sectors',
  'самая ранняя сохранённая копия': 'the earliest saved backup',
  'Изменится прошивка USB-отладчика BL616. Во время записи сохрани питание. Проверенная копия также сохранена на сервере в твоём профиле. Скачивание дополнительной копии доступно по желанию.':
    'The firmware of the BL616 USB debugger will change. Keep power connected while writing. The verified backup is also saved on the server in your profile. Downloading an extra copy is optional.',
  'Скачать копию ещё раз': 'Download the backup again',
  'Скачать копию (.bin)': 'Download the backup (.bin)',
  'Установить DirtyJTAG': 'Install DirtyJTAG',
  'Восстановить BL616': 'Restore the BL616',
  Назад: 'Back',
  'Выбери порт Bouffalo CDC…': 'Choose the Bouffalo CDC port…',
  'Ход установки отладчика': 'Debugger install progress',
  'Отменить подготовку': 'Cancel preparation',
  'Скачать журнал обмена с ROM': 'Download the ROM exchange log',
  'DirtyJTAG записан. SHA-256 всей flash совпал.':
    'DirtyJTAG written. SHA-256 of the whole flash matched.',
  'Сохранённая flash BL616 восстановлена и проверена.':
    'The saved BL616 flash was restored and verified.',
  'Отключи USB и подключи снова без UPDATE.': 'Unplug USB and plug it in again without UPDATE.',
  'Выбери DirtyJTAG и проверь ID FPGA, затем загружай битстрим в SRAM.':
    'Choose DirtyJTAG and check the FPGA ID, then load the bitstream into SRAM.',
  'USB-отладчик из сохранённой копии должен появиться снова.':
    'The USB debugger from the saved backup should appear again.',
  'Выбрать DirtyJTAG': 'Choose DirtyJTAG',
  'К установке и восстановлению': 'Back to install and restore',
  'Пакет и границы проверки': 'Package and what is checked',
  'Сборка из закреплённых исходников DirtyJTAG и Bouffalo SDK. Установка ещё проходит испытания на реальной плате. Протокол проверяет ROM, параметры flash, резервную копию и каждый записанный сектор; при несовместимости останавливается до стирания. eFuse и конфигурация FPGA этим мастером не записываются.':
    'Built from pinned DirtyJTAG and Bouffalo SDK sources. The install is still being tested on a real board. The protocol checks the ROM, flash parameters, the backup and every written sector; on a mismatch it stops before erasing. eFuse and the FPGA configuration are not written by this wizard.',
  'Исходный проект DirtyJTAG': 'DirtyJTAG source project',
  'Подключиться к мастерской': 'Connect to the workshop',
  'Введите код доступа, который выдал преподаватель. На сервере будут доступны ваши сборки, проекты и прогресс курса.':
    'Enter the access code your teacher gave you. Your builds, projects and course progress will be available on the server.',
  'Не удалось войти.': 'Could not sign in.',
  'Код доступа': 'Access code',
  'Продолжить с локальным кодом': 'Continue with the local code',
  Подключиться: 'Connect',
  'Не удалось обменяться данными с сервером.': 'Could not exchange data with the server.',
  'Проекты и прогресс на сервере': 'Projects and progress on the server',
  'Участник: {user}. Вы выбираете, что сохранить на сервере. Локальные проекты из этого браузера доступны отдельно.':
    'Member: {user}. You choose what to save on the server. Local projects in this browser stay available separately.',
  'Удалить «{name}» с сервера?': 'Delete “{name}” from the server?',
  'Обновить серверную версию «{name}»?': 'Update the server version of “{name}”?',
  'Сохранить текущий прогресс курса?': 'Save the current course progress?',
  'Восстановить прогресс курса с сервера?': 'Restore the course progress from the server?',
  'Текущий прогресс и черновики уроков в этом браузере будут заменены выбранной серверной копией.':
    'Current progress and lesson drafts in this browser will be replaced with the selected server copy.',
  'Серверная копия прогресса будет заменена текущими результатами и черновиками этого браузера.':
    'The server copy of the progress will be replaced with the current results and drafts from this browser.',
  'Локальная копия останется в браузере.': 'The local copy will stay in the browser.',
  'На сервер будут записаны текущие исходники. Изменения других сеансов проверяются перед записью.':
    'The current sources will be written to the server. Changes from other sessions are checked before writing.',
  Отмена: 'Cancel',
  'Проект сохранён на сервере.': 'The project was saved on the server.',
  'Прогресс курса сохранён на сервере.': 'Course progress was saved on the server.',
  'Прогресс курса восстановлен.': 'Course progress was restored.',
  'Удалить с сервера': 'Delete from the server',
  Восстановить: 'Restore',
  Сохранить: 'Save',
  'Сохранить «{name}» на сервере': 'Save “{name}” on the server',
  'Список обновлён.': 'The list was refreshed.',
  'Обновить список': 'Refresh the list',
  '{top} · Открыть локальную копию': '{top} · Open the local copy',
  'Серверная библиотека пока пуста.': 'The server library is empty so far.',
  Обучение: 'Learn',
  'Сохранить прогресс курса': 'Save course progress',
  'Восстановить прогресс курса': 'Restore course progress',
  'Завершить сеанс': 'End the session',
  Закрыть: 'Close',
  'От Verilog к FPGA': 'From Verilog to FPGA',
  'Закрыть справку': 'Close help',
  'Код.': 'Code.',
  'Создайте проект или откройте пример. Изменения сохраняются автоматически.':
    'Create a project or open an example. Changes are saved automatically.',
  'RTL и Gowin.': 'RTL and Gowin.',
  'Синтез покажет схемные элементы и реальные примитивы FPGA. Щёлкните LUT для таблицы истинности.':
    'Synthesis shows the schematic elements and the real FPGA primitives. Click a LUT to see its truth table.',
  'Выводы .cst.': 'Pins (.cst).',
  'Опишите физические выводы по схеме платы перед размещением.':
    'Describe the physical pins from the board schematic before placement.',
  'Диаграммы и виртуальная плата.': 'Waveforms and the virtual board.',
  'Настройте такты и входные воздействия. Проверяйте поведение в настоящей функциональной симуляции Icarus.':
    'Set up clocks and input stimuli. Check the behavior in a real functional Icarus simulation.',
  'Кристалл и подключение.': 'Chip and connection.',
  'Изучайте данные размещения и подключайте настоящую плату.':
    'Study the placement data and connect a real board.',
  'Обучение.': 'Learn.',
  'Пройдите интерактивный маршрут: от первого бита до регистров, счётчика и автомата состояний.':
    'Follow the interactive route: from the first bit to registers, a counter and a state machine.',
  Синтез: 'Synthesis',
  'К экспериментам': 'On to experiments',
  'Закрыть пояснение': 'Close explanation',
  'Словарь терминов': 'Glossary',
  'Закрыть словарь': 'Close glossary',
  'Найти термин': 'Find a term',
  'Найти термин…': 'Find a term…',
  'Такого термина пока нет в словаре.': 'This term is not in the glossary yet.',
  'Объяснения слов и терминов': 'Explanations of words and terms',
  Словарь: 'Glossary',
  'Загрузка редактора…': 'Loading the editor…',
  Автосохранено: 'Autosaved',
  'Сохраняем…': 'Saving…',
  'Ошибка сохранения': 'Save error',
  'Проверяем синтаксис…': 'Checking syntax…',
  'Проверьте ошибки в коде': 'Check the errors in the code',
  'Синтаксис проверен': 'Syntax checked',
  'Проверка синтаксиса недоступна': 'Syntax check unavailable',
  'Строка {line} · столбец {column} · UTF-8': 'Line {line} · column {column} · UTF-8',
  'Сигнал {name}: подсвечены связи и элементы модуля {module}.':
    'Signal {name}: connections and elements of module {module} are highlighted.',
  'Открываем проекты…': 'Opening projects…',
  'Первая миссия: сигнальный маяк': 'First mission: the signal beacon',
  'Ты в мастерской цифровых устройств. Verilog описывает схему, Yosys собирает логику, а файл CST связывает её с контактами платы. Наставник покажет каждый шаг в настоящей IDE.':
    'You are in a digital-device workshop. Verilog describes the circuit, Yosys builds the logic, and the CST file ties it to the board’s pins. The mentor will show every step in the real studio.',
  'Соберём маяк: две группы по три LED меняются каждые полсекунды. Текущий проект сохранится; для миссии создадим отдельный.':
    'Let’s build a beacon: two groups of three LEDs swap every half second. Your current project is kept; we will create a separate one for the mission.',
  'Твой первый приказ схеме': 'Your first order to the circuit',
  "В top.v уже есть тактовый делитель. phase выбирает одну из двух групп. 6'b101010 — шесть битов в двоичной записи; 0 включает физический LED. assign непрерывно соединяет выход с выражением.":
    "top.v already has a clock divider. phase picks one of two groups. 6'b101010 is six bits in binary; 0 turns a physical LED on. assign continuously connects an output to an expression.",
  "В последней строке assign замени 6'b111111 на 6'b101010. Остальные строки пока оставь. Это не команда процессору: ты описываешь провод и переключатель.":
    "In the last assign line, replace 6'b111111 with 6'b101010. Leave the other lines for now. This is not a command to a processor: you are describing a wire and a switch.",
  'Проверь маяк до подключения': 'Check the beacon before connecting',
  'Железо дорого чинить, поэтому сначала проверяем поведение. Для короткого опыта наставник ставит HALF_PERIOD = 4 в отдельной копии для симуляции. В твоём проекте для платы остаётся 13 500 000 тактов.':
    'Hardware is expensive to fix, so we check the behavior first. For a short experiment the mentor sets HALF_PERIOD = 4 in a separate copy for simulation. Your board project keeps 13,500,000 clock cycles.',
  'Запусти проверку в карточке миссии. Ожидаем 101010, затем 010101, затем снова 101010. Ошибка покажет первый расходящийся момент.':
    'Run the check in the mission card. We expect 101010, then 010101, then 101010 again. An error shows the first moment that differs.',
  'Преврати описание в схему': 'Turn the description into a circuit',
  'Синтез ищет регистры, счётчик и мультиплексор в твоём Verilog. На RTL увидишь эти операции, а Gowin покажет, как они превратились в LUT и триггеры.':
    'Synthesis looks for registers, a counter and a multiplexer in your Verilog. RTL shows those operations, and Gowin shows how they became LUTs and flip-flops.',
  'Нажми подсвеченную кнопку «Синтезировать» в шапке. Дождись успешной сборки текущего кода.':
    'Press the highlighted “Synthesize” button in the header. Wait for the current code to build successfully.',
  'Загляни внутрь устройства': 'Look inside the device',
  'Здесь видно, какую схему ты описал. Регистр хранит состояние, сумматор увеличивает счётчик, мультиплексор выбирает группу LED. Нажатие на элемент показывает его входы и параметры.':
    'This shows the circuit you described. The register holds state, the adder increments the counter, the multiplexer picks the LED group. Clicking an element shows its inputs and parameters.',
  'Открой RTL и выбери любой элемент на схеме. В инспекторе можно нажать на название примитива для объяснения.':
    'Open RTL and pick any element on the schematic. In the inspector you can click a primitive’s name for an explanation.',
  'Провода получают адреса': 'Wires get addresses',
  'CST назначает clk на вывод 4 и led_n[0…5] на выводы 15…20. IO_TYPE=LVCMOS33 задаёт электрический стандарт 3,3 В. Номера здесь относятся к ножкам FPGA.':
    'CST assigns clk to pin 4 and led_n[0…5] to pins 15…20. IO_TYPE=LVCMOS33 sets the 3.3 V electrical standard. The numbers here refer to the FPGA’s pins.',
  'Открой «Выводы .cst», найди назначение led_n[0] и ответь: какой уровень включает LED Tang Nano 20K?':
    'Open “Pins (.cst)”, find the assignment of led_n[0] and answer: which level turns the Tang Nano 20K LED on?',
  'Размести схему на кристалле': 'Place the circuit on the chip',
  'nextpnr выбирает реальные ячейки и прокладывает соединения с учётом CST. Apicula упаковывает результат в битстрим .fs. Карта показывает занятость ресурсов и связей.':
    'nextpnr picks real cells and routes the connections following the CST. Apicula packs the result into a .fs bitstream. The map shows how busy resources and routes are.',
  'Открой «Кристалл» и нажми «Разместить». После успешной сборки появятся карта и битстрим этого проекта.':
    'Open “Chip” and press “Place”. After a successful build the map and the bitstream of this project appear.',
  'Познакомь браузер с платой': 'Introduce the browser to the board',
  'Подключи Tang Nano 20K и открой «Подключение». Выбор USB даёт странице доступ только к выбранному устройству. Перед записью прочитаем ID FPGA. UART-порт для сообщений — отдельное подключение.':
    'Plug in the Tang Nano 20K and open “Connect”. Choosing a USB device gives the page access only to that device. Before writing we read the FPGA ID. The UART port for messages is a separate connection.',
  'Нажми «Выбрать USB-плату». Если штатный FTDI недоступен, в панели есть вход UPDATE/BOOT и проверка ROM через Web Serial. Установка DirtyJTAG ещё готовится.':
    'Press “Choose a USB board”. If the stock FTDI is unavailable, the panel has the UPDATE/BOOT entry and a ROM check over Web Serial. The DirtyJTAG install is still being prepared.',
  'Загрузи собственное устройство': 'Load your own device',
  'Выбери «Сборка проекта», затем «Загрузить в SRAM». SRAM-конфигурация работает до отключения питания; после него плата вернётся к программе из flash.':
    'Choose “Project build”, then “Load into SRAM”. The SRAM configuration works until the power is turned off; after that the board returns to the program in flash.',
  'Дождись подтверждения конфигурации FPGA. Засчитаем только загрузку битстрима этой миссии, собранного из текущих файлов.':
    'Wait for the FPGA configuration to be confirmed. We only count loading this mission’s bitstream, built from the current files.',
  'Проверь устройство глазами': 'Check the device with your eyes',
  'Протокол подтвердил загрузку, теперь проверяем результат на самой плате. Две группы по три ярких LED должны меняться примерно раз в полсекунды.':
    'The protocol confirmed the load, now we check the result on the board itself. Two groups of three bright LEDs should swap about every half second.',
  'Посмотри на шесть пользовательских LED и отметь результат. Если поведение отличается, вернись к подключению и журналу; миссия пока не завершена.':
    'Look at the six user LEDs and mark the result. If the behavior differs, go back to the connection and the log; the mission is not finished yet.',
  'Первое устройство готово': 'The first device is ready',
  'Ты прошёл путь от Verilog до работающей FPGA: описание, симуляция, RTL, физические выводы, размещение и загрузка.':
    'You went from Verilog to a working FPGA: description, simulation, RTL, physical pins, placement and loading.',
  'Теперь начинай курс Verilog: входы и выходы, логика, шины, мультиплексор, регистры, счётчик и автомат. В каждом уроке есть задача, подсказки и настоящая проверка.':
    'Now start the Verilog course: inputs and outputs, logic, buses, a multiplexer, registers, a counter and a state machine. Every lesson has a task, hints and a real check.',
  'Миссия · маяк · HALF_PERIOD = 4 (копия для симуляции)':
    'Mission · beacon · HALF_PERIOD = 4 (copy for simulation)',
  'Гид: первая миссия в IDE': 'Guide: the first mission in the studio',
  'МИССИЯ 01 · МАЯК': 'MISSION 01 · BEACON',
  Старт: 'Start',
  'Развернуть задание': 'Expand the task',
  'Свернуть задание': 'Collapse the task',
  'Приостановить гид': 'Pause the guide',
  'Виртуальная часть пройдена': 'Virtual part complete',
  'Твой код прошёл симуляцию, синтез и размещение. Запись на реальную плату ещё не засчитана. Её можно продолжить, когда доступ к отладчику будет готов.':
    'Your code passed simulation, synthesis and placement. Loading onto a real board is not counted yet. You can continue it when debugger access is ready.',
  'Вернуться к плате': 'Back to the board',
  'Продолжить курс Verilog': 'Continue the Verilog course',
  'Устройство проверено на плате': 'The device was checked on the board',
  'Действуй в самой IDE — подсветка покажет куда':
    'Work in the studio itself: the highlight shows where',
  'Код прошёл настоящую симуляцию': 'The code passed a real simulation',
  'Проверяем результат каждого действия': 'We check the result of every action',
  'Сейчас открыт другой проект. Вернись к {name}, чтобы продолжить.':
    'A different project is open now. Go back to {name} to continue.',
  'Вернуть миссию': 'Return to the mission',
  'Проверяем маяк…': 'Checking the beacon…',
  'Проверить маяк': 'Check the beacon',
  'Диаграммы открыты в рабочей области. Сравни phase и led_n: после смены phase меняется выбранная группа.':
    'The waveforms are open in the workspace. Compare phase and led_n: after phase changes, the selected group changes.',
  'Уровень включения LED': 'LED on level',
  'Уровень {value}': 'Level {value}',
  'У LED активный низкий уровень: ток идёт, когда FPGA выдаёт 0. Суффикс _n напоминает об этом.':
    'The LED is active low: current flows when the FPGA outputs 0. The _n suffix is a reminder.',
  'Чередуются две группы по три': 'Two groups of three alternate',
  'Результат отличается — проверить загрузку': 'The result differs: check the loading',
  'Начать курс Verilog': 'Start the Verilog course',
  'Дальше — 11 уроков с задачами, подсказками и проверками. Маяк сохранён в библиотеке проектов.':
    'Next come 11 lessons with tasks, hints and checks. The beacon is saved in the project library.',
  'Начать миссию': 'Start the mission',
  'Шаг выполнен. Дальше': 'Step done. Next',
  'Сначала выполни действие': 'Do the action first',
  'К нужной вкладке': 'To the right tab',
  'Продолжить обучение без платы': 'Continue learning without a board',
  'Такт {cycle}: группа {group}': 'Cycle {cycle}: group {group}',
  'Верни HALF_PERIOD = 13_500_000 для генератора 27 МГц. Наставник ускоряет только копию для симуляции.':
    'Set HALF_PERIOD back to 13_500_000 for the 27 MHz oscillator. The mentor only speeds up the simulation copy.',
  'Документация Yosys': 'Yosys documentation',
  'Модели примитивов Gowin в Yosys': 'Gowin primitive models in Yosys',
  бит: 'bits',
  бита: 'bits',
  'нет · без знака': 'no · unsigned',
  'да · со знаком': 'yes · signed',
  'фронт ↑': 'edge ↑',
  'спад ↓': 'fall ↓',
  'активен при 1': 'active at 1',
  'активен при 0': 'active at 0',
  Мультиплексор: 'Multiplexer',
  'Выбирает один из двух входов. При S = 0 выход Y повторяет A; при S = 1 — B. Работает сразу, без тактового сигнала.':
    'Selects one of two inputs. When S = 0 the output Y repeats A; when S = 1 it repeats B. It works immediately, with no clock.',
  'WIDTH задаёт число бит в каждом входе данных и в выходе.':
    'WIDTH sets the number of bits in each data input and in the output.',
  'Параллельный мультиплексор': 'Parallel multiplexer',
  'Выбирает A по умолчанию или один из блоков входа B. Каждый бит S разрешает свой блок B. Это выбор one-hot: одновременно может быть включён только один вариант.':
    'Selects A by default or one of the blocks of input B. Each bit of S enables its own block of B. This is a one-hot choice: only one option can be on at a time.',
  "// A — значение по умолчанию; B = {b1, b0}.\nalways @* begin\n  case (select)\n    2'b00: y = a;\n    2'b01: y = b0;\n    2'b10: y = b1;\n    default: y = 'bx;\n  endcase\nend":
    "// A is the default value; B = {b1, b0}.\nalways @* begin\n  case (select)\n    2'b00: y = a;\n    2'b01: y = b0;\n    2'b10: y = b1;\n    default: y = 'bx;\n  endcase\nend",
  'Если в S несколько единиц, выход $pmux неопределён. Не полагайтесь на приоритет входов.':
    'If S has several ones, the $pmux output is undefined. Do not rely on input priority.',
  'WIDTH — ширина одного варианта; S_WIDTH — число вариантов в B.':
    'WIDTH is the width of one option; S_WIDTH is the number of options in B.',
  'Мультиплексор с двоичным выбором': 'Multiplexer with binary select',
  'S содержит номер блока. Выход Y получает соответствующий фрагмент упакованного входа A.':
    'S holds the block number. The output Y receives the matching slice of the packed input A.',
  'Побитовый мультиплексор': 'Bitwise multiplexer',
  'У каждого бита Y свой бит выбора S. Можно взять часть битов из A, а остальные из B.':
    'Each bit of Y has its own select bit in S. You can take some bits from A and the rest from B.',
  Демультиплексор: 'Demultiplexer',
  'Отправляет A в блок выхода Y с номером S. Остальные блоки выхода получают нули.':
    'Sends A to the block of output Y numbered S. The other output blocks get zeros.',
  'Буфер с третьим состоянием': 'Tri-state buffer',
  'При EN = 1 передаёт A на Y. При EN = 0 освобождает линию: состояние Z означает высокое сопротивление.':
    'When EN = 1 it passes A to Y. When EN = 0 it releases the line: the Z state means high impedance.',
  'Внутренние линии FPGA обычно реализуются мультиплексорами. Z полезно прежде всего на внешних двунаправленных выводах.':
    'Inside an FPGA, internal lines are usually built from multiplexers. Z is mostly useful on external bidirectional pins.',
  Сумматор: 'Adder',
  'Складывает A и B. Число бит Y ограничивает размер результата; лишние старшие биты отбрасываются.':
    'Adds A and B. The number of bits in Y limits the size of the result; extra high bits are dropped.',
  '// 4 бита: 15 + 1 превращается в 0.\nassign y = a + b;':
    '// 4 bits: 15 + 1 becomes 0.\nassign y = a + b;',
  Вычитатель: 'Subtractor',
  'Вычитает B из A. Ширина выхода и знаковость входов определяют представление результата.':
    'Subtracts B from A. The output width and the signedness of the inputs determine how the result is represented.',
  Умножитель: 'Multiplier',
  'Вычисляет произведение A и B. После синтеза может использовать DSP или обычную логику — это зависит от ширины и настроек.':
    'Computes the product of A and B. After synthesis it may use a DSP or ordinary logic, depending on the width and settings.',
  Делитель: 'Divider',
  'Делит A на B и оставляет целую часть. Для знаковых входов $div округляет к нулю.':
    'Divides A by B and keeps the integer part. For signed inputs $div rounds toward zero.',
  'Деление на переменное значение может потребовать много логики. Деление на ноль не даёт корректного численного результата.':
    'Division by a variable can take a lot of logic. Division by zero gives no valid numeric result.',
  'Остаток от деления': 'Remainder',
  'Вычисляет остаток A % B. Для $mod со знаковыми входами знак ненулевого остатка совпадает со знаком A.':
    'Computes the remainder A % B. For $mod with signed inputs the sign of a nonzero remainder matches the sign of A.',
  'Деление с округлением вниз': 'Floor division',
  'Как целочисленное деление, но со знаковыми входами округляет к минус бесконечности.':
    'Like integer division, but with signed inputs it rounds toward minus infinity.',
  '// -7 / 3 с округлением вниз даёт -3.': '// -7 / 3 rounded down gives -3.',
  'Обычный оператор / в Verilog округляет к нулю.':
    'The ordinary / operator in Verilog rounds toward zero.',
  'Остаток при округлении вниз': 'Floor remainder',
  'Дополняет $divfloor: A = B × частное + остаток. Знак ненулевого остатка совпадает со знаком B.':
    'Complements $divfloor: A = B × quotient + remainder. The sign of a nonzero remainder matches the sign of B.',
  'Возведение в степень': 'Exponentiation',
  'Вычисляет A в степени B. Постоянные значения синтезатор часто упрощает; общий случай может создать большую схему.':
    'Computes A to the power B. The synthesizer often simplifies constant values; the general case can create a large circuit.',
  'Смена знака': 'Negation',
  'Вычисляет отрицание числа A. Для отрицательных значений используется дополнительный код.':
    "Computes the negation of A. Negative values use two's complement.",
  'Унарный плюс': 'Unary plus',
  'Передаёт значение A, учитывая ширину и знаковость. Появляется и при приведении размеров сигналов.':
    'Passes the value of A, taking width and signedness into account. It also appears when signal sizes are adjusted.',
  'Арифметическая ячейка Yosys': 'Yosys arithmetic cell',
  'Объединяет сложение, перенос и управляемую инверсию B. Из таких ячеек Yosys строит сумматоры, вычитатели и сравнения.':
    'Combines addition, carry and a controllable inversion of B. Yosys builds adders, subtractors and comparisons from such cells.',
  '// Идея главного выхода: BI инвертирует B.\nassign y = a + (invert_b ? ~b : b) + carry_in;':
    '// The idea of the main output: BI inverts B.\nassign y = a + (invert_b ? ~b : b) + carry_in;',
  'Y — сумма, CO — переносы, X — результат XOR после подготовки входов.':
    'Y is the sum, CO the carries, X the XOR result after the inputs are prepared.',
  'Полный сумматор': 'Full adder',
  'Складывает три однобитовых входа для каждой позиции. Y — сумма, X — перенос.':
    'Adds three one-bit inputs for every position. Y is the sum, X is the carry.',
  'Блок вычисления переносов': 'Carry lookahead block',
  'Вычисляет переносы сумматора из сигналов распространения P и генерации G. Позволяет строить более быстрые арифметические цепочки.':
    'Computes the adder carries from the propagate (P) and generate (G) signals. It allows faster arithmetic chains.',
  'Сумма произведений': 'Sum of products',
  'Объединяет несколько умножений и сложений в одну операцию. Параметры задают состав слагаемых и разбиение входных шин.':
    'Combines several multiplications and additions into one operation. Parameters define the set of terms and how the input buses are split.',
  'Таблица поиска — LUT': 'Lookup table — LUT',
  'Входы образуют адрес строки, а в строке хранится выходной бит. Так можно реализовать любую логическую функцию заданного числа входов.':
    'The inputs form a row address, and the row stores the output bit. This way any logic function of a given number of inputs can be built.',
  '// Таблица для AND: 00→0, 01→0, 10→0, 11→1.\nassign y = a & b;':
    '// Table for AND: 00→0, 01→0, 10→0, 11→1.\nassign y = a & b;',
  'У N входов 2ᴺ строк. A[0] в $lut — младший бит адреса; параметр LUT хранит таблицу.':
    'N inputs give 2ᴺ rows. A[0] in $lut is the low address bit; the LUT parameter holds the table.',
  'Конечный автомат': 'Finite state machine',
  'Хранит текущее состояние и выбирает следующее по входным сигналам. Выходы определяются состоянием и таблицей переходов.':
    'Stores the current state and picks the next one from the input signals. The outputs are determined by the state and the transition table.',
  'Yosys может выделить автомат из Verilog, а затем снова превратить его в регистры и логику.':
    'Yosys can extract a state machine from Verilog and then turn it back into registers and logic.',
  'Фрагмент шины': 'Bus slice',
  'Берёт непрерывную группу битов из A. OFFSET задаёт первый бит, Y_WIDTH — число битов.':
    'Takes a contiguous group of bits from A. OFFSET sets the first bit, Y_WIDTH the number of bits.',
  'Объединение шин': 'Bus concatenation',
  'Склеивает A и B в одну шину: A занимает младшие биты, B — старшие.':
    'Joins A and B into one bus: A takes the low bits, B the high bits.',
  'Выбор фрагмента со сдвигом': 'Shifted slice select',
  'Сдвигает вход A для выбора фрагмента. Биты за границами A становятся X, а не нулём.':
    'Shifts input A to select a slice. Bits beyond the edges of A become X, not zero.',
  'Сдвиг в обе стороны': 'Shift in both directions',
  'Положительное B сдвигает A вправо, отрицательное знаковое B — влево. Освободившиеся позиции заполняются нулями.':
    'A positive B shifts A right, a negative signed B shifts it left. The freed positions are filled with zeros.',
  '// Концепция для знакового amount:\nassign y = amount < 0 ? (a << -amount) : (a >> amount);':
    '// Concept for a signed amount:\nassign y = amount < 0 ? (a << -amount) : (a >> amount);',
  И: 'AND',
  ИЛИ: 'OR',
  'Исключающее ИЛИ': 'Exclusive OR',
  'Исключающее ИЛИ с инверсией': 'Exclusive OR with inversion',
  'НЕ — инвертор': 'NOT — inverter',
  Меньше: 'Less than',
  'Меньше или равно': 'Less than or equal',
  Больше: 'Greater than',
  'Больше или равно': 'Greater than or equal',
  Равенство: 'Equal',
  Неравенство: 'Not equal',
  'Точное равенство с X и Z': 'Exact equality with X and Z',
  'Точное неравенство с X и Z': 'Exact inequality with X and Z',
  'Регистр с неявным тактом': 'Register with an implicit clock',
  'Специальная ячейка Yosys: обновляет состояние при глобальном такте моделирования. Обычно применяется во внутреннем представлении и формальной проверке.':
    'A special Yosys cell: it updates its state on the global simulation clock. Usually used in the internal representation and in formal verification.',
  'У $ff нет обычного порта CLK. Это не описание конкретного физического триггера.':
    '$ff has no ordinary CLK port. It does not describe a specific physical flip-flop.',
  'Защёлка пропускает D на Q, пока разрешение активно; когда оно выключается, хранит последнее значение.':
    'A latch passes D to Q while enable is active; when enable turns off, it keeps the last value.',
  'Запоминает значение D на выбранном фронте CLK и хранит его на Q до следующего обновления.':
    'Stores the value of D on the chosen CLK edge and keeps it on Q until the next update.',
  'Хранит один бит с отдельными входами установки SET и сброса CLR.':
    'Stores one bit with separate set (SET) and clear (CLR) inputs.',
  'Асинхронный сброс меняет Q сразу, без ожидания такта.':
    'An asynchronous reset changes Q immediately, without waiting for the clock.',
  'Синхронный сброс меняет Q только на активном фронте CLK.':
    'A synchronous reset changes Q only on the active CLK edge.',
  'ALOAD загружает данные AD асинхронно; обычное обновление D происходит по такту.':
    'ALOAD loads the data AD asynchronously; the ordinary update of D happens on the clock.',
  'При неактивном EN сохраняет состояние.': 'While EN is inactive it keeps its state.',
  'SET устанавливает Q, CLR сбрасывает его.': 'SET sets Q, CLR clears it.',
  'Синхронный сброс имеет приоритет перед EN.': 'A synchronous reset takes priority over EN.',
  'EN имеет приоритет: при выключенном EN даже синхронный сброс не меняет Q.':
    'EN takes priority: while EN is off, even a synchronous reset does not change Q.',
  'В имени P означает положительную полярность, N — отрицательную; 0/1 кодирует значение сброса. Точное расположение кодов зависит от семейства ячейки.':
    'In the name, P means positive polarity and N negative; 0/1 encodes the reset value. The exact position of the codes depends on the cell family.',
  'При одновременной установке и сбросе CLR имеет приоритет.':
    'When set and clear happen at once, CLR takes priority.',
  'Одновременные SET и CLR у DFFSR/DFFSRE дают неопределённое состояние.':
    'Simultaneous SET and CLR on DFFSR/DFFSRE give an undefined state.',
  'RS-защёлка': 'RS latch',
  'Защёлка — latch': 'Latch — latch',
  'D-триггер — регистр': 'D flip-flop — register',
  'Таблица поиска Gowin — LUT': 'Gowin lookup table — LUT',
  'INIT хранит таблицу: I0 — младший бит адреса. Для составных __APICULA_LUTn изучайте также подключённые ресурсы.':
    'INIT holds the table: I0 is the low address bit. For composite __APICULA_LUTn also study the connected resources.',
  'Мультиплексор Gowin': 'Gowin multiplexer',
  'При S0 = 0 выход O повторяет I0, при S0 = 1 — I1. MUX2_LUTn помогает объединять LUT в функции с большим числом входов.':
    'When S0 = 0 the output O repeats I0, when S0 = 1 it repeats I1. MUX2_LUTn helps combine LUTs into functions with more inputs.',
  'I0 и I1 — однобитовые входы данных, S0 — выбор, O — выход.':
    'I0 and I1 are one-bit data inputs, S0 is the select, O is the output.',
  'CE разрешает запись; при CE = 0 старое значение сохраняется.':
    'CE enables writing; when CE = 0 the old value is kept.',
  'D-триггер Gowin': 'Gowin D flip-flop',
  'INIT задаёт начальное состояние модели.': 'INIT sets the initial state of the model.',
  'Арифметическая ячейка Gowin': 'Gowin arithmetic cell',
  'Небольшая аппаратная ячейка арифметической цепочки. Передаёт перенос следующей ячейке; несколько ячеек работают вместе для многобитового сложения или вычитания.':
    'A small hardware cell of an arithmetic chain. It passes the carry to the next cell; several cells work together for multi-bit addition or subtraction.',
  '// Идея цепочки полного сумматора:\nassign sum = a ^ b ^ carry_in;\nassign carry_out = (a & b) | (a & carry_in) | (b & carry_in);':
    '// The idea of a full-adder chain:\nassign sum = a ^ b ^ carry_in;\nassign carry_out = (a & b) | (a & carry_in) | (b & carry_in);',
  'ALU_MODE выбирает аппаратный режим. ALU в отчёте — ячейка, а не целый процессорный блок.':
    'ALU_MODE selects the hardware mode. An ALU in the report is a cell, not a whole processor block.',
  'Буфер вывода Gowin': 'Gowin output buffer',
  'Передаёт уровень внешнего вывода I во внутреннюю логику через O.':
    'Passes the level of the external pin I into the internal logic through O.',
  'Передаёт внутренний сигнал I на внешний вывод O.':
    'Passes the internal signal I to the external pin O.',
  'Управляет внешним выходом или двунаправленным выводом. Вход OEN = 1 освобождает вывод; OEN = 0 разрешает передачу.':
    'Controls an external output or a bidirectional pin. OEN = 1 releases the pin; OEN = 0 allows transmission.',
  'Файл .cst назначает физический вывод и стандарт напряжения. Полярность Verilog output_enable в примере обратна аппаратному OEN.':
    'The .cst file assigns the physical pin and the voltage standard. The polarity of Verilog output_enable in the example is the reverse of the hardware OEN.',
  'Блочная память Gowin': 'Gowin block memory',
  'Использует встроенный аппаратный блок памяти. Адрес выбирает слово; режимы и порты определяют чтение, запись и работу по такту.':
    'Uses a built-in hardware memory block. The address selects a word; modes and ports define reading, writing and clocked operation.',
  'Пример показывает описание памяти в Verilog. Число портов, ширины и режимы конкретной ячейки проверяйте в параметрах и документации.':
    'The example shows a memory description in Verilog. Check the number of ports, widths and modes of the specific cell in its parameters and documentation.',
  'Распределённая память Gowin': 'Gowin distributed memory',
  'Хранит небольшую таблицу в ресурсах логических ячеек. Адрес выбирает данные; входы записи позволяют их менять.':
    'Stores a small table in the resources of logic cells. The address selects data; write inputs let you change it.',
  'Распределённая память и отдельные блоки BRAM используют разные физические ресурсы.':
    'Distributed memory and separate BRAM blocks use different physical resources.',
  'Арифметический блок DSP Gowin': 'Gowin DSP arithmetic block',
  'Использует выделенный аппаратный блок для арифметики. Конкретный примитив может включать умножение, сложение, накопление и регистры.':
    'Uses a dedicated hardware block for arithmetic. A specific primitive may include multiplication, addition, accumulation and registers.',
  '// Типичная задача DSP:\nassign product = a * b;':
    '// A typical DSP task:\nassign product = a * b;',
  'Набор операций и тактовые задержки зависят от примитива и его настроек.':
    'The set of operations and the clock latencies depend on the primitive and its settings.',
  'Блок тактовой сети Gowin': 'Gowin clock network block',
  'Формирует или распределяет тактовые сигналы. PLL, делитель и буфер выполняют разные задачи; конкретный режим определяется параметрами.':
    'Generates or distributes clock signals. A PLL, a divider and a buffer do different jobs; the specific mode is set by parameters.',
  'Настройки частоты, фазы и переключения такта требуют документации именно этого примитива.':
    'Frequency, phase and clock switching settings need the documentation of this exact primitive.',
  'Регистры и преобразователи I/O Gowin': 'Gowin I/O registers and converters',
  'Работают рядом с внешними выводами: захватывают или выдают данные по такту, иногда на обоих фронтах или с преобразованием последовательного потока.':
    'They work next to the external pins: they capture or output data on the clock, sometimes on both edges or with serial stream conversion.',
  'Число битов, последовательность выдачи и задержки зависят от типа примитива.':
    'The number of bits, the output order and the delays depend on the primitive type.',
  'Внутренний генератор Gowin': 'Gowin internal oscillator',
  'Создаёт тактовый сигнал внутри FPGA. Частота и доступные делители зависят от семейства устройства и параметров.':
    'Creates a clock signal inside the FPGA. The frequency and available dividers depend on the device family and parameters.',
  'Для точных внешних интерфейсов обычно требуется проверить точность и ограничения генератора по документации чипа.':
    'For precise external interfaces you usually need to check the oscillator’s accuracy and limits in the chip documentation.',
  'Меняет каждый бит: 0 становится 1, 1 становится 0.':
    'Flips every bit: 0 becomes 1, 1 becomes 0.',
  'Логическое ': 'Logical ',
  НЕ: 'NOT',
  'Проверяет, равно ли всё входное число нулю. Результат — один логический бит, даже если входы многобитовые.':
    'Checks whether the whole input number is zero. The result is a single logic bit, even if the inputs are multi-bit.',
  'Побитовые &, |, ~ работают с каждым битом отдельно; логические &&, ||, ! проверяют вход целиком.':
    'Bitwise &, |, ~ work on each bit separately; logical &&, ||, ! test the whole input.',
  'Свёртка битов — ': 'Bit reduction — ',
  'проверка ненулевого числа': 'nonzero check',
  'Объединяет все биты одной шины в один выходной бит. Например, &a даёт 1, только если все биты a равны 1.':
    'Combines all bits of one bus into a single output bit. For example, &a gives 1 only if all bits of a are 1.',
  'Сравнение — ': 'Comparison — ',
  'Сравнивает A и B. Если условие выполнено, Y = 1, иначе Y = 0. Знаковость влияет на числовые сравнения.':
    'Compares A and B. If the condition holds, Y = 1, otherwise Y = 0. Signedness affects numeric comparisons.',
  '=== и !== сравнивают X/Z как отдельные значения. Они полезны в симуляции; возможности физической реализации ограничены.':
    '=== and !== compare X/Z as separate values. They are useful in simulation; physical implementation is limited.',
  'X или Z на входах могут сделать результат симуляции неопределённым.':
    'X or Z on the inputs can make the simulation result undefined.',
  'Сдвигает A вправо. При знаковом A копирует старший знаковый бит в освободившиеся позиции; при беззнаковом A добавляет нули.':
    'Shifts A right. For a signed A it copies the top sign bit into the freed positions; for an unsigned A it adds zeros.',
  'Сдвигает биты A; освободившиеся позиции получают нули. Величина сдвига задаётся B.':
    'Shifts the bits of A; the freed positions get zeros. The shift amount is set by B.',
  'Порт чтения памяти': 'Memory read port',
  'Порт записи памяти': 'Memory write port',
  'Начальные данные памяти': 'Memory initial data',
  Память: 'Memory',
  'Внутреннее описание памяти Yosys. Адрес выбирает слово; ширины и параметры определяют порты, тактирование и обработку конфликтов чтения/записи.':
    'Yosys’s internal memory description. The address selects a word; widths and parameters define the ports, clocking and handling of read/write conflicts.',
  'На этапе RTL это ещё не гарантия BRAM. После отображения память может использовать BRAM, LUT или триггеры.':
    'At the RTL stage this does not yet guarantee BRAM. After mapping the memory may use BRAM, LUTs or flip-flops.',
  'Простая логическая операция над отдельными битами. Подчёркивания в имени обозначают внутренний формат вентилей Yosys.':
    'A simple logic operation on individual bits. Underscores in the name mark Yosys’s internal gate format.',
  'A и B — однобитовые входы данных, S — выбор, Y — выход.':
    'A and B are one-bit data inputs, S is the select, Y is the output.',
  'Мультиплексор с инверсией': 'Inverting multiplexer',
  'Комбинированный вентиль': 'Combined gate',
  'Объединяет несколько И/ИЛИ с инверсией результата. AOI — AND-OR-Invert, OAI — OR-AND-Invert.':
    'Combines several AND/OR with an inverted result. AOI is AND-OR-Invert, OAI is OR-AND-Invert.',
  'Служебная ячейка Yosys': 'Yosys helper cell',
  'Применяется для проверок, формальной модели или диагностических сообщений. Обычно не превращается в обычную логику на плате.':
    'Used for checks, the formal model or diagnostic messages. Usually it does not become ordinary logic on the board.',
  'Точная роль зависит от имени ячейки. Откройте описание в документации Yosys.':
    'The exact role depends on the cell name. Open its description in the Yosys documentation.',
  'Элемент схемы': 'Schematic element',
  'Это тип ячейки или имя вложенного модуля из нетлиста. Для него пока нет отдельного учебного описания.':
    'This is a cell type or the name of a nested module from the netlist. It has no dedicated learning description yet.',
  'Назначение определяют подключённые порты, параметры и исходный модуль. Откройте исходный код или официальную модель; по одному имени поведение не определяется.':
    'The purpose is determined by the connected ports, parameters and the source module. Open the source code or the official model; the behavior cannot be determined from the name alone.',
  'LUT — логическая таблица': 'LUT — lookup table',
  'Программируемая таблица истинности. Входы выбирают строку, а сохранённый бит становится выходом. LUT4 имеет 4 входа и 16 строк.':
    'A programmable truth table. The inputs select a row, and the stored bit becomes the output. A LUT4 has 4 inputs and 16 rows.',
  'FF — триггеры и регистры': 'FF — flip-flops and registers',
  'Хранят состояние между тактами. Один физический D-триггер хранит один бит; 8-битовый регистр обычно использует 8 триггеров.':
    'They store state between clock ticks. One physical D flip-flop stores one bit; an 8-bit register usually uses 8 flip-flops.',
  'На RTL-этапе эта группа также включает защёлки: они открыты по уровню разрешения, а не по фронту такта.':
    'At the RTL stage this group also includes latches: they are open by an enable level, not by a clock edge.',
  'ALU — арифметика': 'ALU — arithmetic',
  'Ресурсы для сложения, вычитания и переносов. В Gowin большая арифметическая операция собирается из нескольких небольших ALU-ячеек.':
    'Resources for addition, subtraction and carries. In Gowin a large arithmetic operation is built from several small ALU cells.',
  'BRAM — блочная память': 'BRAM — block memory',
  'Выделенные блоки памяти внутри FPGA. Подходят для буферов, таблиц, видеоданных и памяти программ. Ширина и глубина задают организацию слов.':
    'Dedicated memory blocks inside the FPGA. Good for buffers, tables, video data and program memory. Width and depth define how words are organized.',
  'RTL-память после синтеза может оказаться в BRAM, LUT или триггерах. RAM16S/RAM32S — распределённая память и в BRAM здесь не включаются.':
    'After synthesis, RTL memory may end up in BRAM, LUTs or flip-flops. RAM16S/RAM32S are distributed memory and are not counted as BRAM here.',
  'DSP — аппаратная арифметика': 'DSP — hardware arithmetic',
  'Выделенные блоки для умножения и других арифметических операций. Часто быстрее и экономнее логики для обработки сигналов.':
    'Dedicated blocks for multiplication and other arithmetic. Often faster and cheaper than logic for signal processing.',
  'I/O — входы и выходы': 'I/O — inputs and outputs',
  'Буферы, через которые логика FPGA общается с физическими выводами. Направление, напряжение и расположение задаются портами и файлом .cst.':
    'Buffers through which the FPGA logic talks to the physical pins. Direction, voltage and location are set by ports and the .cst file.',
  '// top.v: выход LED.\nassign led_n = ~button_pressed;\n// board.cst: LED0 на выводе микросхемы 15.\n// IO_LOC "led_n" 15;\n// IO_PORT "led_n" IO_TYPE=LVCMOS33;':
    '// top.v: the LED output.\nassign led_n = ~button_pressed;\n// board.cst: LED0 on chip pin 15.\n// IO_LOC "led_n" 15;\n// IO_PORT "led_n" IO_TYPE=LVCMOS33;',
  'Номер вывода FPGA отличается от номера контакта разъёма платы.':
    'The FPGA pin number differs from the pin number on the board connector.',
  'Другие элементы': 'Other elements',
  'Ячейки, которые не входят в показанные группы ресурсов: например, мультиплексоры, тактовые блоки и служебные элементы.':
    'Cells that are not part of the shown resource groups: for example multiplexers, clock blocks and helper elements.',
  'Категории описывают нетлист. Для точной загрузки физических ресурсов смотрите результат размещения во вкладке «Кристалл».':
    'The categories describe the netlist. For the exact use of physical resources, see the placement result in the “Chip” tab.',
  'Во вкладке RTL число показывает количество ячеек или операций этой группы. Один многобитовый RTL-регистр считается одной ячейкой; это ещё не число занятых физических триггеров.':
    'In the RTL tab the number shows the count of cells or operations in this group. One multi-bit RTL register counts as one cell; it is not yet the number of occupied physical flip-flops.',
  'Во вкладке Gowin число показывает ячейки после synth_gowin. После упаковки и размещения состав и занятые физические места могут измениться.':
    'In the Gowin tab the number shows cells after synth_gowin. After packing and placement the composition and the occupied physical sites may change.',
  'Смысл количества зависит от этапа: RTL-операции и физические примитивы имеют разный размер.':
    'The meaning of the count depends on the stage: RTL operations and physical primitives differ in size.',
  'Параметр элемента': 'Element parameter',
  'Постоянная настройка ячейки в нетлисте. Это не изменяющийся во времени сигнал. Значение задаёт синтезатор по исходному Verilog и настройкам.':
    'A constant setting of a cell in the netlist. It is not a signal that changes over time. The value is set by the synthesizer from the Verilog source and settings.',
  '0 означает беззнаковое число; 1 — число со знаком в дополнительном коде. Например, 3 бита без знака дают 0…7, со знаком — −4…3.':
    "0 means an unsigned number; 1 means a signed two's-complement number. For example, 3 bits unsigned give 0…7, signed give −4…3.",
  'Для обычных двоичных арифметических операций и сравнений Yosys использует знаковую обработку, когда оба операнда знаковые.':
    'For ordinary binary arithmetic operations and comparisons Yosys uses signed handling when both operands are signed.',
  'Ширина элемента': 'Element width',
  'wire [2:0] a; // 3 бита: a[2], a[1], a[0]': 'wire [2:0] a; // 3 bits: a[2], a[1], a[0]',
  'Для $pmux это число битов one-hot выбора и число блоков в B. Ширина B = WIDTH × S_WIDTH.':
    'For $pmux this is the number of bits of the one-hot select and the number of blocks in B. The width of B = WIDTH × S_WIDTH.',
  'У двоичного мультиплексора S_WIDTH битов выбора позволяют адресовать 2^S_WIDTH вариантов. У $pmux каждый бит выбирает свой вариант.':
    'For a binary multiplexer S_WIDTH select bits can address 2^S_WIDTH options. For $pmux each bit selects its own option.',
  'Если результат шире Y, старшие биты отбрасываются. Например, 7 + 1 в трёх битах даёт 0.':
    'If the result is wider than Y, the high bits are dropped. For example, 7 + 1 in three bits gives 0.',
  'Фронты такта портов памяти': 'Memory port clock edges',
  'Тактирование портов памяти': 'Memory port clocking',
  'Маска режимов памяти': 'Memory mode mask',
  'Это набор флагов по портам: бит 1 означает фронт ↑, бит 0 — спад ↓. Младший бит относится к порту 0. Полярность учитывается для портов с включённым тактированием.':
    'This is a set of per-port flags: bit 1 means edge ↑, bit 0 means fall ↓. The low bit belongs to port 0. Polarity is taken into account for ports with clocking enabled.',
  'Каждый бит относится к своему порту: 1 включает работу по такту, 0 — работу без тактового захвата. Младший бит соответствует порту 0.':
    'Each bit belongs to its own port: 1 enables clocked operation, 0 means operation without clock capture. The low bit corresponds to port 0.',
  'Несколько настроек памяти упакованы в битовую маску. Некоторые маски описывают пары портов — например, чтение при одновременной записи. Их разбиение зависит от числа портов и типа ячейки.':
    'Several memory settings are packed into a bit mask. Some masks describe pairs of ports, for example reading during a simultaneous write. How they split depends on the number of ports and the cell type.',
  "// Маска 2'b10: порт 0 — спад, порт 1 — фронт.":
    "// Mask 2'b10: port 0 is fall, port 1 is edge.",
  'Активный фронт такта': 'Active clock edge',
  '1 — запись на фронте CLK (0 → 1); 0 — запись на спаде CLK (1 → 0). Между фронтами триггер хранит состояние.':
    '1 — write on the CLK edge (0 → 1); 0 — write on the CLK fall (1 → 0). Between edges the flip-flop keeps its state.',
  '1 означает, что управляющий вход активен при высоком уровне; 0 — при низком. Так описывают, например, сброс от схемы, где активным считается низкий уровень.':
    '1 means the control input is active at a high level; 0 means at a low level. This describes, for example, a reset from a circuit where low is the active level.',
  "if (!reset_n) q <= '0; // сброс активен при 0": "if (!reset_n) q <= '0; // reset is active at 0",
  'Значение после сброса': 'Value after reset',
  'Значение, которое получает регистр при активном сбросе. Двоичные биты задают всё слово; это не длительность сброса.':
    'The value the register gets when the reset is active. The binary bits set the whole word; this is not the length of the reset.',
  "if (reset) q <= 3'b101; // значение сброса — 5":
    "if (reset) q <= 3'b101; // the reset value is 5",
  'Таблица истинности LUT': 'LUT truth table',
  'Каждый бит хранит результат для одной комбинации входов. Младший бит таблицы соответствует нулевому адресу. Значение удобно читать в шестнадцатеричном виде.':
    'Each bit stores the result for one combination of inputs. The low bit of the table corresponds to address zero. The value is easiest to read in hexadecimal.',
  "// LUT2 с INIT = 4'b1000 (0x8):\n// 00→0, 01→0, 10→0, 11→1: это AND.":
    "// LUT2 with INIT = 4'b1000 (0x8):\n// 00→0, 01→0, 10→0, 11→1: this is AND.",
  'Начальное значение': 'Initial value',
  'Задаёт начальное состояние регистра или памяти в модели. Для LUT INIT хранит таблицу истинности; значение зависит от типа ячейки.':
    'Sets the initial state of a register or memory in the model. For a LUT, INIT stores the truth table; the value depends on the cell type.',
  'Поддержка начальных значений в аппаратуре зависит от целевого примитива и инструмента.':
    'Support for initial values in hardware depends on the target primitive and the tool.',
  'Ширина адреса': 'Address width',
  'Количество битов адреса памяти. N адресных битов могут выбрать до 2^N слов; фактический размер задают другие параметры.':
    'The number of memory address bits. N address bits can select up to 2^N words; the actual size is set by other parameters.',
  'Число слов памяти': 'Number of memory words',
  'Количество адресуемых слов. WIDTH задаёт число битов в каждом слове; общий объём равен SIZE × WIDTH битов.':
    'The number of addressable words. WIDTH sets the number of bits in each word; the total size is SIZE × WIDTH bits.',
  'Начальная позиция': 'Start position',
  'Для $slice — номер младшего выбранного бита; для памяти — начальный адрес. Единица измерения зависит от типа ячейки.':
    'For $slice it is the number of the lowest selected bit; for memory it is the start address. The unit depends on the cell type.',
  'Аппаратный режим ALU': 'ALU hardware mode',
  'Выбирает операцию арифметической ячейки Gowin: это код режима, а не входные данные. Соответствие кодов операциям зависит от модели примитива.':
    'Selects the operation of a Gowin arithmetic cell: this is a mode code, not input data. How codes map to operations depends on the primitive model.',
  'Идентификатор памяти': 'Memory identifier',
  'Связывает отдельные порты чтения, записи и начальные данные с одной памятью во внутреннем представлении Yosys.':
    'Ties separate read ports, write ports and initial data to one memory in Yosys’s internal representation.',
  'Тактирование порта памяти': 'Memory port clocking',
  '1 означает, что порт работает по такту; 0 — без тактового захвата. Для порта чтения это различает синхронное и асинхронное чтение.':
    '1 means the port works on the clock; 0 means without clock capture. For a read port this distinguishes synchronous from asynchronous reading.',
  'Настройка портов памяти': 'Memory port settings',
  'Флаг или битовая маска режимов памяти. Несколько битов могут относиться к разным портам; читайте их вместе с типом ячейки и количеством портов.':
    'A flag or bit mask of memory modes. Several bits may belong to different ports; read them together with the cell type and the number of ports.',
  'Упакованная конфигурация': 'Packed configuration',
  'Несколько настроек упакованы в одну последовательность битов. Это значение нельзя читать как единственный флаг; разбиение зависит от типа ячейки.':
    'Several settings are packed into one bit sequence. This value cannot be read as a single flag; how it splits depends on the cell type.',
  'Yosys записывает параметры двоичными строками, старший бит слева. Начальные нули — часть записи, а не дополнительные провода входа.':
    'Yosys writes parameters as binary strings, high bit on the left. Leading zeros are part of the notation, not additional input wires.',
  'X — неизвестное значение, Z — высокое сопротивление. Такой набор битов нельзя перевести в одно определённое число.':
    'X is an unknown value, Z is high impedance. Such a set of bits cannot be converted into one definite number.',
  '1 бит': '1 bit',
  'порты {ports}{more}': 'ports {ports}{more}',
  'маска {hex}': 'mask {hex}',
  '{number} · ожидается 0 или 1': '{number} · expected 0 or 1',
  'при 1': 'at 1',
  'при 0': 'at 0',
  'Асинхронный сброс {when} устанавливает Q в {value}.':
    'An asynchronous reset {when} sets Q to {value}.',
  '{count} входа задают логическую функцию. У физических LUT4 таблица содержит 16 выходных битов; более широкие функции могут объединять несколько LUT и мультиплексоров.':
    '{count} inputs define the logic function. A physical LUT4 table holds 16 output bits; wider functions can combine several LUTs and multiplexers.',
  'Физический однобитовый триггер. Запоминает D на {edge} CLK; Q хранит этот бит.':
    'A physical one-bit flip-flop. It remembers D on the {edge} of CLK; Q holds that bit.',
  'спаде ↓': 'falling edge ↓',
  'фронте ↑': 'rising edge ↑',
  '{name} устанавливает Q в {value} {when}.': '{name} sets Q to {value} {when}.',
  'сразу, без такта': 'immediately, without a clock',
  'на активном фронте такта': 'on the active clock edge',
  'Применяет {title} отдельно к каждой паре битов A и B.':
    'Applies {title} separately to each pair of bits of A and B.',
  '{kind} сдвиг {direction}': '{kind} shift {direction}',
  Арифметический: 'Arithmetic',
  Логический: 'Logical',
  вправо: 'right',
  влево: 'left',
  'Однобитовый вентиль {kind}': 'One-bit {kind} gate',
  'Знаковость входа {port}': 'Signedness of input {port}',
  'Ширина {port}': 'Width of {port}',
  'Количество битов {what}. Например, 3 означает три параллельных провода, а не число 3 на входе.':
    'The number of bits {what}. For example, 3 means three parallel wires, not the number 3 on the input.',
  'шины {port}': 'of bus {port}',
  'данных элемента': 'of the element’s data',
  'Активный уровень {signal}': 'Active level of {signal}',
  'Справка: {subtitle}': 'Help: {subtitle}',
  'Что означает {subtitle}?': 'What does {subtitle} mean?',
  'Схемное обозначение: {title}': 'Schematic symbol: {title}',
  'пример: число из 3 битов': 'example: a 3-bit number',
  'Справка по схеме': 'Schematic help',
  'Параметр задаёт постоянную настройку': 'A parameter sets a constant setting',
  'Пример таблицы для двух входов: AND': 'Example table for two inputs: AND',
  'Условное обозначение · схема работы': 'Symbol · how it works',
  'Текущее значение': 'Current value',
  'Исходная запись Yosys': 'Original Yosys notation',
  Пример: 'Example',
  'Код поясняет операцию. Форма нетлиста после синтеза зависит от всей схемы.':
    'The code explains the operation. The shape of the netlist after synthesis depends on the whole circuit.',
  'Как читать схему': 'How to read the schematic',
  Понятно: 'Got it',
  'Открыть проект': 'Open project',
  'Мастерская примеров': 'Example workshop',
  'От первого вентиля до обработки сигналов и своего процессора':
    'From the first gate to signal processing and your own processor',
  'К выбору начала': 'Back to choosing a start',
  'Закрыть примеры': 'Close examples',
  'Уровни сложности': 'Difficulty levels',
  'Все уровни': 'All levels',
  'Найти пример': 'Find an example',
  'Название, тема или чему хотите научиться…': 'Name, topic or what you want to learn…',
  Тема: 'Topic',
  'Тема примеров': 'Example topic',
  'Все темы': 'All topics',
  'Выберите тему или изучайте примеры по учебному порядку.':
    'Pick a topic or go through the examples in learning order.',
  'Найдено: {count}': 'Found: {count}',
  'Примеры в учебном порядке': 'Examples in learning order',
  'Уровень {level}': 'Level {level}',
  '{count} файла': '{count} files',
  '1 файл': '1 file',
  'В этом сочетании примеров нет': 'No examples for this combination',
  'Измените тему, уровень или поисковый запрос.': 'Change the topic, the level or the search.',
  'Показать все примеры': 'Show all examples',
  'О выбранном примере': 'About the selected example',
  'Своя копия · Verilog и .cst': 'Your own copy · Verilog and .cst',
  'Чему научитесь': 'What you will learn',
  'Посмотрите на диаграммах': 'Look at the waveforms',
  'Попробуйте изменить': 'Try changing',
  'До этого полезно пройти': 'Useful to do first',
  'Можно начинать с этого примера.': 'You can start with this example.',
  'Уровень определяется нужными знаниями. Переходы к предыдущим примерам помогут заполнить пробелы.':
    'The level reflects the knowledge needed. Jumping to earlier examples helps fill the gaps.',
  'Не удалось получить состояние сборки.': 'Could not get the build status.',
  'Проверьте настройки проекта.': 'Check the project settings.',
  'Не удалось запустить синтез.': 'Could not start synthesis.',
  'Не удалось отменить сборку.': 'Could not cancel the build.',
  'Сервис сборки недоступен.': 'The build service is unavailable.',
  'Некорректное имя файла.': 'Invalid file name.',
  'Не удалось добавить схему.': 'Could not add the schematic.',
  'Не удалось восстановить файл.': 'Could not restore the file.',
  'Файл проекта превышает 3 МБ.': 'The project file is larger than 3 MB.',
  'Не удалось открыть проект.': 'Could not open the project.',
  'В папке слишком много файлов. Выберите папку одного проекта.':
    'The folder has too many files. Choose a folder with a single project.',
  'Не удалось открыть папку проекта.': 'Could not open the project folder.',
  'Не удалось открыть сохранённые проекты.': 'Could not open the saved projects.',
  'Не удалось сохранить проект.': 'Could not save the project.',
  'Сохранение текущего проекта недоступно.': 'Saving the current project is unavailable.',
  'Не удалось подключиться к серверу.': 'Could not connect to the server.',
  'Не удалось завершить сеанс.': 'Could not end the session.',
  'Исходник {file} отсутствует в текущем проекте.':
    'The source {file} is not in the current project.',
  'Помощник должен работать на http://127.0.0.1:3211 или http://localhost с локальным портом.':
    'The helper must run at http://127.0.0.1:3211 or http://localhost with a local port.',
  'Нужен текстовый битстрим Gowin .fs размером до 16 МБ.':
    'A text Gowin .fs bitstream up to 16 MB is required.',
  'Введите код подключения из окна локального помощника.':
    'Enter the connection code from the local helper window.',
  '[код скрыт]': '[code hidden]',
  'Запрос отменён.': 'The request was cancelled.',
  'Локальный помощник недоступен. Проверьте его запуск, разрешённый адрес приложения и доступ браузера к локальной сети.':
    'The local helper is unavailable. Check that it is running, the allowed app address and the browser’s access to the local network.',
  'Помощник вернул некорректный ответ.': 'The helper returned an invalid response.',
  'Код подключения не подходит. Возьмите актуальный код из окна помощника.':
    'The connection code is wrong. Take the current code from the helper window.',
  'Версия локального помощника несовместима с Logra.':
    'The local helper version is not compatible with Logra.',
  'Помощник вернул некорректный список плат.': 'The helper returned an invalid list of boards.',
  'Выберите плату и битстрим.': 'Choose a board and a bitstream.',
  'Не удалось создать идентификатор загрузки.': 'Could not create the load identifier.',
  'SHA-256 битстрима не совпадает. Выберите файл ещё раз.':
    'The SHA-256 of the bitstream does not match. Choose the file again.',
  'Ответ помощника относится к другой загрузке.':
    'The helper’s response belongs to a different load.',
  'Ответ на запрос загрузки недоступен.': 'The response to the load request is unavailable.',
  'Помощник вернул некорректный статус загрузки.': 'The helper returned an invalid load status.',
  'Серверная резервная копия недоступна. Подготовь установку заново.':
    'The server backup is unavailable. Prepare the install again.',
  'SHA-256 серверной резервной копии не совпал. Запись запрещена.':
    'The SHA-256 of the server backup did not match. Writing is forbidden.',
  'Не удалось сохранить резервную копию на сервере. Запись запрещена.':
    'Could not save the backup on the server. Writing is forbidden.',
  'Не удалось проверить копии этой платы на сервере.':
    'Could not check this board’s backups on the server.',
  'Некорректный список резервных копий.': 'Invalid list of backups.',
  'Серверная копия относится к другой flash.': 'The server backup belongs to a different flash.',
  'Резервная копия BL616 повреждена. Запись запрещена.':
    'The BL616 backup is corrupted. Writing is forbidden.',
  'Браузер не поддерживает сохранение резервной копии. Установка запрещена.':
    'The browser does not support saving a backup. The install is forbidden.',
  'Не удалось открыть хранилище резервных копий BL616.': 'Could not open the BL616 backup storage.',
  'Другая вкладка блокирует хранилище. Закрой её перед установкой.':
    'Another tab is blocking the storage. Close it before installing.',
  'Резервная копия не сохранена. Проверь свободное место в браузере. Запись запрещена.':
    'The backup was not saved. Check the free space in the browser. Writing is forbidden.',
  'Не удалось перечитать сохранённую копию.': 'Could not read back the saved backup.',
  'Не удалось прочитать резервную копию.': 'Could not read the backup.',
  'Не удалось перечитать резервную копию перед записью.':
    'Could not read the backup back before writing.',
  'Некорректный комплект прошивки.': 'Invalid firmware bundle.',
  'Неизвестный образ прошивки.': 'Unknown firmware image.',
  'SHA-256 пакета прошивки не совпал. Установка запрещена.':
    'The SHA-256 of the firmware package did not match. The install is forbidden.',
  'Неподдерживаемый размер образа.': 'Unsupported image size.',
  'Имя файла должно сохранить вид bl616-<плата>-<SHA-256>.bin: по нему проверяется содержимое.':
    'The file name must keep the form bl616-<board>-<SHA-256>.bin: it is used to verify the content.',
  'Размер файла не соответствует flash BL616.': 'The file size does not match the BL616 flash.',
  'SHA-256 файла не совпал с именем. Копия повреждена или переименована.':
    'The SHA-256 of the file did not match its name. The backup is damaged or renamed.',
  'Размер файла отличается от flash этой платы.': 'The file size differs from this board’s flash.',
  'Для этой платы нет отличающейся исходной копии. Восстановление не требуется.':
    'There is no differing original backup for this board. No restore is needed.',
  'Резервная копия относится к другой flash.': 'The backup belongs to a different flash.',
  'Выбранная прошивка уже записана. Переподключи USB обычным способом.':
    'The selected firmware is already written. Replug USB in the usual way.',
  'Неизвестный режим установки.': 'Unknown install mode.',
  'Исходная копия относится к другой плате.': 'The original backup belongs to a different board.',
  'Выбрана другая плата. Подготовь установку заново.':
    'A different board was selected. Prepare the install again.',
  'Установка DirtyJTAG': 'Installing DirtyJTAG',
  'Восстановление исходной прошивки': 'Restoring the original firmware',
  'Вся flash проверена SHA-256. Переподключи USB без UPDATE.':
    'The whole flash was verified with SHA-256. Replug USB without UPDATE.',
  'Команда не входит в протокол установки BL616.':
    'This command is not part of the BL616 install protocol.',
  'Некорректный таймаут BL616.': 'Invalid BL616 timeout.',
  'Выбери порт Bouffalo CDC в режиме UPDATE/BOOT.':
    'Choose the Bouffalo CDC port in UPDATE/BOOT mode.',
  'У ROM-порта нет потоков чтения и записи.': 'The ROM port has no read and write streams.',
  'Handshake штатного ROM…': 'Handshake with the stock ROM…',
  'BL616 не подтвердил команду.': 'The BL616 did not acknowledge the command.',
  'Эта ревизия или режим защиты BL616 пока не проверены для данного пакета. Запись не началась.':
    'This BL616 revision or protection mode has not been verified for this package. Writing did not start.',
  'Пакет рассчитан на внутреннюю flash BL616 Tang Nano 20K.':
    'The package is designed for the internal flash of the BL616 on the Tang Nano 20K.',
  'Параметры flash SDK повреждены. Запись запрещена.':
    'The SDK flash parameters are damaged. Writing is forbidden.',
  'Идентификатор flash изменился после настройки SDK. Запись запрещена.':
    'The flash identifier changed after the SDK setup. Writing is forbidden.',
  'Неподдерживаемая ёмкость flash BL616.': 'Unsupported BL616 flash capacity.',
  'BL616 не проверен.': 'The BL616 is not verified.',
  'Сессия BL616 закрыта. Переподключи плату в BOOT.':
    'The BL616 session is closed. Replug the board in BOOT.',
  'BL616 не ответил вовремя. Команда не повторяется; для восстановления переподключи плату в BOOT.':
    'The BL616 did not respond in time. The command is not repeated; to recover, replug the board in BOOT.',
  'передача в порт не завершилась': 'the port transfer did not finish',
  'Плата отключена до окончания операции. Верни её в BOOT для восстановления.':
    'The board was unplugged before the operation finished. Put it back in BOOT to recover.',
  'Некорректный ответ BL616.': 'Invalid BL616 response.',
  'Стираем выбранный сектор…': 'Erasing the selected sector…',
  'Истекло время стирания сектора BL616.': 'The BL616 sector erase timed out.',
  'очистка входа': 'input flush',
  'ROM не завершил handshake.': 'The ROM did not finish the handshake.',
  'ROM продолжает отдавать данные handshake.': 'The ROM keeps sending handshake data.',
  'Другая команда BL616 ещё выполняется.': 'Another BL616 command is still running.',
  'Повторные ответы ROM.': 'Repeated ROM responses.',
  'Неподдерживаемая длина ответа BL616.': 'Unsupported BL616 response length.',
  'Тактирование ROM': 'ROM clocking',
  'Стирание сектора': 'Sector erase',
  'Запись flash': 'Flash write',
  'Чтение flash': 'Flash read',
  'Проверка записи': 'Write verification',
  'Настройка flash': 'Flash setup',
  'Диапазон выходит за flash отладчика.': 'The range is outside the debugger flash.',
  'Резервная копия BL616': 'BL616 backup',
  'Неполное чтение flash. Запись запрещена.': 'Incomplete flash read. Writing is forbidden.',
  'SHA-256 записанной flash не совпал. Верни BOOT и восстанови резервную копию.':
    'The SHA-256 of the written flash did not match. Put the board back in BOOT and restore the backup.',
  'Разрешена запись только полных секторов 4096 байт.':
    'Only writing of full 4096-byte sectors is allowed.',
  'Некорректная резервная копия.': 'Invalid backup.',
  'Недопустимые или пересекающиеся образы.': 'Invalid or overlapping images.',
  'Некорректный размер команды JTAG.': 'Invalid JTAG command size.',
  'Неполная команда JTAG.': 'Incomplete JTAG command.',
  'Некорректное число битов JTAG.': 'Invalid JTAG bit count.',
  'Некорректное число тактов TMS.': 'Invalid TMS clock count.',
  'Многобитное чтение TMS не используется сканером Gowin.':
    'Multi-bit TMS reads are not used by the Gowin scanner.',
  'Нужен адаптер DirtyJTAG (1209:c0ca).': 'A DirtyJTAG adapter (1209:c0ca) is required.',
  'Не найден однозначный JTAG-интерфейс DirtyJTAG v2. UART-интерфейсы не используются.':
    'No unambiguous DirtyJTAG v2 JTAG interface found. UART interfaces are not used.',
  'Некорректный таймаут DirtyJTAG.': 'Invalid DirtyJTAG timeout.',
  'USB-сессия уже открыта. Выберите плату заново.':
    'The USB session is already open. Choose the board again.',
  открытие: 'opening',
  конфигурация: 'configuration',
  'захват DirtyJTAG': 'claiming DirtyJTAG',
  'Адаптер не подтвердил DirtyJTAG v2.': 'The adapter did not confirm DirtyJTAG v2.',
  'Сессия DirtyJTAG недоступна. Переподключите плату.':
    'The DirtyJTAG session is unavailable. Replug the board.',
  'Операция DirtyJTAG уже выполняется.': 'A DirtyJTAG operation is already running.',
  'Слишком большой ответ DirtyJTAG.': 'The DirtyJTAG response is too large.',
  'Некорректный размер ответа JTAG.': 'Invalid JTAG response size.',
  'Неполный ответ JTAG.': 'Incomplete JTAG response.',
  'Пакет DirtyJTAG превышает 64 байта.': 'The DirtyJTAG packet exceeds 64 bytes.',
  передача: 'transfer',
  'Неполная передача DirtyJTAG. Повтор команды запрещён.':
    'Incomplete DirtyJTAG transfer. Repeating the command is forbidden.',
  чтение: 'read',
  'Повреждённый ответ DirtyJTAG.': 'Corrupted DirtyJTAG response.',
  'Истекло время чтения DirtyJTAG.': 'The DirtyJTAG read timed out.',
  'Неожиданная длина ответа DirtyJTAG.': 'Unexpected DirtyJTAG response length.',
  'DirtyJTAG не закрыл USB. Переподключите плату.':
    'DirtyJTAG did not release USB. Replug the board.',
  освобождение: 'release',
  'Дождитесь окончания операции DirtyJTAG.': 'Wait for the DirtyJTAG operation to finish.',
  'Нужен USB-программатор Tang Nano 20K (0403:6010).':
    'A Tang Nano 20K USB programmer (0403:6010) is required.',
  'USB interface A имеет неоднозначное описание.': 'USB interface A has an ambiguous description.',
  'Не найден единственный vendor bulk interface A для JTAG. Интерфейс UART не используется.':
    'No single vendor bulk interface A found for JTAG. The UART interface is not used.',
  'Некорректный размер пакета FTDI.': 'Invalid FTDI packet size.',
  'Неполный пакет FTDI: отсутствуют два байта статуса.':
    'Incomplete FTDI packet: the two status bytes are missing.',
  'таймаут USB': 'USB timeout',
  'таймаут чтения': 'read timeout',
  'размер чтения': 'read size',
  'USB-сессия уже открыта или использована. Подключите плату заново.':
    'The USB session is already open or was used. Plug the board in again.',
  'открытие USB': 'opening USB',
  'выбор USB-конфигурации': 'selecting the USB configuration',
  'захват JTAG interface A': 'claiming JTAG interface A',
  'выбор JTAG alternate': 'selecting the JTAG alternate',
  'Программатор не подтвердил режим MPSSE. Переподключите USB платы.':
    'The programmer did not confirm MPSSE mode. Replug the board’s USB.',
  'Дождитесь завершения USB-операции перед отключением.':
    'Wait for the USB operation to finish before unplugging.',
  'USB-сессия недоступна. Подключите плату заново.':
    'The USB session is unavailable. Plug the board in again.',
  'Другая USB-операция уже выполняется.': 'Another USB operation is already running.',
  'Неподдерживаемый размер MPSSE-команды.': 'Unsupported MPSSE command size.',
  'запись USB': 'USB write',
  'чтение USB': 'USB read',
  'USB вернул повреждённый пакет или ошибку чтения.':
    'USB returned a corrupted packet or a read error.',
  'настройка FTDI': 'FTDI setup',
  'FTDI не принял управляющий запрос.': 'FTDI did not accept the control request.',
  'чтение задержки FTDI': 'reading the FTDI latency',
  'Не удалось прочитать исходную задержку FTDI.': 'Could not read the original FTDI latency.',
  'закрытие USB': 'closing USB',
  'Ошибка отключения USB.': 'USB disconnect error.',
  'освобождение JTAG interface A': 'releasing JTAG interface A',
  'Некорректные уровни JTAG.': 'Invalid JTAG levels.',
  'Эта команда FPGA не разрешена.': 'This FPGA command is not allowed.',
  'Неполный ответ регистра JTAG.': 'Incomplete JTAG register response.',
  'Поток конфигурации пуст.': 'The configuration stream is empty.',
  'Сначала требуется проверить модель FPGA.': 'The FPGA model must be verified first.',
  'Операция JTAG уже выполняется.': 'A JTAG operation is already running.',
  'Ожидается одна Tang Nano 20K с JTAG ID 0x0000081B. Запись не начата.':
    'Exactly one Tang Nano 20K with JTAG ID 0x0000081B is expected. Writing did not start.',
  'JTAG ID изменился после проверки цепочки.': 'The JTAG ID changed after the chain check.',
  'выход из конфигурации': 'leaving configuration',
  'Проверка FPGA': 'FPGA check',
  'FPGA сообщает ошибку конфигурации. Переподключите питание платы.':
    'The FPGA reports a configuration error. Power-cycle the board.',
  'Подготовка SRAM': 'SRAM preparation',
  'включение конфигурации': 'enabling configuration',
  'очистка SRAM': 'clearing SRAM',
  'Передача битстрима превысила три минуты. Переподключите плату.':
    'The bitstream transfer took more than three minutes. Replug the board.',
  'Передача битстрима': 'Bitstream transfer',
  'Проверка результата': 'Result check',
  'завершение конфигурации': 'finishing configuration',
  'UserCode FPGA отличается от выбранного битстрима.':
    'The FPGA UserCode differs from the selected bitstream.',
  'В папке не нашлось файлов Verilog (.v или .sv).':
    'No Verilog files (.v or .sv) found in the folder.',
  'В исходниках не найден ни один модуль Verilog.': 'No Verilog module found in the sources.',
  'Модуль с входом и выходом': 'Module with an input and an output',
  'Непрерывное присваивание комбинационной логики': 'Continuous assignment of combinational logic',
  'Регистр со сбросом по активному нулю': 'Register with an active-low reset',
  'Комбинационная логика с значением по умолчанию': 'Combinational logic with a default value',
  'Выбор одной ветки с default': 'Choosing one branch with default',
  'Ключевое слово Verilog / SystemVerilog': 'Verilog / SystemVerilog keyword',
  'Связать сигнал с физическим выводом FPGA': 'Tie a signal to a physical FPGA pin',
  'Электрические свойства вывода': 'Electrical properties of a pin',
  'Тактовый буфер': 'Clock buffer',
  'Ошибка помощника: {response}': 'Helper error: {response}',
  'Пакет прошивки недоступен ({status}).': 'The firmware package is unavailable ({status}).',
  'Файл относится к плате {file}, подключена {flash}.':
    'The file belongs to board {file}, but board {flash} is connected.',
  '# … пропущено строк: {dropped}': '# … lines skipped: {dropped}',
  'ROM уже в командном режиме (FL 0x{bytesHex}); handshake не требуется':
    'The ROM is already in command mode (FL 0x{bytesHex}); no handshake needed',
  'ROM не подтвердил параметры flash (JEDEC: {bytesHex}, pin: {pin}). Запись не началась.':
    'The ROM did not confirm the flash parameters (JEDEC: {bytesHex}, pin: {pin}). Writing did not start.',
  'ROM {boot} sign={boot2} encrypt={boot3} chip={boot4} jedec={bytesHex} pin={pin} параметры: {parameterSource}':
    'ROM {boot} sign={boot2} encrypt={boot3} chip={boot4} jedec={bytesHex} pin={pin} parameters: {parameterSource}',
  'Сессия не открыта: {error}': 'The session is not open: {error}',
  'BL616 вернул FL 0x{bytesHex}. Запись остановлена.':
    'The BL616 returned FL 0x{bytesHex}. Writing stopped.',
  'ОШИБКА {message}': 'ERROR {message}',
  'Неподдерживаемая команда JTAG 0x{opcode}.': 'Unsupported JTAG command 0x{opcode}.',
  'Нет ответа DirtyJTAG: {label}. Переподключите USB; повтор команды запрещён.':
    'No DirtyJTAG response: {label}. Replug USB; repeating the command is forbidden.',
  'Неполная запись USB ({result}/{bytes}); повтор команды запрещён.':
    'Incomplete USB write ({result}/{bytes}); repeating the command is forbidden.',
  'Истекло время чтения USB ({copied}/{length} байт).':
    'USB read timed out ({copied}/{length} bytes).',
  'Истекло время операции «{label}». Переподключите плату; повтор USB-команды запрещён.':
    'The operation “{label}” timed out. Replug the board; repeating the USB command is forbidden.',
  'Некорректный {label}.': 'Invalid {label}.',
  'Ошибка FPGA: 0x{status} ({label}).': 'FPGA error: 0x{status} ({label}).',
  'FPGA не завершила этап «{label}».': 'The FPGA did not finish the step “{label}”.',
  'В проекте {named} файлов, а Logra принимает не больше {MAX_FILES}. Уберите из папки лишнее.':
    'The project has {named} files, and Logra accepts at most {MAX_FILES}. Remove the extras from the folder.',
  'Слишком длинное объявление {name} в VCD.': 'The declaration {name} in the VCD is too long.',
  'В VCD не завершено объявление {name}: отсутствует $end.':
    'The declaration {name} in the VCD is not finished: $end is missing.',
  'Идентификатор {id} в VCD используется для разных типов сигналов.':
    'The identifier {id} is used for different signal types in the VCD.',
  'Сигналы типа {type} пропущены: просмотр поддерживает цифровые значения 0, 1, X и Z.':
    'Signals of type {type} were skipped: the viewer supports digital values 0, 1, X and Z.',
  'Некорректная разрядность сигнала {name} в VCD.': 'Invalid width of signal {name} in the VCD.',
  'Разрядность сигнала {name} должна быть от 1 до 4096 бит.':
    'The width of signal {name} must be from 1 to 4096 bits.',
  'Псевдонимы сигнала {id} в VCD имеют разную разрядность.':
    'Aliases of signal {id} in the VCD have different widths.',
  'Повторное объявление сигнала {scope} пропущено.':
    'The repeated declaration of signal {scope} was skipped.',
  'Неизвестное объявление VCD {token} пропущено.':
    'The unknown VCD declaration {token} was skipped.',
  'Некорректный заголовок VCD возле «{token}».': 'Invalid VCD header near “{token}”.',
  'Изменения необъявленного сигнала «{id}» пропущены.':
    'Changes of the undeclared signal “{id}” were skipped.',
  'Вещественное или строковое значение цифрового сигнала «{id}» пропущено.':
    'A real or string value of the digital signal “{id}” was skipped.',
  'Значения сигнала «{id}» шире объявления; сохранены младшие {data} бит.':
    'The values of signal “{id}” are wider than declared; the low {data} bits were kept.',
  'Некорректная отметка времени VCD «{token}».': 'Invalid VCD timestamp “{token}”.',
  'В VCD не завершена команда {dumpDirective}: отсутствует $end.':
    'The command {dumpDirective} in the VCD is not finished: $end is missing.',
  'Неизвестная команда VCD {token} пропущена.': 'The unknown VCD command {token} was skipped.',
  'Некорректное двоичное значение VCD «{token}».': 'Invalid binary VCD value “{token}”.',
  'Некорректная запись изменения VCD «{token}».': 'Invalid VCD change record “{token}”.',
  'Файл VCD пуст.': 'The VCD file is empty.',
  'Файл VCD слишком большой: лимит 32 млн символов.':
    'The VCD file is too large: the limit is 32 million characters.',
  'Остальные предупреждения VCD опущены.': 'The remaining VCD warnings were omitted.',
  'Некорректное $enddefinitions в VCD.': 'Invalid $enddefinitions in the VCD.',
  'Некорректный масштаб времени VCD. Пример: $timescale 1 ns $end.':
    'Invalid VCD time scale. Example: $timescale 1 ns $end.',
  'Масштаб времени VCD нельзя точно представить в фемтосекундах.':
    'The VCD time scale cannot be represented exactly in femtoseconds.',
  'В VCD несколько масштабов времени; используется последний.':
    'The VCD has several time scales; the last one is used.',
  'Некорректное объявление области $scope в VCD.': 'Invalid $scope declaration in the VCD.',
  'Слишком глубокая иерархия VCD: лимит 128 уровней.':
    'The VCD hierarchy is too deep: the limit is 128 levels.',
  'Имена областей VCD слишком длинные для просмотра.': 'The VCD scope names are too long to view.',
  'Некорректное закрытие области $upscope в VCD.': 'Invalid $upscope closing in the VCD.',
  'Неполное объявление сигнала $var в VCD.': 'Incomplete $var signal declaration in the VCD.',
  'Слишком много сигналов VCD: лимит 4096 объявлений.':
    'Too many VCD signals: the limit is 4096 declarations.',
  'Слишком длинное имя или идентификатор сигнала VCD.':
    'The VCD signal name or identifier is too long.',
  'В VCD отсутствует $enddefinitions: заголовок не завершён.':
    'The VCD has no $enddefinitions: the header is not finished.',
  'В VCD нет объявлений сигналов $var.': 'The VCD has no $var signal declarations.',
  'Области $scope в заголовке VCD закрыты не полностью.':
    'The $scope scopes in the VCD header are not all closed.',
  'В VCD нет $timescale; для отображения принят шаг 1 нс.':
    'The VCD has no $timescale; a 1 ns step is assumed for display.',
  'Слишком много изменений в VCD: лимит 1 млн записей.':
    'Too many changes in the VCD: the limit is 1 million records.',
  'VCD содержит слишком много данных: лимит 64 млн сохранённых двоичных разрядов.':
    'The VCD contains too much data: the limit is 64 million stored binary bits.',
  'Отметка времени VCD превышает предел точных целых чисел.':
    'The VCD timestamp exceeds the limit of exact integers.',
  'Отметки времени VCD должны идти по возрастанию.': 'VCD timestamps must be increasing.',
  'В VCD встретился $end без открытой команды изменения значений.':
    'A $end in the VCD has no open value-change command.',
  'В VCD отсутствует идентификатор после двоичного значения.':
    'The VCD has no identifier after a binary value.',
  'В VCD отсутствует идентификатор после real/string значения.':
    'The VCD has no identifier after a real/string value.',
  'Сервис сборки недоступен: {error}': 'The build service is unavailable: {error}',
  'Связь со сборкой прервана: {error} Повторяем подключение…':
    'The connection to the build service was lost: {error} Reconnecting…',
  'Не удалось сохранить проект в браузере.': 'Could not save the project in the browser.',
  'Закрыть сообщение': 'Close message',
  'Похоже, это копия': 'This looks like a copy',
  'Это копия': 'This is a copy',
  '{prefix} примера «{title}», а в библиотеке пример с тех пор исправлен. Ваш проект не изменён.':
    '{prefix} of the example “{title}”, and the example in the library has been fixed since. Your project is unchanged.',
  'Открыть свежую копию': 'Open a fresh copy',
  'Скрыть напоминание об обновлении примера': 'Hide the example update reminder',
  'Файл {name} удалён.': 'The file {name} was deleted.',
  'Закрыть сообщение об удалении': 'Close the deletion message',
  Наставник: 'Mentor',
  'Вернуться к уроку': 'Back to the lesson',
  'Скрыть наставника': 'Hide the mentor',
  'Проект миссии не найден в библиотеке.': 'The mission project was not found in the library.',
  'Открываем рабочую область…': 'Opening the workspace…',
  'Рабочая область временных диаграмм': 'Timing waveforms workspace',
  Лаборатория: 'Lab',
  'Рабочая область кристалла': 'Chip workspace',
  'Интерактивное обучение': 'Interactive learning',
  'Подключение платы': 'Board connection',
  'Закрыть дерево файлов': 'Close the file tree',
  'Дождитесь окончания синтеза.': 'Wait for synthesis to finish.',
  'В папке несколько проектов': 'The folder has several projects',
  'Выберите, какой открыть. Каждый проект — это отдельный файл .gprj.':
    'Choose which one to open. Each project is a separate .gprj file.',
  'Гость этого браузера': 'Guest of this browser',
  'Неожиданный размер ответа BootInfo BL616.': 'Unexpected size of the BL616 BootInfo response.',
  'На порту уже исполняется загрузчик; это не ответ ROM. Войдите в UPDATE заново.':
    'A bootloader is already running on the port; this is not a ROM response. Enter UPDATE again.',
  'Некорректный ответ BootInfo.': 'Invalid BootInfo response.',
  'Некорректный таймаут ROM.': 'Invalid ROM timeout.',
  'Нужен порт загрузчика Bouffalo. Обычные USB Debugger COM9/COM11 относятся к FTDI, а не ROM.':
    'A Bouffalo bootloader port is required. The ordinary USB Debugger COM9/COM11 belong to FTDI, not the ROM.',
  отправка: 'sending',
  'Порт ROM отключён до окончания ответа.':
    'The ROM port was disconnected before the response finished.',
  'Порт вернул слишком много данных для BootInfo.': 'The port returned too much data for BootInfo.',
  'Не получен ответ OK от ROM.': 'No OK response received from the ROM.',
  'ROM-порт отключён после handshake.': 'The ROM port was disconnected after the handshake.',
  'Неожиданный поток данных от ROM во время handshake.':
    'Unexpected data stream from the ROM during the handshake.',
  'ROM не завершил handshake. Переподключите USB.':
    'The ROM did not finish the handshake. Replug USB.',
  'Открываем ROM-порт…': 'Opening the ROM port…',
  'открытие порта': 'opening the port',
  'ROM-порт не предоставляет чтение и запись.':
    'The ROM port does not provide reading and writing.',
  'Проверяем ответ ROM…': 'Checking the ROM response…',
  'Читаем BootInfo…': 'Reading BootInfo…',
  'Слишком много повторных OK от ROM.': 'Too many repeated OKs from the ROM.',
  'закрытие потоков': 'closing the streams',
  'закрытие порта': 'closing the port',
  'Нет ответа ROM: {stage}. Проверьте режим UPDATE и переподключите USB.':
    'No ROM response: {stage}. Check UPDATE mode and replug USB.',
  'ROM вернул FL, код 0x{hex}.': 'The ROM returned FL, code 0x{hex}.',
  'Неожиданная длина BootInfo: {length}.': 'Unexpected BootInfo length: {length}.',
  'Не удалось открыть {name}': 'Could not open {name}',
  'Исходники проекта сохранены отдельно. Можно повторить открытие рабочей области.':
    'The project sources are saved separately. You can try opening the workspace again.',
  'Попробовать ещё раз': 'Try again',
  'Масштаб: {label}': 'Zoom: {label}',
  'Уменьшить масштаб': 'Zoom out',
  'Текущий масштаб': 'Current zoom',
  'Увеличить масштаб': 'Zoom in',
  'Показать целиком': 'Fit to view',
  'Колесо — масштаб · фон — перемещение · 0 — целиком':
    'Wheel: zoom · background: pan · 0: fit to view',
  редактор: 'editor',
  'ПЛИС (FPGA)': 'FPGA (field-programmable gate array)',
  'Микросхема, внутри которой много одинаковых «кубиков». Ты сам решаешь, как их соединить, и она становится нужным устройством.':
    'A chip with lots of identical “building blocks” inside. You decide how to connect them, and it becomes the device you need.',
  'Как набор конструктора: из одних и тех же деталей можно собрать и машину, и дом. Одна ПЛИС может стать и счётчиком, и светофором.':
    'Like a construction set: the same parts can be built into a car or a house. One FPGA can become a counter or a traffic light.',
  Бит: 'Bit',
  'Одна ячейка информации. В ней может быть только 0 или 1.':
    'One cell of information. It can hold only 0 or 1.',
  'Как выключатель: либо выключен (0), либо включён (1).':
    'Like a switch: either off (0) or on (1).',
  'Логический элемент (вентиль)': 'Logic gate',
  'Крошечная схема, которая по одному или нескольким битам на входе выдаёт один бит.':
    'A tiny circuit that takes one or several input bits and produces one bit.',
  'Как правило в игре: «если обе кнопки нажаты, то лампа горит».':
    'Like a rule in a game: “if both buttons are pressed, the lamp lights”.',
  'Язык, на котором описывают цифровые схемы. Это не программа, которая выполняется по порядку, а описание деталей и проводов.':
    'A language for describing digital circuits. It is not a program that runs step by step, but a description of parts and wires.',
  'Скорее чертёж, чем рецепт: он говорит, что с чем соединено.':
    'More a blueprint than a recipe: it says what is connected to what.',
  Модуль: 'Module',
  'Блок схемы со своими входами и выходами. Из модулей собирают более крупные схемы.':
    'A block of a circuit with its own inputs and outputs. Larger circuits are built from modules.',
  'Как деталь конструктора с разъёмами по краям.':
    'Like a construction piece with connectors on its edges.',
  'Вход или выход модуля: «разъём», через который сигнал попадает в блок или выходит.':
    'An input or output of a module: a “socket” through which a signal enters or leaves the block.',
  Симуляция: 'Simulation',
  'Проверка схемы на компьютере: он «играет» роль платы и показывает, что бы произошло.':
    'Checking a circuit on a computer: it plays the role of the board and shows what would happen.',
  'Как примерка в приложении: проверяем, не покупая настоящую вещь.':
    'Like trying something on in an app: we check without buying the real thing.',
  'Превращение текста на Verilog в список «кубиков» ПЛИС и соединений между ними. Его делает программа Yosys.':
    'Turning Verilog text into a list of FPGA “blocks” and the connections between them. It is done by the Yosys program.',
  'Как перевод рецепта в список покупок и порядок готовки.':
    'Like turning a recipe into a shopping list and a cooking order.',
  'Схема, нарисованная прямо по твоему тексту: логические элементы, регистры и провода. Она ещё не привязана к настоящей микросхеме.':
    'A schematic drawn straight from your text: logic gates, registers and wires. It is not yet tied to a real chip.',
  Нетлист: 'Netlist',
  'Список всех деталей схемы и того, что с чем соединено.':
    'A list of all the parts of a circuit and what is connected to what.',
  'Маленькая таблица ответов: для каждой комбинации входов в ней записано, 0 или 1 выдать. Из таких таблиц ПЛИС собирает логику.':
    'A small answer table: for every combination of inputs it records whether to output 0 or 1. The FPGA builds its logic from such tables.',
  'Как шпаргалка с готовыми ответами: смотришь строку и сразу видишь результат.':
    'Like a cheat sheet with ready answers: you look up the row and see the result at once.',
  'Триггер и регистр': 'Flip-flop and register',
  'Ячейка памяти на один бит: запоминает 0 или 1 и хранит, пока не придёт такт. Регистр — несколько триггеров рядом.':
    'A one-bit memory cell: it remembers 0 or 1 and keeps it until the clock arrives. A register is several flip-flops side by side.',
  'Как записная ячейка: пишешь число, и оно лежит там, пока не перепишешь.':
    'Like a notebook cell: you write a number and it stays there until you overwrite it.',
  Такт: 'Clock',
  'Ровное «тик-тик-тик»: сигнал, который снова и снова меняется 0 → 1 → 0. По нему обновляется вся память схемы.':
    'An even “tick-tick-tick”: a signal that keeps changing 0 → 1 → 0. All the memory in the circuit updates on it.',
  'Как дирижёр: все музыканты вступают по его взмаху.':
    'Like a conductor: all the musicians come in on his signal.',
  Фронт: 'Edge',
  'Момент, когда сигнал меняется. Положительный фронт (posedge) — переход из 0 в 1, отрицательный — из 1 в 0.':
    'The moment a signal changes. A positive edge (posedge) is a change from 0 to 1, a negative edge is from 1 to 0.',
  'Как щелчок выключателя: важен сам момент щелчка.':
    'Like the click of a switch: the moment of the click is what matters.',
  Шина: 'Bus',
  'Несколько проводов под одним именем. Например, led[5:0] — это шесть проводов.':
    'Several wires under one name. For example, led[5:0] is six wires.',
  'Как кабель из нескольких жил.': 'Like a cable with several cores.',
  Разрядность: 'Width',
  'Сколько бит в сигнале. В 4 битах помещаются числа от 0 до 15.':
    'How many bits are in a signal. 4 bits hold numbers from 0 to 15.',
  'Активный уровень': 'Active level',
  'Какой уровень «включает» устройство. Если включает 0, уровень называют активным низким. Светодиоды на плате Tang Nano 20K горят при 0.':
    'Which level “turns on” a device. If 0 turns it on, the level is called active low. The LEDs on the Tang Nano 20K board light at 0.',
  'Как лампочка, которая светится, когда ток «стекает» в землю через вывод.':
    'Like a lamp that glows when current “drains” to ground through the pin.',
  'Комбинационная логика': 'Combinational logic',
  'Схема без памяти: выход зависит только от того, что на входах прямо сейчас.':
    'A circuit with no memory: the output depends only on what is on the inputs right now.',
  'Лампочка и выключатель: щёлкнул, и лампа тут же отреагировала.':
    'A lamp and a switch: you flick it, and the lamp reacts at once.',
  'Последовательная логика': 'Sequential logic',
  'Схема с памятью: выход зависит не только от входов, но и от того, что было раньше.':
    'A circuit with memory: the output depends not only on the inputs but also on what happened before.',
  'Счётчик шагов в телефоне: он помнит, сколько уже прошли.':
    'A step counter in a phone: it remembers how far you have walked.',
  Тестбенч: 'Testbench',
  'Программа-проверяльщик: подаёт на твою схему входы и смотрит, что получилось. В обучении мы запускаем её за тебя.':
    'A checker program: it feeds inputs to your circuit and looks at the result. In the course we run it for you.',
  'Как экзаменатор, который задаёт вопросы и сверяет ответы.':
    'Like an examiner who asks questions and checks the answers.',
  'Переключатель сигналов: по выбору пропускает на выход один из нескольких входов.':
    'A signal switch: it passes one of several inputs to the output, as selected.',
  'Стрелка на железной дороге: решает, по какому пути поедет сигнал.':
    'Like a railway switch: it decides which track the signal takes.',
  Дешифратор: 'Decoder',
  'Превращает число в «включи одну линию». Число 2 включает только третью лампу из ряда.':
    'Turns a number into “turn on one line”. The number 2 turns on only the third lamp in a row.',
  'Автомат состояний': 'State machine',
  'Схема, которая в каждый момент находится в одном из нескольких состояний и переходит между ними по правилам.':
    'A circuit that is in one of several states at any moment and moves between them by rules.',
  'Светофор: красный → зелёный → жёлтый → красный.': 'A traffic light: red → green → yellow → red.',
  'Файл-«карта проводов». В нём записано, какой порт твоей схемы подключён к какой ножке микросхемы.':
    'A “wire map” file. It records which port of your circuit is connected to which pin of the chip.',
  'Вывод (пин)': 'Pin',
  'Металлическая ножка микросхемы. К ней на плате подключены светодиод, кнопка или разъём.':
    'A metal leg of the chip. On the board an LED, a button or a connector is attached to it.',
  Битстрим: 'Bitstream',
  'Файл-прошивка: готовая настройка всех «кубиков» ПЛИС. Его загружают на плату.':
    'A firmware file: a ready setting of all the FPGA “blocks”. It is loaded onto the board.',
  "Запись числа 4'b1010": "Writing the number 4'b1010",
  "Число, записанное вместе с шириной и системой счисления. 4'b1010: «4 бита, двоичное, 1010». 6'd5: «6 бит, десятичное, 5».":
    "A number written together with its width and base. 4'b1010: “4 bits, binary, 1010”. 6'd5: “6 bits, decimal, 5”.",
  Параметр: 'Parameter',
  'Число, которое можно поменять в одном месте, и оно изменится во всём модуле.':
    'A number you can change in one place, and it changes in the whole module.',
  'Как настройка громкости: одна ручка, а звук меняется везде.':
    'Like a volume setting: one knob, and the sound changes everywhere.',
  'Сначала сохраните проект в браузере.': 'First save the project in the browser.',
  'Не удалось удалить проект на сервере.': 'Could not delete the project on the server.',
  'Сохранённый прогресс имеет неизвестный формат.': 'The saved progress has an unknown format.',
  'На сервере пока нет сохранённого прогресса курса.':
    'There is no saved course progress on the server yet.',
  'Настроить сценарий': 'Set up the scenario',
  // @@END
};
