/**
 * Английские тексты области «server»: сообщения сервера и общих проверок. Ключ — точный русский
 * текст из `server/` и `shared/`; сообщения со значениями разбирает `server-patterns.ts`.
 */
export const server: Record<string, string> = {
  // Клиентские сообщения о сбоях запросов
  'Ошибка сервиса: {status}': 'Service error: {status}',
  'Не удалось сохранить прогресс на сервере.': 'Could not save the progress on the server.',
  'Сервис вернул некорректный ответ.': 'The service returned an invalid response.',

  // Аккаунты
  'Логин: от 3 до 32 символов, латинские буквы, цифры, точка, дефис и подчёркивание.':
    'Login: 3 to 32 characters; Latin letters, digits, dot, hyphen and underscore.',
  'Пароль: от 6 до 128 символов.': 'Password: 6 to 128 characters.',
  'Имя: от 2 до 40 символов. Настоящее ФИО не нужно, подойдёт ник.':
    'Name: 2 to 40 characters. Your real full name is not needed; a nickname will do.',
  'Название класса: от 1 до 40 символов.': 'Class name: 1 to 40 characters.',
  'Класс с таким названием уже есть.': 'A class with this name already exists.',
  'Такой логин уже занят.': 'This login is already taken.',
  'Внутренняя ошибка сервера.': 'Internal server error.',
  'Нужно войти в аккаунт.': 'You need to sign in.',
  'В этом браузере вошёл другой пользователь. Войдите заново.':
    'A different user is signed in in this browser. Sign in again.',
  'Доступно только учителю.': 'Available to teachers only.',
  'Прогресс ведётся только у учеников.': 'Progress is tracked for students only.',
  'Ученик не найден.': 'Student not found.',
  'Слишком много попыток. Подождите несколько минут.': 'Too many attempts. Wait a few minutes.',
  'Неверный логин или пароль.': 'Wrong login or password.',
  'Текущий пароль неверный.': 'The current password is wrong.',
  'Слишком часто.': 'Too often.',
  'Класс не найден.': 'Class not found.',
  'Такого класса нет.': 'There is no such class.',
  'Впишите хотя бы одно имя.': 'Enter at least one name.',
  'За один раз можно добавить до 100 учеников.': 'You can add up to 100 students at a time.',
  'Не удалось создать.': 'Could not create.',

  // Доступ и общие ответы API
  'Слишком много попыток входа. Повторите через минуту.':
    'Too many sign-in attempts. Try again in a minute.',
  'Неверный ключ доступа.': 'Wrong access key.',
  'Лимит открытых сессий достигнут.': 'The open session limit has been reached.',
  'Задание не найдено.': 'Job not found.',
  'Лимит заданий пользователя достигнут. Дождитесь завершения задач или обновления часовой квоты.':
    'The job limit for this user has been reached. Wait for running jobs to finish or for the hourly quota to reset.',
  'Недопустимый адрес сервера.': 'Invalid server address.',
  'Запрос должен поступать через разрешённый адрес IDE.':
    'The request must come through the allowed IDE address.',
  'Запрос должен поступать с того же адреса, что и интерфейс IDE.':
    'The request must come from the same address as the IDE interface.',
  'Войдите с персональным ключом доступа.': 'Sign in with your personal access key.',
  'Ожидается Content-Type: application/json.': 'Content-Type: application/json is expected.',
  'Маршрут API не найден.': 'API route not found.',
  'Размер запроса превышает допустимый.': 'The request is larger than allowed.',
  'Не удалось прочитать JSON запроса.': 'Could not read the request JSON.',
  'Ошибка сервиса сборки.': 'Build service error.',
  'Сервис завершает работу.': 'The service is shutting down.',
  'Очередь заполнена. Дождитесь завершения текущих задач.':
    'The queue is full. Wait for the current jobs to finish.',
  'Артефакт не найден.': 'Artifact not found.',
  'Артефакт пока не создан.': 'The artifact has not been created yet.',
  'Артефакт не создан.': 'The artifact has not been created.',
  'Некорректное смещение журнала.': 'Invalid log offset.',

  // Резервные копии отладчика
  'Некорректный идентификатор резервной копии.': 'Invalid backup identifier.',
  'Копия на сервере не найдена.': 'The backup was not found on the server.',
  'Копия на сервере повреждена.': 'The backup on the server is damaged.',
  'Размер или SHA-256 резервной копии не совпал.': 'The backup size or SHA-256 does not match.',
  'Недостаточно места для резервной копии на сервере.':
    'Not enough space for the backup on the server.',
  'Ожидается бинарная резервная копия.': 'A binary backup is expected.',

  // Сборка (синтез)
  'Сборка не найдена.': 'Build not found.',
  'Журнал слишком велик': 'Log too large',
  'Журнал синтеза превышает 4 МБ.': 'The synthesis log exceeds 4 MB.',
  'Сервис завершён': 'Service stopped',
  'Ошибка сохранения сборки': 'Build save error',
  'В очереди': 'Queued',
  'Сборка прервана перезапуском сервиса': 'Build interrupted by a service restart',
  '\nСборка отменена пользователем.\n': '\nBuild cancelled by the user.\n',
  'Сборка отменена': 'Build cancelled',
  '\nСервис сборки завершает работу.\n': '\nThe build service is shutting down.\n',
  'Истекло время сборки': 'Build timed out',
  'Время сборки превышено. Уменьшите размер проекта.':
    'The build time limit was exceeded. Make the project smaller.',
  'Запуск Yosys': 'Starting Yosys',
  'Ошибка запуска Yosys': 'Yosys start error',
  'Ошибка синтеза': 'Synthesis error',
  'Ошибка Yosys.': 'Yosys error.',
  'Ошибка запуска': 'Start error',
  'Синтез завершён': 'Synthesis finished',
  'Процесс Yosys завершился': 'The Yosys process exited',
  'Ошибка связи с Yosys': 'Yosys communication error',
  'Загрузка Yosys WebAssembly': 'Loading Yosys WebAssembly',
  'Подготовка схемы для лаборатории': 'Preparing the circuit for the lab',
  'Синтез RTL': 'RTL synthesis',
  'Отображение на примитивы Gowin': 'Mapping to Gowin primitives',
  'Журнал синтеза превышает лимит 4 МБ.': 'The synthesis log exceeds the 4 MB limit.',
  'Нетлист превышает лимит 64 МБ. Уменьшите размер проекта.':
    'The netlist exceeds the 64 MB limit. Make the project smaller.',
  'Не удалось экспортировать RTL для симуляции.': 'Could not export the RTL for simulation.',
  'Yosys аварийно остановился на этой схеме. Частая причина — вещественные числа в выражениях (например, 0.85): синтез их не поддерживает. Замените их целыми: вместо N * 0.85 пишите N * 85 / 100.':
    'Yosys crashed on this design. A common cause is real numbers in expressions (for example 0.85): synthesis does not support them. Use integers instead: write N * 85 / 100 instead of N * 0.85.',
  'Yosys не создал плоский нетлист.': 'Yosys did not produce a flat netlist.',
  'Журнал подготовки размещения превышает 4 МБ.': 'The placement preparation log exceeds 4 MB.',

  // Лаборатория
  'Схема слишком велика для лаборатории: её подготовка заняла больше минуты. Так бывает с процессорами и большой памятью — проверяйте такой проект синтезом и на плате.':
    'The circuit is too large for the lab: preparing it took more than a minute. This happens with processors and large memories: check such a project with synthesis and on the board.',
  'Подготовка заменена новым запросом.': 'Preparation was replaced by a newer request.',
  'Подготовка отменена.': 'Preparation cancelled.',
  'Журнал подготовки превышает 1 МБ.': 'The preparation log exceeds 1 MB.',
  'Не удалось подготовить схему для лаборатории.': 'Could not prepare the circuit for the lab.',
  'В схеме есть защёлка (latch). Лаборатория работает только с регистрами по фронту: допишите else или значение по умолчанию в always.':
    'The design contains a latch. The lab works only with edge-triggered registers: add an else branch or a default value in the always block.',
  'Третье состояние (z) в лаборатории работает только на выводах верхнего модуля (inout). Внутренние шины с z замените мультиплексором.':
    'Tri-state (z) works in the lab only on top-module pins (inout). Replace internal buses that use z with a multiplexer.',
  'Выводы с третьим состоянием (z) в лаборатории пока не поддерживаются.':
    'Tri-state (z) pins are not supported in the lab yet.',
  'Схема слишком велика для лаборатории: больше 250 000 вентилей.':
    'The circuit is too large for the lab: more than 250,000 gates.',

  // Размещение (nextpnr)
  'Укажите файл ограничений и частоту.': 'Specify the constraints file and the frequency.',
  'Выберите существующий .cst из проекта.': 'Choose an existing .cst file from the project.',
  'Целевая частота должна быть от 1 до 500 МГц.': 'The target frequency must be 1 to 500 MHz.',
  'Размещение не найдено.': 'Placement not found.',
  'Журнал размещения превышает 4 МБ.': 'The placement log exceeds 4 MB.',
  'Сервис завершает работу': 'The service is shutting down',
  'Ошибка сохранения размещения': 'Placement save error',
  'Проверка nextpnr превысила 120 секунд.': 'The nextpnr check took longer than 120 seconds.',
  'Установите локальный Gowin-тулчейн командой npm run setup:gowin.':
    'Install the local Gowin toolchain with: npm run setup:gowin.',
  'Сначала синтезируйте проект.': 'Synthesize the project first.',
  'Для размещения нужен завершённый синтез.': 'Placement needs a finished synthesis.',
  'Исходники или .cst изменились после синтеза. Синтезируйте текущий проект.':
    'The sources or the .cst file changed after synthesis. Synthesize the current project.',
  'Дождитесь завершения размещения.': 'Wait for the placement to finish.',
  'Битстрим не создан.': 'The bitstream has not been created.',
  'Размещение прервано перезапуском сервиса': 'Placement interrupted by a service restart',
  Отменено: 'Cancelled',
  'Размещение превысило лимит времени.': 'Placement exceeded the time limit.',
  'Проверка nextpnr': 'Checking nextpnr',
  'nextpnr недоступен.': 'nextpnr is unavailable.',
  'Подготовка плоского нетлиста': 'Preparing the flat netlist',
  'Трёхстабильный выход (значение z) остался вне вывода платы: такой буфер можно разместить только на внешнем порту верхнего модуля. Выведите шину на порт (inout или output) или уберите z из внутренней логики.':
    'A tri-state output (value z) was left outside a board pin: such a buffer can only be placed on an external port of the top module. Bring the bus out to a port (inout or output) or remove z from the internal logic.',
  'Размещение и трассировка': 'Placement and routing',
  'Генерация битстрима Apicula': 'Generating the bitstream with Apicula',
  'Битстрим готов': 'Bitstream ready',
  'Размещение готово': 'Placement ready',
  'Размещение отменено.': 'Placement cancelled.',
  'Не удалось подготовить нетлист.': 'Could not prepare the netlist.',

  // Симуляция
  'Симуляция не найдена.': 'Simulation not found.',
  'Журнал симуляции превышает 4 МБ.': 'The simulation log exceeds 4 MB.',
  'Ошибка сохранения симуляции': 'Simulation save error',
  'Проверка симулятора превысила время.': 'The simulator check timed out.',
  'Симуляция прервана перезапуском сервиса.': 'Simulation interrupted by a service restart.',
  'Симуляция отменена': 'Simulation cancelled',
  'Истекло время симуляции': 'Simulation timed out',
  'Ошибка симуляции': 'Simulation error',
  'Icarus Verilog / vvp не доступны. Выполните npm run setup:iverilog или настройте IVERILOG_PATH и VVP_PATH.':
    'Icarus Verilog / vvp are not available. Run npm run setup:iverilog or set IVERILOG_PATH and VVP_PATH.',
  'Подготовка RTL': 'Preparing the RTL',
  'Компиляция Icarus Verilog': 'Compiling with Icarus Verilog',
  'Моделирование RTL': 'Simulating the RTL',
  'VCD превышает 16 МБ. Уменьшите число циклов или размер проекта.':
    'The VCD exceeds 16 MB. Reduce the number of cycles or the project size.',
  'Симулятор не создал корректный VCD.': 'The simulator did not produce a valid VCD.',
  'Отчёт проверок превышает 16 МБ.': 'The checks report exceeds 16 MB.',
  'Симуляция завершена': 'Simulation finished',
  'Ошибка подготовки RTL.': 'RTL preparation error.',
  'Симуляция отменена.': 'Simulation cancelled.',
  'Симуляция поддерживает до 256 портов.': 'Simulation supports up to 256 ports.',

  // Проверка синтаксиса
  'Проверка превысила 20 секунд.': 'The check took longer than 20 seconds.',
  'Проверка заменена новым изменением.': 'The check was replaced by a newer change.',
  'Проверка отменена.': 'Check cancelled.',
  'Журнал проверки превышает 1 МБ.': 'The check log exceeds 1 MB.',
  'Не удалось проверить Verilog.': 'Could not check the Verilog.',

  // Проекты пользователя
  'Проект не найден.': 'Project not found.',
  'Идентификатор проекта не совпадает с адресом.':
    'The project identifier does not match the address.',
  'Проект изменён в другой вкладке. Откройте свежую версию перед сохранением.':
    'The project was changed in another tab. Open the latest version before saving.',
  'В библиотеке разрешено до 50 проектов на пользователя.':
    'The library allows up to 50 projects per user.',
  'Библиотека проектов превышает 100 МБ.': 'The project library exceeds 100 MB.',
  'Прогресс должен быть объектом JSON.': 'Progress must be a JSON object.',
  'Прогресс превышает 64 КБ.': 'Progress exceeds 64 KB.',

  // Проверка проекта и симуляции
  'Проект не передан.': 'No project was provided.',
  'Название проекта должно содержать от 1 до 100 символов.':
    'The project name must be 1 to 100 characters long.',
  'Укажите корректное имя верхнего модуля Verilog.': 'Specify a valid Verilog top module name.',
  'Поддерживается профиль Tang Nano 20K.': 'Only the Tang Nano 20K profile is supported.',
  'Некорректный исходный файл.': 'Invalid source file.',
  'Имена файлов: относительные пути из латинских букв, цифр, _, -, . и / с расширением .v, .sv, .vh, .svh, .cst, .sdc, .ysch, .hex или .mem.':
    'File names: relative paths made of Latin letters, digits, _, -, . and / with the extension .v, .sv, .vh, .svh, .cst, .sdc, .ysch, .hex or .mem.',
  'Размер исходников превышает 2 МБ.': 'The sources are larger than 2 MB.',
  'Добавьте хотя бы один исходный файл .v, .sv или .ysch.':
    'Add at least one .v, .sv or .ysch source file.',
  'В первой версии допустим один файл .ysch на проект.':
    'Only one .ysch file per project is allowed for now.',
  'Некорректный идентификатор проекта.': 'Invalid project identifier.',
  'Параметры симуляции не переданы.': 'No simulation parameters were provided.',
  'Тактовый вход и сброс должны различаться.': 'The clock input and the reset must differ.',
  'Укажите полярность сброса.': 'Specify the reset polarity.',
  'Количество циклов должно быть целым числом от 1 до 10000.':
    'The number of cycles must be an integer from 1 to 10000.',
  'Число циклов сброса должно быть от 0 до общего числа циклов.':
    'The number of reset cycles must be from 0 to the total number of cycles.',
  'Период должен быть целым числом от 1 до 1000000 нс.':
    'The period must be an integer from 1 to 1000000 ns.',
  'Некорректные постоянные значения входов.': 'Invalid constant input values.',
  'Слишком много входов для симуляции.': 'Too many inputs for the simulation.',
  'Последовательность входов должна содержать до 2048 шагов.':
    'The input sequence may contain up to 2048 steps.',
  'Некорректный шаг последовательности входов.': 'Invalid input sequence step.',
  'Номера шагов должны возрастать от 0 до числа циклов минус один.':
    'Step numbers must increase from 0 up to the number of cycles minus one.',
  'Укажите значения входов для шага.': 'Specify the input values for the step.',
  'Последовательность входов должна содержать до 2048 событий.':
    'The input sequence may contain up to 2048 events.',
  'Выберите одну шкалу событий: периоды или наносекунды.':
    'Choose one event time scale: periods or nanoseconds.',
  'Некорректное событие.': 'Invalid event.',
  'Время событий должно возрастать и быть меньше длительности запуска.':
    'Event times must increase and be shorter than the run duration.',
  'Укажите значения входов для события.': 'Specify the input values for the event.',
  'Разрешено до 2048 проверок за запуск.': 'Up to 2048 checks are allowed per run.',
  'Некорректная проверка.': 'Invalid check.',
  'Проверка выходит за длительность запуска.': 'The check falls outside the run duration.',
  'Укажите имя проверяемого порта.': 'Specify the name of the port to check.',
  'Некорректное ожидаемое значение.': 'Invalid expected value.',
  'Время должно быть неотрицательным числом в наносекундах.':
    'The time must be a non-negative number of nanoseconds.',
  'Укажите время с точностью до 0,001 нс (1 пс).':
    'Specify the time with a precision of 0.001 ns (1 ps).',
  'Некорректная ширина проверяемого сигнала.': 'Invalid width of the checked signal.',
  'Ожидается число, 0b с битами 0/1/X/Z, X или Z.':
    'Expected a number, 0b with bits 0/1/X/Z, X or Z.',

  // Загрузка в плату
  'Программатор не завершил операцию за отведённое время. Переподключите плату перед повторной загрузкой.':
    'The programmer did not finish the operation in time. Reconnect the board before loading again.',
  'Журнал программатора превысил допустимый размер.':
    'The programmer log exceeded the allowed size.',
  'Не удалось однозначно определить USB location платы.':
    'Could not unambiguously determine the USB location of the board.',
  'Обнаружены платы с одинаковым USB location.': 'Boards with the same USB location were found.',
  'Ожидается единственный GW2AR-18C с ID 0x0000081B. Проверьте подключение платы.':
    'Exactly one GW2AR-18C with ID 0x0000081B is expected. Check the board connection.',
  'Указанная программа не является Gowin Programmer.':
    'The specified program is not Gowin Programmer.',
  'Gowin Programmer готов. Загрузка в SRAM.': 'Gowin Programmer is ready. Loading into SRAM.',
  'Некорректный адрес платы.': 'Invalid board address.',
  'Проверка подключённой платы': 'Checking the connected board',
  'Загрузка в SRAM': 'Loading into SRAM',
  'Gowin Programmer не подтвердил завершение загрузки.':
    'Gowin Programmer did not confirm that the load finished.',
  'Чтение состояния FPGA': 'Reading the FPGA state',
  'FPGA не подтвердила завершение конфигурации. Переподключите плату и повторите загрузку.':
    'The FPGA did not confirm that configuration finished. Reconnect the board and load again.',
  'UserCode FPGA отличается от загружаемого битстрима.':
    'The FPGA UserCode differs from the bitstream being loaded.',
  '\nКонфигурация завершена; состояние и UserCode прочитаны. Проверьте ожидаемое поведение LED или выходов.\n':
    '\nConfiguration finished; the state and UserCode were read back. Check the expected behavior of the LEDs or outputs.\n',
  'Не удалось прочитать список USB от openFPGALoader.':
    'Could not read the USB list from openFPGALoader.',
  'Неизвестный формат списка USB.': 'Unknown USB list format.',
  'У USB-программатора нет однозначного серийного номера.':
    'The USB programmer has no unambiguous serial number.',
  'Обнаружены USB-программаторы с одинаковыми серийными номерами.':
    'USB programmers with the same serial numbers were found.',
  'Ожидается единственный GW2AR-18C с ID 0x0000081B.':
    'Exactly one GW2AR-18C with ID 0x0000081B is expected.',
  'Указанная программа не является openFPGALoader.': 'The specified program is not openFPGALoader.',
  'openFPGALoader готов. Загрузка в SRAM.': 'openFPGALoader is ready. Loading into SRAM.',
  'Некорректный серийный номер платы.': 'Invalid board serial number.',
  'Выбранная плата отключена.': 'The selected board is disconnected.',
  'openFPGALoader не подтвердил завершение загрузки.':
    'openFPGALoader did not confirm that the load finished.',
  '\nopenFPGALoader завершил загрузку в SRAM. Проверьте ожидаемое поведение выходов платы.\n':
    '\nopenFPGALoader finished loading into SRAM. Check the expected behavior of the board outputs.\n',
  'Ошибка программатора.': 'Programmer error.',
  'Укажите SHA256 выбранного битстрима.': 'Specify the SHA256 of the selected bitstream.',
  'Ожидается текстовый файл Gowin .fs.': 'A Gowin .fs text file is expected.',
  'SHA256 файла не совпадает с выбранным битстримом.':
    'The file SHA256 does not match the selected bitstream.',
  'Некорректный .fs.': 'Invalid .fs file.',
  'Ожидается описание загрузки.': 'A load description is expected.',
  'Допустимы только requestId, deviceId, bitstream, sha256 и projectName.':
    'Only requestId, deviceId, bitstream, sha256 and projectName are allowed.',
  'requestId должен быть UUID, созданным клиентом перед загрузкой.':
    'requestId must be a UUID created by the client before loading.',
  'Некорректный идентификатор платы.': 'Invalid board identifier.',
  'Имя проекта должно содержать от 1 до 120 символов.':
    'The project name must be 1 to 120 characters long.',
  'Нужен SHA256 загружаемого битстрима.': 'The SHA256 of the bitstream to load is required.',
  'Битстрим должен быть текстовым файлом FS не больше 16 МБ.':
    'The bitstream must be an FS text file no larger than 16 MB.',
  'Загрузка уже выполняется. Дождитесь её завершения.':
    'A load is already in progress. Wait for it to finish.',
  'requestId уже принадлежит другой загрузке. Создайте новый идентификатор.':
    'requestId already belongs to another load. Create a new identifier.',
  'Достигнут лимит 1000 загрузок. Перезапустите помощник для новой сессии.':
    'The limit of 1000 loads has been reached. Restart the helper for a new session.',
  'Проверка битстрима и платы': 'Checking the bitstream and the board',
  'Поиск выбранной платы': 'Looking for the selected board',
  'Выбранная плата не найдена или её адрес неоднозначен. Обновите список плат.':
    'The selected board was not found or its address is ambiguous. Refresh the board list.',
  'Битстрим проверен': 'Bitstream checked',
  'Загрузка не начата': 'Load not started',
  'Загрузка в SRAM завершена': 'Loading into SRAM finished',
  'Загрузка не завершена': 'Load not finished',
  'Загрузка не найдена.': 'Load not found.',
  'Некорректный идентификатор загрузки.': 'Invalid load identifier.',
  'Путь загрузки выходит за каталог помощника.': 'The load path goes outside the helper directory.',
  'Полный журнал предыдущей загрузки удалён при очистке истории. Результат сохранён до завершения сессии помощника.\n':
    'The full log of the previous load was removed when the history was cleaned up. The result is kept until the helper session ends.\n',
  'Помощник доступен только через локальный адрес.':
    'The helper is available only through a local address.',
  'Помощник доступен только на этом компьютере.': 'The helper is available on this computer only.',
  'Этот origin не разрешён в настройках помощника.':
    'This origin is not allowed in the helper settings.',
  'Некорректный предварительный запрос.': 'Invalid preflight request.',
  'Недопустимые заголовки запроса.': 'Invalid request headers.',
  'Нужен токен подключения из терминала локального помощника.':
    'The connection token from the local helper terminal is required.',
  'Маршрут помощника не найден.': 'Helper route not found.',
  'Ошибка локального помощника.': 'Local helper error.',

  // Битстрим Gowin
  'Битстрим должен содержать целые двоичные строки .fs.':
    'The bitstream must consist of whole binary .fs lines.',
  'Файл .fs пуст или превышает 16 МБ.': 'The .fs file is empty or larger than 16 MB.',
  'Неподдерживаемая длина строки .fs.': 'Unsupported .fs line length.',
  'Файл .fs неполный или содержит неподдерживаемые данные.':
    'The .fs file is incomplete or contains unsupported data.',
  'Нужен обычный несжатый .fs для Tang Nano 20K; этот режим конфигурации не поддерживается.':
    'A regular uncompressed .fs for the Tang Nano 20K is required; this configuration mode is not supported.',
  'Заголовок .fs неполный.': 'The .fs header is incomplete.',
  'Поддерживается несжатый и незашифрованный .fs с обычным режимом загрузки.':
    'Only an uncompressed, unencrypted .fs with the regular load mode is supported.',
  'Для загрузки требуется битстрим с включённой проверкой CRC.':
    'Loading requires a bitstream with CRC checking enabled.',
  'Количество кадров .fs не соответствует GW2AR-18C или файл неполный.':
    'The number of .fs frames does not match the GW2AR-18C, or the file is incomplete.',
  'Некорректное окончание данных конфигурации.': 'Invalid end of the configuration data.',
  'Некорректный UserCode .fs.': 'Invalid .fs UserCode.',
};
