/** Английские тексты области «examples». Ключ — русская фраза из кода. */
export const examples: Record<string, string> = {
  'Скользящее среднее: четыре отсчёта': 'Moving average: four samples',
  'Короткий импульс превращается в четыре меньших отсчёта.':
    'A short pulse is turned into four smaller samples.',
  'FIR: настраиваемые коэффициенты': 'FIR: adjustable coefficients',
  'Три задержанных отсчёта, signed-умножения и импульсная характеристика.':
    'Three delayed samples, signed multiplications and an impulse response.',
  'Мини-растр: строки и кадры': 'Mini raster: lines and frames',
  'Активная область, интервалы гашения и два сигнала синхронизации.':
    'The active area, blanking intervals and two sync signals.',
  'DDS: цифровой генератор частоты': 'DDS: digital frequency generator',
  'Слово настройки управляет скоростью накопления фазы.':
    'The tuning word sets how fast the phase accumulates.',
  'Сигма-дельта: плотность импульсов': 'Sigma-delta: pulse density',
  'Шестибитный уровень превращается в однобитный цифровой поток.':
    'A six-bit level is turned into a one-bit digital stream.',
  'Маленький процессор: fetch и execute': 'A tiny processor: fetch and execute',
  'ROM-программа считает 3→2→1→0, делает условный переход и останавливается.':
    'A ROM program counts 3→2→1→0, makes a conditional jump and halts.',
  'Эластичный буфер valid/ready': 'Elastic valid/ready buffer',
  'Одно слово хранения, обратное давление и замена прочитанного слова в тот же такт.':
    'One word of storage, back pressure, and replacing the word that is read in the same clock cycle.',
  'Проверка протокола: ошибка остаётся': 'Protocol check: the error stays',
  'Отладочный монитор ловит изменение valid/data во время ожидания.':
    'A debug monitor catches valid/data changing while the receiver is waiting.',
  'На стенде: деталь уже стоит и подключена — откройте «Лабораторию» и нажмите «Пуск».':
    'On the bench: the part is already placed and connected. Open the "Lab" and press "Start".',
  'OLED: шахматная доска': 'OLED: checkerboard',
  'Картинка для экрана SSD1306 вычисляется из координат, а не хранится в памяти.':
    'The picture for the SSD1306 screen is computed from coordinates rather than stored in memory.',
  'ЖК 1602 по I²C: мигающий курсор': '1602 LCD over I²C: blinking cursor',
  'Текст и команда, включающая мигающий курсор.':
    'Text and a command that turns on the blinking cursor.',
  'ЖК 1602 напрямую: бегущая строка': '1602 LCD, direct: scrolling line',
  'Команда сдвига окна прокручивает длинный текст.':
    'The window-shift command scrolls a long text.',
  'LM75: термостат с гистерезисом': 'LM75: thermostat with hysteresis',
  'Нагреватель включается ниже 24 °C и выключается выше 26 °C.':
    'The heater turns on below 24 °C and turns off above 26 °C.',
  'EEPROM 24C02: запись страницы и проверка': 'EEPROM 24C02: page write and verify',
  'Четыре байта записываются одной посылкой и сверяются чтением.':
    'Four bytes are written in one transfer and checked by reading them back.',
  'Часы DS1307: секунды на светодиодах': 'DS1307 clock: seconds on the LEDs',
  'Запуск часов и чтение одного регистра в двоично-десятичном виде.':
    'Start the clock and read one register in binary-coded decimal.',
  'PCF8574: бегущий огонь по I²C': 'PCF8574: running light over I²C',
  'Восемь светодиодов на двух проводах шины.': 'Eight LEDs on the two wires of the bus.',
  'PCF8574: чтение переключателей': 'PCF8574: reading switches',
  'Порт читается по I²C, переключатели видны на светодиодах платы.':
    'The port is read over I²C, and the switches show up on the board LEDs.',
  'MAX7219: восемь цифр': 'MAX7219: eight digits',
  'Встроенный дешифратор драйвера показывает число 12345678.':
    "The driver's built-in decoder shows the number 12345678.",
  'Лента WS2812B: бегущая точка': 'WS2812B strip: running dot',
  'Один светодиод ленты горит, остальные получают чёрный цвет.':
    'One LED of the strip is lit, and the others receive the color black.',
  'АЦП MCP3008: число на светодиодах': 'MCP3008 ADC: number on the LEDs',
  'Шесть старших бит измерения показаны в двоичном виде.':
    'The six most significant bits of the measurement are shown in binary.',
  'HC-SR04: парковочный датчик': 'HC-SR04: parking sensor',
  'Чем ближе препятствие, тем чаще гудки. На стенде: дальномер и зуммер уже стоят и подключены — откройте «Лабораторию» и нажмите «Пуск».':
    'The closer the obstacle, the more frequent the beeps. On the bench: the rangefinder and the buzzer are already placed and connected. Open the "Lab" and press "Start".',
  'DHT11: сигнализация влажности и жары': 'DHT11: humidity and heat alarm',
  'Пороги по влажности и температуре зажигают светодиоды.':
    'Humidity and temperature thresholds light up LEDs.',
  'ИК-приёмник: код кнопки': 'IR receiver: remote button code',
  'Код команды пульта показывается на светодиодах.':
    'The remote command code is shown on the LEDs.',
  'Клавиатура PS/2: скан-код клавиши': 'PS/2 keyboard: key scan code',
  'Код последней нажатой клавиши на светодиодах, коды отпускания пропускаются.':
    'The code of the last pressed key is shown on the LEDs; key-release codes are skipped.',
  'Вычислить картинку для OLED из координат байта вместо хранения её в памяти.':
    'Compute the OLED picture from the byte coordinates instead of storing it in memory.',
  'Экран заполняется клетками 16 на 8 пикселей; соседние клетки по горизонтали и вертикали разного цвета.':
    'The screen is filled with cells of 16 by 8 pixels; neighboring cells horizontally and vertically have different colors.',
  'Сделайте клетки квадратными, взяв для строк биты внутри байта. Нарисуйте полосы вместо клеток.':
    'Make the cells square by taking the row from the bits inside the byte. Draw stripes instead of cells.',
  'Управлять курсором символьного ЖК командой включения экрана.':
    'Control the cursor of a character LCD with the display-on command.',
  'После текста в конце второй строки появляется мигающий прямоугольник курсора.':
    'After the text, a blinking cursor rectangle appears at the end of the second line.',
  'Замените 0x0F на 0x0E — курсор перестанет мигать. Поставьте курсор в начало первой строки командой 0x80.':
    'Replace 0x0F with 0x0E and the cursor stops blinking. Put the cursor at the start of the first line with the command 0x80.',
  'Прокрутить длинный текст на ЖК командой сдвига видимого окна.':
    'Scroll a long text on the LCD with the display-shift command.',
  'Обе строки едут влево на символ за шаг, хотя текст записан в память экрана один раз.':
    'Both lines move left by one character per step, although the text was written to the display memory only once.',
  'Смените направление командой 0x1C. Измените STEP и подберите удобную скорость чтения.':
    'Change the direction with the command 0x1C. Change STEP and pick a comfortable reading speed.',
  'Построить термостат с гистерезисом по показаниям датчика LM75.':
    'Build a thermostat with hysteresis from the readings of the LM75 sensor.',
  'LED0 загорается ниже 24 °C и гаснет выше 26 °C; между порогами он не меняется.':
    'LED0 turns on below 24 °C and turns off above 26 °C; between the thresholds it does not change.',
  'Сведите пороги в один и посмотрите на дребезг у границы. Учтите половинки градуса из младшего байта.':
    'Merge the thresholds into one and look at the chatter near the boundary. Take into account the half degrees from the low byte.',
  'Записать в EEPROM несколько байт одной посылкой и проверить их чтением подряд.':
    'Write several bytes to the EEPROM in one transfer and check them by reading back in sequence.',
  'После паузы на запись загорается LED0: прочитанные четыре байта совпали с образцом 0xDEADBEEF.':
    'After the write pause LED0 lights up: the four bytes read back match the pattern 0xDEADBEEF.',
  'Уберите паузу после записи и объясните ошибку. Запишите девять байт и найдите, где они оказались.':
    'Remove the pause after the write and explain the error. Write nine bytes and find where they ended up.',
  'Запустить часы DS1307 и прочитать секунды в двоично-десятичном коде.':
    'Start the DS1307 clock and read the seconds in binary-coded decimal.',
  'LED0–LED3 считают от 0 до 9 и сбрасываются, LED4–LED5 показывают десятки секунд.':
    'LED0–LED3 count from 0 to 9 and reset, LED4–LED5 show the tens of seconds.',
  'Не записывайте регистр секунд и убедитесь, что часы стоят. Прочитайте минуты вместо секунд.':
    'Do not write the seconds register and check that the clock stands still. Read the minutes instead of the seconds.',
  'Управлять восемью выходами расширителя портов одной записью по I²C.':
    'Drive the eight outputs of the port expander with a single I²C write.',
  'По светодиодам микросхемы бежит огонь: горит тот вывод, в который записан ноль.':
    "A light runs along the chip's LEDs: the pin to which a zero is written is lit.",
  'Запустите два огня навстречу. Смените адрес микросхемы в свойствах и исправьте адресный байт.':
    'Start two lights toward each other. Change the chip address in the properties and fix the address byte.',
  'Читать входы квазидвунаправленного порта PCF8574, предварительно записав в них единицы.':
    'Read the inputs of the quasi-bidirectional PCF8574 port after writing ones to them first.',
  'Замкнутые переключатели микросхемы зажигают светодиоды платы с теми же номерами.':
    'Closed switches of the chip light the board LEDs with the same numbers.',
  'Запишите 0x00 вместо 0xFF и объясните, почему переключатели перестали читаться.':
    'Write 0x00 instead of 0xFF and explain why the switches can no longer be read.',
  'Вывести число на восемь разрядов MAX7219 через встроенный дешифратор цифр.':
    'Show a number on the eight digits of the MAX7219 through the built-in digit decoder.',
  'На индикаторе число 12345678; яркость ступенями растёт и возвращается к минимуму.':
    'The display shows the number 12345678; the brightness grows in steps and returns to the minimum.',
  'Выключите дешифратор (0x0900) и посмотрите, что стало с цифрами. Покажите только четыре разряда.':
    'Turn off the decoder (0x0900) and see what happens to the digits. Show only four digits.',
  'Зажечь один светодиод адресной ленты, отправив остальным чёрный цвет.':
    'Light one LED of the addressable strip by sending black to the others.',
  'Точка проходит ленту от начала до конца и на каждом круге меняет цвет.':
    'A dot travels along the strip from start to end and changes color on every lap.',
  'Оставляйте за точкой тусклый след. Запустите точку в обратную сторону.':
    'Leave a dim trail behind the dot. Run the dot in the opposite direction.',
  'Прочитать АЦП по SPI и показать результат двоичным числом.':
    'Read the ADC over SPI and show the result as a binary number.',
  'Ползунок потенциометра меняет число на светодиодах от 0 до 63.':
    'The potentiometer slider changes the number on the LEDs from 0 to 63.',
  'Покажите младшие шесть бит и объясните, почему они «дрожат» сильнее. Прочитайте канал 1.':
    'Show the lower six bits and explain why they "jitter" more. Read channel 1.',
  'Превратить измеренное расстояние в частоту гудков парковочного датчика.':
    'Turn the measured distance into the beep rate of a parking sensor.',
  'С уменьшением расстояния гудки учащаются, ближе 10 см звук непрерывный; дальше 150 см тишина.':
    'As the distance shrinks, the beeps become more frequent; closer than 10 cm the sound is continuous; farther than 150 cm it is silent.',
  'Добавьте три светодиода «зелёный — жёлтый — красный». Сделайте шкалу гудков нелинейной.':
    'Add three LEDs "green, yellow, red". Make the beep scale nonlinear.',
  'Сравнить показания DHT11 с порогами и учесть контрольную сумму ответа.':
    'Compare the DHT11 readings with thresholds and take the checksum of the reply into account.',
  'LED5 подтверждает верный ответ; LED0 горит при влажности от 60 %, LED1 — при жаре от 30 °C.':
    'LED5 confirms a valid reply; LED0 lights at humidity of 60 % or more, LED1 at heat of 30 °C or more.',
  'Добавьте гистерезис в 5 % влажности. Зажигайте LED2, если датчик не ответил три раза подряд.':
    'Add 5 % humidity hysteresis. Light LED2 if the sensor has not answered three times in a row.',
  'Принять команду пульта по протоколу NEC и показать её код.':
    'Receive a remote command using the NEC protocol and show its code.',
  'Каждая кнопка пульта даёт своё сочетание светодиодов, которое держится до следующей кнопки.':
    'Each remote button gives its own combination of LEDs, which holds until the next button.',
  'Покажите адрес пульта вместо команды. Считайте, сколько раз подряд нажата одна кнопка.':
    'Show the remote address instead of the command. Count how many times in a row one button was pressed.',
  'Отличить нажатие клавиши PS/2 от отпускания по префиксу 0xF0.':
    'Tell a PS/2 key press from a release by the 0xF0 prefix.',
  'На светодиодах остаётся код последней нажатой клавиши; отпускание его не меняет.':
    'The LEDs keep the code of the last pressed key; a release does not change it.',
  'Показывайте код отпущенной клавиши. Зажгите все светодиоды, пока клавиша удерживается.':
    'Show the code of the released key. Light all the LEDs while a key is held down.',
  'Матрица MAX7219: подмигивающий смайлик': 'MAX7219 matrix: winking smiley',
  'Кадры по 16 бит (регистр и данные) по трём проводам: настройка из сна и восемь строк картинки. На стенде: матрица 8×8 на MAX7219.':
    '16-bit frames (register and data) over three wires: wake-up setup and eight rows of the picture. On the bench: an 8×8 matrix on the MAX7219.',
  'TM1637: секундомер': 'TM1637: stopwatch',
  'Счёт в BCD, двухпроводный протокол TM1637 с подтверждением. Кнопка S2 — старт и стоп, S1 — сброс. На стенде: индикатор TM1637.':
    'BCD counting and the TM1637 two-wire protocol with acknowledgment. Button S2 is start and stop, S1 is reset. On the bench: a TM1637 display.',
  'Лента WS2812: радуга': 'WS2812 strip: rainbow',
  'Цвета кодируются длиной импульса на одном проводе, пауза 50 мкс защёлкивает кадр. На стенде: лента из 8 светодиодов WS2812B.':
    'Colors are encoded by the pulse length on one wire, and a 50 µs pause latches the frame. On the bench: a strip of 8 WS2812B LEDs.',
  'OLED-экран 128×64: привет, мир': '128×64 OLED screen: hello, world',
  'SSD1306 по I²C: настройка экрана командами и надпись из шрифта 5×7. На стенде: OLED-экран, провода SDA и SCL уже подключены.':
    'SSD1306 over I²C: configuring the screen with commands and a caption from a 5×7 font. On the bench: an OLED screen, the SDA and SCL wires are already connected.',
  'ЖК-экран 1602 по I²C': '1602 LCD over I²C',
  'Экран HD44780 за переходником PCF8574 (адрес 0x27): запуск, две строки текста. На стенде: ЖК-экран 16×2 с переходником I²C.':
    'An HD44780 screen behind a PCF8574 adapter (address 0x27): start-up and two lines of text. On the bench: a 16×2 LCD with an I²C adapter.',
  'ЖК-экран 1602 напрямую': '1602 LCD, direct',
  'Экран HD44780 на четырёх линиях данных (D4–D7), RS и E: запуск в 4-битном режиме и две строки текста. На стенде: ЖК-экран 16×2 напрямую.':
    'An HD44780 screen on four data lines (D4–D7), RS and E: start-up in 4-bit mode and two lines of text. On the bench: a 16×2 LCD connected directly.',
  'Настроить графический OLED командами SSD1306 и вывести картинку из памяти.':
    'Configure a graphic OLED with SSD1306 commands and draw a picture from memory.',
  'Экран тёмный, пока не пришли команды 0x8D 0x14 и 0xAF; потом за 1024 байта заполняется рамка и две надписи.':
    'The screen stays dark until the commands 0x8D 0x14 and 0xAF arrive; then within 1024 bytes a frame and two captions are filled in.',
  'Уберите из таблицы команду 0x14 и убедитесь, что экран остался тёмным; верните её и поменяйте текст надписи.':
    'Remove the command 0x14 from the table and check that the screen stays dark; put it back and change the caption text.',
  'Управлять символьным ЖК HD44780 через I²C-переходник PCF8574.':
    'Control a HD44780 character LCD through a PCF8574 I²C adapter.',
  'Каждый символ — четыре байта по I²C: два полубайта с E = 1 и E = 0; ячейка экрана показывает код в таблице.':
    'Each character takes four bytes over I²C: two nibbles with E = 1 and E = 0; the screen cell shows the code in the table.',
  'Замените строки текста. Уменьшите паузу после команды очистки и посмотрите на предупреждение экрана.':
    'Replace the text lines. Shorten the pause after the clear command and look at the screen warning.',
  'Передать байты в ЖК HD44780 по четырём линиям данных, соблюдая паузы.':
    'Send bytes to an HD44780 LCD over four data lines while observing the delays.',
  'Старший и младший полубайты уходят по спаду E; первые шаги инициализации — по одному полубайту.':
    'The high and low nibbles go out on the falling edge of E; the first initialization steps send one nibble each.',
  'Выкиньте один из трёх первых шагов 0x30 и проверьте, запустится ли экран. Измените строки текста.':
    'Drop one of the first three 0x30 steps and check whether the screen still starts. Change the text lines.',
  'Прочитать регистр датчика температуры по I²C и напечатать значение со знаком.':
    'Read the temperature sensor register over I²C and print the signed value.',
  'Старший байт — целые градусы в дополнительном коде, старший бит младшего — половинка; терминал печатает T=+ 25.5 C.':
    "The high byte is whole degrees in two's complement, the top bit of the low byte is the half degree; the terminal prints T=+ 25.5 C.",
  'Передвиньте ползунок ниже нуля и убедитесь, что печатается минус. Увеличьте паузу между опросами.':
    'Move the slider below zero and check that a minus sign is printed. Increase the pause between polls.',
  'Прочитать время из часов DS1307 в BCD и показать его на индикаторе TM1637.':
    'Read the time from the DS1307 clock in BCD and show it on the TM1637 display.',
  'Секунды, минуты и часы лежат в регистрах 0…2 как BCD; двоеточие мигает от младшего бита секунд.':
    'Seconds, minutes and hours are in registers 0…2 as BCD; the colon blinks from the lowest bit of the seconds.',
  'Запишите другое время в программе обмена. Уберите сброс бита CH и посмотрите, что часы стоят.':
    'Write a different time in the transfer program. Remove the CH bit reset and see that the clock stands still.',
  'Хранить число в EEPROM по I²C и учитывать время записи ячейки.':
    'Store a number in an I²C EEPROM and account for the cell write time.',
  'Счётчик растёт при каждом запуске схемы; во время записи микросхема не отвечает на свой адрес.':
    'The counter grows on every start of the design; during a write the chip does not answer to its address.',
  'Сократите ожидание после записи до нуля и посмотрите, чем кончится чтение; верните 8 мс.':
    'Cut the wait after the write to zero and see how the read ends; then restore 8 ms.',
  'Вывести картинку на матрицу 8×8 кадрами по 16 бит через MAX7219.':
    'Draw a picture on the 8×8 matrix with 16-bit frames through the MAX7219.',
  'Микросхема после включения спит; после четырёх кадров настройки восемь кадров строк рисуют смайлик.':
    'After power-up the chip sleeps; after four setup frames, eight row frames draw a smiley.',
  'Нарисуйте свою картинку в функции face. Поменяйте регистр яркости 0x0A на 0x0F.':
    'Draw your own picture in the face function. Change the brightness register 0x0A to 0x0F.',
  'Пользоваться двухпроводным протоколом TM1637: START, STOP, ACK и порядок бит.':
    'Use the two-wire TM1637 protocol: START, STOP, ACK and the bit order.',
  'Каждый байт подтверждается нулём на DIO; три «разговора» за кадр: режим, цифры, яркость.':
    'Each byte is acknowledged by a zero on DIO; three "conversations" per frame: mode, digits, brightness.',
  'Нажмите S2 для паузы и S1 для сброса. Поменяйте яркость в параметре BRIGHTNESS модуля tm1637_show.':
    'Press S2 to pause and S1 to reset. Change the brightness in the BRIGHTNESS parameter of the tm1637_show module.',
  'Сформировать импульсы WS2812B заданной длины и передать по ним цвета.':
    'Generate WS2812B pulses of a given length and send colors with them.',
  'Нулевой бит — 11 тактов высокого уровня, единичный — 22; пауза дольше 50 мкс защёлкивает цвета.':
    'A zero bit is 11 clock cycles high, a one bit is 22; a pause longer than 50 µs latches the colors.',
  'Измените сдвиг между светодиодами с 32 на 16 или FRAME_DELAY на 540000 и сравните скорость радуги.':
    'Change the shift between LEDs from 32 to 16 or FRAME_DELAY to 540000 and compare the speed of the rainbow.',
  'Измерить расстояние по длине импульса дальномера и вывести его десятичными цифрами.':
    'Measure the distance from the length of the rangefinder pulse and show it with decimal digits.',
  'Echo длится 58 мкс на сантиметр; расстояние разбивается на сотни, десятки и единицы для индикатора.':
    'The echo lasts 58 µs per centimeter; the distance is split into hundreds, tens and units for the display.',
  'Передвиньте ползунок до 400 см и обратно до 2 см. Подумайте, почему настоящему echo нужен делитель 5 В → 3,3 В.':
    'Move the slider to 400 cm and back to 2 cm. Think about why a real echo needs a 5 V to 3.3 V divider.',
  'Принять 40 бит по одному проводу, различая нули и единицы по длине импульса.':
    'Receive 40 bits over a single wire, telling zeros from ones by the pulse length.',
  'После старт-импульса 20 мс датчик отвечает 80 + 80 мкс и 40 битами; контрольная сумма — сумма четырёх байтов.':
    'After a 20 ms start pulse the sensor replies with 80 + 80 µs and 40 bits; the checksum is the sum of four bytes.',
  'Меняйте ползунки температуры и влажности. Поставьте порог 40 мкс на 100 мкс и посмотрите, как ухудшатся данные.':
    'Change the temperature and humidity sliders. Set the threshold to 40 µs out of 100 µs and see how the data gets worse.',
  'Декодировать кадр ИК-протокола NEC по длинам импульсов и пауз.':
    'Decode an NEC infrared protocol frame from the lengths of pulses and pauses.',
  'Заголовок 9 мс + 4,5 мс, затем 32 бита: пауза 562 мкс — ноль, 1,69 мс — единица; вторая половина — инверсия.':
    'A header of 9 ms + 4.5 ms, then 32 bits: a 562 µs pause is a zero, 1.69 ms is a one; the second half is the inverse.',
  'Назначьте кнопкам пульта другие действия, например яркость или режим бегущего огня.':
    'Assign other actions to the remote buttons, for example brightness or the running-light mode.',
  'Принять скан-коды PS/2 по спаду тактов клавиатуры и проверить нечётность.':
    'Receive PS/2 scan codes on the falling edge of the keyboard clock and check the odd parity.',
  'Одиннадцать бит на байт: старт, данные младшим вперёд, нечётность, стоп; при отпускании идёт F0 и код.':
    'Eleven bits per byte: start, data least significant bit first, odd parity, stop; on release F0 and the code are sent.',
  'Нажмите две клавиши подряд, потом отпустите; найдите в таблице ещё одну клавишу и добавьте её.':
    'Press two keys in a row, then release them; find one more key in the table and add it.',
  'Прочитать АЦП по SPI и превратить число в шкалу светодиодов и ШИМ.':
    'Read the ADC over SPI and turn the number into an LED bar and a PWM signal.',
  'За 24 такта SPI приходит нулевой бит и десять бит результата; светодиод на выходе ШИМ меняет яркость.':
    'In 24 SPI clock cycles a zero bit and ten result bits arrive; the LED on the PWM output changes brightness.',
  'Передвиньте потенциометр от 0 до 1023. Прочтите канал 1 вместо канала 0: там нулевой вход.':
    'Move the potentiometer from 0 to 1023. Read channel 1 instead of channel 0: it is the zero input.',
  'Светодиод: мигание': 'LED: blinking',
  'Внешний светодиод мигает от делителя частоты.': 'An external LED blinks from a clock divider.',
  'Заставить внешний светодиод мигать, поделив такт платы счётчиком.':
    'Make an external LED blink by dividing the board clock with a counter.',
  'Светодиод на столе и LED0 платы мигают вместе: у внешнего 1 — горит, у LED0 наоборот.':
    'The LED on the bench and the board LED0 blink together: the external one is on at 1, LED0 is the opposite.',
  'Поменяйте DIV на 19 и на 23. В свойствах светодиода включите «горит при 0» и объясните результат.':
    'Change DIV to 19 and to 23. In the LED properties turn on "lit at 0" and explain the result.',
  'Светодиод: плавное дыхание (ШИМ)': 'LED: smooth breathing (PWM)',
  'Яркость светодиода плавно растёт и падает за счёт ШИМ.':
    'The LED brightness smoothly rises and falls thanks to PWM.',
  'Плавно менять яркость светодиода широтно-импульсной модуляцией.':
    'Change the LED brightness smoothly with pulse-width modulation.',
  'Светодиод разгорается и гаснет без ступенек: меняется доля времени, когда на выводе 1.':
    'The LED glows up and fades without steps: what changes is the share of time the pin is at 1.',
  'Поставьте вольтметр на тот же контакт и следите за средним напряжением. Сделайте level постоянным.':
    'Put a voltmeter on the same contact and watch the average voltage. Make level constant.',
  'RGB-светодиод: восемь цветов': 'RGB LED: eight colors',
  'Трёхбитный счётчик перебирает все сочетания красного, зелёного и синего.':
    'A three-bit counter goes through all combinations of red, green and blue.',
  'Получить восемь цветов из трёх однобитных каналов RGB.':
    'Get eight colors from three one-bit RGB channels.',
  'Цвет меняется по порядку двоичного счёта; LED0–LED2 платы показывают его номер.':
    "The color changes in binary counting order; the board's LED0–LED2 show its number.",
  'Поменяйте порядок цветов кодом Грея. В свойствах выберите «общий анод» и исправьте схему.':
    'Change the color order using Gray code. In the properties choose "common anode" and fix the circuit.',
  'RGB-светодиод: плавная радуга': 'RGB LED: smooth rainbow',
  'Три ШИМ-канала со сдвигом дают плавный переход цветов.':
    'Three PWM channels with an offset give a smooth color transition.',
  'Смешать цвета тремя ШИМ-каналами с разной скважностью.':
    'Mix colors with three PWM channels of different duty cycles.',
  'Красный перетекает в зелёный, тот в синий и обратно в красный без резких скачков.':
    'Red flows into green, which flows into blue and back into red without sudden jumps.',
  'Замедлите переход, расширив slow. Остановите phase кнопкой и подберите свой цвет.':
    'Slow the transition down by widening slow. Stop phase with a button and choose your own color.',
  'Двухцветный светодиод: красный и зелёный по очереди': 'Bicolor LED: red and green in turn',
  'Полярность на двух выводах задаёт цвет.': 'The polarity on the two pins sets the color.',
  'Менять цвет двухвыводного светодиода, переворачивая полярность.':
    'Change the color of a two-lead LED by reversing the polarity.',
  'Цвет меняется, когда уровни на P и N меняются местами; ток идёт то в одну, то в другую сторону.':
    'The color changes when the levels on P and N are swapped; the current flows one way, then the other.',
  'Подайте на оба вывода один и тот же сигнал и убедитесь, что светодиод гаснет.':
    'Apply the same signal to both pins and check that the LED goes dark.',
  'Двухцветный светодиод: цвет по кнопкам': 'Bicolor LED: color from the buttons',
  'S1 включает красный, S2 — зелёный.': 'S1 turns on red, S2 turns on green.',
  'Управлять двухцветным светодиодом двумя кнопками без такта.':
    'Drive a bicolor LED with two buttons and no clock.',
  'Одна кнопка — один цвет. Обе кнопки вместе дают равные уровни, и светодиод гаснет.':
    'One button, one color. Both buttons together give equal levels, and the LED goes dark.',
  'Сделайте так, чтобы при двух нажатых кнопках горел красный: измените выражение для lead_n.':
    'Make it so that red is lit when both buttons are pressed: change the expression for lead_n.',
  'Линейка светодиодов: бегущий огонь': 'LED bar: running light',
  'Единица бежит по восьми светодиодам сдвиговым регистром.':
    'A one runs along eight LEDs through a shift register.',
  'Построить бегущий огонь на кольцевом сдвиговом регистре из восьми бит.':
    'Build a running light on an eight-bit ring shift register.',
  'Горит ровно один светодиод; после восьмого огонь возвращается на первый.':
    'Exactly one LED is lit; after the eighth the light returns to the first.',
  'Запустите две единицы сразу. Смените направление: {ring[0], ring[7:1]}.':
    'Start two ones at once. Change the direction: {ring[0], ring[7:1]}.',
  'Линейка светодиодов: шкала уровня': 'LED bar: level meter',
  'Кнопки S1 и S2 поднимают и опускают столбик.': 'Buttons S1 and S2 raise and lower the bar.',
  'Показать число столбиком светодиодов — термометрическим кодом.':
    'Show a number as a bar of LEDs using a thermometer code.',
  'Столбик растёт и убывает на один светодиод за нажатие; LED платы показывают то же число двоично.':
    'The bar grows and shrinks by one LED per press; the board LEDs show the same number in binary.',
  'Сделайте так, чтобы при переполнении столбик начинался с нуля. Покажите только верхнюю точку столбика.':
    'Make the bar start from zero on overflow. Show only the top point of the bar.',
  'Кольцо светодиодов: огонь по кругу': 'LED ring: light going around',
  'Одна точка бежит по двенадцати светодиодам.': 'One dot runs around twelve LEDs.',
  'Провести огонь по кольцу из двенадцати светодиодов.':
    'Run a light around a ring of twelve LEDs.',
  'Точка обходит круг за двенадцать шагов и не останавливается на стыке.':
    'The dot goes around the circle in twelve steps and does not stop at the seam.',
  'Добавьте вторую точку напротив первой. Пустите огонь против часовой стрелки.':
    'Add a second dot opposite the first. Run the light counterclockwise.',
  'Кольцо светодиодов: заполнение': 'LED ring: filling',
  'Круг заполняется по одному светодиоду и гаснет целиком.':
    'The circle fills up one LED at a time and then goes dark all at once.',
  'Заполнять кольцо светодиодов по счётчику сравнением номера с порогом.':
    'Fill the LED ring from a counter by comparing the index with a threshold.',
  'Светодиоды зажигаются по одному и все гаснут, когда счётчик возвращается в ноль.':
    'The LEDs light up one by one and all go out when the counter returns to zero.',
  'Сделайте убывание вместо сброса. Замените generate одной строкой со сдвигом.':
    'Make it count down instead of resetting. Replace generate with a single line using a shift.',
  'Светофор: автомат из четырёх фаз': 'Traffic light: a four-phase state machine',
  'Красный, красный с жёлтым, зелёный, жёлтый.': 'Red, red with yellow, green, yellow.',
  'Описать светофор конечным автоматом с длительностью каждой фазы.':
    'Describe a traffic light as a finite state machine with a duration for each phase.',
  'Лампы идут в порядке красный, красный с жёлтым, зелёный, жёлтый; номер фазы виден на LED платы.':
    'The lamps go in the order red, red with yellow, green, yellow; the phase number is visible on the board LEDs.',
  'Добавьте мигающий зелёный перед жёлтым. Сделайте красный вдвое длиннее зелёного.':
    'Add a blinking green before the yellow. Make red twice as long as green.',
  'Светофор: кнопка пешехода': 'Traffic light: pedestrian button',
  'Зелёный горит, пока пешеход не нажмёт S1.': 'Green stays lit until a pedestrian presses S1.',
  'Запомнить запрос пешехода и обслужить его автоматом светофора.':
    'Remember a pedestrian request and serve it with the traffic-light state machine.',
  'После нажатия S1 загорается LED0, зелёный сменяется жёлтым и красным, затем всё возвращается.':
    'After S1 is pressed LED0 lights up, green changes to yellow and red, and then everything returns.',
  'Запретите новый запрос раньше, чем машины проедут восемь тиков. Добавьте вторую кнопку.':
    'Forbid a new request until the cars have driven for eight ticks. Add a second button.',
  'Лазерный модуль: луч по кнопке': 'Laser module: beam on button',
  'Пока нажата S1, лазер светит.': 'While S1 is pressed, the laser shines.',
  'Включать лазерный модуль уровнем с кнопки без единого триггера.':
    'Turn on a laser module with the button level without a single flip-flop.',
  'Луч и LED0 платы повторяют кнопку S1 сразу, без задержки на такт.':
    "The beam and the board's LED0 repeat button S1 immediately, with no clock delay.",
  'Добавьте S2 как блокировку: луч включается, только если S2 отпущена.':
    'Add S2 as an inhibit: the beam turns on only if S2 is released.',
  'Лазерный модуль: сигнал SOS': 'Laser module: SOS signal',
  'Луч передаёт три коротких, три длинных и три коротких вспышки.':
    'The beam sends three short, three long and three short flashes.',
  'Передать сообщение азбукой Морзе, читая биты из константы по указателю.':
    'Send a message in Morse code, reading bits from a constant by a pointer.',
  'Луч даёт три коротких вспышки, три длинных и снова три коротких, затем длинную паузу.':
    'The beam gives three short flashes, three long ones and three short again, then a long pause.',
  'Закодируйте другое слово. Замедлите передачу, не меняя константу.':
    'Encode another word. Slow the transmission down without changing the constant.',
  'Индикатор, 1 разряд: счёт от 0 до 9': '1-digit display: counting 0 to 9',
  'Счётчик и дешифратор семи сегментов.': 'A counter and a seven-segment decoder.',
  'Показать цифры от 0 до 9 на одном семисегментном индикаторе через дешифратор.':
    'Show digits 0 to 9 on one seven-segment display through a decoder.',
  'Цифры сменяются по порядку; LED платы показывают то же число в двоичном виде.':
    'The digits change in order; the board LEDs show the same number in binary.',
  'Считайте до F. Выберите в свойствах «общий анод» и инвертируйте сегменты.':
    'Count up to F. In the properties choose "common anode" and invert the segments.',
  'Индикатор, 1 разряд: счётчик нажатий': '1-digit display: press counter',
  'Каждое нажатие S1 прибавляет единицу, S2 сбрасывает.': 'Each press of S1 adds one, S2 resets.',
  'Считать нажатия кнопки по фронту и показывать их шестнадцатеричной цифрой.':
    'Count button presses by the edge and show them as a hexadecimal digit.',
  'Одно нажатие — плюс один, сколько бы ни держали кнопку; после F идёт 0.':
    'One press adds one, however long the button is held; after F comes 0.',
  'Уберите выделение фронта и посмотрите, что будет при удержании. Добавьте счёт назад.':
    'Remove the edge detection and see what happens when the button is held. Add counting down.',
  'Индикатор на 4 разряда: динамическая индикация': '4-digit display: multiplexing',
  'Четыре цифры на общих сегментах зажигаются по очереди.':
    'Four digits on shared segments are lit in turn.',
  'Вывести четырёхзначное число динамической индикацией на общих сегментах.':
    'Show a four-digit number with multiplexing on shared segments.',
  'Все четыре цифры видны одновременно, хотя в каждый момент горит одна; младшая цифра бежит быстрее всех.':
    'All four digits look lit at the same time, although only one is lit at any moment; the lowest digit runs fastest.',
  'Замедлите развёртку (возьмите div[18:17]) и увидите разряды по одному. Погасите ведущие нули.':
    'Slow the scan down (take div[18:17]) and you will see the digits one at a time. Blank the leading zeros.',
  'Индикатор на 4 разряда: секундомер': '4-digit display: stopwatch',
  'S1 запускает и останавливает счёт, S2 сбрасывает.': 'S1 starts and stops counting, S2 resets.',
  'Собрать секундомер с пуском, остановкой и сбросом на четырёхразрядном индикаторе.':
    'Build a stopwatch with start, stop and reset on a four-digit display.',
  'S1 запускает и останавливает счёт, LED0 горит во время хода, S2 обнуляет показания.':
    'S1 starts and stops counting, LED0 is lit while it runs, S2 zeroes the readout.',
  'Сделайте круг: S2 при работающем секундомере замораживает показания, а счёт идёт дальше.':
    'Add a lap function: S2 while the stopwatch runs freezes the display while counting goes on.',
  'Светодиодная матрица: картинка развёрткой': 'LED matrix: picture by scanning',
  'Смайлик 8×8 рисуется по строкам.': 'An 8×8 smiley is drawn row by row.',
  'Нарисовать картинку на матрице 8×8 построчной развёрткой.':
    'Draw a picture on an 8×8 matrix with row-by-row scanning.',
  'Виден целый смайлик, хотя в каждый момент включена одна строка из восьми.':
    'The whole smiley is visible, although only one of the eight rows is on at any moment.',
  'Нарисуйте свою картинку. Замедлите развёртку и посмотрите, как строки зажигаются по одной.':
    'Draw your own picture. Slow the scan down and see how the rows light up one by one.',
  'Светодиодная матрица: прыгающая точка': 'LED matrix: bouncing dot',
  'Точка летает по полю и отскакивает от краёв.':
    'A dot flies over the field and bounces off the edges.',
  'Двигать точку по матрице и отражать её от границ поля.':
    'Move a dot across the matrix and reflect it from the field borders.',
  'Точка идёт по диагонали и меняет направление у каждого края; координаты видны на LED платы.':
    'The dot moves diagonally and changes direction at each edge; the coordinates are visible on the board LEDs.',
  'Дайте точке разную скорость по x и y. Добавьте вторую точку — понадобится развёртка.':
    'Give the dot different speeds in x and y. Add a second dot, which will need scanning.',
  'Шестнадцатеричный индикатор: счёт от 0 до F': 'Hex display: counting 0 to F',
  'Индикатор сам расшифровывает четыре бита.': 'The display decodes four bits by itself.',
  'Связать четыре двоичных разряда с шестнадцатеричной цифрой на индикаторе.':
    'Link four binary bits to a hexadecimal digit on the display.',
  'После 9 идут A, B, C, D, E, F; четыре LED платы показывают те же биты.':
    'After 9 come A, B, C, D, E, F; the four board LEDs show the same bits.',
  'Считайте через два. Перепутайте провода D0 и D3 и объясните, что стало с цифрами.':
    'Count by two. Swap wires D0 and D3 and explain what happened to the digits.',
  'Шестнадцатеричный индикатор: плюс и минус': 'Hex display: plus and minus',
  'S1 прибавляет единицу, S2 вычитает.': 'S1 adds one, S2 subtracts.',
  'Построить реверсивный счётчик с двумя кнопками и вывести его в шестнадцатеричном виде.':
    'Build an up/down counter with two buttons and show it in hexadecimal.',
  'От F плюс один даёт 0, от 0 минус один даёт F: число четырёхбитное и считает по кругу.':
    'F plus one gives 0, and 0 minus one gives F: the number is four bits wide and counts in a circle.',
  'Запретите переход через F и через 0. Сделайте шаг 3 для S1.':
    'Forbid wrapping past F and past 0. Make the step 3 for S1.',
  'Индикатор с дешифратором: десятичный счёт': 'Display with decoder: decimal counting',
  'Двоично-десятичный счётчик от 0 до 9.': 'A binary-coded decimal counter from 0 to 9.',
  'Считать в двоично-десятичном коде и не выходить за девятку.':
    'Count in binary-coded decimal and never go past nine.',
  'После 9 идёт 0, а не A: сравнение с девяткой сбрасывает счётчик.':
    'After 9 comes 0, not A: comparison with nine resets the counter.',
  'Уберите сброс на девятке и посмотрите, что показывает индикатор для кодов 10–15.':
    'Remove the reset at nine and see what the display shows for the codes 10–15.',
  'Индикатор с дешифратором: игральный кубик': 'Display with decoder: dice',
  'Пока нажата S1, цифры 1–6 быстро меняются; отпустили — выпало число.':
    'While S1 is pressed the digits 1–6 change quickly; when released, a number comes up.',
  'Получить случайное число от 1 до 6 из быстрого счётчика и момента отпускания кнопки.':
    'Get a random number from 1 to 6 from a fast counter and the moment the button is released.',
  'Пока S1 нажата, цифра сливается; после отпускания остаётся одно число от 1 до 6.':
    'While S1 is pressed the digit is a blur; after release a single number from 1 to 6 stays.',
  'Сделайте кубик на 1–9. Посчитайте в лаборатории на скорости 2 такта в секунду, как идёт счёт.':
    'Make a dice for 1–9. In the lab, at a speed of 2 clock cycles per second, watch how the counting goes.',
  'Индикатор байта: счётчик от 0 до 255': 'Byte display: counter from 0 to 255',
  'Восемь бит показаны десятичным, шестнадцатеричным и двоичным числом.':
    'Eight bits are shown as a decimal, hexadecimal and binary number.',
  'Сопоставить двоичную, шестнадцатеричную и десятичную запись одного байта.':
    'Compare the binary, hexadecimal and decimal notation of one byte.',
  'Три записи меняются вместе; после 255 (0xFF) счётчик возвращается в 0.':
    'The three notations change together; after 255 (0xFF) the counter returns to 0.',
  'Считайте с шагом 16 и посмотрите на шестнадцатеричную запись. Остановите счёт на 100.':
    'Count in steps of 16 and look at the hexadecimal notation. Stop the count at 100.',
  'Индикатор байта: псевдослучайные числа': 'Byte display: pseudo-random numbers',
  'Сдвиговый регистр с обратной связью выдаёт неповторяющийся ряд.':
    'A shift register with feedback produces a non-repeating sequence.',
  'Построить генератор псевдослучайных чисел на сдвиговом регистре с обратной связью.':
    'Build a pseudo-random number generator on a shift register with feedback.',
  'Числа идут без видимого порядка и повторяются только через 255 шагов.':
    'The numbers come in no visible order and repeat only after 255 steps.',
  'Запишите в регистр ноль и убедитесь, что он застрял. Поменяйте отводы и найдите короткий цикл.':
    'Load the register with zero and check that it gets stuck. Change the taps and find a short cycle.',
  'Счётчик импульсов: считаем фронты': 'Pulse counter: counting edges',
  'Схема шлёт импульсы, прибор считает их; S1 обнуляет.':
    'The design sends pulses and the instrument counts them; S1 zeroes it.',
  'Отличить импульс от уровня: счётчик считает фронты, а не длительность.':
    'Tell a pulse from a level: the counter counts edges, not duration.',
  'Показания растут на единицу за tick, какой бы короткий ни был импульс; S1 держит ноль.':
    'The readout grows by one per tick however short the pulse is; S1 holds zero.',
  'Сделайте импульс длиной полтика — счёт не изменится. Поставьте логический анализатор на CLK.':
    'Make a pulse half a tick long and the count will not change. Put a logic analyzer on CLK.',
  'Счётчик импульсов: пачка по кнопке': 'Pulse counter: burst on button press',
  'Нажатие S1 отправляет ровно пять импульсов.': 'Pressing S1 sends exactly five pulses.',
  'Выдать заданное число импульсов по одному нажатию кнопки.':
    'Send a given number of pulses on a single button press.',
  'Каждое нажатие S1 прибавляет к показаниям ровно пять; LED0 горит, пока идёт пачка.':
    'Each press of S1 adds exactly five to the readout; LED0 is lit while the burst is running.',
  'Сделайте пачку из семи импульсов. Запретите новую пачку, пока удерживается S1.':
    'Make a burst of seven pulses. Forbid a new burst while S1 is held down.',
  'Кнопка: зажигаем светодиод': 'Button: lighting an LED',
  'Внешняя кнопка напрямую управляет LED0.': 'An external button drives LED0 directly.',
  'Подключить внешнюю кнопку ко входу ПЛИС и учесть полярность светодиода.':
    'Connect an external button to an FPGA input and take the LED polarity into account.',
  'LED0 горит ровно столько, сколько нажата кнопка на столе.':
    'LED0 is lit exactly as long as the button on the bench is pressed.',
  'В свойствах кнопки включите «нажата = 0» и исправьте схему. Включите фиксацию.':
    'In the button properties turn on "pressed = 0" and fix the circuit. Turn on latching.',
  'Кнопка: включить и выключить одним нажатием': 'Button: switch on and off with one press',
  'Каждое нажатие переворачивает состояние светодиода.': 'Each press toggles the state of the LED.',
  'Сделать из кнопки без фиксации выключатель с памятью на одном триггере.':
    'Turn a non-latching button into a switch with memory on a single flip-flop.',
  'Светодиод меняет состояние в момент нажатия и не реагирует на отпускание.':
    'The LED changes state at the moment of the press and does not react to the release.',
  'Переключайте по отпусканию. Уберите выделение фронта и объясните мерцание.':
    'Toggle on release. Remove the edge detection and explain the flicker.',
  'Ползунковый переключатель': 'Slide switch',
  ползунок: 'the slider',
  Тумблер: 'Toggle switch',
  тумблер: 'the toggle',
  'Клавишный выключатель': 'Rocker switch',
  клавишу: 'the rocker key',
  '{name}: положение на светодиоде': '{name}: position on an LED',
  'LED0 показывает, в каком положении {what}.': 'LED0 shows which position {what} is in.',
  'Прочитать положение детали «{name}» и показать его светодиодом.':
    'Read the position of the "{name}" part and show it with an LED.',
  'LED0 горит, пока {what} во включённом положении, и не гаснет, когда руку убрали.':
    'LED0 is lit while {what} is in the on position, and stays lit when the hand is removed.',
  'Добавьте кнопку S1: пусть LED0 горит только при включённом переключателе и нажатой S1.':
    'Add button S1: let LED0 be lit only when the switch is on and S1 is pressed.',
  '{name}: быстро или медленно': '{name}: fast or slow',
  'Переключатель выбирает частоту мигания.': 'The switch chooses the blink rate.',
  'Выбрать один из двух сигналов мультиплексором по положению детали «{name}».':
    'Choose one of two signals with a multiplexer by the position of the "{name}" part.',
  'В одном положении LED0 мигает медленно, в другом — вчетверо быстрее.':
    'In one position LED0 blinks slowly, in the other four times faster.',
  'Добавьте S1 как второй адресный бит и выбирайте из четырёх частот.':
    'Add S1 as a second address bit and choose from four frequencies.',
  '{name}: направление бегущего огня': '{name}: running-light direction',
  'Переключатель разворачивает огонь на светодиодах платы.':
    'The switch reverses the light on the board LEDs.',
  'Менять направление сдвига регистра по положению детали «{name}».':
    'Change the direction of the register shift by the position of the "{name}" part.',
  'Огонь бежит в одну сторону, а после переключения разворачивается с того же места.':
    'The light runs one way, and after switching it turns around from the same place.',
  'Сделайте остановку огня кнопкой S1. Запустите два огня навстречу друг другу.':
    'Stop the light with button S1. Run two lights toward each other.',
  '{name}: пуск и пауза счётчика': '{name}: counter run and pause',
  'Счётчик на светодиодах идёт, только пока переключатель включён.':
    'The counter on the LEDs runs only while the switch is on.',
  'Остановить и продолжить счёт сигналом разрешения от детали «{name}».':
    'Stop and resume counting with an enable signal from the "{name}" part.',
  'Число на светодиодах растёт, замирает при выключении и продолжается с того же места.':
    'The number on the LEDs grows, freezes when switched off and continues from the same place.',
  'Добавьте сброс кнопкой S1. Сделайте счёт назад в выключенном положении.':
    'Add a reset with button S1. Make it count down in the off position.',
  'DIP-переключатель: четыре бита на светодиодах': 'DIP switch: four bits on LEDs',
  'Каждый движок управляет своим светодиодом.': 'Each slider drives its own LED.',
  'Набрать двоичное число движками DIP-переключателя и прочитать его в схеме.':
    'Dial in a binary number with the DIP switch sliders and read it in the design.',
  'Каждый движок зажигает свой светодиод; вместе они образуют число от 0 до 15.':
    'Each slider lights its own LED; together they form a number from 0 to 15.',
  'Зажгите LED5, только когда набрано число 10. В свойствах поставьте 8 движков.':
    'Light LED5 only when the number 10 is dialed in. Set 8 sliders in the properties.',
  'DIP-переключатель: сумматор двух чисел': 'DIP switch: adder of two numbers',
  'Два двухбитных числа складываются, сумма видна на светодиодах.':
    'Two two-bit numbers are added and the sum is shown on the LEDs.',
  'Сложить два двухбитных числа и увидеть перенос в третьем разряде.':
    'Add two two-bit numbers and see the carry in the third bit.',
  'LED0–LED2 показывают сумму; при 3 + 3 загорается перенос и получается 6.':
    'LED0–LED2 show the sum; at 3 + 3 the carry lights up and the result is 6.',
  'Сделайте вычитание и покажите знак на LED5. Поставьте шестнадцатеричный индикатор.':
    'Make subtraction and show the sign on LED5. Add a hexadecimal display.',
  'Матричная клавиатура: опрос строк': 'Matrix keypad: row scanning',
  'Номер нажатой клавиши показывается на светодиодах.':
    'The number of the pressed key is shown on the LEDs.',
  'Опросить матричную клавиатуру по строкам и определить нажатую клавишу.':
    'Scan a matrix keypad row by row and find the pressed key.',
  'LED0–LED3 показывают номер клавиши (строка и столбец), LED5 горит, пока клавиша нажата.':
    'LED0–LED3 show the key number (row and column), LED5 is lit while a key is pressed.',
  'Переведите номер в цифру на клавише. Нажмите две клавиши в одной строке и объясните результат.':
    'Convert the number to the digit on the key. Press two keys in the same row and explain the result.',
  'Матричная клавиатура: счётчик нажатий': 'Matrix keypad: press counter',
  'Любая клавиша прибавляет единицу к числу на светодиодах.':
    'Any key adds one to the number on the LEDs.',
  'Обнаружить нажатие любой клавиши матрицы без опроса по строкам.':
    'Detect a press of any key of the matrix without scanning the rows.',
  'Число на светодиодах растёт на единицу за каждое нажатие любой клавиши.':
    'The number on the LEDs grows by one for each press of any key.',
  'Считайте только клавиши левого столбца. Объясните, почему так нельзя узнать номер клавиши.':
    'Count only the keys of the left column. Explain why this way you cannot find out the key number.',
  'Энкодер: счёт поворотов': 'Encoder: counting turns',
  'Поворот вправо прибавляет, влево убавляет.': 'A turn to the right adds, to the left subtracts.',
  'Определить направление вращения энкодера по порядку фронтов двух фаз.':
    'Find the rotation direction of an encoder from the order of edges on the two phases.',
  'Щелчок вправо прибавляет единицу, влево убавляет; нажатие ручки возвращает число 8.':
    'A click to the right adds one, to the left subtracts one; pressing the knob returns the number 8.',
  'Считайте оба фронта A — шаг станет вдвое мельче. Перепутайте провода A и B.':
    'Count both edges of A and the step becomes twice as fine. Swap wires A and B.',
  'Энкодер: регулятор яркости': 'Encoder: brightness control',
  'Ручка меняет яркость светодиода ШИМ.': 'The knob changes the LED brightness with PWM.',
  'Управлять яркостью светодиода энкодером через ШИМ с ограничением диапазона.':
    'Control LED brightness with an encoder through PWM with a limited range.',
  'Каждый щелчок меняет яркость на одну ступень из шестнадцати; у краёв уровень упирается.':
    'Each click changes the brightness by one of sixteen steps; at the ends the level stops.',
  'Сделайте шаг яркости неравномерным (квадрат уровня). Нажатием ручки включайте полную яркость.':
    'Make the brightness step nonuniform (the square of the level). Press the knob to switch to full brightness.',
  'Джойстик: пять направлений': 'Joystick: five directions',
  'Каждое направление зажигает свой светодиод.': 'Each direction lights its own LED.',
  'Прочитать пять независимых кнопок джойстика пятью входами.':
    'Read the five independent joystick buttons with five inputs.',
  'LED0–LED4 повторяют направления; LED5 не используется.':
    'LED0–LED4 repeat the directions; LED5 is not used.',
  'Зажгите LED5 при диагонали — когда нажаты два соседних направления.':
    'Light LED5 on a diagonal, when two adjacent directions are pressed.',
  'Джойстик: курсор на светодиодах': 'Joystick: cursor on LEDs',
  'Влево и вправо двигают огонёк, нажатие ставит его в середину.':
    'Left and right move the light, pressing puts it in the middle.',
  'Двигать курсор по шести позициям кнопками джойстика с остановкой у краёв.':
    'Move a cursor over six positions with the joystick buttons, stopping at the edges.',
  'Одно нажатие — один шаг огонька; у края он не перескакивает на другую сторону.':
    'One press moves the light one step; at the edge it does not jump to the other side.',
  'Сделайте переход через край по кругу. Пусть «вверх» и «вниз» прыгают на три позиции.':
    'Make it wrap around the edge. Let "up" and "down" jump by three positions.',
  'Кодовый переключатель: цифра в двоичном коде': 'Rotary code switch: digit in binary code',
  'Набранная цифра видна четырьмя битами.': 'The dialed digit is visible as four bits.',
  'Прочитать десятичную цифру кодового переключателя как четыре двоичных разряда.':
    'Read the decimal digit of a rotary code switch as four binary bits.',
  'Для цифры 5 горят LED0 и LED2: веса 1 и 4 в сумме дают 5.':
    'For the digit 5, LED0 and LED2 are lit: the weights 1 and 4 add up to 5.',
  'Зажгите LED5 для чётных цифр. В свойствах выберите диапазон 0–F.':
    'Light LED5 for even digits. In the properties choose the range 0–F.',
  'Кодовый переключатель: выбор светодиода': 'Rotary code switch: choosing an LED',
  'Цифра выбирает, какой из шести светодиодов горит.':
    'The digit chooses which of the six LEDs is lit.',
  'Построить дешифратор: двоичный номер включает ровно один выход.':
    'Build a decoder: a binary number turns on exactly one output.',
  'Горит один светодиод с номером набранной цифры; для 6–9 все погашены.':
    'One LED is lit, the one with the number of the dialed digit; for 6–9 all are off.',
  'Для цифр 6–9 зажигайте все светодиоды. Сделайте столбик вместо одной точки.':
    'For the digits 6–9 light all the LEDs. Make a bar instead of a single dot.',
  'Постоянный уровень: разрешение для кнопки': 'Constant level: enable for a button',
  'Кнопка S1 работает, только пока на входе единица.':
    'Button S1 works only while the input is one.',
  'Использовать постоянный уровень как сигнал разрешения для элемента И.':
    'Use a constant level as an enable signal for an AND gate.',
  'С единицей на входе LED0 повторяет S1; с нулём кнопка ничего не делает. LED1 показывает уровень.':
    'With one on the input LED0 repeats S1; with zero the button does nothing. LED1 shows the level.',
  'В свойствах поставьте уровень 0. Замените И на ИЛИ и объясните, что изменилось.':
    'Set the level to 0 in the properties. Replace AND with OR and explain what changed.',
  'Постоянный уровень: режим мигания': 'Constant level: blink mode',
  'Уровень на входе выбирает: мигать или гореть постоянно.':
    'The level on the input chooses: blink or stay lit.',
  'Выбрать режим работы схемы уровнем на конфигурационном входе.':
    'Choose the operating mode of the design with a level on a configuration input.',
  'При единице LED0 мигает, при нуле горит ровно; режим не меняется, пока не поменяли уровень.':
    'At one LED0 blinks, at zero it stays lit steadily; the mode does not change until the level is changed.',
  'Добавьте второй такой вход и получите четыре режима. Замените деталь переключателем.':
    'Add a second such input and get four modes. Replace the part with a switch.',
  'Датчик движения': 'Motion sensor',
  'есть движение': 'motion detected',
  проходов: 'passes',
  Геркон: 'Reed switch',
  'магнит рядом': 'magnet nearby',
  'открываний двери': 'door openings',
  'Датчик наклона': 'Tilt sensor',
  наклон: 'tilt',
  наклонов: 'tilts',
  'Сенсорная кнопка': 'Touch button',
  касание: 'touch',
  касаний: 'touches',
  'Оптический щелевой датчик': 'Slotted optical sensor',
  'щель закрыта': 'slot blocked',
  предметов: 'objects',
  'Датчик Холла': 'Hall sensor',
  'поле есть': 'field present',
  'оборотов магнита': 'magnet revolutions',
  'Концевой выключатель': 'Limit switch',
  упор: 'end stop reached',
  'касаний упора': 'end-stop hits',
  'ИК-датчик препятствия': 'IR obstacle sensor',
  препятствие: 'obstacle',
  препятствий: 'obstacles',
  'Датчик пламени': 'Flame sensor',
  огонь: 'fire',
  вспышек: 'flashes',
  'Датчик звука': 'Sound sensor',
  хлопок: 'clap',
  хлопков: 'claps',
  'Датчик уровня воды': 'Water level sensor',
  вода: 'water',
  заливов: 'floods',
  'Датчик вибрации': 'Vibration sensor',
  удар: 'knock',
  ударов: 'knocks',
  'Датчик освещённости': 'Light sensor',
  светло: 'bright',
  'включений света': 'times the light came on',
  'Датчик линии': 'Line sensor',
  линия: 'line',
  'пересечений линии': 'line crossings',
  'Датчик столкновения': 'Collision sensor',
  столкновений: 'collisions',
  'Датчик удара KY-031': 'KY-031 knock sensor',
  стуков: 'knocks',
  'Датчик встряски KY-002': 'KY-002 shock sensor',
  встряска: 'shake',
  встрясок: 'shakes',
  'Ртутный датчик наклона KY-017': 'KY-017 mercury tilt sensor',
  'Касание металла KY-036': 'KY-036 metal touch sensor',
  'касаний металла': 'metal touches',
  'Радар движения RCWL-0516': 'RCWL-0516 motion radar',
  движение: 'motion',
  'Магнитный датчик двери MC-38': 'MC-38 magnetic door sensor',
  'дверь открыта': 'door open',
  'Датчик дождя YL-83': 'YL-83 rain sensor',
  дождь: 'rain',
  'начал дождя': 'rain onsets',
  'Датчик газа MQ-2': 'MQ-2 gas sensor',
  газ: 'gas',
  'утечек газа': 'gas leaks',
  'Датчик алкоголя MQ-3': 'MQ-3 alcohol sensor',
  пары: 'vapor',
  выдохов: 'exhalations',
  'Датчик угарного газа MQ-7': 'MQ-7 carbon monoxide sensor',
  'угарный газ': 'carbon monoxide',
  'превышений угарного газа': 'carbon monoxide exceedances',
  'Качество воздуха MQ-135': 'MQ-135 air quality sensor',
  загрязнение: 'pollution',
  'загрязнений воздуха': 'air pollution episodes',
  'Датчик температуры KY-028': 'KY-028 temperature sensor',
  жарко: 'hot',
  перегревов: 'overheats',
  'Датчик Холла 49E': '49E Hall sensor',
  'Датчик влажности почвы': 'Soil moisture sensor',
  влажно: 'wet',
  поливов: 'waterings',
  'УФ-датчик GUVA-S12SD': 'GUVA-S12SD UV sensor',
  'есть УФ': 'UV present',
  'вспышек УФ': 'UV flashes',
  '{name}: сигнал с памятью': '{name}: signal with memory',
  'Срабатывание запоминается, пока его не сбросят кнопкой S1.':
    'The trigger event is remembered until it is reset with button S1.',
  'Запомнить срабатывание детали «{name}» в триггере до ручного сброса.':
    'Remember the trigger event of the "{name}" part in a flip-flop until a manual reset.',
  'LED0 горит, пока «{hit}»; LED1 остаётся гореть и после этого, пока не нажата S1.':
    'LED0 is lit while "{hit}"; LED1 stays lit afterwards until S1 is pressed.',
  'Сделайте автоматический сброс через несколько секунд. Включите зуммер по тревоге.':
    'Make an automatic reset after a few seconds. Turn on the buzzer on alarm.',
  '{name}: счётчик срабатываний': '{name}: trigger counter',
  'Схема считает, сколько раз сработал датчик.':
    'The design counts how many times the sensor has triggered.',
  'Подсчитать число {event} по фронтам сигнала детали «{name}».':
    'Count the number of {event} from the edges of the signal of the "{name}" part.',
  'Число на светодиодах растёт на единицу за каждое новое срабатывание; S1 обнуляет его.':
    'The number on the LEDs grows by one for each new trigger; S1 zeroes it.',
  'Считайте и начало, и конец срабатывания. Остановите счёт на десяти и зажгите все светодиоды.':
    'Count both the start and the end of a trigger. Stop counting at ten and light all the LEDs.',
  'Зуммер: короткие гудки': 'Buzzer: short beeps',
  'Активный зуммер пищит, пока на входе единица.': 'An active buzzer beeps while the input is one.',
  'Получить прерывистый сигнал с заданным соотношением гудка и паузы.':
    'Get an intermittent signal with a given ratio of beep to pause.',
  'Гудок занимает один тик, пауза — три; LED0 платы горит вместе со звуком.':
    "A beep takes one tick, a pause three; the board's LED0 is lit together with the sound.",
  'Сделайте два гудка подряд и длинную паузу. Включайте гудки только при нажатой S1.':
    'Make two beeps in a row and a long pause. Enable the beeps only while S1 is pressed.',
  'Зуммер: две ноты': 'Buzzer: two notes',
  'Пассивный зуммер играет ноту ля; S1 поднимает её на октаву.':
    'A passive buzzer plays the note A; S1 raises it by an octave.',
  'Получить звук нужной частоты делением такта и поднять его на октаву.':
    'Get a sound of the needed frequency by dividing the clock and raise it by an octave.',
  'Зуммер показывает 440 Гц, а при нажатой S1 — 880 Гц: вдвое выше, та же нота.':
    'The buzzer shows 440 Hz, and with S1 pressed 880 Hz: twice as high, the same note.',
  'Посчитайте полупериод для ноты до (262 Гц). Сыграйте три ноты по очереди от делителя.':
    'Calculate the half-period for the note C (262 Hz). Play three notes in turn from the divider.',
  'Реле: медленное переключение': 'Relay: slow switching',
  'Реле щёлкает раз в несколько тиков.': 'The relay clicks once every few ticks.',
  'Управлять реле редкими переключениями, пригодными для механического контакта.':
    'Drive a relay with rare switching suitable for a mechanical contact.',
  'Контакты реле замкнуты четыре тика и разомкнуты четыре; LED0 показывает то же.':
    'The relay contacts are closed for four ticks and open for four; LED0 shows the same.',
  'Попробуйте подать на реле ШИМ и объясните, почему так не делают.':
    'Try feeding PWM to the relay and explain why it is not done.',
  'Реле: включить и выключить кнопками': 'Relay: on and off with buttons',
  'S1 замыкает контакты, S2 размыкает.': 'S1 closes the contacts, S2 opens them.',
  'Собрать пускатель «пуск — стоп» на триггере с приоритетом выключения.':
    'Build a "start-stop" starter on a flip-flop with off priority.',
  'Короткое нажатие S1 включает реле надолго; S2 выключает его даже при нажатой S1.':
    'A short press of S1 turns the relay on for a long time; S2 turns it off even while S1 is pressed.',
  'Отдайте приоритет включению и сравните. Добавьте автоматическое выключение по таймеру.':
    'Give priority to turning on and compare. Add automatic turn-off by a timer.',
  'Мотор: четыре скорости': 'Motor: four speeds',
  'S1 переключает заполнение ШИМ: 0, 25, 50 и 100 %.':
    'S1 switches the PWM duty cycle: 0, 25, 50 and 100 %.',
  'Задать скорость мотора заполнением ШИМ и переключать её кнопкой.':
    'Set the motor speed with the PWM duty cycle and switch it with a button.',
  'Мотор стоит, крутится на четверть, на половину и на полную скорость; номер ступени на LED платы.':
    'The motor stands still, then runs at a quarter, half and full speed; the step number is on the board LEDs.',
  'Добавьте ступень 75 %. Увеличьте разрядность ШИМ до 10 бит.':
    'Add a 75 % step. Increase the PWM resolution to 10 bits.',
  'Мотор: плавный разгон': 'Motor: smooth acceleration',
  'Скорость растёт постепенно; S1 запускает разгон заново.':
    'The speed grows gradually; S1 restarts the acceleration.',
  'Плавно разогнать мотор, постепенно увеличивая заполнение ШИМ.':
    'Accelerate a motor smoothly by gradually increasing the PWM duty cycle.',
  'После сброса мотор трогается медленно и набирает скорость; LED платы показывают заполнение.':
    'After reset the motor starts slowly and picks up speed; the board LEDs show the duty cycle.',
  'Добавьте плавное торможение по S2. Сделайте разгон вдвое быстрее торможения.':
    'Add smooth braking with S2. Make acceleration twice as fast as braking.',
  'Вентилятор: больше и меньше': 'Fan: more and less',
  'S1 прибавляет обороты, S2 убавляет.': 'S1 raises the speed, S2 lowers it.',
  'Регулировать обороты вентилятора двумя кнопками через ступени ШИМ.':
    'Adjust the fan speed with two buttons through PWM steps.',
  'Обороты меняются на ступень за нажатие; на нулевой ступени вентилятор стоит.':
    'The speed changes by one step per press; at step zero the fan stands still.',
  'Запретите ступени ниже второй: настоящий вентилятор на малом заполнении не стартует.':
    'Forbid steps below the second: a real fan does not start at a low duty cycle.',
  'Вентилятор: волна оборотов': 'Fan: speed wave',
  'Обороты сами плавно растут и падают.': 'The speed rises and falls smoothly on its own.',
  'Получить треугольный закон изменения оборотов из пилообразного счётчика.':
    'Get a triangular speed profile from a sawtooth counter.',
  'Обороты плавно растут до максимума и так же плавно падают до нуля, без скачка.':
    'The speed grows smoothly to the maximum and falls just as smoothly to zero, with no jump.',
  'Ограничьте обороты снизу четвертью. Сделайте пилу вместо треугольника.':
    'Limit the speed from below to a quarter. Make a sawtooth instead of a triangle.',
  'Вибромотор: отклик на кнопку': 'Vibration motor: response to a button',
  'Мотор вибрирует, пока нажата S1.': 'The motor vibrates while S1 is pressed.',
  'Дать тактильный отклик на нажатие кнопки прямым соединением входа с выходом.':
    'Give tactile feedback to a button press by connecting the input directly to the output.',
  'Вибромотор и LED0 работают ровно столько, сколько нажата S1.':
    'The vibration motor and LED0 work exactly as long as S1 is pressed.',
  'Ограничьте вибрацию одним коротким импульсом на каждое нажатие.':
    'Limit the vibration to one short pulse per press.',
  'Вибромотор: двойной сигнал': 'Vibration motor: double signal',
  'Два коротких импульса и пауза, как уведомление.':
    'Two short pulses and a pause, like a notification.',
  'Воспроизвести узор вибрации по битам константы.':
    'Play back a vibration pattern from the bits of a constant.',
  'Мотор даёт два коротких толчка подряд и молчит до конца цикла.':
    'The motor gives two short buzzes in a row and stays quiet until the end of the cycle.',
  'Задайте узор «длинный — короткий — короткий». Запускайте узор один раз по кнопке S1.':
    'Set the pattern "long, short, short". Run the pattern once on button S1.',
  'Сервопривод: качание': 'Servo: sweeping',
  'Вал ходит от 0° до 180° и обратно.': 'The shaft goes from 0° to 180° and back.',
  'Сформировать импульс сервопривода заданной длительности с периодом 20 мс.':
    'Generate a servo pulse of a given duration with a period of 20 ms.',
  'Стрелка идёт от 0° к 180° и обратно шагами по 9°; LED0 показывает направление.':
    'The arm goes from 0° to 180° and back in steps of 9°; LED0 shows the direction.',
  'Поставьте логический анализатор на импульс и измерьте его. Остановите вал на 90°.':
    'Put a logic analyzer on the pulse and measure it. Stop the shaft at 90°.',
  'Сервопривод: три положения': 'Servo: three positions',
  'S1 ставит вал в 0°, S2 — в 180°, без кнопок — середина.':
    'S1 sets the shaft to 0°, S2 to 180°, with no buttons it is the middle.',
  'Выбрать угол сервопривода длительностью импульса: 1, 1,5 и 2 миллисекунды.':
    'Choose the servo angle by the pulse duration: 1, 1.5 and 2 milliseconds.',
  'Вал стоит на 90°, уходит в 0° при S1 и в 180° при S2, возвращается при отпускании.':
    'The shaft stands at 90°, goes to 0° on S1 and to 180° on S2, and returns on release.',
  'Добавьте положение 45°. Запомните последнее положение, чтобы вал не возвращался.':
    'Add a 45° position. Remember the last position so that the shaft does not return.',
  'Шаговый мотор: вращение': 'Stepper motor: rotation',
  'Единица бежит по четырём обмоткам, вал шагает.':
    'A one runs through four windings and the shaft steps.',
  'Вращать шаговый мотор, включая обмотки по очереди кольцевым регистром.':
    'Rotate a stepper motor by energizing the windings in turn with a ring register.',
  'Вал поворачивается на шаг за тик; на LED платы видна бегущая обмотка.':
    'The shaft turns by one step per tick; the board LEDs show the winding that is running.',
  'Увеличьте скорость и найдите, где шаги сливаются. Остановите мотор, сняв единицу со всех обмоток.':
    'Increase the speed and find where the steps blur together. Stop the motor by removing the one from all windings.',
  'Шаговый мотор: реверс и полушаг': 'Stepper motor: reverse and half step',
  'S1 меняет направление; обмотки включаются по одной и по две.':
    'S1 changes the direction; the windings are energized one at a time and two at a time.',
  'Управлять шаговым мотором в полушаговом режиме и менять направление вращения.':
    'Drive a stepper motor in half-step mode and change the direction of rotation.',
  'Обмотки включаются то по одной, то по две; после S1 вал идёт в обратную сторону.':
    'The windings are energized now one, now two; after S1 the shaft goes the other way.',
  'Вернитесь к полному шагу и сравните ход. Сделайте ровно один оборот по нажатию S2.':
    'Return to full step and compare the motion. Make exactly one revolution per press of S2.',
  '74HC595: восемь выходов по трём проводам': '74HC595: eight outputs over three wires',
  'Бегущий огонь выдвигается в сдвиговый регистр бит за битом.':
    'A running light is shifted into the shift register bit by bit.',
  'Передать байт в сдвиговый регистр 74HC595 последовательно и защёлкнуть его.':
    'Send a byte to the 74HC595 shift register serially and latch it.',
  'Светодиоды на микросхеме меняются все сразу по импульсу STCP, хотя биты пришли по одному.':
    'The LEDs on the chip all change at once on the STCP pulse, although the bits arrived one at a time.',
  'Уберите импульс STCP и посмотрите, что останется на выходах. Передавайте младший бит первым.':
    'Remove the STCP pulse and see what remains on the outputs. Send the least significant bit first.',
  '74HC595: двоичный счётчик на выходах': '74HC595: binary counter on the outputs',
  'Восьмибитное число растёт и каждый раз целиком передаётся в регистр.':
    'An eight-bit number grows and is sent to the register in full each time.',
  'Вывести счётчик на светодиоды через последовательный интерфейс сдвигового регистра.':
    'Show a counter on LEDs through the serial interface of a shift register.',
  'Светодиоды микросхемы считают в двоичном виде, шесть младших бит повторяются на LED платы.':
    'The LEDs on the chip count in binary, and the six low bits are repeated on the board LEDs.',
  'Передавайте число в коде Грея. Сократите паузу между битами и найдите предел.':
    'Send the number in Gray code. Shorten the pause between bits and find the limit.',
  '74HC165: восемь входов по трём проводам': '74HC165: eight inputs over three wires',
  'Схема читает восемь переключателей последовательно.':
    'The design reads eight switches serially.',
  'Прочитать восемь входов через сдвиговый регистр 74HC165 по одному проводу данных.':
    'Read eight inputs through the 74HC165 shift register over one data wire.',
  'Шесть младших переключателей микросхемы повторяются на LED платы с небольшой задержкой.':
    'The six low switches of the chip are repeated on the board LEDs with a small delay.',
  'Покажите на светодиодах старшие шесть бит. Опрашивайте регистр вдвое реже.':
    'Show the six high bits on the LEDs. Poll the register half as often.',
  '74HC165: сколько переключателей включено': '74HC165: how many switches are on',
  'Схема считает единицы среди восьми входов.':
    'The design counts the ones among the eight inputs.',
  'Подсчитать число единиц в байте, принимая его последовательно.':
    'Count the number of ones in a byte while receiving it serially.',
  'На светодиодах число включённых переключателей микросхемы — от 0 до 8.':
    'The LEDs show the number of switches of the chip that are on, from 0 to 8.',
  'Зажигайте LED5, когда единиц нечётное число: получится бит чётности.':
    'Light LED5 when the number of ones is odd: you get a parity bit.',
  'Логический пробник: заполнение 25 %': 'Logic probe: 25 % duty cycle',
  'Пробник показывает уровень, заполнение и частоту сигнала.':
    'The probe shows the level, duty cycle and frequency of the signal.',
  'Измерить заполнение и частоту сигнала логическим пробником.':
    'Measure the duty cycle and frequency of a signal with a logic probe.',
  'Пробник показывает около 25 % и частоту 27 МГц / 1024 ≈ 26,4 кГц.':
    'The probe shows about 25 % and a frequency of 27 MHz / 1024 ≈ 26.4 kHz.',
  'Получите 75 % и 10 %. Измените период так, чтобы частота стала ровно 10 кГц.':
    'Get 75 % and 10 %. Change the period so that the frequency becomes exactly 10 kHz.',
  'Логический пробник: три частоты': 'Logic probe: three frequencies',
  'S1 переключает частоту сигнала на пробнике.': 'S1 switches the signal frequency on the probe.',
  'Получить несколько частот из разных битов одного счётчика.':
    'Get several frequencies from different bits of one counter.',
  'Частота на пробнике падает в восемь раз с каждым нажатием; заполнение всегда 50 %.':
    'The frequency on the probe drops eight times with each press; the duty cycle is always 50 %.',
  'Вычислите частоту бита 12 и сравните с прибором. Добавьте четвёртую частоту.':
    'Calculate the frequency of bit 12 and compare it with the instrument. Add a fourth frequency.',
  'Частотомер: ровно 1 кГц': 'Frequency meter: exactly 1 kHz',
  'Делитель с точным коэффициентом даёт 1 кГц из 27 МГц.':
    'A divider with an exact ratio gives 1 kHz from 27 MHz.',
  'Получить точную частоту делителем с произвольным коэффициентом.':
    'Get an exact frequency with a divider of an arbitrary ratio.',
  'Частотомер показывает 1,00 кГц: счёт до 13 500 даёт ровно тысячу периодов в секунду.':
    'The frequency meter shows 1.00 kHz: counting to 13,500 gives exactly a thousand periods per second.',
  'Получите 50 Гц и 440 Гц. Объясните, почему 3 кГц получится точно, а 7 кГц — нет.':
    'Get 50 Hz and 440 Hz. Explain why 3 kHz comes out exactly and 7 kHz does not.',
  'Частотомер: удвоение частоты': 'Frequency meter: doubling the frequency',
  'Каждое нажатие S1 поднимает частоту вдвое.': 'Each press of S1 doubles the frequency.',
  'Удваивать частоту, деля период сдвигом вправо.':
    'Double the frequency by dividing the period with a right shift.',
  'Частотомер показывает 1, 2, 4 и 8 кГц по кругу; номер ступени на LED платы.':
    'The frequency meter shows 1, 2, 4 and 8 kHz in a loop; the step number is on the board LEDs.',
  'Сделайте шаг в полтора раза. Проверьте, что 8 кГц получается не совсем точно, и объясните.':
    'Make the step a factor of one and a half. Check that 8 kHz comes out not quite exactly, and explain why.',
  'Вольтметр: половина напряжения': 'Voltmeter: half the voltage',
  'ШИМ с заполнением 50 % даёт в среднем 1,65 В.':
    'PWM with a 50 % duty cycle gives 1.65 V on average.',
  'Получить среднее напряжение 1,65 В из цифрового сигнала с заполнением 50 %.':
    'Get an average voltage of 1.65 V from a digital signal with a 50 % duty cycle.',
  'Вольтметр показывает 1,65 В, хотя на выводе бывают только 0 и 3,3 В.':
    'The voltmeter shows 1.65 V, although the pin is only ever at 0 and 3.3 V.',
  'Получите 1,0 В: посчитайте порог сравнения. Снимите тот же сигнал пробником.':
    'Get 1.0 V: calculate the compare threshold. Capture the same signal with a probe.',
  'Вольтметр: ступени напряжения': 'Voltmeter: voltage steps',
  'S1 перебирает заполнение ШИМ: 0, 25, 50 и 100 %.':
    'S1 steps through the PWM duty cycle: 0, 25, 50 and 100 %.',
  'Задать напряжение числом через заполнение ШИМ, как в простом ЦАП.':
    'Set a voltage with a number through the PWM duty cycle, like in a simple DAC.',
  'Вольтметр показывает 0, около 0,83, 1,65 и 3,30 В; номер ступени на LED платы.':
    'The voltmeter shows 0, about 0.83, 1.65 and 3.30 V; the step number is on the board LEDs.',
  'Сделайте шестнадцать ступеней по 0,2 В. Объясните, почему ступень 255 из 256 — не ровно 3,3 В.':
    'Make sixteen steps of 0.2 V each. Explain why step 255 of 256 is not exactly 3.3 V.',
  'Логический анализатор: биты счётчика': 'Logic analyzer: counter bits',
  'Четыре бита счётчика на временной диаграмме.': 'Four counter bits on a timing diagram.',
  'Увидеть на временной диаграмме, как биты счётчика делят частоту на два.':
    'See on a timing diagram how the counter bits divide the frequency by two.',
  'Каждая следующая дорожка меняется вдвое реже предыдущей; вместе они образуют двоичный счёт.':
    'Each next trace changes half as often as the previous one; together they form a binary count.',
  'Поменяйте окно просмотра в свойствах. Выведите счётчик в коде Грея и сравните диаграммы.':
    'Change the viewing window in the properties. Show the counter in Gray code and compare the diagrams.',
  'Логический анализатор: посылка по трём проводам': 'Logic analyzer: a transfer over three wires',
  'Выбор, такт и данные последовательной передачи байта.':
    'Select, clock and data of a serial byte transfer.',
  'Прочитать байт по временной диаграмме последовательной передачи.':
    'Read a byte from the timing diagram of a serial transfer.',
  'Пока CS = 0, идут восемь импульсов SCK; на фронтах SCK линия MOSI даёт 1010 0101.':
    'While CS = 0, eight SCK pulses go by; on the SCK edges the MOSI line gives 1010 0101.',
  'Передайте другой байт и прочитайте его по диаграмме. Поменяйте порядок бит.':
    'Send another byte and read it from the diagram. Change the bit order.',
  'Генератор импульсов: счёт внешних импульсов': 'Pulse generator: counting external pulses',
  'Схема считает импульсы от генератора на столе.':
    'The design counts pulses from the generator on the bench.',
  'Безопасно принять внешний несинхронный сигнал и подсчитать его фронты.':
    'Safely take in an external asynchronous signal and count its edges.',
  'Число на светодиодах растёт с частотой генератора; S1 обнуляет его.':
    'The number on the LEDs grows at the generator frequency; S1 zeroes it.',
  'Меняйте частоту в свойствах генератора. Уберите синхронизатор и обсудите, чем это грозит на плате.':
    'Change the frequency in the generator properties. Remove the synchronizer and discuss what this risks on a real board.',
  'Генератор импульсов: делитель на 2, 4 и 8': 'Pulse generator: divide by 2, 4 and 8',
  'Внешний сигнал делится триггерами.': 'An external signal is divided by flip-flops.',
  'Поделить частоту внешнего сигнала счётными триггерами.':
    'Divide the frequency of an external signal with toggle flip-flops.',
  'LED1 мигает вдвое реже LED0, LED2 — вчетверо, LED3 — в восемь раз.':
    'LED1 blinks half as often as LED0, LED2 a quarter as often, LED3 an eighth as often.',
  'Получите деление на 3: сбрасывайте счётчик на двойке. Сравните заполнение сигналов.':
    'Get a divide-by-3: reset the counter at two. Compare the duty cycles of the signals.',
  'UART-терминал: строка «HELLO»': 'UART terminal: the string "HELLO"',
  'Схема раз за разом отправляет слово в терминал на столе.':
    'The design sends a word to the terminal on the bench over and over.',
  'Передать строку по UART: старт-бит, восемь бит данных и стоп-бит на заданной скорости.':
    'Send a string over UART: a start bit, eight data bits and a stop bit at a given speed.',
  'В терминале на столе строка за строкой появляется HELLO; LED0 вспыхивает на каждый байт.':
    'In the terminal on the bench HELLO appears line after line; LED0 flashes for every byte.',
  'Поменяйте скорость в свойствах терминала на 9600 и исправьте делитель. Отправьте своё слово.':
    'Change the speed in the terminal properties to 9600 and fix the divider. Send your own word.',
  'UART-терминал: эхо с заменой регистра': 'UART terminal: echo with case change',
  'Схема принимает байт и возвращает его заглавной буквой.':
    'The design receives a byte and returns it as a capital letter.',
  'Принять байт по UART, изменить его и отправить обратно.':
    'Receive a byte over UART, modify it and send it back.',
  'Набранный в терминале текст возвращается заглавными буквами; код последнего байта на LED платы.':
    'The text typed in the terminal comes back in capital letters; the code of the last byte is on the board LEDs.',
  'Возвращайте следующую по алфавиту букву. Отвечайте только на цифры, остальное пропускайте.':
    'Return the next letter of the alphabet. Answer only to digits and pass everything else through.',
  'На стенде:': 'On the bench:',
  'детали уже стоят и подключены': 'the parts are already placed and connected',
  'деталь уже стоит и подключена': 'the part is already placed and connected',
  '— откройте «Лабораторию» и нажмите «Пуск».': '— open the "Lab" and press "Start".',
  'Термометр LM75 → UART': 'LM75 thermometer → UART',
  'Температура с датчика LM75 по I²C печатается в терминал и показывается на светодиодах. На стенде: LM75 с ползунком температуры.':
    'The temperature from the LM75 sensor over I²C is printed to the terminal and shown on the LEDs. On the bench: an LM75 with a temperature slider.',
  'Часы DS1307 на индикаторе TM1637': 'DS1307 clock on the TM1637 display',
  'Время из DS1307 (BCD по I²C) выводится на четыре цифры с мигающим двоеточием. На стенде: DS1307 (идёт в 1000 раз быстрее) и индикатор TM1637.':
    'The time from the DS1307 (BCD over I²C) is shown on four digits with a blinking colon. On the bench: a DS1307 (running 1000 times faster) and a TM1637 display.',
  'EEPROM 24C02: счётчик включений': 'EEPROM 24C02: power-on counter',
  'Число хранится в энергонезависимой памяти и растёт при каждом запуске. На стенде: микросхема 24C02 с шестнадцатеричным дампом.':
    'The number is stored in non-volatile memory and grows at every start. On the bench: a 24C02 chip with a hexadecimal dump.',
  'Дальномер HC-SR04 на индикаторе': 'HC-SR04 rangefinder on a display',
  'Длина импульса на echo превращается в сантиметры и выводится на TM1637 и шкалу светодиодов. На стенде: HC-SR04 (ползунок расстояния) и TM1637.':
    'The length of the echo pulse is turned into centimeters and shown on the TM1637 and an LED bar. On the bench: an HC-SR04 (distance slider) and a TM1637.',
  'Датчик температуры и влажности на одном проводе: старт-импульс, 40 бит ответа, текст в терминал. На стенде: DHT11 с двумя ползунками.':
    'A temperature and humidity sensor on one wire: a start pulse, 40 bits of reply, text to the terminal. On the bench: a DHT11 with two sliders.',
  'ИК-пульт управляет светодиодами': 'IR remote controls the LEDs',
  'Кадр NEC от пульта декодируется по длительности импульсов; кнопки 1–6 переключают светодиоды. На стенде: ИК-приёмник с пультом.':
    'The NEC frame from the remote is decoded by pulse durations; buttons 1–6 toggle the LEDs. On the bench: an IR receiver with a remote.',
  'Клавиатура PS/2 → UART': 'PS/2 keyboard → UART',
  'Скан-коды набора 2 с проверкой нечётности превращаются в буквы и уходят в терминал. На стенде: клавиатура PS/2.':
    'Set 2 scan codes with odd-parity checking are turned into letters and sent to the terminal. On the bench: a PS/2 keyboard.',
  'Потенциометр через MCP3008 → линейка и ШИМ': 'Potentiometer through MCP3008 → bar and PWM',
  'АЦП по SPI читает ползунок: линейка светодиодов и ШИМ-яркость светодиода. На стенде: MCP3008 с потенциометром и светодиод на выходе ШИМ.':
    'The SPI ADC reads the slider: an LED bar and PWM brightness of an LED. On the bench: an MCP3008 with a potentiometer and an LED on the PWM output.',
  'Полный сумматор': 'Full adder',
  'Два бита, входной перенос и двухбитная сумма.': 'Two bits, a carry in and a two-bit sum.',
  'Полный вычитатель': 'Full subtractor',
  'Разность одного разряда и входной/выходной заём.':
    'The difference of one bit and the borrow in/out.',
  'Если A, то B': 'If A, then B',
  'Импликация нарушена только для A=1, B=0.': 'The implication is violated only for A=1, B=0.',
  'Ровно два из трёх': 'Exactly two of three',
  'Проверка количества единиц без проверки их положения.':
    'Checking the number of ones without checking their positions.',
  'Голосование 2 из 3': 'Majority vote 2 of 3',
  'Решение большинства: две или три единицы.': 'The majority decision: two or three ones.',
  'Законы де Моргана': "De Morgan's laws",
  'Два способа записи каждой инверсии дают одинаковый результат.':
    'Two ways of writing each inversion give the same result.',
  'Теорема консенсуса': 'Consensus theorem',
  'Третий член не меняет таблицу истинности выражения.':
    'The third term does not change the truth table of the expression.',
  'Выбор одного из четырёх слов': 'Choosing one of four words',
  'Две кнопки выбирают шестибитный рисунок.': 'Two buttons select a six-bit pattern.',
  'Демультиплексор 1 → 4': 'Demultiplexer 1 → 4',
  'Один вход направляется на выбранный выход.': 'One input is routed to the selected output.',
  'Минимум и максимум со знаком': 'Signed minimum and maximum',
  'Числа −4…3 сравниваются как signed.': 'The numbers −4…3 are compared as signed.',
  'Перенос и знаковое переполнение': 'Carry and signed overflow',
  'Одна сумма, два разных признака ошибки диапазона.': 'One sum, two different range-error flags.',
  'Модуль signed-числа': 'Absolute value of a signed number',
  'Дополнительный код превращается в положительную величину.':
    "Two's complement is turned into a positive value.",
  'Сложение с насыщением': 'Saturating addition',
  'Сумма 0…14 ограничивается максимумом 7.': 'The sum 0…14 is limited to the maximum of 7.',
  'Среднее без переполнения': 'Average without overflow',
  'Расширяем сумму перед делением на два.': 'Widen the sum before dividing by two.',
  'Умножение сдвигами и сложением': 'Multiplication by shifts and addition',
  'Три бита × два бита без оператора умножения.':
    'Three bits × two bits without a multiplication operator.',
  'Деление и остаток': 'Division and remainder',
  'Защита от деления на ноль и проверка a=q·b+r.':
    'Protection against division by zero and a check of a=q·b+r.',
  'Сколько единиц в слове': 'How many ones in a word',
  'Вес шестибитного слова: от нуля до шести.': 'The weight of a six-bit word: from zero to six.',
  'Нули перед старшей единицей': 'Zeros before the leading one',
  'Количество ведущих нулей шестибитного слова.': 'The number of leading zeros of a six-bit word.',
  'Нули после младшей единицы': 'Zeros after the lowest one',
  'Число нулевых младших разрядов и делимость на степени двойки.':
    'The number of low zero bits and divisibility by powers of two.',
  'Приоритетный шифратор 6 → 3': 'Priority encoder 6 → 3',
  'Номер старшего активного запроса и отдельный valid.':
    'The number of the highest active request and a separate valid.',
  'Двоичный номер → one-hot': 'Binary number → one-hot',
  'Шесть допустимых адресов и два пустых.': 'Six valid addresses and two empty ones.',
  'Проверка one-hot и one-hot-or-zero': 'One-hot and one-hot-or-zero check',
  'Чем ровно одна единица отличается от не более одной.':
    'How exactly one 1 differs from at most one.',
  'Термометрический код': 'Thermometer code',
  'Значение превращается в непрерывную шкалу единиц.':
    'A value is turned into a continuous scale of ones.',
  'Двоичное число → десятки и единицы': 'Binary number → tens and ones',
  'BCD для десятичных чисел 0…31 в двух режимах просмотра.':
    'BCD for the decimal numbers 0…31 in two viewing modes.',
  'Декодер семисегментной цифры': 'Seven-segment digit decoder',
  'Таблица сегментов 0…9 и честное ограничение шести LED.':
    'A segment table for 0…9 and an honest limit of six LEDs.',
  'Циклическое вращение слова': 'Cyclic rotation of a word',
  'Старший бит возвращается в младший или наоборот.':
    'The top bit returns into the lowest or the other way around.',
  'Бочковой сдвигатель': 'Barrel shifter',
  'Переменный сдвиг данных на 0…3 позиции.': 'Variable data shift by 0…3 positions.',
  'Накопительный XOR': 'Cumulative XOR',
  'Каждый выход — чётность префикса младших разрядов.':
    'Each output is the parity of the prefix of low bits.',
  'Разворот порядка битов': 'Reversing the bit order',
  'Бит 0 становится битом 5; число меняется, единицы сохраняются.':
    'Bit 0 becomes bit 5; the number changes, the ones are preserved.',
  'Разрежение трёх битов': 'Spreading three bits',
  'Между исходными битами появляются нули.': 'Zeros appear between the original bits.',
  'ROM из восьми слов': 'Eight-word ROM',
  'Адрес выбирает заранее записанный шестибитный рисунок.':
    'The address selects a pre-recorded six-bit pattern.',
  'CRC-3 короткого слова': 'CRC-3 of a short word',
  'Остаток полиномиального деления на x³+x+1.': 'The remainder of polynomial division by x³+x+1.',
  'Укороченный код Хэмминга (6,3)': 'Shortened Hamming code (6,3)',
  'Три информационных бита и три проверки чётности.':
    'Three information bits and three parity checks.',
  'Синдром Хэмминга': 'Hamming syndrome',
  'Проверки чётности указывают номер одиночной ошибки.':
    'The parity checks point to the number of a single error.',
  'Signed и unsigned: разные сравнения': 'Signed and unsigned: different comparisons',
  'Одинаковые три бита могут означать разные числа.':
    'The same three bits can mean different numbers.',
  'Окно значений': 'Value window',
  'Внутри диапазона, на границе, ниже или выше.':
    'Inside the range, on the boundary, below or above.',
  'Установка, сброс и инверсия маски': 'Set, clear and invert by a mask',
  'Одна маска выполняет три разные операции над словом.':
    'One mask performs three different operations on a word.',
  'Квадрат через таблицу': 'Square through a table',
  'Восемь результатов заменяют арифметический умножитель.':
    'Eight results replace an arithmetic multiplier.',
  'Антидребезг кнопки': 'Button debounce',
  'Принимаем новое состояние только после устойчивого интервала.':
    'The new state is accepted only after a stable interval.',
  'Фронт → растянутый импульс': 'Edge → stretched pulse',
  'Одно нажатие включает LED на фиксированное время.':
    'One press turns an LED on for a fixed time.',
  'Передача события через toggle': 'Passing an event through a toggle',
  'Событие меняет бит, принимающая сторона обнаруживает изменение.':
    'The event flips a bit and the receiving side detects the change.',
  'Безопасное отпускание сброса': 'Safe reset release',
  'Асинхронное включение и синхронное снятие reset.':
    'Asynchronous assertion and synchronous release of reset.',
  'Измерение длительности нажатия': 'Measuring press duration',
  'Число тактов высокого уровня сохраняется после отпускания.':
    'The number of high clock cycles is kept after release.',
  'Одновибратор без повторного запуска': 'Non-retriggerable one-shot',
  'Следующие нажатия игнорируются, пока длится импульс.':
    'Further presses are ignored while the pulse lasts.',
  'Таймер после последнего события': 'Timer after the last event',
  'Каждое нажатие отодвигает выключение.': 'Each press postpones the switch-off.',
  'Сторожевой таймер': 'Watchdog timer',
  'Нет подтверждений — появляется и сохраняется сигнал тревоги.':
    'With no acknowledgments an alarm signal appears and is kept.',
  'Деление частоты на три': 'Divide the frequency by three',
  'Только для диаграмм: модуль 3 и несимметричный импульс 1/3 периода.':
    'For diagrams only: modulo 3 and an asymmetric pulse of 1/3 of the period.',
  'Дробный делитель': 'Fractional divider',
  'Аккумулятор выдаёт 3 события на каждые 8 тактов.':
    'The accumulator produces 3 events per 8 clock cycles.',
  'Измеритель заполнения': 'Duty-cycle meter',
  'Сколько из восьми последних отсчётов вход был нажат.':
    'For how many of the last eight samples the input was pressed.',
  'Секундомер с паузой': 'Stopwatch with pause',
  'Нажатие переключает запуск; пауза сохраняет долю секунды.':
    'A press toggles run; the pause keeps the fraction of a second.',
  'Таймер обратного отсчёта': 'Countdown timer',
  'Запуск на 15 секунд, затем устойчивый сигнал завершения.':
    'Start for 15 seconds, then a stable completion signal.',
  'События в окне времени': 'Events in a time window',
  'Считаем фронты, а не длительность кнопки.':
    'We count edges, not the duration of the button press.',
  'Плавное дыхание LED': 'Smooth LED breathing',
  'PWM и треугольное изменение яркости без нового такта.':
    'PWM and a triangular brightness change without a new clock.',
  'Два огня навстречу': 'Two lights toward each other',
  'Два независимых кольца и их объединение.': 'Two independent rings and their merge.',
  'Последовательный бит чётности': 'Serial parity bit',
  'XOR копит четыре входных бита и выдаёт результат кадра.':
    'XOR accumulates four input bits and gives the frame result.',
  'CRC-4 по последовательным битам': 'CRC-4 over serial bits',
  'Сдвиг с обратной связью по полиному x⁴+x+1.': 'A shift with feedback by the polynomial x⁴+x+1.',
  'Псевдослучайная последовательность': 'Pseudo-random sequence',
  'LFSR с 63 ненулевыми состояниями.': 'An LFSR with 63 nonzero states.',
  'Распознаватель 1011': '1011 recognizer',
  'Автомат Мили обнаруживает образец, включая перекрытия.':
    'A Mealy machine detects the pattern, including overlaps.',
  'Автомат двери': 'Door state machine',
  'Открытие, удержание и автоматическое закрытие.': 'Opening, holding and automatic closing.',
  'Запрос и подтверждение': 'Request and acknowledgment',
  'Один запрос хранится до получения ответа.': 'One request is stored until a reply arrives.',
  'Лифт между двумя этажами': 'Elevator between two floors',
  'Запрос, движение и прибытие с памятью направления.':
    'Request, motion and arrival with direction memory.',
  'Автомат с монетами': 'Coin state machine',
  'Три события дают товар, удержание кнопки не считается повторно.':
    'Three events deliver the item; holding the button down is not counted again.',
  'Арбитр round-robin': 'Round-robin arbiter',
  'При двух запросах приоритет чередуется без голодания.':
    'With two requests the priority alternates without starvation.',
  'FIFO на четыре слова': 'Four-word FIFO',
  'Кольцевые указатели и полный/пустой буфер.': 'Ring pointers and full/empty buffer.',
  'Стек на четыре слова': 'Four-word stack',
  'Последнее записанное слово читается первым.': 'The last written word is read first.',
  'RAM: запись и чтение': 'RAM: write and read',
  'Сначала заполняем массив, затем проверяем синхронное чтение.':
    'First fill the array, then check the synchronous read.',
  'ROM с последовательностью узоров': 'ROM with a sequence of patterns',
  'Адрес выбирает заранее заданное слово.': 'The address selects a predefined word.',
  'Таблица синусоиды': 'Sine table',
  'Четыре четверти формы из маленькой ROM.': 'Four quarters of the waveform from a small ROM.',
  'UART-передатчик 8N1': 'UART transmitter 8N1',
  'По нажатию отправляем байт ASCII A на настоящий TX платы.':
    "On a press we send the ASCII byte A to the board's real TX.",
  'UART-приёмник 8N1': 'UART receiver 8N1',
  'Принимаем байт по RX и показываем младшие пять битов.':
    'We receive a byte on RX and show the lowest five bits.',
  'SPI mode 0: внутренний loopback': 'SPI mode 0: internal loopback',
  'Передатчик и приёмник соединены внутри FPGA.':
    'The transmitter and the receiver are connected inside the FPGA.',
  'I²C: START и STOP': 'I²C: START and STOP',
  'Учебная последовательность линий с моделью открытого стока.':
    'A teaching sequence of lines with an open-drain model.',
  'Последовательный сумматор': 'Serial adder',
  'Один полный сумматор обрабатывает четыре разряда за четыре такта.':
    'One full adder processes four bits in four clock cycles.',
  'Фильтр большинства 3 отсчётов': 'Majority filter over 3 samples',
  'Изолированный выброс не меняет выход.': 'An isolated glitch does not change the output.',
  'Минимум и максимум потока': 'Stream minimum and maximum',
  'Память экстремумов с отдельным сбросом измерения.':
    'Memory of the extremes with a separate measurement reset.',
  'Десятичные цифры BCD': 'Decimal BCD digits',
  'Два десятичных счётчика с переносом 9→0.': 'Two decimal counters with a 9→0 carry.',
  'Кнопка → LED': 'Button → LED',
  'Самая простая связь входа с выходом.': 'The simplest link between an input and an output.',
  'Инвертор NOT': 'NOT inverter',
  'Поменяйте 0 и 1 местами.': 'Swap 0 and 1.',
  'Две кнопки и три логических элемента.': 'Two buttons and three logic gates.',
  Мультиплексор: 'Multiplexer',
  'Вторая кнопка выбирает сигнал или его инверсию.':
    'The second button selects the signal or its inverse.',
  Счётчик: 'Counter',
  'Шесть регистров, сложение и пауза.': 'Six registers, addition and a pause.',
  'Мигалка 27 МГц': '27 MHz blinker',
  'Делитель частоты: один полный цикл в секунду.':
    'A frequency divider: one full cycle per second.',
  'Бегущий огонь': 'Running light',
  'Кольцевой сдвиг по шести светодиодам.': 'A ring shift over six LEDs.',
  'Яркость через PWM': 'Brightness with PWM',
  'Свет включён 25% или 75% периода.': 'The light is on for 25% or 75% of the period.',
  'Автомат светофора': 'Traffic light state machine',
  'Состояния: красный → зелёный → жёлтый.': 'States: red → green → yellow.',
  'Иерархическая ALU': 'Hierarchical ALU',
  'Три модуля: регистры → ALU → сумматор.': 'Three modules: registers → ALU → adder.',
  'Инверсия трёх основных логических операций.': 'Inversion of the three basic logic operations.',
  Полусумматор: 'Half adder',
  'Сумма двух битов и перенос в следующий разряд.':
    'The sum of two bits and the carry into the next bit.',
  Компаратор: 'Comparator',
  'Меньше, равно или больше — сравнение двух битов.': 'Less, equal or greater: comparing two bits.',
  'Декодер 2 → 4': '2 → 4 decoder',
  'Двоичный номер выбирает один из четырёх LED.': 'A binary number selects one of four LEDs.',
  'Приоритет кнопок': 'Button priority',
  'Если запросов два, выбираем старший.': 'If there are two requests, we pick the higher one.',
  'Бит чётности': 'Parity bit',
  'Пять битов данных и XOR всех разрядов.': 'Five data bits and the XOR of all bits.',
  'Сдвиговый регистр': 'Shift register',
  'Последовательный вход превращается в шесть битов.': 'A serial input is turned into six bits.',
  'Регистр с загрузкой': 'Register with load',
  'Запомните число и удерживайте его на выходе.': 'Remember a number and hold it on the output.',
  'Счётчик вверх / вниз': 'Up / down counter',
  'Кнопка меняет направление счёта.': 'A button changes the counting direction.',
  'Счётчик с насыщением': 'Saturating counter',
  'Дойдите до 63 и остановитесь вместо переполнения.': 'Reach 63 and stop instead of overflowing.',
  'Счётчик кода Грея': 'Gray code counter',
  'Соседние значения отличаются ровно одним битом.':
    'Neighboring values differ in exactly one bit.',
  'Счётчик Джонсона': 'Johnson counter',
  'Заполнение и очистка цепочки из шести регистров.':
    'Filling and clearing a chain of six registers.',
  'Одно нажатие → переключение': 'One press → toggle',
  'Синхронизация входа и детектор фронта.': 'Input synchronization and an edge detector.',
  'Первые схемы': 'First circuits',
  'Входы, выходы, таблицы истинности, выбор данных и двоичные числа.':
    'Inputs, outputs, truth tables, data selection and binary numbers.',
  'Память и время': 'Memory and time',
  'Фронты такта, регистры, счётчики, сброс, интервалы и простые автоматы.':
    'Clock edges, registers, counters, reset, intervals and simple state machines.',
  'Связь и обработка': 'Communication and processing',
  'Потоки битов, интерфейсы, коды ошибок, фильтры и сложные числовые операции.':
    'Bit streams, interfaces, error codes, filters and complex numeric operations.',
  Системы: 'Systems',
  'Несколько блоков вместе: обмен событиями, буферы, арбитраж и вычислительная архитектура.':
    'Several blocks together: event exchange, buffers, arbitration and computer architecture.',
  Логика: 'Logic',
  'Логические элементы, таблицы истинности и равенство выражений.':
    'Logic gates, truth tables and equivalence of expressions.',
  'Выбор и маршрутизация': 'Selection and routing',
  'Мультиплексоры, приоритеты, маски и перестановки битов.':
    'Multiplexers, priorities, masks and bit permutations.',
  'Числа и арифметика': 'Numbers and arithmetic',
  'Сложение, сравнение, разрядность, знаковые числа и переполнение.':
    'Addition, comparison, bit width, signed numbers and overflow.',
  'Представление и защита данных': 'Data representation and protection',
  'Коды чисел, чётность, CRC и обнаружение ошибок.':
    'Number codes, parity, CRC and error detection.',
  'Регистры и состояние': 'Registers and state',
  'Хранение значений, загрузка, сдвиг и счёт.': 'Storing values, loading, shifting and counting.',
  'Такт и интервалы': 'Clock and intervals',
  'Делители, импульсы, синхронизация входов и временные измерения.':
    'Dividers, pulses, input synchronization and time measurements.',
  'Конечные автоматы': 'Finite state machines',
  'Состояния, переходы, события и управление устройством.':
    'States, transitions, events and device control.',
  'Память и буферы': 'Memory and buffers',
  'Адреса, ROM, RAM, очередь FIFO и стек.': 'Addresses, ROM, RAM, FIFO queue and stack.',
  'Передача данных': 'Data transfer',
  'Последовательные биты, UART, SPI и учебные формы I²C.':
    'Serial bits, UART, SPI and teaching forms of I²C.',
  'Обработка сигналов': 'Signal processing',
  'Окна отсчётов, фильтры, экстремумы и табличные формы сигналов.':
    'Sample windows, filters, extremes and table-based waveforms.',
  'Индикация и видео': 'Display and video',
  'Шкалы, цифры, LED-яркость и учебные сигналы строк и кадров.':
    'Bar graphs, digits, LED brightness and teaching signals for lines and frames.',
  'Устройство системы': 'System structure',
  'Иерархия блоков, обмен запросами, арбитраж и последовательные вычисления.':
    'Block hierarchy, request exchange, arbitration and sequential computation.',
  'Связать вход с выходом и разобраться с активным уровнем 0.':
    'Connect an input to an output and understand active level 0.',
  'Сравните button и led: их уровни совпадают. Кнопка даёт 1 при нажатии, а LED светится при 0, поэтому прямое соединение гасит LED при нажатии.':
    'Compare button and led: their levels match. The button gives 1 when pressed and the LED lights at 0, so a direct connection turns the LED off when pressed.',
  'Задайте button сначала 0, затем 1. Объясните, почему LED светится с отпущенной кнопкой и гаснет с нажатой.':
    'Set button first to 0, then to 1. Explain why the LED is lit with the button released and goes out when it is pressed.',
  'Построить инверсию одного сигнала.': 'Build the inversion of a single signal.',
  'В RTL найдите треугольник инвертора; led всегда противоположен button.':
    'In the RTL find the inverter triangle; led is always the opposite of button.',
  'Запишите две строки таблицы истинности и сравните с прямым соединением.':
    'Write down two rows of the truth table and compare them with the direct connection.',
  'Различить AND, OR и XOR по четырём комбинациям входов.':
    'Tell AND, OR and XOR apart by the four input combinations.',
  'a и b обозначают нажатия; led_n инвертирует результаты для LED платы.':
    'a and b stand for presses; led_n inverts the results for the board LEDs.',
  'Переберите button_a/button_b: 00, 01, 10, 11. Где XOR отличается от OR?':
    'Go through button_a/button_b: 00, 01, 10, 11. Where does XOR differ from OR?',
  'Получить NAND, NOR и XNOR инверсией знакомых операций.':
    'Get NAND, NOR and XNOR by inverting the familiar operations.',
  'Сравните каждую инверсную операцию с соответствующей AND, OR или XOR.':
    'Compare each inverted operation with the corresponding AND, OR or XOR.',
  'Для всех четырёх комбинаций проверьте, что NAND противоположен AND.':
    'Check for all four combinations that NAND is the opposite of AND.',
  'Прочитать составное выражение как соединение логических элементов.':
    'Read a compound expression as a connection of logic gates.',
  'Проследите путь a и b через AND к OR с входом c; в Gowin откройте таблицу LUT.':
    'Trace the path of a and b through AND to OR with input c; in Gowin open the LUT table.',
  'Переберите восемь комбинаций. При каком c значения a и b перестают влиять на y?':
    'Go through the eight combinations. At which c do the values of a and b stop affecting y?',
  'Проверить законы де Моргана по таблице истинности.':
    "Verify De Morgan's laws with a truth table.",
  'Парные выходы двух формул совпадают; выход несовпадения всегда равен 0.':
    'The paired outputs of the two formulas match; the mismatch output is always 0.',
  'Сравните НЕ(a И b) с НЕ a ИЛИ НЕ b для каждой комбинации.':
    'Compare NOT(a AND b) with NOT a OR NOT b for each combination.',
  'Выделить единственную комбинацию, нарушающую правило «если A, то B».':
    'Isolate the single combination that violates the rule "if A, then B".',
  'LED0 показывает правило, LED1 — его нарушение; они противоположны.':
    'LED0 shows the rule, LED1 its violation; they are opposite.',
  'Нажмите только первую кнопку, затем обе. Объясните изменение результата.':
    'Press only the first button, then both. Explain the change in the result.',
  'Выбрать один из двух источников по управляющему входу.':
    'Choose one of two sources by a control input.',
  'Найдите вход выбора select и два пути данных в RTL.':
    'Find the select input and the two data paths in the RTL.',
  'Удерживайте button_a постоянным и меняйте button_select; затем поменяйте сами данные.':
    'Hold button_a constant and change button_select; then change the data itself.',
  'Использовать двухбитный адрес для выбора одного из четырёх слов.':
    'Use a two-bit address to choose one of four words.',
  'Адрес {b,a} выбирает один шестибитный узор, а не один отдельный LED.':
    'The address {b,a} selects one six-bit pattern, not a single separate LED.',
  'Проверьте адреса 00, 01, 10, 11 и измените один узор в case.':
    'Check the addresses 00, 01, 10, 11 and change one pattern in the case.',
  'Преобразовать двоичный адрес в один активный выход.':
    'Convert a binary address into a single active output.',
  'Четыре выходных бита обозначают четыре возможных значения адреса.':
    'The four output bits stand for the four possible address values.',
  'Для адреса 10 найдите активный LED и проверьте, что активен ровно один выход.':
    'For address 10 find the active LED and check that exactly one output is active.',
  'Направить значение одного входа на выбранный выход.':
    'Route the value of one input to the selected output.',
  'routed зависит и от адреса, и от данных; при данных 0 все четыре бита нулевые.':
    'routed depends on both the address and the data; with data 0 all four bits are zero.',
  'При одном адресе отпустите кнопку данных. Сравните результат с декодером.':
    'At one address release the data button. Compare the result with the decoder.',
  'Разрешить конфликт двух запросов фиксированным приоритетом.':
    'Resolve a conflict of two requests with a fixed priority.',
  'Если нажаты обе кнопки, выбирается старший запрос, а не оба сразу.':
    'If both buttons are pressed, the higher request is chosen, not both at once.',
  'Проверьте одновременное нажатие и поменяйте порядок ветвей приоритета.':
    'Check simultaneous pressing and change the order of the priority branches.',
  'Разделить сравнение на три взаимоисключающих результата.':
    'Split a comparison into three mutually exclusive results.',
  'Для каждой пары a/b верен ровно один признак: меньше, равно или больше.':
    'For each pair a/b exactly one flag is true: less, equal or greater.',
  'Запишите результаты 0<1, 1=1 и 1>0; найдите блоки сравнения в RTL.':
    'Write down the results for 0<1, 1=1 and 1>0; find the comparison blocks in the RTL.',
  'Сложить два бита с отдельным выходом переноса.': 'Add two bits with a separate carry output.',
  'Сумма — XOR, перенос — AND; два выходных бита представляют число 0…2.':
    'The sum is XOR, the carry is AND; the two output bits represent a number 0…2.',
  'Подайте 1 и 1 и объясните, почему сумма равна 0, а перенос — 1.':
    'Apply 1 and 1 and explain why the sum is 0 and the carry is 1.',
  'Добавить входной перенос к сумме двух битов.': 'Add a carry-in to the sum of two bits.',
  'result содержит сумму и перенос; a/b берутся из sample, cin — из кнопки.':
    'result holds the sum and the carry; a/b are taken from sample, cin from the button.',
  'При a=b=1 переключите cin: сравните двоичные результаты 10 и 11.':
    'With a=b=1 toggle cin: compare the binary results 10 and 11.',
  'Отличить бит разности от заёма следующего разряда.':
    'Tell the difference bit from the borrow into the next bit.',
  'difference и borrow вместе описывают вычитание a-b-bin.':
    'difference and borrow together describe the subtraction a-b-bin.',
  'Проверьте a=0, b=0, bin=1; затем a=1, b=0, bin=1.':
    'Check a=0, b=0, bin=1; then a=1, b=0, bin=1.',
  'Построить условие ровно двух единиц среди трёх входов.':
    'Build the condition of exactly two ones among three inputs.',
  'Каждый член формулы описывает одну из комбинаций 110, 101, 011.':
    'Each term of the formula describes one of the combinations 110, 101, 011.',
  'Сравните результаты для 110 и 111: третья единица должна погасить признак.':
    'Compare the results for 110 and 111: the third one must turn the flag off.',
  'Собрать голосование большинства из AND и OR.': 'Build a majority vote from AND and OR.',
  'Условие включает две или три единицы и отличается от «ровно два».':
    'The condition is true for two or three ones and differs from "exactly two".',
  'Проверьте 111 и объясните, почему обе схемы дают разные ответы.':
    'Check 111 and explain why the two designs give different answers.',
  'Преобразовать номер в one-hot и обработать недопустимые адреса.':
    'Convert a number to one-hot and handle invalid addresses.',
  'Для адресов 0…5 активен один бит, для 6 и 7 все биты нулевые.':
    'For addresses 0…5 one bit is active, for 6 and 7 all bits are zero.',
  'Пройдите адреса 5→6→7→0 и объясните пустые комбинации.':
    'Step through the addresses 5→6→7→0 and explain the empty combinations.',
  'Представить число количеством соседних включённых LED.':
    'Represent a number by the count of adjacent lit LEDs.',
  'Термометрический код наращивает непрерывную группу единиц вместо перемещения одной.':
    'A thermometer code extends a continuous group of ones instead of moving a single one.',
  'Сравните рисунок числа 3 с его двоичным и one-hot представлением.':
    'Compare the picture of the number 3 with its binary and one-hot representations.',
  'Переместить биты по кольцу без потери старшего разряда.':
    'Move bits around a ring without losing the top bit.',
  'Сдвинутый за край бит возвращается с противоположной стороны.':
    'A bit shifted past the edge returns from the opposite side.',
  'Найдите sample с одиночной единицей и сравните вращение в обе стороны.':
    'Find a sample with a single one and compare rotation in both directions.',
  'Различить порядок битов и числовое значение слова.':
    'Tell the bit order from the numeric value of a word.',
  'Биты 0 и 5, 1 и 4, 2 и 3 меняются местами без логических операций.':
    'Bits 0 and 5, 1 and 4, 2 and 3 are swapped without logic operations.',
  'Для 000001 предскажите результат; найдите слово, которое не меняется при развороте.':
    'Predict the result for 000001; find a word that does not change when reversed.',
  'Создать новое слово соединением отдельных битов и констант.':
    'Create a new word by joining individual bits and constants.',
  'Между тремя исходными битами вставляются нули; это соединения проводов.':
    'Zeros are inserted between the three original bits; these are wire connections.',
  'Проверьте исходное 111 и сопоставьте каждый бит результата с конкатенацией.':
    'Check the original 111 and match each bit of the result to the concatenation.',
  'Установить, сбросить и инвертировать выбранные биты маской.':
    'Set, clear and invert selected bits with a mask.',
  'OR устанавливает, AND NOT сбрасывает, XOR инвертирует только биты с mask=1.':
    'OR sets, AND NOT clears, XOR inverts only the bits where mask=1.',
  'Выберите word=101, mask=010; затем нулевую маску и сравните три операции.':
    'Choose word=101, mask=010; then a zero mask, and compare the three operations.',
  'Отличить включённые границы диапазона от строгого сравнения.':
    'Tell inclusive range boundaries from a strict comparison.',
  'value=2 и value=5 лежат на границе, а 3 и 4 — строго внутри.':
    'value=2 and value=5 lie on the boundary, while 3 and 4 are strictly inside.',
  'Пройдите значения 1…6 и измените одну границу диапазона.':
    'Step through the values 1…6 and change one boundary of the range.',
  'Отделить хранение числа от комбинационного сложения.':
    'Separate the storage of a number from combinational addition.',
  'count обновляется на posedge clk раз в STEP_TICKS тактов (на плате 4 шага в секунду); reset возвращает 0.':
    'count is updated on posedge clk once every STEP_TICKS clock cycles (4 steps per second on the board); reset returns 0.',
  'Поставьте STEP_TICKS=1, запустите несколько тактов, включите паузу, отпустите и проверьте 63→0.':
    'Set STEP_TICKS=1, run several clock cycles, turn on the pause, release it and check 63→0.',
  'Сохранить снимок меняющегося значения в отдельном регистре.':
    'Save a snapshot of a changing value in a separate register.',
  'running продолжает счёт, а saved меняется только при разрешённой загрузке.':
    'running keeps counting, while saved changes only when loading is enabled.',
  'Загрузите saved, прекратите загрузку и убедитесь, что следующий счёт его не меняет.':
    'Load saved, stop loading and check that further counting does not change it.',
  'Накопить историю последовательного входа в сдвиговом регистре.':
    'Accumulate the history of a serial input in a shift register.',
  'Новый бит приходит в младший разряд, прежние биты одновременно перемещаются.':
    'The new bit enters the lowest position, and the earlier bits move at the same time.',
  'Подайте 1,0,1,1 по одному на такт и проследите каждый бит history.':
    'Apply 1,0,1,1 one per clock cycle and trace each bit of history.',
  'Изменять направление счёта, сохраняя текущее число.':
    'Change the counting direction while keeping the current number.',
  'Одна кнопка выбирает +1 или −1 на каждом шаге (STEP_TICKS тактов); границы идут по модулю 64.':
    'One button chooses +1 or −1 on each step (STEP_TICKS clock cycles); the boundaries are modulo 64.',
  'С STEP_TICKS=1 смените направление в середине счёта и проверьте переход 0→63 вниз.':
    'With STEP_TICKS=1 change the direction in the middle of counting and check the 0→63 transition downward.',
  'Удержать граничное значение вместо переполнения.':
    'Hold the boundary value instead of overflowing.',
  'При count=63 условие запрещает следующее увеличение.':
    'At count=63 the condition forbids the next increment.',
  'С STEP_TICKS=1 сравните последние два шага с обычным счётчиком и измените верхний предел.':
    'With STEP_TICKS=1 compare the last two steps with an ordinary counter and change the upper limit.',
  'Создать последовательность состояний с инверсной обратной связью.':
    'Create a sequence of states with inverted feedback.',
  'Инверсия старшего бита входит в младший: регистр сначала заполняется, затем очищается.':
    'The inverted top bit enters the lowest one: the register first fills up, then clears.',
  'С STEP_TICKS=1 проследите полный цикл из 12 состояний и сравните с кольцевым сдвигом.':
    'With STEP_TICKS=1 trace the full cycle of 12 states and compare it with a ring shift.',
  'Связать число тактов с длительностью видимого события.':
    'Link a number of clock cycles to the duration of a visible event.',
  'ticks считает интервал, lit переключается при HALF_PERIOD-1.':
    'ticks counts the interval, lit toggles at HALF_PERIOD-1.',
  'Для симуляции задайте HALF_PERIOD=4 и посчитайте такты между переключениями.':
    'For simulation set HALF_PERIOD=4 and count the clock cycles between toggles.',
  'Соединить делитель времени и кольцевой регистр для бегущего огня.':
    'Combine a time divider and a ring register for a running light.',
  'lights хранит один активный бит; ticks разрешает его вращение.':
    'lights holds one active bit; ticks enables its rotation.',
  'Поставьте STEP_TICKS=2 в симуляции и измените начальный рисунок на две единицы.':
    'Set STEP_TICKS=2 in simulation and change the initial pattern to two ones.',
  'Управлять средним временем включения LED сравнением фазы с порогом.':
    'Control the average on-time of an LED by comparing the phase with a threshold.',
  'Быстрый счётчик фазы и выбранный порог определяют заполнение импульса.':
    'A fast phase counter and the chosen threshold determine the pulse duty cycle.',
  'Сравните 25% и 75% на диаграммах, посчитав включённые такты одного периода.':
    'Compare 25% and 75% on the diagrams by counting the on clock cycles of one period.',
  'Получить разрешающий импульс раз в три такта (опыт только для диаграмм).':
    'Get an enable pulse once every three clock cycles (an experiment for diagrams only).',
  'phase проходит 0,1,2; условие phase=0 активно один такт из трёх.':
    'phase goes through 0,1,2; the condition phase=0 is active one cycle out of three.',
  'Проверьте заполнение 1/3. Используйте условие как enable, сохранив исходный clk.':
    'Check the 1/3 duty cycle. Use the condition as an enable, keeping the original clk.',
  'Отделить событие нажатия от удерживаемого уровня кнопки.':
    'Separate the press event from the held level of a button.',
  'meta/synced задерживают вход, previous хранит прошлый отсчёт, press выделяет фронт.':
    'meta/synced delay the input, previous holds the past sample, press picks out the edge.',
  'Удерживайте кнопку несколько тактов: переключение должно произойти один раз.':
    'Hold the button for several clock cycles: the toggle must happen once.',
  'Снять асинхронный сброс по фронтам рабочего такта.':
    'Release an asynchronous reset on the edges of the working clock.',
  'release_pipe немедленно очищается при нажатом сбросе (reset_n=0), а заполняется за два фронта.':
    'release_pipe is cleared immediately while reset is pressed (reset_n=0) and fills in two edges.',
  'Отпустите reset между фронтами и найдите первый разрешённый такт счётчика.':
    'Release reset between edges and find the first clock cycle in which the counter is enabled.',
  'Принять вход только после устойчивого интервала.':
    'Accept an input only after a stable interval.',
  'synced повторяет шум, stable меняется после STABLE_TICKS согласованных отсчётов.':
    'synced repeats the noise, stable changes after STABLE_TICKS consistent samples.',
  'Поставьте STABLE_TICKS=3, подайте 0,1,0,1 и затем три нуля подряд.':
    'Set STABLE_TICKS=3, apply 0,1,0,1 and then three zeros in a row.',
  'Растянуть короткое событие на заданное число тактов.':
    'Stretch a short event to a given number of clock cycles.',
  'remaining начинает отсчёт по press; новый фронт перезапускает интервал.':
    'remaining starts counting at press; a new edge restarts the interval.',
  'Для HOLD_TICKS=4 подайте второе нажатие до окончания и измерьте новый интервал.':
    'For HOLD_TICKS=4 apply a second press before the end and measure the new interval.',
  'Выдать импульс фиксированной длительности без повторного запуска.':
    'Produce a pulse of fixed duration without retriggering.',
  'Во время активного remaining новые события не принимаются.':
    'While remaining is active, new events are not accepted.',
  'Сравните два близких нажатия с pulse-capture при одинаковой длительности.':
    'Compare two close presses with pulse-capture at the same duration.',
  'Отсчитать время после последнего события и выделить момент истечения.':
    'Count the time after the last event and pick out the moment it expires.',
  'Новый press отодвигает окончание, expired активен только один такт.':
    'A new press postpones the end, expired is active for only one clock cycle.',
  'Для TIMEOUT_TICKS=5 подайте событие в последний такт и проверьте приоритет.':
    'For TIMEOUT_TICKS=5 apply an event in the last clock cycle and check the priority.',
  'Измерить длительность уровня и сохранить результат после отпускания.':
    'Measure the duration of a level and keep the result after release.',
  'width растёт во время синхронизированного нажатия, captured обновляется после него.':
    'width grows during the synchronized press, captured is updated after it.',
  'Задайте пять тактов нажатия; сравните сохранённую ширину с более длинным импульсом.':
    'Set five clock cycles of pressing; compare the saved width with a longer pulse.',
  'Поставить временной счёт на паузу с сохранением остатка интервала.':
    'Pause time counting while keeping the remainder of the interval.',
  'running разрешает изменение и ticks, и seconds; во время паузы оба удерживаются.':
    'running enables the change of both ticks and seconds; during the pause both are held.',
  'Для SECOND_TICKS=4 остановитесь посередине секунды, продолжите и проверьте остаток.':
    'For SECOND_TICKS=4 stop in the middle of a second, continue and check the remainder.',
  'Завершить обратный отсчёт устойчивым флагом done.':
    'Finish the countdown with a stable done flag.',
  'При seconds=1 следующий интервал даёт 0, выключает running и включает done.':
    'At seconds=1 the next interval gives 0, turns running off and turns done on.',
  'Поставьте SECOND_TICKS=2 и проверьте конец счёта и повторный запуск.':
    'Set SECOND_TICKS=2 and check the end of counting and a restart.',
  'Описать цикл устройства состояниями и условиями переходов.':
    'Describe the device cycle with states and transition conditions.',
  'RED, GREEN и YELLOW задают разные выходы и длительности.':
    'RED, GREEN and YELLOW set different outputs and durations.',
  'Сократите длительности для симуляции и проверьте порядок состояний после сброса.':
    'Shorten the durations for simulation and check the order of states after reset.',
  'Считать отдельные события и выдать результат после заданного числа.':
    'Count individual events and give a result after a given number.',
  'credit хранит две первые монеты, третья создаёт однотактовый dispense.':
    'credit holds the first two coins, the third creates a one-cycle dispense.',
  'Сравните одно удержание и три отдельных нажатия с отпусканиями.':
    'Compare a single hold with three separate presses and releases.',
  'Хранить цель движения до завершения временного интервала.':
    'Keep the movement target until the time interval is over.',
  'floor меняется при прибытии, moving блокирует запросы во время движения.':
    'floor changes on arrival, moving blocks requests while the car is moving.',
  'Для TRAVEL_TICKS=4 нажмите во время движения и проверьте, что цель сохраняется.':
    'For TRAVEL_TICKS=4 press during movement and check that the target is kept.',
  'Получить код Грея из двоичного счётчика.': 'Get a Gray code from a binary counter.',
  'binary XOR (binary>>1) меняет один бит между соседними значениями.':
    'binary XOR (binary>>1) changes one bit between neighboring values.',
  'С STEP_TICKS=1 сравните binary и gray на переходе 3→4 и сосчитайте изменившиеся разряды.':
    'With STEP_TICKS=1 compare binary and gray at the 3→4 transition and count the bits that changed.',
  'Добавить к слову бит чётности через XOR всех разрядов.':
    'Add a parity bit to a word through the XOR of all bits.',
  'Пять битов data и выход XOR вместе дают чётное количество единиц.':
    'The five bits of data and the XOR output together contain an even number of ones.',
  'Выберите слова с одной, двумя и тремя единицами и проверьте бит чётности.':
    'Choose words with one, two and three ones and check the parity bit.',
  'Разделить двоичное число на десятичные десятки и единицы.':
    'Split a binary number into decimal tens and ones.',
  'Кнопка переключает показ цифр; BCD-код каждой цифры лежит в диапазоне 0…9.':
    'A button switches which digits are shown; the BCD code of each digit is in the range 0…9.',
  'Проследите значения 9, 10, 19 и 20 и отличите код цифры от двоичного числа.':
    'Trace the values 9, 10, 19 and 20 and tell a digit code from a binary number.',
  'Организовать перенос между двумя десятичными счётчиками.':
    'Organize a carry between two decimal counters.',
  'units идёт 0…9; переход 9→0 увеличивает tens, а после 99 получается 00.':
    'units goes 0…9; the 9→0 transition increments tens, and after 99 you get 00.',
  'Для SECOND_TICKS=1 посмотрите units и tens на переходах 09→10 и 99→00.':
    'For SECOND_TICKS=1 look at units and tens on the transitions 09→10 and 99→00.',
  'Перевести код десятичной цифры в таблицу сегментов.':
    'Translate the code of a decimal digit into a segment table.',
  'Внутреннее слово сегментов содержит семь битов; плата показывает только шесть.':
    'The internal segment word has seven bits; the board shows only six.',
  'Сравните узоры 0 и 8 на всех внутренних битах. Отдельный индикатор здесь не подключён.':
    'Compare the patterns 0 and 8 on all internal bits. No separate display is connected here.',
  'Объединить два независимых кольцевых состояния на одних выходах.':
    'Combine two independent ring states on the same outputs.',
  'left и right вращаются навстречу, а OR совмещает их LED-узоры.':
    'left and right rotate toward each other, and OR merges their LED patterns.',
  'Для STEP_TICKS=2 проследите сближение и объясните повторение центрального узора.':
    'For STEP_TICKS=2 trace the approach and explain the repetition of the central pattern.',
  'Прочитать постоянное слово по адресу из таблицы.':
    'Read a constant word from a table by address.',
  'sample[2:0] выбирает одну из восьми заранее заданных констант.':
    'sample[2:0] chooses one of eight predefined constants.',
  'Измените слово для одного адреса и проверьте, что соседние адреса сохранились.':
    'Change the word for one address and check that the neighboring addresses are preserved.',
  'Реализовать ограниченную числовую функцию таблицей значений.':
    'Implement a bounded numeric function with a lookup table.',
  'Для n=0…7 case возвращает n²; результат имеет шесть битов.':
    'For n=0…7 case returns n²; the result has six bits.',
  'Сравните таблицу с выражением n*n в RTL и ресурсах Gowin.':
    'Compare the table with the expression n*n in the RTL and in Gowin resources.',
  'Пройти ROM последовательно с отдельным счётчиком адреса.':
    'Walk through a ROM sequentially with a separate address counter.',
  'Название опыта обозначает последовательность LED-узоров; звукового выхода нет.':
    'The experiment name stands for a sequence of LED patterns; there is no sound output.',
  'Сократите STEP_TICKS и переставьте два слова таблицы, наблюдая новый порядок.':
    'Shorten STEP_TICKS and swap two table words, watching the new order.',
  'Различить signed и unsigned толкование одной битовой комбинации.':
    'Tell the signed and unsigned interpretations of one bit combination apart.',
  'Код 100 означает 4 без знака и −4 со знаком; результаты сравнения могут различаться.':
    'The code 100 means 4 unsigned and −4 signed; the comparison results may differ.',
  'Сравните 100 и 011 в двух режимах и объясните значения признаков.':
    'Compare 100 and 011 in the two modes and explain the values of the flags.',
  'Отличить беззнаковый перенос от знакового переполнения.':
    'Tell an unsigned carry from a signed overflow.',
  'sum[3] — перенос, overflow зависит от знаков операндов и результата.':
    'sum[3] is the carry; overflow depends on the signs of the operands and of the result.',
  'Проверьте 3+1 и −1+1: у каждого случая возникает только один из двух признаков.':
    'Check 3+1 and −1+1: in each case only one of the two flags occurs.',
  'Упростить логическую формулу без изменения таблицы истинности.':
    'Simplify a logic formula without changing its truth table.',
  'Добавление члена bc не меняет ab+НЕ(a)c; индикатор различия остаётся нулём.':
    'Adding the term bc does not change ab+NOT(a)c; the difference indicator stays zero.',
  'Проверьте все восемь строк и сравните схемы после оптимизации Yosys.':
    'Check all eight rows and compare the circuits after Yosys optimization.',
  'Выбирать минимум или максимум знаковых операндов.':
    'Choose the minimum or maximum of signed operands.',
  'a и b — трёхбитные дополнительные коды, low/high сохраняют signed-порядок.':
    "a and b are three-bit two's complement codes, low/high preserve the signed order.",
  'Сравните −4 и +3, затем переключите кнопку выбора min/max.':
    'Compare −4 and +3, then switch the min/max select button.',
  'Получить модуль отрицательного числа с учётом разрядности.':
    'Get the absolute value of a negative number, taking the bit width into account.',
  'Знак расширяется перед отрицанием; модуль −4 равен unsigned 4.':
    'The sign is extended before negation; the absolute value of −4 is unsigned 4.',
  'Проверьте все значения −4…3 и объясните, почему +4 не помещается в signed 3 бита.':
    'Check all values −4…3 and explain why +4 does not fit into signed 3 bits.',
  'Ограничить сумму верхней границей вместо оборачивания.':
    'Limit the sum to an upper bound instead of wrapping around.',
  'Расширенная sum определяет выход min(sum,7) и признак ограничения.':
    'The widened sum determines the output min(sum,7) and the saturation flag.',
  'Сравните 7+1 с обычным трёхбитным сложением и результатом 3+4.':
    'Compare 7+1 with ordinary three-bit addition and with the result of 3+4.',
  'Вычислить целое среднее без переполнения промежуточной суммы.':
    'Compute an integer average without overflowing the intermediate sum.',
  'Сумма расширяется до четырёх битов, затем младший бит отбрасывается.':
    'The sum is extended to four bits, then the lowest bit is dropped.',
  'Проверьте (7+7)/2 и (3+4)/2; найдите признак отброшенной половины.':
    'Check (7+7)/2 and (3+4)/2; find the flag of the dropped half.',
  'Построить умножение из выбранных частичных произведений.':
    'Build multiplication from selected partial products.',
  'Биты множителя разрешают a и a<<1; сумма этих частей равна произведению.':
    'The multiplier bits enable a and a<<1; the sum of these parts equals the product.',
  'Проверьте 7×3 и обнулите один бит множителя, проследив отключённую часть.':
    'Check 7×3 and zero one multiplier bit, tracing the disabled part.',
  'Определить поведение деления на ноль и проверить частное с остатком.':
    'Define the behavior of division by zero and check the quotient with remainder.',
  'Для b≠0 выполняется a=q·b+r; при b=0 выбраны q=0, r=a.':
    'For b≠0 a=q·b+r holds; for b=0 we chose q=0, r=a.',
  'Проверьте 7/3 и 7/0; сравните ресурсы делителя и сумматора.':
    'Check 7/3 and 7/0; compare the resources of a divider and an adder.',
  'Посчитать единицы в слове независимо от их позиций.':
    'Count the ones in a word regardless of their positions.',
  'Цикл описывает сумму шести битов; count лежит в диапазоне 0…6.':
    'The loop describes the sum of six bits; count is in the range 0…6.',
  'Сравните 001111 и 101010, затем слово 111111.':
    'Compare 001111 and 101010, then the word 111111.',
  'Найти старшую единицу через число ведущих нулей.':
    'Find the highest one through the number of leading zeros.',
  'Приоритетная проверка начинается с бита 5; для нулевого слова ответ 6.':
    'The priority check starts from bit 5; for the zero word the answer is 6.',
  'Проверьте 001010 и 000000 и сопоставьте ветви if с результатом.':
    'Check 001010 and 000000 and match the if branches with the result.',
  'Связать младшие нулевые разряды с делимостью на степени двойки.':
    'Link the low zero bits to divisibility by powers of two.',
  'Поиск идёт от бита 0; специальный нулевой вход даёт ответ 6.':
    'The search goes from bit 0; the special zero input gives the answer 6.',
  'Сравните 001100 и 010000; объясните делимость этих чисел на 4 и 16.':
    'Compare 001100 and 010000; explain the divisibility of these numbers by 4 and 16.',
  'Выдать номер старшего запроса и отдельный признак valid.':
    'Output the number of the highest request and a separate valid flag.',
  'Номер 0 используется и для бита 0, и для пустого слова; valid различает случаи.':
    'The number 0 is used both for bit 0 and for an empty word; valid tells the cases apart.',
  'Сравните 000001, 000000 и 101000 и проверьте выбор старшего запроса.':
    'Compare 000001, 000000 and 101000 and check the choice of the highest request.',
  'Различить ровно одну единицу и не более одной единицы.':
    'Tell exactly one one from at most one one.',
  'Нулевое слово допустимо для one-hot-or-zero, но не для one-hot.':
    'The zero word is valid for one-hot-or-zero but not for one-hot.',
  'Проверьте 000000, 001000 и 001100, сопоставив оба признака.':
    'Check 000000, 001000 and 001100, matching both flags.',
  'Выбирать величину сдвига каскадом мультиплексоров.':
    'Choose the shift amount with a cascade of multiplexers.',
  'Двухбитное управление задаёт сдвиг на 0…3 позиции; разряды за краем теряются.':
    'A two-bit control sets a shift by 0…3 positions; bits beyond the edge are lost.',
  'Проследите один исходный бит при четырёх значениях сдвига и сравните с вращением.':
    'Trace a single source bit at the four shift values and compare with rotation.',
  'Вычислить отдельную чётность для каждого префикса слова.':
    'Compute a separate parity for each prefix of a word.',
  'Каждый выход накапливает XOR от младшего бита до своей позиции.':
    'Each output accumulates the XOR from the lowest bit up to its position.',
  'Для 001011 посчитайте последовательные XOR вручную и сравните все шесть выходов.':
    'For 001011 compute the successive XORs by hand and compare all six outputs.',
  'Получить CRC как остаток двоичного полиномиального деления.':
    'Get a CRC as the remainder of binary polynomial division.',
  'MSB-first входной бит влияет на обратную связь и условный XOR 011.':
    'MSB-first, the input bit affects the feedback and the conditional XOR 011.',
  'Проверьте слово 000001 с CRC=011 и измените один исходный бит.':
    'Check the word 000001 with CRC=011 and change one source bit.',
  'Распределить данные и проверки чётности по позициям кода Хэмминга.':
    'Distribute data and parity checks over the positions of a Hamming code.',
  'Позиции 1,2,4 содержат проверки, 3,5,6 — данные укороченного кода.':
    'Positions 1,2,4 hold the checks, 3,5,6 hold the data of the shortened code.',
  'Для data=101 проверьте чётность каждой из трёх проверяемых групп.':
    'For data=101 check the parity of each of the three checked groups.',
  'Определить позицию одиночной ошибки по синдрому.':
    'Find the position of a single error from the syndrome.',
  'Для одной ошибки синдром равен её позиции; несколько ошибок могут его имитировать.':
    'For a single error the syndrome equals its position; several errors may imitate it.',
  'Из нулевого слова изменяйте по одному биту в позициях 1…6, затем два сразу.':
    'Starting from the zero word flip one bit at a time in positions 1…6, then two at once.',
  'Накопить чётность четырёх последовательных отсчётов.':
    'Accumulate the parity of four consecutive samples.',
  'parity копит XOR, published обновляется раз в четыре бита; синхронизатор задерживает вход.':
    'parity accumulates the XOR, published is updated once every four bits; the synchronizer delays the input.',
  'Подайте 1,0,1,1 по одному биту на такт после задержки и проверьте published=1.':
    'Apply 1,0,1,1 one bit per clock cycle after the delay and check published=1.',
  'Вести CRC-регистр по потоку битов с обратной связью.':
    'Run a CRC register over a bit stream with feedback.',
  'crc обновляется каждый такт по x⁴+x+1; bit_index считает принятые биты по модулю 4.':
    'crc is updated every clock cycle by x⁴+x+1; bit_index counts the received bits modulo 4.',
  'После синхронизации подайте четыре единицы и проверьте CRC=0010.':
    'After synchronization apply four ones and check CRC=0010.',
  'Создать детерминированную псевдослучайную последовательность.':
    'Create a deterministic pseudo-random sequence.',
  'Обратная связь state[5] XOR state[4] даёт период 63 из seed=1.':
    'The feedback state[5] XOR state[4] gives a period of 63 from seed=1.',
  'Для STEP_TICKS=1 проследите 63 состояния; замените seed на 0 и объясните остановку.':
    'For STEP_TICKS=1 trace the 63 states; replace seed with 0 and explain the stall.',
  'Получить среднюю частоту событий накоплением дробной фазы.':
    'Get an average event rate by accumulating a fractional phase.',
  'Добавление 3 к трёхбитной фазе даёт три переноса за восемь тактов.':
    'Adding 3 to a three-bit phase gives three carries in eight clock cycles.',
  'Проследите 16 фронтов: сосчитайте tick и интервалы 3,3,2 между ними.':
    'Trace 16 edges: count tick and the intervals 3,3,2 between them.',
  'Измерить долю активных отсчётов в конечном окне.':
    'Measure the share of active samples in a finite window.',
  'measured публикует число нажатых отсчётов из предыдущего окна в восемь тактов.':
    'measured publishes the number of pressed samples from the previous eight-cycle window.',
  'Сравните постоянные уровни и меандр; учтите задержку синхронизатора на два такта.':
    'Compare constant levels and a square wave; take the two-cycle synchronizer delay into account.',
  'Подсчитать события в окне и включить пограничный фронт в правильное окно.':
    'Count events in a window and put a boundary edge in the correct window.',
  'next_count учитывает press даже в последний такт перед публикацией.':
    'next_count accounts for press even in the last clock cycle before publishing.',
  'Для WINDOW_TICKS=12 разместите события перед границей и на ней, сравните published.':
    'For WINDOW_TICKS=12 place events before the boundary and on it, and compare published.',
  'Подавить одиночный выброс голосованием трёх последних отсчётов.':
    'Suppress a single glitch by voting over the last three samples.',
  'history хранит окно из трёх отсчётов; большинство выбирает выход.':
    'history holds a window of three samples; the majority selects the output.',
  'Сравните 0,1,0 и 0,1,1,0 с учётом двухтактной задержки входа.':
    'Compare 0,1,0 and 0,1,1,0, taking the two-cycle input delay into account.',
  'Сохранить экстремумы потока до нового окна измерения.':
    'Keep the extremes of a stream until a new measurement window.',
  'minimum/maximum обрабатывают прежний sample до его увеличения.':
    'minimum/maximum process the previous sample before it is incremented.',
  'Проверьте цикл 0…7, начните новое окно в середине и посмотрите переход 7→0.':
    'Check the cycle 0…7, start a new window in the middle and look at the 7→0 transition.',
  'Составить периодическую форму из ROM отсчётов.': 'Compose a periodic waveform from ROM samples.',
  'phase выбирает отсчёт таблицы; цифровое число не является аналоговым напряжением.':
    'phase selects a table sample; a digital number is not an analog voltage.',
  'Сократите шаг и проследите полный период в диаграммах; измените один отсчёт.':
    'Shorten the step and trace a full period in the diagrams; change one sample.',
  'Соединить PWM с медленно меняющимся порогом яркости.':
    'Combine PWM with a slowly changing brightness threshold.',
  'phase отвечает за PWM, level и down — за треугольную огибающую.':
    'phase is responsible for PWM, level and down for the triangular envelope.',
  'Сократите LEVEL_TICKS и проверьте развороты level на 0 и 255.':
    'Shorten LEVEL_TICKS and check the reversals of level at 0 and 255.',
  'Распознать образец в последовательном потоке с перекрытиями.':
    'Recognize a pattern in a serial stream with overlaps.',
  'state хранит найденный префикс; после совпадения сохраняется префикс «1».':
    'state holds the prefix found so far; after a match the prefix "1" is kept.',
  'Подайте поток 1011011 после синхронизации и проверьте два импульса совпадения.':
    'Apply the stream 1011011 after synchronization and check two match pulses.',
  'Обработать повторный запрос в разных состояниях временного автомата.':
    'Handle a repeated request in different states of a timed state machine.',
  'Запрос в OPEN продлевает ожидание, а в CLOSING меняет направление перехода.':
    'A request in OPEN extends the wait, and in CLOSING it reverses the direction of the transition.',
  'Для MOVE_TICKS=2 и HOLD_TICKS=4 подайте нажатие при закрытии и проследите переход.':
    'For MOVE_TICKS=2 and HOLD_TICKS=4 press during closing and trace the transition.',
  'Передать байт кадром UART 8N1 с заданным временем бита.':
    'Send a byte in a UART 8N1 frame with a given bit time.',
  'После стартового нуля следуют восемь битов LSB-first и стоповая единица.':
    'After the start zero come eight LSB-first bits and a stop one.',
  'Проверьте кадр ASCII A (0x41) в диаграммах; TX платы действительно назначен в CST.':
    "Check the ASCII A (0x41) frame in the diagrams; the board's TX really is assigned in the CST.",
  'Принять асинхронный UART-кадр выборкой в середине битов.':
    'Receive an asynchronous UART frame by sampling in the middle of the bits.',
  'rx_meta/rx_sync синхронизируют RX, автомат ждёт старт и собирает байт.':
    'rx_meta/rx_sync synchronize RX, the state machine waits for the start and assembles the byte.',
  'Подайте 8N1-кадр 0x41 с нужным периодом; проверьте data и признак завершения.':
    'Apply an 8N1 frame 0x41 with the right period; check data and the completion flag.',
  'Развести смену и выборку данных по разным фронтам SPI mode 0.':
    'Separate data shifting and sampling on different edges of SPI mode 0.',
  'SCK в покое 0; приём на растущем фронте, изменение MOSI на падающем.':
    'SCK idles at 0; reception on the rising edge, MOSI changes on the falling edge.',
  'Для HALF_TICKS=1 запустите 0xA6 и проверьте received. Loopback внутренний, контакты SPI не подключены.':
    'For HALF_TICKS=1 send 0xA6 and check received. The loopback is internal, the SPI pins are not connected.',
  'Различить START и STOP по изменению SDA при высоком SCL.':
    'Tell START from STOP by the change of SDA while SCL is high.',
  'drive_low моделирует открытый сток: отпускание линии не равно принудительной единице.':
    'drive_low models an open drain: releasing the line is not the same as driving a one.',
  'Для STEP_TICKS=1 найдите START, один учебный бит и STOP; адреса и ACK здесь нет.':
    'For STEP_TICKS=1 find START, one teaching bit and STOP; there are no addresses or ACK here.',
  'Связать иерархию модулей, комбинационную ALU и регистры результата.':
    'Link the module hierarchy, a combinational ALU and result registers.',
  'Откройте top → u_alu → u_adder; led_n хранит результат для предыдущего a.':
    'Open top → u_alu → u_adder; led_n holds the result for the previous a.',
  'Проследите 70 разрешённых тактов, все четыре операции и переполнение шестибитной суммы.':
    'Trace 70 enabled clock cycles, all four operations and the overflow of the six-bit sum.',
  'Обменять параллельную площадь сумматора на несколько тактов вычисления.':
    'Trade the parallel area of an adder for several clock cycles of computation.',
  'Один bit_sum обрабатывает разряд за такт, carry хранится между разрядами.':
    'One bit_sum processes a bit per clock cycle, carry is kept between bits.',
  'Проследите 9+7 за четыре такта и сравните задержку с параллельным сумматором.':
    'Trace 9+7 over four clock cycles and compare the delay with a parallel adder.',
  'Сохранить запрос до подтверждения и определить поведение занятости.':
    'Keep a request until acknowledged and define the behavior when busy.',
  'pending удерживается до ack; новый запрос при pending игнорируется.':
    'pending is held until ack; a new request while pending is ignored.',
  'Для RESPONSE_TICKS=3 подайте второй запрос до ответа и проверьте completed.':
    'For RESPONSE_TICKS=3 apply a second request before the reply and check completed.',
  'Передать событие изменением toggle и понять предел пропускной способности.':
    'Pass an event by changing a toggle and understand the throughput limit.',
  'Изменение source_toggle проходит через target_meta/target_sync; arrived выделяет событие.':
    'A change of source_toggle goes through target_meta/target_sync; arrived picks out the event.',
  'Сравните редкие и близкие события. В этом опыте один clk; настоящий двухдоменный CDC не реализован.':
    'Compare rare and close events. There is a single clk in this experiment; a real two-domain CDC is not implemented.',
  'Обслужить постоянные запросы чередованием приоритета.':
    'Serve constant requests by alternating the priority.',
  'B просит всегда, A — при нажатии; при обоих запросах grant чередует A и B.':
    'B always requests, A requests when pressed; with both requesting, grant alternates between A and B.',
  'Удерживайте оба запроса и проверьте отсутствие двух grant одновременно и голодания A.':
    'Hold both requests and check that there are never two grants at once and that A is not starved.',
  'Разделить запись и синхронное чтение массива с адресной задержкой.':
    'Separate the write and the synchronous read of an array with an address delay.',
  'data получает слово по адресу до фронта; маленький сбрасываемый массив обычно станет регистрами.':
    'data receives the word at the address before the edge; a small resettable array usually becomes registers.',
  'Проследите запись четырёх слов и сопоставьте каждый data с предыдущим адресом.':
    'Trace the writing of four words and match each data with the previous address.',
  'Построить очередь с кольцевыми указателями и границами full/empty.':
    'Build a queue with ring pointers and full/empty boundaries.',
  'write_ptr/read_ptr движутся отдельно, used ограничивает доступ; старейшее слово читается первым.':
    'write_ptr/read_ptr move separately, used limits the access; the oldest word is read first.',
  'После заполнения 1,2,3,4 прочитайте несколько слов и проследите оборачивание указателей.':
    'After filling with 1,2,3,4 read several words and trace the wrap-around of the pointers.',
  'Отличить стек от очереди и защитить границы массива.':
    'Tell a stack from a queue and protect the array boundaries.',
  'depth выбирает вершину; первое чтение заполненного стека выдаёт 4 вместо 1.':
    'depth selects the top; the first read of a full stack gives 4 instead of 1.',
  'Сравните первое снятие с FIFO и учтите автоматическое пополнение на свободном такте.':
    'Compare the first pop with the FIFO and take the automatic refill on an idle cycle into account.',
  'Выделить отсутствие событий как неисправность и защёлкнуть сигнал тревоги.':
    'Treat the absence of events as a fault and latch an alarm signal.',
  'silence сбрасывается подтверждением, alarm после таймаута удерживается до reset.':
    'silence is cleared by an acknowledgment, alarm after the timeout is held until reset.',
  'Для LIMIT_TICKS=5 подайте подтверждение до и после таймаута: позднее не снимает тревогу.':
    'For LIMIT_TICKS=5 apply an acknowledgment before and after the timeout: a late one does not clear the alarm.',
  'Сгладить поток средним четырёх отсчётов и проверить заполнение окна.':
    'Smooth a stream with the average of four samples and check the filling of the window.',
  'delay1…3 хранят предыдущие отсчёты; input_sample=32 даёт average=8 четыре раза подряд.':
    'delay1…3 hold the previous samples; input_sample=32 gives average=8 four times in a row.',
  'Для SAMPLE_TICKS=1 проследите 20 тактов. Почему первое среднее делится на четыре при незаполненном окне?':
    'For SAMPLE_TICKS=1 trace 20 clock cycles. Why is the first average divided by four while the window is not full?',
  'Разделить мини-растр на активные точки, гашение и синхронизацию.':
    'Split a mini raster into active pixels, blanking and synchronization.',
  'horizontal считает 14 точек строки, vertical — 7 строк; активная область имеет 8×4 точки.':
    'horizontal counts 14 points of a line, vertical counts 7 lines; the active area is 8×4 points.',
  'Смотрите 98 тактов: hsync_n низкий в точках 10/11, vsync_n — всю строку 5. Это внутренний растр без HDMI.':
    'Watch 98 clock cycles: hsync_n is low at points 10/11, vsync_n for the whole of line 5. This is an internal raster without HDMI.',
  'Рассчитать цифровую частоту по слову настройки аккумулятора фазы.':
    'Calculate a digital frequency from the tuning word of a phase accumulator.',
  'phase складывается с FREQUENCY_WORD по модулю 65536, digital_tone равен старшему биту.':
    'phase is added to FREQUENCY_WORD modulo 65536, digital_tone equals the top bit.',
  'Поставьте FREQUENCY_WORD=16384 и проследите четыре фазы. Рассчитайте частоту; динамик не подключён.':
    'Set FREQUENCY_WORD=16384 and trace four phases. Calculate the frequency; no speaker is connected.',
  'Обнаружить нарушение удержания valid/data и сохранить флаг ошибки.':
    'Detect a violation of valid/data hold and keep an error flag.',
  'waiting и held_data хранят предыдущий stalled такт; fault защёлкивает изменение данных или исчезновение valid.':
    'waiting and held_data keep the previous stalled cycle; fault latches a change of data or the disappearance of valid.',
  'Нажатием внесите ошибку сначала с FAULT_MODE=0, затем 1. Отпустите кнопку: fault очищается только сбросом.':
    'Introduce an error with the button, first with FAULT_MODE=0, then 1. Release the button: fault is cleared only by reset.',
  'Связать signed-коэффициенты FIR с конечной импульсной характеристикой.':
    'Link signed FIR coefficients to a finite impulse response.',
  'term0…2 умножают текущий и задержанные отсчёты; filtered хранит знаковую сумму после масштабирования.':
    'term0…2 multiply the current and delayed samples; filtered holds the signed sum after scaling.',
  'Для SAMPLE_TICKS=1 проверьте отклик 8,16,8. Задайте A=1,B=0,C=−1 и SCALE_SHIFT=0: получите 32,0,−32.':
    'For SAMPLE_TICKS=1 check the response 8,16,8. Set A=1,B=0,C=−1 and SCALE_SHIFT=0: you get 32,0,−32.',
  'Представить уровень плотностью единиц с сохранением остатка ошибки.':
    'Represent a level by a density of ones, keeping the remaining error.',
  'Перенос accumulated выдаётся как pulse, remainder сохраняет дробный остаток для следующего такта.':
    'The carry of accumulated is emitted as pulse, remainder keeps the fractional leftover for the next clock cycle.',
  'После синхронизации уровня посчитайте 64 такта: level=16 даёт 16 единиц, level=48 — 48. Аналогового ЦАП нет.':
    'After synchronizing the level count 64 clock cycles: level=16 gives 16 ones, level=48 gives 48. There is no analog DAC.',
  'Проследить чтение инструкции, условный переход и останов процессора.':
    'Trace an instruction fetch, a conditional jump and the halt of a processor.',
  'FETCH читает program_rom, EXECUTE меняет accumulator и pc; OUT копирует значение в output_value.':
    'FETCH reads program_rom, EXECUTE changes accumulator and pc; OUT copies the value to output_value.',
  'Проследите программу 3→2→1→0 за 24 такта, затем halted. Измените LDI; это учебный CPU без RISC-V и C.':
    'Trace the program 3→2→1→0 over 24 clock cycles, then halted. Change LDI; this is a teaching CPU without RISC-V and C.',
  'Сохранить порядок слов в эластичном буфере при обратном давлении.':
    'Preserve the order of words in an elastic buffer under back pressure.',
  'send/receive равны valid И ready; полный буфер удерживает payload при остановленном приёмнике.':
    'send/receive equal valid AND ready; a full buffer holds payload while the receiver is stopped.',
  'Остановите приёмник кнопкой на восемь тактов, затем отпустите. Проверьте порядок и одновременную передачу/замену слова.':
    'Stop the receiver with the button for eight clock cycles, then release it. Check the order and a simultaneous transfer/replacement of a word.',
};
