import type { ModuleVariant } from '../../../shared/pin-layout';
import { radioPackage } from './board-packages';
// What sits on each development board, so the bench can name a part when the pointer rests on it.
// Rectangles are in the board's own frame (millimetres, x along the long edge, z across it,
// origin at the centre) and mirror the geometry that buildBoard draws.
import { type McuBoardId } from '../../../shared/mcu';

export interface BoardPart {
  id: string;
  title: string;
  detail: string;
  /** Centre and size of the footprint in board millimetres. */
  x: number;
  z: number;
  w: number;
  d: number;
  /** Height of the top of the part above the board surface, for the highlight. */
  h: number;
}
type Info = { id: string; title: string; detail: string; h?: number };
/** Footprints are padded to a few millimetres so that small parts can still be pointed at. */
const at = (info: Info, x: number, z: number, w: number, d: number): BoardPart => ({
  h: 3,
  ...info,
  x,
  z,
  w: Math.max(w, 3),
  d: Math.max(d, 3),
});

const unoPins = {
  digital: {
    id: 'digital',
    title: 'Цифровые выводы 0–13',
    detail: 'Вход или выход: HIGH 5 В или LOW 0 В. ~ — ШИМ. Выводы 0 и 1 заняты Serial.',
  },
  power: {
    id: 'power',
    title: 'Питание: 5V, 3V3, GND, VIN',
    detail: 'Питание для схемы. GND — общий минус, его нужно соединить со всеми деталями.',
  },
  analog: {
    id: 'analog',
    title: 'Аналоговые входы A0–A5',
    detail: 'Измеряют напряжение 0–5 В (analogRead, 0–1023). Могут работать и как цифровые.',
  },
};
const resetButton: Info = {
  id: 'reset',
  title: 'Кнопка RESET',
  detail: 'Перезапускает программу с самого начала: выполняется setup().',
  h: 2,
};
const crystal16: Info = {
  id: 'crystal',
  title: 'Кварц 16 МГц',
  detail: 'Задаёт частоту работы микроконтроллера: 16 миллионов тактов в секунду.',
};
const regulator = (volts: string, detail: string): Info => ({
  id: 'regulator',
  title: `Стабилизатор ${volts}`,
  detail,
  h: 2,
});
const led = (id: string, title: string, detail: string): Info => ({ id, title, detail, h: 1 });

