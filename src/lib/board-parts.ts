/**
 * Parts soldered on the Sipeed Tang Nano 20K that are wired to FPGA pins (QN88 package numbers).
 * Shared by the virtual board and the pin planner so both describe the board the same way.
 */
export type BoardPartKind = 'led' | 'button' | 'clock' | 'uart' | 'jtag' | 'flash' | 'reconfig';

export interface BoardPart {
  pin: number;
  kind: BoardPartKind;
  /** Short caption drawn next to the pin: LED0, S1, 27 МГц. */
  caption: string;
  /** Full name used in lists and tooltips. */
  title: string;
  /** Direction seen from the FPGA: a signal assigned here must have this direction. */
  direction?: 'input' | 'output';
  /** What the part does and what a signal assigned to this pin physically does. */
  effect: string;
  /** The pin belongs to configuration or the programmer, so a design must not use it. */
  service?: boolean;
}

export const LED_PINS = [15, 16, 17, 18, 19, 20] as const;
export const BUTTON_PINS = { S1: 88, S2: 87 } as const;
export const CLOCK_PIN = 4;
export const UART_TX_PIN = 69;
export const UART_RX_PIN = 70;

const ledEffect = (index: number) =>
  `Светодиод LED${index} на плате. Он горит, когда на выводе 0, и гаснет, когда на выводе 1.`;

export const boardParts: BoardPart[] = [
  {
    pin: CLOCK_PIN,
    kind: 'clock',
    caption: '27 МГц',
    title: 'Генератор тактов 27 МГц',
    direction: 'input',
    effect:
      'Кварцевый генератор. Сигнал на этом выводе 27 миллионов раз в секунду меняется с 0 на 1 и обратно: это «метроном» для всей схемы.',
  },
  ...LED_PINS.map((pin, index): BoardPart => ({
    pin,
    kind: 'led',
    caption: `LED${index}`,
    title: `Светодиод LED${index}`,
    direction: 'output',
    effect: ledEffect(index),
  })),
  {
    pin: BUTTON_PINS.S2,
    kind: 'button',
    caption: 'S2',
    title: 'Кнопка S2',
    direction: 'input',
    effect: 'Кнопка S2. Пока она нажата, на выводе 1, когда отпущена — 0.',
  },
  {
    pin: BUTTON_PINS.S1,
    kind: 'button',
    caption: 'S1',
    title: 'Кнопка S1',
    direction: 'input',
    effect: 'Кнопка S1. Пока она нажата, на выводе 1, когда отпущена — 0.',
  },
  {
    pin: UART_TX_PIN,
    kind: 'uart',
    caption: 'TX',
    title: 'UART TX → BL616',
    direction: 'output',
    effect:
      'Передача данных в компьютер через USB: чип BL616 превращает эти сигналы в виртуальный COM-порт.',
  },
  {
    pin: UART_RX_PIN,
    kind: 'uart',
    caption: 'RX',
    title: 'UART RX ← BL616',
    direction: 'input',
    effect: 'Приём данных из компьютера через USB (виртуальный COM-порт).',
  },
  ...(
    [
      [5, 'TMS'],
      [6, 'TCK'],
      [7, 'TDI'],
      [8, 'TDO'],
    ] as const
  ).map(([pin, name]): BoardPart => ({
    pin,
    kind: 'jtag',
    caption: name,
    title: `JTAG ${name}`,
    service: true,
    effect: 'Служебный вывод программатора JTAG: через него компьютер загружает схему в FPGA.',
  })),
  {
    pin: 9,
    kind: 'reconfig',
    caption: 'RECONFIG',
    title: 'RECONFIG_N',
    service: true,
    effect: 'Служебный вывод: перезапуск загрузки конфигурации.',
  },
  ...(
    [
      [59, 'Flash CLK'],
      [60, 'Flash CS'],
      [61, 'Flash MOSI'],
      [62, 'Flash MISO'],
    ] as const
  ).map(([pin, name]): BoardPart => ({
    pin,
    kind: 'flash',
    caption: name,
    title: name,
    service: true,
    effect: 'Связь с микросхемой флеш-памяти, где хранится схема после выключения питания.',
  })),
];

const byPin = new Map(boardParts.map((part) => [part.pin, part]));
export function partForPin(pin: number): BoardPart | undefined {
  return byPin.get(pin);
}
export function ledIndexForPin(pin: number): number {
  return LED_PINS.indexOf(pin as (typeof LED_PINS)[number]);
}
