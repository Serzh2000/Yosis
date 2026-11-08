import { partCatalog, type PartKind } from '../../../shared/catalog';
// Plain-language notes for the header pins of each board, shown while the pointer is on a pin or
// a jumper is being dragged towards it: what the pin is called in code and what it can do.
import { mcuBoards, type McuBoardId } from '../../../shared/mcu';

export interface PinNote {
  /** What the sketch calls the pin, e.g. "D13 · GPIO 13". */
  title: string;
  /** What the pin can do, one short sentence per fact. */
  facts: string[];
}

const avrFixed: Record<string, string[]> = {
  D0: ['RX: приём Serial (USB). Не подключайте ничего, пока работает монитор порта.'],
  D1: ['TX: передача Serial (USB). Не подключайте ничего, пока работает монитор порта.'],
  D2: ['Внешнее прерывание INT0 — attachInterrupt(0, …).'],
  D3: ['Внешнее прерывание INT1, ШИМ (~).'],
  D10: ['SPI: SS (выбор устройства), ШИМ (~).'],
  D11: ['SPI: MOSI (данные к устройству), ШИМ (~).'],
  D12: ['SPI: MISO (данные от устройства).'],
  D13: ['SPI: SCK (тактирование). К этому выводу подключён встроенный светодиод L.'],
  A4: ['I²C: SDA (данные). Тот же вывод, что SDA рядом с AREF.'],
  A5: ['I²C: SCL (тактирование). Тот же вывод, что SCL рядом с AREF.'],
  SDA: ['I²C: данные. Это вывод A4.'],
  SCL: ['I²C: тактирование. Это вывод A5.'],
  '5V': ['Питание 5 В. Для светодиодов нужен резистор, для датчиков — по их описанию.'],
  '3V3': ['Питание 3,3 В, до 50 мА. Для датчиков, которым нельзя 5 В.'],
  GND: ['Земля (0 В). Общий минус: соедините его со всеми деталями схемы.'],
  VIN: ['Вход питания платы (7–12 В).'],
  AREF: ['Опорное напряжение для analogRead. Обычно не используется.'],
  RESET: ['Подача LOW перезапускает плату.'],
};
const espFixed: Record<string, string[]> = {
  IO0: ['Strapping-вывод: при сбросе LOW включает режим загрузки (кнопка BOOT).'],
  IO1: ['TX0: вывод Serial в USB.'],
  IO3: ['RX0: приём Serial из USB.'],
  IO2: ['Подключён к светодиоду платы. Strapping-вывод: при сбросе не держите HIGH.'],
  IO5: ['VSPI: SS. Strapping-вывод.'],
  IO12: ['Strapping-вывод: при сбросе HIGH меняет напряжение флеш-памяти. Лучше не использовать.'],
  IO15: ['Strapping-вывод: влияет на сообщения загрузчика.'],
  IO18: ['VSPI: SCK (тактирование).'],
  IO19: ['VSPI: MISO (данные от устройства).'],
  IO21: ['I²C: SDA (данные), стандартный Wire.'],
  IO22: ['I²C: SCL (тактирование), стандартный Wire.'],
  IO23: ['VSPI: MOSI (данные к устройству).'],
  IO25: ['Есть ЦАП: dacWrite() выдаёт аналоговое напряжение.'],
  IO26: ['Есть ЦАП: dacWrite() выдаёт аналоговое напряжение.'],
  '5V': ['Питание 5 В с USB. Логика платы работает на 3,3 В.'],
  '3V3': ['Питание 3,3 В для датчиков и модулей.'],
  GND: ['Земля (0 В). Общий минус схемы.'],
  GND2: ['Земля (0 В). Общий минус схемы.'],
  GND3: ['Земля (0 В). Общий минус схемы.'],
};
const s3Fixed: Record<string, string[]> = {
  IO0: ['Strapping-вывод: при сбросе LOW включает режим загрузки (кнопка BOOT).'],
  IO8: ['I²C: SDA по умолчанию в Arduino-ядре.'],
  IO9: ['I²C: SCL по умолчанию в Arduino-ядре.'],
  IO10: ['SPI: SS.'],
  IO11: ['SPI: MOSI.'],
  IO12: ['SPI: SCK.'],
  IO13: ['SPI: MISO.'],
  IO19: ['Линия USB D−. Не используйте, если нужен USB.'],
  IO20: ['Линия USB D+. Не используйте, если нужен USB.'],
  IO43: ['TX0: Serial через UART0.'],
  IO44: ['RX0: Serial через UART0.'],
  '5V': ['Питание 5 В с USB. Логика платы работает на 3,3 В.'],
  '3V3': ['Питание 3,3 В для датчиков и модулей.'],
  GND: ['Земля (0 В). Общий минус схемы.'],
};