/** Components of a board, smallest first so that a pointer on a part never lands on its neighbour. */
export function boardParts(
  board: McuBoardId,
  width: number,
  _depth: number,
  variant?: ModuleVariant,
): BoardPart[] {
  const left = -width / 2;
  if (board === 'tangnano20k')
    return [
      at(
        led('led-pwr', 'Светодиод питания', 'Горит, когда на плату подано питание.'),
        left + 8,
        -8.4,
        2,
        1,
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        at(
          led(
            `led${i}`,
            `LED${i}`,
            'Светодиод платы. Подключён к выводу ПЛИС и горит, когда на нём 0: светодиод включён между питанием и выводом.',
          ),
          left + 16.6 + i * 2.7,
          -8,
          2.4,
          1.8,
        ),
      ),
      at(
        {
          id: 's1',
          title: 'Кнопка S1',
          detail: 'Подключена к выводу 88: нажатая даёт 1, отпущенная — 0.',
          h: 2,
        },
        left + 12.5,
        6.8,
        4.4,
        3.4,
      ),
      at(
        {
          id: 's2',
          title: 'Кнопка S2',
          detail: 'Подключена к выводу 87: нажатая даёт 1, отпущенная — 0.',
          h: 2,
        },
        left + 12.5,
        -6.8,
        4.4,
        3.4,
      ),
      at(
        {
          id: 'usb',
          title: 'Разъём USB Type-C',
          detail:
            'Питание платы и связь с компьютером: отладчик BL616 грузит схему и даёт порт UART.',
          h: 3.3,
        },
        left + 4.2,
        0,
        7.5,
        9,
      ),
      at(
        {
          id: 'bl616',
          title: 'Микросхема BL616',
          detail:
            'USB-отладчик: загружает схему в ПЛИС по JTAG и даёт UART для связи с компьютером.',
          h: 1,
        },
        left + 12.8,
        0,
        4.6,
        4.6,
      ),
      at(
        {
          id: 'fpga',
          title: 'ПЛИС Gowin GW2AR-18',
          detail:
            '20 736 логических ячеек (LUT4), блочная память и ПЛЛ: здесь работает ваша схема.',
          h: 1.5,
        },
        left + 22,
        0,
        11.2,
        11.2,
      ),
      at(
        {
          id: 'flash',
          title: 'Флеш-память',
          detail: 'Хранит схему, чтобы после включения питания плата загрузила её сама.',
          h: 1,
        },
        left + 33,
        -5.6,
        3.6,
        3.6,
      ),
      at(
        {
          id: 'fpc',
          title: 'Разъём FPC',
          detail: 'Гибкий шлейф: сюда подключают экран RGB.',
          h: 2.2,
        },
        width / 2 - 21.5,
        6.2,
        24,
        6.2,
      ),
      at(
        {
          id: 'hdmi',
          title: 'Разъём HDMI',
          detail: 'Выход видео: схема сама формирует сигнал для монитора.',
          h: 6.6,
        },
        width / 2 - 5.2,
        0,
        14.8,
        15.5,
      ),
    ];
  if (board === 'uno')
    return [
      at(resetButton, left + 7, -22, 6, 6),
      at(
        led(
          'led-l',
          'Светодиод L',
          'Подключён к выводу 13. Горит при digitalWrite(13, HIGH) — это LED_BUILTIN.',
        ),
        -4,
        -16,
        3,
        3,
      ),
      at(
        led(
          'led-tx',
          'Светодиод TX',
          'Мигает, когда плата передаёт данные в компьютер по USB (Serial.print).',
        ),
        -0.8,
        -16,
        3,
        3,
      ),
      at(
        led('led-rx', 'Светодиод RX', 'Мигает, когда плата принимает данные от компьютера по USB.'),
        2.4,
        -16,
        3,
        3,
      ),
      at(led('led-on', 'Светодиод ON', 'Горит, когда на плату подано питание.'), 22, -2, 3, 3),
      at(crystal16, -6, -2, 10, 4),
      at(
        {
          id: 'resonator',
          title: 'Кварц USB-микросхемы',
          detail: 'Тактирует микросхему ATmega16U2, которая отвечает за связь по USB.',
          h: 1.5,
        },
        11,
        -16.5,
        3.6,
        1.8,
      ),
      at(
        {
          id: 'usb-chip',
          title: 'Микросхема ATmega16U2',
          detail:
            'Переводит USB в последовательный порт: через неё грузится код и работает Serial.',
          h: 1.5,
        },
        -15.5,
        -9,
        7.1,
        7.1,
      ),
      at(
        {
          id: 'icsp2',
          title: 'Разъём ICSP микросхемы USB',
          detail: 'Программирование ATmega16U2 напрямую. Для обычной работы не нужен.',
          h: 8,
        },
        20,
        -18.5,
        8,
        4,
      ),
      at(
        {
          id: 'icsp',
          title: 'Разъём ICSP микроконтроллера',
          detail: 'Программирование ATmega328P напрямую, без загрузчика.',
          h: 8,
        },
        28.8,
        2,
        6.5,
        9,
      ),
      at(
        {
          id: 'fuse',
          title: 'Предохранитель',
          detail: 'Самовосстанавливающийся: отключает плату при коротком замыкании по USB.',
          h: 1,
        },
        -19.5,
        -2.6,
        3.4,
        1.9,
      ),
      at(
        {
          id: 'diode',
          title: 'Защитный диод',
          detail: 'Не даёт сжечь плату, если внешнее питание подключено наоборот.',
          h: 1.8,
        },
        -26,
        4.5,
        4.4,
        2.7,
      ),
      at(
        regulator('5 В', 'Из входных 7–12 В делает ровные 5 В для микроконтроллера и всей схемы.'),
        -18,
        6,
        7,
        4,
      ),
      at(
        {
          id: 'capacitors',
          title: 'Конденсаторы питания',
          detail: 'Сглаживают скачки напряжения, чтобы плата работала стабильно.',
          h: 7,
        },
        left + 20.5,
        18,
        13.5,
        7,
      ),
      at(
        {
          id: 'mcu',
          title: 'Микроконтроллер ATmega328P',
          detail: 'Мозг платы: выполняет вашу программу. 32 КБ флеш-памяти, 2 КБ ОЗУ, 16 МГц.',
          h: 5,
        },
        12.5,
        10,
        35,
        9,
      ),
      at(
        {
          id: 'usb',
          title: 'USB-разъём',
          detail: 'Подключается к компьютеру: питает плату и загружает в неё программу.',
          h: 11,
        },
        left + 6,
        -11,
        16,
        12,
      ),
      at(
        {
          id: 'jack',
          title: 'Разъём питания',
          detail: 'Внешнее питание 7–12 В от адаптера, если плата работает без компьютера.',
          h: 11,
        },
        left + 5.5,
        16,
        14,
        9,
      ),
      at(unoPins.digital, 7, -24.13, 47, 5),
      at(unoPins.power, 2.5, 24.13, 21, 5),
      at(unoPins.analog, 22.9, 24.13, 15, 5),
    ];
  if (board === 'nano')
    return [
      at(resetButton, 2.8, 0, 4.4, 3.4),
      at(led('led-l', 'Светодиод L', 'Подключён к выводу 13 (LED_BUILTIN).'), 7.4, 1.55, 2, 1),
      at(led('led-on', 'Светодиод питания', 'Горит, когда подано питание.'), 7.4, 4.65, 2, 1),
      at(led('led-tx', 'Светодиод TX', 'Передача данных в компьютер.'), 7.4, -4.65, 2, 1),
      at(led('led-rx', 'Светодиод RX', 'Приём данных от компьютера.'), 7.4, -1.55, 2, 1),
      at(crystal16, -1, -4.7, 4.5, 4.5),
      at(
        {
          id: 'icsp',
          title: 'Разъём ICSP',
          detail: 'Программирование ATmega328P напрямую, без загрузчика.',
          h: 8,
        },
        19.96,
        0,
        5.1,
        7.62,
      ),
      at(
        {
          id: 'mcu',
          title: 'Микроконтроллер ATmega328P',
          detail:
            'TQFP-32: выполняет вашу программу. USB-мост FT232RL и стабилизатор находятся с обратной стороны.',
          h: 1.2,
        },
        -5.5,
        0,
        9.9,
        9.9,
      ),
      at(
        {
          id: 'usb',
          title: 'Разъём Mini-B USB',
          detail: 'Питание и загрузка программы через USB-мост FT232RL.',
          h: 4,
        },
        left + 3.5,
        0,
        7.5,
        8,
      ),
    ];
  const s3 = board === 'esp32s3',
    buttonX = left + (s3 ? 10.4 : 3.8),
    radio = radioPackage(board as 'esp32' | 'esp32s3', variant),
    moduleEnd = radio.end;
  const usb = (id: string, title: string, z: number) =>
    at({ id, title, detail: 'Питание, прошивка и связь по USB.', h: 2.8 }, left + 3.8, z, 7.5, 7.5);
  return [
    at(
      {
        id: 'en',
        title: s3 ? 'Кнопка RESET' : 'Кнопка EN',
        detail: 'Сброс платы и перезапуск программы.',
        h: 1.8,
      },
      buttonX,
      -8.3,
      4.4,
      3.4,
    ),
    at(
      {
        id: 'boot',
        title: 'Кнопка BOOT',
        detail: 'Удерживается при сбросе для перехода в загрузчик.',
        h: 1.8,
      },
      buttonX,
      8.3,
      4.4,
      3.4,
    ),
    at(
      led(
        'led-pwr',
        'Светодиод питания',
        s3 ? 'Индикатор питания 3,3 В.' : 'Индикатор питания 5 В.',
      ),
      left + (s3 ? 17.5 : 12),
      -8.3,
      2,
      1,
    ),
    ...(s3
      ? [
          at(
            led(
              'rgb-led',
              'Адресный RGB LED · GPIO48',
              'На выбранной ревизии v1.0 RGB-светодиод подключён к GPIO48. Это не обычный LED на GPIO2.',
            ),
            left + 20,
            7.5,
            3.5,
            3.5,
          ),
        ]
      : []),
    at(
      regulator('3,3 В', 'Преобразует входные 5 В в питание модуля.'),
      left + (s3 ? 23 : 20),
      0,
      6.5,
      7,
    ),
    at(
      {
        id: 'usb-chip',
        title: s3 ? 'USB-UART мост CP2102N' : 'USB-UART мост CP2102',
        detail: 'Преобразует USB в UART для загрузки кода и Serial.',
        h: 1,
      },
      left + (s3 ? 14.5 : 10.5),
      0,
      s3 ? 3 : 5,
      s3 ? 3 : 5,
    ),
    at(
      {
        id: 'antenna',
        title: 'Печатная антенна',
        detail:
          'Часть радиомодуля без металлического экрана. У DevKitC V4 выступает за основную PCB.',
        h: 0.8,
      },
      moduleEnd - 3.75,
      0,
      7.5,
      18,
    ),
    at(
      {
        id: 'mcu',
        title: radio.title,
        detail: s3
          ? 'Модуль Xtensa LX7 с металлическим RF-экраном.'
          : 'Модуль Xtensa LX6 с металлическим RF-экраном.',
        h: 3.2,
      },
      radio.start + radio.shieldLength / 2,
      0,
      radio.shieldLength,
      18,
    ),
    ...(s3
      ? [usb('usb-uart', 'Micro-B USB · UART', 5), usb('usb', 'Micro-B USB · USB OTG', -5)]
      : [usb('usb', 'Micro-B USB · UART', 0)]),
  ];
}
