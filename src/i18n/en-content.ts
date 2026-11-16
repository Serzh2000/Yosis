/** Английские тексты области «content». Ключ — русская фраза из кода. */
export const content: Record<string, string> = {
  'движки: 1 0 1 1\nчисло:  1011 = 11': 'sliders: 1 0 1 1\nnumber:  1011 = 11',
  'Любая деталь на столе получает питание от платы: плюс (VCC, на плате 3V3) и минус (GND, общая земля). Земля у всех деталей общая. Сигнальный вывод детали ты соединяешь проводом с контактом платы: в схеме этому выводу соответствует порт, а контакт платы и есть «ножка» кристалла, на которую порт назначен.':
    'Every part on the bench gets power from the board: plus (VCC, on the board 3V3) and minus (GND, the common ground). The ground is common to all parts. You connect a part\'s signal pin with a wire to a pin of the board: in the circuit this pin corresponds to a port, and the board pin is the very "leg" of the chip to which the port is assigned.',
  'Светодиод и ограничение тока': 'An LED and current limiting',
  'Зачем ограничивать ток': 'Why limit the current',
  'Светодиод почти не сопротивляется току: если подать на него напряжение напрямую, ток вырастет, и светодиод или вывод платы выйдет из строя. Поэтому последовательно со светодиодом ставят **резистор-ограничитель** (деталь, которая «давит» ток до безопасных нескольких миллиампер).\n\nНа столе лаборатории светодиод уже снабжён таким резистором, отдельно его ставить не надо. На реальной плате о нём придётся помнить.':
    'An LED hardly resists current: if you apply voltage to it directly, the current rises, and the LED or the board pin fails. So a **limiting resistor** (a part that "presses" the current down to a safe few milliamps) is placed in series with the LED.\n\nOn the lab bench the LED already comes with such a resistor, you do not need to place it separately. On a real board you will have to remember it.',
  'Как подключить': 'How to connect',
  'Зачем последовательно со светодиодом ставят резистор?':
    'Why is a resistor placed in series with an LED?',
  'Чтобы ограничить ток и не сжечь светодиод': 'To limit the current and not burn the LED',
  'Чтобы светодиод светил другим цветом': 'To make the LED shine in a different color',
  'Чтобы светодиод мигал': 'To make the LED blink',
  'Сопротивление светодиода мало, и без ограничителя ток растёт до опасных значений. Резистор задаёт безопасный ток, цвет и мигание от него не зависят.':
    'The resistance of an LED is small, and without a limiter the current rises to dangerous values. The resistor sets a safe current, and color and blinking do not depend on it.',
  'Поставь на стол светодиод и подключи его сигнальный вывод к плате.':
    'Place an LED on the bench and connect its signal pin to the board.',
  'На столе светодиод': 'An LED is on the bench',
  'Светодиод соединён с платой': 'The LED is connected to the board',
  'Подключён один вывод светодиода': 'One pin of the LED is connected',
  'Два светодиода': 'Two LEDs',
  'У каждого светодиода свой контакт': 'Each LED has its own pin',
  'Если схема должна зажигать два светодиода по отдельности, каждому нужен свой выходной порт, а значит, свой контакт платы. Один провод на два светодиода дал бы одинаковое поведение: они горели бы и гасли вместе.':
    'If the circuit must light two LEDs separately, each needs its own output port, and so its own board pin. One wire for two LEDs would give the same behavior: they would light and go out together.',
  'Что делать на столе': 'What to do on the bench',
  'Поставь на стол два светодиода и соедини каждый с платой отдельным проводом.':
    'Place two LEDs on the bench and connect each to the board with a separate wire.',
  'На столе два светодиода': 'Two LEDs are on the bench',
  'Оба светодиода соединены с платой': 'Both LEDs are connected to the board',
  'Подключено два вывода': 'Two pins are connected',
  'Три светодиода в ряд': 'Three LEDs in a row',
  'Светофор из трёх выводов': 'A traffic light with three pins',
  'На полке есть готовый **светофор**: красный, жёлтый и зелёный светодиоды в одном корпусе. У него три сигнальных вывода: R, Y и G, по одному на цвет. Схема-автомат (например, переключающий огни по кругу) выдаёт три сигнала, и каждый идёт на свой цвет.':
    'On the shelf there is a ready-made **traffic light**: red, yellow and green LEDs in one housing. It has three signal pins: R, Y and G, one per color. A state-machine circuit (for example, one that switches the lights in a circle) outputs three signals, and each goes to its own color.',
  Подключение: 'Connection',
  'Поставь светофор и подключи все три его вывода к плате.':
    'Place the traffic light and connect all three of its pins to the board.',
  'На столе светофор': 'A traffic light is on the bench',
  'Светофор соединён с платой': 'The traffic light is connected to the board',
  'Подключены все три вывода: R, Y и G': 'All three pins are connected: R, Y and G',
  'RGB-светодиод': 'An RGB LED',
  'Три цвета в одном корпусе': 'Three colors in one housing',
  'В RGB-светодиоде три кристалла: красный (R), зелёный (G) и синий (B). Включая их по отдельности и вместе, получаешь другие цвета: красный и зелёный дают жёлтый, все три дают белый. Чтобы менять яркость каждого, на вывод подают ШИМ: быстро включают и выключают сигнал, а доля «включено» задаёт яркость.':
    'An RGB LED has three dies: red (R), green (G) and blue (B). Turning them on separately and together gives other colors: red and green give yellow, all three give white. To change the brightness of each, PWM is fed to the pin: the signal is switched on and off quickly, and the share of "on" sets the brightness.',
  'Какие цвета нужно включить, чтобы RGB-светодиод светился белым?':
    'Which colors must be turned on for an RGB LED to shine white?',
  'Только зелёный': 'Only green',
  'Красный и синий': 'Red and blue',
  'Красный, зелёный и синий': 'Red, green and blue',
  'Белый получается при смешении всех трёх основных цветов. Красный с синим дадут пурпурный.':
    'White is obtained by mixing all three primary colors. Red with blue will give magenta.',
  'Поставь RGB-светодиод и подключи все три цветовых вывода к плате.':
    'Place an RGB LED and connect all three color pins to the board.',
  'На столе RGB-светодиод': 'An RGB LED is on the bench',
  'Подключены три вывода: R, G и B': 'Three pins are connected: R, G and B',
  'Кнопка управляет светодиодом': 'A button controls an LED',
  'Вход и выход вместе': 'Input and output together',
  'Кнопка даёт схеме **входной** сигнал: пока она нажата, на выводе OUT единица. Светодиод принимает **выходной** сигнал схемы: единица на его выводе зажигает его. Простейшая схема просто соединяет вход с выходом, и светодиод горит, пока держишь кнопку.':
    "A button gives the circuit an **input** signal: while it is pressed, there is a one on the pin OUT. An LED receives the circuit's **output** signal: a one on its pin lights it. The simplest circuit just connects the input to the output, and the LED is lit while you hold the button.",
  'Что соединять': 'What to connect',
  'Поставь кнопку и светодиод и подключи оба сигнальных вывода к плате.':
    'Place a button and an LED and connect both signal pins to the board.',
  'На столе кнопка': 'A button is on the bench',
  'Кнопка соединена с платой': 'The button is connected to the board',
  Тумблер: 'A toggle switch',
  'Переключатель, который помнит': 'A switch that remembers',
  'Кнопка работает, только пока её держат. **Тумблер** остаётся в выбранном положении: рычажок вверх даёт на выводе 1, вниз даёт 0. Поэтому тумблером удобно задавать режим работы схемы, а не подавать импульс.':
    "A button works only while it is held. A **toggle switch** stays in the chosen position: the lever up gives 1 on the pin, down gives 0. So a toggle switch is convenient for setting the circuit's mode of operation rather than giving a pulse.",
  'Чем тумблер отличается от кнопки без фиксации?':
    'How does a toggle switch differ from a momentary button?',
  'Остаётся в выбранном положении и после того, как его отпустили':
    'It stays in the chosen position even after being released',
  'Даёт на выходе больше напряжения': 'It gives more voltage on the output',
  'Имеет три вывода вместо одного': 'It has three pins instead of one',
  'Тумблер фиксируется в положении 1 или 0, а кнопка возвращается обратно при отпускании.':
    'A toggle switch latches in position 1 or 0, while a button returns back when released.',
  'Поставь тумблер и подключи его вывод к плате.':
    'Place a toggle switch and connect its pin to the board.',
  'На столе тумблер': 'A toggle switch is on the bench',
  'Тумблер соединён с платой': 'The toggle switch is connected to the board',
  'Подключён один вывод OUT': 'One pin OUT is connected',
  'Клавишный выключатель': 'A rocker switch',
  'Выключатель, как у лампы': 'A switch like on a lamp',
  'Клавишный выключатель работает так же, как тумблер, но с плоской клавишей: нажал одну сторону и получил 1 («включено»), нажал другую и получил 0 («выключено»). Для схемы разницы нет, отличается только вид и удобство.':
    'A rocker switch works like a toggle switch, but with a flat key: press one side and get 1 ("on"), press the other and get 0 ("off"). For the circuit there is no difference, only the look and convenience differ.',
  'Поставь клавишный выключатель и подключи его к плате.':
    'Place a rocker switch and connect it to the board.',
  'На столе клавишный выключатель': 'A rocker switch is on the bench',
  'Выключатель соединён с платой': 'The switch is connected to the board',
  'Ползунковый переключатель': 'A slide switch',
  'Ползунок на два положения': 'A slider with two positions',
  'У ползункового переключателя ручка скользит между двумя положениями: в одном на выводе 1, в другом 0. Он остаётся там, где его оставили. Такие переключатели ставят в приборах для выбора режима.':
    'A slide switch has a handle that slides between two positions: in one there is 1 on the pin, in the other 0. It stays where it was left. Such switches are put in instruments to choose a mode.',
  'Поставь ползунковый переключатель и подключи его к плате.':
    'Place a slide switch and connect it to the board.',
  'На столе ползунковый переключатель': 'A slide switch is on the bench',
  'Переключатель соединён с платой': 'The switch is connected to the board',
  'DIP-переключатель': 'A DIP switch',
  'Несколько переключателей в одном корпусе': 'Several switches in one housing',
  '**DIP-переключатель** — это ряд маленьких движков в одном корпусе. Каждый движок самостоятельный: вверх 1, вниз 0. Четыре движка задают четыре бита, то есть число от 0 до 15.':
    'A **DIP switch** is a row of small sliders in one housing. Each slider is independent: up is 1, down is 0. Four sliders set four bits, that is a number from 0 to 15.',
  'Сколько разных чисел можно задать четырьмя движками DIP-переключателя?':
    'How many different numbers can be set with four sliders of a DIP switch?',
  'Каждый движок даёт два состояния, четыре движка дают 2 × 2 × 2 × 2 = 16 чисел, от 0 до 15.':
    'Each slider gives two states, four sliders give 2 × 2 × 2 × 2 = 16 numbers, from 0 to 15.',
  'Поставь DIP-переключатель и подключи все его четыре выхода к плате.':
    'Place a DIP switch and connect all four of its outputs to the board.',
  'На столе DIP-переключатель': 'A DIP switch is on the bench',
  'Подключены четыре выхода движков': 'The four slider outputs are connected',
  'Семисегментный индикатор': 'A seven-segment display',
  'Цифра из семи палочек': 'A digit of seven sticks',
  'Семисегментный индикатор рисует цифры из семи светящихся сегментов, их называют буквами **a, b, c, d, e, f, g**. Восьмой сегмент **dp** — точка. Каждый сегмент — отдельный светодиод со своим выводом.':
    'A seven-segment display draws digits from seven lit segments, they are named with the letters **a, b, c, d, e, f, g**. The eighth segment **dp** is the dot. Each segment is a separate LED with its own pin.',
  'Какие сегменты нужно включить, чтобы показать цифру 1?':
    'Which segments must be turned on to show the digit 1?',
  'a и d': 'a and d',
  'b и c': 'b and c',
  'e и f': 'e and f',
  'Цифру 1 рисуют две правые вертикальные палочки: сегменты b и c.':
    'The digit 1 is drawn by the two right vertical strips: segments b and c.',
  'Поставь индикатор на один разряд и подключи все восемь его входов к плате.':
    'Place a one-digit display and connect all eight of its inputs to the board.',
  'На столе индикатор': 'A display is on the bench',
  'Индикатор соединён с платой': 'The display is connected to the board',
  'Подключены все восемь входов: a–g и dp': 'All eight inputs are connected: a–g and dp',
  Зуммер: 'A buzzer',
  'Звук из сигнала': 'Sound from a signal',
  '**Зуммер** — маленький динамик. Активный зуммер пищит сам, пока на входе 1, а пассивный воспроизводит ту частоту, которую ему подадут: быстро меняющийся сигнал (меандр, единицы и нули по очереди) звучит как тон.':
    'A **buzzer** is a small speaker. An active buzzer beeps by itself while there is 1 on the input, and a passive one reproduces the frequency it is given: a rapidly changing signal (a square wave, ones and zeros in turn) sounds like a tone.',
  'Что подают на пассивный зуммер, чтобы он зазвучал?':
    'What is fed to a passive buzzer so that it sounds?',
  'Постоянную единицу': 'A constant one',
  'Быстро меняющийся сигнал нужной частоты': 'A rapidly changing signal of the needed frequency',
  'Постоянный ноль': 'A constant zero',
  'Пассивный зуммер сам тон не создаёт, он воспроизводит частоту сигнала. Постоянный уровень (1 или 0) даст только щелчок или тишину.':
    'A passive buzzer does not create a tone itself, it reproduces the frequency of the signal. A constant level (1 or 0) will give only a click or silence.',
  'Поставь зуммер и подключи его вход к плате.':
    'Place a buzzer and connect its input to the board.',
  'На столе зуммер': 'A buzzer is on the bench',
  'Зуммер соединён с платой': 'The buzzer is connected to the board',
  'Подключён один вход S': 'One input S is connected',
  'Светодиодная линейка': 'An LED bar',
  'Ряд независимых светодиодов': 'A row of independent LEDs',
  'Линейка — это несколько светодиодов в один ряд, и у каждого свой вход. Её удобно использовать, чтобы показать байт (каждый светодиод — один бит), уровень громкости или бегущий огонь.':
    'A bar is several LEDs in one row, and each has its own input. It is convenient for showing a byte (each LED is one bit), a volume level or a running light.',
  'Поставь линейку и подключи все восемь её входов к плате.':
    'Place a bar and connect all eight of its inputs to the board.',
  'На столе линейка светодиодов': 'An LED bar is on the bench',
  'Линейка соединена с платой': 'The bar is connected to the board',
  'Подключены восемь входов': 'Eight inputs are connected',
  'Два светодиода на столе': 'Two LEDs on the bench',
  'Больше одного выхода': 'More than one output',
  'Устройство в плате может управлять не одним, а многими светодиодами сразу: у каждого свой контакт платы. Чтобы схема потом зажигала их независимо, каждый светодиод подключают к своему отдельному контакту.\n\nСначала расставим всё на столе, а какой сигнал на какой контакт идёт, решим позже в файле выводов.':
    'A device in the board can control not one but many LEDs at once: each has its own board pin. So that the circuit can later light them independently, each LED is connected to its own separate pin.\n\nFirst we arrange everything on the bench, and which signal goes to which pin we will decide later in the pins file.',
  'Поставь на стол два светодиода и подключи каждый к плате.':
    'Place two LEDs on the bench and connect each to the board.',
  'Светодиод и кнопка вместе': 'An LED and a button together',
  'Вход и выход на одном столе': 'Input and output on one bench',
  'Кнопка — это **вход** платы: она сообщает схеме, нажата ли. Светодиод — **выход**: схема сама решает, гореть ему или нет. Между ними будет работать твой код: например, `assign led_n = ~btn;`.\n\nКаждой детали нужны три вещи: питание (**VCC**, на плате это 3V3), общий минус (**GND**, земля) и сигнальный вывод. Земля у всех деталей общая, поэтому провода к GND можно вести к любому её контакту.':
    'A button is an **input** of the board: it tells the circuit whether it is pressed. An LED is an **output**: the circuit itself decides whether it lights. Your code will work between them: for example, `assign led_n = ~btn;`.\n\nEach part needs three things: power (**VCC**, on the board this is 3V3), a common minus (**GND**, ground) and a signal pin. The ground is common to all parts, so wires to GND can be led to any of its pins.',
  'Как деталь связана с модулем top': 'How a part is connected with the module top',
  'Сигнальный вывод детали соединяют проводом с контактом платы. Этот контакт в файле выводов получает имя порта верхнего модуля `top`: так кнопка становится входом `btn`, а светодиод — выходом `led_n`.\n\nПровод — это только «железная» часть. Какой порт на какой контакт попадёт, решает файл выводов.':
    'A part\'s signal pin is connected with a wire to a board pin. In the pins file this pin gets the name of a port of the top module `top`: this is how the button becomes the input `btn`, and the LED the output `led_n`.\n\nThe wire is only the "hardware" part. Which port lands on which pin is decided by the pins file.',
  'Какая из деталей — вход платы?': 'Which of the parts is an input of the board?',
  Кнопка: 'The button',
  Светодиод: 'The LED',
  'Кнопка сообщает схеме о внешнем мире, значит, это вход. Светодиод и зуммер получают команды от схемы, то есть они выходы.':
    'A button tells the circuit about the outside world, so it is an input. The LED and the buzzer receive commands from the circuit, that is they are outputs.',
  'Поставь на стол светодиод и кнопку и подключи обе детали к плате.':
    'Place an LED and a button on the bench and connect both parts to the board.',
  'Переключатель с запоминанием': 'A switch with memory',
  'Тумблер — рычажок с двумя положениями. В отличие от кнопки, он **остаётся** в выбранном положении: вверх — на выходе 1, вниз — 0.\n\nПодключается как любая деталь стола: питание 3V3, земля GND и один сигнальный вывод `OUT`. Его проводом соединяют с контактом платы, а в коде тумблер становится входом модуля `top`.':
    'A toggle switch is a lever with two positions. Unlike a button, it **stays** in the chosen position: up gives 1 on the output, down gives 0.\n\nIt is connected like any bench part: power 3V3, ground GND and one signal pin `OUT`. It is connected with a wire to a board pin, and in the code the toggle switch becomes an input of the module `top`.',
  'Чем тумблер отличается от обычной кнопки?':
    'How does a toggle switch differ from an ordinary button?',
  'Остаётся в положении, пока его не переключат': 'It stays in position until it is switched',
  'Работает без земли': 'It works without ground',
  'Имеет несколько выходов': 'It has several outputs',
  'Кнопка даёт 1 только пока её держат нажатой, а тумблер сохраняет выбранное положение.':
    'A button gives 1 only while it is held pressed, and a toggle switch keeps the chosen position.',
  'Поставь на стол тумблер и подключи его к плате.':
    'Place a toggle switch on the bench and connect it to the board.',
  'Выключатель как в комнате': 'A switch like in a room',
  'Клавишный выключатель — такой же, как у лампы на стене. Нажал на одну сторону клавиши — включено (на выходе 1), на другую — выключено (0). Положение сохраняется.\n\nУ детали один сигнальный вывод `OUT`. Его соединяют проводом с контактом платы, а питание 3V3 и землю GND подводят как обычно.':
    'A rocker switch is the same as the one for a wall lamp. Press one side of the key: on (1 on the output), the other: off (0). The position is kept.\n\nThe part has one signal pin `OUT`. It is connected with a wire to a board pin, and power 3V3 and ground GND are connected as usual.',
  'Поставь на стол клавишный выключатель и подключи его к плате.':
    'Place a rocker switch on the bench and connect it to the board.',
  'Ползунковый переключатель двигают пальцем из одного края в другой. Как и тумблер, он остаётся в положении: на выходе постоянно 1 или 0.\n\nСигнальный вывод `OUT` один. Провод от него идёт к контакту платы, и этот сигнал в коде становится входом верхнего модуля.':
    'A slide switch is moved with a finger from one edge to the other. Like a toggle switch, it stays in position: the output is constantly 1 or 0.\n\nThere is one signal pin `OUT`. A wire from it goes to a board pin, and this signal in the code becomes an input of the top module.',
  'Сколько сигнальных выводов у ползункового переключателя?':
    'How many signal pins does a slide switch have?',
  Один: 'One',
  Два: 'Two',
  Восемь: 'Eight',
  'Ползунок даёт один сигнал: 1 или 0, поэтому вывод `OUT` один.':
    'A slider gives one signal: 1 or 0, so there is one pin `OUT`.',
  'Поставь на стол ползунковый переключатель и подключи его к плате.':
    'Place a slide switch on the bench and connect it to the board.',
  'На столе ползунок': 'A slide switch is on the bench',
  'Ползунок соединён с платой': 'The slide switch is connected to the board',
  'DIP-переключатель — это ряд крошечных движков, каждый сам по себе как маленький тумблер. Движков может быть от 2 до 8 (по умолчанию 4).\n\nУ каждого движка свой вывод: `1`, `2`, `3`… Вместе они удобно задают число: например, четыре движка — это четыре бита. В коде такой набор становится шиной, например `input [3:0] sw`.':
    'A DIP switch is a row of tiny sliders, each by itself like a small toggle switch. There may be from 2 to 8 sliders (4 by default).\n\nEach slider has its own pin: `1`, `2`, `3`… Together they conveniently set a number: for example, four sliders are four bits. In the code such a set becomes a bus, for example `input [3:0] sw`.',
  'Каждый движок подключают отдельным проводом к своему контакту платы. Общая земля GND и питание 3V3 подводятся один раз для всей детали.':
    'Each slider is connected with a separate wire to its own board pin. The common ground GND and power 3V3 are connected once for the whole part.',
  'Сколько бит можно задать DIP-переключателем с четырьмя движками?':
    'How many bits can be set with a DIP switch with four sliders?',
  'Каждый движок хранит один бит, значит четыре движка дают четыре бита (и 16 разных чисел).':
    'Each slider stores one bit, so four sliders give four bits (and 16 different numbers).',
  'Поставь на стол DIP-переключатель и подключи к плате хотя бы два его движка.':
    'Place a DIP switch on the bench and connect at least two of its sliders to the board.',
  'Подключено не меньше двух движков': 'At least two sliders are connected',
  'Три цвета в одном': 'Three colors in one',
  'RGB-светодиод — три светодиода в одном корпусе: красный (**R**), зелёный (**G**) и синий (**B**). Зажигая их по-разному, получают другие цвета: красный с зелёным дают жёлтый, все три — белый.\n\nУ детали три сигнальных вывода: `R`, `G`, `B`. Питание и земля подводятся как обычно, а каждый цвет управляется своим сигналом.':
    'An RGB LED is three LEDs in one housing: red (**R**), green (**G**) and blue (**B**). Lighting them in different ways gives other colors: red with green gives yellow, all three white.\n\nThe part has three signal pins: `R`, `G`, `B`. Power and ground are connected as usual, and each color is controlled by its own signal.',
  'Чтобы управлять всеми цветами, провода нужны ко всем трём выводам, каждый к своему контакту платы. В коде им соответствуют три отдельных выхода `top`.':
    'To control all the colors, wires are needed to all three pins, each to its own board pin. In the code they correspond to three separate outputs of `top`.',
  'Поставь на стол RGB-светодиод и подключи к плате все три цвета.':
    'Place an RGB LED on the bench and connect all three colors to the board.',
  'Цифра из палочек': 'A digit of sticks',
  'Семисегментный индикатор показывает цифру из семи палочек-сегментов `a`…`g` и точки `dp`. Каждый сегмент — отдельный светодиод со своим выводом. Чтобы получить, например, «1», зажигают только сегменты `b` и `c`.\n\nВсего у детали восемь входов: семь сегментов и точка.':
    'A seven-segment display shows a digit from seven strip segments `a`…`g` and a dot `dp`. Each segment is a separate LED with its own pin. To get, for example, "1", only the segments `b` and `c` are lit.\n\nThe part has eight inputs in all: seven segments and the dot.',
  'Каждый сегмент соединяют своим проводом с контактом платы. В коде им соответствует восьмибитный выход, например `output [7:0] seg`.\n\nУ индикатора есть общий вывод: общий анод (его подключают к плюсу VCC) или общий катод (к земле GND). От этого зависит, чем зажигать сегмент: нулём или единицей. Вид индикатора выбирают в свойствах детали.':
    "Each segment is connected with its own wire to a board pin. In the code they correspond to an eight-bit output, for example `output [7:0] seg`.\n\nThe display has a common pin: a common anode (connected to the plus VCC) or a common cathode (to the ground GND). What lights a segment depends on this: a zero or a one. The kind of display is chosen in the part's properties.",
  'Сколько сегментов нужно зажечь, чтобы показать цифру «1»?':
    'How many segments must be lit to show the digit "1"?',
  Семь: 'Seven',
  'Единица рисуется двумя правыми вертикальными сегментами: `b` и `c`.':
    'A one is drawn with the two right vertical segments: `b` and `c`.',
  'Поставь на стол индикатор и подключи к плате все его восемь входов.':
    'Place a display on the bench and connect all eight of its inputs to the board.',
  'Подключены все восемь входов (a…g и dp)': 'All eight inputs are connected (a…g and dp)',
  'Зуммер — маленький динамик. Если сигнал на его входе `S` быстро переключается между 0 и 1, получается тон: чем чаще переключения, тем выше звук.\n\nЗначит, зуммеру нужен выход платы, который меняется, например сигнал от счётчика-делителя частоты.':
    'A buzzer is a small speaker. If the signal on its input `S` switches quickly between 0 and 1, a tone results: the more often it switches, the higher the sound.\n\nSo the buzzer needs a board output that changes, for example a signal from a frequency-divider counter.',
  'У зуммера один сигнальный вход `S`: провод от него идёт к контакту платы. В коде этот контакт — выход верхнего модуля. Питание 3V3 и землю GND подводят, как к другим деталям.':
    'The buzzer has one signal input `S`: a wire from it goes to a board pin. In the code this pin is an output of the top module. Power 3V3 and ground GND are connected as for other parts.',
  'Как получить высокий звук?': 'How do you get a high sound?',
  'Переключать сигнал на зуммере чаще': 'Switch the signal on the buzzer more often',
  'Подать на зуммер больше единиц подряд': 'Feed the buzzer more ones in a row',
  'Подключить его к земле дважды': 'Connect it to ground twice',
  'Высота тона — это частота колебаний, то есть число переключений сигнала в секунду.':
    'The pitch of a tone is the frequency of oscillation, that is the number of signal switchings per second.',
  'Поставь на стол зуммер и подключи его к плате.':
    'Place a buzzer on the bench and connect it to the board.',
  'Ряд светодиодов': 'A row of LEDs',
  'Светодиодная линейка — несколько независимых светодиодов в один ряд, по умолчанию восемь. Они удобны, когда нужно показать число в двоичном виде, уровень или бегущий огонь.\n\nУ каждого светодиода свой вход (`1`, `2`, `3`…), а в коде им соответствует шина, например `output [7:0] leds`.':
    'An LED bar is several independent LEDs in one row, eight by default. They are convenient when you need to show a number in binary, a level or a running light.\n\nEach LED has its own input (`1`, `2`, `3`…), and in the code a bus corresponds to them, for example `output [7:0] leds`.',
  'Каждый светодиод ряда подключают отдельным проводом к своему контакту платы. Резисторы уже стоят в детали, питание 3V3 и землю GND подводят один раз.':
    'Each LED of the row is connected with a separate wire to its own board pin. The resistors are already in the part, power 3V3 and ground GND are connected once.',
  'Поставь на стол линейку и подключи к плате хотя бы четыре её светодиода.':
    'Place a bar on the bench and connect at least four of its LEDs to the board.',
  'На столе линейка': 'A bar is on the bench',
  'Подключено не меньше четырёх светодиодов': 'At least four LEDs are connected',
  'Проверь себя': 'Check yourself',
  'Выбери верный ответ.': 'Choose the correct answer.',
  'Попробуй сам': 'Try it yourself',
  'Собери схему': 'Build the circuit',
  'Собери на столе': 'Build it on the bench',
  'В. Комбинационная логика': 'C. Combinational logic',
  'Г. Арифметика и сравнение': 'D. Arithmetic and comparison',
  'Д. Память и такт': 'E. Memory and the clock',
  'Е. Счётчики, частоты и импульсы': 'F. Counters, frequencies and pulses',
  'Ж. Конечные автоматы': 'G. Finite state machines',
  'З. Модули, параметры, массивы': 'H. Modules, parameters, arrays',
  'И. Плата: кнопки, светодиоды, выводы': 'I. The board: buttons, LEDs, pins',
  'К. Небольшие проекты': 'J. Small projects',
  'Первые схемы': 'First circuits',
  'Логические элементы': 'Logic gates',
  'Выбор и распределение': 'Selection and distribution',
  Арифметика: 'Arithmetic',
  'Сравнение и коды': 'Comparison and codes',
  'Триггеры и регистры': 'Flip-flops and registers',
  'Счётчики и делители': 'Counters and dividers',
  'Сдвиговые регистры': 'Shift registers',
  Автоматы: 'State machines',
  Индикаторы: 'Displays',
  'Подключаем к плате': 'Connecting to the board',
  Проекты: 'Projects',
  'a b | И-НЕ\n0 0 |  1\n0 1 |  1\n1 0 |  1\n1 1 |  0':
    'a b | NAND\n0 0 |  1\n0 1 |  1\n1 0 |  1\n1 1 |  0',
  'a b | ИЛИ-НЕ\n0 0 |  1\n0 1 |  0\n1 0 |  0\n1 1 |  0':
    'a b | NOR\n0 0 |  1\n0 1 |  0\n1 0 |  0\n1 1 |  0',
  'a b c | И\n0 0 0 | 0\n1 1 0 | 0\n1 1 1 | 1': 'a b c | AND\n0 0 0 | 0\n1 1 0 | 0\n1 1 1 | 1',
  'a b c | ИЛИ\n0 0 0 | 0\n0 0 1 | 1\n1 1 1 | 1': 'a b c | OR\n0 0 0 | 0\n0 0 1 | 1\n1 1 1 | 1',
  'a | НЕ | НЕ\n0 |  1 |  0\n1 |  0 |  1': 'a | NOT | NOT\n0 |  1 |  0\n1 |  0 |  1',
  'a b c | большинство\n0 0 0 | 0\n0 1 0 | 0\n0 1 1 | 1\n1 1 1 | 1':
    'a b c | majority\n0 0 0 | 0\n0 1 0 | 0\n0 1 1 | 1\n1 1 1 | 1',
  'a b c | нечётно\n0 0 0 | 0\n0 0 1 | 1\n0 1 1 | 0\n1 1 1 | 1':
    'a b c | odd\n0 0 0 | 0\n0 0 1 | 1\n0 1 1 | 0\n1 1 1 | 1',
  'a b | НЕ(a И b) | НЕ a ИЛИ НЕ b\n0 0 |     1      |      1\n0 1 |     1      |      1\n1 0 |     1      |      1\n1 1 |     0      |      0':
    'a b | NOT(a AND b) | NOT a OR NOT b\n0 0 |     1        |      1\n0 1 |     1        |      1\n1 0 |     1        |      1\n1 1 |     0        |      0',
  'И-НЕ из блоков': 'NAND from blocks',
  'Элемент с кружком': 'A gate with a circle',
  'Элемент **И-НЕ (NAND)** на схеме рисуют как И, но с маленьким кружком на выходе. Кружок означает инверсию: ответ переворачивается. Выход равен 0 только когда оба входа равны 1.\n\nВ библиотеке конструктора он лежит в группе «Логика» под именем «И-НЕ (NAND)».':
    'On a schematic the **NAND** gate is drawn like AND, but with a small circle on the output. The circle means inversion: the answer is flipped. The output is 0 only when both inputs are 1.\n\nIn the editor library it sits in the "Logic" group under the name "NAND".',
  'Что означает кружок на выходе элемента?': "What does the circle on the gate's output mean?",
  'Ответ элемента переворачивается': "The gate's answer is flipped",
  'Элемент подключён к плате': 'The gate is connected to the board',
  'У элемента три входа': 'The gate has three inputs',
  'Кружок — это условный знак инверсии: 0 становится 1, а 1 становится 0.':
    'The circle is the conventional sign of inversion: 0 becomes 1, and 1 becomes 0.',
  'Собери схему, в которой y равен «a И-НЕ b».': 'Build a circuit in which y equals "a NAND b".',
  'Нужен один блок из группы «Логика».': 'You need one block from the "Logic" group.',
  'Возьми блок «И-НЕ (NAND)» и соедини оба входа с его входами, а выход блока с y.':
    'Take the "NAND" block and connect both inputs to its inputs, and the block\'s output to y.',
  'ИЛИ-НЕ из блоков': 'NOR from blocks',
  'Ни одного сигнала': 'No signal at all',
  'Элемент **ИЛИ-НЕ (NOR)** — это ИЛИ с кружком инверсии на выходе. Обычное ИЛИ даёт 1, если хотя бы один вход равен 1. ИЛИ-НЕ переворачивает этот ответ: единица получается только тогда, когда **все** входы равны 0.\n\nПредставь сигнализацию: лампа горит, если ни один датчик не сработал.':
    'The **NOR** gate is OR with an inversion circle on the output. Ordinary OR gives 1 if at least one input is 1. NOR flips that answer: a one appears only when **all** inputs are 0.\n\nThink of an alarm: the lamp is on if no sensor has triggered.',
  'При каких входах ИЛИ-НЕ даёт 1?': 'For which inputs does NOR give 1?',
  'Когда оба входа равны 0': 'When both inputs are 0',
  'Когда хотя бы один вход равен 1': 'When at least one input is 1',
  'Когда входы разные': 'When the inputs are different',
  'ИЛИ даёт 0 только при двух нулях, а ИЛИ-НЕ переворачивает ответ, поэтому единица бывает только при 0 и 0.':
    'OR gives 0 only for two zeros, and NOR flips the answer, so a one appears only for 0 and 0.',
  'Собери схему, в которой y равен «a ИЛИ-НЕ b».': 'Build a circuit in which y equals "a NOR b".',
  'Возьми «ИЛИ-НЕ (NOR)», соедини входы a и b с его входами A и B, а выход Y с y.':
    'Take "NOR", connect the inputs a and b to its inputs A and B, and the output Y to y.',
  'Равенство: XNOR': 'Equality: XNOR',
  'Входы одинаковые': 'The inputs are the same',
  'Элемент **XNOR** (исключающее ИЛИ-НЕ) даёт 1, когда два входа **равны**: оба 0 или оба 1. Это XOR с кружком инверсии. Его называют ещё элементом равенства: он отвечает на вопрос «a и b совпадают?».':
    'The **XNOR** gate (exclusive NOR) gives 1 when the two inputs are **equal**: both 0 or both 1. It is XOR with an inversion circle. It is also called the equality gate: it answers the question "are a and b the same?".',
  'Что покажет XNOR, если a = 1 и b = 1?': 'What will XNOR show if a = 1 and b = 1?',
  '1, потому что входы одинаковые': '1, because the inputs are the same',
  '0, потому что обе единицы': '0, because both are ones',
  'Зависит от платы': 'Depends on the board',
  'XNOR выдаёт 1 при любых одинаковых входах, в том числе при 1 и 1. XOR в этом случае дал бы 0.':
    'XNOR gives 1 for any equal inputs, including 1 and 1. XOR would give 0 in this case.',
  'Собери схему, в которой y равен 1, когда a и b одинаковые.':
    'Build a circuit in which y equals 1 when a and b are the same.',
  'Подойдёт один блок из группы «Логика».': 'One block from the "Logic" group will do.',
  'Возьми «Исключающее ИЛИ-НЕ (XNOR)» и подключи a, b и y.':
    'Take "XNOR" (exclusive NOR) and connect a, b and y.',
  'И на три входа': 'AND with three inputs',
  'Больше двух входов': 'More than two inputs',
  'Блок **И** не обязан иметь два входа. В его параметрах есть «Число входов» (от 2 до 8). Выход равен 1 только когда **все** входы равны 1. Входы получают имена A, B, C, а выход называется Y.\n\nТакое И нужно, когда условий несколько: например, «включить, если нажата кнопка, дверь закрыта и есть питание».':
    'The **AND** block does not have to have two inputs. Its parameters include "Number of inputs" (from 2 to 8). The output is 1 only when **all** inputs are 1. The inputs are named A, B, C, and the output is called Y.\n\nSuch an AND is needed when there are several conditions: for example, "turn on if the button is pressed, the door is closed and there is power".',
  'Сколько нулей на входах трёхвходового И допустимо, чтобы выход был 1?':
    'How many zeros on the inputs of a three-input AND are allowed for the output to be 1?',
  'Ни одного': 'None',
  'И требует единицы на всех входах: любой ноль даёт на выходе 0.':
    'AND needs ones on all inputs: any zero gives 0 on the output.',
  'Собери схему, в которой y равен 1, только если a, b и c равны 1. Используй один блок И с тремя входами.':
    'Build a circuit in which y equals 1 only if a, b and c are 1. Use one AND block with three inputs.',
  'Выбери блок «И (AND)» и поставь ему в параметрах число входов 3.':
    'Choose the "AND" block and set the number of inputs to 3 in its parameters.',
  'Подключи a, b, c к входам A, B, C, а выход Y к y.':
    'Connect a, b, c to the inputs A, B, C, and the output Y to y.',
  'ИЛИ на три входа': 'OR with three inputs',
  'Хотя бы один из трёх': 'At least one of three',
  'У блока **ИЛИ** тоже можно менять «Число входов». Трёхвходовое ИЛИ даёт 1, если хотя бы один из входов A, B, C равен 1, и 0 только когда все три равны 0.\n\nТак устроена общая сигнализация: лампа горит, если сработал любой из трёх датчиков.':
    'The **OR** block also lets you change the "Number of inputs". A three-input OR gives 1 if at least one of the inputs A, B, C is 1, and 0 only when all three are 0.\n\nThis is how a general alarm works: the lamp is on if any of the three sensors has triggered.',
  'Когда трёхвходовое ИЛИ даёт 0?': 'When does a three-input OR give 0?',
  'Когда все три входа равны 0': 'When all three inputs are 0',
  'Когда хотя бы один вход равен 0': 'When at least one input is 0',
  'Когда два входа равны 1': 'When two inputs are 1',
  'ИЛИ даёт 1, если есть хоть одна единица. Ноль получается только когда единиц нет совсем.':
    'OR gives 1 if there is at least one one. A zero appears only when there are no ones at all.',
  'Собери схему, в которой y равен 1, если хотя бы один из a, b, c равен 1.':
    'Build a circuit in which y equals 1 if at least one of a, b, c is 1.',
  'Один блок «ИЛИ (OR)» с тремя входами.': 'One "OR" block with three inputs.',
  'Поставь параметр «Число входов» равным 3 и подключи A, B, C и Y.':
    'Set the "Number of inputs" parameter to 3 and connect A, B, C and Y.',
  'Два инвертора подряд': 'Two inverters in a row',
  'Не-не-а': 'Not-not',
  'Если пропустить сигнал через два инвертора подряд, он вернётся таким же: НЕ(НЕ(a)) = a. Ноль стал единицей, а единица снова нулём.\n\nЗачем это нужно, если выход равен входу? Реальный элемент не только считает, но и усиливает сигнал. Такая пара работает как **буфер**: она не меняет значение, но «подпитывает» линию, если к ней подключено много нагрузок.':
    'If you pass a signal through two inverters in a row, it comes back the same: NOT(NOT(a)) = a. Zero became one, and one became zero again.\n\nWhy is this needed if the output equals the input? A real gate not only computes but also amplifies the signal. Such a pair works as a **buffer**: it does not change the value, but it "feeds" the line if many loads are connected to it.',
  'Чему равен выход после двух инверторов подряд, если a = 1?':
    'What is the output after two inverters in a row if a = 1?',
  'Сигнала нет': 'There is no signal',
  'Первый инвертор даёт 0, второй переворачивает его обратно в 1.':
    'The first inverter gives 0, the second flips it back to 1.',
  'Собери схему из двух инверторов, где y равен a.':
    'Build a circuit of two inverters in which y equals a.',
  'Нужны два блока «НЕ» (NOT), один за другим.': 'You need two "NOT" blocks, one after the other.',
  'Соедини a с первым НЕ, выход первого со входом второго, а выход второго с y.':
    'Connect a to the first NOT, the output of the first to the input of the second, and the output of the second to y.',
  'Два из трёх': 'Two out of three',
  Голосование: 'Voting',
  'Схема **большинства** выдаёт 1, если единицу показывают хотя бы два входа из трёх. Так работает голосование: решение принято, когда «за» двое.\n\nФормулу можно записать так: (a И b) ИЛИ (b И c) ИЛИ (a И c). Любая пара, где оба входа равны 1, включает выход.':
    'A **majority** circuit gives 1 if at least two of the three inputs show a one. This is how voting works: the decision is made when two are "for".\n\nThe formula can be written like this: (a AND b) OR (b AND c) OR (a AND c). Any pair in which both inputs are 1 turns the output on.',
  'Три человека голосуют. Какой набор голосов «за» даёт 1 на выходе?':
    'Three people vote. Which set of "for" votes gives 1 on the output?',
  'Двое за, один против': 'Two for, one against',
  'Один за, двое против': 'One for, two against',
  'Все против': 'All against',
  'Нужны единицы хотя бы на двух входах, то есть двое «за».':
    'You need ones on at least two inputs, that is, two "for".',
  'Собери схему, в которой y равен 1, если хотя бы два из a, b, c равны 1.':
    'Build a circuit in which y equals 1 if at least two of a, b, c are 1.',
  'Возьми три блока И: для пар (a, b), (b, c) и (a, c).':
    'Take three AND blocks: for the pairs (a, b), (b, c) and (a, c).',
  'Результаты трёх И собери блоком ИЛИ с тремя входами.':
    'Combine the results of the three ANDs with an OR block with three inputs.',
  'Один вход можно подключать сразу к нескольким блокам.':
    'One input can be connected to several blocks at once.',
  'Чётность из XOR': 'Parity from XOR',
  'Считаем единицы': 'Counting the ones',
  'XOR даёт 1, когда единиц на входах нечётное количество. Если соединить два XOR цепочкой, получится проверка **чётности** трёх сигналов: выход равен 1, когда единиц среди a, b, c одна или три.\n\nТакой бит нужен в передаче данных: по нему можно заметить, что один бит исказился.':
    'XOR gives 1 when the number of ones on the inputs is odd. If you chain two XORs, you get a **parity** check of three signals: the output is 1 when there are one or three ones among a, b, c.\n\nSuch a bit is needed in data transmission: it lets you notice that one bit was corrupted.',
  'Чему равен выход цепочки XOR, если единицы подали на a и b, а c равен 0?':
    'What is the output of a chain of XORs if ones are fed to a and b, and c is 0?',
  '0, потому что единиц две': '0, because there are two ones',
  '1, потому что единицы есть': '1, because there are ones',
  'Нельзя сказать': 'Cannot say',
  'Единиц две — чётное число, поэтому выход 0.':
    'There are two ones, an even number, so the output is 0.',
  'Собери схему, в которой y равен 1, когда среди a, b, c нечётное число единиц.':
    'Build a circuit in which y equals 1 when there is an odd number of ones among a, b, c.',
  'Сначала сравни a и b, потом результат сравни с c.':
    'First compare a and b, then compare the result with c.',
  'Два блока XOR: первый на a и b, второй на выход первого и c.':
    'Two XOR blocks: the first on a and b, the second on the output of the first and c.',
  'XOR из четырёх И-НЕ': 'XOR from four NANDs',
  'Универсальный элемент': 'A universal gate',
  'Из одних И-НЕ можно собрать любую логику, поэтому его называют универсальным. Классическая головоломка: сделать XOR ровно из четырёх элементов И-НЕ.':
    'From NAND gates alone you can build any logic, so it is called universal. A classic puzzle: make an XOR from exactly four NAND gates.',
  'Схема из четырёх': 'A circuit of four',
  'Пусть g1 = И-НЕ(a, b). Затем g2 = И-НЕ(a, g1) и g3 = И-НЕ(b, g1). Выход g4 = И-НЕ(g2, g3).\n\nПроверь: при a = b = 0 получается g1 = 1, g2 = g3 = 1, y = 0. При a = 1, b = 0: g1 = 1, g2 = 0, g3 = 1, y = 1.':
    'Let g1 = NAND(a, b). Then g2 = NAND(a, g1) and g3 = NAND(b, g1). The output g4 = NAND(g2, g3).\n\nCheck: with a = b = 0 we get g1 = 1, g2 = g3 = 1, y = 0. With a = 1, b = 0: g1 = 1, g2 = 0, g3 = 1, y = 1.',
  'Сколько элементов И-НЕ нужно для этого XOR?': 'How many NAND gates are needed for this XOR?',
  Четыре: 'Four',
  'Один считает И-НЕ(a, b), два следующих смешивают его с входами, четвёртый объединяет результат.':
    'One computes NAND(a, b), the next two mix it with the inputs, the fourth combines the result.',
  'Собери XOR (y = 1, когда a и b разные) только из четырёх блоков И-НЕ.':
    'Build an XOR (y = 1 when a and b are different) from four NAND blocks only.',
  'Первый И-НЕ берёт a и b.': 'The first NAND takes a and b.',
  'Второй берёт a и выход первого, третий берёт b и выход первого.':
    'The second takes a and the output of the first, the third takes b and the output of the first.',
  'Четвёртый И-НЕ собирает выходы второго и третьего.':
    'The fourth NAND collects the outputs of the second and the third.',
  'Закон де Моргана': "De Morgan's law",
  'Два способа сказать одно': 'Two ways to say the same thing',
  '**Закон де Моргана:** НЕ(a И b) = (НЕ a) ИЛИ (НЕ b). Фраза «нельзя, чтобы оба были включены» значит то же самое, что «хотя бы один выключен».\n\nЗначит, И-НЕ можно собрать иначе: инвертировать каждый вход, а потом соединить их через ИЛИ.':
    '**De Morgan\'s law:** NOT(a AND b) = (NOT a) OR (NOT b). The phrase "both must not be on" means the same as "at least one is off".\n\nSo a NAND can be built differently: invert each input, then join them through an OR.',
  'Чему равно НЕ(a ИЛИ b) по закону де Моргана?':
    "What is NOT(a OR b) equal to by De Morgan's law?",
  '(НЕ a) И (НЕ b)': '(NOT a) AND (NOT b)',
  '(НЕ a) ИЛИ (НЕ b)': '(NOT a) OR (NOT b)',
  'a И b': 'a AND b',
  'Закон работает в обе стороны: инверсия ИЛИ превращается в И от инверсий.':
    'The law works both ways: the inversion of an OR turns into an AND of inversions.',
  'Не используя блок И-НЕ, собери y = НЕ(a И b) из двух НЕ и одного ИЛИ.':
    'Without using a NAND block, build y = NOT(a AND b) from two NOTs and one OR.',
  'Сначала инвертируй каждый вход отдельным НЕ.': 'First invert each input with a separate NOT.',
  'Выходы обоих НЕ подай на ИЛИ, а его выход на y.':
    'Feed the outputs of both NOTs to an OR, and its output to y.',
  'y = (d0 И НЕ s) ИЛИ (d1 И s)': 'y = (d0 AND NOT s) OR (d1 AND s)',
  'номер: 7 6 5 4 3 2 1 0\nбиты:  1 0 1 1 0 1 0 0\nбиты 5..2 = 1101':
    'number: 7 6 5 4 3 2 1 0\nbits:   1 0 1 1 0 1 0 0\nbits 5..2 = 1101',
  'A = 101   (3 бита, старшие)\nB = 01100 (5 бит, младшие)\nY = 10101100':
    'A = 101   (3 bits, high)\nB = 01100 (5 bits, low)\nY = 10101100',
  'Мультиплексор 2→1': '2-to-1 multiplexer',
  'Переключатель сигналов': 'A signal switch',
  'Представь железнодорожную стрелку: два пути сходятся в один, а рычаг решает, какой из них сейчас подключён. В схемах так работает **мультиплексор** (его ещё называют селектором или коммутатором).\n\nУ мультиплексора 2→1 два **информационных входа** `D0` и `D1`, один **управляющий вход** `S` (от слова select, «выбор») и один выход `Y`. Если `S = 0`, на выход идёт `D0`. Если `S = 1`, на выход идёт `D1`.':
    'Imagine a railway switch: two tracks merge into one, and a lever decides which of them is connected right now. In circuits this is how a **multiplexer** works (also called a selector).\n\nA 2-to-1 multiplexer has two **data inputs** `D0` and `D1`, one **control input** `S` (from "select") and one output `Y`. If `S = 0`, `D0` goes to the output. If `S = 1`, `D1` goes to the output.',
  'Где он нужен': 'Where it is needed',
  'Мультиплексор выбирает, чьё значение показать или передать дальше: например, показать на индикаторе то счёт одного игрока, то другого. Выбор делает один вход `S`, а сами данные при этом не меняются.\n\nВ библиотеке конструктора блок лежит в группе выбора под именем «Мультиплексор 2:1». Контакты блока: `D0`, `D1`, `S` и `Y`.':
    "A multiplexer chooses whose value to show or pass on: for example, to show on a display either one player's score or another's. The choice is made by the single input `S`, and the data itself does not change.\n\nIn the editor library the block sits in the selection group under the name \"Multiplexer 2:1\". The block's pins are `D0`, `D1`, `S` and `Y`.",
  'У мультиплексора 2→1 S = 1. Что окажется на выходе Y?':
    'A 2-to-1 multiplexer has S = 1. What will be on the output Y?',
  'Значение входа D1': 'The value of input D1',
  'Значение входа D0': 'The value of input D0',
  'Всегда 1': 'Always 1',
  'Код 1 на входе S выбирает вход D1. При S = 0 выбирается D0. Сами значения D0 и D1 на выбор не влияют.':
    'The code 1 on the input S selects the input D1. With S = 0, D0 is selected. The values of D0 and D1 themselves do not affect the choice.',
  'Собери схему, в которой y равен d0 при s = 0 и равен d1 при s = 1.':
    'Build a circuit in which y equals d0 when s = 0 and d1 when s = 1.',
  'Нужен один блок из группы выбора: «Мультиплексор 2:1».':
    'You need one block from the selection group: "Multiplexer 2:1".',
  'Входы d0 и d1 подключи к контактам D0 и D1, вход s к контакту S.':
    'Connect the inputs d0 and d1 to the pins D0 and D1, and the input s to the pin S.',
  'Выход Y блока соедини с выходом y. Порядок D0 и D1 важен: s = 0 выбирает D0.':
    "Connect the block's output Y to the output y. The order of D0 and D1 matters: s = 0 selects D0.",
  'Мультиплексор из НЕ, И, ИЛИ': 'A multiplexer from NOT, AND, OR',
  'Что внутри у переключателя': 'What is inside the switch',
  'Готовый блок мультиплексора можно собрать из простых элементов. Идея такая: каждому входу нужен «замок», который пропускает его только когда он выбран.\n\nЭлемент **И** работает как замок: если на одном входе 0, выход всегда 0, а если там 1, то выход повторяет второй вход.':
    'A ready-made multiplexer block can be built from simple gates. The idea is this: each input needs a "lock" that lets it through only when it is selected.\n\nThe **AND** gate works as a lock: if one input is 0, the output is always 0, and if it is 1, the output repeats the other input.',
  Формула: 'The formula',
  'Для `d0` замок открыт, когда `s = 0`, то есть когда **НЕ s** равно 1. Для `d1` замок открыт при `s = 1`. Выходы замков объединяет элемент **ИЛИ**: закрытый замок даёт 0 и не мешает открытому.\n\nНужны четыре элемента: один НЕ, два И и один ИЛИ.':
    'For `d0` the lock is open when `s = 0`, that is when **NOT s** equals 1. For `d1` the lock is open when `s = 1`. The outputs of the locks are combined by an **OR** gate: a closed lock gives 0 and does not interfere with the open one.\n\nFour gates are needed: one NOT, two ANDs and one OR.',
  'Зачем в схеме мультиплексора нужен элемент НЕ?':
    'Why is a NOT gate needed in a multiplexer circuit?',
  'Чтобы получить 1, когда s = 0, и открыть замок для d0':
    'To get 1 when s = 0 and open the lock for d0',
  'Чтобы перевернуть данные d0 и d1': 'To flip the data d0 and d1',
  'Чтобы схема работала быстрее': 'To make the circuit work faster',
  'Замок для d0 должен быть открыт при s = 0. Элемент НЕ превращает этот 0 в 1, и элемент И пропускает d0. Сами данные остаются без изменений.':
    'The lock for d0 must be open when s = 0. The NOT gate turns this 0 into 1, and the AND gate lets d0 through. The data itself stays unchanged.',
  'Собери мультиплексор 2→1 только из элементов НЕ, И и ИЛИ: y = d0 при s = 0 и y = d1 при s = 1. Блок мультиплексора не используй.':
    'Build a 2-to-1 multiplexer from NOT, AND and OR gates only: y = d0 when s = 0 and y = d1 when s = 1. Do not use the multiplexer block.',
  'Сначала нужен НЕ от s. Затем два элемента И: первый для d0, второй для d1.':
    'First you need a NOT of s. Then two AND gates: the first for d0, the second for d1.',
  'Первый И берёт d0 и НЕ s. Второй И берёт d1 и s.':
    'The first AND takes d0 and NOT s. The second AND takes d1 and s.',
  'Выходы обоих И подай на элемент ИЛИ, а его выход соедини с y.':
    'Feed the outputs of both ANDs to an OR gate, and connect its output to y.',
  'Мультиплексор 4→1': '4-to-1 multiplexer',
  'Больше входов, шире код выбора': 'More inputs, a wider select code',
  'Чтобы выбрать один из четырёх входов, одного бита мало: он различает только два варианта. Нужно **два бита**, они задают число от 0 до 3. Это число пишут на вход `S` как двоичное, например `10` означает номер 2 и выбирает `D2`.\n\nВообще для выбора из N входов нужно столько бит, чтобы их числа хватило на N вариантов: из 4 входов по 2 бита, из 8 входов по 3 бита.':
    'To choose one of four inputs, one bit is not enough: it tells apart only two options. You need **two bits**, they set a number from 0 to 3. This number is written to the input `S` as a binary number, for example `10` means number 2 and selects `D2`.\n\nIn general, to choose from N inputs you need as many bits as it takes for their numbers to cover N options: 2 bits for 4 inputs, 3 bits for 8 inputs.',
  'Параметры блока': 'Block parameters',
  'В библиотеке есть готовые блоки «Мультиплексор 4:1» и «Мультиплексор 8:1». Это один и тот же блок с разным параметром **«Число входов»**: 2, 4 или 8. От него зависит число контактов `D0`…`D3` и ширина входа `S`.\n\nВторой параметр, **«Ширина данных»**, делает все входы D и выход Y шинами из нескольких проводов. У нас он остаётся равным 1.':
    'The library has ready-made blocks "Multiplexer 4:1" and "Multiplexer 8:1". It is the same block with a different **"Number of inputs"** parameter: 2, 4 or 8. It determines the number of pins `D0`…`D3` and the width of the input `S`.\n\nThe second parameter, **"Data width"**, turns all D inputs and the output Y into buses of several wires. For us it stays 1.',
  'Сколько бит должен иметь вход S у мультиплексора 8→1?':
    'How many bits must the input S of an 8-to-1 multiplexer have?',
  'Двух бит хватает на 4 номера (0–3), а на 8 входов нужны номера 0–7: это три бита. Восьми бит пришлось бы по одному на вход, но номер записывают двоичным числом.':
    'Two bits are enough for 4 numbers (0–3), and 8 inputs need numbers 0–7: that is three bits. Eight bits would mean one per input, but the number is written as a binary number.',
  'Собери мультиплексор 4→1. Входы d0, d1, d2, d3 однобитные, выбор s двухбитный: на выход y идёт тот вход, чей номер записан в s.':
    'Build a 4-to-1 multiplexer. The inputs d0, d1, d2, d3 are one-bit, the select s is two-bit: the input whose number is written in s goes to the output y.',
  'Возьми «Мультиплексор 4:1»: у него четыре входа D0…D3 и двухбитный вход S.':
    'Take "Multiplexer 4:1": it has four inputs D0…D3 and a two-bit input S.',
  'Вход s шириной 2 бита подключается к одному контакту S, а не к двум разным.':
    'The 2-bit wide input s is connected to a single pin S, not to two different ones.',
  'Соедини d0…d3 с D0…D3 по порядку, S с s, а Y с y.':
    'Connect d0…d3 to D0…D3 in order, S to s and Y to y.',
  Демультиплексор: 'Demultiplexer',
  'Мультиплексор наоборот': 'A multiplexer in reverse',
  'Мультиплексор собирает несколько путей в один. **Демультиплексор** делает обратное: у него один вход данных `A` и несколько выходов `Y0`, `Y1`… Код на входе `S` решает, на какой выход попадёт сигнал. Все остальные выходы остаются равны 0.\n\nПример: одна кнопка, а загораться должна одна из четырёх лампочек, номер которой задан переключателями.':
    'A multiplexer gathers several paths into one. A **demultiplexer** does the opposite: it has one data input `A` and several outputs `Y0`, `Y1`… The code on the input `S` decides which output the signal goes to. All the other outputs stay 0.\n\nExample: one button, and one of four lamps must light up, the number of which is set by switches.',
  'Собираем выходы в шину': 'Collecting the outputs into a bus',
  'У нашего демультиплексора четыре однобитных выхода. Чтобы отдать их одним выходом `y` шириной 4 бита, нужен блок «Биты → шина» (`merge`): его контакты `B0`…`B3` собираются в шину `Y`, где `B0` самый младший бит.\n\nУ блока «Биты → шина» параметр «Ширина шины» поставь равным 4. У демультиплексора по умолчанию уже 4 выхода.':
    'Our demultiplexer has four one-bit outputs. To hand them over as a single output `y` four bits wide, you need the "Bits → bus" block (`merge`): its pins `B0`…`B3` are collected into the bus `Y`, where `B0` is the least significant bit.\n\nSet the "Bus width" parameter of the "Bits → bus" block to 4. The demultiplexer already has 4 outputs by default.',
  'Демультиплексор 1→4 получил A = 1 и S = 10 (номер 2). Какие выходы равны 1?':
    'A 1-to-4 demultiplexer received A = 1 and S = 10 (number 2). Which outputs are 1?',
  'Только Y2': 'Only Y2',
  'Только Y1': 'Only Y1',
  'Y0 и Y1': 'Y0 and Y1',
  'Код 10 это число 2. Сигнал A направляется на выход Y2, а остальные выходы равны 0.':
    'The code 10 is the number 2. The signal A is directed to the output Y2, and the other outputs are 0.',
  'Направь сигнал a на один из четырёх выходов. Номер выхода задаёт двухбитный s. Результат собери в четырёхбитный y: бит номер i равен единице, когда a = 1 и s равен i.':
    'Direct the signal a to one of four outputs. The output number is set by the two-bit s. Collect the result into the four-bit y: bit number i is one when a = 1 and s equals i.',
  'Нужны два блока: «Демультиплексор» и «Биты → шина».':
    'You need two blocks: "Demultiplexer" and "Bits → bus".',
  'Демультиплексор: A от a, S от s. У блока «Биты → шина» ширина 4.':
    'Demultiplexer: A from a, S from s. The "Bits → bus" block has width 4.',
  'Выходы Y0…Y3 демультиплексора подключи к B0…B3 по порядку, а Y шины к y.':
    'Connect the outputs Y0…Y3 of the demultiplexer to B0…B3 in order, and the bus output Y to y.',
  Дешифратор: 'Decoder',
  'Номер в «один из N»': 'A number into "one of N"',
  '**Дешифратор** получает двоичное число и зажигает ровно один выход: тот, номер которого равен этому числу. Остальные выходы равны 0. Такой способ записи называют «один из N» (по-английски one-hot, «одна горячая»).\n\nУ дешифратора 2→4 вход `A` двухбитный, а выход `Y` четырёхбитный: единица стоит в бите с номером `A`.':
    'A **decoder** receives a binary number and lights exactly one output: the one whose number equals this number. The other outputs are 0. This way of writing is called "one of N" (one-hot).\n\nA 2-to-4 decoder has a two-bit input `A` and a four-bit output `Y`: the one is in the bit with number `A`.',
  'Разрешение EN': 'The EN enable',
  'У блока есть параметр **«Вход разрешения EN»**. Когда он включён, у блока появляется контакт `EN`. Если `EN = 0`, все выходы равны 0, и дешифратор «молчит». При `EN = 1` он работает как обычно.\n\nТакой вход удобен, когда несколько дешифраторов делят работу: включён только один из них.':
    'The block has the **"Enable input EN"** parameter. When it is on, the block gets an `EN` pin. If `EN = 0`, all outputs are 0, and the decoder is "silent". With `EN = 1` it works as usual.\n\nSuch an input is handy when several decoders share the work: only one of them is enabled.',
  'Дешифратор 2→4 получил A = 11. Что на выходе Y (старший бит слева)?':
    'A 2-to-4 decoder received A = 11. What is on the output Y (most significant bit on the left)?',
  'Код 11 это число 3, значит единица стоит в бите с номером 3, то есть в старшем: 1000. Бит с номером 0 (младший) горит при A = 00.':
    'The code 11 is the number 3, so the one is in the bit with number 3, that is in the most significant one: 1000. The bit with number 0 (least significant) is lit at A = 00.',
  'Собери дешифратор 2→4 с разрешением: a двухбитный, en однобитный. При en = 0 выход y равен 0000, а при en = 1 единица стоит в бите y с номером a.':
    'Build a 2-to-4 decoder with enable: a is two-bit, en is one-bit. With en = 0 the output y is 0000, and with en = 1 the one is in the bit of y with number a.',
  'Нужен один блок «Дешифратор». В его свойствах 2 разряда на входе и включённое разрешение EN.':
    'You need one "Decoder" block. In its properties: 2 bits on the input and the enable EN turned on.',
  'Если контакта EN нет, проверь свойство «Вход разрешения EN» у блока.':
    'If there is no EN pin, check the "Enable input EN" property of the block.',
  'Соедини a с A, en с EN, а Y блока с y.': "Connect a to A, en to EN, and the block's Y to y.",
  'Приоритетный шифратор': 'Priority encoder',
  'Обратная задача': 'The inverse task',
  '**Шифратор** делает обратное дешифратору: на входе несколько линий, а на выходе номер той линии, где стоит единица. Если единиц может быть несколько (нажали сразу две кнопки), нужно правило. **Приоритетный** шифратор берёт номер **самой старшей** единицы.\n\nУ блока вход `A` шириной 4 бита, выход `Y` из двух бит с номером и выход `V` («valid», «есть единица»).':
    'An **encoder** does the opposite of a decoder: there are several lines on the input, and on the output is the number of the line that has a one. If there may be several ones (two buttons pressed at once), a rule is needed. A **priority** encoder takes the number of the **highest** one.\n\nThe block has an input `A` 4 bits wide, an output `Y` of two bits with the number and an output `V` ("valid", "there is a one").',
  'Зачем нужен V': 'Why V is needed',
  'Номер 0 получается в двух случаях: единица стоит только в бите 0, или единиц нет вовсе. По одному `Y` их не различить, поэтому есть выход `V`: он равен 1, если на входе есть хотя бы одна единица.\n\nЧтобы вывести оба сигнала в один выход, склей их блоком «Объединение шин»: `V` как старший бит, `Y` как два младших.':
    'The number 0 appears in two cases: the one is only in bit 0, or there are no ones at all. `Y` alone cannot tell them apart, so there is the output `V`: it is 1 if there is at least one one on the input.\n\nTo bring both signals out through one output, join them with the "Bus merge" block: `V` as the most significant bit, `Y` as the two least significant.',
  'На вход приоритетного шифратора подано 0110. Какой номер на выходе Y?':
    '0110 is fed to the input of a priority encoder. What number is on the output Y?',
  '2 (двоичное 10)': '2 (binary 10)',
  '1 (двоичное 01)': '1 (binary 01)',
  '3 (двоичное 11)': '3 (binary 11)',
  'Единицы стоят в битах 1 и 2. Старшая из них в бите 2, поэтому Y = 10. Бит 3 равен нулю, так что ответ 3 не подходит.':
    'The ones are in bits 1 and 2. The highest of them is in bit 2, so Y = 10. Bit 3 is zero, so the answer 3 does not fit.',
  'Собери приоритетный шифратор для четырёх линий. Выход y трёхбитный: старший бит равен V (единица есть), два младших равны номеру старшей единицы.':
    'Build a priority encoder for four lines. The output y is three bits: the most significant bit equals V (there is a one), the two least significant equal the number of the highest one.',
  'Нужны «Приоритетный шифратор» (ширина 4) и «Объединение шин».':
    'You need "Priority encoder" (width 4) and "Bus merge".',
  'В склейке две части: A шириной 1 (старший бит) и B шириной 2 (два младших).':
    'The merge has two parts: A of width 1 (most significant bit) and B of width 2 (the two least significant).',
  'V шифратора подключи к A склейки, Y шифратора к B склейки, а Y склейки к y.':
    "Connect the encoder's V to the merge's A, the encoder's Y to the merge's B, and the merge's Y to y.",
  'Шина: срез битов': 'Bus: a slice of bits',
  'Шина и номера битов': 'A bus and bit numbers',
  '**Шина** это провод, в котором идёт сразу несколько бит. Биты шины нумеруют справа налево: самый младший имеет номер 0. В числе `10110100` бит 0 равен 0, а бит 7 равен 1.\n\nИногда нужна только часть шины, например средние четыре бита. Для этого есть блок **«Срез шины»**.':
    'A **bus** is a wire that carries several bits at once. The bits of a bus are numbered from right to left: the least significant has number 0. In the number `10110100` bit 0 is 0, and bit 7 is 1.\n\nSometimes only a part of a bus is needed, for example the middle four bits. For this there is the **"Bus slice"** block.',
  'Параметры среза': 'Slice parameters',
  'У блока «Срез шины» три параметра: **«Ширина входа»** (сколько бит в исходной шине), **«Младший бит»** и **«Старший бит»**. Срез берёт биты от младшего до старшего включительно и считает их как новое число, у которого младший бит стал нулевым.\n\nШирина выхода равна «старший минус младший плюс один». Для среза 5..2 это 4 бита.':
    'The "Bus slice" block has three parameters: **"Input width"** (how many bits in the source bus), **"Low bit"** and **"High bit"**. The slice takes the bits from the low to the high inclusive and treats them as a new number in which the low bit became bit zero.\n\nThe output width equals "high minus low plus one". For a slice 5..2 that is 4 bits.',
  'Сколько бит в срезе шины с младшим битом 2 и старшим битом 5?':
    'How many bits are in a bus slice with low bit 2 and high bit 5?',
  'Берутся биты 2, 3, 4 и 5. Считают так: 5 − 2 + 1 = 4. Забыть «+1» самая частая ошибка.':
    'Bits 2, 3, 4 and 5 are taken. Count like this: 5 − 2 + 1 = 4. Forgetting the "+1" is the most common mistake.',
  'На вход a приходит 8-битное число. Выдели на выход y четырёхбитный срез: биты с 5 по 2 включительно.':
    'An 8-bit number arrives at the input a. Extract a four-bit slice to the output y: bits 5 to 2 inclusive.',
  'Нужен блок «Срез шины» из группы работы с шинами.':
    'You need the "Bus slice" block from the bus group.',
  'В его свойствах задай ширину входа 8, младший бит 2 и старший бит 5.':
    'In its properties set the input width to 8, the low bit to 2 and the high bit to 5.',
  'Соедини a с A блока, а Y блока с y.': "Connect a to the block's A, and the block's Y to y.",
  'Склейка шин': 'Bus merge',
  'Две шины в одну': 'Two buses into one',
  'Склейка делает обратное срезу: две шины становятся одной, более широкой. Блок **«Объединение шин»** ставит части друг за другом. Вход `A` даёт **старшие** биты, а последний вход (здесь `B`) даёт **младшие**.\n\nПример: к шине `101` справа приклеили `01100`, получилась шина `10101100`.':
    'Merging does the opposite of slicing: two buses become one, a wider one. The **"Bus merge"** block puts the parts one after another. The input `A` gives the **most significant** bits, and the last input (here `B`) gives the **least significant**.\n\nExample: to the bus `101` the bus `01100` was attached on the right, giving the bus `10101100`.',
  'Ширины частей': 'Widths of the parts',
  'У блока есть параметр **«Число частей»** (от 2 до 8) и ширина каждой части: «Ширина A», «Ширина B»… Ширина выхода равна сумме ширин частей. Если ширина части не совпадает с шириной провода, который к ней подключили, конструктор покажет ошибку.':
    'The block has the **"Number of parts"** parameter (from 2 to 8) and the width of each part: "Width A", "Width B"… The output width equals the sum of the widths of the parts. If the width of a part does not match the width of the wire connected to it, the editor will show an error.',
  'Склеиваем A = 11 (старшая часть) и B = 001 (младшая часть). Что получится?':
    'We merge A = 11 (the high part) and B = 001 (the low part). What do we get?',
  'Склейка не складывает числа, а ставит биты рядом: сначала A, потом B, получается 11001. Вариант 00111 получился бы, если бы части поменяли местами.':
    'Merging does not add numbers but puts the bits side by side: first A, then B, which gives 11001. The variant 00111 would result if the parts were swapped.',
  'Склей две шины в одну: hi трёхбитная (старшие биты), lo пятибитная (младшие). Выход y восьмибитный.':
    'Merge two buses into one: hi is three-bit (the high bits), lo is five-bit (the low bits). The output y is eight-bit.',
  'Нужен блок «Объединение шин» с двумя частями.': 'You need a "Bus merge" block with two parts.',
  'Задай ширину A равной 3, а ширину B равной 5. Тогда выход получится 8 бит.':
    'Set the width of A to 3 and the width of B to 5. Then the output is 8 bits.',
  'Старшие биты идут в A: hi подключи к A, lo к B.':
    'The high bits go to A: connect hi to A, lo to B.',
  'Выбор из трёх источников': 'Choosing from three sources',
  'Задача: три источника, два переключателя': 'The task: three sources, two switches',
  'Допустим, у нас три четырёхбитных числа `a`, `b` и `c` (например, показания трёх датчиков), а показывать на выходе нужно одно. Выбор задают **два переключателя**, вместе они дают двухбитное число `s`: от 0 до 3.\n\nПусть 0 выбирает `a`, 1 выбирает `b`, а 2 выбирает `c`.':
    'Suppose we have three four-bit numbers `a`, `b` and `c` (for example, readings of three sensors), and one of them must be shown on the output. The choice is set by **two switches**, which together give the two-bit number `s`: from 0 to 3.\n\nLet 0 select `a`, 1 select `b`, and 2 select `c`.',
  'Лишний код': 'An extra code',
  'Двух бит хватает на четыре варианта, а источников три. Значит, код 3 ничего не выбирает, и нужно решить, что тогда показывать. Самый простой выход: подать `c` ещё и на четвёртый вход мультиплексора. Тогда при `s = 3` на выходе тоже будет `c`.\n\nИспользуй блок «Мультиплексор 4:1» и поставь **«Ширину данных»** равной 4: тогда `D0`…`D3` и `Y` будут четырёхбитными шинами, а `S` останется двухбитным.':
    'Two bits are enough for four options, and there are three sources. So the code 3 selects nothing, and you must decide what to show then. The simplest way out: feed `c` also to the fourth input of the multiplexer. Then with `s = 3` the output will be `c` as well.\n\nUse the "Multiplexer 4:1" block and set the **"Data width"** to 4: then `D0`…`D3` and `Y` will be four-bit buses, and `S` will remain two-bit.',
  'Почему для выбора из трёх источников берут мультиплексор 4:1, а не 2:1?':
    'Why is a 4:1 multiplexer used to choose from three sources, and not a 2:1?',
  'Мультиплексор 2:1 различает только два источника, а три источника нужны два бита выбора':
    'A 2:1 multiplexer tells apart only two sources, while three sources need two select bits',
  'Мультиплексор 2:1 не умеет работать с четырёхбитными шинами':
    'A 2:1 multiplexer cannot work with four-bit buses',
  'Мультиплексор 4:1 всегда быстрее': 'A 4:1 multiplexer is always faster',
  'Одним битом S различаются только два входа. Для трёх нужно два бита, а блок с двухбитным S это мультиплексор 4:1. Ширину данных у любого мультиплексора можно сделать больше 1.':
    'With one bit S only two inputs can be told apart. For three you need two bits, and a block with a two-bit S is a 4:1 multiplexer. The data width of any multiplexer can be made larger than 1.',
  'Выбери один из трёх источников: s = 00 даёт a, s = 01 даёт b, s = 10 и s = 11 дают c. Источники a, b, c четырёхбитные.':
    'Choose one of three sources: s = 00 gives a, s = 01 gives b, s = 10 and s = 11 give c. The sources a, b, c are four-bit.',
  'Нужен «Мультиплексор 4:1» с шириной данных 4.':
    'You need a "Multiplexer 4:1" with data width 4.',
  'a, b, c подключи к D0, D1, D2 по порядку, а s к S.':
    'Connect a, b, c to D0, D1, D2 in order, and s to S.',
  'Четвёртый вход D3 тоже получает c: тогда код 11 тоже даёт c. Y блока соедини с y.':
    "The fourth input D3 also gets c: then the code 11 also gives c. Connect the block's Y to y.",
  'a b | перенос сумма\n0 0 |   0      0\n0 1 |   0      1\n1 0 |   0      1\n1 1 |   1      0':
    'a b | carry sum\n0 0 |   0     0\n0 1 |   0     1\n1 0 |   0     1\n1 1 |   1     0',
  'a b cin | перенос сумма\n0 0  0  |   0      0\n0 1  0  |   0      1\n1 1  0  |   1      0\n0 0  1  |   0      1\n1 1  1  |   1      1':
    'a b cin | carry sum\n0 0  0  |   0     0\n0 1  0  |   0     1\n1 1  0  |   1     0\n0 0  1  |   0     1\n1 1  1  |   1     1',
  '0111 + 1000 = 1111   (7 + 8 = 15)\n1111 + 0001 = 0000   (15 + 1 = 16, лишний бит потерян)':
    '0111 + 1000 = 1111   (7 + 8 = 15)\n1111 + 0001 = 0000   (15 + 1 = 16, extra bit lost)',
  '0101 - 0011 = 0010   (5 - 3 = 2)\n0011 - 0101 = 1110   (3 - 5 = 14, заём)':
    '0101 - 0011 = 0010   (5 - 3 = 2)\n0011 - 0101 = 1110   (3 - 5 = 14, borrow)',
  'Полусумматор из вентилей': 'A half adder from gates',
  'Сложение в столбик, но для битов': 'Column addition, but for bits',
  'Сложим два однобитных числа. Возможных ответов четыре: 0+0=0, 0+1=1, 1+0=1 и 1+1=**10** (в двоичной записи, то есть два). Ответ может занять **два бита**: младший называют **суммой**, старший — **переносом** (так же, как при сложении 9+1 в столбик ты пишешь 0 и переносишь 1).':
    'Let us add two one-bit numbers. There are four possible answers: 0+0=0, 0+1=1, 1+0=1 and 1+1=**10** (in binary, that is two). The answer may take **two bits**: the low one is called the **sum**, the high one the **carry** (just as when adding 9+1 in a column you write 0 and carry 1).',
  'Какие вентили нужны': 'Which gates are needed',
  'Посмотри на таблицу. Сумма равна 1, когда входы **разные**: это элемент **исключающее ИЛИ (XOR)**. Перенос равен 1, только когда **оба** входа равны 1: это элемент **И (AND)**.\n\nСхема из этих двух вентилей называется **полусумматором**. «Полу» потому, что он не умеет принимать перенос из соседнего разряда.\n\nЧтобы выход был одним числом из двух бит, их склеивают блоком «Объединение шин (concat)»: вход A — старший бит (перенос), вход B — младший (сумма).':
    'Look at the table. The sum is 1 when the inputs are **different**: that is the **exclusive OR (XOR)** gate. The carry is 1 only when **both** inputs are 1: that is the **AND** gate.\n\nA circuit of these two gates is called a **half adder**. "Half" because it cannot accept a carry from the neighboring place.\n\nTo make the output a single two-bit number, the bits are joined by the "Bus merge (concat)" block: input A is the high bit (carry), input B is the low bit (sum).',
  'Какой вентиль даёт бит суммы полусумматора?': 'Which gate gives the sum bit of a half adder?',
  'XOR (исключающее ИЛИ)': 'XOR (exclusive OR)',
  'AND (И)': 'AND',
  'OR (ИЛИ)': 'OR',
  'Сумма равна 1 для 0+1 и 1+0, то есть когда входы разные. Для 1+1 она 0: это именно XOR, а не OR.':
    'The sum is 1 for 0+1 and 1+0, that is when the inputs are different. For 1+1 it is 0: this is exactly XOR, not OR.',
  'Собери полусумматор: y — двухбитное число a + b. Старший бит y — перенос, младший — сумма.':
    'Build a half adder: y is the two-bit number a + b. The high bit of y is the carry, the low bit is the sum.',
  'Нужны три блока: XOR для суммы, И для переноса и склейка шин, чтобы получить два бита.':
    'You need three blocks: XOR for the sum, AND for the carry and a bus merge to get two bits.',
  'Входы a и b подай и на XOR, и на И.': 'Feed the inputs a and b to both the XOR and the AND.',
  'В блок «Объединение шин» перенос подай на A (старший бит), сумму на B (младший), а выход Y склейки — на y.':
    'In the "Bus merge" block, feed the carry to A (high bit), the sum to B (low bit), and the merge\'s output Y to y.',
  'Полный сумматор': 'A full adder',
  'Нужен ещё один вход': 'One more input is needed',
  'Чтобы сложить многоразрядные числа, каждый разряд должен учитывать перенос из соседнего, младшего. Значит, складывать надо **три бита**: a, b и перенос **cin**. Сумма трёх битов — от 0 до 3, то есть снова два бита: сумма и перенос дальше.':
    'To add multi-bit numbers, each place must take into account the carry from the neighboring, lower one. So **three bits** must be added: a, b and the carry **cin**. The sum of three bits is from 0 to 3, that is again two bits: the sum and the carry onward.',
  'Два полусумматора и ИЛИ': 'Two half adders and an OR',
  'Полный сумматор собирают из двух полусумматоров:\n\n- первый складывает a и b: частичная сумма **p** (XOR) и перенос **g** (И);\n- второй складывает p и cin: итоговая сумма (XOR p и cin) и ещё один перенос **t** (И p и cin);\n- итоговый перенос получается как **g ИЛИ t**: два переноса сразу случиться не могут.\n\nИтог склеивают блоком «Объединение шин»: перенос на A (старший бит), сумма на B.':
    'A full adder is built from two half adders:\n\n- the first adds a and b: the partial sum **p** (XOR) and the carry **g** (AND);\n- the second adds p and cin: the final sum (XOR of p and cin) and another carry **t** (AND of p and cin);\n- the final carry is **g OR t**: the two carries cannot happen at once.\n\nThe result is merged with the "Bus merge" block: the carry to A (high bit), the sum to B.',
  'Какое наибольшее число может получиться при сложении трёх битов?':
    'What is the largest number that can result from adding three bits?',
  '3, то есть 11 в двоичной записи': '3, that is 11 in binary',
  '2, то есть 10': '2, that is 10',
  '4, то есть 100': '4, that is 100',
  'Три единицы дают 1+1+1=3. В двоичной записи это 11: сумма 1 и перенос 1. Поэтому двух бит на выходе хватает.':
    'Three ones give 1+1+1=3. In binary that is 11: sum 1 and carry 1. So two output bits are enough.',
  'Собери полный сумматор: y — двухбитное число a + b + cin (старший бит — перенос, младший — сумма).':
    'Build a full adder: y is the two-bit number a + b + cin (the high bit is the carry, the low bit is the sum).',
  'Первый полусумматор: XOR и И от a и b. Второй: XOR и И от результата первого XOR и cin.':
    'The first half adder: XOR and AND of a and b. The second: XOR and AND of the result of the first XOR and cin.',
  'Перенос из двух полусумматоров объединяется блоком ИЛИ.':
    'The carry from the two half adders is combined with an OR block.',
  'Склейка: перенос (выход ИЛИ) на A, сумма (второй XOR) на B, выход склейки на y.':
    "Merge: the carry (OR output) to A, the sum (second XOR) to B, the merge's output to y.",
  'Сумматор одним блоком': 'An adder as one block',
  'Готовый блок сложения': 'A ready-made addition block',
  'Собирать многоразрядный сумматор из вентилей долго, поэтому в конструкторе есть готовый блок **«Сумматор»** (группа «Математика»). Он складывает два числа без знака. Ширину задают параметром **Ширина, бит**: для 4 бит числа идут от 0 до 15.\n\nУ блока входы A и B и выход Y той же ширины.':
    'Building a multi-bit adder from gates takes long, so the editor has a ready-made **"Adder"** block (the "Math" group). It adds two unsigned numbers. The width is set by the **Width, bits** parameter: for 4 bits the numbers go from 0 to 15.\n\nThe block has inputs A and B and an output Y of the same width.',
  'Что если не поместилось': 'What if it does not fit',
  'Сумма двух 4-битных чисел может не поместиться в 4 бита: 15 + 1 = 16, а на выходе только 4 бита. Лишний старший бит пропадает, и остаётся 0000. Это называется **переполнением**. Чтобы его заметить, у блока можно включить отдельный выход переноса COUT.':
    'The sum of two 4-bit numbers may not fit in 4 bits: 15 + 1 = 16, and the output has only 4 bits. The extra high bit is lost, and 0000 remains. This is called **overflow**. To notice it, you can turn on a separate carry output COUT on the block.',
  'Что получится на 4-битном выходе при 9 + 8?': 'What will be on a 4-bit output for 9 + 8?',
  '0001: единица старшего разряда пропадает': '0001: the one of the high place is lost',
  '9 + 8 = 17 = 10001 в двоичной записи. В 4 бита влезают только младшие 0001.':
    '9 + 8 = 17 = 10001 in binary. Only the low 0001 fits in 4 bits.',
  'Сложи два 4-битных числа блоком «Сумматор»: y = a + b (4 бита, перенос не нужен).':
    'Add two 4-bit numbers with the "Adder" block: y = a + b (4 bits, no carry needed).',
  'Блок лежит в группе «Математика» и называется «Сумматор».':
    'The block is in the "Math" group and is called "Adder".',
  'Проверь, что ширина блока 4 бита, как у входов.':
    "Check that the block's width is 4 bits, like the inputs.",
  'a на A, b на B, Y блока на y.': "a to A, b to B, the block's Y to y.",
  Вычитание: 'Subtraction',
  'Блок «Вычитатель»': 'The "Subtractor" block',
  'Блок **«Вычитатель»** считает A − B для чисел без знака. Входы и выход той же ширины, что и в сумматоре.\n\nПока A не меньше B, всё понятно: 9 − 3 = 6, то есть 1001 − 0011 = 0110.':
    'The **"Subtractor"** block computes A − B for unsigned numbers. The inputs and output have the same width as in the adder.\n\nWhile A is not less than B, everything is clear: 9 − 3 = 6, that is 1001 − 0011 = 0110.',
  'Когда A меньше B': 'When A is less than B',
  'Ответа «минус два» в числах без знака нет. Схема считает по кругу: после 0 идёт максимум. Для 4 бит 0 − 1 = 1111 (15), а 3 − 5 = 1110 (14). Это тот же **заём** из несуществующего старшего разряда: 3 + 16 − 5 = 14.':
    'There is no answer "minus two" in unsigned numbers. The circuit counts in a circle: after 0 comes the maximum. For 4 bits 0 − 1 = 1111 (15), and 3 − 5 = 1110 (14). This is the same **borrow** from a nonexistent high place: 3 + 16 − 5 = 14.',
  'Что покажет 4-битный вычитатель при 0 − 1?': 'What will a 4-bit subtractor show for 0 − 1?',
  'Ноль минус один «занимает» из старшего разряда: 16 − 1 = 15, то есть 1111. Отрицательных чисел без знака нет.':
    'Zero minus one "borrows" from the high place: 16 − 1 = 15, that is 1111. There are no negative unsigned numbers.',
  'Вычти b из a блоком «Вычитатель»: y = a − b (4 бита).':
    'Subtract b from a with the "Subtractor" block: y = a − b (4 bits).',
  'Нужен блок «Вычитатель» из группы «Математика».':
    'You need the "Subtractor" block from the "Math" group.',
  'Порядок важен: вычитаемое b идёт на вход B, а уменьшаемое a на вход A.':
    'The order matters: the subtrahend b goes to input B, and the minuend a to input A.',
  'Прибавить единицу': 'Add one',
  'Самая частая операция': 'The most common operation',
  'Прибавить 1 нужно постоянно: считать нажатия, двигать адрес, листать цифры. Для этого есть блок **«Прибавить 1»** (в конструкторе его kind называется incdec): один вход A и один выход Y.\n\nСхема внутри проще сумматора, но результат тот же, что у A + 1.':
    'Adding 1 is needed all the time: counting presses, moving an address, flipping through digits. For this there is the **"Add 1"** block (in the editor its kind is called incdec): one input A and one output Y.\n\nThe circuit inside is simpler than an adder, but the result is the same as A + 1.',
  'Круг по модулю': 'A circle modulo',
  'У 4-битного числа максимум 15. Если прибавить 1 к 1111, получится 0000: счёт идёт по кругу. Так работают и счётчики на плате.':
    'A 4-bit number has a maximum of 15. If you add 1 to 1111, you get 0000: the count goes around in a circle. This is how counters on the board work too.',
  'Что даст «Прибавить 1» для 4-битного числа 1111?':
    'What will "Add 1" give for the 4-bit number 1111?',
  'Результат занимает те же 4 бита. 15 + 1 = 16, старший бит не помещается, остаются нули.':
    'The result takes the same 4 bits. 15 + 1 = 16, the high bit does not fit, zeros remain.',
  'Прибавь единицу к 4-битному числу a: y = a + 1 (4 бита).':
    'Add one to the 4-bit number a: y = a + 1 (4 bits).',
  'Блок называется «Прибавить 1», группа «Математика».':
    'The block is called "Add 1", the "Math" group.',
  'Поставь ширину блока 4 бита и соедини a → A, Y → y.':
    "Set the block's width to 4 bits and connect a → A, Y → y.",
  'Смена знака': 'Changing the sign',
  'Как записать минус': 'How to write a minus',
  'Как записать −3 в четырёх битах? Используют **дополнительный код**: отрицательное число −n хранят как 16 − n (для 4 бит). Тогда сложение и вычитание работают одинаково для положительных и отрицательных чисел.\n\nСтарший бит показывает знак: 0 — число неотрицательное, 1 — отрицательное. Диапазон 4-битных чисел со знаком: от −8 до 7.':
    "How do you write −3 in four bits? **Two's complement** is used: a negative number −n is stored as 16 − n (for 4 bits). Then addition and subtraction work the same for positive and negative numbers.\n\nThe high bit shows the sign: 0 means the number is non-negative, 1 means negative. The range of 4-bit signed numbers: from −8 to 7.",
  'Блок «Смена знака»': 'The "Negate" block',
  'Блок **«Смена знака»** даёт число с противоположным знаком: из 0011 получается 1101, из 1101 — снова 0011. Ширина в блоке по умолчанию 8 бит, в этом уроке поставь **4**.\n\nУ самого маленького числа −8 (1000) противоположного нет: +8 в четыре бита со знаком не влезает, поэтому результат остаётся 1000.':
    'The **"Negate"** block gives the number with the opposite sign: from 0011 you get 1101, from 1101 again 0011. The default width in the block is 8 bits, in this lesson set it to **4**.\n\nThe smallest number −8 (1000) has no opposite: +8 does not fit in four signed bits, so the result stays 1000.',
  'Как выглядит −1 в 4-битном дополнительном коде?':
    "What does −1 look like in 4-bit two's complement?",
  '−1 хранится как 16 − 1 = 15, то есть 1111. Вариант 1001 это −7, а 0001 это +1.':
    '−1 is stored as 16 − 1 = 15, that is 1111. The variant 1001 is −7, and 0001 is +1.',
  'Поменяй знак 4-битного числа a: y = −a (в дополнительном коде, 4 бита).':
    "Change the sign of the 4-bit number a: y = −a (in two's complement, 4 bits).",
  'Блок называется «Смена знака» (группа «Математика»).':
    'The block is called "Negate" (the "Math" group).',
  'В параметрах блока ширину 8 замени на 4: она должна совпадать с шириной a.':
    "In the block's parameters replace the width 8 with 4: it must match the width of a.",
  'Умножение малых чисел': 'Multiplying small numbers',
  'Результат шире множителей': 'The result is wider than the factors',
  'Блок **«Умножитель»** умножает A на B. Чтобы ничего не терялось, ширина результата равна **сумме** ширин множителей. Два 2-битных числа (0…3) дают результат до 3 × 3 = 9, а ему нужны 4 бита.\n\nПоэтому у блока есть параметры **Ширина A** и **Ширина B** отдельно, а выход Y сам получается нужной ширины.':
    'The **"Multiplier"** block multiplies A by B. So that nothing is lost, the width of the result equals the **sum** of the widths of the factors. Two 2-bit numbers (0…3) give a result up to 3 × 3 = 9, and that needs 4 bits.\n\nThat is why the block has separate parameters **Width A** and **Width B**, and the output Y gets the needed width by itself.',
  'Сколько бит у результата блока при умножении 3-битного числа на 2-битное?':
    "How many bits does the block's result have when multiplying a 3-bit number by a 2-bit one?",
  'Ширина результата равна сумме ширин: 3 + 2 = 5 бит. Наибольшее произведение 7 × 3 = 21 влезает в 5 бит.':
    'The width of the result equals the sum of the widths: 3 + 2 = 5 bits. The largest product 7 × 3 = 21 fits in 5 bits.',
  'Перемножь два 2-битных числа a и b: y — их 4-битное произведение.':
    'Multiply two 2-bit numbers a and b: y is their 4-bit product.',
  'Нужен блок «Умножитель» из группы «Математика».':
    'You need the "Multiplier" block from the "Math" group.',
  'По умолчанию он 4×4 бита: поставь Ширину A = 2 и Ширину B = 2, тогда выход станет 4-битным.':
    'By default it is 4×4 bits: set Width A = 2 and Width B = 2, then the output becomes 4-bit.',
  'Расширение знака': 'Sign extension',
  'Сделать число шире': 'Making a number wider',
  'Иногда число надо перенести в шину пошире: например, из 4 бит в 8, чтобы сложить с другим 8-битным. Для чисел без знака слева просто дописывают нули: 0101 → 00000101.\n\nДля чисел со знаком так нельзя: −3 это 1101, а 00001101 это уже +13.':
    'Sometimes a number must be moved to a wider bus: for example, from 4 bits to 8, to add it to another 8-bit one. For unsigned numbers you simply add zeros on the left: 0101 → 00000101.\n\nFor signed numbers this does not work: −3 is 1101, and 00001101 is already +13.',
  'Копируем знаковый бит': 'Copying the sign bit',
  'Правильный способ — **знаковое расширение**: слева дописывают копии старшего (знакового) бита. Тогда значение не меняется.\n\nВ конструкторе это блок **«Знаковое расширение»** (в группе «Шины»). У него параметры «Ширина входа» и «Ширина выхода».':
    'The right way is **sign extension**: copies of the high (sign) bit are added on the left. Then the value does not change.\n\nIn the editor this is the **"Sign extend"** block (in the "Buses" group). It has the parameters "Input width" and "Output width".',
  'Во что превратится 4-битное −2 (1110) после знакового расширения до 8 бит?':
    'What will the 4-bit −2 (1110) turn into after sign extension to 8 bits?',
  'Старший бит равен 1, его копируют в четыре новых разряда слева: 1111 и 1110 дают 11111110, это по-прежнему −2.':
    'The high bit is 1, it is copied into the four new places on the left: 1111 and 1110 give 11111110, which is still −2.',
  'Расширь 4-битное число со знаком a до 8 бит: y имеет то же значение, что a.':
    'Extend the 4-bit signed number a to 8 bits: y has the same value as a.',
  'Блок называется «Знаковое расширение», он лежит в группе «Шины».':
    'The block is called "Sign extend", it is in the "Buses" group.',
  'Не путай его с «Дополнить нулями»: для отрицательных чисел нули дают неверный ответ.':
    'Do not confuse it with "Zero extend": for negative numbers zeros give a wrong answer.',
  'Модуль числа': 'Absolute value',
  'Убрать минус': 'Removing the minus',
  '**Модуль** числа — его значение без знака: |−3| = 3 и |3| = 3. Блок **«Модуль числа»** принимает число со знаком в дополнительном коде и выдаёт модуль.\n\nПоложительные числа он пропускает без изменений, а отрицательные меняет на противоположные.':
    'The **absolute value** of a number is its value without the sign: |−3| = 3 and |3| = 3. The **"Absolute value"** block takes a signed number in two\'s complement and outputs the absolute value.\n\nIt passes positive numbers unchanged, and negates negative ones.',
  'Особый случай −8': 'The special case −8',
  'В 4 бита со знаком помещаются числа от −8 до 7. Модуль −8 равен 8, но 8 в таком диапазоне нет. Поэтому блок оставляет 1000: на выходе по-прежнему −8. Помни об этом, когда считаешь модуль на узкой шине.':
    '4 signed bits hold numbers from −8 to 7. The absolute value of −8 is 8, but 8 is not in this range. So the block leaves 1000: the output is still −8. Remember this when computing the absolute value on a narrow bus.',
  'Чему равен модуль 4-битного числа 1111?': 'What is the absolute value of the 4-bit number 1111?',
  '1111 в дополнительном коде это −1, его модуль равен 1, то есть 0001.':
    "1111 in two's complement is −1, its absolute value is 1, that is 0001.",
  'Найди модуль 4-битного числа со знаком a: y = |a| (4 бита).':
    'Find the absolute value of the 4-bit signed number a: y = |a| (4 bits).',
  'Блок называется «Модуль числа (LPM_ABS)», группа «Математика».':
    'The block is called "Absolute value (LPM_ABS)", the "Math" group.',
  'Ширина блока по умолчанию 8: поставь 4.': "The block's default width is 8: set it to 4.",
  'A     B     | LT\n0011  0101  |  1   (3 < 5)\n0101  0011  |  0   (5 > 3)\n0101  0101  |  0   (равны)':
    'A     B     | LT\n0011  0101  |  1   (3 < 5)\n0101  0011  |  0   (5 > 3)\n0101  0101  |  0   (equal)',
  'x     | x>=3 | x<=9 | И\n0010  |  0   |  1   | 0\n0011  |  1   |  1   | 1\n1001  |  1   |  1   | 1\n1010  |  1   |  0   | 0':
    'x     | x>=3 | x<=9 | AND\n0010  |  0   |  1   | 0\n0011  |  1   |  1   | 1\n1001  |  1   |  1   | 1\n1010  |  1   |  0   | 0',
  'a < b ?   S   выход Y\nда        1   D1 = a\nнет       0   D0 = b':
    'a < b ?   S   output Y\nyes       1   D1 = a\nno        0   D0 = b',
  'данные    единиц | бит чётности\n0000000    0     |  0\n0000001    1     |  1\n0000011    2     |  0\n1110000    3     |  1':
    'data      ones | parity bit\n0000000    0    |  0\n0000001    1    |  1\n0000011    2    |  0\n1110000    3    |  1',
  'число  двоичный  Грея\n  0     0000     0000\n  1     0001     0001\n  2     0010     0011\n  3     0011     0010\n  4     0100     0110\n  7     0111     0100\n  8     1000     1100':
    'number  binary   Gray\n  0     0000     0000\n  1     0001     0001\n  2     0010     0011\n  3     0011     0010\n  4     0100     0110\n  7     0111     0100\n  8     1000     1100',
  'число  двоичный   BCD\n  7    0000111    0000 0111\n 19    0010011    0001 1001\n 42    0101010    0100 0010\n 63    0111111    0110 0011':
    'number  binary    BCD\n  7    0000111    0000 0111\n 19    0010011    0001 1001\n 42    0101010    0100 0010\n 63    0111111    0110 0011',
  'Равенство одним блоком': 'Equality in one block',
  'Сравнить два числа': 'Comparing two numbers',
  'Чтобы узнать, равны ли два числа, можно собрать схему из XOR и ИЛИ-НЕ. Но в конструкторе есть готовый блок **«Компаратор»** (группа «Арифметика и сравнение»). Он берёт два числа и сразу говорит, как они соотносятся.\n\nУ блока два входа-числа: **A** и **B** (по умолчанию по 4 бита) и выходы-ответы. Какие ответы нужны, выбирают в параметре «Выходы»: **EQ** (равно), **NE** (не равно), **LT** (A меньше B), **LE** (меньше или равно), **GT** (больше), **GE** (больше или равно).':
    'To find out whether two numbers are equal, you can build a circuit from XOR and NOR. But the editor has a ready-made **"Comparator"** block (the "Arithmetic and comparison" group). It takes two numbers and immediately says how they relate.\n\nThe block has two number inputs: **A** and **B** (4 bits each by default) and answer outputs. Which answers are needed is chosen in the "Outputs" parameter: **EQ** (equal), **NE** (not equal), **LT** (A less than B), **LE** (less or equal), **GT** (greater), **GE** (greater or equal).',
  'Шина и ответ в один бит': 'A bus and a one-bit answer',
  'Число из нескольких бит едет по одному толстому проводу, его называют **шиной**. Вход `a` шириной 4 бита — это сразу четыре бита, например `0101` (число 5).\n\nОтвет компаратора всегда один бит: 1 — «да, условие верно», 0 — «нет». Включи у блока только выход EQ, и он будет равен 1 ровно тогда, когда A и B совпадают во всех четырёх битах.':
    'A multi-bit number travels along one thick wire called a **bus**. The input `a` 4 bits wide is four bits at once, for example `0101` (the number 5).\n\nThe comparator\'s answer is always one bit: 1 means "yes, the condition is true", 0 means "no". Turn on only the EQ output of the block, and it will be 1 exactly when A and B match in all four bits.',
  'Что выдаёт выход EQ компаратора?': "What does the comparator's EQ output give?",
  '1, если A и B равны': '1 if A and B are equal',
  '1, если A больше B': '1 if A is greater than B',
  'Сумму A и B': 'The sum of A and B',
  'Разность A и B': 'The difference of A and B',
  'EQ (от equal, «равно») — один бит: 1, когда числа совпадают, иначе 0. Остальные выходы отвечают за «меньше» и «больше».':
    'EQ (from equal) is one bit: 1 when the numbers match, otherwise 0. The other outputs are responsible for "less" and "greater".',
  'На входы приходят два 4-битных числа a и b. Сделай так, чтобы y был равен 1, только когда a = b.':
    'Two 4-bit numbers a and b arrive at the inputs. Make y equal to 1 only when a = b.',
  'Понадобится один блок «Компаратор» из группы «Арифметика и сравнение».':
    'You will need one "Comparator" block from the "Arithmetic and comparison" group.',
  'В параметре «Выходы» оставь только «Равно»: у блока появится выход EQ.':
    'In the "Outputs" parameter leave only "Equal": the block gets an EQ output.',
  'Входы a и b — на A и B компаратора, выход EQ — на y.':
    'The inputs a and b go to A and B of the comparator, the EQ output goes to y.',
  'Меньше: A < B': 'Less than: A < B',
  'Выход LT': 'The LT output',
  'Тот же блок **«Компаратор»** умеет отвечать и на вопрос «A меньше B?». Для этого в его параметре «Выходы» отмечают **«A < B»**: у блока появляется выход **LT** (от less than, «меньше чем»).\n\nЧисла сравниваются как обычные неотрицательные двоичные числа: `0111` (7) меньше `1000` (8), хотя в `0111` единиц больше. Важна не сумма единиц, а значение числа.':
    'The same **"Comparator"** block can also answer the question "is A less than B?". For this, in its "Outputs" parameter mark **"A < B"**: the block gets an output **LT** (from less than).\n\nNumbers are compared as ordinary non-negative binary numbers: `0111` (7) is less than `1000` (8), although `0111` has more ones. What matters is not the number of ones, but the value of the number.',
  'Порядок входов важен': 'The order of inputs matters',
  'Сравнение «меньше» не симметрично: «A < B» и «B < A» — разные вопросы. Если поменять входы местами, ответ станет противоположным (кроме случая равенства: тогда он 0 в обоих).\n\nПоэтому следи, какой вход подключаешь к A, а какой к B.':
    'The "less than" comparison is not symmetric: "A < B" and "B < A" are different questions. If you swap the inputs, the answer becomes the opposite (except for equality: then it is 0 in both).\n\nSo watch which input you connect to A and which to B.',
  'Что выдаст LT при A = 7 и B = 7?': 'What will LT give for A = 7 and B = 7?',
  'Зависит от ширины шины': 'Depends on the bus width',
  'Число не меньше самого себя, поэтому «A < B» неверно и LT равен 0.':
    'A number is not less than itself, so "A < B" is false and LT is 0.',
  'Даны 4-битные числа a и b. Пусть y = 1, когда a меньше b.':
    'Given the 4-bit numbers a and b. Let y = 1 when a is less than b.',
  'Снова блок «Компаратор», но теперь нужен другой выход.':
    'Again the "Comparator" block, but now a different output is needed.',
  'В параметре «Выходы» отметь «A < B» и сними «Равно».':
    'In the "Outputs" parameter mark "A < B" and clear "Equal".',
  'a идёт на A, b на B, выход LT на y. Не перепутай входы местами.':
    'a goes to A, b to B, the LT output to y. Do not swap the inputs.',
  'Число в диапазоне 3…9': 'A number in the range 3…9',
  'Два сравнения и И': 'Two comparisons and an AND',
  'Условие «число x лежит в диапазоне от 3 до 9 включительно» состоит из двух частей: **x ≥ 3** и **x ≤ 9**. Каждую проверяет свой компаратор, а вместе их объединяет элемент **И**: ответ 1, только когда верны обе части.\n\nВторое число для сравнения — константа. В библиотеке есть блок **«Константа»** (группа «Входы и выходы»): у него параметры «ширина» и «значение», а выход называется `Y`. Для 4-битного x и число 3 ширина константы тоже 4 бита.':
    'The condition "the number x lies in the range from 3 to 9 inclusive" has two parts: **x ≥ 3** and **x ≤ 9**. Each is checked by its own comparator, and an **AND** gate joins them: the answer is 1 only when both parts are true.\n\nThe second number for comparison is a constant. The library has a **"Constant"** block (the "Inputs and outputs" group): it has the parameters "width" and "value", and its output is called `Y`. For a 4-bit x the constant 3 is also 4 bits wide.',
  'Какие выходы включить': 'Which outputs to turn on',
  'Первый компаратор должен выдавать «A ≥ B» (выход **GE**), второй — «A ≤ B» (выход **LE**). У каждого блока включён только один нужный выход, лишние выходы не нужны.\n\nЭто типичный приём: сложное условие раскладывают на простые сравнения и склеивают логикой.':
    'The first comparator must give "A ≥ B" (output **GE**), the second "A ≤ B" (output **LE**). Each block has only the one needed output turned on, extra outputs are not needed.\n\nThis is a typical technique: a complex condition is split into simple comparisons and glued together with logic.',
  'Каким элементом объединить проверки «x ≥ 3» и «x ≤ 9»?':
    'Which gate should join the checks "x ≥ 3" and "x ≤ 9"?',
  'И: нужны обе проверки сразу': 'AND: both checks are needed at once',
  'ИЛИ: хватит любой из двух': 'OR: either of the two is enough',
  'XOR: нужно, чтобы верна была ровно одна': 'XOR: exactly one must be true',
  'Число должно быть и не меньше 3, и не больше 9. Если взять ИЛИ, в ответ попадёт любое число, потому что каждое число подходит хотя бы под одно из условий.':
    'The number must be both not less than 3 and not greater than 9. With an OR any number would pass, because every number satisfies at least one of the conditions.',
  'x — 4-битное число. Пусть y = 1, когда 3 ≤ x ≤ 9 (границы входят в диапазон).':
    'x is a 4-bit number. Let y = 1 when 3 ≤ x ≤ 9 (the boundaries are included in the range).',
  'Нужны два компаратора, две константы (3 и 9, ширина 4 бита) и один элемент И.':
    'You need two comparators, two constants (3 and 9, width 4 bits) and one AND gate.',
  'Первый компаратор: A = x, B = 3, выход «A ≥ B». Второй: A = x, B = 9, выход «A ≤ B».':
    'The first comparator: A = x, B = 3, output "A ≥ B". The second: A = x, B = 9, output "A ≤ B".',
  'Выходы GE первого и LE второго идут на два входа И, выход И на y.':
    'The GE output of the first and the LE of the second go to the two inputs of the AND, the AND output to y.',
  'Меньшее из двух': 'The smaller of two',
  'Сравнить, затем выбрать': 'Compare, then choose',
  'Задача: из двух чисел a и b выдать **меньшее**. Решение из двух блоков.\n\n- **Компаратор** с выходом LT отвечает на вопрос «a < b?».\n- **Мультиплексор 2:1** (переключатель) по этому ответу выбирает, какое число пропустить: если «да», то a, если «нет», то b.\n\nОтвет компаратора становится управляющим сигналом **S** мультиплексора.':
    'The task: output the **smaller** of the two numbers a and b. The solution uses two blocks.\n\n- A **Comparator** with the LT output answers the question "a < b?".\n- A **2:1 multiplexer** (a switch) uses this answer to choose which number to pass: if "yes", a, if "no", b.\n\nThe comparator\'s answer becomes the control signal **S** of the multiplexer.',
  'Шины и мультиплексор': 'Buses and a multiplexer',
  'Мультиплексор — блок «Мультиплексор»: у него входы данных `D0`, `D1`, управляющий вход `S` и выход `Y`. Когда S = 0, на выход идёт D0, когда S = 1, идёт D1.\n\nНам нужно передавать целые 4-битные числа, поэтому у мультиплексора параметр «Ширина данных» ставят равным 4. Управляющий вход S остаётся одним битом. Если числа равны, неважно, какое выбрать: они одинаковы.':
    'The multiplexer is the "Multiplexer" block: it has data inputs `D0`, `D1`, a control input `S` and an output `Y`. When S = 0, D0 goes to the output, when S = 1, D1 goes.\n\nWe need to pass whole 4-bit numbers, so the multiplexer\'s "Data width" parameter is set to 4. The control input S stays one bit. If the numbers are equal, it does not matter which to choose: they are the same.',
  'Какой сигнал управляет мультиплексором в схеме «меньшее из двух»?':
    'Which signal controls the multiplexer in the "smaller of two" circuit?',
  'Выход LT компаратора': "The comparator's LT output",
  'Само число a': 'The number a itself',
  'Выход EQ компаратора': "The comparator's EQ output",
  'Именно «a < b» решает, какое из чисел пропустить. EQ тут не нужен: при равных числах любой выбор даёт верный результат.':
    'It is "a < b" that decides which number to pass. EQ is not needed here: with equal numbers any choice gives the right result.',
  'Даны 4-битные числа a и b. Пусть 4-битный выход y равен меньшему из них.':
    'Given the 4-bit numbers a and b. Let the 4-bit output y equal the smaller of them.',
  'Нужны компаратор с выходом «A < B» и мультиплексор 2:1 с шириной данных 4 бита.':
    'You need a comparator with the "A < B" output and a 2:1 multiplexer with data width 4 bits.',
  'Выход LT подключи к управляющему входу S мультиплексора.':
    "Connect the LT output to the multiplexer's control input S.",
  'Когда a < b (S = 1), должно пройти a: подключи a к D1, а b к D0. Выход Y на y.':
    'When a < b (S = 1), a must pass: connect a to D1 and b to D0. The output Y to y.',
  'Есть ли в шине единица': 'Is there a one in the bus',
  'Свёртка шины в один бит': 'Reducing a bus to one bit',
  'Иногда нужно ответить на простой вопрос про всю шину сразу: «нажата ли хоть одна из восьми кнопок?». Можно поставить цепочку из семи элементов ИЛИ, но проще взять блок **«Хотя бы один бит равен 1»** (группа «Логика»).\n\nЭто **свёртка**: блок объединяет все биты шины в один бит. У него вход `A` (шина) и выход `Y` (один бит). Параметр «Ширина входной шины» говорит, сколько в шине бит.':
    'Sometimes you need to answer a simple question about the whole bus at once: "is at least one of eight buttons pressed?". You could put a chain of seven OR gates, but it is easier to take the **"At least one bit is 1"** block (the "Logic" group).\n\nThis is a **reduction**: the block combines all the bits of the bus into one bit. It has an input `A` (the bus) and an output `Y` (one bit). The "Input bus width" parameter says how many bits the bus has.',
  'Почему так': 'Why it works',
  'Свёртка ИЛИ работает так же, как элемент ИЛИ с очень многими входами: единица на выходе, если единица есть хотя бы в одном бите. Ноль получается только когда **все** биты нулевые, то есть когда число равно нулю.\n\nЗначит, этот блок можно использовать и как проверку «число не ноль».':
    'An OR reduction works like an OR gate with very many inputs: a one on the output if there is a one in at least one bit. A zero appears only when **all** bits are zero, that is when the number equals zero.\n\nSo this block can also be used as a "number is not zero" check.',
  'При каком значении шины свёртка ИЛИ выдаёт 0?':
    'At which bus value does an OR reduction give 0?',
  'Когда все биты равны 0': 'When all bits are 0',
  'Когда все биты равны 1': 'When all bits are 1',
  'Когда единиц чётное число': 'When the number of ones is even',
  'ИЛИ даёт 1, если есть хоть одна единица. Значит, 0 только когда единиц нет совсем.':
    'OR gives 1 if there is at least one one. So 0 only when there are no ones at all.',
  'Вход d — 8-битная шина (по биту на кнопку). Пусть y = 1, когда нажата хотя бы одна кнопка, то есть в d есть единица.':
    'The input d is an 8-bit bus (one bit per button). Let y = 1 when at least one button is pressed, that is, there is a one in d.',
  'Тебе нужен один блок из группы «Логика», он работает со всей шиной сразу.':
    'You need one block from the "Logic" group, it works with the whole bus at once.',
  'Возьми «Хотя бы один бит равен 1» и проверь, что ширина входной шины равна 8.':
    'Take "At least one bit is 1" and check that the input bus width is 8.',
  'd идёт на вход A блока, выход Y на y.': "d goes to the block's input A, the output Y to y.",
  'Все биты шины равны 1': 'All bits of the bus are 1',
  'Свёртка И': 'AND reduction',
  'Парный блок к предыдущему называется **«Все биты шины равны 1»**. Это свёртка И: на выходе `Y` единица, только если единицей является **каждый** бит входной шины `A`.\n\nТакая схема нужна, например, чтобы понять, что все шесть выключателей включены, или что число состоит из одних единиц (максимальное значение для своей ширины).':
    'The paired block to the previous one is called **"All bits of the bus are 1"**. It is an AND reduction: the output `Y` is one only if **every** bit of the input bus `A` is one.\n\nSuch a circuit is needed, for example, to find out that all six switches are on, or that a number consists of all ones (the maximum value for its width).',
  'Одного нуля достаточно': 'A single zero is enough',
  'Свёртка И, как и элемент И, обнуляется от единственного нуля среди битов. Поэтому в проверках стоит перебрать не только «всё включено» и «всё выключено», но и случаи, когда ноль стоит на самом краю: в старшем или младшем бите. Тогда видно, что блок учитывает каждый бит.':
    'An AND reduction, like an AND gate, drops to zero from a single zero among the bits. So in checks it is worth trying not only "all on" and "all off", but also cases where the zero is at the very edge: in the high or low bit. Then you can see that the block takes every bit into account.',
  'Шина 1110111. Что выдаст свёртка И?': 'The bus is 1110111. What will an AND reduction give?',
  'Неопределённое значение': 'An undefined value',
  'В шине есть один нулевой бит. Для результата 1 нужны единицы во всех позициях.':
    'There is one zero bit in the bus. For the result 1 you need ones in all positions.',
  'Вход s — шина из 6 выключателей. Пусть y = 1, только когда включены все шесть (все биты равны 1).':
    'The input s is a bus of 6 switches. Let y = 1 only when all six are on (all bits are 1).',
  'Нужен один блок свёртки из группы «Логика».':
    'You need one reduction block from the "Logic" group.',
  'Выбери «Все биты шины равны 1» и поставь ширину входной шины 6 бит.':
    'Choose "All bits of the bus are 1" and set the input bus width to 6 bits.',
  's подключи к A, выход Y — к y.': 'Connect s to A, the output Y to y.',
  'Чётность шины': 'Bus parity',
  'Бит чётности': 'The parity bit',
  'При передаче данных бит может случайно перевернуться. Чтобы заметить ошибку, к данным добавляют **бит чётности**: его выбирают так, чтобы общее число единиц вместе с ним стало чётным. Приёмник пересчитывает единицы, и если их получилось нечётно, значит, где-то случилась ошибка.\n\nГлавное в этой схеме: выяснить, **нечётно ли число единиц** в шине.':
    'During data transmission a bit can accidentally flip. To notice the error, a **parity bit** is added to the data: it is chosen so that the total number of ones together with it becomes even. The receiver recounts the ones, and if the count is odd, an error happened somewhere.\n\nThe main thing in this circuit: to find out **whether the number of ones is odd** in the bus.',
  'XOR по всей шине': 'XOR over the whole bus',
  'Элемент XOR выдаёт 1, когда единиц на входах нечётное число. Свёртка XOR делает то же для всех битов шины сразу. В библиотеке это блок **«Чётность шины»** (группа «Логика»): вход `A`, выход `Y`.\n\nЕго выход как раз и есть нужный бит чётности: если единиц в данных нечётно, Y равен 1, и вместе с этим битом общее число единиц становится чётным.':
    'An XOR gate gives 1 when the number of ones on the inputs is odd. An XOR reduction does the same for all the bits of the bus at once. In the library this is the **"Bus parity"** block (the "Logic" group): input `A`, output `Y`.\n\nIts output is exactly the needed parity bit: if the number of ones in the data is odd, Y is 1, and together with this bit the total number of ones becomes even.',
  'Шина 10110001. Что выдаст свёртка XOR?': 'The bus is 10110001. What will an XOR reduction give?',
  '1, единиц пять': '1, there are five ones',
  '0, единиц четыре': '0, there are four ones',
  '1, единиц четыре': '1, there are four ones',
  '0, единиц пять': '0, there are five ones',
  'В 10110001 четыре единицы: это чётное число, поэтому XOR всех битов равен 0. Единица получилась бы при нечётном числе единиц.':
    '10110001 has four ones: that is an even number, so the XOR of all bits is 0. A one would result from an odd number of ones.',
  'Вход d — 7-битные данные. Пусть y будет битом чётности: 1, когда в d нечётное число единиц.':
    'The input d is 7-bit data. Let y be the parity bit: 1 when d has an odd number of ones.',
  'Подойдёт один блок свёртки: в библиотеке он назван «Чётность шины».':
    'One reduction block will do: in the library it is called "Bus parity".',
  'Установи ширину входной шины 7 бит. Функция блока должна быть XOR.':
    "Set the input bus width to 7 bits. The block's function must be XOR.",
  'd идёт на вход A, выход Y на y.': 'd goes to input A, the output Y to y.',
  'Код Грея блоком': 'Gray code with a block',
  'Зачем нужен код Грея': 'Why Gray code is needed',
  'В обычном двоичном счёте при переходе, например, от `0111` (7) к `1000` (8) меняются сразу четыре бита. Если датчик положения или переключатель читает биты чуть не одновременно, на мгновение можно получить любое число.\n\n**Код Грея** устроен так, что у соседних чисел отличается ровно один бит. Поэтому его используют в энкодерах (датчиках поворота) и при передаче счётчиков между частями схемы.':
    'In ordinary binary counting, on a transition such as from `0111` (7) to `1000` (8), four bits change at once. If a position sensor or switch reads the bits slightly non-simultaneously, any number can appear for a moment.\n\n**Gray code** is built so that adjacent numbers differ in exactly one bit. That is why it is used in encoders (rotation sensors) and when passing counters between parts of a circuit.',
  'Готовый блок': 'A ready-made block',
  'В конструкторе есть блок **«Код Грея»**: вход `A` и выход `Y` одной ширины. Параметр «Направление» задаёт перевод: **«Двоичный → Грея»** или обратно. Внутри он делает простое действие: каждый бит результата равен XOR двух соседних битов числа (число сдвигают вправо на один бит и складывают XOR с самим собой).\n\nСтаршие биты у двоичного кода и кода Грея совпадают.':
    'The editor has a **"Gray code"** block: an input `A` and an output `Y` of the same width. The "Direction" parameter sets the conversion: **"Binary → Gray"** or back. Inside it does a simple thing: each bit of the result is the XOR of two neighboring bits of the number (the number is shifted right by one bit and XORed with itself).\n\nThe high bits of the binary code and of the Gray code are the same.',
  'Чем отличаются коды Грея соседних чисел?': 'How do the Gray codes of adjacent numbers differ?',
  'Ровно одним битом': 'By exactly one bit',
  'Всегда двумя битами': 'Always by two bits',
  'Ничем, коды одинаковы': 'They do not differ, the codes are the same',
  'В этом главное свойство кода Грея: при шаге на единицу меняется ровно один бит, и сбои при считывании почти исключены.':
    'This is the main property of Gray code: with a step of one exactly one bit changes, and read errors are almost excluded.',
  'Вход n — 4-битное двоичное число. Пусть 4-битный выход y будет его кодом Грея.':
    'The input n is a 4-bit binary number. Let the 4-bit output y be its Gray code.',
  'Нужен один блок «Код Грея» из группы «Выбор и кодирование».':
    'You need one "Gray code" block from the "Selection and encoding" group.',
  'Выбери направление «Двоичный → Грея» и ширину 4 бита.':
    'Choose the direction "Binary → Gray" and width 4 bits.',
  'n подключи к A, выход Y — к y.': 'Connect n to A, the output Y to y.',
  'Двоично-десятичный код': 'Binary-coded decimal',
  'Что такое BCD': 'What BCD is',
  'Человеку удобны десятичные цифры, а схеме двоичные числа. **BCD** (двоично-десятичный код) — компромисс: каждая десятичная цифра записывается в своих четырёх битах как обычное число от 0 до 9.\n\nНапример, число 42 в двоичном виде `101010`, а в BCD это две цифры: 4 и 2, то есть `0100 0010`. Такой код легко выводить на семисегментные индикаторы: каждая цифра идёт на свой индикатор.':
    'Decimal digits are convenient for people, and binary numbers for circuits. **BCD** (binary-coded decimal) is a compromise: each decimal digit is written in its own four bits as an ordinary number from 0 to 9.\n\nFor example, the number 42 in binary is `101010`, and in BCD it is two digits: 4 and 2, that is `0100 0010`. Such a code is easy to output to seven-segment displays: each digit goes to its own display.',
  'Блок «Двоичный ↔ BCD»': 'The "Binary ↔ BCD" block',
  'Для перевода есть блок **«Двоичный → BCD»** (как микросхема 74184). У него вход `A` (двоичное число) и выход `Y` (цифры BCD подряд, старшая цифра слева).\n\nШирина выхода зависит от ширины входа. В параметре «Ширина двоичного числа» поставим 6 бит: число от 0 до 63, у него не больше двух десятичных цифр, значит, выход получится 8-битным (две цифры по 4 бита).\n\nДля шестибитных чисел старшая тетрада это десятки, младшая единицы.':
    'For conversion there is the **"Binary → BCD"** block (like the 74184 chip). It has an input `A` (the binary number) and an output `Y` (the BCD digits in a row, the high digit on the left).\n\nThe output width depends on the input width. In the "Binary number width" parameter we set 6 bits: a number from 0 to 63 has no more than two decimal digits, so the output will be 8-bit (two digits of 4 bits).\n\nFor six-bit numbers the high nibble is the tens, the low one the units.',
  'Как записывается число 25 в BCD?': 'How is the number 25 written in BCD?',
  'Цифры 2 и 5 записываются по отдельности: 2 это 0010, 5 это 0101. Вместе получается 0010 0101. А 0001 1001 это 19.':
    'The digits 2 and 5 are written separately: 2 is 0010, 5 is 0101. Together we get 0010 0101. And 0001 1001 is 19.',
  'Вход n — 6-битное двоичное число (0…63). Пусть 8-битный выход y содержит его в BCD: старшие четыре бита — десятки, младшие — единицы.':
    'The input n is a 6-bit binary number (0…63). Let the 8-bit output y contain it in BCD: the high four bits are tens, the low ones are units.',
  'Подойдёт один блок «Двоичный → BCD» из группы «Выбор и кодирование».':
    'One "Binary → BCD" block from the "Selection and encoding" group will do.',
  'В параметре «Ширина двоичного числа» поставь 6 бит; направление «Двоичный → BCD».':
    'In the "Binary number width" parameter set 6 bits; the direction "Binary → BCD".',
  'n подключи к A, выход Y (8 бит) — к y.': 'Connect n to A, the output Y (8 bits) to y.',
  'clk ____|‾‾‾‾|____|‾‾‾‾|____|‾‾‾‾|____\n           ^         ^         ^   фронты\nD   ___|‾‾‾‾‾‾‾‾‾‾‾|________|‾‾‾‾‾‾‾\nQ   ________|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾|____\n            Q берёт D только на фронте':
    'clk ____|‾‾‾‾|____|‾‾‾‾|____|‾‾‾‾|____\n           ^         ^         ^   edges\nD   ___|‾‾‾‾‾‾‾‾‾‾‾|________|‾‾‾‾‾‾‾\nQ   ________|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾|____\n            Q takes D only on an edge',
  'D[3:0]  0101   1111   ----   0011\nclk     _|‾|_  _|‾|_  _|‾|_  _|‾|_\nQ[3:0]  ????   0101   1111   1111   0011\n               новое значение видно после фронта':
    'D[3:0]  0101   1111   ----   0011\nclk     _|‾|_  _|‾|_  _|‾|_  _|‾|_\nQ[3:0]  ????   0101   1111   1111   0011\n               the new value is visible after the edge',
  ' J K | Q после фронта\n 0 0 | Q  (хранит)\n 1 0 | 1\n 0 1 | 0\n 1 1 | не Q (переключает)':
    ' J K | Q after the edge\n 0 0 | Q  (holds)\n 1 0 | 1\n 0 1 | 0\n 1 1 | not Q (toggles)',
  ' S R | Q после фронта\n 0 0 | Q  (хранит)\n 1 0 | 1\n 0 1 | 0\n 1 1 | 0  (R сильнее)':
    ' S R | Q after the edge\n 0 0 | Q  (holds)\n 1 0 | 1\n 0 1 | 0\n 1 1 | 0  (R is stronger)',
  'btn   ____|‾‾‾‾‾‾‾‾‾‾‾‾|______|‾‾‾‾‾\npulse ____|‾|_________________|‾|______\n          ^ один такт            ^ один такт':
    'btn   ____|‾‾‾‾‾‾‾‾‾‾‾‾|______|‾‾‾‾‾\npulse ____|‾|_________________|‾|______\n          ^ one clock            ^ one clock',
  'btn ──► [ D-триггер 1 ] ──► [ D-триггер 2 ] ──► Q\n                 clk ▲                  clk ▲\n\nclk    _|‾|_|‾|_|‾|_|‾|_\nbtn      0   1   1   1\nQ        0   0   0   1   (с опозданием на фронт)':
    'btn ──► [ D flip-flop 1 ] ──► [ D flip-flop 2 ] ──► Q\n                 clk ▲                    clk ▲\n\nclk    _|‾|_|‾|_|‾|_|‾|_\nbtn      0   1   1   1\nQ        0   0   0   1   (one edge late)',
  'D-триггер: запомнить бит': 'D flip-flop: remember a bit',
  'Память на один бит': 'One bit of memory',
  'Схемы из логических элементов не помнят ничего: стоит изменить вход, и выход меняется следом. Чтобы схема могла **запомнить** значение, нужен **триггер**. Самый простой из них — **D-триггер**: у него вход данных **D**, вход такта **CLK** и выход **Q**.\n\n**Такт** (clk, от английского clock, «часы») — сигнал, который всё время переключается 0, 1, 0, 1… Переход от 0 к 1 называют **положительным фронтом**. Только на фронте D-триггер смотрит на вход D и записывает его значение в Q. Между фронтами Q не меняется, что бы ни делалось с D.':
    'Circuits made of logic gates remember nothing: change the input, and the output changes right after. For a circuit to **remember** a value, you need a **flip-flop**. The simplest one is the **D flip-flop**: it has a data input **D**, a clock input **CLK** and an output **Q**.\n\nThe **clock** (clk) is a signal that keeps switching 0, 1, 0, 1… The transition from 0 to 1 is called the **rising edge**. Only on the edge does the D flip-flop look at the input D and write its value into Q. Between edges Q does not change, whatever happens to D.',
  'Блок «D-триггер»': 'The "D flip-flop" block',
  'В конструкторе он называется **«D-триггер»** и лежит в группе «Память». Его контакты: **D** (данные), **CLK** (такт) и **Q** (выход).\n\nЕго ширина — один бит. Вход такта у схемы называется **clk**: так его узнаёт симулятор. Подключай к блоку именно этот вход.\n\nВ проверке вход d меняется уже после фронта, а выход читается чуть позже в том же такте. Провод показал бы новое значение сразу, а триггер ещё держит старое.':
    'In the editor it is called **"D flip-flop"** and sits in the "Memory" group. Its pins: **D** (data), **CLK** (clock) and **Q** (output).\n\nIts width is one bit. The clock input of the circuit is called **clk**: that is how the simulator recognizes it. Connect exactly this input to the block.\n\nIn the check the input d changes after the edge, and the output is read a little later in the same clock. A wire would show the new value at once, while the flip-flop still holds the old one.',
  'D меняется с 0 на 1 сразу после фронта clk. Когда это увидит Q?':
    'D changes from 0 to 1 right after the edge of clk. When will Q see it?',
  'Сразу, как только D стал 1': 'Immediately, as soon as D became 1',
  'На следующем фронте clk': 'On the next edge of clk',
  'Q вообще не узнает об этом': 'Q will never learn about it',
  'Триггер смотрит на D только в момент фронта. Если D изменился уже после фронта, Q останется прежним до следующего фронта.':
    'The flip-flop looks at D only at the moment of the edge. If D changed after the edge, Q stays the same until the next edge.',
  'Собери D-триггер: y должен повторять d, но с задержкой до следующего фронта clk.':
    'Build a D flip-flop: y must repeat d, but with a delay until the next edge of clk.',
  'Такт 1: d уже 1, а y ещё 0': 'Clock 1: d is already 1, and y is still 0',
  'Такт 3: d уже 0, а y ещё 1': 'Clock 3: d is already 0, and y is still 1',
  'Такт 4: d снова 1, а y ещё 0': 'Clock 4: d is 1 again, and y is still 0',
  'Нужен один блок из группы памяти: «D-триггер».':
    'You need one block from the memory group: "D flip-flop".',
  'Соедини d с контактом D блока, а clk с контактом CLK.':
    "Connect d to the block's D pin, and clk to the CLK pin.",
  'Выход Q блока подключи к y.': "Connect the block's output Q to y.",
  'Регистр на четыре бита': 'A four-bit register',
  'Несколько триггеров под одним тактом': 'Several flip-flops under one clock',
  '**Регистр** — это несколько D-триггеров с общим тактом. Все они срабатывают на одном фронте и вместе хранят число или набор битов. Регистр из четырёх триггеров хранит 4-битное число, например `0101`.\n\nВ конструкторе не надо ставить четыре блока: у блока «Регистр» есть параметр **«Ширина, бит»**. Поставь 4, и контакты D и Q станут четырёхбитными шинами (**шина** — пучок проводов, несущий число целиком).':
    'A **register** is several D flip-flops with a common clock. All of them fire on the same edge and together store a number or a set of bits. A register of four flip-flops stores a 4-bit number, for example `0101`.\n\nIn the editor you do not need to place four blocks: the "Register" block has a **"Width, bits"** parameter. Set 4, and the pins D and Q become four-bit buses (a **bus** is a bundle of wires carrying a whole number).',
  'Что хранится между фронтами': 'What is stored between edges',
  'Пока нет фронта, Q держит старое число, даже если D уже поменялся. Поэтому регистр удобно сравнить с фотоаппаратом: на каждом фронте он делает снимок входа и показывает его до следующего снимка.\n\nУ входа d схемы тоже должна быть ширина 4, а выход y получает 4 бита. Если ширины не совпадают, конструктор сообщит об ошибке.':
    "While there is no edge, Q holds the old number, even if D has already changed. So a register is handy to compare with a camera: on every edge it takes a snapshot of the input and shows it until the next snapshot.\n\nThe circuit's input d must also be 4 wide, and the output y gets 4 bits. If the widths do not match, the editor will report an error.",
  'Как сделать регистр на 8 бит с блоком «Регистр»?':
    'How do you make an 8-bit register with the "Register" block?',
  'Поставить 8 блоков шириной 1 и соединить их тактовые входы':
    'Place 8 blocks of width 1 and connect their clock inputs',
  'Поставить один блок и задать ширину 8 бит': 'Place one block and set the width to 8 bits',
  'Поставить один блок: ширина не меняется, регистр всегда на 1 бит':
    'Place one block: the width does not change, a register is always 1 bit',
  'Ширина блока — параметр. Блок шириной 8 внутри устроен как восемь триггеров с общим тактом, а D и Q у него — 8-битные шины.':
    'The width of the block is a parameter. A block of width 8 is built inside as eight flip-flops with a common clock, and its D and Q are 8-bit buses.',
  'Собери 4-битный регистр: y повторяет d, но обновляется только на фронте clk.':
    'Build a 4-bit register: y repeats d, but is updated only on the edge of clk.',
  'Такт 1: d уже 0101, а y ещё 0000': 'Clock 1: d is already 0101, and y is still 0000',
  'Такт 4: d уже 0011, а y ещё 1111': 'Clock 4: d is already 0011, and y is still 1111',
  'Блок «Регистр» из группы «Память» (в нём уже стоит ширина 8 и включён сброс).':
    'The "Register" block from the "Memory" group (it already has width 8 and the reset enabled).',
  'Открой параметры блока: поставь «Ширина, бит» равной 4 и выключи «Синхронный сброс RST» (в этом уроке он не нужен: контакт RST остался бы неподключённым).':
    'Open the block\'s parameters: set "Width, bits" to 4 and turn off "Synchronous reset RST" (it is not needed in this lesson: the RST pin would remain unconnected).',
  'Соедини d с D, clk с CLK, а Q с y.': 'Connect d to D, clk to CLK, and Q to y.',
  'Регистр с разрешением записи': 'A register with write enable',
  'Когда регистр должен «не слушать»': 'When a register must "not listen"',
  'Обычный регистр записывает D на каждом фронте. Но часто нужно записывать только по команде: например, фиксировать число, когда нажали кнопку. Для этого добавляют сигнал **разрешения записи** — **EN** (от английского enable, «разрешить»).\n\n- EN = 1: на фронте регистр берёт D.\n- EN = 0: на фронте регистр сохраняет старое значение.':
    'An ordinary register writes D on every edge. But often you need to write only on command: for example, to capture a number when a button is pressed. For this a **write enable** signal is added: **EN**.\n\n- EN = 1: on the edge the register takes D.\n- EN = 0: on the edge the register keeps the old value.',
  'Два способа получить разрешение': 'Two ways to get enable',
  'У блока «Регистр» есть параметр **«Разрешение записи EN»**. Включи его, и у блока появится контакт **EN**. Это самый простой способ.\n\nТот же результат даёт схема с обратной связью: мультиплексор выбирает между новым D и текущим Q, а выход мультиплексора идёт на вход D. При EN = 0 регистр «записывает» своё же прежнее значение. Блок с параметром делает это внутри себя.\n\nВ этом задании используй параметр блока.':
    'The "Register" block has a **"Write enable EN"** parameter. Turn it on, and the block gets an **EN** pin. This is the simplest way.\n\nThe same result is given by a circuit with feedback: a multiplexer chooses between the new D and the current Q, and the multiplexer\'s output goes to the input D. With EN = 0 the register "writes" its own previous value. The block with the parameter does this inside itself.\n\nIn this task use the block\'s parameter.',
  'EN = 0, на входе D новое число, пришёл фронт clk. Что станет с Q?':
    'EN = 0, there is a new number on the input D, and an edge of clk arrived. What will happen to Q?',
  'Q возьмёт новое число': 'Q takes the new number',
  'Q сбросится в 0': 'Q resets to 0',
  'Q сохранит прежнее число': 'Q keeps the previous number',
  'Разрешение EN = 0 запрещает запись: на фронте регистр оставляет старое значение, как бы D ни менялся.':
    'Enable EN = 0 forbids writing: on the edge the register keeps the old value, however D changes.',
  'Собери 4-битный регистр с разрешением: на фронте clk он берёт d только при en = 1, иначе хранит старое значение.':
    'Build a 4-bit register with enable: on the edge of clk it takes d only when en = 1, otherwise it keeps the old value.',
  'Запись при en = 1': 'Write with en = 1',
  'en = 0: хранит 0101': 'en = 0: holds 0101',
  'en = 0: всё ещё 0101': 'en = 0: still 0101',
  'en = 1: берёт 1111': 'en = 1: takes 1111',
  'en = 0: хранит 1111': 'en = 0: holds 1111',
  'en = 1: берёт 0001': 'en = 1: takes 0001',
  'Тебе нужен один блок «Регистр» шириной 4 (или «D-триггер с разрешением» шириной 4).':
    'You need one "Register" block of width 4 (or "D flip-flop with enable" of width 4).',
  'Выключи «Синхронный сброс RST» и включи «Разрешение записи EN»: у блока появится контакт EN.':
    'Turn off "Synchronous reset RST" and turn on "Write enable EN": the block gets an EN pin.',
  'Соедини d с D, en с EN, clk с CLK, Q с y.': 'Connect d to D, en to EN, clk to CLK, Q to y.',
  'Регистр со сбросом': 'A register with reset',
  'Начать с нуля': 'Start from zero',
  'После включения платы триггеры хранят неизвестное значение. Чтобы схема начала работать с понятного состояния, ей нужен **сброс** (reset): сигнал, по которому регистр обнуляется.\n\nСбросы бывают **синхронные** и **асинхронные**. Синхронный сброс действует только на фронте такта: пока фронта нет, регистр ничего не замечает. Асинхронный действует сразу, как только пришёл. В этом уроке — синхронный.':
    'After the board is powered on, the flip-flops hold an unknown value. For the circuit to start from a clear state, it needs a **reset**: a signal that clears the register.\n\nResets can be **synchronous** or **asynchronous**. A synchronous reset acts only on a clock edge: while there is no edge, the register notices nothing. An asynchronous one acts as soon as it arrives. In this lesson it is synchronous.',
  'Параметр «Синхронный сброс RST»': 'The "Synchronous reset RST" parameter',
  'В блоке «Регистр» включи **«Синхронный сброс RST»**: появится контакт **RST**. Когда на нём 1, на фронте регистр загружает **значение при сбросе** (по умолчанию 0), а D игнорирует. **Сброс сильнее записи данных.**\n\nВ проверке вход **reset** держит единицу первые два такта, как после включения платы, а потом ещё раз поднимается на такте 4. Подключи его к RST.':
    'In the "Register" block turn on **"Synchronous reset RST"**: a pin **RST** appears. When it is 1, on the edge the register loads the **reset value** (0 by default) and ignores D. **Reset is stronger than writing data.**\n\nIn the check the input **reset** holds one for the first two clocks, as after powering the board, and then rises again at clock 4. Connect it to RST.',
  'Синхронный сброс reset = 1 пришёл между двумя фронтами. Когда обнулится регистр?':
    'A synchronous reset reset = 1 arrived between two edges. When will the register clear?',
  'Сразу, не дожидаясь фронта': 'Immediately, without waiting for an edge',
  'На ближайшем фронте clk': 'On the nearest edge of clk',
  'Только после того, как D станет 0': 'Only after D becomes 0',
  '«Синхронный» значит «в такт»: сброс учитывается лишь на фронте clk. До фронта регистр ещё хранит старое значение.':
    '"Synchronous" means "in step with the clock": the reset is taken into account only on the edge of clk. Before the edge the register still holds the old value.',
  'Собери 4-битный регистр с синхронным сбросом: при reset = 1 на фронте он обнуляется, иначе берёт d.':
    'Build a 4-bit register with a synchronous reset: with reset = 1 on the edge it clears, otherwise it takes d.',
  'Такт 0: идёт сброс, d = 1010': 'Clock 0: reset is on, d = 1010',
  'Такт 1: сброс ещё держится': 'Clock 1: reset is still held',
  'Такт 2: сброса нет, берёт d': 'Clock 2: no reset, takes d',
  'Такт 4: reset = 1 сильнее d = 1111': 'Clock 4: reset = 1 is stronger than d = 1111',
  'Такт 5: сброс снят': 'Clock 5: reset released',
  'Блок «Регистр» шириной 4: «Синхронный сброс RST» у него включён по умолчанию.':
    'The "Register" block of width 4: "Synchronous reset RST" is on by default.',
  'Проверь параметр «Синхронный сброс RST»: появится контакт RST.':
    'Check the "Synchronous reset RST" parameter: an RST pin appears.',
  'Соедини d с D, reset с RST, clk с CLK, Q с y. Значение при сбросе остаётся 0.':
    'Connect d to D, reset to RST, clk to CLK, Q to y. The reset value stays 0.',
  'T-триггер: переключатель': 'T flip-flop: a toggle',
  'Переворачивает по команде': 'Flips on command',
  '**T-триггер** (от английского toggle, «переключить») имеет вход **T**. На каждом фронте такта:\n\n- T = 1: выход Q меняется на противоположный;\n- T = 0: выход Q остаётся прежним.\n\nЕсли держать T = 1, Q переключается на каждом фронте, и получается сигнал вдвое медленнее такта. Так устроены делители частоты и двоичные счётчики.':
    'A **T flip-flop** (from toggle) has an input **T**. On every clock edge:\n\n- T = 1: the output Q changes to the opposite;\n- T = 0: the output Q stays the same.\n\nIf you hold T = 1, Q switches on every edge, and you get a signal half as fast as the clock. This is how frequency dividers and binary counters are built.',
  'Блок «T-триггер»': 'The "T flip-flop" block',
  'В конструкторе блок называется **«T-триггер»**. Контакты: **T**, **CLK**, **Q**. После включения платы значение Q неизвестно, а переключать неизвестное можно бесконечно. Поэтому включи параметр **«Асинхронный сброс ACLR»**: на новом контакте ACLR единица мгновенно обнуляет Q, не дожидаясь фронта. Подключи к нему вход reset.\n\nСброс держится первый такт проверки. Вход T сам Q не меняет. Q меняется только на фронте, и только когда T = 1.':
    'In the editor the block is called **"T flip-flop"**. Pins: **T**, **CLK**, **Q**. After the board is powered on, the value of Q is unknown, and an unknown can be toggled forever. So turn on the **"Asynchronous reset ACLR"** parameter: on the new pin ACLR a one instantly clears Q, without waiting for an edge. Connect the input reset to it.\n\nThe reset is held during the first clock of the check. The input T does not change Q by itself. Q changes only on an edge, and only when T = 1.',
  'Q = 1, T = 0, пришёл фронт clk. Чему равен Q после него?':
    'Q = 1, T = 0, an edge of clk arrived. What is Q after it?',
  'Q не определён': 'Q is not defined',
  'При T = 0 T-триггер сохраняет значение: Q остаётся 1. Переключается он только при T = 1.':
    'With T = 0 a T flip-flop keeps its value: Q stays 1. It toggles only with T = 1.',
  'Собери T-триггер: на каждом фронте clk при t = 1 выход y меняется на противоположный, при t = 0 хранится.':
    'Build a T flip-flop: on every edge of clk with t = 1 the output y changes to the opposite, with t = 0 it holds.',
  'Такт 0: идёт сброс, y = 0': 'Clock 0: reset is on, y = 0',
  'Такт 1: t = 1, 0 меняется на 1': 'Clock 1: t = 1, 0 changes to 1',
  'Такт 2: переключился обратно': 'Clock 2: toggled back',
  'Такт 3: t = 0, хранит': 'Clock 3: t = 0, holds',
  'Такт 4: t = 0, хранит': 'Clock 4: t = 0, holds',
  'Такт 6: t = 0, хранит 1': 'Clock 6: t = 0, holds 1',
  'Нужен один блок «T-триггер» из группы «Память».':
    'You need one "T flip-flop" block from the "Memory" group.',
  'Включи в его параметрах «Асинхронный сброс ACLR»: появится контакт ACLR.':
    'In its parameters turn on "Asynchronous reset ACLR": an ACLR pin appears.',
  'Соедини t с T, reset с ACLR, clk с CLK, Q с y.':
    'Connect t to T, reset to ACLR, clk to CLK, Q to y.',
  'JK-триггер': 'JK flip-flop',
  'Четыре команды в одном блоке': 'Four commands in one block',
  '**JK-триггер** управляется двумя входами. **J** пытается поставить Q в 1, **K** пытается поставить Q в 0. На фронте такта:\n\n- J = 0, K = 0: хранить;\n- J = 1, K = 0: Q = 1;\n- J = 0, K = 1: Q = 0;\n- J = 1, K = 1: переключить на противоположное.\n\nОт RS-триггера он отличается тем, что комбинация J = K = 1 не запрещена, а превращает триггер в T-триггер.':
    'A **JK flip-flop** is controlled by two inputs. **J** tries to set Q to 1, **K** tries to set Q to 0. On a clock edge:\n\n- J = 0, K = 0: hold;\n- J = 1, K = 0: Q = 1;\n- J = 0, K = 1: Q = 0;\n- J = 1, K = 1: toggle to the opposite.\n\nIt differs from an RS flip-flop in that the combination J = K = 1 is not forbidden but turns the flip-flop into a T flip-flop.',
  'Блок «JK-триггер»': 'The "JK flip-flop" block',
  'В библиотеке блок называется **«JK-триггер»** с контактами **J**, **K**, **CLK**, **Q**. Подключи clk к CLK и смотри, как меняется Q по таблице.\n\nСтоит проверить все четыре комбинации. Особенно коварны две: J = K = 0, когда ничего не должно происходить, и J = K = 1, когда Q обязан перевернуться, а не застыть.':
    'In the library the block is called **"JK flip-flop"** with the pins **J**, **K**, **CLK**, **Q**. Connect clk to CLK and watch how Q changes according to the table.\n\nIt is worth checking all four combinations. Two are especially tricky: J = K = 0, when nothing must happen, and J = K = 1, when Q must flip rather than freeze.',
  'Q = 1, J = 1, K = 1, пришёл фронт clk. Чему равен Q?':
    'Q = 1, J = 1, K = 1, an edge of clk arrived. What is Q?',
  Неопределён: 'Undefined',
  'При J = K = 1 триггер переключается: было 1, станет 0.':
    'With J = K = 1 the flip-flop toggles: it was 1, it becomes 0.',
  'Собери JK-триггер: на фронте clk он хранит, устанавливает, сбрасывает или переключается по входам j и k.':
    'Build a JK flip-flop: on the edge of clk it holds, sets, resets or toggles according to the inputs j and k.',
  'Такт 0: J = 1, K = 0, установить': 'Clock 0: J = 1, K = 0, set',
  'Такт 1: хранить 1': 'Clock 1: hold 1',
  'Такт 2: J = 0, K = 1, сбросить': 'Clock 2: J = 0, K = 1, reset',
  'Такт 3: хранить 0': 'Clock 3: hold 0',
  'Такт 4: J = K = 1, 0 → 1': 'Clock 4: J = K = 1, 0 → 1',
  'Такт 5: J = K = 1, 1 → 0': 'Clock 5: J = K = 1, 1 → 0',
  'Такт 6: установить': 'Clock 6: set',
  'Такт 7: J = K = 1, 1 → 0': 'Clock 7: J = K = 1, 1 → 0',
  'Нужен один блок «JK-триггер».': 'You need one "JK flip-flop" block.',
  'Входы j и k идут на контакты J и K, а clk на контакт CLK.':
    'The inputs j and k go to the pins J and K, and clk to the pin CLK.',
  'Q блока подключи к y.': "Connect the block's Q to y.",
  'SR-триггер: установить и сбросить': 'SR flip-flop: set and reset',
  'Два отдельных входа': 'Two separate inputs',
  '**SR-триггер** (RS-триггер) работает как выключатель с двумя кнопками. Вход **S** (set, «установить») включает выход Q в 1, а вход **R** (reset, «сбросить») выключает в 0. Если ни одна кнопка не нажата, Q хранит прежнее значение.\n\nТак можно «запомнить» нажатие: кратко нажал S, и Q остался равен 1, пока не нажмёшь R.':
    'An **SR flip-flop** (RS flip-flop) works like a switch with two buttons. The input **S** (set) turns the output Q on to 1, and the input **R** (reset) turns it off to 0. If neither button is pressed, Q holds its previous value.\n\nThis lets you "remember" a press: press S briefly, and Q stays 1 until you press R.',
  'Запрещённая комбинация': 'The forbidden combination',
  'Что делать, если S и R нажаты вместе? У классической защёлки на двух элементах эта комбинация запрещена: результат непредсказуем. В блоке **«RS-триггер (по такту)»** конструктора её определили однозначно: **побеждает сброс R**.\n\nБлок срабатывает по фронту clk, как все триггеры этой главы. Контакты: **S**, **R**, **CLK**, **Q**.':
    'What to do if S and R are pressed together? In a classic latch of two gates this combination is forbidden: the result is unpredictable. In the editor\'s **"RS flip-flop (clocked)"** block it is defined unambiguously: **reset R wins**.\n\nThe block fires on the edge of clk, like all flip-flops of this chapter. Pins: **S**, **R**, **CLK**, **Q**.',
  'Q = 1, S = 1, R = 1 в момент фронта. Чему станет равен Q в блоке «RS-триггер»?':
    'Q = 1, S = 1, R = 1 at the moment of the edge. What will Q become in the "RS flip-flop" block?',
  'В этом блоке при S = R = 1 побеждает сброс R, поэтому Q станет 0. «Неопределён» был бы верен только для классической схемы на двух элементах.':
    'In this block with S = R = 1 reset R wins, so Q becomes 0. "Undefined" would be right only for the classic circuit of two gates.',
  'Собери SR-триггер: s устанавливает y в 1, r сбрасывает в 0, при s = r = 0 значение хранится, а при s = r = 1 побеждает r.':
    'Build an SR flip-flop: s sets y to 1, r resets it to 0, with s = r = 0 the value is held, and with s = r = 1 r wins.',
  'Такт 0: установить': 'Clock 0: set',
  'Такт 1: хранит 1': 'Clock 1: holds 1',
  'Такт 2: сбросить': 'Clock 2: reset',
  'Такт 3: хранит 0': 'Clock 3: holds 0',
  'Такт 4: S = R = 1, побеждает R': 'Clock 4: S = R = 1, R wins',
  'Такт 5: установить': 'Clock 5: set',
  'Такт 6: S = R = 1, 1 → 0': 'Clock 6: S = R = 1, 1 → 0',
  'Такт 7: хранит 0': 'Clock 7: holds 0',
  'Нужен блок «RS-триггер (по такту)» из группы памяти.':
    'You need the "RS flip-flop (clocked)" block from the memory group.',
  's идёт на контакт S, r на контакт R, clk на CLK.':
    's goes to the pin S, r to the pin R, clk to CLK.',
  'Детектор фронта: один импульс на нажатие': 'Edge detector: one pulse per press',
  'Нажатие длится много тактов': 'A press lasts many clocks',
  'Кнопку держат десятки миллисекунд, а такт платы короче в миллионы раз. Если подать кнопку на счётчик напрямую, он сосчитает не одно нажатие, а сотни тысяч тактов. Нам нужен сигнал, который равен 1 **ровно один такт** в момент нажатия, сколько бы ни держали кнопку.\n\nТакой узел называется **детектор фронта**. Он запоминает значение входа с прошлого такта (триггером) и сравнивает с текущим: «раньше 0, а сейчас 1» значит «только что нажали».':
    'A button is held for tens of milliseconds, and the board\'s clock is millions of times shorter. If you feed the button straight to a counter, it will count not one press but hundreds of thousands of clocks. We need a signal that is 1 for **exactly one clock** at the moment of the press, however long the button is held.\n\nSuch a unit is called an **edge detector**. It remembers the input value from the previous clock (with a flip-flop) and compares it with the current one: "0 before, 1 now" means "just pressed".',
  'Блок «Детектор фронта»': 'The "Edge detector" block',
  'В библиотеке блок называется **«Детектор фронта («нажатие»)»**. Контакты: **D** (проверяемый сигнал), **CLK** (такт) и **P** (импульс). В параметре «Какой фронт» по умолчанию стоит «Нажатие (0 → 1)»; есть и «Отпускание (1 → 0)».\n\nВ проверке вход btn меняется уже после фронта такта, как у настоящей кнопки, а выход читается позже в том же такте. Импульс получается один и только на такте, когда btn поднялся.':
    'In the library the block is called **"Edge detector ("press")"**. Pins: **D** (the signal to check), **CLK** (clock) and **P** (pulse). In the "Which edge" parameter the default is "Press (0 → 1)"; there is also "Release (1 → 0)".\n\nIn the check the input btn changes after the clock edge, like a real button, and the output is read later in the same clock. There is one pulse, and only on the clock when btn rose.',
  'Кнопку держат нажатой 100 тактов. Сколько тактов равен 1 выход детектора нажатия?':
    "The button is held pressed for 100 clocks. For how many clocks is the press detector's output 1?",
  'Один такт': 'One clock',
  '100 тактов': '100 clocks',
  'Детектор сравнивает прошлое значение с текущим. Разница «0 → 1» бывает только в момент нажатия, затем значения равны, и выход 0.':
    'The detector compares the previous value with the current one. The difference "0 → 1" happens only at the moment of the press, then the values are equal, and the output is 0.',
  'Собери детектор нажатия: y равен 1 только на том такте, когда btn стал 1 (был 0), и 0 во все остальные.':
    'Build a press detector: y is 1 only on the clock when btn became 1 (it was 0), and 0 on all others.',
  'Такт 0: кнопка отпущена': 'Clock 0: button released',
  'Такт 1: нажали, импульс': 'Clock 1: pressed, pulse',
  'Такт 2: держат, импульса нет': 'Clock 2: held, no pulse',
  'Такт 3: отпустили, импульса нет': 'Clock 3: released, no pulse',
  'Такт 4: нажали снова, импульс': 'Clock 4: pressed again, pulse',
  'Такт 5: держат': 'Clock 5: held',
  'Такт 6: всё ещё держат': 'Clock 6: still held',
  'Такт 7: отпустили': 'Clock 7: released',
  'Нужен один блок «Детектор фронта («нажатие»)».': 'You need one "Edge detector ("press")" block.',
  'btn идёт на контакт D, clk на контакт CLK.': 'btn goes to the pin D, clk to the pin CLK.',
  'Выход блока называется P: соедини его с y. Режим «Нажатие (0 → 1)» остаётся по умолчанию.':
    'The block\'s output is called P: connect it to y. The "Press (0 → 1)" mode stays the default.',
  'Синхронизатор: привязать кнопку к такту': 'Synchronizer: tie the button to the clock',
  'Кнопка не знает про такт': 'A button knows nothing about the clock',
  'Кнопку нажимают, когда захочется, а не когда удобно такту. Если сигнал изменится как раз в момент фронта, триггер может поймать «ни 0, ни 1» и на короткое время выдать неустойчивый выход. Это явление называется **метастабильностью**. Остальная схема, получив такой сигнал, может повести себя непредсказуемо.\n\nЛечат это простым приёмом: пропускают сигнал через **два триггера подряд** на одном такте. Первый может и «запутаться», но к следующему фронту успевает определиться, и второй триггер выдаёт уже чистое значение.':
    'A button is pressed when it pleases, not when it suits the clock. If the signal changes just at the moment of an edge, a flip-flop may catch "neither 0 nor 1" and for a short time output an unstable value. This phenomenon is called **metastability**. The rest of the circuit, receiving such a signal, may behave unpredictably.\n\nIt is cured by a simple technique: pass the signal through **two flip-flops in a row** on the same clock. The first may get "confused", but by the next edge it manages to settle, and the second flip-flop outputs a clean value.',
  'Блок «Синхронизатор»': 'The "Synchronizer" block',
  'В библиотеке блок называется **«Синхронизатор (2 триггера)»**. Контакты: **D** (вход, например кнопка), **CLK** и **Q**. Цена безопасности — задержка: сигнал доходит до Q на такт позже, чем через обычный триггер.\n\nКороткий импульс при этом не пропадает и не растягивается: однотактовое «нажатие» дойдёт до Q тоже однотактовым, только позже.':
    'In the library the block is called **"Synchronizer (2 flip-flops)"**. Pins: **D** (the input, for example a button), **CLK** and **Q**. The price of safety is a delay: the signal reaches Q one clock later than through an ordinary flip-flop.\n\nA short pulse is neither lost nor stretched: a one-clock "press" reaches Q also as one clock, just later.',
  'Зачем нужны два триггера подряд?': 'Why are two flip-flops in a row needed?',
  'Чтобы сигнал стал вдвое быстрее': 'To make the signal twice as fast',
  'Чтобы первый триггер успел «определиться», а второй выдал чистое значение':
    'So that the first flip-flop has time to "settle" and the second outputs a clean value',
  'Чтобы сигнал инвертировался дважды и не менялся':
    'So that the signal is inverted twice and does not change',
  'Первый триггер при неудачном моменте может выдать неустойчивое значение, но к следующему фронту оно обычно устаивается. Второй триггер передаёт его дальше уже чистым.':
    'At an unlucky moment the first flip-flop may output an unstable value, but by the next edge it usually settles. The second flip-flop passes it on already clean.',
  'Собери синхронизатор: y повторяет btn, но с задержкой в два триггера, привязанной к clk.':
    'Build a synchronizer: y repeats btn, but with a delay of two flip-flops tied to clk.',
  'Такт 2: btn = 1, y ещё 0': 'Clock 2: btn = 1, y is still 0',
  'Такт 3: y = 1 через два триггера': 'Clock 3: y = 1 after two flip-flops',
  'Такт 5: btn = 0, y ещё 1': 'Clock 5: btn = 0, y is still 1',
  'Такт 6: y = 0, btn уже снова 1': 'Clock 6: y = 0, btn is already 1 again',
  'Такт 7: короткий импульс дошёл': 'Clock 7: the short pulse got through',
  'Нужен один блок «Синхронизатор (2 триггера)».':
    'You need one "Synchronizer (2 flip-flops)" block.',
  'такт:    1   2   3   4   ...  16  17\nQ:       1   2   3   4   ...  0   1':
    'clock:   1   2   3   4   ...  16  17\nQ:       1   2   3   4   ...  0   1',
  'такт:  1  2  3  4  5  6  7\nEN:    1  1  0  0  0  1  1\nQ:     1  2  2  2  2  3  4':
    'clock: 1  2  3  4  5  6  7\nEN:    1  1  0  0  0  1  1\nQ:     1  2  2  2  2  3  4',
  'такт:   1  2  3  4  5  6\nreset:  0  0  1  0  0  0\nQ:      1  2  0  1  2  3':
    'clock:  1  2  3  4  5  6\nreset: 0  0  1  0  0  0\nQ:     1  2  0  1  2  3',
  'такт:   1   2   3   4   5\nLOAD:   0   0   1   0   0\nD:      10  10  10  10  10\nQ:      1   2   10  11  12':
    'clock:  1   2   3   4   5\nLOAD:   0   0   1   0   0\nD:      10  10  10  10  10\nQ:      1   2   10  11  12',
  'Q ──► [ +1 ] ──► D\n▲                 │\n└── регистр ◄─────┘ (по фронту clk)':
    'Q ──► [ +1 ] ──► D\n▲                 │\n└── register ◄────┘ (on the edge of clk)',
  'такт: 1 2 3 4 5 6 7 8\nQ:    1 0 1 0 1 0 1 0': 'clock: 1 2 3 4 5 6 7 8\nQ:     1 0 1 0 1 0 1 0',
  'Q:      0 1 2 3 4 5 6 7\nбит 0:  0 1 0 1 0 1 0 1   (÷2)\nбит 1:  0 0 1 1 0 0 1 1   (÷4)\nбит 2:  0 0 0 0 1 1 1 1   (÷8)':
    'Q:      0 1 2 3 4 5 6 7\nbit 0:  0 1 0 1 0 1 0 1   (÷2)\nbit 1:  0 0 1 1 0 0 1 1   (÷4)\nbit 2:  0 0 0 0 1 1 1 1   (÷8)',
  'Счётчик одним блоком': 'A counter as one block',
  'Что такое счётчик': 'What a counter is',
  '**Счётчик** — это схема, которая помнит число и на каждом **такте** увеличивает его на единицу. Такт — это сигнал, который всё время меняется 0 → 1 → 0 → 1. Схема работает «по фронту»: в момент, когда такт переходит из 0 в 1, она делает один шаг. В конструкторе вход такта всегда называется **clk**.\n\nВ группе «Память» лежит блок **«Счётчик»**. Его выход **Q** — это текущее число. У блока по умолчанию 4 бита, поэтому он умеет показывать числа от 0 до 15.':
    'A **counter** is a circuit that remembers a number and increases it by one on every **clock**. The clock is a signal that keeps changing 0 → 1 → 0 → 1. The circuit works "on the edge": at the moment the clock goes from 0 to 1, it makes one step. In the editor the clock input is always called **clk**.\n\nIn the "Memory" group there is the **"Counter"** block. Its output **Q** is the current number. By default the block has 4 bits, so it can show numbers from 0 to 15.',
  'Что будет после 15': 'What happens after 15',
  'В четырёх битах больше 15 не поместится. Когда счётчик дошёл до 15 (двоичное 1111), следующий шаг даёт 0000: старший бит «выпадает» за край. Это называется **переполнением**, и счёт просто начинается заново.\n\nСчётчик ничего не делает сам по себе: ему нужен только такт. Соедини вход clk с контактом **CLK** блока, а выход **Q** с выходом схемы.\n\nОдно «но»: сразу после включения числа в счётчике нет, оно неизвестно. Чтобы он начал с нуля, ему нужен **сброс**. Вход сброса называем **reset**, а в параметрах блока включаем «Синхронное обнуление CLR» и подаём reset на контакт **CLR**. В начале проверки reset равен 1 первые два такта, потом падает в 0, и счёт идёт. Подробнее о сбросе — в уроке про сброс.':
    'Four bits cannot hold more than 15. When the counter reaches 15 (binary 1111), the next step gives 0000: the high bit "falls off" the edge. This is called **overflow**, and the count simply starts over.\n\nThe counter does nothing by itself: it only needs a clock. Connect the input clk to the block\'s pin **CLK**, and the output **Q** to the circuit\'s output.\n\nOne "but": right after power-on there is no number in the counter, it is unknown. To make it start from zero, it needs a **reset**. We call the reset input **reset**, and in the block\'s parameters we turn on "Synchronous clear CLR" and feed reset to the pin **CLR**. At the start of the check reset is 1 for the first two clocks, then drops to 0, and counting goes. More about reset is in the lesson on reset.',
  'Четырёхбитный счётчик досчитал до 15. Что он покажет на следующем такте?':
    'A four-bit counter has counted up to 15. What will it show on the next clock?',
  '15 (остановится)': '15 (it will stop)',
  'В 4 битах есть только числа от 0 до 15. После 15 счёт переходит на 0 и идёт по кругу.':
    'There are only the numbers 0 to 15 in 4 bits. After 15 the count goes to 0 and runs in a circle.',
  'Собери схему, в которой выход y показывает, сколько фронтов такта clk прошло после сброса. Используй блок «Счётчик»; reset обнуляет его.':
    'Build a circuit in which the output y shows how many edges of the clock clk have passed since the reset. Use the "Counter" block; reset clears it.',
  'Сброс в начале': 'Reset at the start',
  'Первый такт': 'The first clock',
  'Третий такт': 'The third clock',
  'Десятый такт': 'The tenth clock',
  'Наибольшее число': 'The largest number',
  Переполнение: 'Overflow',
  'Счёт идёт дальше': 'Counting goes on',
  'Нужен один блок из группы «Память»: «Счётчик». Он уже на 4 бита.':
    'You need one block from the "Memory" group: "Counter". It is already 4 bits.',
  'Включи в его параметрах «Синхронное обнуление CLR». Вход clk идёт на CLK, вход reset — на CLR.':
    'In its parameters turn on "Synchronous clear CLR". The input clk goes to CLK, the input reset to CLR.',
  'Выход Q блока соедини с выходом y.': "Connect the block's output Q to the output y.",
  'Счётчик с паузой': 'A counter with pause',
  'Разрешение счёта': 'Count enable',
  'Иногда счётчик нужно остановить, не выключая такт: например, пока нажата кнопка «пауза». Для этого у блока есть необязательный вход **EN** (от англ. enable — «разрешить»). Включается он в параметрах блока галочкой «Разрешение счёта EN».\n\n- EN = 1 — на каждом фронте число растёт.\n- EN = 0 — на фронте число **остаётся прежним**.':
    'Sometimes a counter must be stopped without turning off the clock: for example, while the "pause" button is pressed. For this the block has an optional input **EN** (enable). It is turned on in the block\'s parameters with the "Count enable EN" checkbox.\n\n- EN = 1: on every edge the number grows.\n- EN = 0: on the edge the number **stays the same**.',
  'Пауза — это не сброс': 'A pause is not a reset',
  'Когда EN равен 0, счётчик не обнуляется: он **помнит** число и ждёт. Как только EN снова станет 1, счёт продолжится с того же места. Проверка в задании как раз смотрит, что значение во время паузы не меняется и не теряется.':
    'When EN is 0, the counter does not clear: it **remembers** the number and waits. As soon as EN becomes 1 again, counting continues from the same place. The check in the task looks exactly at whether the value during the pause does not change and is not lost.',
  'EN = 0 в течение трёх тактов, потом EN = 1. Что произойдёт со счётчиком?':
    'EN = 0 for three clocks, then EN = 1. What will happen to the counter?',
  'Он обнулится и начнёт счёт с нуля': 'It will clear and start counting from zero',
  'Он продолжит счёт с того числа, на котором остановился':
    'It will continue counting from the number at which it stopped',
  'Он пропустит три числа': 'It will skip three numbers',
  'Пауза только запрещает изменение. Число хранится в триггерах, и после снятия паузы счёт идёт дальше.':
    'A pause only forbids a change. The number is stored in flip-flops, and after the pause is lifted, counting goes on.',
  'Собери счётчик, который считает фронты clk только пока вход en равен 1. При en = 0 выход y не меняется. Вход reset обнуляет счётчик.':
    'Build a counter that counts edges of clk only while the input en is 1. With en = 0 the output y does not change. The input reset clears the counter.',
  'Счёт идёт': 'Counting goes',
  'Пауза: значение держится': 'Pause: the value holds',
  'Пауза продолжается': 'The pause continues',
  'Разрешили: счёт продолжился': 'Enabled: counting continued',
  'Считает дальше': 'Counts on',
  'Вторая пауза': 'The second pause',
  'Пауза всё ещё держит': 'The pause still holds',
  'Снова считает': 'Counts again',
  'Конец проверки': 'End of the check',
  'Выбери блок «Счётчик» и включи в его параметрах «Разрешение счёта EN» и «Синхронное обнуление CLR».':
    'Choose the "Counter" block and in its parameters turn on "Count enable EN" and "Synchronous clear CLR".',
  'Вход en соедини с контактом EN, вход reset — с контактом CLR.':
    'Connect the input en to the pin EN, the input reset to the pin CLR.',
  'Такт clk идёт на CLK, выход Q — на y.': 'The clock clk goes to CLK, the output Q to y.',
  'Счётчик со сбросом': 'A counter with reset',
  'Сброс в ноль': 'Reset to zero',
  '**Сброс** возвращает счётчик в 0. У блока для этого есть вход **CLR** (включается галочкой «Синхронное обнуление CLR»). Слово «синхронное» значит: сброс срабатывает не сразу, а на ближайшем фронте такта, как и всё остальное.\n\nВ учебных схемах вход сброса называют **reset**. В начале каждой проверки reset держится равным 1 первые два такта: в настоящей плате состояние при включении может быть любым, и сброс приводит его к известному. Потом reset падает в 0, и счёт идёт.':
    'A **reset** returns the counter to 0. For this the block has an input **CLR** (turned on with the "Synchronous clear CLR" checkbox). The word "synchronous" means: the reset acts not at once but on the nearest clock edge, like everything else.\n\nIn teaching circuits the reset input is called **reset**. At the start of each check reset is held at 1 for the first two clocks: on a real board the state at power-on can be anything, and the reset brings it to a known one. Then reset drops to 0, and counting goes.',
  'Что сильнее: сброс или пауза': 'What is stronger: reset or pause',
  'Если одновременно reset = 1 и en = 0, должен победить **сброс**: его цель — привести схему в известное состояние при любых условиях. В блоке «Счётчик» это уже так: CLR важнее EN.\n\nПроверка в задании специально сбрасывает счётчик посреди счёта и один раз делает это во время паузы.':
    'If reset = 1 and en = 0 at the same time, **reset** must win: its purpose is to bring the circuit to a known state under any conditions. In the "Counter" block this is already so: CLR is more important than EN.\n\nThe check in the task deliberately resets the counter in the middle of counting and once does so during a pause.',
  'reset = 1 и en = 0 на одном и том же фронте. Каким станет счётчик?':
    'reset = 1 and en = 0 on the same edge. What will the counter become?',
  'Прежним: пауза запретила изменения': 'The same: the pause forbade changes',
  '0: сброс важнее паузы': '0: reset is more important than pause',
  'Увеличится на 1': 'It will increase by 1',
  'Сброс должен работать всегда, иначе схему нельзя надёжно вернуть в начальное состояние.':
    'The reset must always work, otherwise the circuit cannot be reliably returned to its initial state.',
  'Собери счётчик с паузой en и сбросом reset. При reset = 1 выход y становится 0, даже если счёт на паузе.':
    'Build a counter with pause en and reset reset. With reset = 1 the output y becomes 0 even if the count is paused.',
  'Первый шаг счёта': 'The first counting step',
  'Сброс посреди счёта': 'Reset in the middle of counting',
  'Счёт начался заново': 'Counting started anew',
  'Пауза держит значение': 'The pause holds the value',
  'Сброс сильнее паузы': 'Reset is stronger than pause',
  'Пауза после сброса': 'A pause after reset',
  'Счёт после паузы': 'Counting after the pause',
  'В параметрах блока «Счётчик» включи и разрешение EN, и синхронное обнуление CLR.':
    'In the parameters of the "Counter" block turn on both the EN enable and the synchronous clear CLR.',
  'reset соедини с контактом CLR, en — с контактом EN.':
    'Connect reset to the pin CLR, en to the pin EN.',
  'Счётчик с загрузкой': 'A counter with load',
  'Начать с нужного числа': 'Starting from the needed number',
  'Иногда счёт должен начаться не с нуля, а с заданного числа, например с 10. Для этого у блока есть **параллельная загрузка**: галочка «Параллельная загрузка LOAD/D» добавляет два контакта.\n\n- **D** — число, которое нужно загрузить (4 бита).\n- **LOAD** — команда: если на фронте LOAD = 1, счётчик берёт число с D вместо того, чтобы прибавлять единицу.\n\n«Параллельная» значит, что все 4 бита записываются сразу, за один такт.':
    'Sometimes counting must start not from zero but from a given number, for example 10. For this the block has a **parallel load**: the "Parallel load LOAD/D" checkbox adds two pins.\n\n- **D** is the number to load (4 bits).\n- **LOAD** is the command: if on the edge LOAD = 1, the counter takes the number from D instead of adding one.\n\n"Parallel" means that all 4 bits are written at once, in one clock.',
  'Как расставлены приоритеты': 'How the priorities are arranged',
  'Если LOAD = 0, счётчик считает как обычно, даже когда на D что-то подано: число с D нужно только в момент загрузки. Если одновременно reset = 1 и LOAD = 1, побеждает **сброс**: порядок такой — сначала сброс, потом загрузка, потом счёт.\n\nВ задании D — четырёхбитная шина. Чтобы поставить на вход шину нужной ширины, зададим входу ширину 4 в конструкторе; значения на проверке записаны обычными десятичными числами.':
    "If LOAD = 0, the counter counts as usual even when something is applied to D: the number from D is needed only at the moment of loading. If reset = 1 and LOAD = 1 at the same time, **reset** wins: the order is reset first, then load, then counting.\n\nIn the task D is a four-bit bus. To place a bus of the needed width on an input, set the input's width to 4 in the editor; the values in the check are written as ordinary decimal numbers.",
  'LOAD = 0, на D подано число 10. Что делает счётчик на фронте?':
    'LOAD = 0, the number 10 is applied to D. What does the counter do on the edge?',
  'Загружает 10': 'Loads 10',
  'Считает как обычно: D не используется без LOAD': 'Counts as usual: D is not used without LOAD',
  'Ждёт, пока LOAD станет 1': 'Waits until LOAD becomes 1',
  'D читается только когда LOAD = 1. Иначе счётчик просто прибавляет единицу.':
    'D is read only when LOAD = 1. Otherwise the counter simply adds one.',
  'Собери счётчик с сбросом reset и загрузкой: если load = 1, на фронте y становится равным d; иначе счёт идёт вверх. Сброс важнее загрузки.':
    'Build a counter with reset reset and load: if load = 1, on the edge y becomes equal to d; otherwise counting goes up. Reset is more important than load.',
  'Обычный счёт': 'Ordinary counting',
  'Загрузка числа 10': 'Loading the number 10',
  'Счёт после загрузки': 'Counting after the load',
  'Сброс сильнее загрузки': 'Reset is stronger than load',
  'Счёт после сброса': 'Counting after reset',
  'Загрузка числа 15': 'Loading the number 15',
  'Переполнение после загрузки': 'Overflow after the load',
  'Включи в блоке «Счётчик» синхронное обнуление CLR и параллельную загрузку LOAD/D.':
    'In the "Counter" block turn on the synchronous clear CLR and the parallel load LOAD/D.',
  'reset → CLR, load → LOAD, шина d → D.': 'reset → CLR, load → LOAD, bus d → D.',
  'Считаем от 0 до 5': 'Counting from 0 to 5',
  'Круг короче шестнадцати': 'A circle shorter than sixteen',
  'Обычный 4-битный счётчик считает до 15. А часто нужен круг покороче: например, шесть положений переключателя, 0…5. Такой счётчик называют счётчиком **по модулю 6** (модуль — длина круга).\n\nИдея: пусть счётчик считает как обычно, но когда он дошёл до **5**, на следующем такте его надо **сбросить** в 0. Значит, нужна схема, которая замечает число 5.':
    'An ordinary 4-bit counter counts to 15. But often a shorter circle is needed: for example, six positions of a switch, 0…5. Such a counter is called a **modulo-6** counter (the modulus is the length of the circle).\n\nThe idea: let the counter count as usual, but when it reaches **5**, on the next clock it must be **reset** to 0. So you need a circuit that notices the number 5.',
  'Сравнение и сброс': 'Comparison and reset',
  'Заметить число поможет блок «Равно (A = B)»: на вход A подаём выход счётчика, на вход B — константу 5. Выход EQ равен 1 только когда Q = 5. Этот сигнал подаём на синхронное обнуление CLR счётчика.\n\nНо у схемы остаётся и внешний сброс reset. Оба сигнала должны уметь обнулить счётчик, поэтому их объединяет элемент **ИЛИ**: сбросить нужно, если reset = 1 **или** Q = 5.':
    'The "Equal (A = B)" block will help notice a number: feed the counter\'s output to the input A, and the constant 5 to the input B. The EQ output is 1 only when Q = 5. We feed this signal to the synchronous clear CLR of the counter.\n\nBut the circuit also keeps the external reset. Both signals must be able to clear the counter, so an **OR** gate joins them: it must reset if reset = 1 **or** Q = 5.',
  'Почему счётчик по модулю 6 сбрасывают, когда Q = 5, а не когда Q = 6?':
    'Why is a modulo-6 counter reset when Q = 5, and not when Q = 6?',
  'Сброс срабатывает на следующем фронте, поэтому после 5 сразу будет 0':
    'The reset acts on the next edge, so right after 5 there will be 0',
  'Число 6 нельзя записать в четыре бита': 'The number 6 cannot be written in four bits',
  'Это одно и то же': 'It is the same thing',
  'Синхронный сброс действует на ближайшем фронте. Если ждать Q = 6, то число 6 успеет показаться на выходе, и круг получится из семи чисел.':
    'A synchronous reset acts on the nearest edge. If you wait for Q = 6, the number 6 will manage to show on the output, and the circle will be seven numbers.',
  'Собери счётчик, который считает 0, 1, 2, 3, 4, 5 и снова 0. Используй блок «Счётчик», «Равно» и константу 5. Внешний вход reset тоже должен обнулять счёт.':
    'Build a counter that counts 0, 1, 2, 3, 4, 5 and 0 again. Use the "Counter" block, "Equal" and the constant 5. The external input reset must also clear the count.',
  'Первый шаг': 'First step',
  'Досчитал до 5': 'Counted up to 5',
  'После пяти сразу ноль': 'After five, zero at once',
  'Новый круг': 'A new round',
  'Второй круг': 'The second round',
  'Сброс посреди круга': 'Reset in the middle of a round',
  'Опять 5': '5 again',
  'Опять ноль': 'Zero again',
  'Нужны: счётчик с включённым CLR, константа 5 (4 бита), блок «Равно (A = B)» и элемент ИЛИ.':
    'You need: a counter with CLR turned on, a constant 5 (4 bits), an "Equal (A = B)" block and an OR gate.',
  'Сравни Q с константой 5. Результат сравнения и reset подай на ИЛИ.':
    'Compare Q with the constant 5. Feed the comparison result and reset to the OR.',
  'Выход ИЛИ соедини с CLR счётчика. Q идёт и на сравнение, и на выход y.':
    "Connect the OR's output to the counter's CLR. Q goes both to the comparison and to the output y.",
  'Счётчик из регистра и «+1»': 'A counter from a register and "+1"',
  'Как устроен счётчик внутри': 'How a counter is built inside',
  'Блок «Счётчик» удобен, но интересно, из чего он сделан. Счётчик состоит из двух частей:\n\n- **регистр** хранит текущее число и обновляется на каждом фронте;\n- схема **«+1»** берёт число из регистра и выдаёт число на единицу больше.\n\nВыход схемы «+1» подаётся обратно на вход регистра. На каждом фронте регистр записывает «себя плюс один». Получается петля: регистр → «+1» → регистр.':
    'The "Counter" block is convenient, but it is interesting what it is made of. A counter consists of two parts:\n\n- a **register** stores the current number and is updated on every edge;\n- a **"+1"** circuit takes the number from the register and outputs a number one greater.\n\nThe output of the "+1" circuit is fed back to the register\'s input. On every edge the register writes "itself plus one". The result is a loop: register → "+1" → register.',
  'Зачем сброс': 'Why a reset',
  'Блок «Регистр» в библиотеке 8-битный; в задании нужны 4 бита, поэтому ширину поставь в параметрах. У регистра есть вход **RST** — синхронный сброс: при RST = 1 на фронте в регистр записывается 0.\n\nЭтот сброс здесь **обязателен**: регистр сразу после включения хранит неизвестное значение, и «+1» от неизвестного даёт неизвестное. Пока reset не обнулил регистр, выход не определён; после — всё идёт по порядку.':
    'The "Register" block in the library is 8-bit; the task needs 4 bits, so set the width in the parameters. The register has an input **RST**, a synchronous reset: with RST = 1 on the edge 0 is written into the register.\n\nThis reset is **mandatory** here: right after power-on the register holds an unknown value, and "+1" of an unknown gives an unknown. Until reset clears the register, the output is undefined; after that everything goes in order.',
  'Что подаётся на вход D регистра в схеме счётчика?':
    'What is fed to the D input of the register in a counter circuit?',
  'Выход схемы «+1», в которую входит выход регистра':
    'The output of the "+1" circuit, which takes the register\'s output',
  'Константа 1': 'The constant 1',
  'Вход такта': 'The clock input',
  'На каждом фронте регистр запоминает «старое значение плюс один». Это и есть счёт.':
    'On every edge the register remembers "the old value plus one". That is the counting.',
  'Собери 4-битный счётчик из блока «Регистр» и блока «Прибавить 1». Вход reset обнуляет регистр.':
    'Build a 4-bit counter from a "Register" block and an "Add 1" block. The input reset clears the register.',
  'Счёт после круга': 'Counting after a round',
  'Счёт заново': 'Counting anew',
  'Нужны два блока: «Регистр» (поставь ширину 4) и «Прибавить 1» (тоже 4 бита).':
    'You need two blocks: "Register" (set width 4) and "Add 1" (also 4 bits).',
  'Выход Q регистра идёт в «Прибавить 1», а результат возвращается на вход D регистра.':
    'The register\'s output Q goes to "Add 1", and the result returns to the register\'s input D.',
  'clk → CLK регистра, reset → RST регистра, Q → y.':
    "clk → the register's CLK, reset → the register's RST, Q → y.",
  'Делитель частоты на 2': 'A divide-by-2 frequency divider',
  'T-триггер': 'T flip-flop',
  '**T-триггер** — самая простая схема памяти для деления. Он хранит один бит и на каждом фронте такта **переворачивает** его, если вход T равен 1: 0 становится 1, а 1 становится 0.\n\nЕсли держать T = 1 всё время, выход Q будет меняться на каждом такте: 1, 0, 1, 0… Один полный период выхода (0 → 1 → 0) занимает два такта. Значит, частота на выходе **вдвое меньше**, чем у такта: схема стала **делителем частоты на 2**.':
    'A **T flip-flop** is the simplest memory circuit for dividing. It stores one bit and on every clock edge **flips** it if the input T is 1: 0 becomes 1, and 1 becomes 0.\n\nIf you hold T = 1 all the time, the output Q will change on every clock: 1, 0, 1, 0… One full period of the output (0 → 1 → 0) takes two clocks. So the output frequency is **half** that of the clock: the circuit has become a **divide-by-2 frequency divider**.',
  'Управляем делителем': 'Controlling the divider',
  'Вход T можно подключить и к обычному сигналу. Тогда триггер переворачивается только пока этот сигнал равен 1, а при 0 — **держит** значение. В задании ты подключишь к T вход en: это и пауза, и включение делителя.\n\nВ библиотеке блок называется «T-триггер», а контакт такта у него **CLK**. Чтобы триггер сначала стал нулём, у него есть необязательный вход сброса **ACLR** (включается в параметрах): единица на нём обнуляет триггер сразу, не ожидая такта. Это **асинхронный** сброс.':
    'The input T can also be connected to an ordinary signal. Then the flip-flop flips only while this signal is 1, and with 0 it **holds** the value. In the task you will connect the input en to T: it is both a pause and an enable of the divider.\n\nIn the library the block is called "T flip-flop", and its clock pin is **CLK**. To make the flip-flop start at zero, it has an optional reset input **ACLR** (turned on in the parameters): a one on it clears the flip-flop at once, without waiting for the clock. This is an **asynchronous** reset.',
  'T-триггер с T = 1 получает такт 100 Гц. Какая частота на его выходе?':
    'A T flip-flop with T = 1 receives a 100 Hz clock. What is the frequency on its output?',
  '200 Гц': '200 Hz',
  '100 Гц': '100 Hz',
  '50 Гц': '50 Hz',
  'Выход меняется на каждом фронте, а полный период — это два изменения. Поэтому частота вдвое меньше: 50 Гц.':
    'The output changes on every edge, and a full period is two changes. So the frequency is half: 50 Hz.',
  'Собери делитель на 2 из T-триггера: пока en = 1, выход y переворачивается на каждом такте, при en = 0 значение сохраняется. Вход reset обнуляет триггер.':
    'Build a divide-by-2 from a T flip-flop: while en = 1, the output y flips on every clock, with en = 0 the value is kept. The input reset clears the flip-flop.',
  'Второй такт': 'The second clock',
  'Пауза: держит единицу': 'Pause: holds the one',
  'Снова переворачивается': 'Flips again',
  'Ещё раз': 'Once more',
  'Нужен один блок «T-триггер» из группы «Память»; включи в нём асинхронный сброс ACLR.':
    'You need one "T flip-flop" block from the "Memory" group; turn on the asynchronous reset ACLR in it.',
  'Вход en соедини с контактом T, такт clk — с CLK, а reset — с ACLR.':
    'Connect the input en to the pin T, the clock clk to CLK, and reset to ACLR.',
  'Выход Q триггера соедини с y.': "Connect the flip-flop's output Q to y.",
  'Делитель на 4 из счётчика': 'A divide-by-4 from a counter',
  'Каждый бит счётчика — делитель': 'Every counter bit is a divider',
  'Посмотри, как меняются биты 4-битного счётчика:\n\n- **бит 0** меняется на каждом такте: частота делится на 2;\n- **бит 1** меняется вдвое реже: делится на 4;\n- **бит 2** делится на 8, **бит 3** — на 16.\n\nЗначит, чтобы получить частоту в четыре раза меньше, берём из счётчика **бит 1**. Один блок «Счётчик» даёт сразу все делители, степени двойки.':
    'Look at how the bits of a 4-bit counter change:\n\n- **bit 0** changes on every clock: the frequency is divided by 2;\n- **bit 1** changes half as often: divided by 4;\n- **bit 2** divides by 8, **bit 3** by 16.\n\nSo to get a frequency four times lower, we take **bit 1** from the counter. One "Counter" block gives all the dividers at once, the powers of two.',
  'Как достать один бит': 'How to take out one bit',
  'Выход Q — шина из четырёх проводов. Чтобы взять один бит, используй блок **«Срез шины»** из группы «Шины»: в параметрах укажи ширину входа 4, младший бит 1 и старший бит 1. На выходе будет один провод — бит 1.\n\nСброс reset обнуляет счётчик, а значит, возвращает и фазу делителя: после сброса выход начинает с 0 и отсчитывает период заново.':
    'The output Q is a bus of four wires. To take one bit, use the **"Bus slice"** block from the "Buses" group: in the parameters give the input width 4, low bit 1 and high bit 1. The output will be one wire, bit 1.\n\nThe reset clears the counter, and so also returns the divider\'s phase: after reset the output starts from 0 and counts the period anew.',
  'Какой бит счётчика даёт частоту в 8 раз меньше частоты такта?':
    'Which counter bit gives a frequency 8 times lower than the clock frequency?',
  'Бит 1': 'Bit 1',
  'Бит 2': 'Bit 2',
  'Бит 3': 'Bit 3',
  'Бит 0 делит на 2, бит 1 — на 4, бит 2 — на 8. Каждый следующий бит вдвое медленнее предыдущего.':
    'Bit 0 divides by 2, bit 1 by 4, bit 2 by 8. Each next bit is half as fast as the previous one.',
  'Собери делитель частоты на 4: выход y — один бит счётчика, который меняется раз в два такта. Вход reset обнуляет счётчик.':
    'Build a divide-by-4 frequency divider: the output y is one bit of the counter that changes once every two clocks. The input reset clears the counter.',
  'Счёт 1: бит 0': 'Count 1: bit 0',
  'Счёт 2: бит 1 = 1': 'Count 2: bit 1 = 1',
  'Счёт 3': 'Count 3',
  'Счёт 4: бит 1 = 0': 'Count 4: bit 1 = 0',
  'Счёт 5': 'Count 5',
  'Счёт 6: бит 1 = 1': 'Count 6: bit 1 = 1',
  'Счёт 7': 'Count 7',
  'Сброс посреди периода': 'Reset in the middle of a period',
  'Счёт 1 после сброса': 'Count 1 after reset',
  'Счёт 2 после сброса': 'Count 2 after reset',
  'Счёт 4 после сброса': 'Count 4 after reset',
  'Нужен счётчик с синхронным обнулением CLR (reset идёт на него) и блок «Срез шины».':
    'You need a counter with synchronous clear CLR (reset goes to it) and a "Bus slice" block.',
  'Срез: ширина входа 4, младший бит 1, старший бит 1.':
    'The slice: input width 4, low bit 1, high bit 1.',
  'cnt.Q → вход среза, выход среза → y.': "cnt.Q → the slice's input, the slice's output → y.",
  'Импульс на последнем числе': 'A pulse on the last number',
  'Сигнал «счёт закончился»': 'The "counting is finished" signal',
  'Часто нужен короткий сигнал **«круг закончился»**: например, чтобы раз в 16 тактов запустить что-то ещё. Для 4-битного счётчика последнее число — 15. Нужна схема, которая выдаёт 1 только когда Q = 15, а в остальное время 0.\n\nЭто делает блок «Равно (A = B)»: на вход A подаём Q, на вход B — константу 15 (с шириной 4 бита). Выход EQ и есть наш сигнал.':
    'Often a short **"round finished"** signal is needed: for example, to start something else once every 16 clocks. For a 4-bit counter the last number is 15. You need a circuit that outputs 1 only when Q = 15, and 0 at other times.\n\nThis is done by the "Equal (A = B)" block: feed Q to the input A and the constant 15 (4 bits wide) to the input B. The EQ output is our signal.',
  'Импульс не зависит от такта напрямую': 'The pulse does not depend directly on the clock',
  'Сигнал EQ вычисляется из Q «на лету»: он появляется, как только Q стал 15, и пропадает, как только Q сменился. Это **один такт** единицы за круг из 16.\n\nПри сбросе счёт начинается заново, поэтому и импульс сдвигается: он будет через 15 тактов после снятия сброса, а не там, где был раньше. Проверка проверяет и это.':
    'The EQ signal is computed from Q "on the fly": it appears as soon as Q becomes 15 and disappears as soon as Q changes. This is **one clock** of one per round of 16.\n\nOn reset counting starts anew, so the pulse also shifts: it will come 15 clocks after reset is released, not where it was before. The check verifies this too.',
  'Как часто выдаёт импульс сравнение «Q = 15» у 4-битного счётчика, если сброса нет?':
    'How often does the comparison "Q = 15" give a pulse for a 4-bit counter if there is no reset?',
  'Раз в 15 тактов': 'Once every 15 clocks',
  'Раз в 16 тактов': 'Once every 16 clocks',
  'Постоянно равен 1 после первого круга': 'It is constantly 1 after the first round',
  'В круге 16 различных значений: 0…15. Число 15 встречается один раз за круг, значит, импульс бывает раз в 16 тактов.':
    'There are 16 different values in a round: 0…15. The number 15 occurs once per round, so the pulse occurs once every 16 clocks.',
  'Собери схему, в которой y равен 1 ровно в тот такт, когда счётчик показывает 15, и 0 в остальное время. Вход reset обнуляет счётчик.':
    'Build a circuit in which y is 1 in exactly the clock when the counter shows 15, and 0 at other times. The input reset clears the counter.',
  'Счётчик показывает 14': 'The counter shows 14',
  'Счётчик показывает 15: импульс': 'The counter shows 15: a pulse',
  'Импульс закончился': 'The pulse is over',
  'После сброса импульса ещё нет': 'After reset there is no pulse yet',
  'Новый импульс': 'A new pulse',
  'Нужны счётчик (reset на CLR), константа 15 шириной 4 бита и блок «Равно (A = B)».':
    'You need a counter (reset to CLR), a constant 15 of width 4 bits and an "Equal (A = B)" block.',
  'Q соедини со входом A сравнения, константу — со входом B.':
    "Connect Q to the comparison's input A, the constant to the input B.",
  'Выход EQ сравнения соедини с y.': "Connect the comparison's EQ output to y.",
  'такт  d  Q (после фронта)\n  2   1   0001\n  3   0   0010\n  4   1   0101\n  5   1   1011':
    'clock  d  Q (after the edge)\n  2    1   0001\n  3    0   0010\n  4    1   0101\n  5    1   1011',
  'такт  d  Q (после фронта)\n  2   1   1000\n  3   1   1100\n  4   0   0110\n  5   1   1011':
    'clock  d  Q (after the edge)\n  2    1   1000\n  3    1   1100\n  4    0   0110\n  5    1   1011',
  'такт     2  3  4  5  6\nd        1  0  0  0  0\nSO       0  0  0  1  0':
    'clock    2  3  4  5  6\nd        1  0  0  0  0\nSO       0  0  0  1  0',
  'такт  en d  Q\n  2   1  1  0001\n  3   1  0  0010\n  4   1  1  0101\n  5   1  1  1011   <- слово 1011\n  6   0  1  1011   (пауза, d игнорируется)':
    'clock  en d  Q\n  2    1  1  0001\n  3    1  0  0010\n  4    1  1  0101\n  5    1  1  1011   <- the word 1011\n  6    0  1  1011   (pause, d is ignored)',
  'такт  load  Q (после фронта)  SO\n  2     1    1011              1\n  3     0    0110              0\n  4     0    1100              1\n  5     0    1000              1\n  6     0    0000              0':
    'clock  load  Q (after the edge)  SO\n  2     1    1011                1\n  3     0    0110                0\n  4     0    1100                1\n  5     0    1000                1\n  6     0    0000                0',
  'такт  load  Q\n  2     1   1001\n  3     0   0011\n  4     0   0110\n  5     0   1100\n  6     0   1001   <- вернулся':
    'clock  load  Q\n  2     1   1001\n  3     0   0011\n  4     0   0110\n  5     0   1100\n  6     0   1001   <- came back',
  'такт  Q\n 0-1  0001  (сброс)\n  2   0010\n  3   0100\n  4   1000\n  5   0001':
    'clock  Q\n 0-1  0001  (reset)\n  2   0010\n  3   0100\n  4   1000\n  5   0001',
  'такт  Q\n  1   0000   (сброс)\n  2   0001\n  3   0011\n  4   0111\n  5   1111\n  6   1110\n  7   1100\n  8   1000\n  9   0000   <- круг':
    'clock  Q\n  1   0000   (reset)\n  2   0001\n  3   0011\n  4   0111\n  5   1111\n  6   1110\n  7   1100\n  8   1000\n  9   0000   <- the circle',
  'такт  Q\n  1   0001   (сброс)\n  2   0010\n  3   0100\n  4   1001   <- 1 xor 0 = 1 входит справа\n  5   0011\n  6   0110\n  7   1101\n  8   1010':
    'clock  Q\n  1   0001   (reset)\n  2   0010\n  3   0100\n  4   1001   <- 1 xor 0 = 1 enters on the right\n  5   0011\n  6   0110\n  7   1101\n  8   1010',
  'Сдвиговый регистр блоком': 'A shift register as a block',
  'Цепочка триггеров': 'A chain of flip-flops',
  '**Триггер** запоминает один бит. Если выход одного триггера подать на вход следующего, а такт (**clk**, сигнал-метроном) подать на все сразу, получится **сдвиговый регистр**: на каждом такте каждый бит переходит на соседний триггер, а в начало входит новый бит.\n\nВ конструкторе вся цепочка есть готовым блоком **«Сдвиговый регистр»**. У него вход `SI` (новый бит), вход `CLK` (такт) и выход `Q`, на котором видны сразу все биты, например четыре.':
    'A **flip-flop** remembers one bit. If the output of one flip-flop is fed to the input of the next, and the clock (**clk**, the metronome signal) is fed to all of them at once, you get a **shift register**: on each clock every bit moves to the neighboring flip-flop, and a new bit enters at the start.\n\nIn the editor the whole chain is available as a ready-made **"Shift register"** block. It has an input `SI` (the new bit), an input `CLK` (the clock) and an output `Q`, on which all bits are visible at once, for example four.',
  'Как бит едет по регистру': 'How a bit travels through the register',
  'Пусть регистр на 4 бита сдвигает **влево**: новый бит входит справа, в младший разряд, а остальные биты уезжают на одну позицию к старшему. Старший бит выпадает из регистра.\n\nНа каждом такте до фронта сигнал `SI` стоит неизменным, поэтому в регистр попадает то значение, которое было на входе в этот такт.\n\nВ уроке есть и вход **reset**: его подают на асинхронный сброс `ACLR` блока (включается параметром «Асинхронный сброс ACLR»). Пока reset равен 1, в регистре 0000.':
    'Let a 4-bit register shift **left**: the new bit enters on the right, into the low place, and the other bits move one position toward the high end. The high bit falls out of the register.\n\nOn each clock before the edge the signal `SI` stands unchanged, so the value that was on the input during that clock gets into the register.\n\nThe lesson also has an input **reset**: it goes to the asynchronous clear `ACLR` of the block (turned on with the "Asynchronous clear ACLR" parameter). While reset is 1, the register holds 0000.',
  'В регистре 0101, сдвиг влево, на входе SI стоит 1. Что будет после такта?':
    'The register holds 0101, shift left, the input SI is 1. What will it be after a clock?',
  'Все биты сдвигаются влево: 0101 превращается в 101_, старший бит 0 выпадает, а на освободившееся место справа входит новый бит 1. Получается 1011.':
    'All bits shift left: 0101 turns into 101_, the high bit 0 falls out, and the new bit 1 enters into the freed place on the right. The result is 1011.',
  'Собери регистр на 4 бита: вход d идёт в SI, такт clk в CLK, reset в ACLR, а все четыре бита Q выведи на y.':
    'Build a 4-bit register: the input d goes to SI, the clock clk to CLK, reset to ACLR, and bring out all four bits of Q to y.',
  'Сброс: регистр пуст': 'Reset: the register is empty',
  'Первая единица входит справа': 'The first one enters on the right',
  'Она сдвинулась влево': 'It shifted left',
  'Вошла вторая единица': 'The second one entered',
  'Регистр полон': 'The register is full',
  'Старшая единица выпала': 'The high one fell out',
  'Ещё один сдвиг': 'One more shift',
  'Нужен один блок «Сдвиговый регистр» из группы памяти. В его параметрах поставь ширину 4 и включи асинхронный сброс.':
    'You need one "Shift register" block from the memory group. In its parameters set the width to 4 and turn on the asynchronous reset.',
  'У блока появится вход ACLR: подключи к нему reset. Вход d соедини с SI, clk с CLK.':
    'The block gets an ACLR input: connect reset to it. Connect the input d to SI, clk to CLK.',
  'Выход Q блока соедини с y: так наружу выйдут сразу все четыре бита.':
    "Connect the block's output Q to y: this way all four bits go out at once.",
  'Последовательный ввод': 'Serial input',
  'Бит за битом по одному проводу': 'Bit by bit over one wire',
  'Слово из нескольких бит можно передать по одному проводу, если отправлять биты **по очереди**, по одному на такт. Это **последовательная** передача, в отличие от **параллельной**, где на каждый бит свой провод. Один провод дешевле: поэтому по нему ходят данные UART, SPI и многие другие.\n\nСдвиговый регистр умеет принимать такой поток: каждый такт он забирает бит со входа и сдвигает всё остальное.':
    'A word of several bits can be sent over one wire if the bits are sent **in turn**, one per clock. This is **serial** transmission, as opposed to **parallel**, where each bit has its own wire. One wire is cheaper: that is why UART, SPI and many other data go over it.\n\nA shift register can receive such a stream: on each clock it takes a bit from the input and shifts everything else.',
  'Сдвиг вправо': 'Shift right',
  'Регистр можно сдвигать и **вправо**: тогда новый бит входит слева, в **старший** разряд, а младший бит выпадает. В блоке направление выбирается параметром «Направление сдвига».\n\nПри сдвиге вправо первый пришедший бит за четыре такта доезжает до самого младшего разряда.':
    'A register can also be shifted **right**: then the new bit enters on the left, into the **high** place, and the low bit falls out. In the block the direction is chosen by the "Shift direction" parameter.\n\nWith a shift right the first arrived bit reaches the lowest place in four clocks.',
  'Регистр на 4 бита сдвигает вправо и пуст. Подряд приходят биты 1, 0, 0. Что в регистре?':
    'A 4-bit register shifts right and is empty. The bits 1, 0, 0 arrive in a row. What is in the register?',
  'Единица входит слева: 1000. Каждый следующий такт сдвигает её вправо: после первого нуля 0100, после второго 0010.':
    'The one enters on the left: 1000. Each next clock shifts it right: after the first zero 0100, after the second 0010.',
  'Собери регистр на 4 бита со сдвигом вправо. Данные приходят на d, а все четыре бита выведи на y.':
    'Build a 4-bit register with a shift right. The data arrives on d, and bring out all four bits to y.',
  'Единица входит слева': 'The one enters on the left',
  'Вторая единица слева': 'The second one on the left',
  'Ноль слева, единицы едут вправо': 'A zero on the left, the ones travel right',
  'Всё сдвинулось вправо': 'Everything shifted right',
  'Ещё один сдвиг вправо': 'One more shift right',
  'Блок тот же, что в прошлом уроке, но направление сдвига другое.':
    'The block is the same as in the previous lesson, but the shift direction is different.',
  'В параметрах блока выбери «Вправо (к младшему биту)», ширину 4 и асинхронный сброс.':
    'In the block\'s parameters choose "Right (toward the low bit)", width 4 and asynchronous reset.',
  'Соедини d с SI, clk с CLK, reset с ACLR, Q с y.':
    'Connect d to SI, clk to CLK, reset to ACLR, Q to y.',
  'Задержка сигнала на такты': 'Delaying a signal by clocks',
  'Выпавший бит': 'The bit that fell out',
  'У сдвигового регистра есть второй выход, **SO** (serial out, «последовательный выход»). На нём всегда находится бит, который стоит в самом конце цепочки: при сдвиге влево это старший бит `Q`.\n\nБит, попавший на вход, проходит всю цепочку и появляется на `SO`. Значит, регистр на 4 бита **задерживает** сигнал: на выходе то, что было на входе несколько тактов назад.':
    'A shift register has a second output, **SO** (serial out). On it there is always the bit at the very end of the chain: with a shift left this is the high bit of `Q`.\n\nA bit that gets onto the input passes the whole chain and appears on `SO`. So a 4-bit register **delays** the signal: the output is what was on the input several clocks ago.',
  'Сколько тактов задержка': 'How many clocks of delay',
  'Бит, пришедший в такте 2, запоминает первый триггер. В такте 3 его запоминает второй, в такте 4 третий, и в такте 5 он оказывается в четвёртом и виден на `SO`. Выход «отстаёт» от входа на 3 такта (а сам бит прошёл через 4 триггера).\n\nЗадержку используют, чтобы выровнять сигналы по времени или сравнить текущее значение с прошлым.':
    'A bit that arrived in clock 2 is remembered by the first flip-flop. In clock 3 it is remembered by the second, in clock 4 by the third, and in clock 5 it ends up in the fourth and is visible on `SO`. The output "lags" behind the input by 3 clocks (and the bit itself has passed through 4 flip-flops).\n\nA delay is used to align signals in time or to compare the current value with the past one.',
  'Как изменится задержка, если взять регистр на 8 бит вместо 4 и выход SO?':
    'How will the delay change if you take an 8-bit register instead of 4 and the output SO?',
  'Станет больше на 4 такта': 'It will grow by 4 clocks',
  'Не изменится': 'It will not change',
  'Станет меньше': 'It will decrease',
  'Каждый дополнительный триггер добавляет один такт задержки: бит проходит на 4 триггера больше.':
    'Each additional flip-flop adds one clock of delay: the bit passes 4 more flip-flops.',
  'Собери задержку: на выход y подай бит SO регистра на 4 бита. Одиночная единица на d должна появиться на y через 3 такта.':
    'Build a delay: feed the SO bit of a 4-bit register to the output y. A single one on d must appear on y after 3 clocks.',
  'Единица только вошла': 'The one has just entered',
  'Ещё в пути': 'Still on the way',
  'Единица дошла до выхода': 'The one reached the output',
  'Единица ушла': 'The one is gone',
  'Вошла следующая единица': 'The next one entered',
  'Вторая единица в пути': 'The second one is on the way',
  'Вторая единица на выходе': 'The second one on the output',
  'Регистр такой же, как раньше: 4 бита, сдвиг влево, асинхронный сброс.':
    'The register is the same as before: 4 bits, shift left, asynchronous reset.',
  'Выход y теперь одного бита. Возьми его не с Q, а со второго выхода блока.':
    "The output y is now one bit. Take it not from Q but from the block's second output.",
  'Соедини SO с y, d с SI, clk с CLK, reset с ACLR.':
    'Connect SO to y, d to SI, clk to CLK, reset to ACLR.',
  'Сборка слова из потока': 'Assembling a word from a stream',
  'Слово и сигнал «бит годен»': 'A word and a "bit is valid" signal',
  'Последовательный приёмник собирает слово из потока. Но поток не всегда идёт без пауз: между словами линия «молчит». Чтобы регистр не принимал мусор, нужен сигнал **разрешения** (его называют **enable**, `EN`): сдвиг происходит только в такте, где `EN = 1`.\n\nВ блоке сдвигового регистра разрешение включается параметром «Разрешение сдвига EN», после чего у блока появляется вход `EN`.':
    'A serial receiver assembles a word from a stream. But the stream does not always go without pauses: between words the line is "silent". So that the register does not accept garbage, you need an **enable** signal (`EN`): the shift happens only in a clock where `EN = 1`.\n\nIn the shift register block the enable is turned on with the "Shift enable EN" parameter, after which the block gets an input `EN`.',
  'В каком порядке приходят биты': 'In what order the bits arrive',
  'Если регистр сдвигает влево, то **первый** пришедший бит едет дальше всех и оказывается в **старшем** разряде. Значит, слово надо передавать, начиная со старшего бита. Так и принято в большинстве протоколов.\n\nПосле четырёх разрешённых тактов все четыре бита стоят в регистре, и их можно читать как число сразу на выходе `Q`. Пока `EN = 0`, регистр хранит слово и мусор на входе его не портит.':
    'If the register shifts left, then the **first** arrived bit travels furthest and ends up in the **high** place. So the word must be transmitted starting from the high bit. This is the custom in most protocols.\n\nAfter four enabled clocks all four bits stand in the register, and they can be read as a number right away on the output `Q`. While `EN = 0`, the register stores the word and garbage on the input does not spoil it.',
  'Для чего регистру нужен вход EN при приёме слова?':
    'Why does a register need the EN input when receiving a word?',
  'Чтобы сдвигать только тогда, когда пришёл настоящий бит':
    'To shift only when a real bit has arrived',
  'Чтобы регистр работал быстрее': 'To make the register work faster',
  'Чтобы выбирать направление сдвига': 'To choose the shift direction',
  'При EN = 0 регистр хранит прежнее значение, поэтому паузы и мусор на линии d не искажают уже собранное слово.':
    'With EN = 0 the register keeps its previous value, so pauses and garbage on the line d do not distort the already assembled word.',
  'Собери приёмник слова: регистр на 4 бита с разрешением EN. Выведи на y все четыре бита.':
    'Build a word receiver: a 4-bit register with enable EN. Bring out all four bits to y.',
  Сброс: 'Reset',
  'Первый бит принят': 'The first bit accepted',
  'Второй бит': 'The second bit',
  'Слово собрано: 1011': 'The word is assembled: 1011',
  'Пауза: слово хранится': 'Pause: the word is stored',
  'Мусор на d игнорируется': 'Garbage on d is ignored',
  'Следующий бит сдвигает слово': 'The next bit shifts the word',
  'Снова пауза': 'A pause again',
  'Тот же регистр на 4 бита, но с включённым параметром «Разрешение сдвига EN».':
    'The same 4-bit register, but with the "Shift enable EN" parameter turned on.',
  'Новый вход EN блока соедини с входом en схемы.':
    "Connect the block's new input EN to the circuit's input en.",
  'Остальное как в первом уроке главы: d в SI, clk в CLK, reset в ACLR, Q в y.':
    'The rest as in the first lesson of the chapter: d to SI, clk to CLK, reset to ACLR, Q to y.',
  'Загрузка и выдача по одному биту': 'Loading and outputting one bit at a time',
  'Параллельная загрузка': 'Parallel load',
  'Бывает нужно обратное: слово есть целиком, а передать его надо по одному проводу. Для этого регистру добавляют **параллельную загрузку**: в такте, где `LOAD = 1`, в регистр сразу записывается всё слово с шины `D`. Дальше `LOAD = 0`, и регистр сдвигает слово бит за битом.\n\nВ блоке это параметр «Параллельная загрузка LOAD/D»: у блока появляются входы `LOAD` и `D` (шина на 4 бита). Загрузка главнее сдвига.':
    'Sometimes the reverse is needed: the word is there in full, and it must be sent over one wire. For this the register gets a **parallel load**: in a clock where `LOAD = 1`, the whole word from the bus `D` is written into the register at once. Then `LOAD = 0`, and the register shifts the word bit by bit.\n\nIn the block this is the "Parallel load LOAD/D" parameter: the block gets inputs `LOAD` and `D` (a 4-bit bus). Load is more important than shift.',
  'Выдача на SO': 'Output on SO',
  'Пока слово сдвигается влево, на выходе `SO` по очереди появляются его биты, начиная со старшего. На вход `SI` в этой схеме подают постоянный ноль (блок «Логический 0 (GND)»): вместо выпавших битов в регистр входят нули.\n\nЗагрузим 1011:':
    'While the word shifts left, its bits appear in turn on the output `SO`, starting from the high one. On the input `SI` in this circuit a constant zero is fed (the "Logic 0 (GND)" block): zeros enter the register in place of the bits that fell out.\n\nLet us load 1011:',
  'Зачем на SI в схеме выдачи подают постоянный 0?':
    'Why is a constant 0 fed to SI in the output circuit?',
  'Чтобы вместо выпавших бит в регистр входили нули':
    'So that zeros enter the register in place of the bits that fell out',
  'Чтобы регистр сбросился': 'To make the register reset',
  'Чтобы загрузка работала быстрее': 'To make loading work faster',
  'Сдвиг всегда принимает какой-то бит на SI. Постоянный ноль гарантирует, что после выдачи слова регистр опустеет, а не наполнится случайными битами.':
    'A shift always takes some bit on SI. A constant zero guarantees that after the word is output the register becomes empty and does not fill with random bits.',
  'Собери «параллельно в последовательный»: регистр на 4 бита с загрузкой, SI подключи к логическому 0, а на y выведи бит SO.':
    'Build a "parallel to serial" converter: a 4-bit register with load, connect SI to logic 0, and output the bit SO on y.',
  'Загружено 1011: старший бит 1': 'Loaded 1011: the high bit 1',
  'Второй бит 0': 'The second bit 0',
  'Третий бит 1': 'The third bit 1',
  'Четвёртый бит 1': 'The fourth bit 1',
  'Слово кончилось, пошли нули': 'The word is over, zeros follow',
  'Загружено 0110: старший бит 0': 'Loaded 0110: the high bit 0',
  'Второй бит 1': 'The second bit 1',
  'В параметрах регистра включи «Параллельная загрузка LOAD/D» и асинхронный сброс.':
    'In the register\'s parameters turn on "Parallel load LOAD/D" and asynchronous reset.',
  'Блок «Логический 0 (GND)» из группы «Ввод-вывод» даёт постоянный ноль для SI.':
    'The "Logic 0 (GND)" block from the "Input-output" group gives a constant zero for SI.',
  'load соедини с LOAD, шину d с D, clk с CLK, reset с ACLR, а SO с y.':
    'Connect load to LOAD, bus d to D, clk to CLK, reset to ACLR, and SO to y.',
  'Циклический сдвиг': 'Circular shift',
  'Выпавший бит возвращается': 'The bit that fell out returns',
  'Обычный сдвиг теряет бит, который выпал из регистра. А если вернуть его на вход? Соединим `SO` с `SI`: бит, вышедший из старшего разряда, тут же входит в младший. Биты ходят по кругу и не теряются. Это **циклический сдвиг** (вращение).\n\nТакая цепочка называется **обратной связью**: выход регистра снова подаётся на его вход.':
    "An ordinary shift loses the bit that fell out of the register. What if we return it to the input? Let us connect `SO` to `SI`: the bit leaving the high place immediately enters the low one. The bits go around in a circle and are not lost. This is a **circular shift** (rotation).\n\nSuch a chain is called **feedback**: the register's output is fed back to its input.",
  'Узор крутится': 'The pattern spins',
  'Сначала в регистр надо записать узор. Для этого у регистра есть загрузка `LOAD`/`D`. Загрузим 1001 и отпустим `LOAD`: узор будет бегать по кругу, возвращаясь к исходному значению через четыре такта.':
    'First a pattern must be written into the register. For this the register has the load `LOAD`/`D`. Let us load 1001 and release `LOAD`: the pattern will run in a circle, returning to the original value after four clocks.',
  'Как после четырёх тактов циклического сдвига выглядит регистр на 4 бита?':
    'What does a 4-bit register look like after four clocks of circular shift?',
  'Как в начале': 'As at the start',
  'Заполнен нулями': 'Filled with zeros',
  'Заполнен единицами': 'Filled with ones',
  'Каждый бит за четыре такта проходит по всем четырём позициям и возвращается на своё место: ничего не теряется.':
    'Each bit in four clocks passes through all four positions and returns to its place: nothing is lost.',
  'Собери вращающийся регистр на 4 бита с загрузкой: SO подключи к SI, а все биты Q выведи на y.':
    'Build a rotating 4-bit register with load: connect SO to SI, and bring out all bits of Q to y.',
  'Узор загружен': 'The pattern is loaded',
  'Старшая единица вернулась справа': 'The high one returned on the right',
  'Узор едет влево': 'The pattern moves left',
  'Ещё сдвиг': 'One more shift',
  'Через четыре такта узор как в начале': 'After four clocks the pattern is as at the start',
  'Круг повторяется': 'The circle repeats',
  'Регистр с параметрами: 4 бита, загрузка и асинхронный сброс. Блок один.':
    'The register with parameters: 4 bits, load and asynchronous reset. One block.',
  'Обратная связь: проведи провод с выхода SO этого же блока на его вход SI.':
    'Feedback: run a wire from the output SO of this same block to its input SI.',
  'load в LOAD, d в D, clk в CLK, reset в ACLR, Q в y.':
    'load to LOAD, d to D, clk to CLK, reset to ACLR, Q to y.',
  'Кольцевой счётчик': 'Ring counter',
  'Одна единица по кругу': 'One one around a circle',
  '**Кольцевой счётчик** это вращающийся регистр, в котором всегда ровно **одна единица**: 0001, 0010, 0100, 1000, и снова 0001. Номер разряда с единицей показывает, какой «шаг» цикла идёт сейчас. Так удобно по очереди включать устройства или светодиоды: в любой момент горит ровно один.\n\nЕго называют ещё **кольцо Джонсона без инверсии** или one-hot-счётчиком (one-hot, «одна горячая»).':
    'A **ring counter** is a rotating register in which there is always exactly **one one**: 0001, 0010, 0100, 1000, and 0001 again. The number of the place with the one shows which "step" of the cycle is going now. This is convenient for turning on devices or LEDs in turn: at any moment exactly one is lit.\n\nIt is also called a **Johnson ring without inversion** or a one-hot counter.',
  'Как задать начало': 'How to set the start',
  'Чтобы в регистре с самого начала стояла единица, при сбросе его загружают числом 0001. Для этого вход `reset` подают на `LOAD`, а на шину `D` ставят константу 1.\n\nВ этом уроке сброс синхронный: он действует по фронту такта. Пока `reset = 1`, регистр держит 0001, а когда сброс уходит, единица начинает бегать.':
    'So that the register has a one from the very beginning, on reset it is loaded with the number 0001. For this the input `reset` goes to `LOAD`, and the constant 1 is put on the bus `D`.\n\nIn this lesson the reset is synchronous: it acts on the clock edge. While `reset = 1`, the register holds 0001, and when the reset goes away, the one starts running.',
  'Сколько разных значений проходит кольцевой счётчик на 4 бита?':
    'How many different values does a 4-bit ring counter pass through?',
  'В регистре на 4 бита одна единица может стоять в одной из четырёх позиций, поэтому состояний четыре: 0001, 0010, 0100, 1000.':
    'In a 4-bit register one one can stand in one of four positions, so there are four states: 0001, 0010, 0100, 1000.',
  'Собери кольцо на 4 бита: SO подключи к SI, reset подай на LOAD, а на шину D подай константу 1 (ширина 4). Выведи Q на y.':
    'Build a 4-bit ring: connect SO to SI, feed reset to LOAD, and feed the constant 1 (width 4) to the bus D. Bring out Q to y.',
  'Сброс загрузил единицу': 'Reset loaded the one',
  'Единица сдвинулась': 'The one shifted',
  'Единица в старшем разряде': 'The one in the high place',
  'Круг замкнулся': 'The circle closed',
  'Снова второй разряд': 'Again the second place',
  'Через круг': 'Through a circle',
  'Регистр на 4 бита с параметром загрузки. Асинхронный сброс здесь не нужен.':
    'A 4-bit register with the load parameter. Asynchronous reset is not needed here.',
  'Блок «Константа» в группе «Ввод-вывод»: поставь ширину 4 и значение 1, выход подключи к D.':
    'The "Constant" block in the "Input-output" group: set width 4 and value 1, connect the output to D.',
  'SO в SI (кольцо), reset в LOAD, clk в CLK, Q в y.':
    'SO to SI (the ring), reset to LOAD, clk to CLK, Q to y.',
  'Счётчик Джонсона': 'Johnson counter',
  'Кольцо с переворотом': 'A ring with a flip',
  'Сделаем в обратной связи кольца одну поправку: в `SI` вернём не `SO`, а его **инверсию** (через блок «НЕ»). Получится **счётчик Джонсона**.\n\nРегистр, начиная с нулей, сначала заполняется единицами, а потом нулями, по одному разряду на такт. Для 4 бит получается 8 разных состояний, вдвое больше, чем в обычном кольце.':
    'Let us make one correction in the ring\'s feedback: into `SI` we return not `SO` but its **inversion** (through a "NOT" block). This gives a **Johnson counter**.\n\nThe register, starting from zeros, first fills with ones and then with zeros, one place per clock. For 4 bits there are 8 different states, twice as many as in an ordinary ring.',
  'Чем он хорош': 'What is good about it',
  'В коде Джонсона при переходе меняется **только один бит**. Поэтому в схемах, которые смотрят на состояние, не возникает «ложных» промежуточных значений. Кроме того, любое состояние распознаётся по двум соседним битам.\n\nСбрасывать регистр можно асинхронным входом `ACLR`: reset ставит все нули.':
    'In the Johnson code **only one bit** changes at a transition. So in circuits that look at the state there are no "false" intermediate values. Besides, any state is recognized by two neighboring bits.\n\nThe register can be cleared with the asynchronous input `ACLR`: reset sets all zeros.',
  'Сколько состояний у счётчика Джонсона на 4 бита?':
    'How many states does a 4-bit Johnson counter have?',
  'Регистр 4 бита сначала набирает четыре единицы (по одной за такт), а затем четыре нуля. Всего 8 тактов до повторения.':
    'A 4-bit register first collects four ones (one per clock), and then four zeros. In all, 8 clocks before repeating.',
  'Собери счётчик Джонсона: регистр на 4 бита с асинхронным сбросом, SO через блок НЕ подключи к SI. Выведи Q на y.':
    'Build a Johnson counter: a 4-bit register with asynchronous reset, connect SO through a NOT block to SI. Bring out Q to y.',
  'Первая единица': 'The first one',
  'Две единицы': 'Two ones',
  'Три единицы': 'Three ones',
  'Все единицы': 'All ones',
  'Пошли нули': 'The zeros begin',
  'Два нуля': 'Two zeros',
  'Три нуля': 'Three zeros',
  'Нужны два блока: сдвиговый регистр (4 бита, асинхронный сброс) и «НЕ».':
    'You need two blocks: a shift register (4 bits, asynchronous reset) and "NOT".',
  'Выход SO идёт на вход НЕ, а выход НЕ на SI.':
    'The output SO goes to the input of NOT, and the output of NOT to SI.',
  'clk в CLK, reset в ACLR, Q в y.': 'clk to CLK, reset to ACLR, Q to y.',
  'Псевдослучайные числа: LFSR': 'Pseudorandom numbers: LFSR',
  'Сдвиг и исключающее ИЛИ': 'A shift and an exclusive OR',
  'Как получить «случайные» числа схемой, у которой нет ни одной случайной детали? Берут сдвиговый регистр и подают в `SI` результат **исключающего ИЛИ (XOR)** от двух его битов. Такая схема называется **LFSR** (linear feedback shift register, «регистр сдвига с линейной обратной связью»).\n\nXOR даёт 1, когда биты разные. Регистр бегает по кругу значений, которые выглядят случайными, хотя порядок всегда один и тот же. Поэтому числа называют **псевдослучайными**.':
    'How do you get "random" numbers from a circuit that has not a single random part? You take a shift register and feed into `SI` the result of an **exclusive OR (XOR)** of two of its bits. Such a circuit is called an **LFSR** (linear feedback shift register).\n\nXOR gives 1 when the bits are different. The register runs around a circle of values that look random, although the order is always the same. That is why the numbers are called **pseudorandom**.',
  'Четыре бита, 15 состояний': 'Four bits, 15 states',
  'Если складывать XOR-ом два старших бита, `Q3` и `Q2`, то регистр на 4 бита проходит **15 разных значений** из 16 и только потом повторяется. Не хватает нулевого: из 0000 схема никогда бы не вышла, поэтому в начале её загружают единицей (0001), как в кольцевом счётчике.\n\nБит `Q3` берут прямо с выхода `SO`, а `Q2` выделяют блоком «Срез шины» (бит 2).':
    'If you add the two high bits, `Q3` and `Q2`, with XOR, a 4-bit register passes through **15 different values** out of 16 and only then repeats. The zero one is missing: the circuit would never leave 0000, so at the start it is loaded with a one (0001), as in the ring counter.\n\nThe bit `Q3` is taken directly from the output `SO`, and `Q2` is extracted with a "Bus slice" block (bit 2).',
  'Почему LFSR нельзя запускать из состояния 0000?':
    'Why can an LFSR not be started from the state 0000?',
  'XOR двух нулей даёт 0, и регистр навсегда останется нулевым':
    'XOR of two zeros gives 0, and the register will stay zero forever',
  'Регистр с нулями не принимает такт': 'A register of zeros does not accept the clock',
  'Нули нельзя загрузить из константы': 'Zeros cannot be loaded from a constant',
  'Если в регистре одни нули, то Q3 xor Q2 = 0, в SI входит 0 и ничего не меняется. Начальное значение с единицей запускает цикл.':
    'If the register holds only zeros, then Q3 xor Q2 = 0, 0 enters SI and nothing changes. A starting value with a one starts the cycle.',
  'Собери LFSR: регистр на 4 бита с загрузкой (reset в LOAD, константа 1 в D). В SI подай XOR от SO и бита 2 шины Q (срез шины, ширина входа 4, бит 2). Выведи Q на y.':
    'Build an LFSR: a 4-bit register with load (reset to LOAD, constant 1 to D). Feed into SI the XOR of SO and bit 2 of the bus Q (a bus slice, input width 4, bit 2). Bring out Q to y.',
  'Сброс загрузил 0001': 'Reset loaded 0001',
  'Второй шаг': 'The second step',
  'XOR старших бит дал единицу': 'XOR of the high bits gave a one',
  Дальше: 'Further',
  'Основа как в кольцевом счётчике: регистр с загрузкой, reset в LOAD, константа 1 на D.':
    'The basis is as in the ring counter: a register with load, reset to LOAD, constant 1 on D.',
  'Старший бит Q3 это SO. Бит 2 получи блоком «Срез шины» (ширина входа 4, младший и старший бит 2).':
    'The high bit Q3 is SO. Get bit 2 with a "Bus slice" block (input width 4, low and high bit 2).',
  'Подай SO и срез на «Исключающее ИЛИ», а его выход на SI. Q выведи на y.':
    'Feed SO and the slice to "Exclusive OR", and its output to SI. Bring out Q to y.',
  's  btn | следующее s\n0   0  |   0\n0   1  |   1\n1   0  |   1\n1   1  |   0\n\nграф:  (0) --btn=1--> (1)\n       (1) --btn=1--> (0)\n       при btn=0 остаёмся на месте':
    's  btn | next s\n0   0  |   0\n0   1  |   1\n1   0  |   1\n1   1  |   0\n\ngraph:  (0) --btn=1--> (1)\n        (1) --btn=1--> (0)\n        with btn=0 we stay in place',
  '          +--------------+\n  входы --+--> следующее  |\n          |    состояние +--> D [регистр] Q --+--> выход\n     +----+--> (элементы) |        ^          |\n     |    +--------------+      такт clk      |\n     +----------------------------------------+':
    '          +--------------+\n  inputs -+--> next       |\n          |    state     +--> D [register] Q --+--> output\n     +----+--> (gates)   |        ^            |\n     |    +--------------+      clock clk      |\n     +------------------------------------------+',
  'граф:  (s=0) --x=0--> (s=0)\n       (s=0) --x=1--> (s=1)\n       (s=1) --любой x--> (s=1)\n\nвыход: y = НЕ s':
    'graph:  (s=0) --x=0--> (s=0)\n       (s=0) --x=1--> (s=1)\n       (s=1) --any x--> (s=1)\n\noutput: y = NOT s',
  'граф:\n  A --x=0--> A      A --x=1--> B\n  B --x=0--> A      B --x=1--> C\n  C --x=0--> A      C --x=1--> C\n\ny = 1 только в состоянии C':
    'graph:\n  A --x=0--> A      A --x=1--> B\n  B --x=0--> A      B --x=1--> C\n  C --x=0--> A      C --x=1--> C\n\ny = 1 only in state C',
  'граф (x — вход):\n  S0 --0--> S0     S0 --1--> S1\n  S1 --0--> S2     S1 --1--> S1\n  S2 --0--> S0     S2 --1--> S3\n  S3 --0--> S2     S3 --1--> S1\n\ny = 1 в S3':
    'graph (x is the input):\n  S0 --0--> S0     S0 --1--> S1\n  S1 --0--> S2     S1 --1--> S1\n  S2 --0--> S0     S2 --1--> S3\n  S3 --0--> S2     S3 --1--> S1\n\ny = 1 in S3',
  "b' = x\na' = (b И НЕ x) ИЛИ (a И НЕ b И x)\ny  = a И b":
    "b' = x\na' = (b AND NOT x) OR (a AND NOT b AND x)\ny  = a AND b",
  'граф:\n  (0) --call=0--> (0)\n  (0) --call=1--> (1)\n  (1) --done=0--> (1)\n  (1) --done=1--> (0)   (если call = 0)\n\nпри call = 1 и done = 1 одновременно\nпобеждает call: остаёмся в (1)':
    'graph:\n  (0) --call=0--> (0)\n  (0) --call=1--> (1)\n  (1) --done=0--> (1)\n  (1) --done=1--> (0)   (if call = 0)\n\nwith call = 1 and done = 1 at the same time\ncall wins: we stay in (1)',
  "s' = call ИЛИ (s И НЕ done)\ny  = s": "s' = call OR (s AND NOT done)\ny  = s",
  'граф:\n  (0) -go-> (1) -go-> (2) -go-> (3) -go-> (0)\n  при go = 0 состояние не меняется':
    'graph:\n  (0) -go-> (1) -go-> (2) -go-> (3) -go-> (0)\n  with go = 0 the state does not change',
  'состояние:  0    1    2    3\nкод ab:     00   01   10   11\ny:          0    0    1    0':
    'state:     0    1    2    3\ncode ab:  00   01   10   11\ny:        0    0    1    0',
  "b' = b XOR go\na' = a XOR (b И go)\ny  = a И НЕ b":
    "b' = b XOR go\na' = a XOR (b AND go)\ny  = a AND NOT b",
  "s' = s XOR mode\ny  = s И go\n\ns  go | y\n0   x | 0\n1   0 | 0\n1   1 | 1":
    "s' = s XOR mode\ny  = s AND go\n\ns  go | y\n0   x | 0\n1   0 | 0\n1   1 | 1",
  'граф:\n  S0 --0--> S0     S0 --1--> S1\n  S1 --0--> S0     S1 --1--> S2\n  S2 --0--> S3     S2 --1--> S2\n  S3 --0--> S0     S3 --1--> S1\n\ny = 1 в S3':
    'graph:\n  S0 --0--> S0     S0 --1--> S1\n  S1 --0--> S0     S1 --1--> S2\n  S2 --0--> S3     S2 --1--> S2\n  S3 --0--> S0     S3 --1--> S1\n\ny = 1 in S3',
  "b' = x\na' = b И (a ИЛИ x)\ny  = a И НЕ b": "b' = x\na' = b AND (a OR x)\ny  = a AND NOT b",
  'Автомат на двух состояниях': 'A state machine with two states',
  'Схема, которая помнит': 'A circuit that remembers',
  'Схема из одних элементов «забывает» всё сразу: выход зависит только от входов прямо сейчас. Чтобы устройство помнило, что было раньше, нужна память. Самая простая память — **регистр** (D-триггер): на каждом фронте такта `clk` он запоминает то, что подано на вход `D`, и держит это до следующего фронта.\n\n**Фронт** — это момент, когда такт меняется с 0 на 1. Между фронтами регистр ничего не замечает.\n\n**Состояние** — это то, что схема помнит. Если помнить нужно один бит («горит» или «не горит»), у автомата два состояния, и хватает одного регистра.':
    'A circuit made of gates alone "forgets" everything at once: the output depends only on the inputs right now. For a device to remember what was before, memory is needed. The simplest memory is a **register** (D flip-flop): on every edge of the clock `clk` it remembers what is on the input `D` and holds it until the next edge.\n\nAn **edge** is the moment the clock changes from 0 to 1. Between edges the register notices nothing.\n\nA **state** is what the circuit remembers. If one bit needs to be remembered ("lit" or "not lit"), the machine has two states, and one register is enough.',
  'Лампа с одной кнопкой': 'A lamp with one button',
  'Задача: кнопка `btn` переключает лампу. Нажали — лампа зажглась, нажали ещё раз — погасла. Состояние `s` — горит лампа или нет, оно лежит в регистре.\n\nНа каждом фронте регистр должен получить **следующее состояние**:\n\n- если кнопка не нажата, `s` не меняется: на `D` идёт сам `s`;\n- если нажата, `s` переворачивается: на `D` идёт `НЕ s`.\n\nВыбирает между этими двумя вариантами мультиплексор: кнопка подаётся на его вход `S`. Заметь: пока кнопка удерживается, лампа переключается на **каждом** такте, а не один раз за нажатие.':
    'The task: the button `btn` toggles a lamp. Pressed, the lamp lights; pressed again, it goes out. The state `s` is whether the lamp is lit, and it lies in the register.\n\nOn every edge the register must get the **next state**:\n\n- if the button is not pressed, `s` does not change: `s` itself goes to `D`;\n- if it is pressed, `s` flips: `NOT s` goes to `D`.\n\nThe choice between these two variants is made by a multiplexer: the button is fed to its input `S`. Note: while the button is held, the lamp toggles on **every** clock, not once per press.',
  'При включении платы регистр хранит неизвестно что. Поэтому у регистра есть вход `RST` — **синхронный сброс**: если на фронте `RST = 1`, регистр записывает 0, что бы ни стояло на `D`. В учебных схемах сброс приходит снаружи, это вход `reset`. Первые такты `reset = 1`, и автомат гарантированно начинает с состояния 0.':
    'When the board is powered on, the register holds who knows what. So the register has an input `RST`, a **synchronous reset**: if on the edge `RST = 1`, the register writes 0, whatever is on `D`. In teaching circuits the reset comes from outside, it is the input `reset`. In the first clocks `reset = 1`, and the machine is guaranteed to start from state 0.',
  'Кнопка btn держится нажатой несколько тактов подряд. Что делает лампа?':
    'The button btn is held pressed for several clocks in a row. What does the lamp do?',
  'Переключается на каждом такте': 'Toggles on every clock',
  'Переключается один раз и ждёт отпускания': 'Toggles once and waits for release',
  'Остаётся неизменной': 'Stays unchanged',
  'Схема смотрит на btn на каждом фронте и не знает, нажата кнопка впервые или уже давно. Пока btn = 1, состояние переворачивается каждый такт.':
    'The circuit looks at btn on every edge and does not know whether the button was just pressed or pressed long ago. While btn = 1, the state flips every clock.',
  'Собери автомат-переключатель: регистр хранит состояние, выход y равен ему. Пока btn = 1, на каждом фронте состояние переворачивается. Сброс reset подключи к входу RST регистра.':
    "Build a toggle machine: the register stores the state, the output y equals it. While btn = 1, the state flips on every edge. Connect the reset to the register's RST input.",
  'Понадобятся регистр (ширина 1 бит, включён сброс), элемент НЕ и мультиплексор 2:1.':
    'You will need a register (width 1 bit, reset on), a NOT gate and a 2:1 multiplexer.',
  'Выход регистра Q идёт в три места: на выход y, на вход НЕ и на вход D0 мультиплексора. Выход НЕ идёт на D1.':
    "The register's output Q goes to three places: to the output y, to the input of NOT and to the input D0 of the multiplexer. The output of NOT goes to D1.",
  'Выход мультиплексора соедини со входом D регистра, btn — со входом S, clk — с CLK, reset — с RST.':
    "Connect the multiplexer's output to the register's input D, btn to the input S, clk to CLK, reset to RST.",
  'Каркас автомата': 'The skeleton of a machine',
  'Три части любого автомата': 'Three parts of any machine',
  'Любой конечный автомат собирается по одному каркасу из трёх частей:\n\n- **регистр состояния** — хранит, где автомат сейчас;\n- **логика следующего состояния** — по текущему состоянию и входам решает, что записать в регистр на ближайшем фронте;\n- **логика выхода** — по состоянию (иногда и по входам) вырабатывает выходной сигнал.\n\nСхему принято рисовать слева направо: входы, логика следующего состояния, регистр, логика выхода, выход. Выход регистра возвращается назад — на вход логики следующего состояния. Эта петля и есть память.':
    "Any finite state machine is assembled by one skeleton of three parts:\n\n- the **state register** stores where the machine is now;\n- the **next-state logic** decides, from the current state and the inputs, what to write into the register on the nearest edge;\n- the **output logic** produces the output signal from the state (sometimes also from the inputs).\n\nThe circuit is usually drawn from left to right: inputs, next-state logic, register, output logic, output. The register's output returns back to the input of the next-state logic. This loop is the memory.",
  'Пример: «кто-то нажимал?»': 'Example: "did anyone press?"',
  'Сигнализация: лампа `y` горит, пока кнопка ни разу не нажималась, а после первого нажатия гаснет навсегда (до сброса).\n\nСостояние `s`: 0 — не нажимали, 1 — нажимали. Следующее состояние: `s ИЛИ x`. Если `s` уже стало 1, оно такое и остаётся: единица, один раз попав в регистр, возвращается через ИЛИ обратно. Выход: `y = НЕ s`.\n\nЗдесь видно, как каркас раскладывается на части: ИЛИ — логика следующего состояния, НЕ — логика выхода.':
    'An alarm: the lamp `y` is lit while the button has never been pressed, and after the first press it goes out forever (until reset).\n\nThe state `s`: 0 means not pressed, 1 means pressed. The next state: `s OR x`. If `s` has already become 1, it stays so: a one, once it gets into the register, returns through the OR back. The output: `y = NOT s`.\n\nHere you can see how the skeleton breaks into parts: OR is the next-state logic, NOT is the output logic.',
  'Зачем выход регистра подаётся обратно на вход логики следующего состояния?':
    "Why is the register's output fed back to the input of the next-state logic?",
  'Чтобы новое состояние могло зависеть от старого':
    'So that the new state can depend on the old one',
  'Чтобы не использовать такт': 'To avoid using the clock',
  'Без этой обратной связи следующее состояние зависело бы только от входов, и автомат ничего не помнил бы: «если уже было нажатие» узнать неоткуда.':
    'Without this feedback the next state would depend only on the inputs, and the machine would remember nothing: there would be no way to know "if there was already a press".',
  'Собери каркас: регистр состояния s, логика следующего состояния «s ИЛИ x», логика выхода «y = НЕ s». Сброс reset подключи к RST регистра.':
    'Build the skeleton: the state register s, the next-state logic "s OR x", the output logic "y = NOT s". Connect the reset to the register\'s RST.',
  'Три блока: регистр, ИЛИ и НЕ. Регистру включи синхронный сброс и поставь ширину 1.':
    'Three blocks: a register, an OR and a NOT. Turn on the synchronous reset for the register and set the width to 1.',
  'Слева от регистра ИЛИ: на один вход Q регистра, на другой x. Выход ИЛИ идёт на D.':
    "To the left of the register is the OR: Q of the register to one input, x to the other. The OR's output goes to D.",
  'Справа от регистра НЕ: вход от Q, выход на y. Не забудь clk на CLK и reset на RST.':
    'To the right of the register is the NOT: the input from Q, the output to y. Do not forget clk to CLK and reset to RST.',
  'Детектор двух единиц подряд': 'A detector of two ones in a row',
  'Задача детектора': "The detector's task",
  'Детектор последовательности наблюдает за входом `x` такт за тактом и выдаёт `y = 1`, когда увидел заданный шаблон. Для начала шаблон простой: **две единицы подряд**, `11`.\n\nЧтобы заметить две единицы, нужно помнить предыдущий бит. Это и есть состояние:\n\n- `A` — предыдущий бит был 0 (или ещё ничего не было);\n- `B` — предыдущий бит был 1;\n- `C` — две единицы подряд только что случились.':
    'A sequence detector watches the input `x` clock by clock and outputs `y = 1` when it has seen the given pattern. To start, the pattern is simple: **two ones in a row**, `11`.\n\nTo notice two ones, you need to remember the previous bit. That is the state:\n\n- `A`: the previous bit was 0 (or nothing has been yet);\n- `B`: the previous bit was 1;\n- `C`: two ones in a row have just happened.',
  'Два бита состояния и перекрытие': 'Two state bits and overlap',
  'Закодируем состояния двумя регистрами: `p` — «бит на входе в прошлом такте был 1», `q` — «две единицы подряд». Тогда:\n\n- `p` на фронте получает `x`;\n- `q` на фронте получает `x И p`;\n- выход `y = q`.\n\nОбрати внимание на **перекрытие**: для входа `1 1 1` детектор сработает дважды, на втором и на третьем тактах, потому что вторая единица — начало следующей пары. Ложное начало (`1 0 1`) пару не даёт: ноль обрывает цепочку.':
    'Let us encode the states with two registers: `p` is "the bit on the input in the previous clock was 1", `q` is "two ones in a row". Then:\n\n- `p` on the edge gets `x`;\n- `q` on the edge gets `x AND p`;\n- the output `y = q`.\n\nNote the **overlap**: for the input `1 1 1` the detector fires twice, on the second and third clocks, because the second one is the start of the next pair. A false start (`1 0 1`) does not give a pair: the zero breaks the chain.',
  'Вход x равен 1 0 1 1. На каких тактах y станет 1?':
    'The input x is 1 0 1 1. On which clocks will y become 1?',
  'Только на четвёртом': 'Only on the fourth',
  'На втором и четвёртом': 'On the second and fourth',
  'На третьем и четвёртом': 'On the third and fourth',
  'Две единицы подряд впервые встречаются только на третьем и четвёртом тактах. Пару заканчивает четвёртый такт, на нём y = 1. Единицы первого и третьего тактов разделены нулём.':
    'Two ones in a row first occur only at the third and fourth clocks. The pair is completed by the fourth clock, and on it y = 1. The ones of the first and third clocks are separated by a zero.',
  'Собери детектор «11»: два регистра, p запоминает x, q запоминает «x И p», выход y равен q. Сброс reset подключи к RST обоих регистров.':
    'Build the "11" detector: two registers, p remembers x, q remembers "x AND p", the output y equals q. Connect the reset to RST of both registers.',
  'Нужны два регистра (1 бит, со сбросом) и один элемент И.':
    'You need two registers (1 bit, with reset) and one AND gate.',
  'Первый регистр просто запоминает x. Элемент И получает x и выход первого регистра.':
    'The first register simply remembers x. The AND gate gets x and the output of the first register.',
  'Выход И идёт на вход D второго регистра, а выход второго регистра — на y.':
    "The AND's output goes to the input D of the second register, and the second register's output goes to y.",
  'Детектор 101': 'The 101 detector',
  'Четыре состояния': 'Four states',
  'Теперь шаблон длиннее: `1 0 1`. Автомат запоминает, какой кусок шаблона уже набран:\n\n- `S0` — ничего (или последним был 0 без единицы перед ним);\n- `S1` — набрано `1`;\n- `S2` — набрано `10`;\n- `S3` — набрано `101`, здесь `y = 1`.\n\nСостояний четыре, значит нужно два бита. Назовём их `a` и `b` и закодируем так: `S0 = 00`, `S1 = 01`, `S2 = 10`, `S3 = 11` (первый бит — `a`).':
    'Now the pattern is longer: `1 0 1`. The machine remembers which piece of the pattern is already collected:\n\n- `S0`: nothing (or the last one was a 0 with no one before it);\n- `S1`: `1` collected;\n- `S2`: `10` collected;\n- `S3`: `101` collected, here `y = 1`.\n\nThere are four states, so two bits are needed. Let us call them `a` and `b` and encode like this: `S0 = 00`, `S1 = 01`, `S2 = 10`, `S3 = 11` (the first bit is `a`).',
  'Подлые случаи': 'Sneaky cases',
  'Обрати внимание на переходы из `S3`. После `101` нулевой бит оставляет нас в `S2`: последние два бита равны `10`, и следующая единица снова даст `101`. Так `1 0 1 0 1` срабатывает **дважды**: шаблоны перекрываются в средней единице.\n\nА `1 1`: из `S1` по единице мы остаёмся в `S1`: вторая единица становится новым началом.\n\nКогда таблица переходов составлена, формулы выходят сами. Новый бит `b` всегда равен входу: `b = x`. Новый `a` равен 1, когда мы идём в `S2` (из `S1` или `S3` по нулю: `b И НЕ x`) или в `S3` (из `S2` по единице: `a И НЕ b И x`). Выход `y = a И b`.':
    'Note the transitions from `S3`. After `101` a zero bit leaves us in `S2`: the last two bits are `10`, and the next one will again give `101`. So `1 0 1 0 1` fires **twice**: the patterns overlap in the middle one.\n\nAnd for `1 1`: from `S1` on a one we stay in `S1`: the second one becomes a new start.\n\nWhen the transition table is made, the formulas come out by themselves. The new `b` always equals the input: `b = x`. The new `a` is 1 when we go to `S2` (from `S1` or `S3` on zero: `b AND NOT x`) or to `S3` (from `S2` on one: `a AND NOT b AND x`). The output `y = a AND b`.',
  'Вход x равен 1 0 1 0 1. Сколько раз сработает детектор 101?':
    'The input x is 1 0 1 0 1. How many times will the 101 detector fire?',
  'Один раз': 'Once',
  'Два раза': 'Twice',
  'Ни разу': 'Never',
  'Шаблон 101 есть в тактах 1–3 и в тактах 3–5. Средняя единица (такт 3) принадлежит обоим: детектор с перекрытием срабатывает на третьем и на пятом тактах.':
    'The pattern 101 is in clocks 1–3 and in clocks 3–5. The middle one (clock 3) belongs to both: a detector with overlap fires on the third and fifth clocks.',
  "Собери детектор 101 по формулам: b' = x, a' = (b И НЕ x) ИЛИ (a И НЕ b И x), y = a И b. Два регистра со сбросом.":
    "Build the 101 detector by the formulas: b' = x, a' = (b AND NOT x) OR (a AND NOT b AND x), y = a AND b. Two registers with reset.",
  'Регистр b проще всего: на его вход D идёт сам x. Регистру a нужна логика из двух И и одного ИЛИ.':
    'The register b is simplest: x itself goes to its input D. The register a needs logic of two ANDs and one OR.',
  'Первое И: b и НЕ x. Второе И с тремя входами (в параметрах блока «Число входов» = 3): a, НЕ b и x.':
    'The first AND: b and NOT x. The second AND with three inputs (in the block\'s parameters "Number of inputs" = 3): a, NOT b and x.',
  'Выходы обоих И идут в ИЛИ, а оно — на D регистра a. Выход y: И от a и b.':
    'The outputs of both ANDs go to the OR, and it to D of the register a. The output y: AND of a and b.',
  'Светофор для пешеходов': 'A pedestrian traffic light',
  'Два режима и два сигнала': 'Two modes and two signals',
  'Перекрёсток с кнопкой для пешеходов. У автомата два состояния:\n\n- `0` — машинам зелёный, пешеходам красный;\n- `1` — пешеходам зелёный, машинам красный.\n\nВходов два: `call` — пешеход нажал кнопку вызова, и `done` — время перехода вышло. Выход `y = 1`, когда пешеходам можно идти (это и есть состояние).':
    'A crossroads with a pedestrian button. The machine has two states:\n\n- `0`: green for cars, red for pedestrians;\n- `1`: green for pedestrians, red for cars.\n\nThere are two inputs: `call`, a pedestrian pressed the call button, and `done`, the crossing time is over. The output `y = 1` when pedestrians may go (this is the state itself).',
  'Формула следующего состояния': 'The next-state formula',
  'Из графа получается: следующее `s` равно 1, если нажат `call`, **или** если мы уже в состоянии 1 и перехода ещё не кончили (`НЕ done`).\n\nПравило «call сильнее done» мы выбрали сами. В реальных автоматах такие приоритеты надо решать заранее, иначе схема поведёт себя неожиданно, когда оба сигнала придут вместе.':
    'From the graph we get: the next `s` equals 1 if `call` is pressed, **or** if we are already in state 1 and have not finished the crossing (`NOT done`).\n\nThe rule "call is stronger than done" we chose ourselves. In real machines such priorities must be decided in advance, otherwise the circuit will behave unexpectedly when both signals arrive together.',
  'Что будет, если на одном такте call = 1 и done = 1, а состояние было 1?':
    'What happens if on one clock call = 1 and done = 1, and the state was 1?',
  'Останется 1: вызов побеждает': 'It stays 1: the call wins',
  'Станет 0: окончание побеждает': 'It becomes 0: the end wins',
  'Результат непредсказуем': 'The result is unpredictable',
  'В формуле «call ИЛИ (s И НЕ done)» первый операнд равен 1, и ИЛИ даёт 1 независимо от второго. Схема детерминирована: приоритет зашит в формулу.':
    'In the formula "call OR (s AND NOT done)" the first operand is 1, and OR gives 1 regardless of the second. The circuit is deterministic: the priority is built into the formula.',
  "Собери светофор: регистр s со сбросом, s' = call ИЛИ (s И НЕ done), выход y = s.":
    "Build the traffic light: register s with reset, s' = call OR (s AND NOT done), the output y = s.",
  'Нужны регистр, НЕ, И и ИЛИ. Выход y подключается прямо к Q регистра.':
    'You need a register, NOT, AND and OR. The output y is connected directly to Q of the register.',
  'Сначала НЕ done, потом И этого сигнала с Q: «пока ещё идём».':
    'First NOT done, then AND of that signal with Q: "while we are still going".',
  'ИЛИ объединяет call и результат И; выход ИЛИ идёт на D регистра.':
    "OR joins call and the result of AND; the OR's output goes to D of the register.",
  'Счётчик как автомат': 'A counter as a machine',
  'Четыре состояния по кругу': 'Four states in a circle',
  'Счётчик — тоже автомат. У двухбитного счётчика четыре состояния: `0, 1, 2, 3`, и они идут по кругу: после 3 снова 0.\n\nВход `go` — разрешение счёта. Пока `go = 1`, на каждом фронте автомат переходит к следующему состоянию, при `go = 0` стоит на месте.\n\nСостояние здесь — само число, лежащее в регистре шириной 2 бита. Логика следующего состояния — блок «Прибавить 1»: он прибавляет единицу, а после максимума (3 для двух бит) получается 0. Отдельно описывать переход 3 → 0 не нужно.':
    'A counter is also a machine. A two-bit counter has four states: `0, 1, 2, 3`, and they go in a circle: after 3, 0 again.\n\nThe input `go` is the count enable. While `go = 1`, on every edge the machine moves to the next state, with `go = 0` it stands still.\n\nThe state here is the number itself, lying in a register 2 bits wide. The next-state logic is the "Add 1" block: it adds one, and after the maximum (3 for two bits) we get 0. The transition 3 → 0 does not need to be described separately.',
  'Разрешение записи': 'Write enable',
  'Чтобы автомат стоял на месте при `go = 0`, у регистра есть вход `EN` — разрешение записи. Если `EN = 0`, фронт регистр игнорирует. Тогда мультиплексор, как в автомате-переключателе, не нужен: `go` просто подаётся на `EN`.\n\nСброс и разрешение вместе: если на фронте `RST = 1`, сброс главнее и регистр обнуляется, даже если `EN = 0`.':
    'For the machine to stand still at `go = 0`, the register has an input `EN`, the write enable. If `EN = 0`, the register ignores the edge. Then a multiplexer, as in the toggle machine, is not needed: `go` is simply fed to `EN`.\n\nReset and enable together: if on the edge `RST = 1`, the reset is more important and the register clears, even if `EN = 0`.',
  'Счётчик в состоянии 3, go = 1. Каким будет следующее состояние?':
    'The counter is in state 3, go = 1. What will the next state be?',
  'Останется 3': 'It will stay 3',
  'Двух бит хватает только на числа от 0 до 3. Прибавление единицы к 3 переполняет регистр, и получается 0: автомат замыкается в круг.':
    'Two bits are enough only for the numbers from 0 to 3. Adding one to 3 overflows the register, and the result is 0: the machine closes into a circle.',
  'Собери автомат-счётчик: регистр шириной 2 бита со сбросом и разрешением записи, блок «Прибавить 1» шириной 2 бита, go подаётся на разрешение. Выход y — двухбитное состояние.':
    'Build a counter machine: a register 2 bits wide with reset and write enable, an "Add 1" block 2 bits wide, go fed to the enable. The output y is the two-bit state.',
  'Два блока: регистр и «Прибавить 1». У обоих поставь ширину 2; у регистра включи сброс и разрешение записи.':
    'Two blocks: a register and "Add 1". Set the width to 2 for both; for the register turn on reset and write enable.',
  'Выход регистра Q идёт на вход A блока «Прибавить 1» и на y. Выход блока возвращается на D.':
    'The register\'s output Q goes to the input A of the "Add 1" block and to y. The block\'s output returns to D.',
  'go подключи к входу EN регистра, reset — к RST, clk — к CLK.':
    "Connect go to the register's input EN, reset to RST, clk to CLK.",
  'Выход Мура': 'A Moore output',
  'Выход зависит только от состояния': 'The output depends only on the state',
  'В автомате **Мура** выход определяется только состоянием. Входы влияют на выход лишь через регистр: сначала меняют состояние на ближайшем фронте, а уже потом выход. Мгновенно реагировать на вход такой автомат не может.\n\nПример: автомат считает 0, 1, 2, 3 по кругу, пока `go = 1`. Выход `y = 1` только в состоянии 2. Состояние кодируем двумя битами `a` (старший) и `b`.':
    'In a **Moore** machine the output is determined only by the state. The inputs affect the output only through the register: first they change the state on the nearest edge, and only then the output. Such a machine cannot react to an input instantly.\n\nExample: the machine counts 0, 1, 2, 3 in a circle while `go = 1`. The output `y = 1` only in state 2. We encode the state with two bits `a` (high) and `b`.',
  Формулы: 'Formulas',
  'Счёт на двух битах получается из исключающего ИЛИ (XOR). Младший бит переворачивается каждый раз, когда `go = 1`; старший переворачивается, когда `go = 1` и младший бит равен 1 (перенос).\n\nЛогика выхода — отдельный элемент справа от регистров: состояние 2 это `a = 1`, `b = 0`.':
    'Counting on two bits comes from exclusive OR (XOR). The low bit flips each time `go = 1`; the high bit flips when `go = 1` and the low bit is 1 (a carry).\n\nThe output logic is a separate gate to the right of the registers: state 2 is `a = 1`, `b = 0`.',
  'Автомат Мура стоит в состоянии 1, на входе go = 0, y = 0. Вход go становится 1. Когда изменится y?':
    'A Moore machine is in state 1, the input go = 0, y = 0. The input go becomes 1. When will y change?',
  'После ближайшего фронта такта, когда сменится состояние':
    'After the nearest clock edge, when the state changes',
  'Сразу, без ожидания фронта': 'Immediately, without waiting for an edge',
  'Только после сброса': 'Only after a reset',
  'У автомата Мура выход вычисляется только из состояния. Состояние меняется на фронте, поэтому и выход меняется вместе с ним, но не раньше. Выход, который зависит ещё и от входа, был бы выходом Мили.':
    'In a Moore machine the output is computed only from the state. The state changes on the edge, so the output changes together with it, but not earlier. An output that also depends on the input would be a Mealy output.',
  "Собери автомат Мура: два регистра со сбросом (b — младший), b' = b XOR go, a' = a XOR (b И go), выход y = a И НЕ b.":
    "Build a Moore machine: two registers with reset (b is the low one), b' = b XOR go, a' = a XOR (b AND go), the output y = a AND NOT b.",
  'Левая часть: два XOR и одно И — логика следующего состояния. Правая часть: НЕ и И — логика выхода.':
    'The left part: two XORs and one AND are the next-state logic. The right part: NOT and AND are the output logic.',
  'Для b: XOR от b и go, результат на D регистра b. Для a: И от b и go, затем XOR с a, результат на D регистра a.':
    'For b: XOR of b and go, the result to D of the register b. For a: AND of b and go, then XOR with a, the result to D of the register a.',
  'Выход: И от a и НЕ b, результат на y. Сброс и такт подай на оба регистра.':
    'The output: AND of a and NOT b, the result to y. Feed the reset and the clock to both registers.',
  'Выход Мили': 'A Mealy output',
  'Выход зависит от состояния и входа': 'The output depends on the state and the input',
  'В автомате **Мили** выход определяется состоянием **и** входом. Поэтому он может изменяться сразу вслед за входом, не дожидаясь смены состояния.\n\nПример: кнопка `mode` переключает режим (состояние `s`, как в автомате-переключателе). Лампа `y` должна гореть только если режим включён **и** сейчас нажата кнопка `go`: `y = s И go`.\n\nКогда режим включён, лампа следует за кнопкой `go` как за выключателем, пока на `go` меняется вход. Состояние при этом не меняется. У автомата Мура такого быть не могло бы.':
    'In a **Mealy** machine the output is determined by the state **and** the input. So it can change right after the input, without waiting for the state to change.\n\nExample: the button `mode` toggles the mode (the state `s`, as in the toggle machine). The lamp `y` must be lit only if the mode is on **and** the button `go` is pressed right now: `y = s AND go`.\n\nWhen the mode is on, the lamp follows the button `go` like a switch, as long as the input on `go` changes. The state does not change meanwhile. A Moore machine could not do this.',
  'Когда читать выход': 'When to read the output',
  'Выход Мили зависит от входа, а вход может меняться между фронтами. Здесь выход читаем в конце такта, после фронта: `s` уже обновилось по `mode`, а `go` ещё равен значению этого такта. Поэтому, если на одном такте `mode = 1` переворачивает состояние, лампа для `go = 1` берёт **новое** состояние.':
    'A Mealy output depends on the input, and the input can change between edges. Here we read the output at the end of the clock, after the edge: `s` has already been updated by `mode`, and `go` still has the value of this clock. So if on one clock `mode = 1` flips the state, the lamp for `go = 1` takes the **new** state.',
  'Что отличает выход Мили от выхода Мура?':
    'What distinguishes a Mealy output from a Moore output?',
  'Он зависит не только от состояния, но и от входа':
    'It depends not only on the state but also on the input',
  'Он не зависит от состояния': 'It does not depend on the state',
  'Он меняется только на нулевом такте': 'It changes only on clock zero',
  'Автомат Мура вырабатывает выход только из состояния. У автомата Мили в логику выхода приходят и состояние, и входы, поэтому выход реагирует на вход сразу.':
    'A Moore machine produces the output only from the state. In a Mealy machine both the state and the inputs come to the output logic, so the output reacts to the input at once.',
  "Собери автомат Мили: регистр s со сбросом, s' = s XOR mode, выход y = s И go. Заметь, что элемент И на выходе получает и состояние, и вход go.":
    "Build a Mealy machine: register s with reset, s' = s XOR mode, the output y = s AND go. Note that the AND gate on the output gets both the state and the input go.",
  'Три блока: регистр, XOR и И. XOR вместе с регистром даёт переключатель по mode.':
    'Three blocks: a register, XOR and AND. XOR together with the register gives a toggle by mode.',
  'Выход Q идёт и на XOR (вместе с mode), и на И.':
    'The output Q goes both to XOR (together with mode) and to AND.',
  'Второй вход И — сам go. Выход И идёт на y.':
    "The second input of AND is go itself. The AND's output goes to y.",
  'Кодовый замок': 'A code lock',
  'Замок «1, 1, 0»': 'The lock "1, 1, 0"',
  'Замок открывается, если на входе `x` подряд пришло `1`, `1`, `0`. Выход `y = 1` — замок открыт. Автомат такой же, как детектор шаблона:\n\n- `S0` — ничего не набрано;\n- `S1` — набрано `1`;\n- `S2` — набрано `11`;\n- `S3` — набрано `110`, замок открыт.\n\nПодлые случаи: `1 1 1 0` открывает (последние три бита — `110`), а `1 0 1 0` не открывает: ноль в середине сбрасывает набор. После открытия следующий бит сразу закрывает замок.':
    'The lock opens if `1`, `1`, `0` arrive in a row on the input `x`. The output `y = 1` means the lock is open. The machine is the same as a pattern detector:\n\n- `S0`: nothing collected;\n- `S1`: `1` collected;\n- `S2`: `11` collected;\n- `S3`: `110` collected, the lock is open.\n\nSneaky cases: `1 1 1 0` opens (the last three bits are `110`), and `1 0 1 0` does not open: a zero in the middle resets the entry. After opening, the next bit closes the lock at once.',
  'Кодировка со сюрпризом': 'An encoding with a surprise',
  "Закодируем состояния так: `S0 = 00`, `S1 = 01`, `S2 = 11`, `S3 = 10` (первый бит — `a`, второй — `b`). Выбор не случаен: при такой кодировке новый `b` всегда равен входу `x`, то есть `b` — это просто «последний принятый бит». А новый `a` равен 1 только в состояниях `S2`, `S3` после единицы, и когда мы пришли из `S1` по единице.\n\nИтог: `b' = x`, `a' = b И (a ИЛИ x)`, `y = a И НЕ b`. Хорошая кодировка делает логику короче.":
    'Let us encode the states like this: `S0 = 00`, `S1 = 01`, `S2 = 11`, `S3 = 10` (the first bit is `a`, the second is `b`). The choice is not accidental: with this encoding the new `b` always equals the input `x`, that is `b` is simply "the last received bit". And the new `a` is 1 only in the states `S2`, `S3` after a one, and when we came from `S1` on a one.\n\nThe result: `b\' = x`, `a\' = b AND (a OR x)`, `y = a AND NOT b`. A good encoding makes the logic shorter.',
  'Вход x: 1 1 1 0. Откроется ли замок?': 'The input x: 1 1 1 0. Will the lock open?',
  'Да: последние три бита — 110': 'Yes: the last three bits are 110',
  'Нет: замок ждёт ровно 1 1 0 с начала': 'No: the lock waits for exactly 1 1 0 from the start',
  'Только если после 0 придёт ещё одна единица': 'Only if another one comes after the 0',
  'Автомат смотрит на последние принятые биты. Третья единица оставляет его в S2 («набрано 11»), и следующий ноль завершает код 110. Начало ввода значения не имеет.':
    'The machine looks at the last received bits. The third one leaves it in S2 ("11 collected"), and the next zero completes the code 110. The start of the entry does not matter.',
  "Собери замок: два регистра со сбросом, b' = x, a' = b И (a ИЛИ x), выход y = a И НЕ b. Замок открывается на том такте, где закончился код 1, 1, 0.":
    "Build the lock: two registers with reset, b' = x, a' = b AND (a OR x), the output y = a AND NOT b. The lock opens on the clock where the code 1, 1, 0 ended.",
  'Два регистра со сбросом. Регистр b просто запоминает x.':
    'Two registers with reset. The register b simply remembers x.',
  'Для регистра a: сначала ИЛИ от a и x, потом И этого результата с b; результат на D регистра a.':
    'For the register a: first OR of a and x, then AND of that result with b; the result to D of the register a.',
  'Выход: И от a и НЕ b.': 'The output: AND of a and NOT b.',
  'цифра | g f e d c b a\n  0   | 0 1 1 1 1 1 1\n  1   | 0 0 0 0 1 1 0\n  2   | 1 0 1 1 0 1 1\n  8   | 1 1 1 1 1 1 1\n 10…15| 0 0 0 0 0 0 0':
    'digit | g f e d c b a\n  0   | 0 1 1 1 1 1 1\n  1   | 0 0 0 0 1 1 0\n  2   | 1 0 1 1 0 1 1\n  8   | 1 1 1 1 1 1 1\n 10…15| 0 0 0 0 0 0 0',
  'код | цифра | g f e d c b a\n 9  |   9   | 1 1 0 1 1 1 1\n 10 |   A   | 1 1 1 0 1 1 1\n 11 |   b   | 1 1 1 1 1 0 0\n 15 |   F   | 1 1 1 0 0 0 1':
    'code | digit | g f e d c b a\n 9  |   9   | 1 1 0 1 1 1 1\n 10 |   A   | 1 1 1 0 1 1 1\n 11 |   b   | 1 1 1 1 1 0 0\n 15 |   F   | 1 1 1 0 0 0 1',
  'число  | на выход led_n\n0101   | 1010  (горят 2-й и 4-й светодиоды справа)\n0000   | 1111  (ничего не горит)\n1111   | 0000  (горят все)':
    'number  | to output led_n\n0101   | 1010  (the 2nd and 4th LEDs from the right are lit)\n0000   | 1111  (nothing is lit)\n1111   | 0000  (all are lit)',
  'n | y (3 бита)\n0 | 000\n1 | 001\n2 | 011\n3 | 111':
    'n | y (3 bits)\n0 | 000\n1 | 001\n2 | 011\n3 | 111',
  'n   | y (8 бит)\n000 | 00000001\n001 | 00000010\n101 | 00100000\n111 | 10000000':
    'n   | y (8 bits)\n000 | 00000001\n001 | 00000010\n101 | 00100000\n111 | 10000000',
  'enable d | d И enable\n   0   0 |   0\n   0   1 |   0\n   1   0 |   0\n   1   1 |   1':
    'enable d | d AND enable\n   0   0 |   0\n   0   1 |   0\n   1   0 |   0\n   1   1 |   1',
  'число | двоично | BCD\n  9   | 0001001 | 0000 1001\n 10   | 0001010 | 0001 0000\n 42   | 0101010 | 0100 0010\n 99   | 1100011 | 1001 1001':
    'number | binary  | BCD\n  9   | 0001001 | 0000 1001\n 10   | 0001010 | 0001 0000\n 42   | 0101010 | 0100 0010\n 99   | 1100011 | 1001 1001',
  'test | y\n  0  | сегменты цифры d\n  1  | 1111111 (горят все)':
    'test | y\n  0  | segments of the digit d\n  1  | 1111111 (all lit)',
  'Цифра на семи сегментах': 'A digit on seven segments',
  'Семь палочек': 'Seven sticks',
  'Цифру на индикаторе рисуют **семь сегментов**: палочки, которые называют буквами **a, b, c, d, e, f, g**. Чтобы показать «1», зажигают только b и c; чтобы показать «8», зажигают все семь.\n\nДвоичное число «4 бита = цифра» само по себе ничего не зажигает. Нужен переводчик: блок **«BCD → 7 сегментов (как 7447)»** из группы «Выбор». Он берёт цифру 0…9 и выдаёт 7 бит, по одному на сегмент.':
    'A digit on a display is drawn with **seven segments**: strips named with the letters **a, b, c, d, e, f, g**. To show "1", only b and c are lit; to show "8", all seven are lit.\n\nA binary number "4 bits = a digit" lights nothing by itself. A translator is needed: the **"BCD → 7 segments (like the 7447)"** block from the "Selection" group. It takes a digit 0…9 and outputs 7 bits, one per segment.',
  'Что на выходе блока': "What is on the block's output",
  'Выход блока — шина из 7 бит. **Младший бит — сегмент a**, старший — сегмент g. Единица значит «сегмент горит».\n\nДля цифры 1 горят b и c, поэтому выход равен `0000110` (читаем справа налево: a=0, b=1, c=1, остальные 0). Для кодов 10…15 это уже не цифры, и блок гасит все сегменты.':
    'The block\'s output is a 7-bit bus. The **low bit is segment a**, the high one is segment g. A one means "the segment is lit".\n\nFor the digit 1, b and c are lit, so the output is `0000110` (reading from right to left: a=0, b=1, c=1, the rest 0). For the codes 10…15 these are no longer digits, and the block turns all segments off.',
  'Какой сегмент соответствует младшему биту выхода блока «BCD → 7 сегментов»?':
    'Which segment corresponds to the low bit of the output of the "BCD → 7 segments" block?',
  'Сегмент a': 'Segment a',
  'Сегмент g': 'Segment g',
  'Сегмент, который показывает точку': 'The segment that shows the dot',
  'Бит 0 отвечает за сегмент a, бит 6 за сегмент g. Поэтому цифра 1 (сегменты b и c) даёт 0000110.':
    'Bit 0 is responsible for segment a, bit 6 for segment g. So the digit 1 (segments b and c) gives 0000110.',
  'Число n (4 бита) — цифра. Собери схему, в которой выход y из 7 бит задаёт сегменты этой цифры. Для n больше 9 все сегменты должны быть погашены.':
    'The number n (4 bits) is a digit. Build a circuit in which the 7-bit output y sets the segments of this digit. For n greater than 9 all segments must be off.',
  'Нужен один блок из группы «Выбор»: «BCD → 7 сегментов (как 7447)».':
    'You need one block from the "Selection" group: "BCD → 7 segments (like the 7447)".',
  'Соедини вход n со входом A блока, а выход Y блока — с y.':
    "Connect the input n to the block's input A, and the block's output Y to y.",
  'Цифры от 0 до F': 'Digits from 0 to F',
  'Шестнадцать значений в четырёх битах': 'Sixteen values in four bits',
  'Четыре бита могут принимать 16 значений: от 0 до 15. В десятичной записи цифр хватает только на 0…9. В шестнадцатеричной системе недостающие значения 10…15 записывают буквами **A, B, C, D, E, F**.\n\nНа семи сегментах буквы тоже можно нарисовать: A, C, E, F — большие; b и d — маленькие, чтобы не путать с 8 и 0.':
    'Four bits can take 16 values: from 0 to 15. In decimal notation there are digits only for 0…9. In the hexadecimal system the missing values 10…15 are written with the letters **A, B, C, D, E, F**.\n\nOn seven segments letters can also be drawn: A, C, E, F are capital; b and d are small, so as not to confuse them with 8 and 0.',
  'Блок с буквами': 'A block with letters',
  'В группе «Выбор» есть блок **«Шестнадцатеричная цифра → 7 сегментов»**. Он устроен так же, как блок для десятичных цифр, но на кодах 10…15 не гасит индикатор, а рисует букву.':
    'In the "Selection" group there is the **"Hexadecimal digit → 7 segments"** block. It is built the same way as the block for decimal digits, but for the codes 10…15 it does not turn the display off but draws a letter.',
  'Что покажет блок «BCD → 7 сегментов» на входе 1010 (десять)?':
    'What will the "BCD → 7 segments" block show on the input 1010 (ten)?',
  'Ничего, все сегменты погашены': 'Nothing, all segments are off',
  'Букву A': 'The letter A',
  'Цифру 0': 'The digit 0',
  'Блок для десятичных цифр знает только 0…9, на остальных кодах гасит сегменты. Буквы A…F рисует шестнадцатеричный блок.':
    'The block for decimal digits knows only 0…9, and on other codes it turns the segments off. The letters A…F are drawn by the hexadecimal block.',
  'Число n — один шестнадцатеричный разряд (4 бита). Выход y из 7 бит должен задавать сегменты цифры или буквы от 0 до F.':
    'The number n is one hexadecimal digit (4 bits). The 7-bit output y must set the segments of a digit or letter from 0 to F.',
  'Блок для десятичных цифр на кодах 10…15 гасит индикатор, а нужны буквы.':
    'The block for decimal digits turns the display off on the codes 10…15, but letters are needed.',
  'Возьми из группы «Выбор» блок «Шестнадцатеричная цифра → 7 сегментов» и соедини n → A, Y → y.':
    'Take the "Hexadecimal digit → 7 segments" block from the "Selection" group and connect n → A, Y → y.',
  'Число на четырёх светодиодах': 'A number on four LEDs',
  'Двоичный код на светодиодах': 'A binary code on LEDs',
  'Самый простой «индикатор» — по одному светодиоду на каждый бит числа. Горит светодиод — в этом разряде единица. Так число 5 (`0101`) читается как «выкл, вкл, выкл, вкл».':
    'The simplest "display" is one LED per bit of the number. An LED is lit: there is a one in that place. So the number 5 (`0101`) reads as "off, on, off, on".',
  'Светодиод платы горит нулём': "The board's LED lights with zero",
  'На плате светодиод включается **нулём**: порты называются `led_n`, где `n` значит «негатив». Поэтому, чтобы единица в числе зажигала светодиод, число нужно **перевернуть**: каждую единицу сделать нулём и наоборот.\n\nПереворот всех разрядов сразу делает блок **НЕ** (NOT), если задать ему ширину 4 бита вместо одного.':
    'On the board an LED turns on with **zero**: the ports are called `led_n`, where `n` means "negative". So for a one in the number to light an LED, the number must be **flipped**: every one made a zero and vice versa.\n\nFlipping all places at once is done by the **NOT** block, if you give it a width of 4 bits instead of one.',
  'Какой код нужно подать на светодиоды платы, чтобы горел только самый правый?':
    "What code must be fed to the board's LEDs so that only the rightmost one is lit?",
  'Светодиод платы горит при нуле. Нужен ноль в самом правом разряде и единицы в остальных: 1110. Это число 0001, перевёрнутое блоком НЕ.':
    "The board's LED lights at zero. You need a zero in the rightmost place and ones in the rest: 1110. This is the number 0001 flipped by the NOT block.",
  'Число n — 4 бита. Выход y должен быть перевёрнутым числом (каждый бит наоборот), чтобы на плате светились светодиоды по двоичному коду числа.':
    'The number n is 4 bits. The output y must be the flipped number (each bit the opposite), so that on the board the LEDs light according to the binary code of the number.',
  'Нужен блок НЕ, но он по умолчанию однобитный.':
    'You need a NOT block, but by default it is one-bit.',
  'В параметрах блока НЕ поставь ширину 4 бита, соедини n → A и Y → y.':
    "In the NOT block's parameters set the width to 4 bits, connect n → A and Y → y.",
  'Термометрический код': 'Thermometer code',
  'Столбик, как у градусника': 'A column like a thermometer',
  'В **термометрическом коде** число показывают столбиком: чем больше число, тем больше единиц подряд, начиная с младшего разряда. Число 2 из трёх разрядов — `011`, число 3 — `111`.\n\nТак устроены шкалы уровня громкости и заряда: «сколько светодиодов горит» — это и есть число.':
    'In a **thermometer code** a number is shown as a column: the larger the number, the more ones in a row, starting from the low place. The number 2 in three places is `011`, the number 3 is `111`.\n\nThis is how volume and charge level scales work: "how many LEDs are lit" is the number.',
  'Каждый светодиод — своё сравнение': 'Each LED is its own comparison',
  'Разряд номер **i** выхода равен единице, когда число **больше i**. Разряд 0 — «n > 0», разряд 1 — «n > 1», разряд 2 — «n > 2».\n\nКаждое такое условие считает блок **Компаратор** (группа «Математика») с выходом `GT` («A больше B»): на вход A идёт число, на вход B — константа с номером разряда. Три однобитных результата собирает в шину блок **Объединение шин**: вход A — старший бит, последний — младший.':
    'Place number **i** of the output is one when the number is **greater than i**. Place 0 is "n > 0", place 1 is "n > 1", place 2 is "n > 2".\n\nEach such condition is computed by a **Comparator** block (the "Math" group) with the output `GT` ("A greater than B"): the number goes to input A, and a constant with the place number to input B. The three one-bit results are assembled into a bus by the **Bus merge** block: input A is the high bit, the last is the low one.',
  'Какой термометрический код (3 бита) у числа 1?':
    'What is the 3-bit thermometer code of the number 1?',
  'Число 1 больше только нуля, поэтому единица одна и стоит в младшем разряде: 001. Код 011 — это число 2.':
    'The number 1 is greater only than zero, so there is a single one and it stands in the low place: 001. The code 011 is the number 2.',
  'Число n от 0 до 3 (2 бита). Выход y из 3 бит: столько единиц, чему равно n, начиная с младшего разряда (0 → 000, 1 → 001, 2 → 011, 3 → 111).':
    'The number n from 0 to 3 (2 bits). The 3-bit output y: as many ones as n equals, starting from the low place (0 → 000, 1 → 001, 2 → 011, 3 → 111).',
  'Разряд i выхода равен 1, когда n > i. Нужны три сравнения: с 0, с 1 и с 2.':
    'Place i of the output is 1 when n > i. Three comparisons are needed: with 0, with 1 and with 2.',
  'Три компаратора с выходом GT (ширина 2 бита), к входам B — константы 0, 1, 2 шириной 2 бита.':
    'Three comparators with the GT output (width 2 bits), constants 0, 1, 2 of width 2 bits on the inputs B.',
  'Объедини результаты блоком «Объединение шин» из трёх частей: вход A — старший бит (n > 2), B — n > 1, C — n > 0.':
    'Combine the results with a "Bus merge" block of three parts: input A is the high bit (n > 2), B is n > 1, C is n > 0.',
  'Одна горящая позиция': 'One lit position',
  '«Один из N»': '"One of N"',
  'Бегущий огонёк, указатель на шкале, выбор строки в таблице: везде горит **ровно одна** позиция из нескольких, а её номер задаёт число. Такой код называют **«один из N»** (по-английски one-hot, «одна горячая»).\n\nДля числа 5 из восьми позиций получится `00100000`: единица стоит в разряде номер 5, если считать справа и с нуля.':
    'A running light, a pointer on a scale, a row choice in a table: everywhere **exactly one** position out of several is lit, and its number is set by a number. Such a code is called **"one of N"** (one-hot).\n\nFor the number 5 out of eight positions we get `00100000`: the one is in the place number 5, counting from the right and from zero.',
  'Эту работу делает блок **Дешифратор** (группа «Выбор»). В его параметрах задают, сколько разрядов на входе: при 3 разрядах на выходе 8 линий. Блок берёт двоичное число на входе A и ставит единицу в линию с этим номером, остальные линии равны нулю.':
    'This work is done by the **Decoder** block (the "Selection" group). In its parameters you set how many bits are on the input: with 3 bits there are 8 lines on the output. The block takes the binary number on the input A and puts a one on the line with that number, the other lines are zero.',
  'Сколько линий на выходе у дешифратора с тремя разрядами на входе?':
    'How many lines does a decoder with three bits on the input have on the output?',
  'Три бита дают 2 в степени 3, то есть 8 разных чисел, и у каждого своя линия. Две единицы одновременно на выходе дешифратора не бывают.':
    "Three bits give 2 to the power 3, that is 8 different numbers, and each has its own line. Two ones at once never occur on a decoder's output.",
  'Число n (3 бита) — номер позиции. Выход y из 8 бит: единица только в разряде с номером n, остальные нули.':
    'The number n (3 bits) is the position number. The 8-bit output y: a one only in the place with number n, the rest zeros.',
  'Нужен блок «Дешифратор» из группы «Выбор».':
    'You need the "Decoder" block from the "Selection" group.',
  'В параметрах блока поставь «Разрядов на входе» равным 3, соедини n → A и Y → y.':
    'In the block\'s parameters set "Input bits" to 3, connect n → A and Y → y.',
  'Цифры только до девяти': 'Digits only up to nine',
  'Не всякий код — цифра': 'Not every code is a digit',
  'Четыре бита дают числа 0…15, а десятичных цифр всего десять. Шестнадцатеричный блок для кодов 10…15 рисует буквы, но иногда буквы не нужны: на часах или счётчике «B» вместо цифры выглядит как ошибка.\n\nЗначит, нужен **сторож**: если число не больше 9, показываем цифру, иначе гасим индикатор.':
    'Four bits give numbers 0…15, and there are only ten decimal digits. The hexadecimal block draws letters for the codes 10…15, but sometimes letters are not needed: on a clock or counter a "B" instead of a digit looks like an error.\n\nSo a **guard** is needed: if the number is not greater than 9, we show the digit, otherwise we turn the display off.',
  'Сравнение и выбор': 'Comparison and choice',
  'Сторож состоит из двух шагов.\n\n- Блок **Компаратор** с выходом `LE` («A меньше или равно B») сравнивает число с константой 9 и выдаёт 1 для цифр.\n- Блок **Мультиплексор** 2:1 на семь бит по этому сигналу выбирает: при `S = 1` пропускает сегменты цифры, при `S = 0` — константу `0000000` (все сегменты погашены).\n\nМультиплексор — это переключатель: вход S решает, какой из двух входов D0 или D1 попадёт на выход.':
    'The guard consists of two steps.\n\n- A **Comparator** block with the output `LE` ("A less than or equal to B") compares the number with the constant 9 and gives 1 for digits.\n- A 2:1 **Multiplexer** block of seven bits chooses by this signal: with `S = 1` it passes the digit\'s segments, with `S = 0` the constant `0000000` (all segments off).\n\nA multiplexer is a switch: the input S decides which of the two inputs D0 or D1 goes to the output.',
  'Какой выход компаратора даёт 1 при n ≤ 9?': 'Which comparator output gives 1 at n ≤ 9?',
  'LE («меньше или равно»)': 'LE ("less than or equal")',
  'GT («больше»)': 'GT ("greater")',
  'EQ («равно»)': 'EQ ("equal")',
  'LE выдаёт 1, когда A меньше или равно B. Для цифр 0…9 при B = 9 это ровно нужное условие. EQ был бы 1 только для самой девятки.':
    'LE gives 1 when A is less than or equal to B. For the digits 0…9 with B = 9 this is exactly the needed condition. EQ would be 1 only for nine itself.',
  'Число n (4 бита). Выход y из 7 бит: сегменты цифры n, если n не больше 9, иначе все сегменты погашены (0000000). Для цифры используй шестнадцатеричный блок, а гасить для 10…15 должна твоя схема.':
    'The number n (4 bits). The 7-bit output y: the segments of the digit n if n is not greater than 9, otherwise all segments off (0000000). For the digit use the hexadecimal block, and turning off for 10…15 must be done by your circuit.',
  'Нужно сравнить n с 9: компаратор с выходом LE и константа 9 шириной 4 бита.':
    'You need to compare n with 9: a comparator with the LE output and a constant 9 of width 4 bits.',
  'Мультиплексор 2:1 шириной 7 бит: на D1 — сегменты цифры, на D0 — константа 0 шириной 7 бит.':
    "A 2:1 multiplexer 7 bits wide: the digit's segments on D1, a constant 0 of width 7 bits on D0.",
  'Сигнал LE подай на вход S мультиплексора: при 1 он выберет D1, то есть цифру.':
    "Feed the LE signal to the multiplexer's input S: at 1 it will choose D1, that is the digit.",
  'Маска: погасить по команде': 'A mask: turn off on command',
  'И как выключатель': 'AND as a switch',
  'Элемент **И** обладает полезным свойством: если один его вход равен 0, выход тоже 0, что бы ни было на другом. А если вход равен 1, элемент просто пропускает второй сигнал дальше.\n\nЗначит, **И** с сигналом `enable` работает как выключатель: при `enable = 1` данные проходят, при `enable = 0` выход обнулён.':
    'The **AND** gate has a useful property: if one of its inputs is 0, the output is also 0, whatever is on the other. And if the input is 1, the gate simply passes the second signal on.\n\nSo **AND** with the signal `enable` works as a switch: with `enable = 1` the data passes, with `enable = 0` the output is zeroed.',
  'Маска на всю шину': 'A mask for the whole bus',
  'Чтобы погасить сразу четыре бита, нужна **маска** из четырёх одинаковых разрядов: `1111` пропускает всё, `0000` гасит всё. Маску делают из одного сигнала `enable`, подав его на четыре входа блока **Объединение шин**. Дальше блок **И** шириной 4 бита соединяет данные с маской побитно.':
    'To turn off four bits at once, you need a **mask** of four identical places: `1111` passes everything, `0000` turns everything off. The mask is made from a single signal `enable`, fed to four inputs of the **Bus merge** block. Then an **AND** block 4 bits wide joins the data with the mask bit by bit.',
  'Что будет на выходе, если данные 1011, а маска 0000, элемент И?':
    'What will be on the output if the data is 1011 and the mask is 0000, with an AND gate?',
  'И работает с каждым разрядом отдельно: единица получается только там, где единицы и в данных, и в маске. В маске единиц нет, значит весь выход нулевой.':
    'AND works with each place separately: a one results only where there are ones both in the data and in the mask. The mask has no ones, so the whole output is zero.',
  'Данные d (4 бита) и разрешение enable (1 бит). Выход y равен d, пока enable = 1, и 0000, когда enable = 0.':
    'The data d (4 bits) and the enable (1 bit). The output y equals d while enable = 1, and 0000 when enable = 0.',
  'Нужен блок И шириной 4 бита: на один вход данные, на другой маска.':
    'You need an AND block 4 bits wide: the data on one input, the mask on the other.',
  'Маска из четырёх копий enable: блок «Объединение шин» из 4 частей по одному биту.':
    'A mask of four copies of enable: a "Bus merge" block of 4 parts of one bit each.',
  'Подай enable на все четыре входа объединения, его выход — на второй вход И.':
    'Feed enable to all four inputs of the merge, and its output to the second input of AND.',
  'Две десятичные цифры': 'Two decimal digits',
  'Десятки и единицы': 'Tens and units',
  'Чтобы показать число 0…99 на двух индикаторах, его нужно разложить на десятки и единицы. Число 42 — это цифры 4 и 2. Но в двоичном виде 42 — это `101010`, и никакие два бита в нём не равны «четвёрке десятков».\n\nПоэтому цифры хранят **BCD-кодом** (двоично-десятичным): каждая десятичная цифра записана своими **четырьмя битами**. 42 в BCD — это `0100 0010`.':
    'To show a number 0…99 on two displays, it must be split into tens and units. The number 42 is the digits 4 and 2. But in binary 42 is `101010`, and no two bits in it equal the "four of the tens".\n\nSo the digits are stored in **BCD code** (binary-coded decimal): each decimal digit is written with its own **four bits**. 42 in BCD is `0100 0010`.',
  'Перевод блоком': 'Conversion with a block',
  'Блок **«Двоичный → BCD»** (группа «Выбор») берёт число и выдаёт десятичные цифры, по четыре бита на цифру. Для семибитного числа он готовит три цифры (до 127), поэтому выход у него 12 бит: старшая цифра сотен, дальше десятки и единицы.\n\nНам нужны только десятки и единицы, то есть младшие 8 бит. Их достаёт блок **Срез шины**: задаёшь ширину входа 12 бит, младший бит 0 и старший бит 7.':
    'The **"Binary → BCD"** block (the "Selection" group) takes a number and outputs decimal digits, four bits per digit. For a seven-bit number it prepares three digits (up to 127), so its output is 12 bits: the high digit is hundreds, then tens and units.\n\nWe need only tens and units, that is the low 8 bits. They are taken out by the **Bus slice** block: you set the input width to 12 bits, the low bit 0 and the high bit 7.',
  'Как выглядит число 25 в BCD?': 'What does the number 25 look like in BCD?',
  'Каждая цифра пишется своими четырьмя битами: 2 это 0010, 5 это 0101. Вариант 0001 1001 — это двоичное 25 (11001), но не BCD.':
    'Each digit is written with its own four bits: 2 is 0010, 5 is 0101. The variant 0001 1001 is the binary 25 (11001), but not BCD.',
  'Число n от 0 до 99 (7 бит). Выход y из 8 бит: в старших четырёх битах цифра десятков, в младших — цифра единиц, в двоичном коде (BCD).':
    'The number n from 0 to 99 (7 bits). The 8-bit output y: in the high four bits the tens digit, in the low ones the units digit, in binary code (BCD).',
  'Нужен блок «Двоичный → BCD», ширина двоичного числа 7 бит.':
    'You need the "Binary → BCD" block, binary number width 7 bits.',
  'Выход блока — 12 бит (три цифры), а нужны две. Возьми блок «Срез шины».':
    'The block\'s output is 12 bits (three digits), and you need two. Take the "Bus slice" block.',
  'Срез: ширина входа 12, младший бит 0, старший бит 7. Соедини n → конвертер → срез → y.':
    'The slice: input width 12, low bit 0, high bit 7. Connect n → converter → slice → y.',
  'Проверка индикатора': 'Display test',
  'Зачем зажигать всё сразу': 'Why light everything at once',
  'У многих устройств есть режим **проверки индикатора** (lamp test): нажал кнопку, и все сегменты горят. Так сразу видно, что палочка не перегорела и не оторван провод.\n\nНа схеме это переключатель: обычно на индикатор идёт цифра, а по сигналу `test` — «все семь сегментов включены».':
    'Many devices have a **display test** mode (lamp test): press a button, and all segments are lit. This immediately shows that no strip has burned out and no wire is broken.\n\nIn the circuit this is a switch: normally the digit goes to the display, and on the signal `test` "all seven segments are on".',
  'Выбираем между двумя кодами': 'Choosing between two codes',
  'Выбор из двух вариантов делает **Мультиплексор** 2:1. Чтобы он работал с семью сегментами сразу, задай ему ширину 7 бит.\n\n- При `test = 0` на выход идут сегменты цифры из блока «BCD → 7 сегментов».\n- При `test = 1` на выход идёт константа `1111111` (в десятичной записи 127, ширина 7 бит).':
    'A choice of two variants is made by a 2:1 **Multiplexer**. To make it work with seven segments at once, give it a width of 7 bits.\n\n- With `test = 0` the digit\'s segments from the "BCD → 7 segments" block go to the output.\n- With `test = 1` the constant `1111111` goes to the output (127 in decimal, width 7 bits).',
  'Какая константа шириной 7 бит зажигает все сегменты?':
    'Which 7-bit constant lights all segments?',
  'Единица в бите значит «сегмент горит», поэтому нужны единицы во всех семи разрядах: 1111111, то есть 127.':
    'A one in a bit means "the segment is lit", so you need ones in all seven places: 1111111, that is 127.',
  'Цифра d (4 бита) и сигнал test. Выход y из 7 бит: при test = 0 сегменты цифры d (для d больше 9 — все погашены), при test = 1 горят все сегменты (1111111).':
    'The digit d (4 bits) and the signal test. The 7-bit output y: with test = 0 the segments of the digit d (for d greater than 9 all are off), with test = 1 all segments are lit (1111111).',
  'Понадобятся блок «BCD → 7 сегментов», константа и мультиплексор 2:1.':
    'You will need the "BCD → 7 segments" block, a constant and a 2:1 multiplexer.',
  'Константа шириной 7 бит со значением 127 — это 1111111. Мультиплексор тоже шириной 7 бит.':
    'A constant of width 7 bits with the value 127 is 1111111. The multiplexer is also 7 bits wide.',
  'test подай на S мультиплексора; D0 — сегменты цифры, D1 — константа 127.':
    "Feed test to S of the multiplexer; D0 is the digit's segments, D1 is the constant 127.",
  'a b c | большинство\n0 0 0 |  0\n0 0 1 |  0\n0 1 0 |  0\n0 1 1 |  1\n1 0 0 |  0\n1 0 1 |  1\n1 1 0 |  1\n1 1 1 |  1':
    'a b c | majority\n0 0 0 |  0\n0 0 1 |  0\n0 1 0 |  0\n0 1 1 |  1\n1 0 0 |  0\n1 0 1 |  1\n1 1 0 |  1\n1 1 1 |  1',
  'op | действие\n00 | a + b\n01 | a − b  (по модулю 8)\n10 | a И b   (по битам)\n11 | a ИЛИ b  (по битам)':
    'op | action\n00 | a + b\n01 | a − b  (modulo 8)\n10 | a AND b   (bitwise)\n11 | a OR b  (bitwise)',
  'слово     единиц  ошибка\n10111       4       0\n10110       3       1\n00000       0       0':
    'word     ones  error\n10111      4      0\n10110      3      1\n00000      0      0',
  'выход | смысл\n 00   | a = b\n 01   | a < b\n 10   | a > b':
    'output | meaning\n 00   | a = b\n 01   | a < b\n 10   | a > b',
  'цифра | gfedcba\n  0   | 0111111\n  1   | 0000110\n  2   | 1011011\n  3   | 1001111\n  4   | 1100110\n  5   | 1101101\n  6   | 1111101\n  7   | 0000111\n  8   | 1111111\n  9   | 1101111':
    'digit | gfedcba\n  0   | 0111111\n  1   | 0000110\n  2   | 1011011\n  3   | 1001111\n  4   | 1100110\n  5   | 1101101\n  6   | 1111101\n  7   | 0000111\n  8   | 1111111\n  9   | 1101111',
  'адрес: 0   1   2   3    4    5    6    7  8    9\nслово: 63  6   91  79   102  109  125  7  127  111':
    'address: 0   1   2   3    4    5    6    7  8    9\nword:    63  6   91  79   102  109  125  7  127  111',
  'такт:    0  1  2  3  4  5  6  7\nsensor:  0  0  0  1  0  0  0  0\nтревога: 0  0  0  1  1  1  1  1':
    'clock:   0  1  2  3  4  5  6  7\nsensor:  0  0  0  1  0  0  0  0\nalarm:   0  0  0  1  1  1  1  1',
  'такт:  3  4  5  6  7\nx:     1  0  0  0  0\nQ:    001 010 100 000 000\ny:     1  1  1  0  0':
    'clock: 3  4  5  6  7\nx:     1  0  0  0  0\nQ:    001 010 100 000 000\ny:     1  1  1  0  0',
  'x:     0 1 0 0 1 1 1 0 0\nprev:  0 0 1 0 0 1 1 1 0\ny:     0 0 0 0 0 0 1 1 1   (после такта)':
    'x:     0 1 0 0 1 1 1 0 0\nprev:  0 0 1 0 0 1 1 1 0\ny:     0 0 0 0 0 0 1 1 1   (after the clock)',
  'такт  d     сумма\n  2    3       3\n  3    3       6\n  4    4      10\n  5    0      10\n  6    9       3   (19 − 16)':
    'clock  d     sum\n  2    3       3\n  3    3       6\n  4    4      10\n  5    0      10\n  6    9       3   (19 − 16)',
  'Голосование «2 из 3» с охраной': 'A "2 of 3" vote with a guard',
  'Решение большинством': 'A decision by majority',
  'Три датчика a, b и c независимо проверяют одно и то же, например дверь. Один датчик может сломаться и соврать, поэтому тревогу объявляют, только если **согласились хотя бы двое из трёх**. Такая схема называется **мажоритарной** (от слова «большинство»).\n\nХотя бы двое согласны, если единицы есть в одной из пар: a и b, или a и c, или b и c.':
    'Three sensors a, b and c independently check the same thing, for example a door. One sensor may break and lie, so the alarm is raised only if **at least two out of three agree**. Such a circuit is called a **majority** circuit.\n\nAt least two agree if there are ones in one of the pairs: a and b, or a and c, or b and c.',
  'Выключатель охраны': 'The guard switch',
  'Теперь добавим вход **arm**: «охрана включена». Если охрана выключена (arm = 0), тревоги быть не должно, как бы ни голосовали датчики.\n\nЗначит, ответ получается так: сначала три пары через **И**, потом их объединение через **ИЛИ**, а в конце ещё одно **И** с arm. Блоки «И» и «ИЛИ» умеют иметь три входа: число входов меняют в свойствах блока.':
    'Now let us add an input **arm**: "the guard is on". If the guard is off (arm = 0), there must be no alarm, however the sensors vote.\n\nSo the answer is obtained like this: first three pairs through **AND**, then their combination through **OR**, and at the end one more **AND** with arm. The "AND" and "OR" blocks can have three inputs: the number of inputs is changed in the block\'s properties.',
  'Охрана включена, датчик a показывает 1, а b и c показывают 0. Что даст схема?':
    'The guard is on, sensor a shows 1, and b and c show 0. What will the circuit give?',
  '0: согласен только один датчик из трёх': '0: only one sensor out of three agrees',
  '1: достаточно одного сработавшего датчика': '1: one triggered sensor is enough',
  '0, но только потому что отключён arm': '0, but only because arm is off',
  'Для единицы нужны хотя бы две единицы среди a, b, c. Одиночный сигнал считается ложным срабатыванием.':
    'For a one you need at least two ones among a, b, c. A single signal is considered a false trigger.',
  'Собери схему: y равен 1, когда arm = 1 и хотя бы два из трёх датчиков a, b, c равны 1.':
    'Build a circuit: y equals 1 when arm = 1 and at least two of the three sensors a, b, c are 1.',
  'Сначала решите задачу без arm: нужны три блока «И» для пар и один «ИЛИ».':
    'First solve the task without arm: you need three "AND" blocks for the pairs and one "OR".',
  'Блоку «ИЛИ» поставь три входа в свойствах: он объединит результаты трёх пар.':
    'Give the "OR" block three inputs in its properties: it will combine the results of the three pairs.',
  'Выход «ИЛИ» и вход arm подай на ещё один блок «И»; его выход соедини с y.':
    'Feed the "OR" output and the input arm to one more "AND" block; connect its output to y.',
  'АЛУ на два бита': 'A two-bit ALU',
  'Одно устройство — четыре действия': 'One device, four actions',
  '**АЛУ** (арифметико-логическое устройство) умеет несколько операций над двумя числами. Какую выполнить, говорит код операции **op**. Внутри оно устроено просто: все операции считаются одновременно, а потом **мультиплексор** пропускает на выход нужный результат.\n\nВ нашем АЛУ два двухбитных числа a и b (от 0 до 3) и операции:':
    'An **ALU** (arithmetic logic unit) can do several operations on two numbers. Which one to perform is said by the operation code **op**. Inside it is simple: all operations are computed at the same time, and then a **multiplexer** passes the needed result to the output.\n\nOur ALU has two two-bit numbers a and b (from 0 to 3) and the operations:',
  'Ширина результата': 'The width of the result',
  'Сумма 3 + 3 = 6 в двух битах не помещается, поэтому выход делаем **трёхбитным**. Чтобы блоки работали с одной шириной, оба числа сначала расширяем нулями слева блоком «Дополнить нулями» до 3 бит.\n\nВычитание считается по модулю 8: например, 1 − 2 даёт 7 (двоичное 111), потому что при выходе за ноль счёт идёт с максимума.\n\nВходы в этом уроке отдельные: a1 и a0 (старший и младший биты a), b1 и b0, op1 и op0. Из пар битов в шину их собирает блок «Биты → шину»: контакт B0 — младший бит, B1 — старший.':
    'The sum 3 + 3 = 6 does not fit in two bits, so we make the output **three-bit**. So that the blocks work with one width, both numbers are first extended with zeros on the left by the "Zero extend" block to 3 bits.\n\nSubtraction is computed modulo 8: for example, 1 − 2 gives 7 (binary 111), because going past zero the count goes from the maximum.\n\nThe inputs in this lesson are separate: a1 and a0 (the high and low bits of a), b1 and b0, op1 and op0. The "Bits → bus" block assembles them from pairs of bits into a bus: the pin B0 is the low bit, B1 is the high one.',
  'Что делает мультиплексор 4:1 в этом АЛУ?': 'What does the 4:1 multiplexer do in this ALU?',
  'Выбирает один из четырёх готовых результатов по коду op':
    'Chooses one of four ready results by the code op',
  'Складывает четыре числа сразу': 'Adds four numbers at once',
  'Расширяет число с двух бит до трёх': 'Extends a number from two bits to three',
  'Сумма, разность, И и ИЛИ считаются всегда; мультиплексор по двум битам op пропускает на выход только один из них.':
    'The sum, difference, AND and OR are always computed; the multiplexer by the two bits of op passes only one of them to the output.',
  'Собери АЛУ: y (3 бита) равен a + b при op = 00, a − b при 01, a И b при 10 и a ИЛИ b при 11. Все операции дают трёхбитный результат; разность считай по модулю 8.':
    'Build an ALU: y (3 bits) equals a + b at op = 00, a − b at 01, a AND b at 10 and a OR b at 11. All operations give a three-bit result; compute the difference modulo 8.',
  'Собери из отдельных битов три шины по 2 бита: a, b и op. Нужны три блока «Биты → шину».':
    'From the separate bits assemble three buses of 2 bits: a, b and op. You need three "Bits → bus" blocks.',
  'Дополни a и b нулями до 3 бит и подай их на четыре блока: сумматор, вычитатель, побитовое И, побитовое ИЛИ. Всем им поставь ширину 3.':
    'Extend a and b with zeros to 3 bits and feed them to four blocks: an adder, a subtractor, a bitwise AND, a bitwise OR. Set the width to 3 for all of them.',
  'Выходы четырёх блоков подай по порядку на входы D0…D3 мультиплексора 4:1 шириной 3, а на S подай шину op.':
    'Feed the outputs of the four blocks in order to the inputs D0…D3 of a 4:1 multiplexer 3 bits wide, and feed the bus op to S.',
  'Проверка чётности слова': 'Word parity check',
  'Лишний бит для контроля': 'An extra bit for control',
  'Данные по проводам или по радио могут исказиться: один бит перевернулся. Чтобы заметить это, к слову добавляют **бит чётности** p. Его выбирают так, чтобы во всём пятибитном слове (четыре бита данных и p) число единиц было **чётным**.\n\nПример: данные 1011 содержат три единицы, значит, p = 1, и получается 10111, то есть четыре единицы.':
    'Data over wires or over radio may get corrupted: one bit flipped. To notice this, a **parity bit** p is added to the word. It is chosen so that in the whole five-bit word (four data bits and p) the number of ones is **even**.\n\nExample: the data 1011 contains three ones, so p = 1, and we get 10111, that is four ones.',
  'Проверяем при приёме': 'Checking on reception',
  'Принимающая сторона считает единицы во всём слове. Если их число стало нечётным, один бит точно исказился: **выход ошибки равен 1**.\n\nСчитать «чётно или нечётно» умеет элемент **исключающее ИЛИ**: на двух входах он даёт 1, когда единиц нечётное число, а на нескольких входах это правило сохраняется. Поэтому вся проверка — один блок XOR с пятью входами.':
    'The receiving side counts the ones in the whole word. If their number became odd, one bit has definitely been corrupted: **the error output is 1**.\n\nCounting "even or odd" is done by the **exclusive OR** gate: on two inputs it gives 1 when the number of ones is odd, and on several inputs this rule is preserved. So the whole check is one XOR block with five inputs.',
  'Слово 11000 (в нём данные 1100 и p = 0). Есть ли ошибка?':
    'The word 11000 (it holds the data 1100 and p = 0). Is there an error?',
  'Нет: единиц две, число чётное': 'No: there are two ones, an even number',
  'Да: p должен быть равен 1': 'Yes: p must be 1',
  'Да: в слове больше единиц, чем нулей': 'Yes: the word has more ones than zeros',
  'Две единицы дают чётное число, значит, проверка проходит и y = 0. Правило смотрит только на чётность числа единиц.':
    'Two ones give an even number, so the check passes and y = 0. The rule looks only at the evenness of the number of ones.',
  'Слово состоит из четырёх бит данных d3…d0 и бита чётности p. Собери схему, у которой y = 1, если число единиц в слове нечётное (то есть слово исказилось).':
    'The word consists of four data bits d3…d0 and a parity bit p. Build a circuit with y = 1 if the number of ones in the word is odd (that is, the word was corrupted).',
  'Нужно узнать, нечётно ли число единиц среди пяти входов. С этим справляется один тип блока из группы «Логика».':
    'You need to find out whether the number of ones among five inputs is odd. One type of block from the "Logic" group can do this.',
  'Возьми «Исключающее ИЛИ (XOR)» и поставь ему 5 входов. Подключи d3, d2, d1, d0 и p, а выход соедини с y.':
    'Take "Exclusive OR (XOR)" and give it 5 inputs. Connect d3, d2, d1, d0 and p, and connect the output to y.',
  'Трёхсторонний компаратор': 'A three-way comparator',
  'Три ответа вместо двух': 'Three answers instead of two',
  'Компаратор отвечает на вопрос «как соотносятся числа a и b?». Ответов три: **равны**, **a меньше b** или **a больше b**. Закодируем их двумя битами:':
    'A comparator answers the question "how do the numbers a and b relate?". There are three answers: **equal**, **a less than b** or **a greater than b**. Let us encode them with two bits:',
  'Собираем код из флажков': 'Assembling the code from flags',
  'Блок «Компаратор» умеет выдавать отдельные флажки: LT («меньше») и GT («больше»). Выберем в его свойствах только их. Равенство отдельного флажка не требует: если не горит ни LT, ни GT, значит числа равны, и код сам получится 00.\n\nОсталось собрать два флажка в двухбитный выход: GT станет старшим битом (B1), LT младшим (B0).\n\nЧисла a и b двухбитные; их из отдельных входов a1, a0, b1, b0 собирает блок «Биты → шину».':
    'The "Comparator" block can output separate flags: LT ("less") and GT ("greater"). Let us choose only them in its properties. Equality does not need a separate flag: if neither LT nor GT is lit, the numbers are equal, and the code comes out as 00 by itself.\n\nWhat remains is to combine the two flags into a two-bit output: GT becomes the high bit (B1), LT the low bit (B0).\n\nThe numbers a and b are two-bit; the "Bits → bus" block assembles them from the separate inputs a1, a0, b1, b0.',
  'Какой код выйдет при a = 3 и b = 1?': 'What code will come out for a = 3 and b = 1?',
  '10, потому что a больше b': '10, because a is greater than b',
  '01, потому что a больше b': '01, because a is greater than b',
  '00, потому что числа не равны': '00, because the numbers are not equal',
  'Для a > b в старшем бите стоит единица: код 10. Код 01 означал бы «a меньше b», а 00 только «равны».':
    'For a > b the high bit is one: the code 10. The code 01 would mean "a less than b", and 00 only "equal".',
  'Собери компаратор двухбитных чисел a (биты a1, a0) и b (биты b1, b0). Выход y двухбитный: 00 при a = b, 01 при a < b, 10 при a > b.':
    'Build a comparator of the two-bit numbers a (bits a1, a0) and b (bits b1, b0). The output y is two-bit: 00 for a = b, 01 for a < b, 10 for a > b.',
  'Из пар битов собери две шины по 2 бита блоками «Биты → шину» и подай их на компаратор шириной 2.':
    'From pairs of bits assemble two buses of 2 bits with "Bits → bus" blocks and feed them to a comparator 2 wide.',
  'В свойствах компаратора оставь только выходы «A < B» и «A > B».':
    'In the comparator\'s properties leave only the outputs "A < B" and "A > B".',
  'Ещё один блок «Биты → шину» шириной 2: B0 получает LT, B1 получает GT. Его выход соедини с y.':
    'One more "Bits → bus" block of width 2: B0 gets LT, B1 gets GT. Connect its output to y.',
  'Счётчик на семисегментный индикатор': 'A counter to a seven-segment display',
  '**Семисегментный индикатор** рисует цифру семью палочками-сегментами a, b, c, d, e, f, g. Чтобы показать цифру, надо включить нужный набор сегментов. Соберём семь бит `gfedcba`: младший бит управляет сегментом a, старший сегментом g, единица зажигает сегмент.\n\nНапример, цифре 1 нужны только сегменты b и c: это 0000110.':
    'A **seven-segment display** draws a digit with seven strip segments a, b, c, d, e, f, g. To show a digit, the right set of segments must be turned on. Let us assemble seven bits `gfedcba`: the low bit controls segment a, the high one segment g, a one lights a segment.\n\nFor example, the digit 1 needs only segments b and c: that is 0000110.',
  'Счётчик плюс таблица': 'A counter plus a table',
  'Схема состоит из двух частей. **Счётчик по модулю 10** на каждом такте переходит к следующей цифре: 0, 1, … 9 и снова 0. А **таблица** (блок «Таблица (ПЗУ)») по номеру цифры выдаёт семь сегментов. Такую таблицу ещё называют дешифратором для индикатора.\n\nУ счётчика включи синхронное обнуление CLR и подай на него сигнал reset: пока reset = 1, счёт стоит на нуле. Блок «Счётчик» берёт такт со входа clk.':
    'The circuit consists of two parts. A **modulo-10 counter** on each clock moves to the next digit: 0, 1, … 9 and 0 again. And a **table** (the "Table (ROM)" block) outputs the seven segments by the digit number. Such a table is also called a display decoder.\n\nFor the counter turn on the synchronous clear CLR and feed the signal reset to it: while reset = 1, the count stands at zero. The "Counter" block takes the clock from the input clk.',
  'Заполняем таблицу': 'Filling the table',
  'В свойствах таблицы задай 4 разряда адреса и ширину слова 7 бит. В ячейках пишут десятичные числа, а не двоичные: цифре 0 соответствует 63, потому что 0111111 это 63. Ячейки 10…15 счётчик по модулю 10 не использует: оставь там 0.':
    "In the table's properties set 4 address bits and a word width of 7 bits. In the cells write decimal numbers, not binary: the digit 0 corresponds to 63, because 0111111 is 63. Cells 10…15 are not used by the modulo-10 counter: leave 0 there.",
  'Что будет, если вместо счётчика по модулю 10 поставить обычный четырёхбитный счётчик?':
    'What will happen if instead of a modulo-10 counter you put an ordinary four-bit counter?',
  'После цифры 9 пойдут номера 10…15, для которых в таблице нули, индикатор погаснет':
    'After the digit 9 the numbers 10…15 will go, for which the table has zeros, and the display will go off',
  'Счёт станет быстрее': 'Counting will become faster',
  'Индикатор покажет цифры в обратном порядке': 'The display will show the digits in reverse order',
  'Обычный счётчик считает до 15, а цифр всего десять. Ограничение «модуль 10» возвращает счёт к нулю после девятки.':
    'An ordinary counter counts to 15, and there are only ten digits. The "modulo 10" limit returns the count to zero after nine.',
  'Собери счётчик цифр 0…9 для семисегментного индикатора. Выход y (7 бит, gfedcba, единица включает сегмент) показывает текущую цифру. Пока reset = 1, показывается 0.':
    'Build a digit counter 0…9 for a seven-segment display. The output y (7 bits, gfedcba, a one turns a segment on) shows the current digit. While reset = 1, 0 is shown.',
  'Сброс: цифра 0': 'Reset: digit 0',
  'После сброса: цифра 1': 'After reset: digit 1',
  'Цифра 2': 'Digit 2',
  'Цифра 5': 'Digit 5',
  'Цифра 8': 'Digit 8',
  'Цифра 9': 'Digit 9',
  'После 9 снова 0': 'After 9, 0 again',
  'И опять 1': 'And 1 again',
  'Нужны два блока: «Счётчик» из группы «Память» и «Таблица (ПЗУ)» из группы «Выбор и кодирование».':
    'You need two blocks: "Counter" from the "Memory" group and "Table (ROM)" from the "Selection and encoding" group.',
  'У счётчика поставь ширину 4, модуль 10 и включи «Синхронное обнуление CLR». На CLK подай clk, на CLR подай reset.':
    'For the counter set width 4, modulus 10 and turn on "Synchronous clear CLR". Feed clk to CLK, and reset to CLR.',
  'Выход счётчика Q подай на адрес A таблицы. У таблицы 4 разряда адреса, ширина слова 7, слова 63, 6, 91, 79, 102, 109, 125, 7, 127, 111, а остальные ячейки нули.':
    "Feed the counter's output Q to the table's address A. The table has 4 address bits, a word width of 7, the words 63, 6, 91, 79, 102, 109, 125, 7, 127, 111, and the other cells are zeros.",
  'Сигнализация с запоминанием': 'An alarm with memory',
  'Тревога не должна пропадать': 'The alarm must not disappear',
  'Датчик движения срабатывает на мгновение: человек прошёл, и сигнал снова 0. Но сирена обязана звучать, **пока сторож не сбросит тревогу**. Значит, схеме нужна **память**: один триггер, который запоминает, что датчик хоть раз сработал.\n\nМы будем хранить тревогу в однобитном регистре. Он работает по такту clk: по каждому фронту такта записывает то, что стоит у него на входе D.':
    'A motion sensor fires for a moment: a person passed, and the signal is 0 again. But the siren must sound **until the guard resets the alarm**. So the circuit needs **memory**: one flip-flop that remembers that the sensor fired at least once.\n\nWe will store the alarm in a one-bit register. It works on the clock clk: on each clock edge it writes what is on its input D.',
  'Защёлка из регистра и ИЛИ': 'A latch from a register and an OR',
  'Что подать на D? Новая тревога = датчик сработал **или** тревога уже была. Выход регистра Q возвращают назад и объединяют с датчиком блоком «ИЛИ»: единица, попав в регистр, поддерживает сама себя. Такой приём называют **защёлкой**.\n\nСброс делает вход RST регистра: когда reset = 1, на ближайшем такте в регистр записывается 0, и датчик игнорируется. Включи в свойствах регистра «Синхронный сброс RST».':
    'What to feed to D? New alarm = the sensor fired **or** the alarm was already there. The register\'s output Q is returned back and combined with the sensor by an "OR" block: a one that gets into the register supports itself. Such a technique is called a **latch**.\n\nReset is done by the register\'s input RST: when reset = 1, on the nearest clock 0 is written into the register, and the sensor is ignored. Turn on "Synchronous reset RST" in the register\'s properties.',
  'Датчик дал единицу на один такт и снова стал 0, а reset = 0. Что покажет выход?':
    'The sensor gave a one for one clock and became 0 again, and reset = 0. What will the output show?',
  'Единицу: тревога запомнена до сброса': 'One: the alarm is remembered until reset',
  'Ноль: выход повторяет датчик': 'Zero: the output repeats the sensor',
  'Единицу, но только пока датчик нажат': 'One, but only while the sensor is pressed',
  'Выход регистра вернулся на вход через ИЛИ, поэтому единица сама поддерживает себя, пока её не сбросит reset.':
    "The register's output returned to the input through the OR, so the one supports itself until reset clears it.",
  'Собери сигнализацию: выход y становится 1, когда датчик sensor хоть раз дал 1 на фронте такта, и остаётся 1, пока не придёт сброс reset. Сброс сильнее датчика.':
    'Build the alarm: the output y becomes 1 when the sensor sensor gave 1 at least once on a clock edge, and stays 1 until the reset reset arrives. Reset is stronger than the sensor.',
  'Сброс сильнее датчика': 'Reset is stronger than the sensor',
  'Датчик молчит': 'The sensor is silent',
  'Ещё тишина': 'More silence',
  'Датчик сработал': 'The sensor fired',
  'Датчик отпустили, тревога держится': 'The sensor was released, the alarm holds',
  'Тревога держится дальше': 'The alarm keeps holding',
  'Нужна память: блок «Регистр» шириной 1 с включённым синхронным сбросом RST.':
    'Memory is needed: a "Register" block of width 1 with synchronous reset RST turned on.',
  'На CLK регистра подай clk, на RST подай reset, а на выход y веди Q.':
    "Feed clk to the register's CLK, reset to RST, and lead Q to the output y.",
  'Перед входом D поставь «ИЛИ» из sensor и самого Q регистра: так единица сохраняется.':
    'Before the input D put an "OR" of sensor and the register\'s own Q: this way the one is preserved.',
  'Удлинитель импульса': 'A pulse stretcher',
  'Слишком короткий сигнал': 'A signal that is too short',
  'Короткий импульс в один такт легко пропустить: светодиод мигнёт так быстро, что глаз ничего не заметит. **Удлинитель импульса** растягивает его: после того как вход x побывал единицей, выход y держится единицей **ещё три такта**.\n\nПомочь может **сдвиговый регистр**: ряд триггеров, в котором каждый такт всё содержимое сдвигается на шаг, а в начало приходит новый бит.':
    'A short pulse of one clock is easy to miss: an LED blinks so fast that the eye notices nothing. A **pulse stretcher** extends it: after the input x has been one, the output y holds one **for three more clocks**.\n\nA **shift register** can help: a row of flip-flops in which every clock all the contents shift one step, and a new bit arrives at the start.',
  'Три триггера и ИЛИ': 'Three flip-flops and an OR',
  'Возьми сдвиговый регистр шириной 3. На вход SI подай x. Если x был единицей, то эта единица сначала окажется в первом триггере, затем во втором, затем в третьем, а на четвёртом такте выпадет. Значит, на выходе Q единица присутствует ровно три такта.\n\nНужно лишь выдать «хотя бы один бит равен 1»: для этого есть блок «Хотя бы один бит равен 1».':
    'Take a shift register of width 3. Feed x to the input SI. If x was one, this one will first be in the first flip-flop, then in the second, then in the third, and on the fourth clock it will fall out. So on the output Q the one is present for exactly three clocks.\n\nAll that is left is to output "at least one bit is 1": there is the "At least one bit is 1" block for that.',
  'Что изменится, если взять сдвиговый регистр шириной 5?':
    'What will change if you take a shift register of width 5?',
  'Выход будет держаться пять тактов': 'The output will hold for five clocks',
  'Выход перестанет работать': 'The output will stop working',
  'Выход станет держаться вдвое короче': 'The output will hold half as long',
  'Единица проходит через все триггеры по одному такту на каждый, поэтому время удержания равно ширине регистра.':
    'The one passes through all the flip-flops, one clock for each, so the hold time equals the width of the register.',
  'Собери удлинитель импульса: если x был равен 1 на фронте такта, то y равен 1 в этом же такте и ещё в двух следующих, а потом возвращается к 0.':
    'Build a pulse stretcher: if x was 1 on a clock edge, then y is 1 in that same clock and in two more following, and then returns to 0.',
  Тишина: 'Silence',
  'Импульс пришёл': 'The pulse arrived',
  'Вход уже 0, выход держится': 'The input is already 0, the output holds',
  'Третий такт удержания': 'The third clock of holding',
  'Выход упал': 'The output dropped',
  'Второй импульс': 'The second pulse',
  'Длинный вход продлевает выход': 'A long input extends the output',
  'Возьми «Сдвиговый регистр» из группы «Память» и поставь ему ширину 3.':
    'Take the "Shift register" from the "Memory" group and set its width to 3.',
  'x подай на SI, clk на CLK. Выход Q содержит три бита: каждый хранит x за один из последних трёх тактов.':
    'Feed x to SI, clk to CLK. The output Q holds three bits: each stores x for one of the last three clocks.',
  'Выход Q подай на блок «Хотя бы один бит равен 1» шириной 3; его выход соедини с y.':
    'Feed the output Q to the "At least one bit is 1" block of width 3; connect its output to y.',
  'Подавление дребезга: вход держится 2 такта': 'Debounce: the input holds for 2 clocks',
  'Кнопка дрожит': 'The button trembles',
  'Механическая кнопка при нажатии не замыкается чисто: контакты несколько раз отскакивают, и сигнал мелькает 1-0-1-0. Для схемы это будто несколько нажатий. Лекарство называется **подавлением дребезга**: выход меняется, только когда вход **достаточно долго держится неизменным**.\n\nУпрощённо мы потребуем ровно два такта подряд.':
    'A mechanical button does not close cleanly when pressed: the contacts bounce several times, and the signal flickers 1-0-1-0. For the circuit it is as if there were several presses. The cure is called **debouncing**: the output changes only when the input **stays unchanged for long enough**.\n\nIn a simplified way we will require exactly two clocks in a row.',
  'Сравниваем с прошлым тактом': 'Comparing with the previous clock',
  'Нам нужно знать, чем был вход на прошлом такте: для этого служит регистр `prev`, который просто запоминает x. Потом сравниваем: если x и prev **равны**, вход держится два такта, и можно принять новое значение x. Если они разные, вход только что изменился, и выход надо оставить прежним.\n\nВыбор между «взять x» и «оставить как есть» делает мультиплексор 2:1, а выход тоже хранится в регистре.':
    'We need to know what the input was on the previous clock: for this there is a register `prev` that simply remembers x. Then we compare: if x and prev are **equal**, the input has held for two clocks, and the new value of x can be accepted. If they are different, the input has just changed, and the output must stay as it was.\n\nThe choice between "take x" and "keep as is" is made by a 2:1 multiplexer, and the output is also stored in a register.',
  'Схема целиком': 'The whole circuit',
  '- регистр `prev`: D = x;\n- блок «Равно» (или XNOR): 1, когда x = prev;\n- мультиплексор 2:1: при S = 1 даёт x, при S = 0 даёт текущее y;\n- регистр `out`: D = выход мультиплексора, выход схемы y = Q этого регистра.\n\nОба регистра нужно обнулять при сбросе: включи у них синхронный сброс и подай reset.':
    '- the register `prev`: D = x;\n- the "Equal" block (or XNOR): 1 when x = prev;\n- the 2:1 multiplexer: at S = 1 gives x, at S = 0 gives the current y;\n- the register `out`: D = the multiplexer\'s output, the circuit\'s output y = Q of this register.\n\nBoth registers must be cleared on reset: turn on the synchronous reset for them and feed reset.',
  'Вход был 0, потом одиночный всплеск 1 на один такт и снова 0. Что будет с выходом?':
    'The input was 0, then a single spike of 1 for one clock and 0 again. What will happen to the output?',
  'Останется 0: всплеск короче двух тактов': 'It will stay 0: the spike is shorter than two clocks',
  'Станет 1 на один такт': 'It will become 1 for one clock',
  'Станет 1 и так и останется': 'It will become 1 and stay so',
  'Чтобы выход изменился, вход должен совпасть со своим значением на прошлом такте. У одиночного всплеска такого совпадения с единицей нет.':
    'For the output to change, the input must match its value on the previous clock. A single spike has no such match with one.',
  'Собери схему: y меняется на новое значение x только после того, как x продержался таким же 2 такта подряд. Одиночные всплески y не замечает.':
    'Build a circuit: y changes to the new value of x only after x has held the same for 2 clocks in a row. Single spikes are not noticed by y.',
  'Всплеск начался': 'The spike began',
  'Всплеск кончился, y не менялся': 'The spike ended, y did not change',
  'Вход 1 первый такт': 'The input is 1 on the first clock',
  'Вход 1 второй такт': 'The input is 1 on the second clock',
  'Одиночный ноль не виден': 'A single zero is not visible',
  'Вход снова 1': 'The input is 1 again',
  'Ноль, первый такт': 'Zero, the first clock',
  'Ноль, второй такт': 'Zero, the second clock',
  'Нужны два регистра шириной 1 с синхронным сбросом: один помнит прошлый x, другой хранит выход.':
    'You need two registers of width 1 with synchronous reset: one remembers the previous x, the other stores the output.',
  'Сравни x с выходом первого регистра блоком «Исключающее ИЛИ-НЕ (XNOR)»: он даёт 1, когда значения одинаковы.':
    'Compare x with the output of the first register using an "Exclusive NOR (XNOR)" block: it gives 1 when the values are the same.',
  'Мультиплексор 2:1: S берёт результат сравнения, D1 получает x, D0 получает выход второго регистра. Выход мультиплексора идёт на D второго регистра.':
    "A 2:1 multiplexer: S takes the comparison result, D1 gets x, D0 gets the output of the second register. The multiplexer's output goes to D of the second register.",
  Аккумулятор: 'An accumulator',
  'Сумма, которая копится': 'A sum that accumulates',
  '**Аккумулятор** — устройство, которое на каждом такте прибавляет входное число d к уже накопленной сумме. Так работает копилка или кассовый счётчик: приходят числа, итог растёт.\n\nНакопленная сумма хранится в **регистре**. Новое значение регистра равно «старая сумма + d», поэтому выход регистра надо вернуть на вход сумматора. Получается петля, но она безопасна: между кругами стоит регистр, и каждый такт петля делает ровно один шаг.':
    'An **accumulator** is a device that on every clock adds the input number d to the already accumulated sum. This is how a piggy bank or a cash counter works: numbers arrive, the total grows.\n\nThe accumulated sum is stored in a **register**. The new value of the register equals "old sum + d", so the register\'s output must be returned to the adder\'s input. This gives a loop, but it is safe: there is a register between the rounds, and every clock the loop makes exactly one step.',
  'Переполнение по модулю 16': 'Overflow modulo 16',
  'Если сумма и d занимают 4 бита, то наибольшее число 15. Прибавив 1 к 15, получим 16, а в четыре бита оно не помещается: остаётся 0. Это называется переполнением, а такой счёт **по модулю 16**. Лишний перенос просто теряется: так ведёт себя четырёхбитный сумматор.\n\nПример: накопили 10 (1010), прибавили 9 (1001): получилось 19, в четырёх битах это 3 (0011).':
    'If the sum and d take 4 bits, the largest number is 15. Adding 1 to 15 gives 16, and it does not fit in four bits: 0 remains. This is called overflow, and such counting is **modulo 16**. The extra carry is simply lost: this is how a four-bit adder behaves.\n\nExample: we accumulated 10 (1010), added 9 (1001): we got 19, in four bits that is 3 (0011).',
  'Сумма равна 15, на вход пришло 2. Что станет с четырёхбитной суммой?':
    'The sum is 15, 2 arrived at the input. What will the four-bit sum become?',
  '1, переполнение по модулю 16': '1, overflow modulo 16',
  '17, регистр сам расширится': '17, the register will extend by itself',
  '15, переполненная сумма не записывается': '15, an overflowed sum is not written',
  '15 + 2 = 17, а в четырёх битах остаётся 17 − 16 = 1. Регистр никогда не расширяется сам.':
    '15 + 2 = 17, and in four bits 17 − 16 = 1 remains. A register never extends by itself.',
  'Собери аккумулятор: на каждом фронте такта y становится равным «y + d» по модулю 16. Пока reset = 1, y равен 0.':
    'Build an accumulator: on every clock edge y becomes equal to "y + d" modulo 16. While reset = 1, y is 0.',
  'Первое прибавление: 3': 'The first addition: 3',
  'Ещё 3': '3 more',
  'Прибавили 4': 'Added 4',
  'Прибавили 0: сумма держится': 'Added 0: the sum holds',
  'Прибавили 9: переполнение': 'Added 9: overflow',
  'Снова прибавили 0': 'Added 0 again',
  'Нужны «Сумматор» и «Регистр»; у обоих ширина 4. У регистра включи синхронный сброс RST.':
    'You need "Adder" and "Register"; both have width 4. For the register turn on the synchronous reset RST.',
  'Выход регистра Q подай на второй вход сумматора: так старая сумма вернётся к сложению.':
    "Feed the register's output Q to the adder's second input: this way the old sum returns to the addition.",
  'Выход сумматора подай на D регистра; clk на CLK, reset на RST. Выход y берёт Q регистра.':
    "Feed the adder's output to D of the register; clk to CLK, reset to RST. The output y takes Q of the register.",
  'a b | И  И-НЕ\n0 0 | 0   1\n0 1 | 0   1\n1 0 | 0   1\n1 1 | 1   0':
    'a b | AND  NAND\n0 0 |  0    1\n0 1 |  0    1\n1 0 |  0    1\n1 1 |  1    0',
  'a b | ИЛИ  ИЛИ-НЕ\n0 0 |  0     1\n0 1 |  1     0\n1 0 |  1     0\n1 1 |  1     0':
    'a b | OR  NOR\n0 0 |  0   1\n0 1 |  1   0\n1 0 |  1   0\n1 1 |  1   0',
  'abc | единиц | бит чётности\n000 |   0    |  0\n001 |   1    |  1\n011 |   2    |  0\n111 |   3    |  1':
    'abc | ones | parity bit\n000 |  0   |  0\n001 |  1   |  1\n011 |  2   |  0\n111 |  3   |  1',
  's[1:0] | выход\n  00   | d[0]\n  01   | d[1]\n  10   | d[2]\n  11   | d[3]':
    's[1:0] | output\n  00   | d[0]\n  01   | d[1]\n  10   | d[2]\n  11   | d[3]',
  'r[3:0] | y\n0000   | 00\n0001   | 00\n001x   | 01\n01xx   | 10\n1xxx   | 11\n(x значит «любой бит»)':
    'r[3:0] | y\n0000   | 00\n0001   | 00\n001x   | 01\n01xx   | 10\n1xxx   | 11\n(x means "any bit")',
  'И-НЕ: два действия сразу': 'NAND: two actions at once',
  'Инверсия результата': 'Inverting the result',
  'Элемент **И-НЕ** (по-английски NAND) делает то же, что И, а потом переворачивает ответ. Раньше выход был 1 только при двух единицах на входах, теперь наоборот: выход 0 только при двух единицах, а во всех остальных случаях 1.\n\nИз одних лишь элементов И-НЕ можно собрать любую цифровую схему, поэтому в микросхемах его любят.':
    'The **NAND** gate does the same as AND and then flips the answer. Before, the output was 1 only with two ones on the inputs; now it is the opposite: the output is 0 only with two ones, and 1 in all other cases.\n\nAny digital circuit can be built from NAND gates alone, which is why chips love it.',
  'Как это записать': 'How to write it',
  'В Verilog действия можно вкладывать друг в друга: в скобках сначала считается И, потом перед скобками знак `~` переворачивает результат. Скобки здесь обязательны: без них `~` перевернёт только `a`.':
    'In Verilog actions can be nested: inside the parentheses AND is computed first, then the `~` sign in front of the parentheses flips the result. The parentheses are required here: without them `~` would flip only `a`.',
  'Входы a = 1 и b = 1. Что выдаст элемент И-НЕ?':
    'The inputs are a = 1 and b = 1. What will the NAND gate output?',
  'Зависит от тактового сигнала': 'Depends on the clock signal',
  'И даёт 1 при двух единицах, а И-НЕ переворачивает этот ответ: получается 0.':
    'AND gives 1 for two ones, and NAND flips that answer: the result is 0.',
  'Сделай элемент И-НЕ: выход y должен быть 0 только когда a и b равны 1 одновременно.':
    'Make a NAND gate: the output y must be 0 only when a and b are 1 at the same time.',
  'Сначала подумай, какой элемент даёт 1 только при двух единицах, а потом переверни его ответ.':
    'First think about which gate gives 1 only for two ones, and then flip its answer.',
  'Переворот в Verilog — знак ~. Его нужно поставить перед скобками с действием И.':
    'The flip in Verilog is the ~ sign. It must be put in front of the parentheses with the AND action.',
  'Правильная строка: assign y = ~(a & b);': 'The correct line: assign y = ~(a & b);',
  'ИЛИ-НЕ: ни одной единицы': 'NOR: not a single one',
  'ИЛИ с переворотом': 'OR with a flip',
  'Элемент **ИЛИ-НЕ** (по-английски NOR) сначала считает ИЛИ, а потом переворачивает ответ. ИЛИ даёт 1, если хотя бы на одном входе единица. Значит, ИЛИ-НЕ даёт 1 лишь тогда, когда **на всех входах нули**, а при любой единице выдаёт 0.':
    'The **NOR** gate first computes OR and then flips the answer. OR gives 1 if there is a one on at least one input. So NOR gives 1 only when **all inputs are zeros**, and with any one it gives 0.',
  'Запись в Verilog': 'Writing it in Verilog',
  'Как и с И-НЕ: в скобках считается ИЛИ (знак `|`), а `~` перед скобками переворачивает результат.':
    'As with NAND: OR is computed inside the parentheses (the `|` sign), and `~` in front of the parentheses flips the result.',
  'При каких входах элемент ИЛИ-НЕ выдаёт 1?': 'For which inputs does the NOR gate output 1?',
  'Когда оба входа равны 1': 'When both inputs are 1',
  'ИЛИ даёт 0 только при двух нулях, а ИЛИ-НЕ переворачивает ответ, поэтому единица получается именно при двух нулях.':
    'OR gives 0 only for two zeros, and NOR flips the answer, so the one appears exactly for two zeros.',
  'Сделай элемент ИЛИ-НЕ: выход y равен 1 только когда a и b оба равны 0.':
    'Make a NOR gate: the output y equals 1 only when a and b are both 0.',
  'Подумай, какой элемент даёт 1, если хотя бы один вход равен 1, и переверни его ответ.':
    'Think about which gate gives 1 if at least one input is 1, and flip its answer.',
  'ИЛИ в Verilog записывается знаком |, переворот знаком ~ перед скобками.':
    'OR is written in Verilog with the | sign, the flip with the ~ sign in front of the parentheses.',
  'Правильная строка: assign y = ~(a | b);': 'The correct line: assign y = ~(a | b);',
  'Равенство двух бит': 'Equality of two bits',
  'Совпали или нет': 'Same or not',
  'Элемент **исключающее ИЛИ-НЕ** (XNOR) даёт 1, когда два бита **одинаковы**, и 0, когда они разные. Это обратный к XOR: тот отвечает «различаются ли», а XNOR отвечает «равны ли». На нём строят сравнение чисел.':
    'The **exclusive NOR** gate (XNOR) gives 1 when two bits are **the same**, and 0 when they are different. It is the inverse of XOR: that one answers "are they different", while XNOR answers "are they equal". Number comparison is built on it.',
  'Как записать': 'How to write it',
  'XOR в Verilog пишется знаком `^`. Переворачиваем его знаком `~`. Есть и короткая запись `~^`, но со скобками понятнее.':
    'XOR in Verilog is written with the `^` sign. We flip it with the `~` sign. There is also a short form `~^`, but parentheses are clearer.',
  'Входы a = 0 и b = 0. Что выдаст XNOR?': 'The inputs are a = 0 and b = 0. What will XNOR output?',
  '0, потому что единиц нет': '0, because there are no ones',
  '1, потому что биты равны': '1, because the bits are equal',
  'Ничего: так нельзя': 'Nothing: it is not allowed',
  'XNOR отвечает «равны ли биты». Два нуля равны, поэтому на выходе 1.':
    'XNOR answers "are the bits equal". Two zeros are equal, so the output is 1.',
  'Сравни два бита: выход y равен 1, когда a и b одинаковы.':
    'Compare two bits: the output y equals 1 when a and b are the same.',
  'Вспомни XOR: он даёт 1, когда биты разные. Нужно обратное.':
    'Recall XOR: it gives 1 when the bits are different. You need the opposite.',
  'Поставь ~ перед скобками с действием a ^ b.':
    'Put ~ in front of the parentheses with the action a ^ b.',
  'Правильная строка: assign y = ~(a ^ b);': 'The correct line: assign y = ~(a ^ b);',
  'Элементы с тремя входами': 'Gates with three inputs',
  'И и ИЛИ работают и с тремя входами. **И** даёт 1, когда **все** входы равны 1. **ИЛИ** даёт 1, когда **хотя бы один** вход равен 1. В Verilog знаки можно просто выстроить в цепочку.':
    'AND and OR work with three inputs too. **AND** gives 1 when **all** inputs are 1. **OR** gives 1 when **at least one** input is 1. In Verilog the signs can simply be lined up in a chain.',
  'Все одинаковы': 'All the same',
  'Соберём схему «все три бита одинаковы»: либо все единицы, либо все нули. Все единицы даёт `a & b & c`. Все нули: если ни на одном входе нет единицы, то `~(a | b | c)`. Остаётся объединить два случая через ИЛИ.':
    'Let us build the circuit "all three bits are the same": either all ones or all zeros. All ones is `a & b & c`. All zeros: if there is not a single one on any input, `~(a | b | c)`. What remains is to join the two cases with OR.',
  'Входы a = 1, b = 1, c = 0. Чему равно a & b & c?':
    'The inputs are a = 1, b = 1, c = 0. What is a & b & c equal to?',
  'Нельзя, нужно ровно два входа': 'Impossible, exactly two inputs are needed',
  'И даёт 1, только когда единицы на всех входах. У c ноль, поэтому ответ 0.':
    'AND gives 1 only when there are ones on all inputs. c is zero, so the answer is 0.',
  'Выход y равен 1, когда все три входа a, b, c одинаковы (000 или 111).':
    'The output y equals 1 when all three inputs a, b, c are the same (000 or 111).',
  'Нужно два случая: все единицы и все нули. Каждый запиши отдельно.':
    'You need two cases: all ones and all zeros. Write each one separately.',
  'Все нули: ни на одном входе нет единицы, то есть ~(a | b | c).':
    'All zeros: there is not a single one on any input, that is ~(a | b | c).',
  'Правильная строка: assign y = (a & b & c) | ~(a | b | c);':
    'The correct line: assign y = (a & b & c) | ~(a | b | c);',
  'Голосование «два из трёх»': 'The "two out of three" vote',
  'Решает большинство': 'The majority decides',
  'Три датчика сообщают 0 или 1, и ответ определяется по большинству: если единиц **две или три**, на выходе 1, иначе 0. Такой элемент называют мажоритарным. Его ставят там, где один датчик может ошибиться, а двое других его поправят.':
    'Three sensors report 0 or 1, and the answer is decided by majority: if there are **two or three** ones, the output is 1, otherwise 0. Such a gate is called a majority gate. It is used where one sensor may make a mistake and the other two will correct it.',
  'Три пары': 'Three pairs',
  'Единиц не меньше двух, если единицы есть хотя бы в одной из пар: a и b, a и c, b и c. Каждая пара это И, а вместе их объединяет ИЛИ.':
    'There are at least two ones if there are ones in at least one of the pairs: a and b, a and c, b and c. Each pair is an AND, and OR joins them together.',
  'Входы a = 0, b = 1, c = 1. Что выдаст схема «два из трёх»?':
    'The inputs are a = 0, b = 1, c = 1. What will the "two out of three" circuit output?',
  'Зависит от порядка входов': 'Depends on the order of the inputs',
  'Единиц две, это большинство, поэтому выход 1. Порядок входов не важен: считается только число единиц.':
    'There are two ones, which is a majority, so the output is 1. The order of the inputs does not matter: only the number of ones is counted.',
  'Сделай голосование: y равен 1, когда единицы не меньше чем на двух из входов a, b, c.':
    'Make a vote: y equals 1 when there are ones on at least two of the inputs a, b, c.',
  'Большинство значит, что хотя бы какая-то пара входов одновременно равна 1.':
    'Majority means that at least some pair of inputs is 1 at the same time.',
  'Пар три: a и b, a и c, b и c. Каждую запиши через &, объедини через |.':
    'There are three pairs: a and b, a and c, b and c. Write each with &, join with |.',
  'Правильная строка: assign y = (a & b) | (a & c) | (b & c);':
    'The correct line: assign y = (a & b) | (a & c) | (b & c);',
  'Зачем нужен бит чётности': 'Why a parity bit is needed',
  'Когда данные идут по проводу, бит может исказиться. Чтобы заметить ошибку, к данным добавляют ещё один бит, **бит чётности**. Его выбирают так, чтобы общее число единиц вместе с ним стало **чётным**. Если на приёмной стороне число единиц нечётно, значит, что-то испортилось.':
    'When data travels over a wire, a bit can get corrupted. To notice the error, one more bit is added to the data, the **parity bit**. It is chosen so that the total number of ones together with it becomes **even**. If on the receiving side the number of ones is odd, something got spoiled.',
  'XOR считает чётность': 'XOR counts parity',
  'XOR даёт 1, когда единиц нечётное число. Для трёх битов цепочка XOR даёт ровно то, что нужно: если единиц нечётное число, бит чётности равен 1 и дополняет их до чётного.':
    'XOR gives 1 when the number of ones is odd. For three bits a chain of XORs gives exactly what is needed: if the number of ones is odd, the parity bit is 1 and completes them to an even number.',
  'Данные 1, 1, 0. Чему равен бит чётности (чтобы всего единиц было чётное число)?':
    'The data is 1, 1, 0. What is the parity bit (so that the total number of ones is even)?',
  'Может быть любым': 'It can be anything',
  'В данных уже две единицы, число чётное. Добавлять ещё одну не нужно, поэтому бит чётности 0.':
    'The data already has two ones, an even number. There is no need to add another one, so the parity bit is 0.',
  'Посчитай бит чётности p для трёх бит a, b, c: вместе с ним число единиц должно быть чётным.':
    'Compute the parity bit p for the three bits a, b, c: together with it the number of ones must be even.',
  'Бит чётности равен 1, когда в a, b, c нечётное число единиц.':
    'The parity bit is 1 when a, b, c contain an odd number of ones.',
  'Нечётность определяет XOR, знак ^. Соедини все три входа.':
    'Oddness is determined by XOR, the ^ sign. Connect all three inputs.',
  'Правильная строка: assign p = a ^ b ^ c;': 'The correct line: assign p = a ^ b ^ c;',
  'Мультиплексор 4 в 1': '4-to-1 multiplexer',
  'Выбор из четырёх': 'Choosing one of four',
  'Мультиплексор 2 в 1 выбирает один из двух входов одним битом. Для четырёх входов нужно два бита выбора: они дают четыре номера, 0, 1, 2 и 3. Запишем их как **шину** `s[1:0]`, то есть два провода под одним именем. `s[1]` старший бит, `s[0]` младший.':
    'A 2-to-1 multiplexer picks one of two inputs with one bit. For four inputs you need two select bits: they give four numbers, 0, 1, 2 and 3. We write them as the **bus** `s[1:0]`, that is, two wires under one name. `s[1]` is the most significant bit, `s[0]` the least significant.',
  'Индекс вместо цепочки условий': 'An index instead of a chain of conditions',
  'Четыре входа тоже можно объединить в шину `d[3:0]`. Тогда выбор записывается одной строкой: номер бита подставляется в квадратных скобках, а в роли номера выступает сама шина `s`.':
    'The four inputs can also be combined into the bus `d[3:0]`. Then the choice is written in one line: the bit number is put in square brackets, and the bus `s` itself plays the role of the number.',
  'Шина выбора s = 10 (двоичное, то есть число 2). Какой вход пройдёт на выход?':
    'The select bus is s = 10 (binary, that is, the number 2). Which input goes through to the output?',
  'Двоичное 10 равно двум, поэтому выбирается вход с номером 2, то есть d[2].':
    'Binary 10 is two, so the input with number 2 is chosen, that is d[2].',
  'Сделай мультиплексор 4 в 1: выход y равен тому биту шины d, номер которого задаёт s.':
    'Make a 4-to-1 multiplexer: the output y equals the bit of the bus d whose number is set by s.',
  'Выход повторяет один из четырёх бит шины d, а какой именно, говорит s.':
    'The output repeats one of the four bits of the bus d, and s says which one.',
  'Номер бита можно подставить в квадратные скобки: d[...].':
    'The bit number can be put in square brackets: d[...].',
  'Правильная строка: assign y = d[s];': 'The correct line: assign y = d[s];',
  'Демультиплексор 1 в 4': '1-to-4 demultiplexer',
  'Раздать по адресу': 'Deliver by address',
  'Демультиплексор делает обратное мультиплексору: один входной бит `d` отправляется на **один из четырёх** выходов, номер которого задаёт `s`. Остальные выходы остаются нулями. Это как почтальон: письмо одно, а ящиков четыре.':
    'A demultiplexer does the opposite of a multiplexer: one input bit `d` is sent to **one of four** outputs, whose number is set by `s`. The other outputs stay zeros. It is like a postman: there is one letter, and four mailboxes.',
  'Сдвиг на номер': 'Shift by the number',
  "Выход это шина `y[3:0]`. Единицу `4'b0001` сдвигаем влево на `s` позиций оператором `<<`: она оказывается в разряде с номером `s`. Если `d` равен 0, выдаём все нули.":
    "The output is the bus `y[3:0]`. We shift the one `4'b0001` to the left by `s` positions with the `<<` operator: it ends up in the place with number `s`. If `d` is 0, we output all zeros.",
  'Вход d = 1, адрес s = 11 (число 3). Какая шина y получится?':
    'The input is d = 1, the address is s = 11 (the number 3). What bus y do we get?',
  'Единица попадает в выход с номером 3, а это старший бит шины y[3:0]: 1000.':
    'The one lands on the output with number 3, which is the most significant bit of the bus y[3:0]: 1000.',
  'Сделай демультиплексор 1 в 4: бит d передаётся в y[s], остальные биты y равны 0.':
    'Make a 1-to-4 demultiplexer: the bit d is passed to y[s], the other bits of y are 0.',
  'При d = 0 все четыре выхода равны нулю. При d = 1 включён ровно один выход.':
    'With d = 0 all four outputs are zero. With d = 1 exactly one output is on.',
  "Номер включённого выхода это s. Единицу 4'b0001 можно сдвинуть влево на s позиций.":
    "The number of the output that is on is s. The one 4'b0001 can be shifted to the left by s positions.",
  "Правильная строка: assign y = d ? (4'b0001 << s) : 4'b0000;":
    "The correct line: assign y = d ? (4'b0001 << s) : 4'b0000;",
  'Дешифратор 3 в 8': '3-to-8 decoder',
  'Одна горящая линия из восьми': 'One lit line out of eight',
  'Дешифратор получает число и включает ровно **один выход с этим номером**. Три входных бита задают номер от 0 до 7, а выходов восемь. Выход собираем в шину `y[7:0]`. Для числа 5 (двоичное 101) выйдет `00100000`: единица стоит в разряде с номером 5.':
    'A decoder receives a number and turns on exactly **one output with that number**. Three input bits give a number from 0 to 7, and there are eight outputs. We collect the output into the bus `y[7:0]`. For the number 5 (binary 101) we get `00100000`: the one is in the place with number 5.',
  'Сдвиг единицы': 'Shifting the one',
  "Запись такая же, как в демультиплексоре: берём единицу и сдвигаем влево на число `a`. Ширину результата задаёт запись `8'b00000001`, поэтому единица не потеряется.":
    "The notation is the same as in the demultiplexer: we take a one and shift it to the left by the number `a`. The width of the result is set by the notation `8'b00000001`, so the one will not be lost.",
  'На входе a = 011 (число 3). Какая шина y из восьми бит получится?':
    'The input is a = 011 (the number 3). What eight-bit bus y do we get?',
  'Включается один выход с номером 3. Счёт идёт справа с нуля, поэтому единица стоит в четвёртой позиции справа: 00001000.':
    'One output, number 3, turns on. Counting goes from the right starting at zero, so the one is in the fourth position from the right: 00001000.',
  'Сделай дешифратор 3 в 8: из восьми бит шины y равен 1 только бит с номером a.':
    'Make a 3-to-8 decoder: of the eight bits of the bus y only the bit with number a equals 1.',
  'Все восемь выходов, кроме одного, равны 0. Горит тот, чей номер совпадает с числом a.':
    'All eight outputs except one are 0. The one whose number matches the number a is lit.',
  "Возьми единицу 8'b00000001 и сдвинь её влево на a позиций оператором <<.":
    "Take the one 8'b00000001 and shift it to the left by a positions with the << operator.",
  "Правильная строка: assign y = 8'b00000001 << a;":
    "The correct line: assign y = 8'b00000001 << a;",
  'Приоритетный шифратор 4 в 2': '4-to-2 priority encoder',
  'Номер самой старшей единицы': 'The number of the highest one',
  'Шифратор это обратный дешифратору элемент: на входе четыре линии запроса `r[3:0]` (например, четыре кнопки), на выходе **двоичный номер** линии. Если нажаты сразу несколько, побеждает **старшая**: у неё приоритет. Если не нажата ни одна, выдаём `00`.':
    'An encoder is the opposite of a decoder: on the input there are four request lines `r[3:0]` (for example, four buttons), and on the output is the **binary number** of the line. If several are pressed at once, the **highest** wins: it has priority. If none is pressed, we output `00`.',
  'Проверка сверху вниз': 'Checking from the top down',
  'Проверяем линии по очереди от старшей: если `r[3]` равен 1, ответ 3 и дальше не смотрим, иначе проверяем `r[2]` и так далее. В Verilog это цепочка условных выражений `? :`.':
    'We check the lines in turn starting from the highest: if `r[3]` is 1, the answer is 3 and we look no further, otherwise we check `r[2]` and so on. In Verilog this is a chain of conditional expressions `? :`.',
  'Нажаты линии r[0] и r[2] (r = 0101). Что выдаст приоритетный шифратор?':
    'Lines r[0] and r[2] are pressed (r = 0101). What will the priority encoder output?',
  'Побеждает старшая нажатая линия, это r[2]. Её номер 2, в двоичном виде 10.':
    'The highest pressed line wins, that is r[2]. Its number is 2, in binary 10.',
  'Сделай приоритетный шифратор: y это номер старшей единицы шины r, а при r = 0000 выдавай 00.':
    'Make a priority encoder: y is the number of the highest one of the bus r, and for r = 0000 output 00.',
  'Начни проверять со старшей линии r[3]: если она 1, остальные уже не важны.':
    'Start checking from the highest line r[3]: if it is 1, the others no longer matter.',
  "Используй цепочку условий: r[3] ? 2'd3 : r[2] ? 2'd2 : ... Последним идёт запасной ответ.":
    "Use a chain of conditions: r[3] ? 2'd3 : r[2] ? 2'd2 : ... The fallback answer goes last.",
  "Правильный ответ: assign y = r[3] ? 2'd3 : r[2] ? 2'd2 : r[1] ? 2'd1 : 2'd0;":
    "The correct answer: assign y = r[3] ? 2'd3 : r[2] ? 2'd2 : r[1] ? 2'd1 : 2'd0;",
  'assign y = {a & b, a ^ b};\n// y[1] — перенос, y[0] — сумма':
    'assign y = {a & b, a ^ b};\n// y[1] is the carry, y[0] is the sum',
  'assign y = a + b + cin;\n// y[1] — перенос, y[0] — сумма':
    'assign y = a + b + cin;\n// y[1] is the carry, y[0] is the sum',
  ' a    −a\n0001  1111   (1 и 15)\n0011  1101   (3 и 13)\n1000  1000   (8 и 8)\n0000  0000':
    ' a    −a\n0001  1111   (1 and 15)\n0011  1101   (3 and 13)\n1000  1000   (8 and 8)\n0000  0000',
  "assign y = -a;\n// то же самое: assign y = ~a + 4'd1;":
    "assign y = -a;\n// the same thing: assign y = ~a + 4'd1;",
  'Полусумматор: складываем два бита': 'Half adder: adding two bits',
  'Сложение в двоичной системе': 'Addition in binary',
  'В двоичной системе всего две цифры, 0 и 1, и складываются они почти как в школе:\n\n- 0 + 0 = 0\n- 0 + 1 = 1\n- 1 + 0 = 1\n- 1 + 1 = 10 (это число два, записанное двоично)\n\nПоследний случай особенный: результат не помещается в одну цифру. Младшая цифра ответа 0 называется **суммой** (sum), а старшая 1 — **переносом** (carry), как перенос в следующий разряд при сложении столбиком.':
    'The binary system has only two digits, 0 and 1, and they are added almost like at school:\n\n- 0 + 0 = 0\n- 0 + 1 = 1\n- 1 + 0 = 1\n- 1 + 1 = 10 (this is the number two, written in binary)\n\nThe last case is special: the result does not fit in one digit. The low digit of the answer, 0, is called the **sum**, and the high digit, 1, is the **carry**, like carrying into the next place when adding in columns.',
  'Из двух элементов': 'From two gates',
  'Взгляни на таблицу: сумма равна 1, когда входы **разные**, — это исключающее ИЛИ (`^`). Перенос равен 1 только при двух единицах — это обычное И (`&`).\n\nСхема из этих двух элементов называется **полусумматором**: «полу», потому что у неё нет входа для переноса от соседнего разряда.':
    'Look at the table: the sum is 1 when the inputs are **different**, which is exclusive OR (`^`). The carry is 1 only for two ones, which is ordinary AND (`&`).\n\nA circuit of these two gates is called a **half adder**: "half" because it has no input for a carry from the neighboring place.',
  'Два бита в одном выходе': 'Two bits in one output',
  'Выход у нас один, `y`, но шириной 2 бита: `[1:0]` значит «биты с номерами от 1 до 0». Склеить два сигнала в один многоразрядный можно фигурными скобками: `{carry, sum}`. Первым пишется старший бит.':
    'We have one output, `y`, but 2 bits wide: `[1:0]` means "bits numbered from 1 to 0". Two signals can be joined into one multi-bit signal with curly braces: `{carry, sum}`. The most significant bit is written first.',
  'Какой элемент даёт сумму (младший бит) полусумматора?':
    'Which gate gives the sum (the low bit) of a half adder?',
  'И (a & b)': 'AND (a & b)',
  'Исключающее ИЛИ (a ^ b)': 'Exclusive OR (a ^ b)',
  'ИЛИ (a | b)': 'OR (a | b)',
  'Сумма равна 1, когда входы различаются: 0+1 и 1+0. Это в точности исключающее ИЛИ. ИЛИ ошиблось бы на 1+1: дало бы 1, а в сумме должен быть 0 (и перенос).':
    'The sum is 1 when the inputs differ: 0+1 and 1+0. That is exactly exclusive OR. OR would be wrong for 1+1: it would give 1, while the sum must be 0 (and a carry).',
  'Сложи два бита a и b. Выход y — два бита: старший y[1] это перенос, младший y[0] это сумма.':
    'Add two bits a and b. The output y is two bits: the high y[1] is the carry, the low y[0] is the sum.',
  '1 + 1 (перенос)': '1 + 1 (carry)',
  'Сумма и перенос — это два разных элемента на одних и тех же входах. Какой элемент даёт 1 только при двух единицах?':
    'The sum and the carry are two different gates on the same inputs. Which gate gives 1 only for two ones?',
  'Перенос: a & b. Сумма: a ^ b. Склей их фигурными скобками, перенос первым.':
    'Carry: a & b. Sum: a ^ b. Join them with curly braces, carry first.',
  'Правильная строка: assign y = {a & b, a ^ b};': 'The correct line: assign y = {a & b, a ^ b};',
  'Полный сумматор: учитываем перенос': 'Full adder: accounting for the carry',
  'Три бита на входе': 'Three bits on the input',
  'Когда складывают многоразрядные числа столбиком, в каждом разряде, кроме самого младшего, к двум цифрам прибавляется ещё и **перенос** из соседнего младшего разряда. Значит, схеме нужно сложить три бита: `a`, `b` и `cin` (carry in, «перенос на входе»).\n\nСхема, которая это умеет, называется **полным сумматором**. Самое большее, что получится: 1 + 1 + 1 = 3, то есть `11` двоично. Два бита выхода хватает: сумма и перенос на выходе `cout`.':
    'When multi-digit numbers are added in columns, in every place except the lowest, a **carry** from the neighboring lower place is added to the two digits. So the circuit has to add three bits: `a`, `b` and `cin` (carry in).\n\nA circuit that can do this is called a **full adder**. The most you can get is: 1 + 1 + 1 = 3, that is `11` in binary. Two output bits are enough: the sum and the carry out `cout`.',
  'Самый простой способ описать полный сумматор: сложить три бита как числа. Результат — число от 0 до 3, и оно как раз укладывается в два бита.\n\nЕсть одна тонкость. Verilog считает в ширине самого широкого участника выражения, включая левую часть присваивания. Если выход `y` двухбитный, то `a + b + cin` считается в двух битах и ничего не теряет. Поэтому одной строки достаточно.':
    'The simplest way to describe a full adder: add the three bits as numbers. The result is a number from 0 to 3, and it fits exactly in two bits.\n\nThere is one subtlety. Verilog computes in the width of the widest participant of the expression, including the left side of the assignment. If the output `y` is two-bit, then `a + b + cin` is computed in two bits and loses nothing. So one line is enough.',
  'Какой ответ у полного сумматора при a = 1, b = 1, cin = 1?':
    "What is the full adder's answer for a = 1, b = 1, cin = 1?",
  'перенос 0, сумма 1': 'carry 0, sum 1',
  'перенос 1, сумма 1': 'carry 1, sum 1',
  'перенос 1, сумма 0': 'carry 1, sum 0',
  'Три единицы дают 3, а три в двоичной записи это 11: и перенос, и сумма равны 1.':
    'Three ones give 3, and three in binary is 11: both the carry and the sum are 1.',
  'Сложи три бита a, b и cin. Выход y — два бита: y[1] это перенос на выходе, y[0] это сумма.':
    'Add three bits a, b and cin. The output y is two bits: y[1] is the carry out, y[0] is the sum.',
  'Три бита можно просто сложить плюсом: результат от 0 до 3 как раз помещается в два бита выхода.':
    'Three bits can simply be added with a plus: the result from 0 to 3 fits exactly in the two bits of the output.',
  'Операция сложения в Verilog — знак +, как в обычной арифметике.':
    'The addition operation in Verilog is the + sign, as in ordinary arithmetic.',
  'Правильная строка: assign y = a + b + cin;': 'The correct line: assign y = a + b + cin;',
  'Четырёхразрядный сумматор': 'Four-bit adder',
  'Числа вместо битов': 'Numbers instead of bits',
  'Сигнал из нескольких битов Verilog умеет складывать целиком. Объявление `input wire [3:0] a` — это число из четырёх бит, от 0 (`0000`) до 15 (`1111`). Знак `+` сам сделает все переносы между разрядами.\n\nГлавный вопрос: какой ширины ответ? Наибольшая сумма равна 15 + 15 = 30, а это уже `11110`, пять бит. Если выход сделать четырёхбитным, старший бит потеряется, и 15 + 1 даст 0 вместо 16.':
    'Verilog can add multi-bit signals as a whole. The declaration `input wire [3:0] a` is a number of four bits, from 0 (`0000`) to 15 (`1111`). The `+` sign makes all the carries between places by itself.\n\nThe main question: how wide is the answer? The largest sum is 15 + 15 = 30, and that is already `11110`, five bits. If the output is made four-bit, the high bit is lost, and 15 + 1 gives 0 instead of 16.',
  'Широкий выход': 'A wide output',
  "Выход делаем пятибитным: `output wire [4:0] y`. Тогда Verilog считает сумму в пяти битах, и старший бит выхода становится переносом.\n\nЧтобы это было видно в коде и не зависело от тонкостей правил ширины, можно явно дописать нулевой бит к каждому слагаемому: `{1'b0, a}` — это те же четыре бита `a` и ещё один нулевой старший.":
    "We make the output five-bit: `output wire [4:0] y`. Then Verilog computes the sum in five bits, and the high bit of the output becomes the carry.\n\nTo make this visible in the code and independent of the subtleties of the width rules, you can explicitly add a zero bit to each addend: `{1'b0, a}` is the same four bits of `a` and one more zero high bit.",
  'Сколько бит нужно для результата сложения двух четырёхбитных чисел без потерь?':
    'How many bits are needed for the result of adding two four-bit numbers without loss?',
  '4 бита': '4 bits',
  '5 бит': '5 bits',
  '8 бит': '8 bits',
  'Наибольшая сумма 15 + 15 = 30 не помещается в четыре бита (максимум 15), но помещается в пять (максимум 31).':
    'The largest sum 15 + 15 = 30 does not fit in four bits (maximum 15), but fits in five (maximum 31).',
  'Сложи четырёхбитные числа a и b. Выход y пятибитный, чтобы сумма и перенос поместились целиком.':
    'Add the four-bit numbers a and b. The output y is five-bit, so that the sum and the carry fit entirely.',
  'Сложить числа можно знаком +, но результат должен поместиться в пять бит.':
    'Numbers can be added with the + sign, but the result must fit in five bits.',
  "Допиши к каждому слагаемому старший нулевой бит: {1'b0, a}.":
    "Add a high zero bit to each addend: {1'b0, a}.",
  "Правильная строка: assign y = {1'b0, a} + {1'b0, b};":
    "The correct line: assign y = {1'b0, a} + {1'b0, b};",
  'Вычитание и обёртка по модулю': 'Subtraction and wrapping around modulo',
  'Вычитание в четырёх битах': 'Subtraction in four bits',
  'Знак `-` работает так же, как `+`. Но у четырёхбитного числа нет отрицательных значений: самое меньшее — 0. Что будет, если из 3 вычесть 5?\n\nСчёт «заворачивается», как показания счётчика, у которого после 0 снова идёт 15. Получается 3 − 5 = −2, а −2 + 16 = 14. Это называется **вычитанием по модулю 16**: ответ всегда остаётся в пределах от 0 до 15, лишние шестнадцатки отбрасываются.':
    'The `-` sign works the same as `+`. But a four-bit number has no negative values: the smallest is 0. What happens if you subtract 5 from 3?\n\nThe count "wraps around", like the readings of a counter where after 0 comes 15 again. We get 3 − 5 = −2, and −2 + 16 = 14. This is called **subtraction modulo 16**: the answer always stays between 0 and 15, extra sixteens are discarded.',
  'Ничего специально делать не надо': 'Nothing special needs to be done',
  'Хорошая новость: схема вычитания в четырёх битах так сама и работает, переполнение отбрасывается без нашего участия. Достаточно сделать выход четырёхбитным и написать `a - b`.\n\nЭто же поведение у настоящих процессоров: если результат не помещается, они молча хранят только младшие биты. Иногда это удобно, иногда ловушка — поэтому важно о нём знать.':
    'Good news: a subtraction circuit in four bits works like that by itself, the overflow is discarded without our help. It is enough to make the output four-bit and write `a - b`.\n\nReal processors behave the same way: if the result does not fit, they silently keep only the low bits. Sometimes this is convenient, sometimes it is a trap, so it is important to know about it.',
  'Чему равно 2 − 3 в четырёх битах по модулю 16?': 'What is 2 − 3 in four bits modulo 16?',
  '−1 (отрицательное число)': '−1 (a negative number)',
  '2 − 3 = −1, прибавим 16 и получим 15 (двоично 1111). Отрицательных чисел в четырёх беззнаковых битах нет.':
    '2 − 3 = −1, add 16 and we get 15 (binary 1111). There are no negative numbers in four unsigned bits.',
  'Вычти b из a. Выход y четырёхбитный: если b больше a, ответ должен «завернуться» по модулю 16.':
    'Subtract b from a. The output y is four-bit: if b is greater than a, the answer must "wrap around" modulo 16.',
  'Вычитание записывается знаком -. Порядок важен: из a вычитают b.':
    'Subtraction is written with the - sign. The order matters: b is subtracted from a.',
  'Заворачивать результат специально не нужно: выход всего четыре бита, лишнее отбросится само.':
    'You do not need to wrap the result on purpose: the output is only four bits, the extra is dropped by itself.',
  'Правильная строка: assign y = a - b;': 'The correct line: assign y = a - b;',
  'Инкремент: прибавить единицу': 'Increment: add one',
  '**Инкремент** — это увеличение числа на единицу. Он нужен везде, где что-то считают: счётчики, адреса, номера шагов. Запись простая: `a + 1`.\n\nВ четырёх битах после 15 (`1111`) идёт снова 0 (`0000`): единица переноса выпадает за край. Это то же самое «заворачивание по модулю 16», что и при вычитании.':
    '**Increment** is increasing a number by one. It is needed everywhere something is counted: counters, addresses, step numbers. The notation is simple: `a + 1`.\n\nIn four bits, after 15 (`1111`) comes 0 (`0000`) again: the carry one falls off the edge. This is the same "wrapping modulo 16" as in subtraction.',
  'Число с разрядностью': 'A number with a width',
  "В Verilog запись `1` без уточнений считается 32-битным числом, но на выход в четыре бита из этого попадут только младшие, так что результат правильный. Если хочется точности, пиши размер явно: `4'd1` — четырёхбитная единица в десятичной записи.":
    "In Verilog the notation `1` without clarification is considered a 32-bit number, but only the low bits of it get into a four-bit output, so the result is correct. If you want precision, write the size explicitly: `4'd1` is a four-bit one in decimal notation.",
  'Что получится при инкременте четырёхбитного числа 1111 (15)?':
    'What do we get when incrementing the four-bit number 1111 (15)?',
  'Результат 16 это `10000`, но выход четырёхбитный и хранит лишь младшие четыре бита: `0000`.':
    'The result 16 is `10000`, but the output is four-bit and keeps only the low four bits: `0000`.',
  'Увеличь четырёхбитное число a на единицу. После 15 должен получиться 0.':
    'Increase the four-bit number a by one. After 15 it must become 0.',
  'Нужно просто прибавить единицу к a.': 'You just need to add one to a.',
  'Переполнения бояться не надо: выход четырёхбитный, и 15 + 1 сам превратится в 0.':
    'You need not fear overflow: the output is four-bit, and 15 + 1 turns into 0 by itself.',
  "Правильная строка: assign y = a + 4'd1;": "The correct line: assign y = a + 4'd1;",
  'Отрицание: дополнительный код': "Negation: two's complement",
  'Как хранят минус': 'How a minus is stored',
  'Как записать в двоичной системе число −3? Знак минус в память не положишь. Придумали **дополнительный код**: число −a хранят как 16 − a (для четырёх бит), то есть как «то, что нужно добавить к a, чтобы получить ноль после заворачивания».\n\nПроверь: 3 + 13 = 16, а в четырёх битах 16 это 0. Значит, −3 хранится как 13 (`1101`).':
    'How do you write the number −3 in binary? A minus sign cannot be put into memory. **Two\'s complement** was invented: the number −a is stored as 16 − a (for four bits), that is as "what must be added to a to get zero after wrapping around".\n\nCheck: 3 + 13 = 16, and in four bits 16 is 0. So −3 is stored as 13 (`1101`).',
  'Правило «переверни и прибавь»': 'The rule "flip and add one"',
  'Быстрый способ получить −a: инвертировать все биты (`~a`) и прибавить единицу. Например, для 3: `0011` → `1100` → `1101`.\n\nВ Verilog хватит унарного минуса: `-a`. Он делает ровно это. Два особых случая: у нуля отрицание снова ноль, а у 8 (`1000`) — снова 8, ведь +8 не помещается в знаковые четыре бита, и 16 − 8 = 8.':
    'A quick way to get −a: invert all the bits (`~a`) and add one. For example, for 3: `0011` → `1100` → `1101`.\n\nIn Verilog the unary minus is enough: `-a`. It does exactly this. Two special cases: the negation of zero is zero again, and of 8 (`1000`) is 8 again, because +8 does not fit in four signed bits, and 16 − 8 = 8.',
  'Как в четырёх битах записывается −1?': 'How is −1 written in four bits?',
  '−1 хранится как 16 − 1 = 15, то есть 1111. Проверка: 1 + 15 = 16, что в четырёх битах 0.':
    '−1 is stored as 16 − 1 = 15, that is 1111. Check: 1 + 15 = 16, which in four bits is 0.',
  'Получи отрицание четырёхбитного числа a в дополнительном коде: выход y такой, что a + y равно 0 по модулю 16.':
    "Get the negation of the four-bit number a in two's complement: the output y is such that a + y equals 0 modulo 16.",
  'Отрицание — это число, которое вместе с a даёт ноль после заворачивания.':
    'A negation is the number that together with a gives zero after wrapping around.',
  'Можно инвертировать все биты и прибавить единицу, а можно воспользоваться унарным минусом.':
    'You can invert all the bits and add one, or use the unary minus.',
  'Правильная строка: assign y = -a;': 'The correct line: assign y = -a;',
  'Сравнение на равенство': 'Comparison for equality',
  'Равны или нет': 'Equal or not',
  'Две четырёхбитные шины равны, когда совпадает каждый бит. Для одного бита это делает элемент «исключающее ИЛИ-НЕ» (он даёт 1, если биты одинаковые). Для четырёх битов нужно ещё потребовать, чтобы совпали все.\n\nВ Verilog всё это спрятано в один знак `==`: он сравнивает числа целиком и даёт один бит — 1, если числа равны, иначе 0.':
    'Two four-bit buses are equal when every bit matches. For one bit this is done by the "exclusive NOR" gate (it gives 1 if the bits are the same). For four bits you also need to require that all of them match.\n\nIn Verilog all of this is hidden in one sign `==`: it compares numbers as a whole and gives one bit: 1 if the numbers are equal, otherwise 0.',
  'Не путай = и ==': 'Do not confuse = and ==',
  'Знак `=` в `assign y = ...` значит «присвоить»: подключить выход. Знак `==` значит «проверить на равенство» и выдаёт значение. Они делают разное, и если поставить один знак там, где нужно два, компилятор либо отвергнет код, либо ты получишь совсем другое поведение.\n\nПротивоположное сравнение — «не равно» — записывается `!=`.':
    'The `=` sign in `assign y = ...` means "assign": connect the output. The `==` sign means "check for equality" and produces a value. They do different things, and if you put one sign where two are needed, the compiler will either reject the code or you will get completely different behavior.\n\nThe opposite comparison, "not equal", is written `!=`.',
  'Чему равен выход y = (a == b) при a = 0110 и b = 0111?':
    'What is the output y = (a == b) for a = 0110 and b = 0111?',
  '1, ведь старшие три бита совпадают': '1, because the high three bits match',
  '0, ведь числа разные': '0, because the numbers are different',
  'Четырёхбитное число 0001': 'The four-bit number 0001',
  'Равенство требует совпадения всех битов. Здесь младший бит разный, поэтому результат 0. Выход при этом один бит.':
    'Equality requires all bits to match. Here the low bit differs, so the result is 0. The output is one bit.',
  'Сравни четырёхбитные числа a и b. Выход y равен 1, только если числа равны.':
    'Compare the four-bit numbers a and b. The output y is 1 only if the numbers are equal.',
  'Для проверки на равенство в Verilog есть отдельный знак из двух символов.':
    'For the equality check Verilog has a separate sign of two characters.',
  'Он сравнивает числа целиком и даёт один бит: 1 или 0.':
    'It compares numbers as a whole and gives one bit: 1 or 0.',
  'Правильная строка: assign y = (a == b);': 'The correct line: assign y = (a == b);',
  'Сравнение «меньше»': 'Comparison "less than"',
  'Больше и меньше': 'Greater and less',
  'Знаки `<`, `>`, `<=` и `>=` сравнивают числа по величине и выдают один бит. Для `a < b` выход равен 1, если a строго меньше b, и 0 при равенстве или когда a больше.\n\nЧисла в портах `[3:0]` считаются беззнаковыми: `1111` это 15, самое большое, а не «минус один». Поэтому 15 не меньше 0.':
    'The signs `<`, `>`, `<=` and `>=` compare numbers by magnitude and give one bit. For `a < b` the output is 1 if a is strictly less than b, and 0 when equal or when a is greater.\n\nNumbers in `[3:0]` ports are considered unsigned: `1111` is 15, the largest, not "minus one". So 15 is not less than 0.',
  'Равенство тоже даёт 0': 'Equality gives 0 too',
  'Самая частая ошибка новичка: забыть про равные числа. «Строго меньше» значит, что при a = b ответ должен быть 0. Если хочется «меньше или равно», пиши `<=`.\n\nЭтот же приём применяется для сравнения расстояний, порогов температуры или показаний датчика с уставкой.':
    'The most common beginner\'s mistake: forgetting about equal numbers. "Strictly less" means that when a = b the answer must be 0. If you want "less or equal", write `<=`.\n\nThe same technique is used to compare distances, temperature thresholds or a sensor reading with a setpoint.',
  'Чему равно (a < b) при a = 7 и b = 7?': 'What is (a < b) for a = 7 and b = 7?',
  'Зависит от схемы': 'Depends on the circuit',
  'Знак `<` означает «строго меньше». Числа равны, а значит a не меньше b, и результат 0.':
    'The `<` sign means "strictly less". The numbers are equal, so a is not less than b, and the result is 0.',
  'Выход y равен 1, когда четырёхбитное число a строго меньше числа b, и 0 в остальных случаях.':
    'The output y is 1 when the four-bit number a is strictly less than the number b, and 0 otherwise.',
  'Для «меньше» в Verilog есть знак из одного символа, он же знак из школьной математики.':
    'For "less than" Verilog has a one-character sign, the same as in school math.',
  'Равные числа должны давать 0.': 'Equal numbers must give 0.',
  'Правильная строка: assign y = (a < b);': 'The correct line: assign y = (a < b);',
  'Минимум из двух чисел': 'Minimum of two numbers',
  'Выбор по результату сравнения': 'Choice by the result of a comparison',
  'Чтобы выдать меньшее из двух чисел, нужно сначала узнать, какое меньше, а потом пропустить на выход его. Первое делает сравнение `a < b`, второе — оператор выбора.\n\nОн записывается так: `условие ? если_да : если_нет`. Если условие равно 1, получаем первое значение, иначе второе. По смыслу это переключатель — мультиплексор.':
    'To output the smaller of two numbers, you first need to find out which is smaller, and then pass it to the output. The first is done by the comparison `a < b`, the second by the selection operator.\n\nIt is written like this: `condition ? if_yes : if_no`. If the condition is 1, we get the first value, otherwise the second. In meaning it is a switch, a multiplexer.',
  'А если числа равны?': 'And if the numbers are equal?',
  'При a = b всё равно, какое число выдать: они одинаковые. В нашей записи при равенстве условие `a < b` ложно, и выбирается `b`; результат тот же.\n\nТо же самое с поменянными местами значениями даст максимум: `(a < b) ? b : a`.':
    'When a = b it does not matter which number to output: they are the same. In our notation, when equal the condition `a < b` is false, and `b` is chosen; the result is the same.\n\nThe same with the values swapped gives the maximum: `(a < b) ? b : a`.',
  'Что выдаст запись (a < b) ? a : b при a = 12 и b = 5?':
    'What will the expression (a < b) ? a : b give for a = 12 and b = 5?',
  'Условие 12 < 5 ложно, поэтому берётся значение после двоеточия, то есть b = 5. Это и есть меньшее число.':
    'The condition 12 < 5 is false, so the value after the colon is taken, that is b = 5. That is the smaller number.',
  'Выдай на выход y меньшее из двух четырёхбитных чисел a и b.':
    'Output the smaller of the two four-bit numbers a and b to the output y.',
  'Сначала сравни числа, потом выбери одно из них. Для выбора есть оператор вопросительный знак с двоеточием.':
    'First compare the numbers, then choose one of them. For choosing there is the operator with a question mark and a colon.',
  'Форма записи: условие ? значение_если_да : значение_если_нет.':
    'The form: condition ? value_if_yes : value_if_no.',
  'Правильная строка: assign y = (a < b) ? a : b;': 'The correct line: assign y = (a < b) ? a : b;',
  'a = 1 0 1 1\n      ↓ влево на 1\ny = 0 1 1 1   (старшая 1 ушла в младший разряд)':
    'a = 1 0 1 1\n      ↓ left by 1\ny = 0 1 1 1   (the high 1 went into the low place)',
  "a = 4'b0110 (это 6)\na << 1 = 1100 (это 12)\na >> 1 = 0011 (это 3)":
    "a = 4'b0110 (this is 6)\na << 1 = 1100 (this is 12)\na >> 1 = 0011 (this is 3)",
  's = 00  ->  a << 0 (без сдвига)\ns = 01  ->  a << 1\ns = 10  ->  a << 2\ns = 11  ->  a << 3':
    's = 00  ->  a << 0 (no shift)\ns = 01  ->  a << 1\ns = 10  ->  a << 2\ns = 11  ->  a << 3',
  'число  двоичный  Грей\n  0     0000     0000\n  1     0001     0001\n  2     0010     0011\n  3     0011     0010\n  4     0100     0110':
    'number  binary   Gray\n  0     0000     0000\n  1     0001     0001\n  2     0010     0011\n  3     0011     0010\n  4     0100     0110',
  ' aaa\nf   b\n ggg\ne   c\n ddd\n\nцифра 1: горят b и c\nseg = 0000110':
    ' aaa\nf   b\n ggg\ne   c\n ddd\n\ndigit 1: b and c are lit\nseg = 0000110',
  '0000 … 1001  ->  1 (цифры 0…9)\n1010 … 1111  ->  0 (не цифра)':
    '0000 … 1001  ->  1 (digits 0…9)\n1010 … 1111  ->  0 (not a digit)',
  'Развернуть порядок бит': 'Reverse the bit order',
  'Шина и её биты': 'A bus and its bits',
  'Сигнал из нескольких проводов называют **шиной**. Объявление `input wire [3:0] a` значит: у `a` четыре бита, номера от 3 (старший, слева) до 0 (младший, справа).\n\nОдин бит берут так: `a[0]` или `a[3]`. Это просто провод, и вычислять ничего не нужно.':
    'A signal made of several wires is called a **bus**. The declaration `input wire [3:0] a` means: `a` has four bits, numbered from 3 (most significant, on the left) to 0 (least significant, on the right).\n\nOne bit is taken like this: `a[0]` or `a[3]`. It is just a wire, and nothing has to be computed.',
  Склейка: 'Concatenation',
  'Фигурные скобки **склеивают** сигналы в новую шину: первый в списке становится старшим битом. Так можно собрать биты в любом порядке, и это не стоит ни одного элемента: просто провода идут по-другому.\n\nЧтобы развернуть порядок, надо взять биты с конца: сначала `a[0]`, потом `a[1]` и так далее.':
    'Curly braces **concatenate** signals into a new bus: the first in the list becomes the most significant bit. This way you can assemble bits in any order, and it costs not a single gate: the wires just run differently.\n\nTo reverse the order, take the bits from the end: first `a[0]`, then `a[1]` and so on.',
  "Что получится в `y`, если `a = 4'b1100` и `assign y = {a[0], a[1], a[2], a[3]};`?":
    "What will `y` be if `a = 4'b1100` and `assign y = {a[0], a[1], a[2], a[3]};`?",
  'Старший бит y берётся из a[0] = 0, затем a[1] = 0, a[2] = 1, a[3] = 1. Получается 0011: порядок бит перевёрнут.':
    'The most significant bit of y is taken from a[0] = 0, then a[1] = 0, a[2] = 1, a[3] = 1. The result is 0011: the order of bits is reversed.',
  'Выход y должен содержать те же биты, что и a, но в обратном порядке: старший бит a становится младшим в y.':
    'The output y must contain the same bits as a, but in reverse order: the most significant bit of a becomes the least significant in y.',
  'Нужна склейка в фигурных скобках: первым в списке идёт тот бит, который станет старшим в y.':
    'You need a concatenation in curly braces: the first in the list is the bit that will become the most significant in y.',
  'Старшим в y должен стать a[0], младшим a[3].':
    'The most significant in y must be a[0], the least significant a[3].',
  'Правильная строка: assign y = {a[0], a[1], a[2], a[3]};':
    'The correct line: assign y = {a[0], a[1], a[2], a[3]};',
  'Циклический сдвиг на один бит': 'Circular shift by one bit',
  'Сдвиг по кругу': 'Shifting around a circle',
  'При **циклическом сдвиге** (его ещё называют вращением) все биты сдвигаются на одно место, а тот, что выпал с края, возвращается с другой стороны. Ничего не теряется.\n\nСдвиг влево на 1: каждый бит переходит на разряд старше, а старший бит становится младшим.':
    'In a **circular shift** (also called a rotation) all bits move by one place, and the one that fell off the edge comes back on the other side. Nothing is lost.\n\nShift left by 1: each bit moves to the next higher place, and the most significant bit becomes the least significant.',
  'Ещё одна склейка': 'One more concatenation',
  'Это снова перестановка проводов. Возьми три младших бита `a[2:0]`: они станут тремя старшими битами результата. А в младший разряд поставь `a[3]`.\n\nЗапись `a[2:0]` называется **срезом**: это часть шины от бита 2 до бита 0.':
    'This is again a permutation of wires. Take the three low bits `a[2:0]`: they become the three high bits of the result. And put `a[3]` in the lowest place.\n\nThe notation `a[2:0]` is called a **slice**: it is the part of the bus from bit 2 to bit 0.',
  "Что получится при циклическом сдвиге влево на 1 для a = 4'b0110?":
    "What do we get from a circular shift left by 1 for a = 4'b0110?",
  'Биты 0110 сдвигаются влево: 1100. Старший бит был 0, он возвращается в младший разряд, поэтому справа тоже 0.':
    'The bits 0110 shift left: 1100. The high bit was 0, it returns into the lowest place, so the right side is also 0.',
  'Сделай циклический сдвиг 4 бит на 1 влево: старший бит a должен оказаться в младшем разряде y.':
    'Make a circular shift of 4 bits by 1 to the left: the high bit of a must end up in the lowest place of y.',
  'Три младших бита a должны стать тремя старшими битами y.':
    'The three low bits of a must become the three high bits of y.',
  'Срез a[2:0] даёт три младших бита. Бит a[3] нужно поставить в самый конец склейки.':
    'The slice a[2:0] gives the three low bits. The bit a[3] must go at the very end of the concatenation.',
  'Правильная строка: assign y = {a[2:0], a[3]};': 'The correct line: assign y = {a[2:0], a[3]};',
  'Сдвиг влево или вправо': 'Shift left or right',
  'Логический сдвиг': 'Logical shift',
  'При **логическом сдвиге** бит, вышедший за край, пропадает, а с другой стороны входит ноль. Сдвиг влево на 1 удваивает число, сдвиг вправо на 1 делит его пополам и отбрасывает остаток.\n\nВ Verilog есть операторы `<<` (влево) и `>>` (вправо). Число справа от оператора показывает, на сколько позиций сдвигать.':
    'In a **logical shift** the bit that goes past the edge disappears, and a zero comes in on the other side. A shift left by 1 doubles the number, a shift right by 1 halves it and discards the remainder.\n\nVerilog has the operators `<<` (left) and `>>` (right). The number to the right of the operator shows how many positions to shift.',
  'Выбор направления': 'Choosing the direction',
  'Чтобы направление выбирал вход `dir`, используем тернарный оператор: `условие ? если_да : если_нет`. Он работает как переключатель: при `dir = 1` выход берётся из одного выражения, иначе из другого.\n\nВ этом уроке `dir = 0` значит сдвиг влево, `dir = 1` значит вправо.':
    'So that the input `dir` chooses the direction, we use the ternary operator: `condition ? if_yes : if_no`. It works like a switch: with `dir = 1` the output is taken from one expression, otherwise from the other.\n\nIn this lesson `dir = 0` means a shift left, `dir = 1` means right.',
  "Чему равен 4-битный результат a << 1, если a = 4'b1010?":
    "What is the 4-bit result of a << 1 if a = 4'b1010?",
  'Все биты уходят влево: 1010 становится 0100. Старшая единица выпала за край, справа добавился ноль.':
    'All bits go to the left: 1010 becomes 0100. The high one fell off the edge, a zero was added on the right.',
  'Сдвинь a на один бит. Если dir = 0, сдвиг влево, если dir = 1, вправо. С пустого края входит ноль.':
    'Shift a by one bit. If dir = 0, shift left, if dir = 1, right. A zero comes in from the empty edge.',
  'Нужны два варианта: a << 1 и a >> 1. Между ними выбирает вход dir.':
    'You need two variants: a << 1 and a >> 1. The input dir chooses between them.',
  'Выбор делается оператором ? : . Если dir равен 1, берём сдвиг вправо.':
    'The choice is made with the ? : operator. If dir is 1, take the shift right.',
  'Правильная строка: assign y = dir ? (a >> 1) : (a << 1);':
    'The correct line: assign y = dir ? (a >> 1) : (a << 1);',
  'Сдвиг на несколько позиций': 'Shift by several positions',
  'Сдвиг на переменное число': 'Shifting by a variable amount',
  'Сдвигать на константу умеет любая схема, это просто провода. Но иногда нужно сдвигать на столько позиций, сколько сейчас задано входом. Такую схему называют **барабанным сдвигателем** (barrel shifter): в процессорах она сдвигает число за один такт.\n\nВ Verilog количество позиций можно взять из сигнала: `a << s`. Синтез сам построит схему с переключателями.':
    'Any circuit can shift by a constant, it is just wires. But sometimes you need to shift by as many positions as the input currently says. Such a circuit is called a **barrel shifter**: in processors it shifts a number in one clock.\n\nIn Verilog the number of positions can be taken from a signal: `a << s`. Synthesis will build the circuit with switches by itself.',
  'Ширина имеет значение': 'Width matters',
  'Выход `y` здесь 8-битный, как и `a`, поэтому лишние старшие биты после сдвига отбрасываются, а справа входят нули. Вход `s` двухбитный: он задаёт число от 0 до 3.':
    'The output `y` here is 8-bit, like `a`, so the extra high bits after the shift are discarded, and zeros come in on the right. The input `s` is two-bit: it sets a number from 0 to 3.',
  "Чему равен 8-битный y = a << s, если a = 8'b11000001 и s = 2'b10?":
    "What is the 8-bit y = a << s if a = 8'b11000001 and s = 2'b10?",
  'Сдвиг на 2 влево: два старших бита (11) выпадают, остаётся 000001, а справа добавляются два нуля. Получается 00000100.':
    'A shift left by 2: the two high bits (11) fall out, 000001 remains, and two zeros are added on the right. The result is 00000100.',
  'Сдвинь 8-битное число a влево на s позиций (s от 0 до 3). Выход y тоже 8 бит; справа входят нули.':
    'Shift the 8-bit number a to the left by s positions (s from 0 to 3). The output y is also 8 bits; zeros come in on the right.',
  'Оператор << принимает не только число, но и сигнал: количество позиций можно взять из s.':
    'The << operator takes not only a number but also a signal: the number of positions can be taken from s.',
  'Достаточно одного выражения: a сдвигается влево на s.':
    'One expression is enough: a is shifted left by s.',
  'Правильная строка: assign y = a << s;': 'The correct line: assign y = a << s;',
  'Сколько единиц в числе': 'How many ones in a number',
  'Подсчёт единиц': 'Counting ones',
  'Иногда нужно знать, сколько единиц среди битов числа. Такую схему называют **счётчиком единиц** (по-английски popcount). Её используют, например, для проверки чётности и в кодах, исправляющих ошибки.\n\nДля четырёх бит единиц может быть от 0 до 4. Число 4 записывается тремя битами (100), поэтому выход нужен шириной 3 бита.':
    'Sometimes you need to know how many ones there are among the bits of a number. Such a circuit is called a **ones counter** (popcount). It is used, for example, for parity checks and in error-correcting codes.\n\nFor four bits the number of ones can be from 0 to 4. The number 4 is written with three bits (100), so the output must be 3 bits wide.',
  'Биты можно складывать': 'Bits can be added',
  'Каждый бит `a[i]` равен 0 или 1, так что единицы подсчитываются обычным сложением: `a[0] + a[1] + a[2] + a[3]`.\n\nVerilog считает сумму в ширине результата. Раз `y` трёхбитный, сумма не потеряет старший бит, и четыре единицы дадут честные 100.':
    'Each bit `a[i]` is 0 or 1, so the ones are counted by ordinary addition: `a[0] + a[1] + a[2] + a[3]`.\n\nVerilog computes the sum in the width of the result. Since `y` is three-bit, the sum will not lose the high bit, and four ones will give an honest 100.',
  'Сколько бит нужно выходу счётчика единиц для 4-битного входа?':
    'How many bits does the output of a ones counter need for a 4-bit input?',
  '2 бита': '2 bits',
  '3 бита': '3 bits',
  'Единиц бывает от 0 до 4. Двумя битами можно записать только 0…3, а число 4 это 100, то есть нужны три бита.':
    'There can be from 0 to 4 ones. Two bits can hold only 0…3, and the number 4 is 100, so three bits are needed.',
  'Подсчитай, сколько единиц среди четырёх бит a, и выдай это число на трёхбитный выход y.':
    'Count how many ones there are among the four bits of a, and output that number on the three-bit output y.',
  'Каждый бит равен 0 или 1, значит, число единиц это сумма битов.':
    'Each bit is 0 or 1, so the number of ones is the sum of the bits.',
  'Бит берут так: a[0], a[1], a[2], a[3]. Сложи все четыре знаком +.':
    'A bit is taken like this: a[0], a[1], a[2], a[3]. Add all four with +.',
  'Правильная строка: assign y = a[0] + a[1] + a[2] + a[3];':
    'The correct line: assign y = a[0] + a[1] + a[2] + a[3];',
  'Код Грея: из двоичного': 'Gray code: from binary',
  'В обычном двоичном счёте при переходе от 3 к 4 (011 → 100) меняются сразу три бита. Если датчик положения при этом считывается чуть неодновременно, можно получить любое промежуточное число.\n\n**Код Грея** устроен так, что соседние числа отличаются ровно одним битом. Его ставят в датчиках углового положения (энкодерах) и в передаче чисел между разными тактами.':
    'In ordinary binary counting, on the transition from 3 to 4 (011 → 100) three bits change at once. If a position sensor is read slightly non-simultaneously at that moment, any intermediate number can be obtained.\n\n**Gray code** is built so that adjacent numbers differ in exactly one bit. It is used in angular position sensors (encoders) and in passing numbers between different clocks.',
  'Перевод в код Грея очень короткий: сдвинь число на 1 вправо и сложи с исходным побитно операцией `^` (исключающее ИЛИ). Старший бит при этом остаётся прежним, а каждый следующий становится «сам бит XOR соседний старше».':
    'Converting to Gray code is very short: shift the number right by 1 and add it bitwise to the original with the `^` operation (exclusive OR). The high bit stays the same, and each next one becomes "the bit itself XOR the neighboring higher one".',
  'Какой код Грея у двоичного числа 0110 (это 6)?':
    'What is the Gray code of the binary number 0110 (that is 6)?',
  'Формула b ^ (b >> 1): 0110 ^ 0011 = 0101.': 'The formula b ^ (b >> 1): 0110 ^ 0011 = 0101.',
  'Переведи 4-битное двоичное число b в код Грея g.':
    'Convert the 4-bit binary number b to Gray code g.',
  'Нужна операция ^ (исключающее ИЛИ) между b и самим b, только сдвинутым.':
    'You need the ^ operation (exclusive OR) between b and b itself, only shifted.',
  'Сдвиг вправо на 1 записывается как b >> 1.': 'A shift right by 1 is written b >> 1.',
  'Правильная строка: assign g = b ^ (b >> 1);': 'The correct line: assign g = b ^ (b >> 1);',
  'Код Грея: обратно в двоичный': 'Gray code: back to binary',
  'Обратный перевод': 'The reverse conversion',
  'Чтобы по коду Грея вернуть обычное число, старший бит оставляют как есть, а каждый следующий бит двоичного числа получают так: **предыдущий бит результата XOR текущий бит кода Грея**.\n\nТо есть в результате накапливается XOR всех битов кода, начиная со старшего.':
    'To get an ordinary number back from a Gray code, the high bit is left as is, and each next bit of the binary number is obtained like this: **the previous bit of the result XOR the current bit of the Gray code**.\n\nThat is, the XOR of all the code bits, starting from the high one, accumulates in the result.',
  'Каждый бит выхода можно записать отдельным `assign`, обращаясь к биту шины по номеру. Заметь, что `b[2]` считается через `b[3]`, то есть через уже посчитанный бит выхода: это нормально для комбинационной схемы, пока нет петли.':
    'Each bit of the output can be written with a separate `assign`, addressing a bit of the bus by number. Note that `b[2]` is computed through `b[3]`, that is, through an already computed bit of the output: this is fine for a combinational circuit as long as there is no loop.',
  'Код Грея g = 0101. Какое это двоичное число?':
    'The Gray code is g = 0101. What binary number is it?',
  'b3 = 0; b2 = 0 ^ 1 = 1; b1 = 1 ^ 0 = 1; b0 = 1 ^ 1 = 0. Получается 0110.':
    'b3 = 0; b2 = 0 ^ 1 = 1; b1 = 1 ^ 0 = 1; b0 = 1 ^ 1 = 0. The result is 0110.',
  'Переведи код Грея g обратно в обычное двоичное число b. Старший бит совпадает, остальные получаются цепочкой XOR.':
    'Convert the Gray code g back to an ordinary binary number b. The high bit is the same, the others are obtained by a chain of XORs.',
  'Старший бит остаётся тем же: b[3] = g[3]. Остальные считаются по очереди.':
    'The high bit stays the same: b[3] = g[3]. The others are computed in turn.',
  'Каждый следующий бит равен предыдущему биту b, сложенному XOR с битом g того же разряда.':
    'Each next bit equals the previous bit of b XORed with the bit of g in the same place.',
  'Пиши по строке на каждый бит: assign b[2] = b[3] ^ g[2]; и так далее до b[0].':
    'Write one line per bit: assign b[2] = b[3] ^ g[2]; and so on down to b[0].',
  'Шестнадцатеричная цифра на индикаторе': 'A hexadecimal digit on a display',
  'Семь сегментов': 'Seven segments',
  '**Семисегментный индикатор** это семь светящихся полосок, обозначенных буквами a…g. Зажигая нужные, рисуют цифру. Верхняя полоска `a`, дальше по часовой стрелке `b`, `c`, `d`, `e`, `f`, а `g` посередине.\n\nВыход `seg` у нас семибитный: один бит на один сегмент, порядок **gfedcba** (старший бит `g`, младший `a`). Активный уровень 1: сегмент горит, когда его бит равен 1.':
    'A **seven-segment display** is seven light strips labeled with the letters a…g. By lighting the right ones, a digit is drawn. The top strip is `a`, then clockwise `b`, `c`, `d`, `e`, `f`, and `g` is in the middle.\n\nOur output `seg` is seven-bit: one bit per segment, in the order **gfedcba** (the high bit is `g`, the low bit is `a`). The active level is 1: a segment is lit when its bit is 1.',
  'Таблица через case': 'A table through case',
  'Шестнадцатеричная цифра занимает 4 бита (0…9 и A…F). Для таблицы «вход → набор сегментов» удобна конструкция `case`: перечисляешь значения входа и что на них выдавать. Её пишут внутри `always @(*)`, а выход объявляют как `output reg`.\n\nНоль не включает только `g`, поэтому `0111111`; единица включает `b` и `c`, поэтому `0000110`. Буквы A…F, как принято, показывают как A, b, C, d, E, F.':
    'A hexadecimal digit takes 4 bits (0…9 and A…F). For an "input → set of segments" table the `case` construct is convenient: you list the input values and what to output for them. It is written inside `always @(*)`, and the output is declared as `output reg`.\n\nZero does not turn on only `g`, so `0111111`; one turns on `b` and `c`, so `0000110`. The letters A…F are, as usual, shown as A, b, C, d, E, F.',
  'Как закодирована цифра 8 на индикаторе с порядком gfedcba и активным уровнем 1?':
    'How is the digit 8 encoded on a display with the order gfedcba and active level 1?',
  'Для цифры 8 горят все семь сегментов, значит, все семь битов равны 1. Нули выключали бы сегменты.':
    'For the digit 8 all seven segments are lit, so all seven bits are 1. Zeros would turn segments off.',
  'Преобразуй цифру d (0…F) в семь сегментов seg: порядок gfedcba, активный уровень 1. Значения в шестнадцатеричной записи: 0=3F, 1=06, 2=5B, 3=4F, 4=66, 5=6D, 6=7D, 7=07, 8=7F, 9=6F, A=77, b=7C, C=39, d=5E, E=79, F=71.':
    'Convert the digit d (0…F) into seven segments seg: order gfedcba, active level 1. Values in hexadecimal: 0=3F, 1=06, 2=5B, 3=4F, 4=66, 5=6D, 6=7D, 7=07, 8=7F, 9=6F, A=77, b=7C, C=39, d=5E, E=79, F=71.',
  'Внутри always @(*) поставь case (d) и на каждое значение d выдай свой набор сегментов.':
    'Inside always @(*) put case (d) and for each value of d output its own set of segments.',
  "Записывать удобно в шестнадцатеричном виде: 7'h3F для нуля, 7'h06 для единицы. Все значения даны в тексте задания.":
    "It is convenient to write in hexadecimal: 7'h3F for zero, 7'h06 for one. All the values are given in the task text.",
  "Строки вида 4'h2: seg = 7'h5B; для всех значений; последнее (F) можно записать как default.":
    "Lines like 4'h2: seg = 7'h5B; for all the values; the last one (F) can be written as default.",
  'Правильная десятичная цифра': 'A valid decimal digit',
  'Лишние комбинации': 'Extra combinations',
  'В **двоично-десятичном коде** (BCD, binary-coded decimal) каждая десятичная цифра хранится в четырёх битах: от 0000 (0) до 1001 (9). Но четыре бита дают 16 комбинаций, а цифр десять, поэтому комбинации 1010…1111 в BCD не бывают: это ошибка.\n\nСхема проверки должна выдавать 1 для правильных цифр и 0 для остальных.':
    'In **binary-coded decimal** (BCD) each decimal digit is stored in four bits: from 0000 (0) to 1001 (9). But four bits give 16 combinations, and there are ten digits, so the combinations 1010…1111 do not occur in BCD: that is an error.\n\nThe checking circuit must output 1 for valid digits and 0 for the rest.',
  Сравнение: 'Comparison',
  "Проверку можно записать как сравнение: `a <= 4'd9` даёт 1, если число не больше 9. Запись `4'd9` это четырёхбитное десятичное число 9. Сравнение идёт без знака: вход описан просто как шина.":
    "The check can be written as a comparison: `a <= 4'd9` gives 1 if the number is not greater than 9. The notation `4'd9` is the four-bit decimal number 9. The comparison is unsigned: the input is described simply as a bus.",
  'Для какого значения a схема проверки BCD выдаст 0?':
    'For which value of a will the BCD check circuit output 0?',
  '1010 это число 10, а цифра в BCD не может быть больше 9. Значения 1001 и 0000 это правильные цифры 9 и 0.':
    '1010 is the number 10, and a BCD digit cannot be greater than 9. The values 1001 and 0000 are valid digits 9 and 0.',
  'Выход y должен быть 1, если 4-битное число a это цифра от 0 до 9, и 0 для значений 10…15.':
    'The output y must be 1 if the 4-bit number a is a digit from 0 to 9, and 0 for the values 10…15.',
  'Нужно сравнить число a с девяткой.': 'You need to compare the number a with nine.',
  "Знак «не больше» в Verilog записывается как <=. Девятка в четыре бита: 4'd9.":
    'The "not greater than" sign in Verilog is written <=. Nine in four bits: 4\'d9.',
  "Правильная строка: assign y = (a <= 4'd9);": "The correct line: assign y = (a <= 4'd9);",
  'clk: _|‾|_|‾|_|‾|_\n       ^   ^   ^   передние фронты':
    'clk: _|‾|_|‾|_|‾|_\n       ^   ^   ^   rising edges',
  'clk: _|‾‾|__|‾‾|__|‾‾|__\nd:   __|‾‾‾‾‾‾|_____|‾|____\nq:   ____|‾‾‾‾‾‾‾‾‾‾|______\n         ^ ^         ^\n      фронты, на которых q обновился':
    'clk: _|‾‾|__|‾‾|__|‾‾|__\nd:   __|‾‾‾‾‾‾|_____|‾|____\nq:   ____|‾‾‾‾‾‾‾‾‾‾|______\n         ^ ^         ^\n      edges on which q was updated',
  'такт:  0     1     2     3\nen:    1     0     0     1\nd:     5     F     3     3\nq:     5     5     5     3':
    'clock: 0     1     2     3\nen:    1     0     0     1\nd:     5     F     3     3\nq:     5     5     5     3',
  'такт:   0  1  2  3  4  5\nreset:  1  0  0  0  1  0\nd:      1  1  0  1  1  1\nq:      0  1  0  1  0  1':
    'clock:  0  1  2  3  4  5\nreset: 1  0  0  0  1  0\nd:     1  1  0  1  1  1\nq:     0  1  0  1  0  1',
  "// синхронный\nalways @(posedge clk)\n    if (reset) q <= 1'b0; else q <= d;\n\n// асинхронный\nalways @(posedge clk or posedge reset)\n    if (reset) q <= 1'b0; else q <= d;":
    "// synchronous\nalways @(posedge clk)\n    if (reset) q <= 1'b0; else q <= d;\n\n// asynchronous\nalways @(posedge clk or posedge reset)\n    if (reset) q <= 1'b0; else q <= d;",
  'clk:   _|‾‾|__|‾‾|__|‾‾|__\nreset: ______|‾|_________\nасинхр. q: ‾‾‾‾‾‾‾‾|______   (упал сразу)\nсинхр.  q: ‾‾‾‾‾‾‾‾‾‾‾‾‾‾   (не заметил)':
    'clk:   _|‾‾|__|‾‾|__|‾‾|__\nreset: ______|‾|_________\nasync q: ‾‾‾‾‾‾‾‾|______   (dropped at once)\nsync  q: ‾‾‾‾‾‾‾‾‾‾‾‾‾‾   (did not notice)',
  't = 1:  0 -> 1 -> 0 -> 1 ...\nt = 0:  значение держится':
    't = 1:  0 -> 1 -> 0 -> 1 ...\nt = 0:  the value holds',
  'кнопка: ___|‾‾‾‾‾‾‾‾‾|___\nнужно:     ^ одно переключение':
    'button: ___|‾‾‾‾‾‾‾‾‾|___\nneeded:     ^ one toggle',
  'такт:  0 1 2 3 4 5 6\nbtn:   0 0 1 1 1 0 0\nprev:  0 0 0 1 1 1 0\nbtn&~prev: 0 0 1 0 0 0 0':
    'clock: 0 1 2 3 4 5 6\nbtn:   0 0 1 1 1 0 0\nprev:  0 0 0 1 1 1 0\nbtn&~prev: 0 0 1 0 0 0 0',
  'такт: 0 1 2 3 4 5 6 7\nsig:  0 0 1 1 1 0 1 1\npulse:0 0 1 0 0 0 1 0':
    'clock: 0 1 2 3 4 5 6 7\nsig:   0 0 1 1 1 0 1 1\npulse: 0 0 1 0 0 0 1 0',
  'D-триггер: запомнить по фронту': 'D flip-flop: remember on the edge',
  'До сих пор выход схемы зависел только от того, что на входах прямо сейчас. Но чтобы считать нажатия или хранить число, схеме нужна **память**: способность помнить то, что было раньше.\n\nСамая маленькая ячейка памяти называется **D-триггер**. У неё есть вход данных `d`, выход `q` и вход такта `clk` (от английского clock, «часы»). Такт — это сигнал, который всё время переключается 0, 1, 0, 1 с постоянной скоростью. Момент, когда он переходит из 0 в 1, называется **передним фронтом**.':
    'So far the output of a circuit depended only on what is on the inputs right now. But to count presses or store a number, a circuit needs **memory**: the ability to remember what was before.\n\nThe smallest memory cell is called a **D flip-flop**. It has a data input `d`, an output `q` and a clock input `clk`. The clock is a signal that keeps switching 0, 1, 0, 1 at a constant rate. The moment it goes from 0 to 1 is called the **rising edge**.',
  'Правило триггера': 'The flip-flop rule',
  'Триггер смотрит на `d` только в момент переднего фронта и записывает увиденное в `q`. Между фронтами он на `d` не обращает внимания: даже если `d` прыгает, `q` стоит на месте.\n\nВ Verilog это записывается блоком `always @(posedge clk)`: «делай это при каждом переднем фронте clk». Внутри пишут присваивание `q <= d;`. Знак `<=` здесь не «меньше или равно», а **неблокирующее присваивание**: так принято записывать любую память.\n\nВыход, в который пишут внутри `always`, объявляют как `output reg`.':
    'The flip-flop looks at `d` only at the moment of the rising edge and writes what it saw into `q`. Between edges it pays no attention to `d`: even if `d` jumps, `q` stays put.\n\nIn Verilog this is written with an `always @(posedge clk)` block: "do this on every rising edge of clk". Inside you write the assignment `q <= d;`. The `<=` sign here is not "less or equal" but a **nonblocking assignment**: this is how any memory is written.\n\nThe output that is written inside `always` is declared as `output reg`.',
  'Что видно на диаграмме': 'What you see on the diagram',
  'Смотри, как `q` повторяет `d`, но только с очередного фронта и до следующего. Короткий скачок `d` между фронтами триггер просто не заметил.':
    'Look at how `q` repeats `d`, but only from one edge to the next. The short jump of `d` between edges the flip-flop simply did not notice.',
  'Вход d равен 1 между двумя фронтами, а перед следующим фронтом стал 0. Что запишет триггер?':
    'The input d is 1 between two edges, and before the next edge it became 0. What will the flip-flop store?',
  '1, потому что d был 1 дольше': '1, because d was 1 for longer',
  '0, потому что он смотрит на d в момент фронта':
    '0, because it looks at d at the moment of the edge',
  'Ничего не запишет, q станет неопределённым': 'Nothing, q will become undefined',
  'Триггер читает d только в момент фронта. Что было с d до этого момента, ему безразлично.':
    'The flip-flop reads d only at the moment of the edge. What happened to d before that moment does not matter to it.',
  'Сделай D-триггер: на каждом переднем фронте clk выход q получает значение входа d. Между фронтами q не должен меняться, даже если d меняется.':
    'Make a D flip-flop: on every rising edge of clk the output q gets the value of the input d. Between edges q must not change, even if d changes.',
  'Фронт взял 1, потом d упал': 'The edge took 1, then d dropped',
  'Фронт взял 0': 'The edge took 0',
  'Фронт взял 1': 'The edge took 1',
  'Единица записана, d упал после фронта': 'The one is stored, d dropped after the edge',
  'Снова фронт взял 0': 'Again the edge took 0',
  'Снова 1, d упал сразу после фронта': 'Again 1, d dropped right after the edge',
  'Блок always @(posedge clk) срабатывает на каждом переднем фронте. Подумай, что нужно положить в q в этот момент.':
    'The always @(posedge clk) block fires on every rising edge. Think about what to put into q at that moment.',
  'Нужно записать в q то, что в этот момент лежит на входе d. Используй знак <=, а не =.':
    'You need to write into q whatever is on the input d at that moment. Use the <= sign, not =.',
  'Правильная строка: q <= d;': 'The correct line: q <= d;',
  'Регистр с разрешением': 'A register with enable',
  'Несколько триггеров вместе': 'Several flip-flops together',
  '**Регистр** — это несколько D-триггеров с общим тактом: они хранят число. Четыре триггера хранят четыре бита, то есть число от 0 до 15. В Verilog ширину пишут в квадратных скобках: `[3:0]` — это четыре бита, старший имеет номер 3.\n\nРегистр из прошлого урока записывал новое значение на каждом фронте. Но часто нужно, чтобы он помнил число долго, а менялся только когда мы разрешим.':
    'A **register** is several D flip-flops with a common clock: they store a number. Four flip-flops store four bits, that is a number from 0 to 15. In Verilog the width is written in square brackets: `[3:0]` is four bits, the most significant has number 3.\n\nThe register from the previous lesson wrote a new value on every edge. But often it must remember a number for a long time and change only when we allow it.',
  'Разрешающий вход': 'The enable input',
  'Добавим вход **разрешения** `en` (от enable). Если на фронте `en = 1`, регистр берёт `d`. Если `en = 0`, регистр оставляет прежнее значение: просто ничего в него не пишем.\n\nУ регистра нет «стирающего» состояния: пока ты ничего не присвоил, он помнит старое. Поэтому ветку «иначе держим» писать не нужно.':
    'Let us add an **enable** input `en`. If `en = 1` on the edge, the register takes `d`. If `en = 0`, the register keeps its previous value: we simply write nothing into it.\n\nA register has no "erasing" state: as long as you assign nothing, it remembers the old value. So the "otherwise hold" branch does not need to be written.',
  Диаграмма: 'The diagram',
  'Данные `d` меняются и в паузе, когда `en = 0`. Регистр на это не реагирует.':
    'The data `d` changes even during the pause when `en = 0`. The register does not react to it.',
  'На фронте en = 0, а d изменилось. Чему равен q после фронта?':
    'On the edge en = 0, and d has changed. What is q after the edge?',
  'Новому значению d': 'The new value of d',
  Нулю: 'Zero',
  'Прежнему значению q': 'The previous value of q',
  'Без разрешения регистр ничего не записывает, а значит, помнит то, что было.':
    'Without enable the register writes nothing, which means it remembers what was there.',
  'Сделай 4-битный регистр: на фронте clk, если en = 1, q получает d; если en = 0, q остаётся прежним.':
    'Make a 4-bit register: on the edge of clk, if en = 1, q gets d; if en = 0, q stays the same.',
  'Разрешено: запись 0101': 'Enabled: write 0101',
  'Пауза: d = 1111, держим': 'Pause: d = 1111, hold',
  'Пауза: d сменилось на 0011': 'Pause: d changed to 0011',
  'Разрешено: запись 0011': 'Enabled: write 0011',
  'Разрешено: запись 1010': 'Enabled: write 1010',
  'Пауза: d = 0001, держим': 'Pause: d = 0001, hold',
  'Запись в q нужна не на каждом фронте, а только когда en равно 1. Для условия в Verilog есть if.':
    'Writing into q is needed not on every edge, but only when en is 1. For a condition Verilog has if.',
  'Внутри always поставь if (en) перед присваиванием. Ветка else не нужна: без присваивания q помнит старое.':
    'Inside always put if (en) before the assignment. The else branch is not needed: without an assignment q remembers the old value.',
  'Правильный блок: always @(posedge clk) if (en) q <= d;':
    'The correct block: always @(posedge clk) if (en) q <= d;',
  'Асинхронный сброс': 'Asynchronous reset',
  'Зачем нужен сброс': 'Why a reset is needed',
  'Когда плата включается, триггеры находятся в неизвестном состоянии: в схеме нет ни 0, ни 1. Чтобы начать работу с понятного места, добавляют вход **сброса** `reset`: пока он равен 1, выход триггера принудительно становится 0.\n\nСброс бывает двух видов. **Асинхронный** действует сразу, как только `reset` стал 1, не дожидаясь такта. Про второй вид, синхронный, мы поговорим в следующем уроке.':
    "When the board is powered on, the flip-flops are in an unknown state: there is neither 0 nor 1 in the circuit. To start from a clear place, a **reset** input `reset` is added: while it is 1, the flip-flop's output is forced to 0.\n\nThere are two kinds of reset. **Asynchronous** acts immediately, as soon as `reset` becomes 1, without waiting for the clock. We will talk about the second kind, synchronous, in the next lesson.",
  'Асинхронный сброс добавляют в список «событий» блока always: `always @(posedge clk or posedge reset)`. Читается так: «делай это при переднем фронте clk **или** при переднем фронте reset».\n\nВнутри первым проверяют сброс: он главнее данных. Если `reset = 1`, пишем 0, иначе работаем как обычный триггер.':
    'An asynchronous reset is added to the list of "events" of the always block: `always @(posedge clk or posedge reset)`. It reads: "do this on the rising edge of clk **or** on the rising edge of reset".\n\nInside, the reset is checked first: it is more important than the data. If `reset = 1`, we write 0, otherwise we work like an ordinary flip-flop.',
  'Что получится': 'What we get',
  'Пока `reset = 1`, значение `d` никого не интересует: `q` остаётся нулём, сколько бы тактов ни прошло. Как только сброс отпущен, триггер снова слушает `d` на фронтах.':
    'While `reset = 1`, the value of `d` interests nobody: `q` stays zero no matter how many clocks pass. As soon as the reset is released, the flip-flop listens to `d` on the edges again.',
  'Сигналы reset = 1 и d = 1 одновременно на фронте. Каким будет q?':
    'The signals reset = 1 and d = 1 at the same time on an edge. What will q be?',
  '1: данные важнее': '1: data is more important',
  '0: сброс главнее данных': '0: reset is more important than data',
  'Неопределённым: сигналы спорят': 'Undefined: the signals argue',
  'В коде сброс проверяется первым, поэтому при reset = 1 в q всегда пишется 0.':
    'In the code the reset is checked first, so with reset = 1 a 0 is always written into q.',
  'Добавь триггеру асинхронный сброс: пока reset = 1, выход q равен 0, иначе на фронте q получает d. Помни, что сброс сильнее данных.':
    'Add an asynchronous reset to the flip-flop: while reset = 1 the output q is 0, otherwise on the edge q gets d. Remember that reset is stronger than data.',
  'Сброс при d = 1': 'Reset with d = 1',
  'Сброс снят: запись 1': 'Reset released: write 1',
  'Запись 0': 'Write 0',
  'Запись 1': 'Write 1',
  'Сброс при d = 1 стирает единицу': 'Reset with d = 1 erases the one',
  'Сброс держится, d = 0': 'Reset held, d = 0',
  'Сброс снят снова: запись 1': 'Reset released again: write 1',
  'В список событий нужно добавить сброс: always @(posedge clk or posedge reset).':
    'You need to add the reset to the list of events: always @(posedge clk or posedge reset).',
  'Внутри первой веткой проверь if (reset) и запиши в q ноль, а в else оставь q <= d.':
    'Inside, check if (reset) first and write zero into q, and in else leave q <= d.',
  "Правильный блок: always @(posedge clk or posedge reset) if (reset) q <= 1'b0; else q <= d;":
    "The correct block: always @(posedge clk or posedge reset) if (reset) q <= 1'b0; else q <= d;",
  'Сброс сразу или по такту': 'Reset immediately or on the clock',
  'Два вида сброса': 'Two kinds of reset',
  'Сброс бывает синхронным и асинхронным, и отличить их можно по одному признаку: **когда выход становится 0**.\n\n- **Синхронный** сброс сидит внутри `always @(posedge clk)`. Схема замечает `reset = 1` только на фронте, поэтому выход меняется лишь на ближайшем фронте.\n- **Асинхронный** сброс стоит в списке событий: `always @(posedge clk or posedge reset)`. Выход становится 0 сразу, не дожидаясь такта.':
    'A reset can be synchronous or asynchronous, and they can be told apart by one feature: **when the output becomes 0**.\n\n- A **synchronous** reset sits inside `always @(posedge clk)`. The circuit notices `reset = 1` only on an edge, so the output changes only on the nearest edge.\n- An **asynchronous** reset is in the list of events: `always @(posedge clk or posedge reset)`. The output becomes 0 immediately, without waiting for the clock.',
  'Короткий импульс сброса': 'A short reset pulse',
  'Пусть между двумя фронтами `reset` на мгновение стал 1 и снова 0. Асинхронный триггер успеет его заметить и обнулиться. Синхронный не заметит ничего: на фронте `reset` уже 0, и импульс пролетел мимо.\n\nУ каждого вида свои плюсы. Синхронный сброс безопаснее для схемы: он меняет состояние только вместе с тактом. Асинхронный не требует работающего такта и срабатывает мгновенно.':
    'Suppose between two edges `reset` becomes 1 for a moment and 0 again. An asynchronous flip-flop will manage to notice it and clear. A synchronous one will notice nothing: on the edge `reset` is already 0, and the pulse flew by.\n\nEach kind has its advantages. A synchronous reset is safer for the circuit: it changes the state only together with the clock. An asynchronous one does not need a running clock and acts instantly.',
  'Между фронтами reset был 1 лишь 1 нс. На каком фронте обнулится синхронный триггер?':
    'Between edges reset was 1 for only 1 ns. On which edge will a synchronous flip-flop clear?',
  'На ближайшем: он видит импульс': 'On the nearest one: it sees the pulse',
  'Ни на каком: на фронте reset уже 0': 'On none: on the edge reset is already 0',
  'Сразу, как асинхронный': 'Immediately, like an asynchronous one',
  'Синхронный триггер смотрит на reset только в момент фронта. Если импульс закончился раньше, триггер его не увидит.':
    'A synchronous flip-flop looks at reset only at the moment of the edge. If the pulse ended earlier, the flip-flop will not see it.',
  'Сейчас сброс синхронный, и короткий импульс reset между фронтами пропадает. Сделай сброс асинхронным: q должен обнуляться сразу. Данные грузятся только при en = 1.':
    'Now the reset is synchronous, and a short reset pulse between edges is lost. Make the reset asynchronous: q must clear immediately. Data is loaded only when en = 1.',
  'Короткий импульс сброса между фронтами': 'A short reset pulse between edges',
  'Разрешение снято, 0 сохранён': 'Enable off, 0 kept',
  'Сброс держится через фронт': 'Reset held across an edge',
  'Сброс снят между фронтами: q остаётся 0': 'Reset released between edges: q stays 0',
  'Разрешение всё ещё снято': 'Enable is still off',
  'Задача в том, чтобы триггер просыпался не только по фронту clk, но и по фронту reset. Это список событий после @.':
    'The point is that the flip-flop must wake up not only on the edge of clk, but also on the edge of reset. This is the event list after @.',
  'Замени always @(posedge clk) на always @(posedge clk or posedge reset).':
    'Replace always @(posedge clk) with always @(posedge clk or posedge reset).',
  'Остальной код менять не нужно: if (reset) обнуляет, else if (en) грузит d.':
    'The rest of the code does not need to change: if (reset) clears, else if (en) loads d.',
  'Триггер-переключатель': 'A toggle flip-flop',
  '**T-триггер** меняет выход на противоположный каждый раз, когда на фронте `t = 1`. Если `t = 0`, выход остаётся как был. Буква T от английского toggle, «переключать».\n\nЕго можно сделать из D-триггера: нужно подать на `d` значение `~q`, то есть выход, перевёрнутый знаком `~`.':
    'A **T flip-flop** flips its output every time `t = 1` on an edge. If `t = 0`, the output stays as it was. The letter T is from toggle.\n\nIt can be made from a D flip-flop: feed `d` with `~q`, that is the output flipped with the `~` sign.',
  Код: 'The code',
  'Внутри блока читаем `q` и записываем перевёрнутое значение. Присваивание `q <= ~q;` происходит в момент фронта, поэтому читается ещё старое `q`, и всё получается правильно.\n\nНачальное состояние берём из сброса: у `q` без сброса значение неизвестно, а переворот неизвестного остаётся неизвестным.':
    'Inside the block we read `q` and write the flipped value. The assignment `q <= ~q;` happens at the moment of the edge, so the old `q` is still read, and everything comes out right.\n\nWe take the initial state from the reset: `q` without a reset has an unknown value, and flipping an unknown stays unknown.',
  'Делитель на два': 'Divide by two',
  'Если держать `t = 1` постоянно, `q` меняется на каждом фронте: сначала 1, потом 0, потом снова 1. Один полный период `q` длится два такта, то есть частота вдвое меньше тактовой. Так триггер работает делителем частоты, и на этом строятся счётчики.':
    'If you hold `t = 1` all the time, `q` changes on every edge: first 1, then 0, then 1 again. One full period of `q` lasts two clocks, that is the frequency is half the clock frequency. This is how a flip-flop works as a frequency divider, and counters are built on this.',
  't = 1 держится восемь тактов подряд. Сколько раз выход q сменит значение?':
    't = 1 is held for eight clocks in a row. How many times will the output q change its value?',
  'Восемь раз': 'Eight times',
  'Ни разу: нужен сброс': 'Never: a reset is needed',
  'При t = 1 на каждом фронте q переворачивается, значит восемь фронтов дают восемь смен.':
    'With t = 1, q flips on every edge, so eight edges give eight changes.',
  'Сделай T-триггер: на фронте при t = 1 выход q переворачивается, при t = 0 остаётся. Сброс reset (асинхронный) ставит q в 0 и главнее t.':
    'Make a T flip-flop: on an edge with t = 1 the output q flips, with t = 0 it stays. The reset (asynchronous) sets q to 0 and is stronger than t.',
  'Сброс: q = 0': 'Reset: q = 0',
  't = 1: q стал 1': 't = 1: q became 1',
  't = 1: q стал 0': 't = 1: q became 0',
  't = 0: держим 0': 't = 0: hold 0',
  't = 0: всё ещё 0': 't = 0: still 0',
  'Снова t = 1: q стал 1': 'Again t = 1: q became 1',
  't = 0: держим 1': 't = 0: hold 1',
  'Снова t = 1: q стал 0': 'Again t = 1: q became 0',
  'Сброс при t = 1 главнее': 'Reset with t = 1 is stronger',
  'Сброс снят, t = 1: q стал 1': 'Reset released, t = 1: q became 1',
  'Нужно менять q только когда t равно 1. Подойдёт else if (t).':
    'You must change q only when t is 1. else if (t) will do.',
  'Перевернуть значение можно знаком ~. Запись в q должна быть перевёрнутым самим q.':
    'A value can be flipped with the ~ sign. The write into q must be the flipped q itself.',
  'Правильная строка вместо else q <= q: else if (t) q <= ~q;':
    'The correct line instead of else q <= q: else if (t) q <= ~q;',
  'Нажал: переключил': 'Pressed: toggled',
  'Одно нажатие, одно переключение': 'One press, one toggle',
  'Хочется, чтобы светодиод менял состояние при каждом нажатии кнопки: нажали, включился; нажали ещё раз, выключился. Первая мысль: «если кнопка нажата, переверни светодиод». Но схема работает на частоте тактов, миллионы раз в секунду, а нажатие длится десятые доли секунды. За время одного нажатия светодиод успеет переключиться миллионы раз, и итог будет случайным.\n\nНам нужно переключать **один раз за нажатие**, в момент, когда кнопка только что стала нажатой.':
    'We want an LED to change state on every button press: pressed, it turns on; pressed again, it turns off. The first thought: "if the button is pressed, flip the LED". But the circuit works at the clock rate, millions of times a second, and a press lasts tenths of a second. During one press the LED will manage to toggle millions of times, and the outcome will be random.\n\nWe need to toggle **once per press**, at the moment when the button has just become pressed.',
  'Ловим фронт внутри схемы': 'Catching the edge inside the circuit',
  'Моменты, когда кнопка только что нажата, можно поймать так: запоминаем значение кнопки с прошлого такта в регистре `prev`. Если сейчас `btn = 1`, а раньше было `prev = 0`, значит, кнопку нажали именно сейчас.\n\nУсловие `btn & ~prev` истинно один такт на каждое нажатие. При удержании `prev` становится 1, условие гаснет, и светодиод больше не переворачивается.':
    'The moments when the button has just been pressed can be caught like this: we remember the button value from the previous clock in a register `prev`. If now `btn = 1`, and earlier `prev = 0`, then the button was pressed right now.\n\nThe condition `btn & ~prev` is true for one clock per press. While the button is held, `prev` becomes 1, the condition goes out, and the LED is no longer flipped.',
  'Регистр `prev` обновляется на каждом фронте. Светодиод переворачивается при `btn & ~prev`. Оба регистра обнуляются синхронным сбросом, чтобы начать с понятного состояния.\n\nНа плате светодиоды включаются нулём, но здесь для простоты `led = 1` значит «горит». Инверсию платы мы учтём позже.':
    'The register `prev` is updated on every edge. The LED is flipped on `btn & ~prev`. Both registers are cleared by a synchronous reset to start from a clear state.\n\nOn the board the LEDs turn on with zero, but here for simplicity `led = 1` means "lit". We will account for the board\'s inversion later.',
  'Кнопку держат нажатой 100 тактов. Сколько раз переключится светодиод в схеме с условием btn & ~prev?':
    'The button is held pressed for 100 clocks. How many times will the LED toggle in the circuit with the condition btn & ~prev?',
  '100 раз': '100 times',
  'Ни одного: prev блокирует всё': 'None: prev blocks everything',
  'Условие btn & ~prev верно только на первом такте нажатия. Потом prev становится 1, и условие ложно.':
    'The condition btn & ~prev is true only on the first clock of the press. After that prev becomes 1, and the condition is false.',
  'Светодиод led должен переключаться один раз за каждое нажатие btn, а не на каждом такте, пока кнопка нажата. Используй регистр prev для значения кнопки на прошлом такте.':
    'The LED led must toggle once per each press of btn, not on every clock while the button is pressed. Use the register prev for the button value on the previous clock.',
  'После сброса светодиод погашен': 'After reset the LED is off',
  'Первое нажатие: включился': 'First press: turned on',
  'Кнопка держится: без изменений': 'Button held: no change',
  'Кнопка всё ещё держится': 'Button still held',
  'Кнопку отпустили': 'The button was released',
  'Второе нажатие: выключился': 'Second press: turned off',
  'Кнопку отпустили снова': 'The button was released again',
  'Пауза без нажатия': 'A pause without pressing',
  'Третье нажатие: включился': 'Third press: turned on',
  'Кнопку отпустили в третий раз': 'The button was released a third time',
  'Сейчас светодиод переворачивается на каждом такте, пока btn = 1. Нужно срабатывать только на первом такте нажатия.':
    'Now the LED flips on every clock while btn = 1. It must fire only on the first clock of the press.',
  'Нажатие началось, если кнопка сейчас 1, а на прошлом такте была 0. Прошлое значение уже лежит в prev.':
    'The press has started if the button is 1 now and was 0 on the previous clock. The previous value is already in prev.',
  'Условие: if (btn & ~prev) led <= ~led;': 'The condition: if (btn & ~prev) led <= ~led;',
  'Детектор фронта': 'Edge detector',
  'Импульс на один такт': 'A pulse for one clock',
  '**Детектор переднего фронта** следит за сигналом и выдаёт на выходе `1` ровно на один такт в тот момент, когда сигнал перешёл из 0 в 1. Сколько бы ни длилась единица на входе, выход горит только один такт.\n\nТакой «короткий щелчок» удобен: им можно запустить счётчик на один шаг или записать число в регистр ровно один раз.':
    'A **rising edge detector** watches a signal and outputs `1` for exactly one clock at the moment the signal went from 0 to 1. However long the one lasts on the input, the output is lit for only one clock.\n\nSuch a "short click" is handy: it can start a counter for one step or write a number into a register exactly once.',
  Схема: 'The circuit',
  'Нужна память прошлого значения: регистр `prev`. Фронт — это «сейчас 1, а раньше было 0»: `sig & ~prev`.\n\nВыход `pulse` мы тоже делаем регистром: он обновляется на фронте вместе с остальными. Поэтому на диаграмме выше `pulse` загорается в том же такте, в котором `sig` стал 1: в момент фронта `sig` уже 1, а `prev` ещё хранит старое 0.':
    'Memory of the previous value is needed: the register `prev`. An edge is "now 1, and earlier 0": `sig & ~prev`.\n\nWe make the output `pulse` a register too: it updates on the edge together with the others. So on the diagram above `pulse` lights up in the same clock in which `sig` became 1: at the moment of the edge `sig` is already 1, and `prev` still holds the old 0.',
  'Фронт спада': 'The falling edge',
  'Если поменять условие на `~sig & prev`, получится детектор **заднего фронта** (спада): выход 1, когда сигнал только что упал с 1 в 0. Всё остальное устройство остаётся тем же.':
    'If you change the condition to `~sig & prev`, you get a **falling edge** detector: the output is 1 when the signal has just dropped from 1 to 0. Everything else in the device stays the same.',
  'Какое выражение даёт 1, когда сигнал только что перешёл из 0 в 1 (prev — значение с прошлого такта)?':
    'Which expression gives 1 when the signal has just gone from 0 to 1 (prev is the value from the previous clock)?',
  'Нужно «сейчас 1» (sig) и «раньше 0» (~prev). Вариант ~sig & prev — это задний фронт.':
    'You need "now 1" (sig) and "earlier 0" (~prev). The variant ~sig & prev is the falling edge.',
  'Сделай детектор переднего фронта: pulse равен 1 на одном такте, когда sig перешёл из 0 в 1, и 0 во всех остальных. Пока sig держится на 1, pulse должен погаснуть.':
    'Make a rising edge detector: pulse is 1 for one clock when sig went from 0 to 1, and 0 at all other times. While sig stays at 1, pulse must go out.',
  'Нет сигнала': 'No signal',
  'Сигнал появился: импульс': 'The signal appeared: a pulse',
  'Сигнал держится: импульс погас': 'The signal is held: the pulse went out',
  'Сигнал всё ещё держится': 'The signal is still held',
  'Сигнал пропал': 'The signal disappeared',
  'Новый фронт: импульс': 'A new edge: a pulse',
  'Спад не даёт импульса': 'A falling edge gives no pulse',
  'Ещё один фронт': 'One more edge',
  'Единица держится': 'The one is held',
  'Сейчас pulse просто повторяет sig. Нужно ещё условие: раньше сигнал был нулевым.':
    'Right now pulse simply repeats sig. One more condition is needed: earlier the signal was zero.',
  'Прошлое значение уже хранится в prev. «Сейчас 1» это sig, «раньше 0» это ~prev.':
    'The previous value is already stored in prev. "Now 1" is sig, "earlier 0" is ~prev.',
  'Правильная строка: pulse <= sig & ~prev;': 'The correct line: pulse <= sig & ~prev;',
  'Синхронизатор из двух триггеров': 'A synchronizer of two flip-flops',
  'Чужой сигнал и наши часы': 'A foreign signal and our clock',
  'Сигнал снаружи платы (кнопка, датчик, другая микросхема) живёт сам по себе и может поменяться в любой момент, в том числе прямо рядом с фронтом нашего такта. Такой сигнал называют **асинхронным** по отношению к нашим часам.\n\nЕсли триггер поймает вход в момент его изменения, он на короткое время может оказаться в «серединном» состоянии, не 0 и не 1. Это называется **метастабильность**, и последствия для схемы могут быть непредсказуемыми.':
    'A signal from outside the board (a button, a sensor, another chip) lives on its own and can change at any moment, including right next to the edge of our clock. Such a signal is called **asynchronous** with respect to our clock.\n\nIf a flip-flop catches the input at the moment it changes, for a short time it can end up in a "middle" state, neither 0 nor 1. This is called **metastability**, and the consequences for the circuit can be unpredictable.',
  'Два триггера подряд': 'Two flip-flops in a row',
  'Простое средство: пропустить сигнал через два триггера с одним тактом. Первый может поймать ненадёжное значение, но у него есть целый такт, чтобы успокоиться. Второй берёт уже устоявшееся значение, и дальше в схему идёт чистый сигнал.\n\nЦена за надёжность: сигнал приходит в схему на один такт позже. Для кнопки это незаметно.':
    'A simple remedy: pass the signal through two flip-flops with one clock. The first may catch an unreliable value, but it has a whole clock to settle. The second takes the already settled value, and a clean signal goes further into the circuit.\n\nThe price of reliability: the signal reaches the circuit one clock later. For a button this is unnoticeable.',
  'Вход изменился между фронтами. Первый триггер запомнил его на ближайшем фронте, второй на следующем. Слишком короткий импульс, который прошёл целиком между двумя фронтами, не увидит ни один из триггеров: синхронизатор годится для сигналов длиннее такта.':
    'The input changed between edges. The first flip-flop remembered it on the nearest edge, the second on the next one. A pulse that is too short and passed entirely between two edges will not be seen by either flip-flop: a synchronizer suits signals longer than a clock.',
  'Для чего нужен второй триггер в синхронизаторе?':
    'What is the second flip-flop in a synchronizer for?',
  'Чтобы сигнал стал быстрее': 'To make the signal faster',
  'Чтобы первый триггер успел успокоиться, и дальше шло устоявшееся значение':
    'So that the first flip-flop has time to settle, and a settled value goes on',
  'Чтобы переворачивать сигнал': 'To flip the signal',
  'Первый триггер может поймать вход в момент изменения. Второй читает его через целый такт, когда значение уже установилось.':
    'The first flip-flop may catch the input at the moment of change. The second reads it a whole clock later, when the value has settled.',
  'Пропусти внешний сигнал async_in через два последовательных триггера с общим тактом clk. Выход sync_out берётся со второго триггера: изменение появляется через два фронта.':
    'Pass the external signal async_in through two flip-flops in series with a common clock clk. The output sync_out is taken from the second flip-flop: the change appears after two edges.',
  'Вход 0: выход 0': 'Input 0: output 0',
  'Вход стал 1 между фронтами: выход ждёт': 'The input became 1 between edges: the output waits',
  'Через два фронта выход стал 1': 'After two edges the output became 1',
  'Вход стал 0: выход ещё 1': 'The input became 0: the output is still 1',
  'Через два фронта выход стал 0': 'After two edges the output became 0',
  'Короткий импульс между фронтами потерян': 'A short pulse between edges is lost',
  'Сейчас оба триггера читают async_in, и получается обычный регистр. Второй должен брать значение от первого.':
    'Right now both flip-flops read async_in, and an ordinary register results. The second must take the value from the first.',
  'Цепочка такая: async_in идёт в ff1, а ff1 идёт в ff2.':
    'The chain is this: async_in goes into ff1, and ff1 goes into ff2.',
  'Правильная строка для второго триггера: ff2 <= ff1;':
    'The correct line for the second flip-flop: ff2 <= ff1;',
  'Регистр на 8 бит: загрузить или держать': 'An 8-bit register: load or hold',
  'Восемь бит: байт': 'Eight bits: a byte',
  "Восемь бит называют **байтом**: это число от 0 до 255. В Verilog байт записывают как `[7:0]`. Регистр на 8 бит — это восемь D-триггеров с общим тактом, и устроен он так же, как маленький: пишем `q <= d;` — и все восемь бит записываются разом.\n\nЗначения можно записывать в шестнадцатеричном виде: `8'hA5` — это 10100101. Одна шестнадцатеричная цифра равна ровно четырём битам, поэтому так короче.":
    "Eight bits are called a **byte**: a number from 0 to 255. In Verilog a byte is written as `[7:0]`. An 8-bit register is eight D flip-flops with a common clock, and it works like a small one: we write `q <= d;` and all eight bits are written at once.\n\nValues can be written in hexadecimal: `8'hA5` is 10100101. One hexadecimal digit equals exactly four bits, so this is shorter.",
  'Загрузка и очистка': 'Load and clear',
  'У нашего регистра три управляющих входа:\n\n- `clear` обнуляет регистр;\n- `load` загружает в него `d`;\n- если оба нули, регистр держит значение.\n\nМожет случиться, что `clear` и `load` равны 1 одновременно. Нужно заранее решить, кто главнее. У нас очистка важнее: её проверяют первой.':
    'Our register has three control inputs:\n\n- `clear` clears the register;\n- `load` loads `d` into it;\n- if both are zero, the register holds its value.\n\nIt may happen that `clear` and `load` are 1 at the same time. You need to decide in advance which is more important. For us clear is more important: it is checked first.',
  'Порядок веток': 'The order of branches',
  'Условия в цепочке `if`/`else if` проверяются сверху вниз, и срабатывает первое верное. Поэтому порядок задаёт приоритет. Если поставить `load` выше `clear`, то при двух единицах регистр загрузит `d`, и очистка не сработает.':
    'Conditions in an `if`/`else if` chain are checked from top to bottom, and the first true one fires. So the order sets the priority. If you put `load` above `clear`, then with two ones the register will load `d`, and the clear will not work.',
  'clear = 1, load = 1, d = FF. Чему равен q после фронта в схеме, где clear проверяется первым?':
    'clear = 1, load = 1, d = FF. What is q after the edge in a circuit where clear is checked first?',
  'FF: load тоже сработал': 'FF: load worked too',
  '00: clear главнее': '00: clear is more important',
  'Прежнему значению': 'The previous value',
  'Первым проверяется clear. Он верен, поэтому выполняется его ветка, а остальные пропускаются.':
    'clear is checked first. It is true, so its branch runs, and the others are skipped.',
  'Сделай 8-битный регистр: при clear = 1 обнуляй q, иначе при load = 1 записывай d, иначе держи значение. Очистка главнее загрузки.':
    'Make an 8-bit register: with clear = 1 clear q, otherwise with load = 1 write d, otherwise hold the value. Clear is more important than load.',
  'clear и load вместе: очистка главнее': 'clear and load together: clear is more important',
  'Загрузка A5': 'Load A5',
  'Нет load: держим A5': 'No load: hold A5',
  'Нет load, d сменилось на FF': 'No load, d changed to FF',
  'Загрузка 3C': 'Load 3C',
  Очистка: 'Clear',
  'Ноль держится': 'Zero is held',
  'Загрузка 81': 'Load 81',
  'Сейчас после проверки clear регистр всегда загружает d. Загрузка должна быть условной.':
    'Right now after the clear check the register always loads d. The load must be conditional.',
  'Замени else на else if (load), чтобы запись происходила только при load = 1.':
    'Replace else with else if (load) so that writing happens only with load = 1.',
  "Правильная цепочка: if (clear) q <= 8'h00; else if (load) q <= d;":
    "The correct chain: if (clear) q <= 8'h00; else if (load) q <= d;",
  'такт:   0 1 2 3 4 5 6 7 8 9 10 11\ncount:  0 1 2 3 4 5 6 7 8 9  0  1':
    'clock:  0 1 2 3 4 5 6 7 8 9 10 11\ncount:  0 1 2 3 4 5 6 7 8 9  0  1',
  'такт:   0 1 2 3 ... 9 10 11 12\ncount:  9 9 8 7 ... 1  0  0  0':
    'clock:  0 1 2 3 ... 9 10 11 12\ncount:  9 9 8 7 ... 1  0  0  0',
  'такт:   0  1  2  3  4  5\nload:   0  0  0  1  0  0\ndata:   -  -  -  9  3  3\ncount:  0  1  2  9 10 11':
    'clock:  0  1  2  3  4  5\nload:   0  0  0  1  0  0\ndata:   -  -  -  9  3  3\ncount:  0  1  2  9 10 11',
  'N = 6\nтакт:   0 1 2 3 4 5 6 7\ncount:  0 1 2 3 4 5 0 1':
    'N = 6\nclock:  0 1 2 3 4 5 6 7\ncount:  0 1 2 3 4 5 0 1',
  'такт:  0 1 2 3 4 5 6 7 8\ndiv:   0 0 1 1 0 0 1 1 0':
    'clock: 0 1 2 3 4 5 6 7 8\ndiv:   0 0 1 1 0 0 1 1 0',
  'такт:   0 1 2 3 4 5 6 7 8 9 10 11\ncnt:    0 1 2 3 0 1 2 3 0 1  2  3\npulse:  0 0 0 1 0 0 0 1 0 0  0  1':
    'clock:  0 1 2 3 4 5 6 7 8 9 10 11\ncnt:    0 1 2 3 0 1 2 3 0 1  2  3\npulse:  0 0 0 1 0 0 0 1 0 0  0  1',
  'период 16 тактов, duty = 4:\n\nсчётчик: 0 1 2 3 4 5 6 ... 15 0 1 2 3 4\npwm:     1 1 1 1 0 0 0 ...  0 1 1 1 1 0':
    'period 16 clocks, duty = 4:\n\ncounter: 0 1 2 3 4 5 6 ... 15 0 1 2 3 4\npwm:     1 1 1 1 0 0 0 ...  0 1 1 1 1 0',
  'такт:  0    1    2    3    4    5\nring:  0001 0010 0100 1000 0001 0010':
    'clock: 0    1    2    3    4    5\nring:  0001 0010 0100 1000 0001 0010',
  "if (reset)\n    ring <= 4'b0001;       // единица на старте\nelse if (en)\n    ring <= {ring[2:0], ring[3]};":
    "if (reset)\n    ring <= 4'b0001;       // one at the start\nelse if (en)\n    ring <= {ring[2:0], ring[3]};",
  'Десятичный счётчик 0…9': 'Decimal counter 0…9',
  'Счётчик не обязан считать до 15': 'A counter does not have to count to 15',
  'Четыре бита умеют считать от 0 до 15, а потом сами возвращаются в 0. Но человеку удобнее десять цифр: 0, 1, … 9. Часы, секундомер и индикатор на плате показывают именно такие цифры.\n\nПоэтому счётчик нужно **подрезать**: когда он дошёл до 9, следующим значением должен стать 0, а не 10.':
    'Four bits can count from 0 to 15 and then return to 0 by themselves. But ten digits are more convenient for a person: 0, 1, … 9. Clocks, stopwatches and a display on the board show exactly such digits.\n\nSo the counter has to be **trimmed**: when it reaches 9, the next value must be 0, not 10.',
  'Сравнение внутри always': 'Comparison inside always',
  'На каждом фронте такта мы смотрим на **текущее** значение `count`. Если оно равно 9, записываем 0, иначе прибавляем единицу. Сравнение — это знак `==`, а присваивание в регистр — `<=`.\n\nСброс, как и раньше, проверяем первым: он важнее всего остального.':
    'On every clock edge we look at the **current** value of `count`. If it equals 9, we write 0, otherwise we add one. The comparison is the `==` sign, and the assignment into a register is `<=`.\n\nThe reset, as before, is checked first: it is more important than everything else.',
  'Счётчик сейчас показывает 9. Что он покажет после следующего фронта, если в коде есть проверка count == 9?':
    'The counter now shows 9. What will it show after the next edge, if the code has the check count == 9?',
  'Условие count == 9 выполняется, и в регистр записывается 0. Значение 10 никогда не появится на выходе.':
    'The condition count == 9 is met, and 0 is written into the register. The value 10 never appears on the output.',
  'Сделай счётчик по модулю 10: после сброса он считает 0, 1, … 9, затем снова 0, 1, … Значение 10 появляться не должно.':
    'Make a modulo-10 counter: after reset it counts 0, 1, … 9, then 0, 1, … again. The value 10 must not appear.',
  Пять: 'Five',
  Девять: 'Nine',
  'После девяти снова ноль': 'After nine, zero again',
  'Второй круг начался': 'The second round has started',
  'Девять во втором круге': 'Nine in the second round',
  'Второй возврат в ноль': 'The second return to zero',
  'Добавь ещё одну ветку в if: что делать, когда счётчик уже равен 9.':
    'Add one more branch to the if: what to do when the counter is already 9.',
  "Проверка записывается так: else if (count == 4'd9). В этой ветке в count нужно записать 0.":
    "The check is written like this: else if (count == 4'd9). In this branch you need to write 0 into count.",
  "else if (count == 4'd9) count <= 4'd0; — поставь эту ветку между сбросом и прибавлением единицы.":
    "else if (count == 4'd9) count <= 4'd0; — put this branch between the reset and adding one.",
  'Обратный отсчёт до нуля': 'Countdown to zero',
  'Счёт вниз и остановка': 'Counting down and stopping',
  'Обратный отсчёт знаком по запуску ракеты: 9, 8, 7, … 0. Для счётчика это вычитание единицы вместо прибавления. Начинать отсчёт нужно с какого-то числа, поэтому по сбросу мы записываем не 0, а **стартовое значение**, например 9.\n\nЕсть и вторая тонкость. Если вычесть единицу из 0, четырёхбитное число «провалится» в 15. Нам это не нужно: дойдя до 0, счётчик должен **остановиться** и остаться нулём.':
    'A countdown like for a rocket launch: 9, 8, 7, … 0. For a counter this is subtracting one instead of adding. The countdown must start from some number, so on reset we write not 0 but a **start value**, for example 9.\n\nThere is a second subtlety. If you subtract one from 0, a four-bit number will "fall" to 15. We do not need that: having reached 0, the counter must **stop** and stay at zero.',
  'Пауза по входу en': 'Pause on the en input',
  'Вход `en` (от английского enable, «разрешить») работает как кнопка паузы: пока он 0, значение не меняется. Считаем вниз только когда `en = 1` и счётчик ещё не дошёл до нуля.':
    'The input `en` (from enable) works like a pause button: while it is 0, the value does not change. We count down only when `en = 1` and the counter has not yet reached zero.',
  'Счётчик показывает 0, en = 1, а в коде нет проверки на ноль. Что произойдёт на следующем фронте?':
    'The counter shows 0, en = 1, and the code has no check for zero. What will happen on the next edge?',
  'Останется 0': 'It will stay 0',
  'Станет 15': 'It will become 15',
  'Станет 1': 'It will become 1',
  'У четырёх бит нет отрицательных чисел: 0 минус 1 даёт 1111, то есть 15. Поэтому остановку на нуле приходится писать явно.':
    'Four bits have no negative numbers: 0 minus 1 gives 1111, that is 15. So stopping at zero has to be written explicitly.',
  'Сделай обратный счётчик: по сбросу в нём 9, при en = 1 он уменьшается на единицу, дойдя до 0 останавливается, при en = 0 стоит на месте.':
    'Make a down counter: after reset it holds 9, with en = 1 it decreases by one, upon reaching 0 it stops, with en = 0 it stands still.',
  'Сброс: в счётчике 9': 'Reset: the counter holds 9',
  'Сброс держится': 'Reset is held',
  'Первый шаг вниз': 'First step down',
  Пауза: 'Pause',
  'Отсчёт продолжился': 'The countdown continued',
  Единица: 'One',
  'Дошли до нуля': 'Reached zero',
  'Остановка на нуле': 'Stop at zero',
  'Остаётся нулём': 'It stays zero',
  "Вычитание в Verilog — обычный минус: count - 4'd1. Ещё нужно запретить шаг, когда count уже 0.":
    "Subtraction in Verilog is an ordinary minus: count - 4'd1. You also need to forbid a step when count is already 0.",
  "Условие шага: en && count != 4'd0. Если оно ложно, регистр ничего не получает и хранит значение.":
    "The step condition: en && count != 4'd0. If it is false, the register gets nothing and keeps its value.",
  'Счётчик вверх и вниз': 'An up and down counter',
  'Направление задаёт вход': 'The direction is set by an input',
  'Иногда одного счётчика хватает и для «плюс», и для «минус»: например, выбор пункта меню кнопками «вверх» и «вниз». Для этого у него появляется вход, который выбирает направление. Назовём его `up`: при `up = 1` считаем вверх, при `up = 0` вниз.\n\nСам регистр остаётся один, меняется лишь то, что мы в него записываем.':
    'Sometimes one counter is enough for both "plus" and "minus": for example, choosing a menu item with "up" and "down" buttons. For this it gets an input that chooses the direction. Let us call it `up`: with `up = 1` we count up, with `up = 0` down.\n\nThe register itself stays one, only what we write into it changes.',
  'Переход через границу': 'Crossing the boundary',
  'Что будет на краях? Четыре бита ведут себя по кругу. Если вычесть единицу из 0, получится 15. А если прибавить единицу к 15, получится 0. Такое «закольцовывание» называется **переполнением**, и в этом уроке оно нас устраивает: мы его просто не запрещаем.':
    'What happens at the edges? Four bits behave in a circle. If you subtract one from 0, you get 15. And if you add one to 15, you get 0. This "wrapping around" is called **overflow**, and in this lesson it suits us: we simply do not forbid it.',
  'Четырёхбитный счётчик стоит на 0 и получает такт с up = 0. Что на выходе?':
    'A four-bit counter stands at 0 and gets a clock with up = 0. What is on the output?',
  'Вычитание единицы из 0 в четырёх битах даёт 1111, то есть 15: счётчик «ходит по кругу» и вниз.':
    'Subtracting one from 0 in four bits gives 1111, that is 15: the counter "goes around in a circle" downward too.',
  'Сделай счётчик, который при up = 1 прибавляет единицу, а при up = 0 вычитает. Сброс обнуляет его. Границы не защищай: 0 вниз даёт 15, а 15 вверх даёт 0.':
    'Make a counter that adds one when up = 1 and subtracts when up = 0. Reset clears it. Do not protect the boundaries: 0 down gives 15, and 15 up gives 0.',
  Вверх: 'Up',
  'Вверх до трёх': 'Up to three',
  'Развернулись вниз': 'Turned down',
  'Спустились в ноль': 'Went down to zero',
  'Ноль вниз даёт 15': 'Zero down gives 15',
  'Дальше вниз': 'Further down',
  'Снова вверх': 'Up again',
  '15 вверх даёт 0': '15 up gives 0',
  'И дальше вверх': 'And further up',
  'Нужна ещё одна ветка: что делать, когда up равен 0.':
    'One more branch is needed: what to do when up is 0.',
  'Структура: if (reset) ... else if (up) прибавить ... else вычесть.':
    'The structure: if (reset) ... else if (up) add ... else subtract.',
  'Начать не с нуля': 'Starting not from zero',
  'Часто счёт нужно начать не с 0, а с заданного числа: таймер на 7 секунд, отсчёт от выбранной цифры. Для этого у счётчика делают **загрузку**: вход `load` («загрузить») и вход `data` с числом.\n\nКогда на фронте такта `load = 1`, в счётчик записывается `data`. Когда `load = 0`, счёт идёт как обычно. Само значение `data` в остальное время ни на что не влияет.':
    'Often counting must start not from 0 but from a given number: a 7-second timer, a countdown from a chosen digit. For this the counter gets a **load**: an input `load` and an input `data` with the number.\n\nWhen on a clock edge `load = 1`, `data` is written into the counter. When `load = 0`, counting goes as usual. The value of `data` has no effect at other times.',
  'Кто главнее': 'Who is more important',
  'В if-цепочке порядок решает всё. Сначала идёт сброс, затем загрузка, затем обычный счёт. Если `reset` и `load` пришли вместе, победит сброс, потому что его проверка стоит раньше.':
    'In an if chain the order decides everything. First comes reset, then load, then ordinary counting. If `reset` and `load` arrive together, reset wins, because its check comes earlier.',
  'На фронте reset = 1 и load = 1 одновременно. Что окажется в счётчике?':
    'On an edge reset = 1 and load = 1 at the same time. What will be in the counter?',
  'Число с входа data': 'The number from the input data',
  '0, потому что сброс проверяется первым': '0, because reset is checked first',
  'Старое значение плюс один': 'The old value plus one',
  'В цепочке if ... else if выполняется только первая подошедшая ветка. Сброс стоит выше загрузки, поэтому он важнее.':
    'In an if ... else if chain only the first matching branch runs. Reset is above load, so it is more important.',
  'Сделай счётчик с загрузкой: при load = 1 в него записывается data, иначе он прибавляет единицу. Сброс главнее загрузки.':
    'Make a counter with load: with load = 1 data is written into it, otherwise it adds one. Reset is more important than load.',
  'Ещё шаг': 'One more step',
  'Загрузили 9': 'Loaded 9',
  'data изменился, но load = 0: считаем дальше': 'data changed, but load = 0: we keep counting',
  'Счёт продолжается': 'Counting continues',
  'Загрузили 14': 'Loaded 14',
  'Шаг после загрузки': 'A step after load',
  'Переполнение 15 в 0': 'Overflow of 15 into 0',
  'Между сбросом и обычным счётом нужна ещё одна ветка, которая смотрит на load.':
    'Between reset and ordinary counting one more branch is needed, one that looks at load.',
  'В этой ветке в регистр записывается не count + 1, а значение входа data.':
    'In this branch what is written into the register is not count + 1 but the value of the input data.',
  'else if (load) count <= data;  — поставь эту строку сразу после ветки reset.':
    'else if (load) count <= data;  — put this line right after the reset branch.',
  'Счётчик по модулю N': 'A modulo-N counter',
  'Модуль — это длина круга': 'The modulus is the length of the circle',
  'Счётчик «по модулю N» считает 0, 1, … N-1 и возвращается в 0. Всего у него N разных значений. Десятичный счётчик — частный случай при N = 10. Для N = 6 получится 0, 1, 2, 3, 4, 5, 0, 1, …\n\nДля чисел до 5 хватит трёх бит, они вмещают от 0 до 7.':
    'A "modulo N" counter counts 0, 1, … N-1 and returns to 0. It has N different values in all. The decimal counter is a special case with N = 10. For N = 6 you get 0, 1, 2, 3, 4, 5, 0, 1, …\n\nFor numbers up to 5 three bits are enough, they hold from 0 to 7.',
  'Число N в одном месте': 'The number N in one place',
  'Цифру 6 не стоит прятать в нескольких местах кода. Лучше дать ей имя: `localparam N = 6;` («локальный параметр» — постоянная внутри модуля). Тогда чтобы сменить модуль, достаточно поправить одну строку.\n\nЧисло считается до **N-1**, и именно на нём счётчик возвращается в 0.':
    'The digit 6 should not be hidden in several places of the code. It is better to give it a name: `localparam N = 6;` ("local parameter", a constant inside the module). Then to change the modulus it is enough to fix one line.\n\nThe count goes up to **N-1**, and it is there that the counter returns to 0.',
  'Счётчик по модулю 6 сейчас показывает 5. Что будет после следующего разрешённого такта?':
    'A modulo-6 counter now shows 5. What will it be after the next enabled clock?',
  'Модуль 6 означает шесть значений: от 0 до 5. После наибольшего значения N-1 = 5 счётчик возвращается в 0.':
    'Modulus 6 means six values: from 0 to 5. After the largest value N-1 = 5 the counter returns to 0.',
  'Сделай счётчик по модулю 6 (используй localparam N = 6): значения 0…5, потом снова 0. При en = 0 он стоит на месте.':
    'Make a modulo-6 counter (use localparam N = 6): values 0…5, then 0 again. With en = 0 it stands still.',
  Продолжили: 'Continued',
  'Пять: последнее значение': 'Five: the last value',
  'После пяти снова ноль': 'After five, zero again',
  'И снова один': 'And one again',
  'Внутри ветки с en нужна ещё одна проверка: достиг ли счётчик последнего значения, N - 1.':
    'Inside the en branch one more check is needed: has the counter reached the last value, N - 1.',
  "Условие: count == N - 1. Тогда count <= 3'd0, иначе прибавляем единицу.":
    "The condition: count == N - 1. Then count <= 3'd0, otherwise we add one.",
  "if (count == N - 1) count <= 3'd0; else count <= count + 3'd1; — внутри else if (en) begin ... end":
    "if (count == N - 1) count <= 3'd0; else count <= count + 3'd1; — inside else if (en) begin ... end",
  'Делитель частоты на 4': 'Frequency divider by 4',
  'Зачем делить частоту': 'Why divide the frequency',
  'Такт платы очень быстрый, и мигающий светодиод на нём слился бы в ровное свечение. Чтобы получить медленный сигнал, частоту **делят**: выход меняется не на каждом такте, а, скажем, один раз в два такта.\n\nДелитель на 4 даёт сигнал, у которого один полный период (0 и 1) занимает 4 такта: два такта нуля и два такта единицы.':
    "The board's clock is very fast, and a blinking LED on it would blur into steady light. To get a slow signal, the frequency is **divided**: the output changes not on every clock but, say, once every two clocks.\n\nA divider by 4 gives a signal in which one full period (0 and 1) takes 4 clocks: two clocks of zero and two clocks of one.",
  'Делитель — это счётчик': 'A divider is a counter',
  'Хитрость простая: берём двухбитный счётчик, он считает 0, 1, 2, 3, 0, … А на выход отдаём его **старший бит** `cnt[1]`. Старший бит равен 0 при значениях 0 и 1, и равен 1 при значениях 2 и 3: ровно то, что нужно.\n\nСтарший бит меняется один раз в два такта, значит частота в четыре раза меньше.':
    'The trick is simple: take a two-bit counter, it counts 0, 1, 2, 3, 0, … And output its **most significant bit** `cnt[1]`. The most significant bit is 0 for the values 0 and 1, and 1 for the values 2 and 3: exactly what we need.\n\nThe most significant bit changes once every two clocks, so the frequency is four times lower.',
  'Какой бит двухбитного счётчика меняется реже всех?':
    'Which bit of a two-bit counter changes least often?',
  'Младший, cnt[0]': 'The least significant, cnt[0]',
  'Старший, cnt[1]': 'The most significant, cnt[1]',
  'Оба одинаково': 'Both equally',
  'Младший бит меняется на каждом такте, а старший только когда младший переходит из 1 в 0: один раз в два такта.':
    'The least significant bit changes on every clock, and the most significant only when the least significant goes from 1 to 0: once every two clocks.',
  'Сделай делитель частоты на 4: внутри двухбитный счётчик cnt, на выход div отдай его старший бит. После сброса выход равен 0.':
    'Make a frequency divider by 4: inside is a two-bit counter cnt, output its most significant bit on div. After reset the output is 0.',
  'Сброс: выход 0': 'Reset: output 0',
  'Первый такт: счётчик 1, выход 0': 'First clock: counter 1, output 0',
  'Счётчик 2: выход стал 1': 'Counter 2: the output became 1',
  'Счётчик 3: выход держится': 'Counter 3: the output holds',
  'Счётчик снова 0: выход 0': 'The counter is 0 again: output 0',
  'Ещё один такт нуля': 'One more clock of zero',
  'Второй период начался': 'The second period has started',
  'Единица второго периода': 'The one of the second period',
  'Третий период': 'The third period',
  'Периодичность сохраняется': 'The periodicity is preserved',
  'Счётчик cnt уже написан. Остаётся выбрать, какой его бит отдать на выход.':
    'The counter cnt is already written. It remains to choose which of its bits to put on the output.',
  'Нужен тот бит, который меняется реже всего: старший.':
    'You need the bit that changes least often: the most significant one.',
  'Короткий импульс раз в 4 такта': 'A short pulse once every 4 clocks',
  'Импульс-«тик»': 'A "tick" pulse',
  'Делитель из прошлого урока даёт ровный меандр: половину времени 1, половину 0. А иногда нужен именно **короткий импульс**: единица ровно на один такт, а потом долгая пауза. Такой «тик» обычно разрешает что-то сделать: сдвинуть число, обновить индикатор.\n\nИмпульс раз в 4 такта выглядит так:':
    'The divider from the previous lesson gives an even square wave: half the time 1, half 0. But sometimes you need exactly a **short pulse**: a one for exactly one clock, then a long pause. Such a "tick" usually allows something to be done: shift a number, refresh a display.\n\nA pulse once every 4 clocks looks like this:',
  'Сравнить счётчик с последним значением': 'Compare the counter with the last value',
  'Счётчик нам уже знаком: двухбитный, считает 0, 1, 2, 3 и сам возвращается в 0. А импульс — это просто **признак**, что счётчик сейчас равен 3. Признак делается одной строкой `assign`: результат сравнения `==` равен 1 или 0.':
    'The counter is already familiar: two-bit, counts 0, 1, 2, 3 and returns to 0 by itself. And the pulse is simply a **flag** that the counter now equals 3. The flag is made with one `assign` line: the result of the `==` comparison is 1 or 0.',
  'Импульс должен быть раз в 4 такта. Какое значение двухбитного счётчика ему соответствует?':
    'The pulse must be once every 4 clocks. Which value of a two-bit counter corresponds to it?',
  'Любое, подойдёт 0': 'Any, 0 will do',
  'Одно конкретное, например 3': 'One specific one, for example 3',
  'Все четыре сразу': 'All four at once',
  'Двухбитный счётчик проходит каждое значение один раз за 4 такта. Если выбрать одно из них, признак будет единицей только в этом такте, а остальные три такта будет нулём.':
    'A two-bit counter passes each value once in 4 clocks. If you choose one of them, the flag will be one only in that clock, and zero on the other three.',
  'Сделай «тик»: выход pulse равен 1 ровно в одном такте из четырёх, когда внутренний счётчик cnt равен 3. Счётчик уже написан, добавь признак.':
    'Make a "tick": the output pulse is 1 in exactly one clock out of four, when the internal counter cnt equals 3. The counter is already written, add the flag.',
  'Сброс: импульса нет': 'Reset: no pulse',
  'Счётчик 1': 'Counter 1',
  'Счётчик 2': 'Counter 2',
  'Счётчик 3: импульс': 'Counter 3: pulse',
  'Импульс длится один такт': 'The pulse lasts one clock',
  'Пауза между импульсами': 'A pause between pulses',
  'Ещё такт без импульса': 'One more clock without a pulse',
  'После второго импульса': 'After the second pulse',
  'Третий импульс': 'The third pulse',
  'И снова тишина': 'And silence again',
  'Импульс нужен в тот момент, когда cnt равен последнему значению счёта, то есть 3.':
    'The pulse is needed at the moment when cnt equals the last count value, that is 3.',
  "Сравнение пишется как cnt == 2'd3: оно само равно 1 или 0.":
    "The comparison is written cnt == 2'd3: it is itself 1 or 0.",
  'ШИМ: яркость числом': 'PWM: brightness by a number',
  'Мигать так быстро, что не видно': 'Blinking so fast it cannot be seen',
  'Светодиод умеет только «горит» и «не горит». Но если включать и выключать его очень быстро, глаз видит промежуточную яркость: чем дольше горит в каждом периоде, тем ярче. Этот приём называется **ШИМ** — широтно-импульсная модуляция. «Широта» здесь — длительность единицы в периоде.\n\nДоля времени с единицей называется скважностью, а число, которое её задаёт, мы назовём `duty` («рабочая часть»).':
    'An LED can only be "on" and "off". But if you turn it on and off very fast, the eye sees an intermediate brightness: the longer it is on in each period, the brighter. This technique is called **PWM**, pulse-width modulation. The "width" here is the duration of the one in a period.\n\nThe fraction of time with a one is called the duty cycle, and the number that sets it we will call `duty`.',
  'Счётчик и сравнение': 'A counter and a comparison',
  'Схема очень проста. Свободный четырёхбитный счётчик бесконечно считает 0…15: это и есть период в 16 тактов. Выход равен 1, пока счётчик **меньше** `duty`.\n\nПри `duty = 0` единицы нет совсем, выход всегда 0. При `duty = 15` единица почти весь период, не хватает только одного такта, когда счётчик равен 15. Строго «меньше» (`<`) даёт именно такой результат.':
    'The circuit is very simple. A free-running four-bit counter counts 0…15 endlessly: that is a period of 16 clocks. The output is 1 while the counter is **less than** `duty`.\n\nWith `duty = 0` there is no one at all, the output is always 0. With `duty = 15` there is a one for almost the whole period, only one clock is missing, when the counter is 15. Strictly "less than" (`<`) gives exactly this result.',
  'Период 16 тактов, duty = 4. Сколько тактов из 16 выход pwm равен 1?':
    'The period is 16 clocks, duty = 4. For how many clocks out of 16 is the output pwm equal to 1?',
  'Выход равен 1, пока cnt меньше 4: это значения 0, 1, 2, 3, то есть четыре такта. Остальные 12 тактов выход 0.':
    'The output is 1 while cnt is less than 4: these are the values 0, 1, 2, 3, that is four clocks. For the other 12 clocks the output is 0.',
  'Сделай ШИМ с периодом 16 тактов: выход pwm равен 1, пока свободный счётчик cnt меньше duty. Счётчик уже написан, добавь сравнение.':
    'Make a PWM with a period of 16 clocks: the output pwm is 1 while the free-running counter cnt is less than duty. The counter is already written, add the comparison.',
  'Начало периода, duty = 3': 'Start of the period, duty = 3',
  'Счётчик 2 меньше 3': 'Counter 2 is less than 3',
  'Счётчик 3 не меньше 3': 'Counter 3 is not less than 3',
  'Конец периода': 'End of the period',
  'Новый период': 'A new period',
  'Второй период, после трёх тактов': 'The second period, after three clocks',
  'duty стал 8, счётчик 4': 'duty became 8, counter 4',
  'Счётчик 7 меньше 8': 'Counter 7 is less than 8',
  'Счётчик 8 не меньше 8': 'Counter 8 is not less than 8',
  'duty = 0: выход всегда 0': 'duty = 0: the output is always 0',
  'duty = 15, счётчик 1': 'duty = 15, counter 1',
  'Счётчик 14 меньше 15': 'Counter 14 is less than 15',
  'Счётчик 15 не меньше 15': 'Counter 15 is not less than 15',
  'Выход определяется только сравнением двух чисел: счётчика и duty.':
    'The output is determined only by the comparison of two numbers: the counter and duty.',
  'В Verilog «меньше» пишется знаком <. Скобки вокруг сравнения помогают читать.':
    'In Verilog "less than" is written with the < sign. Parentheses around the comparison help readability.',
  'Бегущая единица': 'A running one',
  'Кольцевой счётчик устроен иначе, чем те, что мы делали. В нём нет чисел: это четыре бита, из которых **только один равен 1**, и эта единица бежит по кругу: 0001, 0010, 0100, 1000, и снова 0001.\n\nТакой код называют «one-hot» («одна горячая»). Он удобен, когда нужно по очереди включать четыре светодиода или четыре шага чего-то.':
    'A ring counter is built differently from the ones we made. It has no numbers: it is four bits of which **only one is 1**, and this one runs around in a circle: 0001, 0010, 0100, 1000, and 0001 again.\n\nSuch a code is called "one-hot". It is convenient when you need to turn on four LEDs or four steps of something in turn.',
  'Сдвиг с замыканием': 'A shift with wrap-around',
  'Чтобы сдвинуть биты влево, есть операция `<<`. Но обычный сдвиг выбрасывает старший бит и подставляет справа 0: после 1000 получилось бы 0000, и единица пропала бы навсегда.\n\nЗамкнуть кольцо можно, собрав новое значение из частей: три нижних бита идут наверх, а освободившийся младший бит берёт старший. Склеивание записывается фигурными скобками.':
    'To shift bits left there is the `<<` operation. But an ordinary shift throws away the high bit and puts 0 on the right: after 1000 we would get 0000, and the one would be lost forever.\n\nThe ring can be closed by assembling the new value from parts: the lower three bits go up, and the freed low bit takes the high one. Concatenation is written with curly braces.',
  'Кольцо сейчас 1000. Каким оно станет после сдвига с замыканием?':
    'The ring is now 1000. What will it become after a shift with wrap-around?',
  'Единица из старшего бита уходит в младший: получается 0001. Обычный сдвиг << дал бы 0000, и единица потерялась бы.':
    'The one from the high bit goes to the low one: we get 0001. An ordinary shift << would give 0000, and the one would be lost.',
  'Сделай кольцевой счётчик на 4 бита: по сбросу в нём 0001, при en = 1 единица сдвигается влево и после 1000 возвращается в 0001, при en = 0 кольцо стоит на месте.':
    'Make a 4-bit ring counter: after reset it holds 0001, with en = 1 the one shifts left and after 1000 returns to 0001, with en = 0 the ring stands still.',
  'Сброс: единица в младшем бите': 'Reset: the one in the low bit',
  'Первый сдвиг': 'First shift',
  'Сдвиг после паузы': 'A shift after a pause',
  'Единица в старшем бите': 'The one in the high bit',
  'Замыкание кольца': 'Closing the ring',
  'Ещё одно замыкание': 'One more wrap-around',
  'Обычный сдвиг << теряет старший бит. Нужно вернуть его в младший.':
    'An ordinary shift << loses the high bit. It must be returned to the low one.',
  'Новое значение склеивается из двух частей: {ring[2:0], ring[3]}: три нижних бита идут вверх, а старший бит приходит вниз.':
    'The new value is concatenated from two parts: {ring[2:0], ring[3]}: the lower three bits go up, and the high bit comes down.',
  '            btn = 1\n  +--------+ ------------> +--------+\n  |  OFF   |               |   ON   |\n  | led = 0| <------------ | led = 1|\n  +--------+     btn = 1   +--------+\n\nбез нажатия (btn = 0) автомат остаётся где был':
    '            btn = 1\n  +--------+ ------------> +--------+\n  |  OFF   |               |   ON   |\n  | led = 0| <------------ | led = 1|\n  +--------+     btn = 1   +--------+\n\nwithout a press (btn = 0) the machine stays where it was',
  'поток x:   1 0 1 0 1 1 0\nответ y:   0 0 1 0 1 0 0\n               ^   ^\n          закончилась 101 (первый раз и второй)':
    'stream x:   1 0 1 0 1 1 0\nanswer y:   0 0 1 0 1 0 0\n                ^   ^\n          101 finished (the first and the second time)',
  'IDLE  --x=1--> GOT1\nIDLE  --x=0--> IDLE\nGOT1  --x=1--> GOT1    (две единицы: хвост всё равно "1")\nGOT1  --x=0--> GOT10\nGOT10 --x=1--> FOUND   (y = 1)\nGOT10 --x=0--> IDLE\nFOUND --x=1--> GOT1    (101, затем 1: хвост "1")\nFOUND --x=0--> GOT10   (101, затем 0: хвост "10")\n\nreset из любого состояния ведёт в IDLE':
    'IDLE  --x=1--> GOT1\nIDLE  --x=0--> IDLE\nGOT1  --x=1--> GOT1    (two ones: the tail is still "1")\nGOT1  --x=0--> GOT10\nGOT10 --x=1--> FOUND   (y = 1)\nGOT10 --x=0--> IDLE\nFOUND --x=1--> GOT1    (101, then 1: the tail "1")\nFOUND --x=0--> GOT10   (101, then 0: the tail "10")\n\nreset from any state leads to IDLE',
  'поток:  1 0 1 0 1 1\n        1 0 1 0        <- ждали 1, пришёл 0: попытка сорвана\n            1 0 1 1    <- но хвост "10" уже начало новой\nответ:  0 0 0 0 0 1':
    'stream:  1 0 1 0 1 1\n         1 0 1 0        <- waited for 1, got 0: attempt failed\n             1 0 1 1    <- but the tail "10" is already the start of a new one\nanswer:  0 0 0 0 0 1',
  'IDLE   --x=1--> GOT1\nIDLE   --x=0--> IDLE\nGOT1   --x=1--> GOT1     (две единицы: хвост всё равно "1")\nGOT1   --x=0--> GOT10\nGOT10  --x=1--> GOT101\nGOT10  --x=0--> IDLE     (хвоста нет)\nGOT101 --x=1--> FOUND    (y = 1)\nGOT101 --x=0--> GOT10    (хвост "10")\nFOUND  --x=1--> GOT1     (хвост "1")\nFOUND  --x=0--> GOT10    (хвост "10")':
    'IDLE   --x=1--> GOT1\nIDLE   --x=0--> IDLE\nGOT1   --x=1--> GOT1     (two ones: the tail is still "1")\nGOT1   --x=0--> GOT10\nGOT10  --x=1--> GOT101\nGOT10  --x=0--> IDLE     (no tail)\nGOT101 --x=1--> FOUND    (y = 1)\nGOT101 --x=0--> GOT10    (the tail "10")\nFOUND  --x=1--> GOT1     (the tail "1")\nFOUND  --x=0--> GOT10    (the tail "10")',
  'Мур:   assign y = (state == FOUND);\nМили:  assign y = (state == GOT10) && x;':
    'Moore:  assign y = (state == FOUND);\nMealy:  assign y = (state == GOT10) && x;',
  '          take   x   state после фронта   Мур(FOUND)  Мили(GOT10 и x)\nтакт A:     0    1       GOT10                0            1\nтакт B:     1    1       GOT1                 0 -> 1 *     0\n\n* Мур поднимает выход уже после того, как принял бит.':
    '          take   x   state after the edge   Moore(FOUND)  Mealy(GOT10 and x)\nclock A:    0    1       GOT10                  0              1\nclock B:    1    1       GOT1                   0 -> 1 *       0\n\n* Moore raises the output only after it has accepted the bit.',
  'SUM0  --coin5-->  SUM5\nSUM0  --coin10--> SUM10\nSUM5  --coin5-->  SUM10\nSUM5  --coin10--> PAID   (dispense = 1)\nSUM10 --coin5-->  PAID\nSUM10 --coin10--> PAID\nPAID  --любой---> SUM0\nнет монеты: остаёмся где были':
    'SUM0  --coin5-->  SUM5\nSUM0  --coin10--> SUM10\nSUM5  --coin5-->  SUM10\nSUM5  --coin10--> PAID   (dispense = 1)\nSUM10 --coin5-->  PAID\nSUM10 --coin10--> PAID\nPAID  --any----> SUM0\nno coin: we stay where we were',
  'состояние | coin5 | coin10\nSUM0      | SUM5  | SUM10\nSUM5      | SUM10 | PAID\nSUM10     | PAID  | PAID\nPAID      | SUM0 (всегда)':
    'state     | coin5 | coin10\nSUM0      | SUM5  | SUM10\nSUM5      | SUM10 | PAID\nSUM10     | PAID  | PAID\nPAID      | SUM0 (always)',
  'WAIT1  --b1-->   WAIT0\nWAIT0  --b0-->   WAIT1B\nWAIT0  --b1-->   WAIT1   (ошибка)\nWAIT1B --b1-->   OPEN    (unlock = 1)\nWAIT1B --b0-->   WAIT1   (ошибка)\nOPEN   --lock--> WAIT1\n\nбез нажатий: остаёмся в своём состоянии':
    'WAIT1  --b1-->   WAIT0\nWAIT0  --b0-->   WAIT1B\nWAIT0  --b1-->   WAIT1   (error)\nWAIT1B --b1-->   OPEN    (unlock = 1)\nWAIT1B --b0-->   WAIT1   (error)\nOPEN   --lock--> WAIT1\n\nwithout presses: we stay in our state',
  'состояние   двоичная   one-hot\nS0              00      0001\nS1              01      0010\nS2              10      0100\nS3              11      1000':
    'state       binary   one-hot\nS0              00      0001\nS1              01      0010\nS2              10      0100\nS3              11      1000',
  'такт 0:  0001\nтакт 1:  0010\nтакт 2:  0100\nтакт 3:  1000\nтакт 4:  0001   (круг замкнулся)':
    'clock 0:  0001\nclock 1:  0010\nclock 2:  0100\nclock 3:  1000\nclock 4:  0001   (the circle closed)',
  'шаг (state)   y\n    0        11\n    1        01\n    2        00\n    3        10\nдальше снова шаг 0':
    'step (state)   y\n    0         11\n    1         01\n    2         00\n    3         10\nthen step 0 again',
  'req   ____/~~~~~~~~~~~~~~~\\____\nack   _________/~~~~~~~\\_____\n          ^ запрос  ^ ответ  ^ запрос снят, затем ответ снят':
    'req   ____/~~~~~~~~~~~~~~~\\____\nack   _________/~~~~~~~\\_____\n          ^ request  ^ answer  ^ request lowered, then answer lowered',
  'IDLE --req=1-->           WORK\nWORK --req=0-->           IDLE   (клиент передумал)\nWORK --req=1, ready=1--> ACK    (ack = 1)\nACK  --req=0-->           IDLE\n\nв IDLE и WORK ack = 0; из ACK ждём только падения req':
    'IDLE --req=1-->           WORK\nWORK --req=0-->           IDLE   (the client changed its mind)\nWORK --req=1, ready=1--> ACK    (ack = 1)\nACK  --req=0-->           IDLE\n\nin IDLE and WORK ack = 0; from ACK we wait only for req to drop',
  'Автомат из двух состояний: кнопка-переключатель': 'A two-state machine: a toggle button',
  'Что такое конечный автомат': 'What a finite state machine is',
  'Схема, у которой есть **память о прошлом**, ведёт себя по-разному в зависимости от того, что с ней уже было. Такую схему удобно описывать как **конечный автомат** (по-английски FSM, finite state machine): у него есть список **состояний**, и в каждый момент он находится ровно в одном из них.\n\nНа каждом фронте тактового сигнала автомат смотрит на входы и решает, остаться в своём состоянии или перейти в другое. Это правило называется **переходом**. Выход зависит от состояния: пока автомат в состоянии «включено», светодиод горит.\n\nСамый маленький полезный автомат имеет два состояния. Он помнит, горит ли светодиод, и каждое нажатие кнопки переворачивает это.':
    'A circuit that has **memory of the past** behaves differently depending on what has already happened to it. Such a circuit is conveniently described as a **finite state machine** (FSM): it has a list of **states**, and at any moment it is in exactly one of them.\n\nOn every edge of the clock signal the machine looks at the inputs and decides whether to stay in its state or move to another. This rule is called a **transition**. The output depends on the state: while the machine is in the "on" state, the LED is lit.\n\nThe smallest useful machine has two states. It remembers whether the LED is lit, and each button press flips that.',
  'Состояние, переход, сброс': 'State, transition, reset',
  'В Verilog состояние хранится в регистре `state`. Его меняет блок `always @(posedge clk)`: на каждом фронте он вычисляет, каким станет состояние. Имена состояний удобно задавать через `localparam`, чтобы в коде было `ON` и `OFF`, а не загадочные нули и единицы.\n\n**Сброс** нужен, чтобы автомат знал, с чего начинать, когда плата только включилась. Он стоит первым в цепочке `if`: если `reset` равен 1, то остальное неважно, автомат уходит в начальное состояние `OFF`.\n\nВыход здесь берётся прямо из состояния: `led` равен 1, когда `state` равен `ON`. Выход, который зависит только от состояния, называют выходом автомата Мура.':
    'In Verilog the state is stored in the register `state`. It is changed by an `always @(posedge clk)` block: on every edge it computes what the state will become. State names are conveniently set with `localparam`, so the code has `ON` and `OFF` rather than mysterious zeros and ones.\n\nA **reset** is needed so that the machine knows where to start when the board has just been powered on. It stands first in the `if` chain: if `reset` is 1, nothing else matters, the machine goes to the initial state `OFF`.\n\nThe output here is taken directly from the state: `led` is 1 when `state` is `ON`. An output that depends only on the state is called a Moore machine output.',
  'Про длинное нажатие': 'About a long press',
  'В проверках кнопка нажимается ровно на один такт. На настоящей плате человек держит кнопку тысячи тактов подряд, и такой автомат переключался бы на каждом из них, а светодиод мерцал бы. Чтобы этого не было, нужно реагировать не на «кнопка нажата», а на «кнопка только что нажата». Эту хитрость мы разберём позже, а пока научимся самому автомату.':
    'In the checks the button is pressed for exactly one clock. On a real board a person holds the button for thousands of clocks in a row, and such a machine would toggle on each of them, and the LED would flicker. To avoid this, you need to react not to "the button is pressed" but to "the button has just been pressed". We will go through that trick later, and for now let us learn the machine itself.',
  'Автомат в состоянии OFF, кнопка не нажата, приходит фронт такта. Что будет?':
    'The machine is in the OFF state, the button is not pressed, a clock edge arrives. What happens?',
  'Автомат останется в OFF: перехода нет, пока btn равен 0':
    'The machine stays in OFF: there is no transition while btn is 0',
  'Автомат перейдёт в ON, ведь пришёл фронт': 'The machine goes to ON, since an edge arrived',
  'Автомат сбросится, потому что кнопка не нажата':
    'The machine resets, because the button is not pressed',
  'Фронт сам по себе только «даёт слово» автомату. Переход происходит, когда выполнено его условие, здесь это btn = 1. Без нажатия состояние сохраняется.':
    'The edge by itself only "gives the floor" to the machine. A transition happens when its condition is met, here that is btn = 1. Without a press the state is kept.',
  'Доделай автомат: при btn = 1 на фронте состояние меняется на противоположное. Сброс важнее кнопки: при reset = 1 светодиод гаснет, даже если кнопка нажата.':
    'Finish the machine: with btn = 1 on the edge the state changes to the opposite one. Reset is more important than the button: with reset = 1 the LED goes out, even if the button is pressed.',
  'Кнопку не нажимали: светодиод погашен': 'The button was not pressed: the LED is off',
  'Первое нажатие: светодиод горит': 'First press: the LED is on',
  'Кнопку отпустили: горит дальше': 'The button was released: stays on',
  'Второе нажатие: гаснет': 'Second press: goes off',
  'Третье нажатие: горит': 'Third press: on',
  'Четвёртое нажатие: гаснет': 'Fourth press: off',
  'Кнопку отпустили: погашен': 'The button was released: off',
  'Пятое нажатие: горит': 'Fifth press: on',
  'Кнопка нажата во время сброса: светодиод не горит':
    'The button is pressed during reset: the LED is not lit',
  'Нужна ещё одна ветка после if (reset): условие, что кнопка нажата.':
    'One more branch is needed after if (reset): the condition that the button is pressed.',
  'В этой ветке состояние должно стать противоположным: из OFF в ON, из ON в OFF.':
    'In this branch the state must become the opposite one: from OFF to ON, from ON to OFF.',
  'Детектор последовательности 101': 'A 101 sequence detector',
  'Что ищет детектор': 'What the detector looks for',
  'По одному проводу `x` в схему приходит поток нулей и единиц, по одному биту на такт. Детектор должен выдать `y = 1` в тот такт, когда **только что** пришли подряд биты 1, 0, 1. В остальные такты `y = 0`.\n\nПамяти для этого нужно мало. Автомату не надо помнить весь поток: достаточно знать, **какую часть нужной последовательности мы уже набрали**. Отсюда и состояния: ничего не набрано, набрана «1», набрано «10», набрано «101».':
    'Along one wire `x` a stream of zeros and ones arrives at the circuit, one bit per clock. The detector must output `y = 1` in the clock when the bits 1, 0, 1 have **just** arrived in a row. In other clocks `y = 0`.\n\nVery little memory is needed for this. The machine does not have to remember the whole stream: it is enough to know **which part of the needed sequence we have already collected**. Hence the states: nothing collected, "1" collected, "10" collected, "101" collected.',
  'Граф состояний': 'The state graph',
  'Состояний четыре. В `FOUND` автомат попадает, когда последовательность только что завершилась, и там выход равен 1. Дальше надо аккуратно решить, куда идти из `FOUND`: последний принятый бит был 1, а значит он может оказаться началом новой последовательности. Поэтому из `FOUND` по x = 1 мы идём в `GOT1`, а по x = 0 в `GOT10`: после 101 и нуля уже набраны «10».\n\nТак последовательности могут **перекрываться**: в потоке 10101 есть две последовательности 101, и у них общая единица посередине.':
    'There are four states. The machine gets into `FOUND` when the sequence has just finished, and the output is 1 there. Next we must carefully decide where to go from `FOUND`: the last received bit was 1, which means it may turn out to be the start of a new sequence. So from `FOUND` on x = 1 we go to `GOT1`, and on x = 0 to `GOT10`: after 101 and a zero, "10" is already collected.\n\nThis way sequences can **overlap**: in the stream 10101 there are two sequences 101, and they share the middle one.',
  'Состояния кодируем двумя битами, а переходы пишем через `case (state)`: для каждого состояния своя ветка с условием по `x`. Выход берём из состояния, как в прошлом уроке.\n\nОдин такт, пока автомат стоит в `FOUND`, и есть тот самый единственный такт, в который `y = 1`.':
    'We encode the states with two bits, and write the transitions through `case (state)`: for each state its own branch with a condition on `x`. The output is taken from the state, as in the previous lesson.\n\nOne clock while the machine stands in `FOUND` is that very single clock in which `y = 1`.',
  'Поток 1 1 0 1. Закончилась ли в нём последовательность 101, и в каком состоянии автомат после последнего бита?':
    'The stream is 1 1 0 1. Has the sequence 101 finished in it, and in which state is the machine after the last bit?',
  'Да, закончилась: автомат в FOUND': 'Yes, it has finished: the machine is in FOUND',
  'Нет: автомат в GOT1, так как последний бит 1, но перед ним был 1, а не 0':
    'No: the machine is in GOT1, since the last bit is 1, but before it was 1, not 0',
  'Да, но автомат в IDLE, потому что в потоке есть лишняя единица':
    'Yes, but the machine is in IDLE, because the stream has an extra one',
  'Первая единица нас не смущает: из GOT1 по второй единице автомат остаётся в GOT1 (набрана «1», та, что последняя). Затем приходят 0 (GOT10) и 1 (FOUND). Лишние единицы в начале не мешают.':
    'The first one does not bother us: from GOT1 on the second one the machine stays in GOT1 (the "1" is collected, the last one). Then 0 (GOT10) and 1 (FOUND) arrive. Extra ones at the start do not interfere.',
  'Допиши переходы автомата так, чтобы y = 1 ровно в тот такт, когда в потоке x только что завершилась последовательность 101. Последовательности могут перекрываться.':
    "Finish the machine's transitions so that y = 1 in exactly the clock when the sequence 101 has just finished in the stream x. Sequences may overlap.",
  'Во время сброса приходило 1 0, теперь 1: это не 101':
    'During reset 1 0 arrived, now 1: this is not 101',
  'Поток 1 0: ещё не готово': 'The stream 1 0: not ready yet',
  'Поток 101: найдено': 'The stream 101: found',
  'Сразу после находки: выход один такт, дальше 0':
    'Right after the find: the output for one clock, then 0',
  'Поток 10101: найдено второй раз (перекрытие)': 'The stream 10101: found a second time (overlap)',
  'Следом единица: 011 не годится': 'Followed by a one: 011 does not fit',
  'Ложное начало 1 0 0: не годится': 'A false start 1 0 0: does not fit',
  'Снова ложное начало': 'Again a false start',
  'Поток 101 после ложных начал: найдено': 'The stream 101 after false starts: found',
  'Поток 1 0 после находки: ещё не готово': 'The stream 1 0 after a find: not ready yet',
  'Поток 101 после находки: найдено': 'The stream 101 after a find: found',
  'Из GOT10 нужна ветка по x: единица завершает последовательность, ноль начинает всё заново.':
    'From GOT10 a branch on x is needed: a one finishes the sequence, a zero starts everything anew.',
  'FOUND: последний бит был единицей. Если дальше 1, она может начать новую последовательность (GOT1), если 0, то уже набрано «10» (GOT10).':
    'FOUND: the last bit was a one. If another 1 follows, it may start a new sequence (GOT1), if 0, then "10" is already collected (GOT10).',
  'Выход: assign y = (state == FOUND);': 'The output: assign y = (state == FOUND);',
  'Детектор 1011 с перекрытием': 'A 1011 detector with overlap',
  'Длиннее и коварнее': 'Longer and trickier',
  'Теперь ищем 1011. Состояний пять: ничего, «1», «10», «101» и «1011» (находка). Новая трудность в том, что при **неудаче** нельзя просто возвращаться в начало: уже принятые биты могут быть началом новой попытки.\n\nПример: набрано «101», и приходит 0. Нужное было 1, значит 1011 не вышло. Но последние два бита теперь «10», это начало новой попытки. Правильный переход из «101» по x = 0 ведёт в `GOT10`, а не в `IDLE`.':
    'Now we look for 1011. There are five states: nothing, "1", "10", "101" and "1011" (found). The new difficulty is that on **failure** you cannot simply return to the start: the bits already received may be the beginning of a new attempt.\n\nExample: "101" is collected, and a 0 arrives. The needed one was 1, so 1011 did not work out. But the last two bits are now "10", the start of a new attempt. The correct transition from "101" on x = 0 leads to `GOT10`, not to `IDLE`.',
  'Правило для расстановки переходов: из каждого состояния по каждому биту идём в состояние, которое соответствует **самому длинному хвосту потока, являющемуся началом 1011**.\n\n- из `FOUND` (хвост 1011) по 1 идём в `GOT1`: хвост «1»\n- из `FOUND` по 0 идём в `GOT10`: хвост «10»\n- из `GOT101` по 0 идём в `GOT10` (хвост «10»)\n- из `GOT10` по 0 идём в `IDLE`: хвоста нет\n\nПерекрытие в 1011 даёт общая единица: в потоке 1011011 последовательность заканчивается дважды.':
    'A rule for arranging transitions: from each state on each bit we go to the state that matches the **longest tail of the stream that is a beginning of 1011**.\n\n- from `FOUND` (tail 1011) on 1 we go to `GOT1`: the tail "1"\n- from `FOUND` on 0 we go to `GOT10`: the tail "10"\n- from `GOT101` on 0 we go to `GOT10` (the tail "10")\n- from `GOT10` on 0 we go to `IDLE`: no tail\n\nThe overlap in 1011 is given by the shared one: in the stream 1011011 the sequence ends twice.',
  'Автомат в GOT101 (набрано «101»), приходит 0. Куда ему надо перейти?':
    'The machine is in GOT101 ("101" collected), a 0 arrives. Where must it go?',
  'В GOT10: хвост «10» начало новой попытки':
    'To GOT10: the tail "10" is the start of a new attempt',
  'В IDLE: попытка сорвана, начинаем заново': 'To IDLE: the attempt failed, we start again',
  'В FOUND: 0 тоже подходит': 'To FOUND: 0 fits too',
  'Из IDLE было бы потеряно «10», и поток 1 0 1 0 1 1 не дал бы находки, хотя она там есть. Всегда идём в состояние, соответствующее самому длинному подходящему хвосту.':
    'From IDLE the "10" would be lost, and the stream 1 0 1 0 1 1 would give no find, although there is one. We always go to the state matching the longest suitable tail.',
  'Сделай детектор последовательности 1011: y = 1 в такт, когда она только что завершилась, перекрывающиеся находки считаются. Не забудь про «подлый» переход GOT101 по нулю.':
    'Make a 1011 sequence detector: y = 1 in the clock when it has just finished, overlapping finds count. Do not forget the "sneaky" transition of GOT101 on zero.',
  'Во время сброса приходило 101, теперь 1: сброс стёр начало':
    'During reset 101 arrived, now 1: the reset erased the start',
  'Поток 101: ещё не готово': 'The stream 101: not ready yet',
  'Поток 1011: найдено': 'The stream 1011: found',
  'Следом ноль: выход один такт': 'Followed by a zero: the output for one clock',
  'Поток 1011011: найдено второй раз (перекрытие)':
    'The stream 1011011: found a second time (overlap)',
  'После находки пошёл 0: ещё нет': 'After a find a 0 came: not yet',
  'Поток 10101: попытка сорвалась, но «10» осталось':
    'The stream 10101: the attempt failed, but "10" remained',
  'Поток 101011: найдено, несмотря на срыв': 'The stream 101011: found, despite the failure',
  'После находки идёт 1: ещё нет': 'After a find a 1 comes: not yet',
  'Поток 1 0 1 после находки: ещё не готово': 'The stream 1 0 1 after a find: not ready yet',
  'Поток 1011 после находки: найдено': 'The stream 1011 after a find: found',
  'Находка: из GOT101 по x = 1 идём в FOUND. А если x = 0?':
    'The find: from GOT101 on x = 1 we go to FOUND. And if x = 0?',
  'Из GOT101 по нулю идём не в IDLE, а в GOT10: «10» в хвосте уже есть. FOUND ведёт себя как после «1» при x = 1 и как после «10» при x = 0.':
    'From GOT101 on zero we go not to IDLE but to GOT10: "10" is already in the tail. FOUND behaves as after "1" with x = 1 and as after "10" with x = 0.',
  'Мур и Мили: когда выход реагирует': 'Moore and Mealy: when the output reacts',
  'Два способа получить выход': 'Two ways to get an output',
  'В автоматах есть два классических вида.\n\n- **Автомат Мура**: выход зависит только от состояния. В прошлых уроках `y = (state == FOUND)` была именно такой. Выход меняется после фронта, когда сменилось состояние.\n- **Автомат Мили**: выход зависит от состояния **и** от текущего входа. Он может измениться сразу, как только изменился вход, не дожидаясь фронта.\n\nОбычно Мили выдаёт ответ на такт раньше: ему не нужно заводить отдельное состояние «нашёл», достаточно заметить, что мы в состоянии «набрано 10» и сейчас пришла единица.':
    'There are two classic kinds of machines.\n\n- **Moore machine**: the output depends only on the state. In the previous lessons `y = (state == FOUND)` was exactly that. The output changes after the edge, when the state has changed.\n- **Mealy machine**: the output depends on the state **and** on the current input. It can change as soon as the input changes, without waiting for the edge.\n\nUsually Mealy gives the answer a clock earlier: it does not need a separate "found" state, it is enough to notice that we are in the state "10 collected" and a one has just arrived.',
  'Как увидеть разницу': 'How to see the difference',
  'В этом уроке у детектора 101 появляется вход **take** («принять бит»). Автомат переходит в следующее состояние только когда `take = 1`; когда `take = 0`, бит `x` просто лежит на входе, и состояние стоит.\n\nПредставь, что `x = 1`, а `take = 0`, и автомат в состоянии `GOT10`. В Мили выход уже равен 1: он видит и состояние, и входной бит. В Мура выход остаётся 0, пока автомат не принял бит и не пришёл в `FOUND`.\n\nА после того как бит принят (`take = 1`), состояние сменилось и у Мили единица пропала: условие «в GOT10 и x = 1» уже не выполняется.':
    'In this lesson the 101 detector gets an input **take** ("accept the bit"). The machine moves to the next state only when `take = 1`; when `take = 0`, the bit `x` just lies on the input, and the state stands still.\n\nImagine `x = 1`, and `take = 0`, and the machine is in the state `GOT10`. In Mealy the output is already 1: it sees both the state and the input bit. In Moore the output stays 0 until the machine has accepted the bit and arrived in `FOUND`.\n\nAnd after the bit is accepted (`take = 1`), the state has changed and Mealy\'s one has gone: the condition "in GOT10 and x = 1" no longer holds.',
  'Что делаешь ты': 'What you do',
  'Автомат (состояния и переходы) уже написан. Тебе нужно записать **выход в стиле Мили**: единица, когда автомат в состоянии `GOT10`, а на входе прямо сейчас `x = 1`.\n\nОбрати внимание: выход здесь считается от состояния и входа без `always`, обычным `assign`. Это и есть признак Мили.':
    'The machine (states and transitions) is already written. You need to write the **Mealy-style output**: a one when the machine is in the state `GOT10` and right now `x = 1` on the input.\n\nNote: the output here is computed from the state and the input without `always`, with an ordinary `assign`. This is the mark of Mealy.',
  'Чем выход Мили отличается от выхода Мура?':
    'How does a Mealy output differ from a Moore output?',
  'Он зависит не только от состояния, но и от текущих входов':
    'It depends not only on the state but also on the current inputs',
  'Он обновляется только по фронту, а Мура сразу':
    "It is updated only on the edge, while Moore's is immediate",
  'Мили не нуждается в состояниях': 'Mealy does not need states',
  'Мили сочетает состояние и входы, поэтому может измениться, как только изменится вход. Мур зависит только от состояния и поэтому меняется после фронта. Состояния нужны обоим.':
    'Mealy combines the state and the inputs, so it can change as soon as the input changes. Moore depends only on the state and so changes after the edge. Both need states.',
  'Допиши выход y как у автомата Мили: y = 1, когда автомат в состоянии GOT10 и на входе x прямо сейчас единица. Не требуй при этом take.':
    'Finish the output y as in a Mealy machine: y = 1 when the machine is in the state GOT10 and right now there is a one on the input x. Do not require take for this.',
  'Бит 1 принят: рано, выход 0': 'Bit 1 accepted: too early, output 0',
  'Бит 0 принят (набрано «10», x = 0): выход 0': 'Bit 0 accepted ("10" collected, x = 0): output 0',
  'Бит 1 лежит на входе, take = 0: Мили уже отвечает 1':
    'Bit 1 is on the input, take = 0: Mealy already answers 1',
  'Бит 1 принят: состояние сменилось, выход снова 0':
    'Bit 1 accepted: the state changed, the output is 0 again',
  'Ничего не принимаем, x = 0: выход 0': 'Nothing is accepted, x = 0: output 0',
  'Набрано «10», x = 0, take = 0: выход 0': '"10" collected, x = 0, take = 0: output 0',
  'Набрано «10», x = 1, take = 0: выход 1': '"10" collected, x = 1, take = 0: output 1',
  'Бит 0 принят: «10» сорвалось, выход 0': 'Bit 0 accepted: "10" failed, output 0',
  'x = 1 в состоянии IDLE: выход 0': 'x = 1 in the state IDLE: output 0',
  'Выход должен быть единицей в двух условиях сразу: автомат в GOT10 и x равен 1.':
    'The output must be one under two conditions at once: the machine is in GOT10 and x is 1.',
  'take в выходе не нужен: Мили отвечает на вход, пока бит ещё не принят.':
    'take is not needed in the output: Mealy responds to the input while the bit is not yet accepted.',
  'Автомат с монетами: товар за 15': 'A coin machine: an item for 15',
  'Состояние как накопленная сумма': 'The state as an accumulated sum',
  'Автомат с газировкой принимает монеты по 5 и по 10 и отдаёт товар, когда набрано 15 или больше. Состояние здесь удобно назвать по накопленной сумме: `SUM0`, `SUM5`, `SUM10`. Когда сумма достигла 15, автомат переходит в `PAID` (оплачено) и выход `dispense` (выдать товар) равен 1 ровно на один такт. Следом автомат возвращается в `SUM0` и ждёт нового покупателя.\n\nМонета приходит одним тактом на входе `coin5` или `coin10`. Если монет нет, состояние не меняется: покупатель может подумать. Сдачи автомат не даёт: 10 + 10 тоже хватает на товар.\n\nСлово `release` в Verilog уже занято языком, поэтому выход называется `dispense`.':
    'A soda machine accepts coins of 5 and 10 and dispenses the item when 15 or more is collected. The state is conveniently named by the accumulated sum: `SUM0`, `SUM5`, `SUM10`. When the sum has reached 15, the machine goes to `PAID` and the output `dispense` equals 1 for exactly one clock. Then the machine returns to `SUM0` and waits for a new customer.\n\nA coin arrives for one clock on the input `coin5` or `coin10`. If there are no coins, the state does not change: the customer may think. The machine gives no change: 10 + 10 is also enough for the item.\n\nThe word `release` is already taken by the Verilog language, so the output is called `dispense`.',
  'Запись переходов': 'Writing the transitions',
  'Таблица переходов часто яснее графа. Строки это состояния, столбцы это монеты.\n\nВ Verilog это `case`, внутри каждой ветки условия по монетам. Если ни одна монета не пришла, ветка ничего не присваивает, и регистр сохраняет старое значение.':
    'A transition table is often clearer than a graph. The rows are states, the columns are coins.\n\nIn Verilog this is `case`, with conditions on coins inside each branch. If no coin arrived, the branch assigns nothing, and the register keeps the old value.',
  'В состоянии SUM10 приходит монета coin10. Что делает автомат?':
    'In the state SUM10 a coin10 arrives. What does the machine do?',
  'Идёт в PAID: 20 уже хватает на товар, сдачи нет':
    'Goes to PAID: 20 is already enough for the item, no change',
  'Остаётся в SUM10 и ждёт ещё монет': 'Stays in SUM10 and waits for more coins',
  'Идёт в SUM0, лишняя монета возвращается': 'Goes to SUM0, the extra coin is returned',
  'Правило «15 или больше»: 10 + 10 = 20, значит оплата завершена. Наш автомат сдачи не выдаёт.':
    'The rule "15 or more": 10 + 10 = 20, so the payment is complete. Our machine gives no change.',
  'Допиши автомат: dispense = 1 на один такт, когда сумма монет по 5 и 10 достигла 15 или больше. После выдачи автомат снова ждёт монет. Сброс обнуляет накопленную сумму.':
    'Finish the machine: dispense = 1 for one clock when the sum of coins of 5 and 10 has reached 15 or more. After dispensing the machine waits for coins again. Reset clears the accumulated sum.',
  'Первая монета 5 после сброса: рано': 'The first coin of 5 after reset: too early',
  '5 + 5 = 10: рано': '5 + 5 = 10: too early',
  '5 + 5 + 5 = 15: выдача': '5 + 5 + 5 = 15: dispense',
  'Следом тишина: выдача только один такт': 'Silence follows: dispensing for only one clock',
  '10 + 10 = 20: выдача': '10 + 10 = 20: dispense',
  'Следом тишина: выдача закончилась': 'Silence follows: dispensing is over',
  '5, потом пауза без монет: ждём': '5, then a pause without coins: we wait',
  '5 + 10 = 15: выдача': '5 + 10 = 15: dispense',
  'Снова тишина: выдача закончилась': 'Silence again: dispensing is over',
  '10 + 5 = 15: выдача': '10 + 5 = 15: dispense',
  'Три монеты по 5 брошены во время сброса: выдачи нет':
    'Three coins of 5 are thrown during reset: no dispense',
  'Для SUM5 нужны две ветки: coin5 ведёт в SUM10, coin10 в PAID. Для SUM10 любая монета приводит в PAID.':
    'For SUM5 two branches are needed: coin5 leads to SUM10, coin10 to PAID. For SUM10 any coin leads to PAID.',
  'Если ни одна монета не пришла, ничего не присваивайте: состояние сохранится само.':
    'If no coin arrived, assign nothing: the state will be kept by itself.',
  'assign dispense = (state == PAID); а в SUM10: if (coin5 || coin10) state <= PAID;':
    'assign dispense = (state == PAID); and in SUM10: if (coin5 || coin10) state <= PAID;',
  'Кодовый замок: 1, 0, 1': 'A code lock: 1, 0, 1',
  'Чем замок отличается от детектора': 'How a lock differs from a detector',
  'Замок похож на детектор, но правила другие. У замка две кнопки: `b1` и `b0` (это «цифры» кода), и ещё кнопка `lock` («закрыть»).\n\n- Код 1, 0, 1. Пока кнопки не нажаты, замок просто ждёт: пауза между цифрами не ломает ввод.\n- Любая **неверная** цифра сбрасывает ввод в начало. Перекрытия нет: набрал 1, потом ещё раз 1, начинай заново.\n- Когда код введён, `unlock` становится 1 и **остаётся** 1, что бы ни нажимали, пока не нажмут `lock`.\n\nПоследний пункт важен: у замка есть состояние `OPEN`, из которого выход только по `lock` или сбросу.':
    'A lock is similar to a detector, but the rules are different. A lock has two buttons: `b1` and `b0` (the "digits" of the code), and one more button `lock` ("close").\n\n- The code is 1, 0, 1. While no buttons are pressed, the lock simply waits: a pause between digits does not break the entry.\n- Any **wrong** digit resets the entry to the start. There is no overlap: you typed 1, then 1 again, start over.\n- When the code is entered, `unlock` becomes 1 and **stays** 1, whatever is pressed, until `lock` is pressed.\n\nThe last point is important: the lock has an `OPEN` state, from which the only way out is `lock` or reset.',
  'Ожидание нужной кнопки': 'Waiting for the needed button',
  'Назовём состояния по тому, что замок ждёт: `WAIT1` (ждёт первую единицу), `WAIT0` (ждёт ноль), `WAIT1B` (ждёт вторую единицу), `OPEN`.\n\nВ каждом состоянии две ветки: верная кнопка и неверная. Если не нажато ничего, ни одна ветка не сработает, и состояние сохраняется.\n\nВыход Мура: `unlock = (state == OPEN)`.':
    'Let us name the states by what the lock is waiting for: `WAIT1` (waits for the first one), `WAIT0` (waits for the zero), `WAIT1B` (waits for the second one), `OPEN`.\n\nIn each state there are two branches: the right button and the wrong one. If nothing is pressed, neither branch fires, and the state is kept.\n\nA Moore output: `unlock = (state == OPEN)`.',
  'Нажато 1, потом ещё раз 1. Что сделает строгий замок?':
    '1 is pressed, then 1 again. What will a strict lock do?',
  'Вернётся в начало: вторая единица стоит не на месте (ждали 0)':
    'Return to the start: the second one is out of place (we waited for 0)',
  'Перейдёт к ожиданию единицы: две единицы подряд тоже подходят':
    'Go to waiting for a one: two ones in a row fit too',
  'Откроется, потому что 1 уже была': 'Open, because there was already a 1',
  'В состоянии «ждём ноль» единица не подходит, и строгий замок начинает ввод заново. Так отличается замок от детектора: у замка перекрытия нет.':
    'In the state "waiting for zero" a one does not fit, and a strict lock starts the entry anew. This is how a lock differs from a detector: a lock has no overlap.',
  'Допиши кодовый замок: код 1, 0, 1 (кнопки b1, b0, b1). Неверная кнопка возвращает ввод в начало, пауза его не ломает. unlock держится в 1 до нажатия lock или сброса.':
    'Finish the code lock: the code is 1, 0, 1 (buttons b1, b0, b1). A wrong button returns the entry to the start, a pause does not break it. unlock holds at 1 until lock is pressed or reset.',
  'Ввели 1, пауза, 0: ещё закрыто': 'Entered 1, pause, 0: still closed',
  'Вместо второй цифры снова 0 (ждали единицу): ошибка':
    'Instead of the second digit 0 again (a one was expected): error',
  'Два раза подряд 1: ошибка, ввод заново': 'Two ones in a row: error, entry anew',
  'Ввели 1, 0, пауза, 1: открыто': 'Entered 1, 0, pause, 1: open',
  'Ничего не нажимают: остаётся открыто': 'Nothing is pressed: stays open',
  'Нажали 0 при открытом замке: остаётся открыто': '0 pressed with the lock open: stays open',
  'Нажали lock: закрыто': 'lock pressed: closed',
  'Новый ввод 1, 0, 1 после закрытия: открыто': 'A new entry 1, 0, 1 after closing: open',
  'Верный код нажат во время сброса: замок закрыт':
    'The right code is pressed during reset: the lock is closed',
  'Неверная кнопка из WAIT0 и WAIT1B возвращает замок в WAIT1. Если нажата верная кнопка, идём вперёд, если ничего не нажато, ничего не присваиваем.':
    'A wrong button from WAIT0 and WAIT1B returns the lock to WAIT1. If the right button is pressed, we go forward, if nothing is pressed, we assign nothing.',
  'OPEN держит состояние, пока не нажмут lock: OPEN: if (lock) state <= WAIT1;':
    'OPEN keeps the state until lock is pressed: OPEN: if (lock) state <= WAIT1;',
  'WAIT1B: begin if (b1) state <= OPEN; else if (b0) state <= WAIT1; end и assign unlock = (state == OPEN);':
    'WAIT1B: begin if (b1) state <= OPEN; else if (b0) state <= WAIT1; end and assign unlock = (state == OPEN);',
  'Бегущий огонёк и кодировка one-hot': 'A running light and one-hot encoding',
  'Один бит на состояние': 'One bit per state',
  'До сих пор состояния кодировались числами: 0, 1, 2, 3. Это **двоичная кодировка**. Есть другая, **one-hot** («одна горячая»): на каждое состояние отдельный бит, и в любой момент горит ровно один. Для четырёх состояний это четыре бита: `0001`, `0010`, `0100`, `1000`.\n\nПлюс в том, что дешифровать ничего не надо: бит состояния сам служит сигналом «мы в состоянии №3». Минус в том, что регистров больше. В ПЛИС регистров много, поэтому one-hot там популярна.':
    'So far states were encoded with numbers: 0, 1, 2, 3. This is **binary encoding**. There is another, **one-hot**: a separate bit for each state, and at any moment exactly one is lit. For four states that is four bits: `0001`, `0010`, `0100`, `1000`.\n\nThe advantage is that nothing has to be decoded: the state bit itself serves as the signal "we are in state number 3". The drawback is that there are more registers. In an FPGA there are many registers, so one-hot is popular there.',
  Бегунок: 'The runner',
  'Бегущий огонёк на четырёх светодиодах как раз ходит по состояниям one-hot: горит один, и с каждым тактом он сдвигается влево, а из последнего возвращается в первый. Регистр состояния и есть выход `leds`.\n\nСдвиг влево на единицу записывается `{leds[2:0], leds[3]}`: три младших бита становятся старшими, а старший уходит в младший разряд. Вход `go` разрешает сдвиг; при `go = 0` огонёк стоит. Сброс ставит огонёк в начало, `0001`.\n\nОбрати внимание: на настоящей плате светодиод включается нулём, но здесь `leds` это просто сигнал, в котором 1 означает «горит».':
    'A running light on four LEDs walks through one-hot states: one is lit, and with each clock it shifts left, and from the last one returns to the first. The state register is the output `leds`.\n\nA shift left by one is written `{leds[2:0], leds[3]}`: the three low bits become the high ones, and the high one goes to the low place. The input `go` enables the shift; with `go = 0` the light stands still. Reset puts the light at the start, `0001`.\n\nNote: on a real board an LED turns on with zero, but here `leds` is just a signal in which 1 means "lit".',
  'Чем one-hot отличается от двоичной кодировки для автомата из 4 состояний?':
    'How does one-hot differ from binary encoding for a machine of 4 states?',
  'Один бит на состояние: 4 бита вместо 2, зато ничего не надо дешифровать':
    'One bit per state: 4 bits instead of 2, but nothing needs decoding',
  'Состояний может быть меньше, ведь one-hot экономит память':
    'There may be fewer states, because one-hot saves memory',
  'Он работает без тактового сигнала': 'It works without a clock signal',
  'One-hot тратит больше триггеров (по одному на состояние), но каждое состояние читается одним битом, без сравнений. Число состояний и такт от кодировки не зависят.':
    'One-hot uses more flip-flops (one per state), but each state is read with one bit, without comparisons. The number of states and the clock do not depend on the encoding.',
  'Сделай бегунок: сброс ставит 0001, а при go = 1 на каждом фронте единица сдвигается на бит влево по кругу (после 1000 снова 0001). При go = 0 огонёк стоит.':
    'Make a runner: reset sets 0001, and with go = 1 on each edge the one shifts one bit left in a circle (after 1000 again 0001). With go = 0 the light stands.',
  'Первый шаг: огонёк в бите 1': 'First step: the light in bit 1',
  'Второй шаг: бит 2': 'Second step: bit 2',
  'Пауза go = 0: огонёк стоит': 'Pause go = 0: the light stands',
  'Третий шаг: бит 3': 'Third step: bit 3',
  'Круг замкнулся: снова бит 0': 'The circle closed: bit 0 again',
  'Новый круг начался': 'A new round started',
  'Опять бит 3': 'Bit 3 again',
  'Пауза go = 0: огонёк стоит на бите 3': 'Pause go = 0: the light stands at bit 3',
  'Круг замкнулся второй раз': 'The circle closed a second time',
  'go = 1 во время сброса: огонёк в начале, 0001':
    'go = 1 during reset: the light at the start, 0001',
  'Сдвиг на бит влево без потери: старший бит должен вернуться в младший разряд.':
    'A shift left without loss: the high bit must return to the low place.',
  'Три младших бита leds[2:0] станут старшими, а leds[3] встанет на место младшего.':
    'The three low bits leds[2:0] become the high ones, and leds[3] takes the place of the low one.',
  'Генератор последовательности из четырёх значений': 'A generator of a sequence of four values',
  'Автомат без входов': 'A machine without inputs',
  'Бывает автомат, которому входы не нужны: он просто идёт по кругу сам, по одному шагу за такт. Состояния делают роль «номера шага», а выход определяется номером. Так работают генераторы сигналов: мигалки, сирены, управление шаговым двигателем.\n\nНапример, на выходе `y` из двух бит надо по кругу получать значения 3, 1, 0, 2. Состояние хранит номер шага от 0 до 3, и он растёт на каждом такте. Дойдя до 3, двухбитный счётчик сам переходит в 0, потому что 3 + 1 в двух битах это 0.':
    'There is a machine that needs no inputs: it just goes around in a circle by itself, one step per clock. The states play the role of a "step number", and the output is determined by the number. This is how signal generators work: blinkers, sirens, stepper motor control.\n\nFor example, on the two-bit output `y` you need to get the values 3, 1, 0, 2 in a circle. The state stores the step number from 0 to 3, and it grows on every clock. Having reached 3, the two-bit counter goes to 0 by itself, because 3 + 1 in two bits is 0.',
  'Номер шага и значение: case': 'Step number and value: case',
  'Связать номер шага с выходом удобно через `case` в блоке `always @*`: для каждого номера записано своё значение, как строка в таблице. Такой автомат называется автоматом Мура: выход зависит только от состояния.\n\nПорядок значений ты выбираешь сам, а любое другое можно задать, просто поменяв строки таблицы. Сброс возвращает автомат на шаг 0.':
    'It is convenient to link the step number with the output through `case` in an `always @*` block: for each number its value is written, like a row in a table. Such a machine is called a Moore machine: the output depends only on the state.\n\nYou choose the order of the values yourself, and any other can be set simply by changing the rows of the table. Reset returns the machine to step 0.',
  'Двухбитный счётчик шага дошёл до 3. Что будет на следующем такте, если ничего не писать про переполнение?':
    'The two-bit step counter has reached 3. What will happen on the next clock if nothing is written about overflow?',
  'Он станет 0: 3 + 1 не умещается в двух битах, и остаётся 00':
    'It becomes 0: 3 + 1 does not fit in two bits, and 00 remains',
  'Он остановится на 3': 'It stops at 3',
  'Он станет 4, ведь выход шире': 'It becomes 4, because the output is wider',
  'Регистр из двух бит хранит числа 0..3. При прибавлении единицы к 3 старший бит теряется, остаётся 00, и круг замыкается сам.':
    'A register of two bits stores the numbers 0..3. When one is added to 3, the high bit is lost, 00 remains, and the circle closes by itself.',
  'Допиши таблицу выхода: на шагах 0, 1, 2, 3 выход y равен 11, 01, 00, 10. Номер шага уже считается; сброс возвращает его на шаг 0.':
    'Finish the output table: on steps 0, 1, 2, 3 the output y equals 11, 01, 00, 10. The step number is already counted; reset returns it to step 0.',
  'Во время сброса: шаг 0, выход 11': 'During reset: step 0, output 11',
  'Шаг 1: выход 01': 'Step 1: output 01',
  'Шаг 2: выход 00': 'Step 2: output 00',
  'Шаг 3: выход 10': 'Step 3: output 10',
  'Круг замкнулся: шаг 0, выход 11': 'The circle closed: step 0, output 11',
  'Шаг 1 второго круга: выход 01': 'Step 1 of the second round: output 01',
  'Шаг 2 второго круга: выход 00': 'Step 2 of the second round: output 00',
  'Шаг 3 второго круга: выход 10': 'Step 3 of the second round: output 10',
  'Третий круг начался: выход 11': 'The third round started: output 11',
  'Каждая строка case: номер шага, двоеточие, значение выхода. Нужны ещё три строки.':
    'Each line of case: the step number, a colon, the output value. Three more lines are needed.',
  'Шаг 1 даёт 01, шаг 2 даёт 00, шаг 3 даёт 10.':
    'Step 1 gives 01, step 2 gives 00, step 3 gives 10.',
  'Рукопожатие req/ack': 'The req/ack handshake',
  'Договор двух устройств': 'An agreement between two devices',
  'Когда два устройства передают друг другу данные и работают с разной скоростью, им нужен «договор». Самый простой называется **рукопожатием** (handshake):\n\n- клиент поднимает **req** («запрос») и держит его;\n- сервер, когда готов, поднимает **ack** («подтверждение»);\n- клиент видит ack и опускает req;\n- сервер видит, что req опущен, и опускает ack.\n\nПока кто-то не ответил, другой ждёт. Скорость поэтому неважна: оба знают, что шаг сделан.':
    'When two devices pass data to each other and work at different speeds, they need an "agreement". The simplest is called a **handshake**:\n\n- the client raises **req** ("request") and holds it;\n- the server, when ready, raises **ack** ("acknowledge");\n- the client sees ack and lowers req;\n- the server sees that req is lowered and lowers ack.\n\nUntil one has answered, the other waits. So speed does not matter: both know that the step is done.',
  'Сервер как автомат': 'The server as a machine',
  'Сервер удобно описать тремя состояниями.\n\n- `IDLE`: запроса нет, ack = 0.\n- `WORK`: запрос пришёл, но данные ещё не готовы (вход `ready` равен 0). Сервер ждёт. Если клиент передумал и опустил req, сервер возвращается в `IDLE`.\n- `ACK`: данные готовы, ack = 1. Он держится, пока req равен 1, и снимается, когда клиент опустил req.\n\nВыход ack берётся из состояния (Мур): `ack = (state == ACK)`. Заметь, что готовность `ready` нужна только в `WORK`; в `ACK` её уже можно не смотреть.':
    'The server is conveniently described with three states.\n\n- `IDLE`: no request, ack = 0.\n- `WORK`: a request arrived, but the data is not ready yet (the input `ready` is 0). The server waits. If the client changed its mind and lowered req, the server returns to `IDLE`.\n- `ACK`: the data is ready, ack = 1. It is held while req is 1, and released when the client lowers req.\n\nThe output ack is taken from the state (Moore): `ack = (state == ACK)`. Note that readiness `ready` is needed only in `WORK`; in `ACK` you may no longer look at it.',
  'Сервер в состоянии ACK, а клиент всё ещё держит req = 1. Что делает ack?':
    'The server is in the ACK state, and the client still holds req = 1. What does ack do?',
  'Остаётся 1: клиент не сказал, что принял ответ':
    'Stays 1: the client has not said it received the answer',
  'Падает в 0: ответ дан, дольше не нужно': 'Drops to 0: the answer is given, no longer needed',
  'Мигает, пока не придёт ready': 'Blinks until ready arrives',
  'Смысл рукопожатия в том, что ack держится, пока клиент не опустит req. Если бы сервер сам опускал ack, клиент мог бы пропустить ответ.':
    'The point of the handshake is that ack is held until the client lowers req. If the server lowered ack by itself, the client might miss the answer.',
  'Допиши сервер: из IDLE по req = 1 идём в WORK; из WORK по ready = 1 (и пока req = 1) идём в ACK, а при req = 0 возвращаемся в IDLE; из ACK уходим в IDLE, когда req опущен. ack = 1 только в ACK.':
    'Finish the server: from IDLE on req = 1 go to WORK; from WORK on ready = 1 (and while req = 1) go to ACK, and on req = 0 return to IDLE; from ACK go to IDLE when req is lowered. ack = 1 only in ACK.',
  'Запрос есть, данные не готовы: ack = 0': 'There is a request, the data is not ready: ack = 0',
  'Данные готовы: ack = 1': 'The data is ready: ack = 1',
  'ready снова 0, req держится: ack держится': 'ready is 0 again, req is held: ack is held',
  'Клиент опустил req: ack снят': 'The client lowered req: ack released',
  'Новый req при готовых данных: сначала WORK, ack = 0':
    'A new req with ready data: first WORK, ack = 0',
  'Клиент передумал до ответа: ack не появляется':
    'The client changed its mind before the answer: ack does not appear',
  'Запрос и готовность: ack = 1': 'Request and readiness: ack = 1',
  'Готовность пропала, req держится: ack держится':
    'Readiness disappeared, req is held: ack is held',
  'Клиент снова опустил req: ack снят': 'The client lowered req again: ack released',
  'Новый запрос: ack = 0': 'A new request: ack = 0',
  'req и ready держались во время сброса: ack = 0': 'req and ready were held during reset: ack = 0',
  'В WORK сначала проверь, что клиент не ушёл (req = 0, тогда в IDLE), и только потом ready.':
    'In WORK first check that the client has not left (req = 0, then to IDLE), and only then ready.',
  'В ACK единственное условие выхода: req опустился.':
    'In ACK the only exit condition: req went down.',
  'данные | единиц | бит чётности\n0000   |   0    | 0\n0001   |   1    | 1\n0011   |   2    | 0\n0111   |   3    | 1\n1111   |   4    | 0':
    'data   | ones | parity bit\n0000   |  0   | 0\n0001   |  1   | 1\n0011   |  2   | 0\n0111   |  3   | 1\n1111   |  4   | 0',
  'reg [3:0] rom [0:7];\n\n// слово читается по номеру:\nrom[3]      // содержимое ячейки 3':
    'reg [3:0] rom [0:7];\n\n// a word is read by number:\nrom[3]      // the contents of cell 3',
  'Свой модуль и два его экземпляра': 'Your own module and two instances of it',
  'Зачем выносить схему в отдельный модуль': 'Why move a circuit into a separate module',
  'Когда одна и та же схема нужна несколько раз, её описывают один раз как отдельный **модуль**, а потом ставят в нужных местах. Это как деталь из набора: чертёж один, а деталей на столе сколько надо.\n\nКаждое такое место называется **экземпляром** модуля. У экземпляра своё имя, а внутри он устроен точно как чертёж.':
    'When the same circuit is needed several times, it is described once as a separate **module** and then placed where needed. It is like a part from a kit: there is one drawing, and as many parts on the table as you need.\n\nEach such place is called an **instance** of the module. An instance has its own name, and inside it is built exactly like the drawing.',
  'Как поставить экземпляр': 'How to place an instance',
  'Строка подключения состоит из имени модуля, имени экземпляра и списка портов. В списке слева, после точки, имя порта **внутри** модуля, а в скобках сигнал **снаружи**, к которому его присоединяют: `.a(x)` значит «порт `a` модуля подключён к проводу `x`».\n\nМежду двумя экземплярами нужен промежуточный провод: его объявляют словом `wire`. Выход первого экземпляра идёт в этот провод, а из него питается вход второго.':
    'The connection line consists of the module name, the instance name and a list of ports. In the list, on the left, after the dot, is the name of the port **inside** the module, and in the parentheses is the signal **outside** that it is attached to: `.a(x)` means "port `a` of the module is connected to the wire `x`".\n\nBetween two instances an intermediate wire is needed: it is declared with the word `wire`. The output of the first instance goes into this wire, and the input of the second is fed from it.',
  'В строке nand2 u1 (.a(x), .b(z), .y(w)); что означает запись .b(z)?':
    'In the line nand2 u1 (.a(x), .b(z), .y(w)); what does the notation .b(z) mean?',
  'Порт b внутри модуля nand2 подключён к сигналу z снаружи':
    'The port b inside the module nand2 is connected to the signal z outside',
  'Сигнал b снаружи подключён к порту z внутри модуля':
    'The signal b outside is connected to the port z inside the module',
  'Экземпляр nand2 получает имя z': 'The instance of nand2 gets the name z',
  'Слева от скобок стоит имя порта в самом модуле, в скобках сигнал твоей схемы. Имя экземпляра стоит перед списком портов, это u1.':
    'To the left of the parentheses is the name of the port in the module itself, in the parentheses the signal of your circuit. The instance name stands before the port list, it is u1.',
  'Модуль nand2 уже готов. Поставь два его экземпляра в top: первый получает a и b, второй получает результат первого и c. Выход второго идёт в y.':
    'The module nand2 is already ready. Place two instances of it in top: the first gets a and b, the second gets the result of the first and c. The output of the second goes to y.',
  'Объяви провод между экземплярами: wire m; Он соединит выход первого И-НЕ со входом второго.':
    'Declare a wire between the instances: wire m; It will connect the output of the first NAND to the input of the second.',
  'Первый экземпляр: nand2 first (.a(a), .b(b), .y(m)); Во втором на вход a подай провод m, а на b сигнал c.':
    'The first instance: nand2 first (.a(a), .b(b), .y(m)); In the second feed the wire m to the input a, and the signal c to b.',
  'Второй экземпляр: nand2 second (.a(m), .b(c), .y(y));':
    'The second instance: nand2 second (.a(m), .b(c), .y(y));',
  'Параметр ширины шины': 'A bus width parameter',
  'Ширина как настройка': 'Width as a setting',
  'Шина из четырёх проводов записывается `[3:0]`. А если завтра понадобится восемь? Править каждое число по всему файлу неудобно и легко ошибиться.\n\n**Параметр** — именованное число, которое задаётся один раз в заголовке модуля. Дальше везде пишут его имя, и ширина меняется в одном месте.':
    'A bus of four wires is written `[3:0]`. And what if tomorrow eight are needed? Fixing every number throughout the file is inconvenient and easy to get wrong.\n\nA **parameter** is a named number that is set once in the module header. After that its name is written everywhere, and the width changes in one place.',
  'Сумма и бит переноса': 'The sum and the carry bit',
  'Если сложить два W-битных числа, результат может не поместиться в W бит: `15 + 1` на четырёх битах превратится в `0`. Поэтому для суммы берут шину на один бит шире, то есть `[W:0]`. Старший бит этой шины — **перенос**.\n\nVerilog сам считает сложение с учётом ширины результата: если слева шина из W+1 бита, перенос не потеряется.':
    'If you add two W-bit numbers, the result may not fit in W bits: `15 + 1` on four bits turns into `0`. So for the sum a bus one bit wider is taken, that is `[W:0]`. The high bit of this bus is the **carry**.\n\nVerilog itself computes the addition taking the width of the result into account: if on the left there is a bus of W+1 bits, the carry is not lost.',
  'W = 4. Сколько бит нужно шине sum, чтобы сумма двух четырёхбитных чисел никогда не терялась?':
    'W = 4. How many bits does the bus sum need so that the sum of two four-bit numbers is never lost?',
  '4 бита: [3:0]': '4 bits: [3:0]',
  '5 бит: [4:0]': '5 bits: [4:0]',
  '8 бит: [7:0]': '8 bits: [7:0]',
  'Наибольшая сумма 15 + 15 = 30, а 30 в двоичной записи 11110: пять бит. Шина [W:0] как раз содержит W+1 бит.':
    'The largest sum is 15 + 15 = 30, and 30 in binary is 11110: five bits. The bus [W:0] holds exactly W+1 bits.',
  'Сложи два W-битных числа a и b так, чтобы перенос не терялся: sum шире входов на один бит, и ширина берётся из параметра W.':
    'Add two W-bit numbers a and b so that the carry is not lost: sum is one bit wider than the inputs, and the width comes from the parameter W.',
  'Сумма записывается обычным плюсом: a + b.': 'The sum is written with an ordinary plus: a + b.',
  'Ширина sum уже на один бит больше входов, поэтому перенос поместится сам.':
    'The width of sum is already one bit greater than the inputs, so the carry will fit by itself.',
  'Правильная строка: assign sum = a + b;': 'The correct line: assign sum = a + b;',
  'Имена вместо магических чисел': 'Names instead of magic numbers',
  'Что такое магическое число': 'What a magic number is',
  'Пока схема маленькая, `state == 2` понятно автору. Через месяц уже никто не помнит, что такое «двойка»: ожидание, работа или ошибка? Такие числа без объяснения называют **магическими**.\n\nРешение — дать значениям имена. Для этого служит `localparam`: именованная константа, которую нельзя менять снаружи модуля (в отличие от `parameter`, который снаружи переопределяют).':
    'While the circuit is small, `state == 2` is clear to its author. A month later nobody remembers what the "two" is: waiting, working or an error? Such numbers without explanation are called **magic**.\n\nThe solution is to give the values names. For this there is `localparam`: a named constant that cannot be changed from outside the module (unlike `parameter`, which is overridden from outside).',
  'Имена в условиях': 'Names in conditions',
  'Константы пишут заглавными буквами, чтобы их не путали с сигналами. Дальше имя ставят туда, где раньше стояло число: схема не изменилась, но читается как предложение.\n\nЕсли состояний станет больше или номера поменяются, правят одну строку с `localparam`, а условия остаются как есть.':
    'Constants are written in capital letters so they are not confused with signals. Then the name is put where the number used to be: the circuit has not changed, but reads like a sentence.\n\nIf there are more states or the numbers change, you fix one `localparam` line, and the conditions stay as they are.',
  'Чем localparam отличается от parameter?': 'How does localparam differ from parameter?',
  'localparam можно переопределить при подключении модуля, parameter нельзя':
    'localparam can be overridden when connecting the module, parameter cannot',
  'localparam задаёт константу внутри модуля, снаружи её не меняют':
    'localparam sets a constant inside the module, it is not changed from outside',
  'localparam хранит значение между тактами, как регистр':
    'localparam stores a value between clocks, like a register',
  'Оба задают константу на этапе сборки схемы, и ни один не хранит значения между тактами. Но parameter — настройка модуля, которую можно изменить снаружи, а localparam — внутренняя константа.':
    'Both set a constant at circuit build time, and neither stores values between clocks. But parameter is a module setting that can be changed from outside, while localparam is an internal constant.',
  'Вход state — номер состояния устройства: 0 — IDLE, 1 — RUN, 2 — WAIT, 3 — DONE. Объяви недостающие константы и сделай busy равным 1 в состояниях RUN и WAIT, используя имена, а не числа.':
    'The input state is the device state number: 0 is IDLE, 1 is RUN, 2 is WAIT, 3 is DONE. Declare the missing constants and make busy equal to 1 in the states RUN and WAIT, using names and not numbers.',
  "Добавь по образцу: localparam WAIT = 2'd2; и localparam DONE = 2'd3;":
    "Add following the pattern: localparam WAIT = 2'd2; and localparam DONE = 2'd3;",
  'Сравнение с именем пишется так: state == RUN. Два условия соединяются знаком || (ИЛИ).':
    'A comparison with a name is written like this: state == RUN. Two conditions are joined with the || sign (OR).',
  'Правильная строка: assign busy = (state == RUN) || (state == WAIT);':
    'The correct line: assign busy = (state == RUN) || (state == WAIT);',
  'generate for: схема в цикле': 'generate for: a circuit in a loop',
  'Повторяем кусок схемы': 'Repeating a piece of the circuit',
  'Чтобы сделать побитовое И двух четырёхбитных шин, можно написать четыре строки `assign` вручную. А для 32 бит? Блок **generate for** повторяет кусок схемы в цикле — не во времени, а в «пространстве»: в итоге получится столько отдельных элементов, сколько шагов в цикле.\n\nСчётчик цикла объявляют особым словом `genvar`: это переменная, которая существует только при сборке схемы и не превращается в провод.':
    'To make a bitwise AND of two four-bit buses, you can write four `assign` lines by hand. And for 32 bits? The **generate for** block repeats a piece of the circuit in a loop: not in time but in "space": the result has as many separate gates as there are steps in the loop.\n\nThe loop counter is declared with the special word `genvar`: it is a variable that exists only when the circuit is built and does not turn into a wire.',
  'Имя блока и шаг цикла': 'The block name and the loop step',
  'После `begin` ставят двоеточие и **имя блока** (здесь `bits`): оно обязательно, по нему различают копии. Номер бита `i` подставляется в каждую копию, поэтому в первой строке будет `y[0] = a[0] & b[0]`, во второй `y[1] = a[1] & b[1]` и так далее.\n\nЦикл не работает по тактам. Все четыре элемента И существуют одновременно, и каждый считает свой бит.':
    'After `begin` a colon and a **block name** are put (here `bits`): it is required, and the copies are told apart by it. The bit number `i` is substituted into each copy, so the first line will be `y[0] = a[0] & b[0]`, the second `y[1] = a[1] & b[1]` and so on.\n\nThe loop does not work by clocks. All four AND gates exist at the same time, and each computes its own bit.',
  'Сколько элементов И получится из цикла generate for (i = 0; i < 4; ...) с одним assign внутри?':
    'How many AND gates will the generate for (i = 0; i < 4; ...) loop with one assign inside produce?',
  'Один, который по очереди обрабатывает биты': 'One, which processes the bits in turn',
  'Четыре, по одному на каждый бит': 'Four, one for each bit',
  'Ни одного: цикл только проверяет условие': 'None: the loop only checks a condition',
  'generate for не выполняется по времени: он размножает кусок схемы. Четыре шага цикла дают четыре независимых элемента, и все они работают одновременно.':
    'generate for is not executed over time: it multiplies a piece of the circuit. Four loop steps give four independent gates, and they all work at the same time.',
  'Сделай побитовое И двух четырёхбитных шин a и b в цикле generate for: бит i выхода y равен a[i] & b[i].':
    'Make a bitwise AND of two four-bit buses a and b in a generate for loop: bit i of the output y equals a[i] & b[i].',
  'Внутри цикла каждая копия отвечает за один бит: y[i] зависит от a[i] и b[i].':
    'Inside the loop each copy is responsible for one bit: y[i] depends on a[i] and b[i].',
  'Нужен знак побитового И: &. Сейчас строка копирует только a[i].':
    'You need the bitwise AND sign: &. Right now the line copies only a[i].',
  'Правильная строка: assign y[i] = a[i] & b[i];': 'The correct line: assign y[i] = a[i] & b[i];',
  'function: чётность в отдельной функции': 'function: parity in a separate function',
  'Когда данные передают по проводу, иногда к ним добавляют один лишний бит, **бит чётности**. Он выбран так, чтобы общее число единиц вместе с ним было чётным. Если при передаче один бит перевернулся, число единиц станет нечётным, и приёмник заметит ошибку.\n\nБит чётности равен 1, когда в данных **нечётное** число единиц, и 0, когда чётное. Это в точности исключающее ИЛИ (XOR) всех битов подряд.':
    'When data is sent over a wire, one extra bit is sometimes added to it, the **parity bit**. It is chosen so that the total number of ones together with it is even. If one bit flips in transmission, the number of ones becomes odd, and the receiver notices the error.\n\nThe parity bit is 1 when the data has an **odd** number of ones, and 0 when even. This is exactly the exclusive OR (XOR) of all the bits in a row.',
  'Функция и редукция': 'A function and a reduction',
  'Чтобы не повторять вычисление в каждом месте, его оформляют как **функцию**. Функция в Verilog считает значение только из своих входов, без тактов и памяти, поэтому превращается в обычную комбинационную схему. Имя функции внутри неё служит переменной результата.\n\nСвернуть все биты шины одной операцией позволяет знак `^` перед шиной (**редукция XOR**): `^v` — это `v[3] ^ v[2] ^ v[1] ^ v[0]`.':
    'To avoid repeating the computation in every place, it is packaged as a **function**. A function in Verilog computes a value only from its inputs, without clocks and memory, so it turns into an ordinary combinational circuit. The name of the function inside it serves as the result variable.\n\nA single operation can fold all the bits of a bus using the `^` sign in front of the bus (**XOR reduction**): `^v` is `v[3] ^ v[2] ^ v[1] ^ v[0]`.',
  'Данные 0111. Чему равен бит чётности (число единиц вместе с ним должно быть чётным)?':
    'The data is 0111. What is the parity bit (the number of ones together with it must be even)?',
  'Зависит от порядка битов': 'Depends on the order of bits',
  'В 0111 три единицы, это нечётно. Чтобы общее число единиц стало чётным, бит чётности должен быть 1. XOR трёх единиц тоже даёт 1.':
    '0111 has three ones, which is odd. For the total number of ones to become even, the parity bit must be 1. The XOR of three ones is also 1.',
  'Напиши функцию parity4, которая возвращает бит чётности четырёхбитного числа (1, если единиц нечётное число), и используй её для выхода p.':
    'Write a function parity4 that returns the parity bit of a four-bit number (1 if the number of ones is odd), and use it for the output p.',
  'Бит чётности — это XOR всех битов числа.':
    'The parity bit is the XOR of all the bits of the number.',
  'Свернуть шину одним знаком можно так: ^v (знак ^ ставят перед именем шины).':
    'A bus can be folded with one sign like this: ^v (the ^ sign is put before the bus name).',
  'Правильная строка внутри функции: parity4 = ^v;':
    'The correct line inside the function: parity4 = ^v;',
  'case вместо цепочки if': 'case instead of an if chain',
  'Цепочка if / else': 'An if / else chain',
  'Выбор из четырёх входов можно записать цепочкой `if` / `else if`. Она работает, но растёт вниз, и читать её утомительно. К тому же в цепочке порядок важен: проверки идут сверху вниз, и верхние имеют преимущество.\n\nЕсли каждый вариант проверяет одно и то же значение (здесь `sel`), цепочка просится в `case`.':
    'A choice among four inputs can be written with an `if` / `else if` chain. It works, but grows downward, and reading it is tiring. Besides, in a chain the order matters: the checks go from top to bottom, and the upper ones have priority.\n\nIf every variant checks the same value (here `sel`), the chain begs to become a `case`.',
  'Тот же выбор в case': 'The same choice in case',
  '`case` сравнивает одно выражение со списком значений. Каждая строка — один вариант, видно сразу все. Ветка `default` ловит всё остальное: она нужна, чтобы выход всегда получал значение. Иначе Verilog решит, что при непредусмотренном входе выход надо запомнить, и получится лишняя память (защёлка).\n\nВ `always @*` значения присваивают знаком `=`, а переменная слева объявлена как `reg`.':
    '`case` compares one expression with a list of values. Each line is one variant, all visible at once. The `default` branch catches everything else: it is needed so that the output always gets a value. Otherwise Verilog decides that for an unforeseen input the output must be remembered, and an extra memory (a latch) results.\n\nIn `always @*` values are assigned with the `=` sign, and the variable on the left is declared as `reg`.',
  'Для чего в case нужна ветка default?': 'What is the default branch needed for in case?',
  'Чтобы выход получал значение при любом входе и не появлялась лишняя защёлка':
    'So that the output gets a value for any input and no extra latch appears',
  'Чтобы case выполнялся быстрее остальных веток': 'So that case runs faster than other branches',
  'Без неё case не соберётся ни при каких условиях':
    'Without it case will not build under any conditions',
  'Если какое-то значение sel не описано, выход остаётся без присваивания, и инструмент вставляет память. Ветка default закрывает все оставшиеся значения.':
    'If some value of sel is not described, the output is left without an assignment, and the tool inserts memory. The default branch covers all the remaining values.',
  'Перепиши выбор из четырёх входов: выход y равен a при sel = 0, b при sel = 1, c при sel = 2 и d при sel = 3. Вместо цепочки if используй case с веткой default.':
    'Rewrite the choice among four inputs: the output y equals a with sel = 0, b with sel = 1, c with sel = 2 and d with sel = 3. Instead of an if chain use case with a default branch.',
  "Структура: case (sel), потом строки вида 2'd0: y = a; и в конце endcase.":
    "The structure: case (sel), then lines like 2'd0: y = a; and endcase at the end.",
  'Для sel = 3 вариант можно не выписывать: ветка default: y = d; поймает его.':
    'For sel = 3 the variant need not be written out: the branch default: y = d; will catch it.',
  "Ветки: 2'd0: y = a; 2'd1: y = b; 2'd2: y = c; default: y = d;":
    "The branches: 2'd0: y = a; 2'd1: y = b; 2'd2: y = c; default: y = d;",
  'Склейка и повтор: расширение со знаком': 'Concatenation and repetition: sign extension',
  'Склейка и повтор': 'Concatenation and repetition',
  'Фигурные скобки склеивают провода в одну шину: `{a, b}` ставит `a` левее, `b` правее. Порядок важен: первый элемент становится старшими битами.\n\nЕсли надо повторить один и тот же провод несколько раз, пишут число повторов перед вложенными скобками: `{4{x}}` — это `{x, x, x, x}`.':
    'Curly braces join wires into one bus: `{a, b}` puts `a` on the left, `b` on the right. The order matters: the first element becomes the high bits.\n\nIf you need to repeat the same wire several times, write the number of repeats before the nested braces: `{4{x}}` is `{x, x, x, x}`.',
  'Расширение со знаком': 'Sign extension',
  'Число со знаком в дополнительном коде (когда старший бит — знак) нельзя просто дополнить нулями. Четырёхбитное `1010` равно −6, а восьмибитное `00001010` равно +10. Чтобы значение не изменилось, слева надо добавить копии **знакового бита**: `11111010` по-прежнему −6.\n\nВот где повтор пригодится: берём старший бит `x[3]`, повторяем его четыре раза и склеиваем с самим числом.':
    "A signed number in two's complement (where the high bit is the sign) cannot simply be padded with zeros. The four-bit `1010` equals −6, and the eight-bit `00001010` equals +10. For the value not to change, copies of the **sign bit** must be added on the left: `11111010` is still −6.\n\nThis is where repetition is useful: take the high bit `x[3]`, repeat it four times and concatenate it with the number itself.",
  "x = 4'b1010. Чему равно {{4{x[3]}}, x}?": "x = 4'b1010. What is {{4{x[3]}}, x} equal to?",
  'x[3] равно 1, повтор даёт 1111 слева. Склеенный с 1010 результат 11111010: старшие биты — копии знака, а младшие — сам x.':
    'x[3] is 1, repetition gives 1111 on the left. Concatenated with 1010 the result is 11111010: the high bits are copies of the sign, and the low ones are x itself.',
  'Расширь четырёхбитное число со знаком x до восьми бит: выход y сохраняет значение, добавляя слева четыре копии знакового бита x[3].':
    'Extend the four-bit signed number x to eight bits: the output y keeps the value, adding on the left four copies of the sign bit x[3].',
  'Старшие четыре бита должны быть копиями одного бита: x[3].':
    'The high four bits must be copies of one bit: x[3].',
  'Повтор записывается так: {4{x[3]}}. Его надо склеить с x.':
    'Repetition is written like this: {4{x[3]}}. It must be concatenated with x.',
  'Правильная строка: assign y = {{4{x[3]}}, x};': 'The correct line: assign y = {{4{x[3]}}, x};',
  'ПЗУ из массива': 'A ROM from an array',
  'Массив слов': 'An array of words',
  '**ПЗУ** (постоянное запоминающее устройство, по-английски ROM) — таблица ячеек, из которой только читают. По номеру ячейки (**адресу**) оно выдаёт записанное в ней число.\n\nВ Verilog такая таблица описывается массивом: имя, потом размер слова, а размер массива пишут **после** имени. Запись `reg [3:0] rom [0:7]` значит «восемь ячеек (номера 0–7), в каждой по четыре бита».':
    'A **ROM** (read-only memory) is a table of cells that is only read from. By the cell number (the **address**) it outputs the number written in it.\n\nIn Verilog such a table is described by an array: the name, then the word size, and the size of the array is written **after** the name. The notation `reg [3:0] rom [0:7]` means "eight cells (numbers 0–7), each with four bits".',
  'Заполняем и читаем': 'Filling and reading',
  'Значения таблицы задают один раз при сборке схемы, в блоке `initial`: Yosys превращает его в начальное содержимое памяти. Читают по адресу: ячейку выбирают шиной `addr`, как `rom[addr]`.\n\nВ этом уроке таблица хранит квадраты чисел по модулю 16 (остаток от деления на 16), то есть только четыре младших бита квадрата. Ячейки 0–7 содержат 0, 1, 4, 9, 0, 9, 4, 1.':
    "The table's values are set once when the circuit is built, in an `initial` block: Yosys turns it into the initial contents of the memory. Reading is by address: the cell is chosen by the bus `addr`, like `rom[addr]`.\n\nIn this lesson the table stores the squares of numbers modulo 16 (the remainder of division by 16), that is only the four low bits of the square. Cells 0–7 contain 0, 1, 4, 9, 0, 9, 4, 1.",
  'Что описывает запись reg [3:0] mem [0:15];?':
    'What does the notation reg [3:0] mem [0:15]; describe?',
  'Одну шину из 16 бит': 'One bus of 16 bits',
  '16 ячеек памяти по 4 бита каждая': '16 memory cells of 4 bits each',
  '4 ячейки памяти по 16 бит каждая': '4 memory cells of 16 bits each',
  'Первая пара скобок перед именем — ширина слова (4 бита). Вторая пара после имени — диапазон номеров ячеек (0–15, всего 16).':
    'The first pair of brackets before the name is the word width (4 bits). The second pair after the name is the range of cell numbers (0–15, 16 in all).',
  'Допиши таблицу ПЗУ: в ячейках 0–7 лежат 0, 1, 4, 9, 0, 9, 4, 1 (квадраты по модулю 16). Выход data — слово, которое лежит по адресу addr.':
    'Finish the ROM table: cells 0–7 hold 0, 1, 4, 9, 0, 9, 4, 1 (squares modulo 16). The output data is the word at the address addr.',
  'Каждая ячейка — одна строка в блоке initial: rom[номер] = значение;':
    'Each cell is one line in the initial block: rom[number] = value;',
  'Ячейка 2 равна 4, ячейка 3 равна 9. Квадрат 4 по модулю 16 равен 0, квадрат 5 даёт 9, квадрат 6 даёт 4, квадрат 7 даёт 1.':
    'Cell 2 is 4, cell 3 is 9. The square of 4 modulo 16 is 0, the square of 5 gives 9, the square of 6 gives 4, the square of 7 gives 1.',
  "Допиши: rom[2] = 4'd4; rom[3] = 4'd9; rom[4] = 4'd0; rom[5] = 4'd9; rom[6] = 4'd4; rom[7] = 4'd1;":
    "Add: rom[2] = 4'd4; rom[3] = 4'd9; rom[4] = 4'd0; rom[5] = 4'd9; rom[6] = 4'd4; rom[7] = 4'd1;",
  'ОЗУ 8×4: запись по такту': 'An 8×4 RAM: write on the clock',
  'Память, в которую можно писать': 'Memory you can write to',
  '**ОЗУ** (оперативное запоминающее устройство, RAM) — такие же ячейки, как в ПЗУ, но в них можно и записывать. Здесь 8 ячеек по 4 бита: «8×4».\n\nУ памяти есть адрес `addr`, данные для записи `din`, сигнал разрешения записи `we` (от англ. write enable) и выход `dout`. Пока `we = 0`, память только читается. Когда `we = 1`, на фронте такта в ячейку по адресу `addr` записывается `din`.':
    'A **RAM** (random-access memory) has the same cells as a ROM, but they can also be written to. Here there are 8 cells of 4 bits: "8×4".\n\nThe memory has an address `addr`, write data `din`, a write enable signal `we` and an output `dout`. While `we = 0`, the memory is only read. When `we = 1`, on the clock edge `din` is written into the cell at the address `addr`.',
  Чтение: 'Reading',
  'Запись происходит по такту, а чтение здесь сделаем без такта: выход `dout` всегда равен содержимому ячейки с адресом `addr`. Поэтому сразу после фронта, на котором записали, `dout` уже показывает новое значение, если адрес не менялся.\n\nПамять не очищается при включении: пока в ячейку ничего не записали, её содержимое неизвестно. Читай только то, что уже записано.':
    'Writing happens on the clock, and reading here we do without the clock: the output `dout` always equals the contents of the cell at the address `addr`. So right after the edge on which we wrote, `dout` already shows the new value, if the address did not change.\n\nMemory is not cleared at power-on: until something is written into a cell, its contents are unknown. Read only what has already been written.',
  'Что увидит проверка': 'What the check will see',
  'В проверке по тактам меняются входы: сначала записываются несколько ячеек, потом идёт чтение, потом одна ячейка перезаписывается. Отдельно проверяется, что при `we = 0` память не меняется, даже если на `din` приходят другие данные.':
    'In the check the inputs change by clocks: first several cells are written, then reading goes, then one cell is overwritten. It is separately checked that with `we = 0` the memory does not change, even if other data arrives on `din`.',
  'we = 0, на din приходит 1111, на фронте такта адрес указывает на ячейку со значением 1010. Что окажется в ячейке после фронта?':
    'we = 0, 1111 arrives on din, on the clock edge the address points to a cell with the value 1010. What will be in the cell after the edge?',
  'Запись происходит только при we = 1. Если we = 0, присваивания в память нет, и ячейка хранит прежнее значение.':
    'Writing happens only with we = 1. If we = 0, there is no assignment to the memory, and the cell keeps its previous value.',
  'Сделай ОЗУ 8×4: на фронте clk при we = 1 записывай din в ячейку addr, а выход dout всегда показывает ячейку по адресу addr.':
    'Make an 8×4 RAM: on the edge of clk with we = 1 write din into the cell addr, and the output dout always shows the cell at the address addr.',
  'Запись в ячейку 1': 'Write into cell 1',
  'Запись в ячейку 2': 'Write into cell 2',
  'Чтение ячейки 1 без записи': 'Reading cell 1 without writing',
  'Чтение ячейки 2 без записи': 'Reading cell 2 without writing',
  'Перезапись ячейки 1': 'Overwriting cell 1',
  'Ячейка 1 хранит новое значение': 'Cell 1 holds the new value',
  'Ячейка 2 не изменилась': 'Cell 2 did not change',
  'Запись в последнюю ячейку': 'Write into the last cell',
  'Чтение последней ячейки': 'Reading the last cell',
  'Запись — это обычный регистр: always @(posedge clk), а внутри условие на we.':
    'Writing is an ordinary register: always @(posedge clk), and inside a condition on we.',
  'Внутри условия адресуют ячейку: mem[addr] <= din; Знак <= здесь нужен, как во всех записях по такту.':
    'Inside the condition the cell is addressed: mem[addr] <= din; The <= sign is needed here, as in all clocked writes.',
  'Блок: always @(posedge clk) begin if (we) mem[addr] <= din; end':
    'The block: always @(posedge clk) begin if (we) mem[addr] <= din; end',
  'led_n = 0  ->  светодиод горит\nled_n = 1  ->  светодиод погашен':
    'led_n = 0  ->  the LED is lit\nled_n = 1  ->  the LED is off',
  'wire state = a & b;      // 1: пора гореть\nassign led_n = ~state;   // на ножку уходит 0':
    'wire state = a & b;      // 1: time to light\nassign led_n = ~state;   // 0 goes to the pin',
  'assign led_n[0] = ~a;   // первый светодиод\nassign led_n[1] = ~b;   // второй светодиод':
    'assign led_n[0] = ~a;   // the first LED\nassign led_n[1] = ~b;   // the second LED',
  'wire [5:0] count = a + b;   // 0, 1 или 2': 'wire [5:0] count = a + b;   // 0, 1 or 2',
  'count = 000010   (две кнопки)\nled_n = 111101   (горит светодиод 1)':
    'count = 000010   (two buttons)\nled_n = 111101   (LED 1 is lit)',
  'такт     0 1 2 3 4 5 6 7 8 ...\ncount[2] 0 0 0 0 1 1 1 1 0 ...':
    'clock    0 1 2 3 4 5 6 7 8 ...\ncount[2] 0 0 0 0 1 1 1 1 0 ...',
  'op | действие\n00 | a + b\n01 | a - b\n10 | a & b   (И по каждому биту)\n11 | a | b   (ИЛИ по каждому биту)':
    'op | action\n00 | a + b\n01 | a - b\n10 | a & b   (AND on every bit)\n11 | a | b   (OR on every bit)',
  'Светодиод горит нулём': 'An LED that lights on zero',
  'Почему «включить» значит 0': 'Why "on" means 0',
  'На плате светодиод одним выводом подключён к питанию, а другим к ножке ПЛИС. Ток течёт, когда ножка подтягивает свой вывод к нулю. Поэтому светодиод **горит при 0** и гаснет при 1. Уровень, который включает устройство, называют **активным**; здесь активный уровень низкий.\n\nКнопки устроены наоборот: в покое они дают 0, а при нажатии 1.':
    'On the board an LED is connected with one end to power and with the other to a pin of the FPGA. Current flows when the pin pulls its terminal to zero. So the LED **lights at 0** and goes out at 1. The level that turns a device on is called **active**; here the active level is low.\n\nButtons are the other way round: at rest they give 0, and when pressed 1.',
  'Суффикс _n и инверсия': 'The suffix _n and inversion',
  'Выходы с низким активным уровнем принято называть с суффиксом `_n` (от слова negative): `led_n`. Так по имени видно, что 0 означает «включено».\n\nЧтобы не думать наоборот, внутри схемы удобно держать обычный сигнал `state`: 1 значит «светодиод должен гореть». А на выход его отдаёт инверсия: `led_n = ~state`.':
    'Outputs with an active low level are usually named with the suffix `_n` (from negative): `led_n`. This way the name shows that 0 means "on".\n\nTo avoid thinking backwards, inside the circuit it is convenient to keep an ordinary signal `state`: 1 means "the LED must be lit". And the output is given its inversion: `led_n = ~state`.',
  'Внутренний сигнал state = 1 означает «светодиод должен гореть». Какое значение получит led_n = ~state?':
    'The internal signal state = 1 means "the LED must be lit". What value will led_n = ~state get?',
  '1, светодиод погаснет': '1, the LED will go out',
  '0, светодиод загорится': '0, the LED will light',
  'Зависит от кнопки': 'Depends on the button',
  'Инверсия превращает 1 в 0, а на плате именно 0 на ножке зажигает светодиод.':
    'Inversion turns 1 into 0, and on the board exactly 0 on the pin lights the LED.',
  'Светодиод должен гореть, когда нажаты обе кнопки a и b. Внутри посчитай state = a & b, а на выход led_n отдай его инверсию.':
    'The LED must be lit when both buttons a and b are pressed. Compute state = a & b inside, and give its inversion to the output led_n.',
  'Светодиод платы горит при 0, значит на led_n нужно выдать противоположное значение state.':
    "The board's LED lights at 0, so led_n must get the opposite of state.",
  'Переворот значения в Verilog делает знак ~.':
    'Flipping a value in Verilog is done by the ~ sign.',
  'Правильная строка: assign led_n = ~state;': 'The correct line: assign led_n = ~state;',
  'Две кнопки, два светодиода': 'Two buttons, two LEDs',
  'Выход из нескольких проводов': 'An output of several wires',
  'Когда светодиодов несколько, их удобно объединить в один выход-шину: `output wire [1:0] led_n`. Он состоит из двух проводов: `led_n[0]` и `led_n[1]`. Номер в квадратных скобках называют **индексом**, нумерация идёт с нуля.\n\nКаждый провод шины можно присвоить отдельно, как обычный сигнал.':
    'When there are several LEDs, it is convenient to combine them into one bus output: `output wire [1:0] led_n`. It consists of two wires: `led_n[0]` and `led_n[1]`. The number in square brackets is called the **index**, numbering starts from zero.\n\nEach wire of the bus can be assigned separately, like an ordinary signal.',
  'Кнопка к своему светодиоду': 'A button to its own LED',
  'Кнопка a зажигает светодиод 0, кнопка b зажигает светодиод 1, и они не мешают друг другу. Не забудь про активный низкий уровень: нажатая кнопка даёт 1, а светодиод включается нулём, поэтому между ними стоит инверсия.':
    'Button a lights LED 0, button b lights LED 1, and they do not interfere with each other. Do not forget the active low level: a pressed button gives 1, and the LED turns on with zero, so there is an inversion between them.',
  'Нажата только кнопка b. Что будет на led_n[1] и led_n[0]?':
    'Only the button b is pressed. What will be on led_n[1] and led_n[0]?',
  'Оба равны 0': 'Both are 0',
  'Кнопка b управляет светодиодом 1: он получает 0 и горит. Светодиод 0 не тронут, на его проводе остаётся 1.':
    'The button b controls LED 1: it gets 0 and lights. LED 0 is untouched, its wire stays 1.',
  'Кнопка a зажигает светодиод led_n[0], кнопка b зажигает светодиод led_n[1]. Помни, что светодиод горит при 0.':
    'Button a lights the LED led_n[0], button b lights the LED led_n[1]. Remember that an LED lights at 0.',
  'Присвой отдельно каждый провод шины: led_n[0] и led_n[1].':
    'Assign each wire of the bus separately: led_n[0] and led_n[1].',
  'Нажатая кнопка даёт 1, а светодиод включается нулём, так что перед кнопкой нужна инверсия ~.':
    'A pressed button gives 1, and the LED turns on with zero, so an inversion ~ is needed in front of the button.',
  'Сколько кнопок нажато': 'How many buttons are pressed',
  'Сумма как число': 'A sum as a number',
  'Знак `+` складывает не только числа, но и значения проводов. Если сложить две кнопки a и b, получится число нажатых кнопок: 0, 1 или 2. Для результата нужен провод пошире, потому что 1 + 1 = 2 в одном бите не помещается.\n\nОбъяви шину нужной ширины и присвой сумму ей: Verilog сам расширит a и b до этой ширины.':
    'The `+` sign adds not only numbers but also the values of wires. If you add two buttons a and b, you get the number of pressed buttons: 0, 1 or 2. The result needs a wider wire, because 1 + 1 = 2 does not fit in one bit.\n\nDeclare a bus of the needed width and assign the sum to it: Verilog itself extends a and b to this width.',
  'Показываем число светодиодами': 'Showing the number with LEDs',
  'Шесть светодиодов `led_n[5:0]` можно считать двоичным числом: горящий светодиод это единица. Число 2 это `000010`, и в нём должен гореть светодиод 1.\n\nПлата зажигает светодиод нулём, поэтому на выход идёт инверсия числа: `~count`. Для числа 2 получится `111101`.':
    'Six LEDs `led_n[5:0]` can be treated as a binary number: a lit LED is a one. The number 2 is `000010`, and in it LED 1 must be lit.\n\nThe board lights an LED with zero, so the inversion of the number goes to the output: `~count`. For the number 2 we get `111101`.',
  'Нажата одна кнопка, число count = 000001. Что окажется на led_n[5:0]?':
    'One button is pressed, the number count = 000001. What will be on led_n[5:0]?',
  'Инверсия переворачивает каждый бит: 000001 превращается в 111110, и горит только светодиод 0.':
    'Inversion flips each bit: 000001 turns into 111110, and only LED 0 is lit.',
  'Посчитай, сколько из кнопок a и b нажато, как шестибитное число и покажи его на led_n[5:0] (светодиод горит при 0).':
    'Count how many of the buttons a and b are pressed, as a six-bit number, and show it on led_n[5:0] (an LED lights at 0).',
  'Число нажатых кнопок это просто сумма двух проводов.':
    'The number of pressed buttons is simply the sum of two wires.',
  'Присвой сумму шине count шириной 6 бит: тогда результат не обрежется.':
    'Assign the sum to the bus count 6 bits wide: then the result will not be cut off.',
  'Бегущий огонёк': 'A running light',
  'Один горящий светодиод': 'One lit LED',
  'Бегущий огонёк это один зажжённый светодиод из четырёх, который каждый такт переходит на соседний. Положение огонька удобно хранить в регистре `pos` из четырёх бит, где единица стоит там, где должен гореть светодиод: `0001`, `0010`, `0100`, `1000`.\n\nНа выход идёт `~pos`, ведь светодиод включается нулём.':
    'A running light is one lit LED out of four that moves to its neighbor each clock. The position of the light is conveniently stored in a register `pos` of four bits, where the one stands where the LED must be lit: `0001`, `0010`, `0100`, `1000`.\n\nThe output gets `~pos`, because an LED turns on with zero.',
  'Чтобы огонёк перешёл на следующий светодиод, сдвинем единицу влево: отбросим старший бит, остальные подвинем, а старший бит поставим на место младшего. Так огонёк после последнего светодиода возвращается к первому.\n\nСброс `reset` возвращает огонёк в начало: `pos = 0001`.':
    'For the light to move to the next LED, we shift the one left: we drop the high bit, move the others, and put the high bit in place of the low one. This way after the last LED the light returns to the first.\n\nThe reset `reset` returns the light to the start: `pos = 0001`.',
  'Сейчас pos = 1000. Каким станет pos после очередного такта при сдвиге по кругу?':
    'Right now pos = 1000. What will pos become after the next clock with a circular shift?',
  'Старший бит не пропадает, а переходит на место младшего: {pos[2:0], pos[3]} даёт 0001.':
    'The high bit does not disappear but goes to the place of the low one: {pos[2:0], pos[3]} gives 0001.',
  'Сделай бегущий огонёк: после сброса горит светодиод 0 (led_n = 1110), а каждый такт огонёк переходит на следующий светодиод и после третьего возвращается к нулевому.':
    'Make a running light: after reset LED 0 is lit (led_n = 1110), and each clock the light moves to the next LED and after the third returns to the zeroth.',
  'Третий шаг': 'The third step',
  'Возврат к началу': 'Return to the start',
  'Сейчас регистр pos сам себя перезаписывает и не меняется. Его нужно сдвигать.':
    'Right now the register pos overwrites itself and does not change. It must be shifted.',
  'Сдвиг по кругу: отбрось старший бит и поставь его в конец через фигурные скобки.':
    'A circular shift: drop the high bit and put it at the end with curly braces.',
  'Мигание: делим частоту на 8': 'Blinking: dividing the frequency by 8',
  'Бит счётчика как медленный такт': 'A counter bit as a slow clock',
  'Глазом нельзя заметить смену сигнала на частоте мегагерц, поэтому светодиод мигает не от самого такта, а от медленного сигнала. Его берут из двоичного счётчика: младший бит `count[0]` меняется каждый такт, `count[1]` вдвое реже, `count[2]` ещё вдвое реже.\n\nВ итоге бит `count[2]` держит 0 четыре такта, потом 1 четыре такта: полный период 8 тактов. Это деление частоты на 8.':
    'The eye cannot notice a signal change at a frequency of megahertz, so an LED blinks not from the clock itself but from a slow signal. It is taken from a binary counter: the low bit `count[0]` changes every clock, `count[1]` half as often, `count[2]` half as often again.\n\nAs a result the bit `count[2]` holds 0 for four clocks, then 1 for four clocks: a full period of 8 clocks. This is a frequency division by 8.',
  'Счётчик и инверсия': 'A counter and inversion',
  'Счётчик из трёх бит считает по кругу 0, 1, …, 7 и снова с 0. Сброс обнуляет его, иначе прибавляем 1.\n\nСветодиод горит при 0, поэтому на выход идёт инверсия: `led_n = ~count[2]`. Тогда он горит, пока бит равен 1, и мигает с периодом 8 тактов.':
    'A three-bit counter counts in a circle 0, 1, …, 7 and again from 0. Reset clears it, otherwise we add 1.\n\nThe LED lights at 0, so an inversion goes to the output: `led_n = ~count[2]`. Then it is lit while the bit is 1, and blinks with a period of 8 clocks.',
  'Какой бит трёхбитного счётчика меняется реже всего?':
    'Which bit of a three-bit counter changes least often?',
  'Старший бит меняется после каждых четырёх тактов, средний после двух, младший каждый такт. Чем старше бит, тем медленнее он мигает.':
    'The high bit changes after every four clocks, the middle after two, the low every clock. The higher the bit, the slower it blinks.',
  'Допиши счётчик count: сброс обнуляет, иначе прибавляется 1. Выход led_n должен быть инверсией старшего бита счётчика, так светодиод мигает с периодом 8 тактов.':
    'Finish the counter count: reset clears, otherwise 1 is added. The output led_n must be the inversion of the high bit of the counter, so the LED blinks with a period of 8 clocks.',
  'После сброса': 'After reset',
  'Светодиод загорелся': 'The LED lit up',
  'Седьмой такт': 'The seventh clock',
  'Светодиод погас': 'The LED went out',
  'Одиннадцатый такт': 'The eleventh clock',
  'Снова горит': 'Lit again',
  'Сначала заставь счётчик считать: вместо count <= count нужно прибавить единицу.':
    'First make the counter count: instead of count <= count you need to add one.',
  'Из трёх бит счётчика самый медленный старший, count[2].':
    'Of the three counter bits the slowest is the high one, count[2].',
  "count <= count + 3'd1; и assign led_n = ~count[2];":
    "count <= count + 3'd1; and assign led_n = ~count[2];",
  'Секундомер по кнопке': 'A button stopwatch',
  'Что строим': 'What we are building',
  'Сделаем секундомер: первое нажатие кнопки запускает счёт тактов, второе останавливает, и число на выходе остаётся. Так измеряют время реакции: засёк, остановил, прочитал.\n\nНам понадобятся счётчик `count`, флаг `running` («счёт идёт») и способ заметить именно момент нажатия, а не то, что кнопка удерживается.':
    'Let us make a stopwatch: the first press of the button starts counting clocks, the second stops it, and the number on the output stays. This is how reaction time is measured: started, stopped, read.\n\nWe will need a counter `count`, a flag `running` ("counting is on") and a way to notice exactly the moment of the press, not that the button is held.',
  'Момент нажатия': 'The moment of the press',
  'Кнопку держат несколько тактов подряд, а переключить `running` надо один раз. Поэтому запоминаем прошлое значение кнопки в регистре `prev`. **Нажатие** это когда сейчас кнопка 1, а на прошлом такте была 0: `button & ~prev`.\n\nВ момент нажатия переключаем `running`, а пока `running` равен 1, счётчик растёт.':
    'The button is held for several clocks in a row, and `running` must be toggled once. So we remember the previous value of the button in a register `prev`. A **press** is when the button is 1 now, and was 0 on the previous clock: `button & ~prev`.\n\nAt the moment of the press we toggle `running`, and while `running` is 1, the counter grows.',
  'Сброс и порядок': 'Reset and order',
  'Сброс обнуляет всё: счётчик, флаг и `prev`. Обрати внимание на порядок: в такт нажатия флаг `running` меняется только после фронта, поэтому в такт самого нажатия счётчик ещё видит старое значение флага. Так при остановке последний такт считается, а при запуске нет.':
    'Reset clears everything: the counter, the flag and `prev`. Note the order: in the clock of the press the flag `running` changes only after the edge, so in the clock of the press itself the counter still sees the old value of the flag. So on stopping the last clock is counted, and on starting it is not.',
  'Зачем нужен регистр prev, если можно просто переключать running при button = 1?':
    'Why is the register prev needed if you can simply toggle running when button = 1?',
  'Чтобы кнопка работала быстрее': 'So that the button works faster',
  'Чтобы одно долгое нажатие переключило running один раз, а не на каждом такте':
    'So that one long press toggles running once, not on every clock',
  'Чтобы счётчик не переполнялся': 'So that the counter does not overflow',
  'Нажатие длится много тактов. Без prev флаг переключался бы на каждом из них. Сравнение с прошлым значением выделяет один момент: кнопка стала 1.':
    'A press lasts many clocks. Without prev the flag would toggle on each of them. Comparison with the previous value picks out one moment: the button became 1.',
  'Допиши секундомер: нажатие кнопки (переход 0 -> 1) переключает running; пока running = 1, count растёт на 1 каждый такт; сброс всё обнуляет.':
    'Finish the stopwatch: a button press (a transition 0 -> 1) toggles running; while running = 1, count grows by 1 every clock; reset clears everything.',
  'До нажатия': 'Before the press',
  'Нажали: счёт только начинается': 'Pressed: counting is just starting',
  'Кнопка удержана, считаем один раз': 'The button is held, we count once',
  'Второе нажатие остановило': 'The second press stopped it',
  'Число застыло': 'The number froze',
  'Нужны две вещи внутри else: переключение running и прибавление к count.':
    'Two things are needed inside else: toggling running and adding to count.',
  'Переключать running нужно только когда press равен 1, а прибавлять, когда running равен 1.':
    'running must be toggled only when press is 1, and added to when running is 1.',
  'Сигнализация с памятью': 'An alarm with memory',
  'Сигнал, который помнит': 'A signal that remembers',
  'Датчик движения даёт 1 на мгновение, а тревога должна гореть, пока её не выключат. Значит, схеме нужна память: регистр `alarm`. Датчик **ставит** его в 1, и дальше он остаётся единицей, даже если датчик уже успокоился. Такую схему называют **защёлкой**: она «защёлкивает» событие.\n\nСнимает тревогу отдельный вход `clear`.':
    'A motion sensor gives 1 for a moment, and the alarm must be lit until it is switched off. So the circuit needs memory: the register `alarm`. The sensor **sets** it to 1, and then it stays one even if the sensor has already calmed down. Such a circuit is called a **latch**: it "latches" the event.\n\nThe alarm is cleared by a separate input `clear`.',
  'Что важнее': 'What is more important',
  'Если датчик и сброс пришли одновременно, надо выбрать, кто главнее. Для сигнализации главнее сброс: охранник нажал кнопку, и тревога снята. В коде это значит, что условие `clear` проверяется первым.\n\nВыход `led_n` инвертирован, как положено для платы: тревога горит светодиодом.':
    'If the sensor and the reset arrive at the same time, you must choose which is more important. For an alarm reset is more important: the guard pressed the button, and the alarm is cleared. In the code this means that the `clear` condition is checked first.\n\nThe output `led_n` is inverted, as is proper for the board: the alarm is shown by a lit LED.',
  'Датчик сработал один такт и снова стал 0. Что будет с alarm, если clear = 0?':
    'The sensor fired for one clock and became 0 again. What will happen to alarm if clear = 0?',
  'alarm сразу станет 0': 'alarm will become 0 at once',
  'alarm останется 1, пока не придёт clear': 'alarm will stay 1 until clear arrives',
  'alarm начнёт мигать': 'alarm will start blinking',
  'Регистр хранит значение до следующего присваивания. Присваивать ноль в нём может только clear, поэтому тревога сохраняется.':
    'A register keeps its value until the next assignment. Only clear can assign zero to it, so the alarm is preserved.',
  'Сделай защёлку: датчик sensor = 1 ставит alarm в 1 и он остаётся, пока не придёт clear = 1; clear главнее датчика. На выходе led_n = ~alarm.':
    'Make a latch: the sensor sensor = 1 sets alarm to 1 and it stays until clear = 1 arrives; clear is more important than the sensor. On the output led_n = ~alarm.',
  'Датчик затих, тревога помнится': 'The sensor went quiet, the alarm is remembered',
  'Сброс главнее датчика': 'Reset is more important than the sensor',
  'Тревоги нет': 'No alarm',
  'Новая тревога': 'A new alarm',
  'Снова помнится': 'Remembered again',
  'Сейчас alarm просто повторяет датчик и забывает тревогу на следующем такте.':
    'Right now alarm simply repeats the sensor and forgets the alarm on the next clock.',
  'Присваивай alarm только когда sensor равен 1, иначе оставляй значение прежним.':
    'Assign alarm only when sensor is 1, otherwise leave the value as it was.',
  'Мини-АЛУ на четыре бита': 'A mini ALU for four bits',
  'Устройство с выбором действия': 'A device with a choice of action',
  '**АЛУ** (арифметико-логическое устройство) это часть процессора, которая умеет несколько действий над числами и выполняет то, которое выбрал код операции. Наше мини-АЛУ получает два четырёхбитных числа `a` и `b`, двухбитный код `op` и выдаёт результат `y`.':
    'An **ALU** (arithmetic logic unit) is the part of a processor that can do several operations on numbers and performs the one chosen by the operation code. Our mini ALU receives two four-bit numbers `a` and `b`, a two-bit code `op` and outputs the result `y`.',
  'case выбирает действие': 'case chooses the action',
  'Выбор по коду записывают оператором `case`. Результат присваивают внутри блока `always @*`, поэтому `y` объявляют как `reg`: это не память, а просто тип для присваивания в блоке. Чтобы не получилась защёлка, ветка `default` обязательна.\n\nУчти, что числа четырёхбитные: `3 - 5` не уходит в минус, а оборачивается по кругу в `1110`.':
    'The choice by code is written with the `case` operator. The result is assigned inside an `always @*` block, so `y` is declared as `reg`: this is not memory, just a type for assignment in a block. To avoid a latch, the `default` branch is required.\n\nNote that the numbers are four-bit: `3 - 5` does not go negative but wraps around to `1110`.',
  'a = 0011 (3), b = 0101 (5), op = 01 (вычитание). Какой будет результат из четырёх бит?':
    'a = 0011 (3), b = 0101 (5), op = 01 (subtraction). What will the four-bit result be?',
  '3 - 5 = -2, а в четырёх битах это 16 - 2 = 14, то есть 1110. Старшие разряды просто отбрасываются.':
    '3 - 5 = -2, and in four bits that is 16 - 2 = 14, that is 1110. The high places are simply discarded.',
  'Допиши АЛУ: при op = 00 результат a + b, при 01 a - b, при 10 побитовое И, при 11 побитовое ИЛИ.':
    'Finish the ALU: with op = 00 the result is a + b, with 01 a - b, with 10 bitwise AND, with 11 bitwise OR.',
  Сложение: 'Addition',
  'Сложение с переполнением': 'Addition with overflow',
  'Вычитание ниже нуля': 'Subtraction below zero',
  И: 'AND',
  ИЛИ: 'OR',
  'Нужен оператор case по op с четырьмя вариантами.':
    'You need a case statement on op with four variants.',
  'Для вычитания используй -, для И знак &, для ИЛИ знак |.':
    'For subtraction use -, for AND the & sign, for OR the | sign.',
  'Охрана: два датчика из трёх': 'Security: two sensors out of three',
  'Защита от ложных тревог': 'Protection against false alarms',
  'Один датчик может сработать случайно: муха, сквозняк. Чтобы тревога была надёжнее, ставят три датчика и поднимают её, только когда **сработали хотя бы два**. Такую функцию называют **мажоритарной** (решает большинство).\n\nКроме того, у сигнализации есть переключатель `armed`: если охрана выключена, тревоги нет вообще.':
    'One sensor can fire by accident: a fly, a draft. To make the alarm more reliable, three sensors are installed and the alarm is raised only when **at least two have fired**. Such a function is called a **majority** function (the majority decides).\n\nIn addition, the alarm has a switch `armed`: if the guard is off, there is no alarm at all.',
  'Записываем условие': 'Writing the condition',
  'Два датчика из трёх: сработали s1 и s2, или s1 и s3, или s2 и s3. Каждое «и» это `&`, а «или» между вариантами это `|`. Всё вместе связываем через `&` с `armed`.\n\nСкобки ставим явно, чтобы порядок действий был виден сразу.':
    'Two sensors out of three: s1 and s2 fired, or s1 and s3, or s2 and s3. Each "and" is `&`, and the "or" between the variants is `|`. All together is tied with `&` to `armed`.\n\nWe put the parentheses explicitly so that the order of operations is visible at once.',
  'Охрана включена, сработал только датчик s2. Будет ли тревога?':
    'The guard is on, only the sensor s2 fired. Will there be an alarm?',
  'Да, любой датчик поднимает тревогу': 'Yes, any sensor raises the alarm',
  'Нет, нужно хотя бы два срабатывания': 'No, at least two firings are needed',
  'Зависит от датчика s1': 'Depends on the sensor s1',
  'Условие требует двух из трёх датчиков. Одно срабатывание считается случайным и тревогу не поднимает.':
    'The condition requires two out of three sensors. One firing is considered accidental and does not raise the alarm.',
  'Выход alarm равен 1, когда охрана включена (armed = 1) и сработали хотя бы два датчика из s1, s2, s3.':
    'The output alarm equals 1 when the guard is on (armed = 1) and at least two of the sensors s1, s2, s3 have fired.',
  'Сначала запиши, когда сработали два датчика из трёх: три пары.':
    'First write when two sensors out of three have fired: three pairs.',
  'Пары соединяются знаком |, а внутри пары стоит &.':
    'The pairs are joined with the | sign, and inside a pair there is &.',
  'Провод: вход прямо в выход': 'Wire: input straight to output',
  'Схема — это рисунок устройства: блоки и провода между ними. Слева стоит **вход** `a`, справа **выход** `y`. Сигнал идёт слева направо.\n\nЧтобы соединить, потяните провод от контакта входа к контакту выхода. Когда схема готова, нажмите «Проверить»: Logra превратит рисунок в Verilog и прогонит его в симуляторе.':
    'A schematic is a drawing of a device: blocks and the wires between them. On the left is the **input** `a`, on the right the **output** `y`. The signal goes from left to right.\n\nTo connect them, drag a wire from the input pin to the output pin. When the schematic is ready, press "Check": Logra turns the drawing into Verilog and runs it in the simulator.',
  'Соедини вход a с выходом y, чтобы y всегда повторял a.':
    'Connect the input a to the output y so that y always repeats a.',
  'Инвертор: НЕ': 'Inverter: NOT',
  'Блок **НЕ (NOT)** меняет 0 на 1 и 1 на 0. Найдите его в палитре элементов, поставьте между входом и выходом и соедините всё проводами.':
    'The **NOT** block turns 0 into 1 and 1 into 0. Find it in the palette of elements, place it between the input and the output and connect everything with wires.',
  'Собери схему, в которой y — это «не a».': 'Build a circuit in which y is "not a".',
  'Элемент И': 'The AND gate',
  'Блок **И (AND)** даёт 1 только тогда, когда оба входа равны 1. Это «и то, и другое сразу».':
    'The **AND** block gives 1 only when both inputs are 1. It means "this and that at the same time".',
  'Собери y = a И b.': 'Build y = a AND b.',
  'Элемент ИЛИ': 'The OR gate',
  'Блок **ИЛИ (OR)** даёт 1, когда хотя бы один вход равен 1.':
    'The **OR** block gives 1 when at least one input is 1.',
  'Собери y = a ИЛИ b.': 'Build y = a OR b.',
  'Исключающее ИЛИ': 'Exclusive OR',
  'Блок **XOR** даёт 1, когда входы **разные**. Если оба 0 или оба 1, выход 0.':
    'The **XOR** block gives 1 when the inputs are **different**. If both are 0 or both are 1, the output is 0.',
  'Собери y = a XOR b.': 'Build y = a XOR b.',
  'Две ступени: (a И b) ИЛИ c': 'Two stages: (a AND b) OR c',
  'Схемы можно строить по ступеням: выход одного блока идёт на вход другого. Сначала **И** для a и b, потом **ИЛИ** с сигналом c.':
    'Circuits can be built in stages: the output of one block goes to the input of another. First **AND** for a and b, then **OR** with the signal c.',
  'Собери y = (a И b) ИЛИ c.': 'Build y = (a AND b) OR c.',
  'Светодиод на столе': 'An LED on the bench',
  'Схема живёт в плате, но свет и кнопки — это детали вокруг неё. Светодиод светится, когда через него идёт ток в одну сторону. У него два вывода: плюс (A) и минус (K).\n\nНа столе плата уже стоит на макетке. Поставьте светодиод и соедините его выводы с контактами платы.':
    'The circuit lives in the board, but lights and buttons are parts around it. An LED lights when current flows through it in one direction. It has two pins: plus (A) and minus (K).\n\nOn the bench the board already stands on a breadboard. Place an LED and connect its pins to the pins of the board.',
  'Поставь светодиод на стол и соедини его выводы с контактами платы.':
    "Place an LED on the bench and connect its pins to the board's pins.",
  'Светодиод стоит на столе': 'The LED is on the bench',
  'Хотя бы один его вывод соединён с платой': 'At least one of its pins is connected to the board',
  'Оба вывода соединены с платой': 'Both pins are connected to the board',
  'Кнопка на столе': 'A button on the bench',
  'Кнопка замыкает цепь, пока её держат. Плата видит это как смену уровня на входе: 1 или 0.':
    'A button closes the circuit while it is held. The board sees this as a change of level on the input: 1 or 0.',
  'Поставь кнопку на стол и подключи её к плате.':
    'Place a button on the bench and connect it to the board.',
  'Кнопка стоит на столе': 'The button is on the bench',
  'Что нужно светодиоду, чтобы он засветился?': 'What does an LED need in order to light up?',
  'Ток в нужном направлении: от плюса к минусу':
    'Current in the right direction: from plus to minus',
  'Только чтобы он стоял на столе': 'Only to stand on the bench',
  'Два одинаковых вывода': 'Two identical pins',
  'Светодиод пропускает ток только в одну сторону, и светится, когда он идёт.':
    'An LED passes current in one direction only, and it lights when current flows.',
  Провод: 'Wire',
  Инвертор: 'Inverter',
  'И, ИЛИ, XOR': 'AND, OR, XOR',
  'Схема из двух ступеней': 'A circuit of two stages',
  'Схемы и плата': 'Circuits and the board',
  'Тянешь блоки, соединяешь провода и смотришь, как рисунок становится устройством.':
    'You drag blocks, connect wires and watch the drawing turn into a device.',
  'Verilog и плата': 'Verilog and the board',
  'От бита и логического элемента до автоматов и счётчиков: пишешь модуль и проверяешь его.':
    'From a bit and a logic gate to state machines and counters: you write a module and check it.',
  'А. Первые шаги без кода': 'A. First steps without code',
  'Что такое плата, бит и логический элемент. Писать код пока не нужно.':
    'What a board, a bit and a logic gate are. No code needed yet.',
  'Б. Verilog с нуля': 'B. Verilog from scratch',
  'Язык описания схем маленькими шагами: у каждого шага одна идея и мини-задание.':
    'A language for describing circuits in small steps: each step has one idea and a mini task.',
  'Выбери ответ. Если ошибёшься, разберём именно твой вариант, и можно попробовать снова.':
    'Pick an answer. If you get it wrong, we will go through your exact choice and you can try again.',
  'Выполнить задание': 'Do the task',
  'Проверка запускает настоящий симулятор и сравнивает выходы с ожидаемыми.':
    'The check runs a real simulator and compares the outputs with the expected ones.',
  'Первый провод': 'The first wire',
  'Соедини вход с выходом.': 'Connect an input to an output.',
  'assign · провод': 'assign · wire',
  'Сделай так, чтобы выход y всегда повторял вход a.':
    'Make the output y always repeat the input a.',
  'Справа от знака = должно стоять имя входа.':
    'To the right of the = sign there must be the name of the input.',
  'Число из четырёх бит': 'A four-bit number',
  'Запиши число 10 в двоичном виде.': 'Write the number 10 in binary.',
  "4'b1010 · запись чисел": "4'b1010 · number notation",
  "Пусть выход y равен двоичному числу 1010. Запиши его как 4'b1010.":
    "Let the output y equal the binary number 1010. Write it as 4'b1010.",
  "4'b значит «4 бита, двоичное число». После b идут сами цифры: 1010.":
    '4\'b means "4 bits, binary number". After the b come the digits themselves: 1010.',
  'Не «И»': 'Not AND',
  'Лампа гаснет, только когда нажаты обе кнопки.':
    'The lamp goes out only when both buttons are pressed.',
  '~ · & · скобки': '~ · & · parentheses',
  'Выход y должен быть 0 только тогда, когда a = 1 и b = 1. Во всех остальных случаях 1.':
    'The output y must be 0 only when a = 1 and b = 1. In all other cases it is 1.',
  'Сначала сделай «И» (a & b), потом переверни результат знаком ~. Скобки: ~(a & b).':
    'First make an "AND" (a & b), then flip the result with the ~ sign. Parentheses: ~(a & b).',
  'Верхняя половина шины': 'The upper half of a bus',
  'Возьми два старших бита из четырёх.': 'Take the two most significant bits out of four.',
  'data[3:2] · выбор битов': 'data[3:2] · bit selection',
  'Пусть y равен двум старшим битам data: тем, что стоят слева.':
    'Let y equal the two most significant bits of data: the ones on the left.',
  'Биты нумеруются справа налево: 0, 1, 2, 3. Нужны номера 3 и 2: data[3:2].':
    'Bits are numbered from right to left: 0, 1, 2, 3. You need numbers 3 and 2: data[3:2].',
  'Склей биты': 'Concatenate bits',
  'Из одного бита и пары получи три провода.': 'From one bit and a pair, get three wires.',
  '{a, b} · склейка': '{a, b} · concatenation',
  'Выход y — три бита: сначала a (слева), затем два бита b.':
    'The output y is three bits: first a (on the left), then the two bits of b.',
  'В фигурных скобках через запятую перечисли части слева направо: {a, b}.':
    'In curly braces, list the parts from left to right, separated by commas: {a, b}.',
  'Выбор по условию': 'Choice by condition',
  'Оператор «условие ? да : нет».': 'The "condition ? yes : no" operator.',
  '?  : · условный оператор': '?  : · conditional operator',
  "Если button = 1, выход y равен 4'd9, иначе 4'd3.":
    "If button = 1, the output y equals 4'd9, otherwise 4'd3.",
  "Запись: условие ? значение_если_да : значение_если_нет. Например, button ? 4'd9 : 4'd3.":
    "Syntax: condition ? value_if_yes : value_if_no. For example, button ? 4'd9 : 4'd3.",
  'Такт 0: d = 1': 'Clock 0: d = 1',
  'Такт 1: d = 0': 'Clock 1: d = 0',
  'Такт 2: d всё ещё 0': 'Clock 2: d is still 0',
  'Такт 3: d = 1': 'Clock 3: d = 1',
  'Такт 4: d = 0': 'Clock 4: d = 0',
  'Первая ячейка памяти': 'The first memory cell',
  'Триггер запоминает вход на каждом такте.': 'A flip-flop remembers its input on every clock.',
  'На каждом положительном фронте clk записывай в q то, что сейчас на входе d.':
    'On every positive edge of clk, write into q whatever is on the input d right now.',
  'Внутри always напиши q <= d; (стрелка <= читается как «запомни»).':
    'Inside always write q <= d; (the arrow <= reads as "remember").',
  'Такт 1: единица дошла до b': 'Clock 1: the one has reached b',
  'Такт 2: b снова 0': 'Clock 2: b is 0 again',
  'Такт 3: b остаётся 0': 'Clock 3: b stays 0',
  'Две ячейки друг за другом': 'Two cells in a row',
  'Знак <= берёт старые значения.': 'The <= sign takes the old values.',
  '<= · порядок на фронте': '<= · order on an edge',
  'Сделай цепочку: a запоминает d, а b запоминает то, что было в a. Значение должно доходить до b с задержкой на один такт.':
    'Build a chain: a remembers d, and b remembers what was in a. The value must reach b with a delay of one clock.',
  'Вторая строка должна быть b <= a;. На одном фронте a и b обновляются одновременно, поэтому b видит старое a.':
    'The second line must be b <= a;. On one edge a and b update at the same time, so b sees the old a.',
  'Выбор из списка': 'Choosing from a list',
  'case раскладывает число по вариантам.': 'case spreads a number out into options.',
  "Для code = 2 выход y должен быть 3'b100. Остальные варианты уже готовы.":
    "For code = 2 the output y must be 3'b100. The other options are already done.",
  "Добавь строку по образцу: 2'd2: y = 3'b100;":
    "Add a line following the pattern: 2'd2: y = 3'b100;",
  'Настройка в одном месте': 'Setting in one place',
  'Поменяй параметр, и изменится весь модуль.':
    'Change the parameter and the whole module changes.',
  "Измени параметр VALUE так, чтобы выход y был равен 4'd5.":
    "Change the parameter VALUE so that the output y equals 4'd5.",
  "Найди строку parameter и поменяй число после знака =: было 4'd0, нужно 4'd5.":
    "Find the parameter line and change the number after the = sign: it was 4'd0, it must be 4'd5.",
  'Модуль внутри модуля': 'A module inside a module',
  'Поставь готовый инвертор в свою схему.': 'Put a ready-made inverter into your circuit.',
  'inst · .порт(сигнал)': 'inst · .port(signal)',
  'Пропусти сигнал a через готовый модуль inv: выход y должен быть противоположным a.':
    'Pass the signal a through the ready-made module inv: the output y must be the opposite of a.',
  'Строка подключения: inv u1(.a(a), .y(y)); слева порт модуля inv, в скобках твой сигнал.':
    'The connection line: inv u1(.a(a), .y(y)); on the left is the port of the inv module, in parentheses is your signal.',
  'Что у нас в руках': 'What we have in hand',
  'ПЛИС и плата Tang Nano 20K простыми словами.':
    'The FPGA and the Tang Nano 20K board in simple words.',
  'Привет!': 'Hello!',
  'Здесь ты научишься собирать цифровые устройства: мигать лампочками, считать и реагировать на кнопки. Код писать пока не нужно. Сначала познакомимся с платой и с несколькими простыми идеями.':
    'Here you will learn to build digital devices: blink lights, count and react to buttons. You do not need to write code yet. First we will get to know the board and a few simple ideas.',
  'Микросхема-конструктор': 'A construction-kit chip',
  'Сердце нашей платы называется ПЛИС (по-английски FPGA). Внутри неё много одинаковых «кубиков». Ты сам решаешь, как их соединить, и микросхема становится нужным устройством. Как конструктор: из одних и тех же деталей можно собрать и машину, и дом.':
    'The heart of our board is called an FPGA. Inside it there are many identical "bricks". You decide how to connect them, and the chip becomes the device you need. It is like a construction kit: from the same parts you can build a car or a house.',
  'Плата Tang Nano 20K': 'The Tang Nano 20K board',
  'Плата размером с половину ладони. На ней шесть светодиодов, две кнопки S1 и S2, разъём USB и «часы»: они тикают 27 миллионов раз в секунду. Всё это уже припаяно к ножкам микросхемы, поэтому лампочками и кнопками можно управлять из твоей схемы.':
    'The board is the size of half a palm. It has six LEDs, two buttons S1 and S2, a USB connector and a "clock" that ticks 27 million times a second. All of it is already soldered to the pins of the chip, so you can control the lights and buttons from your circuit.',
  'Что будем делать': 'What we will do',
  'План такой: сначала разберёмся с нулём и единицей и с простыми правилами, из которых складывается схема. Потом научимся описывать схемы текстом. Каждый урок короткий, в нём одна идея. Проверять себя будешь прямо здесь, без платы.':
    'The plan is this: first we figure out zero and one and the simple rules a circuit is made of. Then we learn to describe circuits in text. Each lesson is short and has one idea. You will check yourself right here, without a board.',
  Проверим: "Let's check",
  'Что значит, что ПЛИС «настраивается»?': 'What does it mean that an FPGA is "configurable"?',
  'Мы сами решаем, как соединены её внутренние «кубики»':
    'We decide how its internal "bricks" are connected',
  'Верно. Поэтому одна микросхема может стать разными устройствами.':
    'Correct. That is why one chip can become different devices.',
  'Она запоминает и запускает программы, как телефон':
    'It remembers and runs programs, like a phone',
  'У ПЛИС нет программы, которая идёт по строчкам. Её кубики соединяются в схему, и схема работает сама.':
    'An FPGA has no program that goes line by line. Its bricks are connected into a circuit, and the circuit works by itself.',
  'Её нужно настраивать отвёрткой': 'It has to be adjusted with a screwdriver',
  'Всё делается без отвёртки: схему описывают текстом и загружают через USB.':
    'Everything is done without a screwdriver: the circuit is described in text and loaded over USB.',
  'Бит: ноль и единица': 'A bit: zero and one',
  'Из чего состоит вся цифровая техника.': 'What all digital technology is made of.',
  'Самая маленькая порция информации': 'The smallest portion of information',
  'Бит — это ячейка, в которой может быть только 0 или 1. Как выключатель: выключен (0) или включён (1). Внутри платы 1 — это напряжение около 3,3 вольта, а 0 — почти ноль вольт.':
    'A bit is a cell that can hold only 0 or 1. Like a switch: off (0) or on (1). Inside the board 1 is a voltage of about 3.3 volts, and 0 is almost zero volts.',
  'Много бит вместе': 'Many bits together',
  'Один бит различает два случая. Два бита — четыре: 00, 01, 10, 11. Три бита — восемь. С каждым новым битом вариантов вдвое больше. Из нескольких бит составляют числа: например, 101 в двоичной записи — это число 5 (4 + 0 + 1).':
    'One bit tells two cases apart. Two bits tell four: 00, 01, 10, 11. Three bits tell eight. With every new bit there are twice as many options. Numbers are made from several bits: for example, 101 in binary is the number 5 (4 + 0 + 1).',
  'Посчитай варианты': 'Count the options',
  'Сколько разных значений можно записать в трёх битах?':
    'How many different values can be written in three bits?',
  'Верно: 2 · 2 · 2 = 8, от 000 до 111.': 'Correct: 2 · 2 · 2 = 8, from 000 to 111.',
  'Три — это число бит, а не вариантов. Каждый бит удваивает количество комбинаций.':
    'Three is the number of bits, not of options. Each bit doubles the number of combinations.',
  'Нужно умножать, а не складывать: 2 · 2 · 2.': 'You need to multiply, not add: 2 · 2 · 2.',
  'Двоичное число': 'A binary number',
  'Какое число записано как 101?': 'Which number is written as 101?',
  'Верно: 4 + 0 + 1 = 5.': 'Correct: 4 + 0 + 1 = 5.',
  'Это запись в двоичной системе, а не в привычной нам десятичной.':
    'This is binary notation, not the decimal one we are used to.',
  'Справа налево значения разрядов 1, 2, 4. Единицы стоят в разрядах 1 и 4: 1 + 4 = 5.':
    'From right to left the place values are 1, 2, 4. The ones are in the places 1 and 4: 1 + 4 = 5.',
  'Логический элемент': 'A logic gate',
  'НЕ, И, ИЛИ: из них собрана вся логика.': 'NOT, AND, OR: all logic is built from them.',
  'Крошечные правила': 'Tiny rules',
  'Логический элемент (его ещё называют вентилем) — это маленькая схема, которая по битам на входе выдаёт один бит. Это как правило в игре: «если обе кнопки нажаты, лампа горит». Всю цифровую технику строят из таких правил.':
    'A logic gate is a small circuit that produces one bit from the bits on its inputs. It is like a rule in a game: "if both buttons are pressed, the lamp lights up". All digital technology is built from such rules.',
  'Три главных элемента': 'The three main gates',
  'НЕ (по-английски NOT) переворачивает бит: был 0, стал 1. И (AND) даёт 1 только если оба входа равны 1. ИЛИ (OR) даёт 1, если хотя бы один вход равен 1. Всё это удобно записывать таблицей: в каждой строке свои входы и ответ.':
    'NOT inverts a bit: it was 0, it becomes 1. AND gives 1 only if both inputs are 1. OR gives 1 if at least one input is 1. It is convenient to write all this as a table: each row has its own inputs and the answer.',
  'a b | И  ИЛИ\n0 0 | 0   0\n0 1 | 0   1\n1 0 | 0   1\n1 1 | 1   1':
    'a b | AND OR\n0 0 | 0   0\n0 1 | 0   1\n1 0 | 0   1\n1 1 | 1   1',
  'Попробуй предсказать': 'Try to predict',
  'Вход a = 1, вход b = 0. Что выдаст элемент И?':
    'Input a = 1, input b = 0. What will the AND gate output?',
  'Верно. «И» требует, чтобы единицы были на обоих входах.':
    'Correct. AND requires ones on both inputs.',
  'Так отвечает ИЛИ: ему достаточно одной единицы. «И» требует обе.':
    'That is the answer for OR: one 1 is enough for it. AND requires both.',
  'Ничего, пока b не станет 1': 'Nothing until b becomes 1',
  'Элемент отвечает всегда. Просто сейчас его ответ 0.':
    'A gate always answers. It is just that right now its answer is 0.',
  'Ещё один вопрос': 'One more question',
  'На вход элемента НЕ приходит 0. Что на выходе?':
    'A 0 arrives at the input of a NOT gate. What is on the output?',
  'Верно. НЕ меняет бит на противоположный.': 'Correct. NOT changes a bit to the opposite.',
  'Тогда это был бы просто провод. НЕ переворачивает.':
    'Then it would be just a wire. NOT inverts.',
  'Кнопка и светодиод на плате': 'The button and the LED on the board',
  'Нажатая кнопка = 1, светодиод горит при 0. Это не противоречие.':
    'A pressed button = 1, the LED lights at 0. This is not a contradiction.',
  'Кнопки S1 и S2': 'Buttons S1 and S2',
  'Когда кнопка нажата, на её выводе появляется 1. Когда отпущена, там 0. Всё просто: нажали — единица.':
    'When a button is pressed, a 1 appears on its pin. When it is released, there is a 0. Simple: pressed means one.',
  'Светодиоды горят от нуля': 'LEDs light on zero',
  'С лампочками на этой плате наоборот. Светодиод подключён одним концом к питанию, а другим к выводу ПЛИС. Ток через него идёт, только если на выводе 0. Поэтому 0 на выводе — лампа горит, 1 — не горит. Такой «включает ноль» называют активным низким уровнем.':
    'With the lights on this board it is the other way round. The LED is connected with one end to power and with the other to an FPGA pin. Current flows through it only if the pin is 0. So 0 on the pin means the lamp is on, 1 means it is off. This "switched on by zero" is called active low.',
  'Почему это не противоречие': 'Why this is not a contradiction',
  'Кнопка и светодиод — разные детали, у каждой своё правило. Кнопка говорит «1», когда её нажали. Светодиод горит, когда ему говорят «0». Если соединить их напрямую, получится смешной эффект: нажал кнопку — лампа гаснет. Чтобы лампа горела при нажатии, между ними нужен элемент НЕ.':
    'The button and the LED are different parts, and each has its own rule. The button says "1" when it is pressed. The LED lights when it is told "0". If you connect them directly, you get a funny effect: press the button and the lamp goes out. For the lamp to light when pressed, you need a NOT gate between them.',
  'Схема: светодиод = кнопка (прямой провод). Кнопку нажали. Что со светодиодом?':
    'Circuit: LED = button (a direct wire). The button is pressed. What happens to the LED?',
  Погас: 'It goes out',
  'Верно. Нажатая кнопка даёт 1, а светодиод горит только при 0. Прямой провод его гасит.':
    'Correct. A pressed button gives 1, and the LED lights only at 0. A direct wire turns it off.',
  Загорелся: 'It lights up',
  'Это было бы так, если бы светодиод горел от единицы. Здесь он горит от нуля.':
    'That would be so if the LED lit on one. Here it lights on zero.',
  'Ничего не изменилось': 'Nothing changed',
  'Изменился: кнопка поменяла значение на выводе светодиода с 0 на 1.':
    'Something changed: the button changed the value on the LED pin from 0 to 1.',
  'И наоборот': 'And the other way round',
  'Как сделать, чтобы светодиод горел, пока кнопка нажата?':
    'How do you make the LED light while the button is pressed?',
  'Пропустить кнопку через НЕ': 'Pass the button through NOT',
  'Верно. Нажатая кнопка (1) станет нулём, и светодиод загорится.':
    'Correct. A pressed button (1) becomes zero, and the LED lights up.',
  'Соединить напрямую': 'Connect it directly',
  'Напрямую нажатие даёт 1, и светодиод гаснет.':
    'Directly, a press gives 1, and the LED goes out.',
  'Нажимать сильнее': 'Press harder',
  'Сила не влияет: кнопка выдаёт только 0 или 1.':
    'Force does not matter: the button gives only 0 or 1.',
  'Модуль: коробка со входами и выходами': 'Module: a box with inputs and outputs',
  'Схема в коробке': 'A circuit in a box',
  'Схему на Verilog описывают по частям. Каждая часть — модуль: коробка с входами слева и выходами справа. Verilog (читается «верилог») — это язык, на котором описывают цифровые схемы. Это не программа, которая выполняется по строчкам, а описание деталей и проводов, скорее чертёж.':
    'In Verilog a circuit is described in parts. Each part is a module: a box with inputs on the left and outputs on the right. Verilog is a language in which digital circuits are described. It is not a program that runs line by line, but a description of parts and wires, more like a drawing.',
  'Как выглядит модуль': 'What a module looks like',
  'Слово module открывает коробку, endmodule закрывает. В скобках перечислены входы (input) и выходы (output): входы приходят в модуль, выходы выходят. Имя top у главного модуля проекта принято по традиции.':
    'The word module opens the box, endmodule closes it. In the parentheses the inputs (input) and outputs (output) are listed: inputs come into the module, outputs go out. By tradition the main module of a project is named top.',
  'module top(input a, output y);\n    // здесь будет схема\nendmodule':
    'module top(input a, output y);\n    // the circuit will go here\nendmodule',
  Проверка: 'Check',
  'Какое слово объявляет сигнал, который выходит из модуля?':
    'Which word declares a signal that leaves the module?',
  'Верно. output — выход, input — вход.': 'Correct. output is an output, input is an input.',
  'Нет: input — это вход, то есть то, что приходит в модуль.':
    'No: input is an input, that is, what comes into the module.',
  'module открывает описание, но направление сигнала задаёт не оно.':
    'module opens the description, but it is not what sets the direction of a signal.',
  'Провод: assign': 'A wire: assign',
  'Непрерывное соединение.': 'A continuous connection.',
  'Соединяем провод': 'Connecting a wire',
  'Строка assign y = a; означает: «провод y всегда равен a». Это не команда «выполнить один раз». Как только a поменяется, y тут же поменяется следом. Поэтому порядок строк assign не важен: они все действуют одновременно.':
    'The line assign y = a; means: "the wire y is always equal to a". It is not a command to "run once". As soon as a changes, y immediately changes after it. That is why the order of assign lines does not matter: they all act at the same time.',
  Предскажи: 'Predict',
  'a сейчас равен 1, а потом поменялся на 0. Что станет с y из строки assign y = a;?':
    'a is now 1 and then changed to 0. What happens to y from the line assign y = a;?',
  'y тоже станет 0': 'y also becomes 0',
  'Верно. assign — постоянная связь.': 'Correct. assign is a permanent link.',
  'y останется 1': 'y stays 1',
  'Так было бы у переменной в программе. Провод повторяет вход постоянно.':
    'That is how a variable in a program would behave. A wire repeats its input all the time.',
  'Сделай первый провод: подправь строку с TODO и нажми «Проверить».':
    'Make the first wire: fix the line with TODO and press "Check".',
  'Посмотри, как называется вход в скобках после top.':
    'Look at what the input is called in the parentheses after top.',
  'assign y = ...; задаёт, что подаётся на y.': 'assign y = ...; sets what is fed to y.',
  'Правильная строка: assign y = a;': 'The correct line: assign y = a;',
  "Числа: 4'b1010 и 6'd5": "Numbers: 4'b1010 and 6'd5",
  'Как в Verilog записывают числа с шириной.': 'How numbers with a width are written in Verilog.',
  'Запись числа с шириной': 'Writing a number with a width',
  "В Verilog у числа есть ширина: сколько оно занимает бит. 4'b1010 читается так: «4 бита, двоичное, 1010». Буква после апострофа задаёт систему: b — двоичная, d — десятичная, h — шестнадцатеричная. Поэтому 6'd5 — это пять, записанное в шести битах: 000101.":
    'In Verilog a number has a width: how many bits it takes. 4\'b1010 reads: "4 bits, binary, 1010". The letter after the apostrophe sets the base: b is binary, d is decimal, h is hexadecimal. So 6\'d5 is five written in six bits: 000101.',
  "4'b1010   // десять\n6'd5      // пять в шести битах\n8'hFF     // 255":
    "4'b1010   // ten\n6'd5      // five in six bits\n8'hFF     // 255",
  "Чему равно число 4'b0011?": "What is the number 4'b0011 equal to?",
  'Верно: 2 + 1 = 3.': 'Correct: 2 + 1 = 3.',
  'Это десятичное «одиннадцать»; а у нас двоичная запись, разряды стоят справа налево как 1, 2, 4, 8.':
    'That is the decimal "eleven"; ours is binary notation, and the places from right to left are 1, 2, 4, 8.',
  'Четвёрка — это ширина (четыре бита), а не значение.':
    'Four is the width (four bits), not the value.',
  'Запиши число десять в двоичном виде.': 'Write the number ten in binary.',
  "Нужно число 4'b1010 вместо 4'b0000.": "You need the number 4'b1010 instead of 4'b0000.",
  'Четыре цифры слева направо: 1, 0, 1, 0.': 'Four digits from left to right: 1, 0, 1, 0.',
  "Ответ: assign y = 4'b1010;": "The answer: assign y = 4'b1010;",
  'Операторы ~ & | ^': 'Operators ~ & | ^',
  'Логика в одну строчку.': 'Logic in one line.',
  'Знаки для логических элементов': 'Signs for logic gates',
  'Для элементов, которые мы видели, есть знаки: ~ — НЕ, & — И, | — ИЛИ, ^ — исключающее ИЛИ (выдаёт 1, если входы разные). Их можно комбинировать, а скобки задают порядок, как в математике.':
    'The gates we have seen have signs: ~ is NOT, & is AND, | is OR, ^ is exclusive OR (gives 1 if the inputs are different). They can be combined, and parentheses set the order, as in math.',
  'assign n = ~a;        // НЕ\nassign c = a & b;     // И\nassign d = a | b;     // ИЛИ\nassign e = a ^ b;     // входы разные':
    'assign n = ~a;        // NOT\nassign c = a & b;     // AND\nassign d = a | b;     // OR\nassign e = a ^ b;     // inputs differ',
  'Таблица истинности': 'Truth table',
  'Сведём всё в таблицу: в каждой строке входы a и b и ответ каждого знака. Такую таблицу часто называют таблицей истинности.':
    'Let us put it all in a table: each row has the inputs a and b and the answer of each sign. Such a table is often called a truth table.',
  'Чему равно 1 ^ 1?': 'What is 1 ^ 1 equal to?',
  'Верно. ^ даёт 1 только когда входы разные.':
    'Correct. ^ gives 1 only when the inputs are different.',
  'Это ответ для |. А ^ при двух одинаковых входах даёт 0.':
    'That is the answer for |. And ^ with two equal inputs gives 0.',
  'Сделай «не И»: выход гаснет, только когда нажаты обе кнопки.':
    'Make a "not AND": the output goes out only when both buttons are pressed.',
  'Сначала посчитай a & b, потом перевороти.': 'First compute a & b, then invert it.',
  'Знак ~ ставят перед выражением. Если выражение сложное, возьми его в скобки.':
    'Put the ~ sign before the expression. If the expression is complex, put it in parentheses.',
  'Ответ: assign y = ~(a & b);': 'The answer: assign y = ~(a & b);',
  'Шина и выбор битов': 'A bus and bit selection',
  'Несколько проводов под одним именем': 'Several wires under one name',
  'Шина — это несколько проводов с общим именем. Запись [3:0] означает «четыре провода с номерами 3, 2, 1, 0». Число проводов называют разрядностью. Номера идут справа налево: нулевой бит самый правый.':
    'A bus is several wires with a common name. The notation [3:0] means "four wires numbered 3, 2, 1, 0". The number of wires is called the width. The numbers go from right to left: bit zero is the rightmost.',
  'input [3:0] data;      // четыре провода\nassign y = data[3:2];  // два левых':
    'input [3:0] data;      // four wires\nassign y = data[3:2];  // the two left ones',
  'Один бит или часть': 'One bit or a part',
  'Чтобы взять один провод, пиши data[2]. Чтобы взять несколько подряд, укажи диапазон: data[3:2] — это биты 3 и 2.':
    'To take one wire, write data[2]. To take several in a row, give a range: data[3:2] is bits 3 and 2.',
  "data = 4'b1100. Чему равен бит data[3]?": "data = 4'b1100. What is the bit data[3] equal to?",
  'Верно. Слева направо биты 3, 2, 1, 0, то есть 1, 1, 0, 0.':
    'Correct. From left to right the bits are 3, 2, 1, 0, that is 1, 1, 0, 0.',
  'Бит 3 самый левый. В числе 1100 слева стоит единица.':
    'Bit 3 is the leftmost. In the number 1100 there is a one on the left.',
  'Возьми два старших бита шины data.': 'Take the two most significant bits of the bus data.',
  'Старшие биты те, что стоят слева: номера 3 и 2.':
    'The most significant bits are the ones on the left: numbers 3 and 2.',
  'Диапазон пишут data[старший:младший].': 'A range is written data[high:low].',
  'Ответ: assign y = data[3:2];': 'The answer: assign y = data[3:2];',
  'Склейка {a, b}': 'Concatenation {a, b}',
  'Соединяем сигналы в более широкую шину.': 'Joining signals into a wider bus.',
  'Склеиваем сигналы': 'Joining signals',
  'Фигурные скобки склеивают сигналы в один широкий. {a, b} — сначала a (он будет слева), затем b. Если a один бит, а b два бита, получится три бита.':
    'Curly braces join signals into one wide signal. {a, b} is first a (it will be on the left), then b. If a is one bit and b is two bits, you get three bits.',
  'assign y = {a, b};   // слева a, справа b':
    'assign y = {a, b};   // a on the left, b on the right',
  "a = 1, b = 2'b01. Чему равно {a, b}?": "a = 1, b = 2'b01. What is {a, b} equal to?",
  'Верно: единица a, а справа 01.': 'Correct: the one from a, and 01 on the right.',
  'Так получилось бы у {b, a}. Первым в скобках идёт самый левый сигнал.':
    'That is what {b, a} would give. The first one in the braces is the leftmost signal.',
  'Склей a и b в правильном порядке.': 'Join a and b in the right order.',
  'Слева направо: сначала то, что должно быть слева.':
    'From left to right: first what must be on the left.',
  'Сейчас в скобках части стоят наоборот.':
    'Right now the parts in the braces are the other way round.',
  'Ответ: assign y = {a, b};': 'The answer: assign y = {a, b};',
  'Условный оператор': 'The conditional operator',
  'Запись «условие ? да : нет».': 'The "condition ? yes : no" form.',
  'Условный оператор выбирает одно из двух значений: условие ? если_да : если_нет. Условие проверяется постоянно, как и всё в assign. Так можно сделать переключатель в одну строку.':
    'The conditional operator picks one of two values: condition ? if_yes : if_no. The condition is checked all the time, like everything in assign. This way you can make a switch in one line.',
  "button = 0. Чему равно button ? 4'd9 : 4'd3?":
    "button = 0. What is button ? 4'd9 : 4'd3 equal to?",
  'Верно: условие неверно, значит берём то, что после двоеточия.':
    'Correct: the condition is false, so we take what comes after the colon.',
  'Девятка выбирается, когда условие верно, то есть button = 1.':
    'Nine is chosen when the condition is true, that is, when button = 1.',
  'При нажатой кнопке выход должен быть 9, иначе 3.':
    'When the button is pressed the output must be 9, otherwise 3.',
  'Условие у нас button.': 'Our condition is button.',
  'Сначала пиши то, что нужно при button = 1, потом при 0.':
    'First write what is needed when button = 1, then when it is 0.',
  "Ответ: assign y = button ? 4'd9 : 4'd3;": "The answer: assign y = button ? 4'd9 : 4'd3;",
  Комментарии: 'Comments',
  '// и /* ... */: пометки для людей.': '// and /* ... */: notes for people.',
  'Заметки для себя': 'Notes to yourself',
  'Две косые черты // начинают комментарий: всё до конца строки схема игнорирует. Для длинной заметки используют /* ... */. Комментарии нужны людям, чтобы через неделю понять свой же код. Ещё ими удобно «выключать» строку, не стирая её.':
    'Two slashes // start a comment: the circuit ignores everything up to the end of the line. For a long note use /* ... */. Comments are for people, so that a week later you can understand your own code. They are also handy for "switching off" a line without erasing it.',
  '// Это заметка\nassign y = a; // и это тоже заметка\n/* несколько\n   строк */':
    '// This is a note\nassign y = a; // and this is a note too\n/* several\n   lines */',
  'Что произойдёт со строкой // assign y = a;?': 'What will happen to the line // assign y = a;?',
  'Схема её не увидит': 'The circuit will not see it',
  'Верно. Комментарий полностью игнорируется.': 'Correct. A comment is ignored completely.',
  'Она сработает как обычно': 'It will work as usual',
  'Две косые черты в начале превращают всю строку в заметку.':
    'Two slashes at the start turn the whole line into a note.',
  'Память: always, reg и такт': 'Memory: always, reg and the clock',
  'always @(posedge clk), reg и стрелка <=.': 'always @(posedge clk), reg and the arrow <=.',
  'Часы схемы': "The circuit's clock",
  'Чтобы схема что-то помнила, ей нужны «часы». Такт — это сигнал clk, который снова и снова меняется 0 → 1 → 0. Момент, когда он меняется из 0 в 1, называют положительным фронтом. По фронту все ячейки памяти обновляются одновременно, как оркестр по взмаху дирижёра.':
    'For a circuit to remember anything, it needs a "clock". The clock is the signal clk, which changes over and over: 0 → 1 → 0. The moment it changes from 0 to 1 is called the positive edge. On the edge all memory cells update at the same time, like an orchestra at the wave of a conductor.',
  'Ячейка памяти в Verilog': 'A memory cell in Verilog',
  'Ячейку, которая запоминает бит, описывают так: reg объявляет сигнал, который хранит значение; always @(posedge clk) говорит, что внутри — действия по положительному фронту. Знак <= читается «запомни». Такую ячейку называют триггером; несколько триггеров рядом — регистр.':
    'A cell that remembers a bit is described like this: reg declares a signal that keeps a value; always @(posedge clk) says that inside are actions on the positive edge. The <= sign reads "remember". Such a cell is called a flip-flop; several flip-flops side by side are a register.',
  'reg q;\nalways @(posedge clk) begin\n    q <= d;   // на каждом фронте запомни d\nend':
    'reg q;\nalways @(posedge clk) begin\n    q <= d;   // on every edge remember d\nend',
  'Когда q получает новое значение в always @(posedge clk)?':
    'When does q get a new value in always @(posedge clk)?',
  'Только по положительному фронту clk': 'Only on the positive edge of clk',
  'Верно. Между фронтами q хранит прежнее значение.':
    'Correct. Between edges q keeps its previous value.',
  'Всё время, пока d меняется': 'All the time while d changes',
  'Так работает assign. Ячейка памяти меняется только по фронту.':
    'That is how assign works. A memory cell changes only on the edge.',
  'Заставь q запоминать d на каждом фронте.': 'Make q remember d on every edge.',
  'Внутри always уже есть строка q <= ...;': 'Inside always there is already a line q <= ...;',
  'Сейчас в q всегда записывается единица.': 'Right now a one is always written into q.',
  'Ответ: q <= d;': 'The answer: q <= d;',
  'Стрелка <= и порядок': 'The <= arrow and the order',
  'Почему на одном фронте всё обновляется одновременно.':
    'Why everything updates at once on one edge.',
  'Все сразу': 'All at once',
  'На одном фронте все строки с <= выполняются «одновременно»: каждая смотрит на значения, которые были до фронта. Поэтому цепочка a <= d; b <= a; работает как сдвиг: b получает старое a, а не новое. Так же происходит и в железе, где все триггеры щёлкают в один момент.':
    'On one edge all the lines with <= run "at the same time": each looks at the values that were there before the edge. So the chain a <= d; b <= a; works like a shift: b gets the old a, not the new one. The same happens in hardware, where all flip-flops click at the same moment.',
  'a <= d;   // a запоминает d\nb <= a;   // b запоминает СТАРОЕ a':
    'a <= d;   // a remembers d\nb <= a;   // b remembers the OLD a',
  'А знак = внутри always?': 'And the = sign inside always?',
  'Знак = (без стрелки) выполняется строго по очереди: следующая строка видит уже новое значение. Для ячеек памяти по фронту пользуются <=. Знак = подходит для вычислений без памяти, например в always @*, как будет в уроке про case.':
    'The = sign (without an arrow) runs strictly in order: the next line already sees the new value. For memory cells on an edge, use <=. The = sign suits calculations without memory, for example in always @*, as in the lesson about case.',
  'На фронте выполняются a <= d; b <= a;. Было a = 1, d = 0. Чему равно b после фронта?':
    'On the edge a <= d; b <= a; run. Before it, a = 1, d = 0. What is b after the edge?',
  'Верно. b берёт старое a, равное 1; новое a (0) появится только после фронта.':
    'Correct. b takes the old a, which is 1; the new a (0) will appear only after the edge.',
  'Это было бы так при знаке =. При <= b видит значение a до фронта.':
    'That would be so with the = sign. With <= b sees the value of a from before the edge.',
  'Собери цепочку из двух ячеек: b должен брать значение из a.':
    'Build a chain of two cells: b must take its value from a.',
  'Вторая строка сейчас повторяет d. Нужно, чтобы она брала a.':
    'The second line now repeats d. It must take a.',
  'Цепочка: d → a → b, каждый шаг на новом фронте.':
    'The chain: d → a → b, each step on a new edge.',
  'Ответ: b <= a;': 'The answer: b <= a;',
  'if/else и case': 'if/else and case',
  'Выбор вариантов внутри always.': 'Choosing among options inside always.',
  'Если, иначе': 'If, else',
  'Внутри always можно писать условия: if (условие) ... else ... . Условие проверяется в момент работы блока. Для нескольких вариантов подряд удобнее case: он берёт число и выбирает нужную строку, а default срабатывает для всех остальных значений.':
    'Inside always you can write conditions: if (condition) ... else ... . The condition is checked when the block runs. For several options in a row case is more convenient: it takes a number and picks the right line, and default fires for all other values.',
  'case раскладывает по вариантам': 'case spreads things out into options',
  'Блок always @* (звёздочка значит «при любом изменении входов») описывает схему без памяти. Внутри пользуются знаком =. Такая схема называется комбинационной: выход зависит только от входов прямо сейчас. Дешифратор, превращающий число в «включи одну линию», удобно записывать через case.':
    'The block always @* (the star means "on any change of the inputs") describes a circuit without memory. Inside, use the = sign. Such a circuit is called combinational: the output depends only on the inputs right now. A decoder that turns a number into "switch on one line" is convenient to write with case.',
  'Для чего нужна ветка default?': 'What is the default branch for?',
  'Для всех значений, которых нет в списке': 'For all the values that are not in the list',
  'Верно. Она нужна, чтобы выход был определён всегда.':
    'Correct. It is needed so that the output is always defined.',
  'Чтобы прервать работу схемы': 'To stop the circuit',
  'Схема не останавливается. default просто описывает «все остальные» случаи.':
    'The circuit does not stop. default just describes "all the other" cases.',
  'Допиши вариант для code = 2.': 'Add the option for code = 2.',
  'Посмотри на уже готовые строки: слева число, справа ответ.':
    'Look at the lines that are already done: on the left a number, on the right the answer.',
  'Не хватает строки для числа 2 (двоичное 10).':
    'The line for the number 2 (binary 10) is missing.',
  "Добавь: 2'd2: y = 3'b100;": "Add: 2'd2: y = 3'b100;",
  Параметры: 'Parameters',
  'Одно число, которое можно поменять в одном месте.':
    'One number that can be changed in one place.',
  'Ручка настройки': 'A tuning knob',
  'Параметр — число, заданное в начале модуля. Его можно поменять в одном месте, и поменяется всё, где он используется. Как ручка громкости: покрутил, и звук изменился везде. Так делают модули гибкими.':
    'A parameter is a number set at the start of a module. You can change it in one place, and everything that uses it changes. Like a volume knob: turn it and the sound changes everywhere. This is how modules are made flexible.',
  'Зачем нужен параметр?': 'Why do we need a parameter?',
  'Чтобы менять число в одном месте': 'To change a number in one place',
  'Верно. Остальной код его только читает.': 'Correct. The rest of the code only reads it.',
  'Чтобы схема считала быстрее': 'So that the circuit counts faster',
  'На скорость он не влияет: это просто удобная настройка.':
    'It does not affect speed: it is just a convenient setting.',
  'Поменяй значение параметра на 5.': 'Change the value of the parameter to 5.',
  "Найди parameter и число 4'd0.": "Find parameter and the number 4'd0.",
  'Это число и есть значение, которое получит выход y.':
    'This number is the value that the output y will get.',
  "Замени его на 4'd5.": "Replace it with 4'd5.",
  'Модули внутри модулей': 'Modules inside modules',
  'Как собрать большое из готовых деталей.': 'How to build something big from ready-made parts.',
  'Ставим готовую деталь': 'Placing a ready-made part',
  'Модуль можно поставить внутрь другого модуля, как деталь в конструкторе. Пишешь имя модуля, придумываешь имя для этой детали и соединяешь порты: .порт_модуля(твой_сигнал). Так большие схемы собирают из маленьких проверенных блоков.':
    'A module can be placed inside another module, like a part in a construction kit. You write the name of the module, invent a name for this part and connect the ports: .module_port(your_signal). This is how big circuits are built from small proven blocks.',
  'Что означает запись .a(sig) при подключении модуля?':
    'What does the notation .a(sig) mean when connecting a module?',
  'Порт a модуля соединён с сигналом sig':
    'The port a of the module is connected to the signal sig',
  'Верно. Слева порт самого модуля, в скобках твой сигнал.':
    'Correct. On the left is the port of the module itself, in parentheses is your signal.',
  'Сигнал sig переименован в a': 'The signal sig is renamed to a',
  'Имя сигнала не меняется. Просто провод sig подключается к порту a.':
    'The name of the signal does not change. The wire sig is simply connected to the port a.',
  'Поставь готовый инвертор inv в схему.': 'Place the ready-made inverter inv into the circuit.',
  'Нужны две вещи: имя модуля (inv) и имя детали (например, u1).':
    'You need two things: the module name (inv) and the name of the part (for example, u1).',
  'В скобках после точки пишется порт модуля inv, внутри скобок твой сигнал.':
    'After the dot goes the port of the inv module, inside the parentheses your signal.',
  'Ответ: inv u1(.a(a), .y(y));': 'The answer: inv u1(.a(a), .y(y));',
  'Ошибки и как их читать': 'Errors and how to read them',
  'Типичные промахи и сообщения симулятора.': 'Typical slips and simulator messages.',
  'Забыли точку с запятой': 'A forgotten semicolon',
  'Каждая строка assign заканчивается знаком ;. Если его забыть, симулятор Icarus Verilog напишет «syntax error». Номер строки в сообщении — это место, где он понял, что что-то не так. Часто ошибка в строке выше, потому что точка с запятой должна была стоять в её конце.':
    'Every assign line ends with the ; sign. If you forget it, the Icarus Verilog simulator will print "syntax error". The line number in the message is the place where it realized something was wrong. The error is often in the line above, because the semicolon should have been at its end.',
  'assign y = ~a        <- нет ;\nendmodule\n\nfile.v:3: syntax error\nI give up.':
    'assign y = ~a        <- no ;\nendmodule\n\nfile.v:3: syntax error\nI give up.',
  'Опечатка в имени': 'A typo in a name',
  'Если написать имя, которого нет (например, b вместо a), симулятор скажет, что не может найти такой провод. Смотри на имя в обратных кавычках: именно оно неизвестно.':
    'If you write a name that does not exist (for example, b instead of a), the simulator will say it cannot find such a wire. Look at the name in the back quotes: that is the one that is unknown.',
  'Запись в провод внутри always': 'Writing to a wire inside always',
  'Внутри always можно записывать только в reg. Если выход объявлен как обычный провод, а в always в него пишут, будет сообщение, что это «не valid l-value for a procedural assignment». Исправление: объяви выход как output reg.':
    'Inside always you can only write to a reg. If the output is declared as an ordinary wire and always writes to it, you will get the message that it is "not valid l-value for a procedural assignment". The fix: declare the output as output reg.',
  'Найди причину': 'Find the cause',
  "Симулятор пишет: Unable to bind wire/reg/memory `led'. Что это значит?":
    "The simulator prints: Unable to bind wire/reg/memory `led'. What does this mean?",
  'Имя led нигде не объявлено: проверь опечатку':
    'The name led is not declared anywhere: check for a typo',
  'Верно. Он не нашёл провода с таким именем.': 'Correct. It did not find a wire with that name.',
  'Не хватает точки с запятой': 'A semicolon is missing',
  'Про точку с запятой пишут «syntax error». Здесь речь про неизвестное имя.':
    'A missing semicolon is reported as "syntax error". This one is about an unknown name.',
  'Слишком много входов': 'Too many inputs',
  'Число входов не причина. Сообщение про имя из обратных кавычек.':
    'The number of inputs is not the cause. The message is about the name in the back quotes.',
  'Ещё одна': 'One more',
  'В сообщении syntax error указана строка 3. Где искать ошибку?':
    'The syntax error message points to line 3. Where should you look for the error?',
  'В строке 3 и в строке перед ней': 'In line 3 and in the line before it',
  'Верно. Симулятор замечает проблему на следующей строке после настоящей.':
    'Correct. The simulator notices the problem on the line after the real one.',
  'Только в строке 3': 'Only in line 3',
  'Нередко ошибка выше: например, забытая ; в конце предыдущей строки.':
    'Often the error is above: for example, a forgotten ; at the end of the previous line.',
  '1. Осмотр мастерской': '1. A tour of the workshop',
  'Что такое ПЛИС, где писать схему и как проверить её без платы.':
    'What an FPGA is, where you write a circuit and how to check it without a board.',
  '2. Логика и данные': '2. Logic and data',
  'Входы, выходы, логические элементы, шины и выбор сигналов.':
    'Inputs, outputs, logic gates, buses and signal selection.',
  '3. Время и память': '3. Time and memory',
  'Тактовый фронт, регистр, сброс, разрешение и счётчик.':
    'The clock edge, a register, reset, enable and a counter.',
  '4. Устройство из блоков': '4. A device made of blocks',
  'Автомат состояний, физические выводы, активные уровни и частота.':
    'A state machine, physical pins, active levels and frequency.',
  'Свои testbench': 'Your own testbenches',
  'Произвольные задержки, проверки assert и самостоятельный поиск ошибок.':
    'Arbitrary delays, assert checks and finding errors on your own.',
  'Следующие миссии с платой': 'Next missions with the board',
  'Дребезг кнопок, синхронизация и пошаговая аппаратная загрузка после проверки в симуляторе.':
    'Button bounce, synchronization and step-by-step hardware loading after checking in the simulator.',
  'Память и интерфейсы': 'Memory and interfaces',
  'BRAM, UART, SPI, передача между тактовыми доменами и ограничения по времени.':
    'BRAM, UART, SPI, crossing between clock domains and timing constraints.',
  'Процессор и SoC': 'Processor and SoC',
  'RISC-V, программная память, периферия и контроллер SDRAM.':
    'RISC-V, program memory, peripherals and an SDRAM controller.',
  'Кнопка включает свет': 'The button turns on the light',
  'Свяжи логический уровень с поведением настоящего LED.':
    'Connect the logic level to the behavior of a real LED.',
  'Активный уровень · CST · контакт корпуса': 'Active level · CST · package pin',
  'Устройство из блоков': 'A device made of blocks',
  'Какой уровень включает LED Tang Nano 20K?': 'Which level turns on the LED of the Tang Nano 20K?',
  'Любое число': 'Any number',
  'Анод LED подключён к питанию; FPGA включает LED, опуская катод до 0.':
    'The LED anode is connected to power; the FPGA turns the LED on by pulling the cathode down to 0.',
  'Сделай led_n = 0 при button = 1 и led_n = 1 при button = 0. В pins.cst кнопка назначена на 88, LED0 на 15. Сначала проверь симуляцию.':
    'Make led_n = 0 when button = 1 and led_n = 1 when button = 0. In pins.cst the button is assigned to 88 and LED0 to 15. Check the simulation first.',
  'Между кнопкой и активным низким выходом нужен инвертор.':
    'An inverter is needed between the button and the active-low output.',
  'Делитель частоты': 'Frequency divider',
  'Сделай период выхода в четыре раза длиннее входного.':
    'Make the output period four times longer than the input one.',
  'Частота · период · двоичный счётчик': 'Frequency · period · binary counter',
  'Входной такт 27 МГц разделён на 4. Какова выходная частота?':
    'The 27 MHz input clock is divided by 4. What is the output frequency?',
  '6,75 МГц': '6.75 MHz',
  '108 МГц': '108 MHz',
  '4 МГц': '4 MHz',
  'При делении на 4 период увеличивается вчетверо, а частота уменьшается вчетверо.':
    'When dividing by 4 the period becomes four times longer and the frequency four times lower.',
  'Счётчик работает верно. Выбери бит count, который даёт led_n период в четыре входных такта. Старший из первых двух битов меняется раз в два фронта.':
    'The counter works correctly. Choose the bit of count that gives led_n a period of four input clocks. The more significant of the first two bits changes once every two edges.',
  'Бит count[0] делит частоту на 2; следующий бит делит на 4.':
    'The bit count[0] divides the frequency by 2; the next bit divides by 4.',
  'Соедини вход и выход': 'Connect an input to an output',
  'Первый собственный провод в ПЛИС.': 'Your first own wire in an FPGA.',
  'Модуль · порты · непрерывная связь': 'Module · ports · continuous connection',
  'Логика и данные': 'Logic and data',
  'Что объявляет input wire button?': 'What does input wire button declare?',
  'Вход модуля': 'A module input',
  'Значение кнопки навсегда': 'The button value forever',
  'Тактовый генератор': 'A clock generator',
  'input задаёт направление порта; wire описывает соединение.':
    'input sets the direction of the port; wire describes a connection.',
  'Сделайте так, чтобы led_n всегда повторял button. На реальной плате LED горит, пока кнопка отпущена (уровень 0), и гаснет при нажатии.':
    'Make led_n always repeat button. On the real board the LED is on while the button is released (level 0) and goes out when it is pressed.',
  'Справа от assign led_n = нужно имя входа.':
    'To the right of assign led_n = there must be the name of the input.',
  'Найди различие': 'Find the difference',
  'Сигнал тревоги при разных входах.': 'An alarm signal when the inputs differ.',
  'XOR · отличие от OR': 'XOR · difference from OR',
  'a = 1, b = 1. Чему равен a ^ b?': 'a = 1, b = 1. What is a ^ b equal to?',
  'XOR равен 1 только у разных однобитовых входов.': 'XOR is 1 only for different one-bit inputs.',
  'Выход y равен 1, только если a и b различаются.':
    'The output y is 1 only if a and b are different.',
  'Побитовое исключающее ИЛИ обозначается ^.': 'Bitwise exclusive OR is written ^.',
  'Четыре провода вместе': 'Four wires together',
  'Комбинационный прибавитель с переполнением.': 'A combinational incrementer with overflow.',
  'Шина · размер константы': 'Bus · constant size',
  "Что получится в четырёхбитовом выходе после 4'd15 + 4'd1?":
    "What do we get on a four-bit output after 4'd15 + 4'd1?",
  'В выходе четыре бита, старший бит суммы не помещается.':
    'The output has four bits, the most significant bit of the sum does not fit.',
  'Сделайте четырёхбитовый y = data + 1. Проверьте все значения от 0 до 15 и переполнение.':
    'Make a four-bit y = data + 1. Check all values from 0 to 15 and the overflow.',
  "Используйте data + 4'd1. Здесь нет памяти: выход меняется вместе со входом.":
    "Use data + 4'd1. There is no memory here: the output changes together with the input.",
  'Один из четырёх': 'One of four',
  'Кнопки выбирают один LED.': 'Buttons choose one LED.',
  'case · комбинационный always · полное присваивание':
    'case · combinational always · complete assignment',
  'Что происходит, если в комбинационном always не присвоить выход для части входов?':
    'What happens if in a combinational always the output is not assigned for some of the inputs?',
  'Может появиться защёлка': 'A latch may appear',
  'Всегда получится ноль': 'The result will always be zero',
  'Выход исчезнет': 'The output will disappear',
  'Сохранение старого выхода требует памяти, которую здесь не планировали.':
    'Keeping the old output requires memory that was not planned here.',
  'Для code = 2 включите LED2: в активном низком led_n это 1011. Остальные три случая уже описаны.':
    'For code = 2 turn on LED2: in active-low led_n that is 1011. The other three cases are already described.',
  "Добавьте ветку 2'd2: led_n = 4'b1011;": "Add the branch 2'd2: led_n = 4'b1011;",
  'Сброс важнее загрузки': 'Reset is more important than load',
  'Ещё один фронт сброса': 'One more reset edge',
  'Загрузить единицу': 'Load one',
  'Вход изменён на паузе': 'Input changed during the pause',
  'Сохранить значение': 'Keep the value',
  'Загрузить ноль': 'Load zero',
  'Ноль на паузе': 'Zero during the pause',
  'Повторная загрузка': 'Load again',
  'Запомни один бит': 'Remember one bit',
  'Регистр с синхронным сбросом и разрешением.': 'A register with synchronous reset and enable.',
  'posedge · <= · сохранение': 'posedge · <= · holding',
  'Время и память': 'Time and memory',
  'enable = 0, reset = 0, data изменился. Что произойдёт с q?':
    'enable = 0, reset = 0, data changed. What happens to q?',
  'Сохранит прошлое значение': 'It keeps the previous value',
  'Повторит data': 'It repeats data',
  Сбросится: 'It resets',
  'Без разрешения регистр хранит прежнее значение.':
    'Without enable the register keeps its previous value.',
  'На posedge clk сбрасывайте q при reset; иначе при enable записывайте data. Во время паузы храните q.':
    'On posedge clk reset q when reset is set; otherwise, when enable is set, write data. During the pause keep q.',
  'Используйте q <= data внутри else if (enable).': 'Use q <= data inside else if (enable).',
  'После сброса красный': 'Red after reset',
  'Сброс удерживает красный': 'Reset holds red',
  'Красный → зелёный': 'Red → green',
  'Зелёный → жёлтый': 'Green → yellow',
  'Пауза на жёлтом': 'Pause on yellow',
  'Ещё один такт паузы': 'One more clock of pause',
  'Жёлтый → красный': 'Yellow → red',
  'Следующий круг': 'Next round',
  'Следующее состояние': 'Next state',
  'Возврат на красный': 'Return to red',
  'Светофор с памятью': 'A traffic light with memory',
  'Три состояния, пауза и безопасный сброс.': 'Three states, a pause and a safe reset.',
  'FSM · состояние · декодирование': 'FSM · state · decoding',
  'В каком порядке автомат должен менять состояния?':
    'In what order must the state machine change states?',
  'Красный → зелёный → жёлтый → красный': 'Red → green → yellow → red',
  'Красный → жёлтый → зелёный → красный': 'Red → yellow → green → red',
  'Все выходы включены одновременно': 'All outputs on at the same time',
  'Состояние хранит выбранную фазу, комбинационная логика включает соответствующую лампу.':
    'The state stores the selected phase, and combinational logic turns on the matching lamp.',
  'Допишите переход GREEN → YELLOW. При enable = 0 сохраняйте состояние. В lights[2:0] ровно одна единица: зелёный, жёлтый, красный.':
    'Finish the GREEN → YELLOW transition. When enable = 0 keep the state. In lights[2:0] there is exactly one one: green, yellow, red.',
  'В ветке GREEN присвойте state <= YELLOW.': 'In the GREEN branch assign state <= YELLOW.',
  'Выберите ответ. Если ошибётесь, разберём именно ваш вариант — можно попробовать снова.':
    'Choose an answer. If you get it wrong, we will go through your exact choice, and you can try again.',
  'Проверь своими руками': 'Check it with your own hands',
  'Ты в мастерской цифровых схем': 'You are in a digital circuit workshop',
  'Разберёмся, что здесь строят и как устроена работа.':
    'Let us see what is built here and how the work is organized.',
  'Куда ты попал': 'Where you have come to',
  'Logra — мастерская для ПЛИС: микросхемы, внутри которой можно настроить свою цифровую схему. Здесь ты описываешь устройство на Verilog, видишь его схему и наблюдаешь сигналы во времени. Начнём без железа: симулятор подаст входы, а мы проверим результат.':
    'Logra is a workshop for FPGAs: chips inside which you can configure your own digital circuit. Here you describe a device in Verilog, see its schematic and watch the signals over time. We start without hardware: the simulator will feed the inputs, and we will check the result.',
  'Ты описываешь устройство': 'You describe a device',
  'Программа обычно выполняет команды последовательно. Verilog описывает соединения и память, которые работают одновременно. Два assign — это две параллельные связи, а не очередь действий.':
    'A program usually runs commands one after another. Verilog describes connections and memory that work at the same time. Two assign lines are two parallel connections, not a queue of actions.',
  'Твой маршрут по вкладкам': 'Your route through the tabs',
  '«Код» — текст устройства. «RTL» — логическая схема из этого текста. «Диаграммы» — проверка уровней и тактов во времени. «Виртуальная плата» — переключатели и лампы поверх симуляции. «Выводы .cst» связывают порты с физическими контактами. «Кристалл» показывает размещение после сборки для выбранной ПЛИС. В обучении будем открывать нужную вкладку по шагам.':
    '"Code" is the text of the device. "RTL" is the logic schematic made from that text. "Diagrams" is the check of levels and clocks over time. "Virtual board" is switches and lamps on top of the simulation. "Pins .cst" connects ports with physical pins. "Chip" shows the placement after the build for the chosen FPGA. In the lessons we will open the right tab step by step.',
  'Проверка понимания': 'Checking understanding',
  'Что означают два независимых assign в Verilog?':
    'What do two independent assign lines in Verilog mean?',
  'Две связи, работающие одновременно': 'Two connections working at the same time',
  'Верно. Из описания получается параллельная схема.':
    'Correct. The description turns into a parallel circuit.',
  'Второй выполняется после первого': 'The second runs after the first',
  'Это привычка из обычных программ. Здесь оба выражения непрерывно зависят от своих входов.':
    'That is a habit from ordinary programs. Here both expressions depend continuously on their inputs.',
  'Две команды, которые выполняются один раз': 'Two commands that run once',
  'Связь assign действует всё время: изменится вход — пересчитается выход.':
    'An assign connection acts all the time: when the input changes, the output is recalculated.',
  'Первое предсказание': 'The first prediction',
  'Переключатель сейчас задаёт a = 0, а провод соединяет y с a. Что увидим на y?':
    'The switch now sets a = 0, and a wire connects y to a. What will we see on y?',
  'Верно. Прямая связь повторяет вход. Скоро построишь её сам.':
    'Correct. A direct connection repeats the input. Soon you will build one yourself.',
  'Для противоположного уровня нужен инвертор. Прямой провод повторяет вход.':
    'An opposite level needs an inverter. A direct wire repeats the input.',
  'Ничего, пока не запустим программу ещё раз': 'Nothing until we run the program again',
  'В аппаратной схеме провод действует непрерывно. В нашей симуляции изменение входа пересчитывает выход.':
    'In a hardware circuit a wire acts continuously. In our simulation a change of the input recalculates the output.',
  'Как будем учиться': 'How we will learn',
  'Сначала короткое объяснение и вопрос. Затем откроешь небольшой проект, исправишь TODO и запустишь проверку. Мы проверяем реальные сигналы Icarus Verilog, а не наличие нужных слов в коде. Подсказки раскрываются постепенно. Этот маршрут даст основу; дальше нужны самостоятельные устройства и более сложные лаборатории.':
    'First a short explanation and a question. Then you open a small project, fix the TODO and run the check. We check the real signals of Icarus Verilog, not whether the right words are in the code. Hints are revealed gradually. This route gives a foundation; after it you will need devices of your own and more complex labs.',
  'Первая связь': 'The first connection',
  'module, input, output, wire и assign.': 'module, input, output, wire and assign.',
  'Посмотри имена входа и выхода в скобках после top.':
    'Look at the names of the input and output in the parentheses after top.',
  'wire — соединение. assign led_n = выражение; задаёт его источник.':
    'wire is a connection. assign led_n = expression; sets its source.',
  'Замените константу: assign led_n = button;': 'Replace the constant: assign led_n = button;',
  'Обозначь границы устройства': 'Mark the boundaries of the device',
  'module top (...) начинает описание блока. input — сигнал входит в блок; output — выходит. endmodule закрывает блок. Названия выбираешь ты: top — верхний модуль проекта.':
    'module top (...) starts the description of a block. input means the signal enters the block; output means it leaves. endmodule closes the block. You choose the names: top is the top module of the project.',
  'module top(input wire button, output wire led_n);\n    // Здесь будет схема\nendmodule':
    'module top(input wire button, output wire led_n);\n    // The circuit will go here\nendmodule',
  'Проведи связь': 'Make the connection',
  'assign непрерывно связывает выход с выражением справа. У такого соединения нет памяти и ему не нужен тактовый сигнал. Суффикс _n у led_n напоминает: LED платы включается уровнем 0. Кнопка button даёт 1 при нажатии. В .cst уже назначены S1 и LED0.':
    "assign continuously connects the output with the expression on the right. Such a connection has no memory and needs no clock. The suffix _n in led_n reminds you: the board's LED turns on at level 0. The button gives 1 when pressed. In the .cst, S1 and LED0 are already assigned.",
  'Куда идёт сигнал?': 'Where does the signal go?',
  'В module top(input wire a, output wire y) какой сигнал получает блок извне?':
    'In module top(input wire a, output wire y), which signal does the block receive from outside?',
  'Верно: input a — вход блока.': 'Correct: input a is the input of the block.',
  'y объявлен как output: блок выдаёт этот сигнал наружу.':
    'y is declared as an output: the block sends this signal outward.',
  'wire — тип соединения, а не имя сигнала.': 'wire is a kind of connection, not a signal name.',
  'Открой лабораторию и замени постоянный выход связью со входом. Проверка подаст оба уровня кнопки. На диаграмме led_n должен повторять button.':
    'Open the lab and replace the constant output with a connection to the input. The check will apply both button levels. On the diagram led_n must repeat button.',
  'Логический инвертор': 'A logic inverter',
  'Преобразуй 0 в 1, а 1 в 0.': 'Turn 0 into 1 and 1 into 0.',
  'Проверь две строки: 0 → 1, 1 → 0.': 'Check two rows: 0 → 1, 1 → 0.',
  'Побитовое НЕ в Verilog обозначается ~.': 'Bitwise NOT in Verilog is written ~.',
  'Поставь справа от assign выражение ~a.': 'To the right of assign put the expression ~a.',
  'Переверни уровень': 'Flip the level',
  'Цифровой однобитовый сигнал принимает 0 или 1. Инвертор меняет уровень на противоположный. В RTL он выглядит как треугольник с кружком на выходе; кружок означает инверсию.':
    'A digital one-bit signal takes the value 0 or 1. An inverter changes the level to the opposite one. In RTL it looks like a triangle with a circle on the output; the circle means inversion.',
  'Предскажи оба случая': 'Predict both cases',
  'a = 0 даёт y = 1; a = 1 даёт y = 0. Это вся таблица истинности одного входа. Проверить только один случай недостаточно: постоянная единица тоже пройдёт первую строку.':
    'a = 0 gives y = 1; a = 1 gives y = 0. That is the whole truth table of one input. Checking one case is not enough: a constant one also passes the first row.',
  'Поймай ошибку': 'Catch the error',
  'a = 1. Чему равно ~a для однобитового входа?': 'a = 1. What is ~a equal to for a one-bit input?',
  'Верно. Инвертор меняет единицу на ноль.': 'Correct. An inverter changes one to zero.',
  'Это повторение входа. Инвертор должен сделать противоположный уровень.':
    'That is repeating the input. An inverter must produce the opposite level.',
  'Зависит от clk': 'Depends on clk',
  'В этом устройстве нет регистра: результат зависит только от a.':
    'There is no register in this device: the result depends only on a.',
  'Исправь TODO, затем проверь обе комбинации. Открой RTL и найди инвертор между a и y.':
    'Fix the TODO, then check both combinations. Open RTL and find the inverter between a and y.',
  'Два условия одновременно': 'Two conditions at once',
  'И, параллельные входы и таблица истинности.': 'AND, parallel inputs and the truth table.',
  'Свет должен включаться только для 11.': 'The light must turn on only for 11.',
  'Для побитового И используй &; символ | означает ИЛИ.':
    'For bitwise AND use &; the symbol | means OR.',
  'Нужное выражение: a & b.': 'The needed expression: a & b.',
  'Разрешение из двух условий': 'Permission from two conditions',
  'Представь дверь: нужен пропуск И разрешение охранника. Выход И равен 1 только тогда, когда оба входа равны 1. В Verilog это a & b.':
    "Imagine a door: you need a pass AND the guard's permission. The AND output is 1 only when both inputs are 1. In Verilog this is a & b.",
  'Не пропускай строки': 'Do not skip rows',
  'Два однобитовых входа дают четыре сочетания: 00, 01, 10, 11. Для И ответы 0, 0, 0, 1. Два входа существуют одновременно; никто не ждёт «своей очереди».':
    'Two one-bit inputs give four combinations: 00, 01, 10, 11. For AND the answers are 0, 0, 0, 1. Both inputs exist at the same time; nobody waits for "their turn".',
  'Есть ли разрешение?': 'Is there permission?',
  'a = 1, b = 0. Чему равно a & b?': 'a = 1, b = 0. What is a & b equal to?',
  'Верно. Одного разрешения недостаточно.': 'Correct. One permission is not enough.',
  'Так ответил бы OR: хотя бы одно условие. Для AND должны сработать оба.':
    'That is how OR would answer: at least one condition. For AND both must hold.',
  'Однобитовый логический выход не считает число единиц.':
    'A one-bit logic output does not count the number of ones.',
  'Опиши И и пройди все четыре строки. Если проверка не прошла, сравни входы именно в строке с ошибкой.':
    'Describe AND and go through all four rows. If the check fails, compare the inputs in the row with the error.',
  'Одинаковые или разные?': 'Equal or different?',
  'Различай OR и XOR.': 'Tell OR and XOR apart.',
  'Обрати внимание на строку a = 1, b = 1.': 'Pay attention to the row a = 1, b = 1.',
  'XOR даёт единицу только для 01 и 10.': 'XOR gives one only for 01 and 10.',
  'Замените | на ^: assign y = a ^ b;': 'Replace | with ^: assign y = a ^ b;',
  'Сигнал различия': 'A difference signal',
  'OR (|) даёт 1, если хотя бы один вход равен 1. XOR (^) даёт 1, если однобитовые входы различаются. Их различает случай 11: OR = 1, XOR = 0.':
    'OR (|) gives 1 if at least one input is 1. XOR (^) gives 1 if the one-bit inputs differ. The case 11 tells them apart: OR = 1, XOR = 0.',
  'Сломанный вариант полезен': 'A broken version is useful',
  'В лаборатории уже стоит OR. Он успешно проходит три строки из четырёх, поэтому легко обмануться. Исправление нужно проверить на всей таблице, особенно на двух единицах.':
    'The lab already has an OR in place. It passes three rows out of four, so it is easy to be fooled. The fix must be checked on the whole table, especially on two ones.',
  'Какой выход a ^ b при a = 1 и b = 1?': 'What is the output of a ^ b when a = 1 and b = 1?',
  'Верно: уровни одинаковы, различия нет.':
    'Correct: the levels are the same, so there is no difference.',
  'Это результат OR. XOR отключён, когда однобитовые входы одинаковы.':
    'That is the result of OR. XOR is off when the one-bit inputs are equal.',
  'Нужен сброс': 'A reset is needed',
  'У комбинационного элемента нет прошлого состояния для сброса.':
    'A combinational element has no previous state to reset.',
  'Почини детектор различия. По отчёту проверь, что случай 11 больше не ошибается.':
    'Fix the difference detector. Use the report to check that the case 11 no longer fails.',
  'Число из нескольких битов': 'A number of several bits',
  'Ширина, константы и переполнение.': 'Width, constants and overflow.',
  'На выходе четыре бита, поэтому допустимы числа 0…15.':
    'The output has four bits, so the numbers 0…15 are allowed.',
  "Запись 4'd1 означает ширина 4, десятичный формат, значение 1.":
    "The notation 4'd1 means width 4, decimal format, value 1.",
  "Нужное выражение: data + 4'd1. При 15 результат обрежется до 0000.":
    "The needed expression: data + 4'd1. At 15 the result is truncated to 0000.",
  'Шина — группа проводов': 'A bus is a group of wires',
  '[3:0] задаёт четыре бита: 3, 2, 1, 0. Бит 0 — младший. Четыре бита представляют 16 беззнаковых значений от 0 до 15. Это четыре параллельных провода, а не отдельный программный объект.':
    '[3:0] sets four bits: 3, 2, 1, 0. Bit 0 is the least significant. Four bits represent 16 unsigned values from 0 to 15. These are four parallel wires, not a separate program object.',
  'Назови ширину явно': 'State the width explicitly',
  "В 4'b0011 число 4 — ширина, b — двоичный формат, 0011 — цифры. Та же тройка записывается 4'd3. После сложения результат в четырёхбитовом выходе тоже имеет четыре бита.":
    "In 4'b0011 the number 4 is the width, b is the binary format, 0011 are the digits. The same value is written 4'd3. After the addition the result in a four-bit output also has four bits.",
  'Число не помещается': 'The number does not fit',
  'Какой четырёхбитовый выход получается при 15 + 1?': 'What four-bit output do we get for 15 + 1?',
  'Верно: 10000 требует пяти битов, старший бит отбрасывается.':
    'Correct: 10000 needs five bits, the most significant bit is dropped.',
  'Это полная пятибитовая сумма. Наш выход объявлен [3:0], поэтому пятый бит не сохранится.':
    'That is the full five-bit sum. Our output is declared [3:0], so the fifth bit is not kept.',
  'Обычное сложение не ограничивает значение сверху: оно переполняется по ширине выхода.':
    'Ordinary addition does not limit the value from above: it overflows at the width of the output.',
  'Сделай прибавитель единицы без памяти. Проверка подаст все 16 значений, включая границу диапазона.':
    'Make an incrementer without memory. The check will feed all 16 values, including the edge of the range.',
  'Переключатель маршрута': 'A route switch',
  'Выбери один из двух источников.': 'Choose one of two sources.',
  'При select = 0 нужно a; при select = 1 — b.': 'With select = 0 you need a; with select = 1, b.',
  'Запись условие ? значение_при_1 : значение_при_0.':
    'The form is condition ? value_if_1 : value_if_0.',
  'Нужное выражение: select ? b : a.': 'The needed expression: select ? b : a.',
  'Данные и управление': 'Data and control',
  'Мультиплексор передаёт один выбранный вход на выход. a и b — данные, select — управление. Управление не обязано быть тактом: это обычный вход комбинационной схемы.':
    'A multiplexer passes one chosen input to the output. a and b are data, select is control. The control does not have to be a clock: it is an ordinary input of a combinational circuit.',
  'Почему восемь проверок?': 'Why eight checks?',
  'У схемы три однобитовых входа: a, b, select. Всего 2 × 2 × 2 = 8 сочетаний. Если проверить только a = b, перепутанный выбор останется незаметным.':
    'The circuit has three one-bit inputs: a, b, select. In total 2 × 2 × 2 = 8 combinations. If you check only a = b, a mixed-up selection will go unnoticed.',
  'Какой источник выбран?': 'Which source is chosen?',
  'select = 1, a = 0, b = 1. Какой выход?': 'select = 1, a = 0, b = 1. What is the output?',
  'Верно: select = 1 выбирает b, а b равен 1.': 'Correct: select = 1 chooses b, and b is 1.',
  'Так получилось бы при выборе a. Порядок у ?: — сначала ветка для единицы.':
    'That is what we would get when choosing a. The order in ?: is the branch for one first.',
  'Это AND, а здесь нужно передать целиком выбранный сигнал.':
    'That is AND, but here the chosen signal must be passed through whole.',
  'Собери MUX и пройди восемь сочетаний. Найди вход выбора S на схеме RTL.':
    'Build a MUX and go through the eight combinations. Find the select input S on the RTL schematic.',
  'Зажги выбранную лампу': 'Light the chosen lamp',
  'case, always @* и все варианты выхода.': 'case, always @* and all the output variants.',
  'У двухбитового code четыре значения: 0, 1, 2, 3.': 'A two-bit code has four values: 0, 1, 2, 3.',
  'LED платы активны низким уровнем: для LED2 нужен ноль в бите 2.':
    "The board's LEDs are active low: for LED2 you need a zero in bit 2.",
  'Выбери по числу': 'Choose by number',
  'case сравнивает code с перечисленными значениями. Комбинационный always @* пересчитывает выход при изменении любого используемого входа. Внутри него используем =. output reg нужен для присваивания из always, но здесь не возникает фронтового регистра.':
    'case compares code with the listed values. A combinational always @* recalculates the output when any used input changes. Inside it we use =. output reg is needed for assignment from always, but no edge-triggered register appears here.',
  "always @* begin\n    case (code)\n        2'd0: led_n = 4'b1110;\n        // Остальные значения\n        default: led_n = 4'b1111;\n    endcase\nend":
    "always @* begin\n    case (code)\n        2'd0: led_n = 4'b1110;\n        // The other values\n        default: led_n = 4'b1111;\n    endcase\nend",
  'Опиши каждую дорогу': 'Describe every road',
  'Если для части входов не присвоить выход, схеме придётся хранить предыдущее значение: появится защёлка (latch). Это память без фронтового управления. Чтобы построить обычную комбинационную логику, присваиваем полный выход в каждой ветке, включая default. Здесь ровно один ноль включает выбранный физический LED.':
    'If the output is not assigned for some of the inputs, the circuit has to keep the previous value: a latch appears. It is memory without edge control. To build ordinary combinational logic, assign the whole output in every branch, including default. Here exactly one zero turns on the chosen physical LED.',
  'Где спряталась память?': 'Where did the memory hide?',
  'Что может появиться, если комбинационный always не задаёт выход для части входов?':
    'What may appear if a combinational always does not set the output for some of the inputs?',
  'Защёлка, хранящая прошлое значение': 'A latch that stores the past value',
  'Верно. Неописанный путь оставляет старое значение и требует памяти.':
    'Correct. An undescribed path leaves the old value and requires memory.',
  'Ноль во всех пропущенных случаях': 'A zero in all the missed cases',
  'Verilog не подставляет ноль сам. Значение останется прежним; задавай его явно.':
    'Verilog does not insert a zero by itself. The value stays the same; set it explicitly.',
  'Обычный триггер с тактом': 'An ordinary flip-flop with a clock',
  'Здесь нет posedge и тактового входа. Скрытая память будет защёлкой.':
    'There is no posedge or clock input here. The hidden memory will be a latch.',
  'Допиши отсутствующую ветку case для code = 2. Проверка пройдёт четыре выбора. В .cst назначены две штатные кнопки и четыре LED.':
    'Finish the missing case branch for code = 2. The check will go through the four choices. In the .cst two on-board buttons and four LEDs are assigned.',
  'always, posedge, <=, reset и enable.': 'always, posedge, <=, reset and enable.',
  'Вспомни: новый q нужен только при enable = 1.':
    'Remember: a new q is needed only when enable = 1.',
  'Внутри always @(posedge clk) используют неблокирующее присваивание <=.':
    'Inside always @(posedge clk) use the nonblocking assignment <=.',
  'В ветке else if (enable) нужно q <= data; отсутствие ветки else сохраняет q.':
    'In the else if (enable) branch you need q <= data; the absence of an else branch keeps q.',
  'Добавь время': 'Add time',
  'Регистр хранит значение между тактами. always @(posedge clk) описывает изменение на переходе clk из 0 в 1. output reg позволяет присваивать из always; именно фронтовый блок в этом примере создаёт память. Слово reg само по себе не гарантирует триггер.':
    'A register keeps a value between clocks. always @(posedge clk) describes a change at the transition of clk from 0 to 1. output reg allows assignment from always; it is the edge-triggered block in this example that creates the memory. The word reg by itself does not guarantee a flip-flop.',
  'Все регистры видят старые значения': 'All registers see the old values',
  'Неблокирующее <= планирует обновление регистра после обработки фронта. При q1 <= data; q2 <= q1; второй регистр получает прежний q1. Это позволяет описать цепочку регистров. Для комбинационного always @* обычно используют =.':
    'The nonblocking <= schedules the register update after the edge is processed. With q1 <= data; q2 <= q1; the second register gets the previous q1. This makes it possible to describe a chain of registers. For a combinational always @* the = sign is usually used.',
  'Сброс и разрешение': 'Reset and enable',
  'Сначала if (reset) возвращает q в 0. Затем else if (enable) разрешает запись data. Сброс синхронный: действует на фронте clk. Если оба управления равны 0, присваивания нет и регистр хранит прошлое значение.':
    'First if (reset) returns q to 0. Then else if (enable) allows writing data. The reset is synchronous: it acts on the edge of clk. If both controls are 0, there is no assignment and the register keeps its past value.',
  'Изменился только вход': 'Only the input changed',
  'reset = 0, enable = 0. data изменился с 1 на 0. Что делает q?':
    'reset = 0, enable = 0. data changed from 1 to 0. What does q do?',
  'Хранит прежнее значение': 'Keeps the previous value',
  'Верно. Без enable загрузки нет даже на следующем фронте.':
    'Correct. Without enable there is no load even on the next edge.',
  'Сразу меняется на 0': 'Changes to 0 immediately',
  'Так работал бы провод assign q = data. Здесь регистр и разрешение записи.':
    'That is how the wire assign q = data would work. Here there is a register and a write enable.',
  'Сбросится на фронте': 'Resets on the edge',
  'Сброс сработает при reset = 1. Сейчас он выключен.':
    'The reset acts when reset = 1. Right now it is off.',
  'Почини запись data. Проверка специально меняет data на паузе: q должен сохранить значение. Изучи фронты clk и уровни q на диаграмме.':
    'Fix the writing of data. The check deliberately changes data during the pause: q must keep its value. Study the clk edges and the levels of q on the diagram.',
  'Соедини память и сложение.': 'Combine memory and addition.',
  'Сброс устанавливает 0; enable разрешает следующий шаг.':
    'Reset sets 0; enable allows the next step.',
  'Правая часть использует старый count.': 'The right-hand side uses the old count.',
  "Замените count <= count; на count <= count + 4'd1;":
    "Replace count <= count; with count <= count + 4'd1;",
  'Посчитай события': 'Count the events',
  'Счётчик — регистр, новое значение которого зависит от старого. На каждом разрешённом фронте он записывает count + 1. Пауза хранит count. В отличие от предыдущего прибавителя, результат теперь зависит от истории.':
    'A counter is a register whose new value depends on the old one. On every enabled edge it writes count + 1. A pause keeps count. Unlike the previous incrementer, the result now depends on history.',
  'Такт симуляции и настоящая плата': 'Simulation clock and the real board',
  'В лаборатории период равен 10 нс — удобно изучать несколько фронтов. На Tang Nano 20K кварц даёт 27 МГц. Младшие биты быстрого счётчика глазом не различить; для заметной индикации выбирают старшие биты или делят частоту. Переполнение четырёх битов возвращает значение к нулю.':
    'In the lab the period is 10 ns, which is convenient for studying several edges. On the Tang Nano 20K the crystal gives 27 MHz. The low bits of a fast counter cannot be told apart by eye; for visible indication you pick the high bits or divide the frequency. The overflow of four bits returns the value to zero.',
  'Сохрани значение': 'Keep the value',
  'count = 3, enable = 0, reset = 0. Что будет после следующего posedge clk?':
    'count = 3, enable = 0, reset = 0. What will happen after the next posedge clk?',
  'Верно. Счётчик стоит на паузе.': 'Correct. The counter is paused.',
  'Прибавление разрешено только при enable = 1.': 'Adding is allowed only when enable = 1.',
  'Сброс имеет приоритет, но сейчас reset равен 0.':
    'Reset has priority, but right now reset is 0.',
  'Допиши шаг счётчика. Проверь сброс, два шага, паузу и продолжение. Прохождение одних тактов без паузы ещё не доказывает правильность.':
    'Finish the counter step. Check the reset, two steps, the pause and the continuation. Passing clocks without a pause does not yet prove correctness.',
  'Собери светофор': 'Build a traffic light',
  'Первый автомат состояний и итоговая лаборатория.': 'The first state machine and the final lab.',
  'Три состояния образуют круг: RED → GREEN → YELLOW → RED.':
    'Three states form a circle: RED → GREEN → YELLOW → RED.',
  'Память state обновляется только на разрешённом фронте; lights вычисляется отдельно.':
    'The state memory is updated only on an enabled edge; lights is computed separately.',
  'В ветке GREEN замените state <= GREEN; на state <= YELLOW;':
    'In the GREEN branch replace state <= GREEN; with state <= YELLOW;',
  'Состояние хранит текущую фазу': 'The state stores the current phase',
  'Автомат состояний (FSM) хранит состояние и выбирает следующее. У светофора три фазы: RED, GREEN, YELLOW. localparam даёт числам понятные имена. Регистр state — память фазы.':
    'A state machine (FSM) stores a state and chooses the next one. A traffic light has three phases: RED, GREEN, YELLOW. localparam gives the numbers readable names. The register state is the memory of the phase.',
  'Отдели память от выходов': 'Separate memory from outputs',
  'Фронтовый always обновляет state. Комбинационный always @* по state выставляет lights: 001 — красный, 100 — зелёный, 010 — жёлтый. Каждая ветка присваивает весь выход, поэтому не нужна скрытая память. default задаёт безопасное поведение для неиспользованного кода.':
    'The edge-triggered always updates state. The combinational always @* sets lights from state: 001 is red, 100 is green, 010 is yellow. Every branch assigns the whole output, so no hidden memory is needed. default sets safe behavior for an unused code.',
  'Что нужно хранить?': 'What needs to be stored?',
  'Какая часть этого светофора должна помнить прошлый такт?':
    'Which part of this traffic light must remember the previous clock?',
  'state — текущая фаза': 'state, the current phase',
  'Верно. По сохранённой фазе выбирается следующий переход.':
    'Correct. The next transition is chosen from the stored phase.',
  'localparam — постоянное имя числа, оно не обновляется на тактах.':
    'localparam is a constant name of a number; it is not updated on clocks.',
  'Каждая строка assign': 'Every assign line',
  'Непрерывное присваивание не хранит историю. Здесь память нужна для состояния.':
    'A continuous assignment keeps no history. Here memory is needed for the state.',
  'Почини переход GREEN → YELLOW. Проверка пройдёт два круга и паузу. Затем исследуй RTL и объясни себе, где память состояния и где логика ламп. Это учебная модель; настоящий дорожный светофор требует иных гарантий и проверки.':
    'Fix the GREEN → YELLOW transition. The check will go through two rounds and a pause. Then explore the RTL and explain to yourself where the state memory is and where the lamp logic is. This is a teaching model; a real road traffic light requires other guarantees and verification.',
  'Кнопка на настоящей плате': 'A button on a real board',
  'Логическая 1, включённая лампа и контакт корпуса — разные вещи.':
    'A logic 1, a lit lamp and a package pin are different things.',
  'При нажатии button = 1. LED включается при led_n = 0.':
    'When pressed, button = 1. The LED turns on at led_n = 0.',
  'Нужна таблица 0 → 1, 1 → 0.': 'You need the table 0 → 1, 1 → 0.',
  'Поставь инвертор: assign led_n = ~button;': 'Put in an inverter: assign led_n = ~button;',
  'Почему светится при нуле': 'Why it lights at zero',
  'На Tang Nano 20K кнопка даёт 1 при нажатии, а LED включается при 0. Поэтому прямой провод включает LED при отпущенной кнопке, а инвертор — при нажатой. Суффикс _n обозначает активный низкий смысл сигнала, сам по себе имя не меняет поведение.':
    'On the Tang Nano 20K the button gives 1 when pressed, and the LED turns on at 0. So a direct wire turns the LED on when the button is released, and an inverter turns it on when pressed. The suffix _n marks the active-low meaning of a signal; the name itself does not change the behavior.',
  'Свяжи имя с железом': 'Connect the name with the hardware',
  'Verilog описывает поведение button и led_n. CST связывает эти имена с контактами корпуса: S1 на 88, LED0 на 15. Открой «Выводы», выбери led_n в таблице и найди контакт 15. Масштаб и перемещение помогают рассмотреть карту. Назначения на ней записываются в CST.':
    'Verilog describes the behavior of button and led_n. The CST connects these names with package pins: S1 to 88, LED0 to 15. Open "Pins", choose led_n in the table and find pin 15. Zoom and pan help you look over the map. The assignments on it are written to the CST.',
  'Предскажи лампу': 'Predict the lamp',
  'button = 1, led_n = ~button. Что происходит со штатным LED?':
    'button = 1, led_n = ~button. What happens to the on-board LED?',
  'Горит: led_n = 0': 'It is on: led_n = 0',
  'Верно: инвертор дал активный низкий уровень.':
    'Correct: the inverter produced an active-low level.',
  'Не горит: единица всегда означает свет': 'It is off: one always means light',
  'На этой плате ток через LED возникает при нуле на выводе FPGA.':
    'On this board current flows through the LED when the FPGA pin is at zero.',
  'Имя led_n само инвертирует уровень': 'The name led_n inverts the level itself',
  'Суффикс — подсказка человеку. Инверсию задаёт операция ~.':
    'The suffix is a hint for a human. Inversion is set by the ~ operation.',
  'Замени прямую связь инвертором. Проверка подаст оба уровня кнопки. Затем открой RTL и назначения выводов. Симуляция подтверждает поведение логики; фактическое подключение к плате задаёт CST.':
    'Replace the direct connection with an inverter. The check will apply both button levels. Then open RTL and the pin assignments. The simulation confirms the behavior of the logic; the actual connection to the board is set by the CST.',
  'Сколько длится один период?': 'How long is one period?',
  'Увеличь период выхода вчетверо с помощью бита счётчика.':
    'Make the output period four times longer using a counter bit.',
  'Полный период включает и высокий, и низкий уровень.':
    'A full period includes both the high and the low level.',
  'count[0] меняется каждый фронт: его полный период — два входных такта.':
    'count[0] changes on every edge: its full period is two input clocks.',
  'Для четырёх тактов выбери count[1]: assign led_n = ~count[1];':
    'For four clocks choose count[1]: assign led_n = ~count[1];',
  'Период и частота': 'Period and frequency',
  'Период T — время одного полного повторения. Частота f = 1/T. Например, при 27 МГц период входа около 37,04 нс. В лаборатории симулятор задаёт 10 нс для удобства диаграммы; CST не меняет эту настройку симулятора.':
    'The period T is the time of one full repetition. The frequency is f = 1/T. For example, at 27 MHz the input period is about 37.04 ns. In the lab the simulator sets 10 ns for the convenience of the diagram; the CST does not change this simulator setting.',
  'Двоичный счётчик делит такт': 'A binary counter divides the clock',
  'count[0] проходит 0,1,0,1: полный период два такта. count[1] проходит 0,0,1,1: полный период четыре такта. Это сигналы для наблюдения, а регистры устройства продолжают работать от исходного clk.':
    "count[0] goes 0,1,0,1: the full period is two clocks. count[1] goes 0,0,1,1: the full period is four clocks. These are signals for observation, while the device's registers keep running from the original clk.",
  'Не перепутай фронт с периодом': 'Do not confuse an edge with a period',
  'Бит меняет уровень раз в два такта. Сколько тактов в его полном периоде?':
    'A bit changes level once every two clocks. How many clocks are in its full period?',
  'Верно: два такта в 0 и два такта в 1.': 'Correct: two clocks at 0 and two clocks at 1.',
  'Через два такта уровень только сменился. Для полного повторения нужна ещё одна смена.':
    'After two clocks the level has only changed. For a full repetition one more change is needed.',
  'Один такт — период входного clk, а выход меняется реже.':
    'One clock is the period of the input clk, and the output changes less often.',
  'Выбери бит для деления на 4. Диаграмма должна показать два периода с высоким уровнем, затем два с низким. На настоящей плате 6,75 МГц глаз не различит: для медленной мигалки нужен более широкий счётчик и старший бит.':
    'Choose the bit for dividing by 4. The diagram must show two periods at the high level, then two at the low level. On a real board you cannot see 6.75 MHz by eye: for a slow blinker you need a wider counter and its most significant bit.',
  'Неизвестный урок.': 'Unknown lesson.',
  'Сначала завершите предыдущий урок.': 'Finish the previous lesson first.',
  'Этот ответ не относится к текущему вопросу.':
    'This answer does not belong to the current question.',
  'Пройдите текущий вопрос или проверку устройства.':
    'Pass the current question or the device check.',
  'Для завершения нужны все вопросы и проверка устройства.':
    'All questions and the device check are needed to finish.',
  'Нужен результат симуляции учебного проекта.':
    'A simulation result of the teaching project is needed.',
  'У светодиода один сигнальный вывод. Когда на нём 1, светодиод горит.':
    'An LED has one signal pin. When there is a 1 on it, the LED is lit.',
  'Возьми с полки два светодиода и каждый соедини с платой отдельным проводом.':
    'Take two LEDs from the shelf and connect each to the board with a separate wire.',
  'Каждый цвет горит, когда на его выводе 1. Подключи все три вывода к трём разным контактам платы.':
    'Each color is lit when there is a 1 on its pin. Connect all three pins to three different pins of the board.',
  'У детали три сигнальных вывода: R, G и B, по одному на цвет. Общий вывод (катод или анод) на столе подключён сам, в свойствах детали выбирают, при 1 или при 0 цвет горит.':
    "The part has three signal pins: R, G and B, one per color. The common pin (cathode or anode) is connected on the bench by itself; in the part's properties you choose whether the color lights at 1 or at 0.",
  'Две детали, у каждой по одному сигнальному выводу. Каждый вывод идёт к своему контакту платы, а связь между ними создаёт схема внутри платы, не провод между деталями.':
    'Two parts, each with one signal pin. Each pin goes to its own board pin, and the link between them is made by the circuit inside the board, not by a wire between the parts.',
  'У тумблера один сигнальный вывод OUT, он идёт к контакту платы, на который назначен вход схемы.':
    "The toggle switch has one signal pin OUT, it goes to the board pin to which the circuit's input is assigned.",
  'Один сигнальный вывод OUT, он идёт к контакту платы. Положение клавиши сохраняется.':
    'One signal pin OUT, it goes to a board pin. The position of the key is kept.',
  'Единственный сигнальный вывод OUT соединяют с контактом платы.':
    'The only signal pin OUT is connected to a board pin.',
  'У каждого движка свой выход (на столе по умолчанию четыре: 1, 2, 3, 4). Каждый выход идёт к своему контакту платы, и схема видит их как разряды одной шины.':
    'Each slider has its own output (on the bench by default there are four: 1, 2, 3, 4). Each output goes to its own board pin, and the circuit sees them as bits of one bus.',
  'Чтобы нарисовать цифру, нужно включить нужные сегменты: для «1» это b и c. Всего у детали восемь входов: a, b, c, d, e, f, g, dp. Каждый идёт к своему контакту платы. Общий вывод на столе подключён сам.':
    'To draw a digit you need to turn on the right segments: for "1" these are b and c. The part has eight inputs in all: a, b, c, d, e, f, g, dp. Each goes to its own board pin. The common pin on the bench is connected by itself.',
  'У зуммера один сигнальный вход S. Его соединяют с контактом платы, на который схема выдаёт звуковой сигнал.':
    'The buzzer has one signal input S. It is connected to the board pin on which the circuit outputs the sound signal.',
  'На столе по умолчанию восемь светодиодов (число меняется в свойствах от 4 до 10). Каждому нужен свой провод к своему контакту платы.':
    'On the bench by default there are eight LEDs (the number is changed in the properties from 4 to 10). Each needs its own wire to its own board pin.',
  'Комбинация {n}': 'Combination {n}',
  'После фронта {n}': 'After edge {n}',
  'Случай {n}': 'Case {n}',
  'Проверка {n}': 'Check {n}',
  'Строка {n}': 'Row {n}',
  'Такт {n}': 'Clock {n}',
  'Цифра {n}': 'Digit {n}',
  'Код {n}': 'Code {n}',
  'Число {n}': 'Number {n}',
  'Позиция {n}': 'Position {n}',
};