/** What to tell the student about `label` (a header pin like "D13" or "IO21") on `board`. */
/** What a contact of the FPGA board is, in the words of this board and not of a microcontroller. */
export function fpgaPadNote(label: string): PinNote {
  const rails: Record<string, PinNote> = {
    '3V3': {
      title: '3V3 · питание 3,3 В',
      facts: ['Плюс для деталей: к нему подключают выводы VCC.'],
    },
    '5V': {
      title: '5V · питание 5 В',
      facts: ['Питание 5 В с USB. Логика платы работает на 3,3 В.'],
    },
    GND: { title: 'GND · земля', facts: ['Общий минус: к нему подключают выводы GND.'] },
  };
  if (rails[label]) return rails[label]!;
  const roles: Record<string, string> = {
    '4': 'Генератор платы, 27 МГц',
    '15': 'Светодиод LED0, светится при 0',
    '16': 'Светодиод LED1, светится при 0',
    '17': 'Светодиод LED2, светится при 0',
    '18': 'Светодиод LED3, светится при 0',
    '19': 'Светодиод LED4, светится при 0',
    '20': 'Светодиод LED5, светится при 0',
    '69': 'UART: передача в USB-терминал',
    '70': 'UART: приём из USB-терминала',
    '87': 'Кнопка S2, нажата = 1',
    '88': 'Кнопка S1, нажата = 1',
  };
  return {
    title: `Вывод ${label}`,
    facts: [roles[label] ?? 'Свободный вывод ПЛИС: сигнал назначают во вкладке «Выводы».'],
  };
}

export function pinNote(board: McuBoardId, label: string): PinNote {
  const definition = mcuBoards[board],
    pin = definition.pins.find((item) => item.id === label),
    fixed = (
      board === 'uno' || board === 'nano' ? avrFixed : board === 'esp32' ? espFixed : s3Fixed
    )[label],
    facts: string[] = [];
  let title = label;
  if (pin?.supply !== undefined) {
    title = pin.supply ? `${label} · питание ${pin.supply} В` : `${label} · земля`;
  } else if (pin?.gpio !== undefined) {
    title =
      board === 'uno' || board === 'nano'
        ? label.startsWith('A')
          ? `${label} · вход ADC ${pin.adc ?? ''}`.trim()
          : `${label} · цифровой вывод`
        : `${label} · GPIO ${pin.gpio}`;
    const analog = label.startsWith('A') && (board === 'uno' || board === 'nano');
    if (pin.inputOnly) facts.push('Только вход: выдать на него сигнал нельзя.');
    else if (!analog) facts.push('Вход или выход: pinMode, digitalWrite, digitalRead.');
    if (pin.pwm && !fixed?.some((line) => line.includes('ШИМ')))
      facts.push('Поддерживает ШИМ: analogWrite() плавно меняет яркость или скорость.');
    if (analog)
      facts.push('Измеряет напряжение 0–5 В: analogRead() даёт 0…1023. Может быть и цифровым.');
    else if (pin.adc !== undefined) facts.push('Умеет измерять напряжение: analogRead().');
  }
  if (fixed) facts.push(...fixed);
  if (!facts.length) facts.push('В модели не используется.');
  return { title, facts };
}

/** Component pins describe their signal role separately from their live voltage. */
export function componentPinNote(kind: PartKind | undefined, pin: string) {
  if (!kind) return '';
  const definition = partCatalog[kind];
  if (pin === definition.supply?.vcc) return 'Питание модуля (VCC)';
  if (pin === definition.supply?.gnd || pin === 'GND') return 'Общий провод (земля, 0 В)';
  const roles: Record<string, string> = {
    SDA: 'I²C · линия данных',
    SCL: 'I²C · тактовая линия',
    MOSI: 'SPI · данные от контроллера',
    MISO: 'SPI · данные к контроллеру',
    SCK: 'SPI · тактовая линия',
    CS: 'SPI · выбор устройства',
    TX: 'Передача последовательных данных',
    RX: 'Приём последовательных данных',
    TRIG: 'Вход: импульс запуска измерения',
    ECHO: 'Выход: длительность импульса задаёт расстояние',
    AO: 'Аналоговый выход датчика',
    DO: 'Цифровой выход датчика',
    DIN: 'Вход последовательных данных',
    DOUT: 'Выход последовательных данных',
  };
  if (roles[pin]) return roles[pin];
  if (definition.outputs?.pins.includes(pin)) return 'Сигнальный выход датчика';
  if (pin === definition.load?.pin) return 'Управляющий вход';
  return '';
}
