import { type ModuleVariant } from './pin-layout';
import { validateScenario, type Scenario } from './scenario';
import { validateRadio, type RadioEnvironment, type RadioState } from './radio';
import { partCatalog, controlError, partPinNames, type PartKind } from './catalog';
import { leadHoles, uprightKinds, type Mount, type Turn } from './mount';
import { validateProjectFiles, type ProjectFile, type BuildDiagnostic } from './project-files';
export const espArduinoCore = '3.2.0';
export type McuBoardId = 'uno' | 'nano' | 'esp32' | 'esp32s3' | 'tangnano20k';
export { partCatalog, type PartKind } from './catalog';
export type PinMode = 'INPUT' | 'INPUT_PULLUP' | 'INPUT_PULLDOWN' | 'OUTPUT' | 'ANALOG';
export interface BoardPin {
  id: string;
  gpio?: number;
  adc?: number;
  pwm?: boolean;
  supply?: number;
  inputOnly?: boolean;
}
export interface McuBoard {
  id: McuBoardId;
  name: string;
  chip: string;
  voltage: number;
  clock: number;
  fqbn: string;
  engine: 'avr8js' | 'qemu' | 'pending' | 'fpga';
  pins: BoardPin[];
  ledPin: number;
  buttonPin: number;
  pwmPin: number;
  analogPin: string;
}
const avrPins = (nano: boolean): BoardPin[] => [
  ...Array.from({ length: 14 }, (_, gpio) => ({
    id: `D${gpio}`,
    gpio,
    pwm: [3, 5, 6, 9, 10, 11].includes(gpio),
  })),
  ...Array.from({ length: nano ? 8 : 6 }, (_, adc) => ({
    id: `A${adc}`,
    adc,
    gpio: adc < 6 ? adc + 14 : undefined,
    inputOnly: adc >= 6,
  })),
  { id: '3V3', supply: 3.3 },
  { id: '5V', supply: 5 },
  { id: 'GND', supply: 0 },
];
export const mcuBoards: Record<McuBoardId, McuBoard> = {
  tangnano20k: {
    id: 'tangnano20k',
    name: 'Sipeed Tang Nano 20K',
    chip: 'GW2AR-18',
    voltage: 3.3,
    clock: 27_000_000,
    fqbn: '',
    engine: 'fpga',
    pins: [
      { id: '75', gpio: 75 },
      { id: '80', gpio: 80 },
      { id: '42', gpio: 42 },
      { id: '41', gpio: 41 },
      { id: '56', gpio: 56 },
      { id: '54', gpio: 54 },
      { id: '51', gpio: 51 },
      { id: '48', gpio: 48 },
      { id: '55', gpio: 55 },
      { id: '49', gpio: 49 },
      { id: '86', gpio: 86 },
      { id: '79', gpio: 79 },
      { id: '72', gpio: 72 },
      { id: '71', gpio: 71 },
      { id: '53', gpio: 53 },
      { id: '52', gpio: 52 },
      { id: '73', gpio: 73 },
      { id: '74', gpio: 74 },
      { id: '76', gpio: 76 },
      { id: '85', gpio: 85 },
      { id: '77', gpio: 77 },
      { id: '15', gpio: 15 },
      { id: '16', gpio: 16 },
      { id: '27', gpio: 27 },
      { id: '28', gpio: 28 },
      { id: '26', gpio: 26 },
      { id: '25', gpio: 25 },
      { id: '29', gpio: 29 },
      { id: '30', gpio: 30 },
      { id: '31', gpio: 31 },
      { id: '17', gpio: 17 },
      { id: '20', gpio: 20 },
      { id: '19', gpio: 19 },
      { id: '18', gpio: 18 },
      { id: '3V3', supply: 3.3 },
      { id: '5V', supply: 5 },
      { id: 'GND', supply: 0 },
    ],
    ledPin: 15,
    buttonPin: 88,
    pwmPin: 75,
    analogPin: '',
  },
  uno: {
    id: 'uno',
    name: 'Arduino Uno',
    chip: 'ATmega328P',
    voltage: 5,
    clock: 16_000_000,
    fqbn: 'arduino:avr:uno',
    engine: 'avr8js',
    pins: avrPins(false),
    ledPin: 13,
    buttonPin: 2,
    pwmPin: 9,
    analogPin: 'A0',
  },
  nano: {
    id: 'nano',
    name: 'Arduino Nano',
    chip: 'ATmega328P',
    voltage: 5,
    clock: 16_000_000,
    fqbn: 'arduino:avr:nano:cpu=atmega328',
    engine: 'avr8js',
    pins: avrPins(true),
    ledPin: 13,
    buttonPin: 2,
    pwmPin: 9,
    analogPin: 'A0',
  },
  esp32: {
    id: 'esp32',
    name: 'ESP32 DevKitC',
    chip: 'ESP32-WROOM-32',
    voltage: 3.3,
    clock: 240_000_000,
    fqbn: 'esp32:esp32:esp32:FlashMode=dio,PartitionScheme=huge_app',
    engine: 'qemu',
    pins: [
      ...[
        0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35,
        36, 39,
      ].map((gpio) => ({
        id: `IO${gpio}`,
        gpio,
        inputOnly: gpio >= 34,
        adc: [0, 2, 4, 12, 13, 14, 15, 25, 26, 27, 32, 33, 34, 35, 36, 39].includes(gpio)
          ? gpio
          : undefined,
        pwm: gpio < 34,
      })),
      { id: '5V', supply: 5 },
      { id: 'GND2', supply: 0 },
      { id: '3V3', supply: 3.3 },
      { id: 'GND', supply: 0 },
      { id: 'GND3', supply: 0 },
    ],
    ledPin: 2,
    buttonPin: 4,
    pwmPin: 18,
    analogPin: '34',
  },
  esp32s3: {
    id: 'esp32s3',
    name: 'ESP32-S3 DevKitC-1',
    chip: 'ESP32-S3',
    voltage: 3.3,
    clock: 240_000_000,
    fqbn: 'esp32:esp32:esp32s3:FlashMode=dio,PartitionScheme=huge_app,USBMode=hwcdc,CDCOnBoot=default',
    engine: 'qemu',
    pins: [
      ...[
        ...Array.from({ length: 22 }, (_, n) => n),
        ...Array.from({ length: 14 }, (_, n) => n + 35),
      ].map((gpio) => ({
        id: `IO${gpio}`,
        gpio,
        inputOnly: gpio === 46,
        adc: gpio >= 1 && gpio <= 20 ? gpio : undefined,
        pwm: gpio !== 46,
      })),
      { id: '3V3', supply: 3.3 },
      { id: 'GND', supply: 0 },
    ],
    ledPin: 2,
    buttonPin: 4,
    pwmPin: 18,
    analogPin: '1',
  },
};
export interface CircuitPart {
  id: string;
  kind: PartKind;
  label: string;
  x: number;
  y: number;
  value: number;
  values?: number[];
  color: string;
  /** Quarter turns on the bench. */
  turn?: Turn;
  /** Set when the part's leads are plugged into breadboard holes. */
  mount?: Mount;
  /** Stands on its edge facing forward (−z) instead of lying flat; see `uprightKinds`. */
  upright?: boolean;
}
export interface CircuitWire {
  id: string;
  from: string;
  to: string;
  via?: { x: number; y: number }[];
  /** Jumper colour; defaults to red/black for supply nets and a stable palette otherwise. */
  color?: string;
}
/** The FPGA board plugged into a breadboard: which one, and the column its first pin stands in. */
export interface BoardDock {
  on: string;
  column: number;
}
export interface McuProject {
  version: 1;
  /** When set, the board stands on this breadboard with its pins in the holes. */
  dock?: BoardDock;
  name: string;
  board: McuBoardId;
  source: string;
  files?: ProjectFile[];
  radio?: RadioEnvironment;
  scenario?: Scenario;
  module?: ModuleVariant;
  parts: CircuitPart[];
  wires: CircuitWire[];
}
export interface GpioState {
  id: string;
  mode: PinMode;
  level: 0 | 1 | null;
  duty: number;
  voltage?: number;
  frequencyHz?: number;
  pulseWidthUs?: number;
}
export interface SignalEdge {
  pin: string;
  time: number;
  level: 0 | 1 | null;
}
/** One input of a logic analyzer over the window it shows: where it began and when it changed. */
export interface WaveTrace {
  wired: boolean;
  /** Level at the left edge of the window. */
  start: 0 | 1;
  /** Changes inside the window: position 0 … 1 across it and the level it changed to. */
  edges: [number, 0 | 1][] | null;
}
export interface DeviceState {
  powered: boolean;
  /** Traces drawn by a logic analyzer. */
  waves?: WaveTrace[];
  angle?: number;
  frequencyHz?: number;
  pixels?: number[];
  displayOn?: boolean;
  transfers?: number;
  active?: number;
  text?: string[];
  glyphs?: number[];
  backlight?: boolean;
  matrix?: number[];
  intensity?: number;
  /** Pin levels a bus device drives; null leaves the pin undriven (an input). */
  outputs?: (0 | 1 | null)[];
  /** Undriven pins that a device pulls up weakly. */
  pullups?: boolean[];
  /** Analog outputs of a bus device as a fraction of its supply. */
  analog?: Record<string, number | null>;
  memory?: number[];
  /** Colours of addressable LEDs as 0xRRGGBB. */
  colors?: number[];
  /** Colour display picture, RGB565, row by row from the top-left corner. */
  frame565?: number[];
  inverse?: boolean;
  /** Discrete indicator LEDs of a module (TM1638 board), 0 or 1 each. */
  lights?: number[];
  /** PWM driver channels (PCA9685) or relay coils: duty or on/off, 0…1 each. */
  channels?: number[];
  /** Motor drivers: signed speed of each motor, −1…1. */
  motors?: number[];
  /** Audio player: current track (1-based) and volume 0–30. */
  track?: number;
  volume?: number;
  clock?: string;
  lux?: number;
}
export interface BusEvent {
  time: number;
  bus: 'I2C' | 'SPI';
  address?: number;
  write: number[];
  read: number[];
  ack: boolean;
}
export interface SimulationFrame {
  time: number;
  pins: GpioState[];
  serial: string;
  edges: SignalEdge[];
  devices?: Record<string, DeviceState>;
  buses?: BusEvent[];
  radio?: RadioState;
}
export interface McuHealth {
  compiler: boolean;
  version?: string;
  /** Builds of user code run isolated (Linux namespaces): see server/sandbox.ts. */
  sandbox?: boolean;
  boards: { id: McuBoardId; available: boolean; reason?: string }[];
}
export interface McuBuildResult {
  success: boolean;
  board: McuBoardId;
  hex?: string;
  artifact?: string;
  /** A build for a real ESP32: what to write to the flash, base64, with the address of each part. */
  segments?: { offset: number; data: string }[];
  diagnostics?: BuildDiagnostic[];
  logs: string;
  durationMs: number;
}
export const boardTerminal = (id: string) => `board:${id}`;
export const partTerminal = (id: string, pin: string) => `${id}:${pin}`;
export function allTerminals(project: McuProject) {
  return [
    ...mcuBoards[project.board].pins.map((pin) => boardTerminal(pin.id)),
    ...project.parts.flatMap((part) => partPinNames(part).map((pin) => partTerminal(part.id, pin))),
  ];
}
export function validateMcuProject(input: unknown): McuProject {
  if (!input || typeof input !== 'object') throw new Error('Ожидается проект симулятора.');
  const value = input as Partial<McuProject>;
  if (value.version !== 1 || !Object.hasOwn(mcuBoards, String(value.board)))
    throw new Error('Неизвестная плата или версия проекта.');
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 100)
    throw new Error('Название проекта: от 1 до 100 символов.');
  if (typeof value.source !== 'string' || value.source.length > 100_000)
    throw new Error('Код проекта превышает 100 КБ.');
  if (
    !Array.isArray(value.parts) ||
    value.parts.length > 64 ||
    !Array.isArray(value.wires) ||
    value.wires.length > 256
  )
    throw new Error('Допустимо до 64 компонентов и 256 соединений.');
  const ids = new Set<string>();
  const parts = value.parts.map((part) => {
    if (
      !part ||
      typeof part !== 'object' ||
      typeof part.id !== 'string' ||
      !/^[a-z][a-z0-9-]{0,63}$/i.test(part.id) ||
      part.id === 'board' ||
      ids.has(part.id) ||
      !Object.hasOwn(partCatalog, part.kind)
    )
      throw new Error('Некорректный компонент.');
    ids.add(part.id);
    if (
      typeof part.label !== 'string' ||
      part.label.length > 80 ||
      !Number.isFinite(part.x) ||
      !Number.isFinite(part.y) ||
      part.x < 0 ||
      part.x > 2400 ||
      part.y < 0 ||
      part.y > 1600 ||
      !Number.isFinite(part.value) ||
      !/^#[a-f0-9]{6}$/i.test(part.color)
    )
      throw new Error('Некорректные параметры компонента.');
    const definition = partCatalog[part.kind];
    const problem = controlError(definition.control, part.value);
    if (problem) throw new Error(problem);
    if (part.values !== undefined) {
      const extras = definition.extras ?? [];
      if (
        !Array.isArray(part.values) ||
        part.values.length !== extras.length ||
        part.values.some((item) => typeof item !== 'number')
      )
        throw new Error('Некорректные параметры компонента.');
      for (const [index, control] of extras.entries()) {
        const extra = controlError(control, part.values[index]);
        if (extra) throw new Error(extra);
      }
    }
    return {
      id: part.id,
      kind: part.kind,
      label: part.label,
      x: part.x,
      y: part.y,
      value: part.value,
      ...(part.values === undefined ? {} : { values: [...part.values] }),
      color: part.color,
      ...(part.turn ? { turn: part.turn } : {}),
      ...(part.upright === true && uprightKinds.has(part.kind) ? { upright: true } : {}),
      ...(part.mount === undefined ? {} : { mount: { on: part.mount.on, hole: part.mount.hole } }),
    };
  });
  for (const part of parts) {
    if (part.turn !== undefined && ![0, 1, 2, 3].includes(part.turn))
      throw new Error('Некорректный поворот компонента.');
    if (part.mount === undefined) continue;
    const board = parts.find((item) => item.id === part.mount!.on);
    if (
      typeof part.mount.on !== 'string' ||
      typeof part.mount.hole !== 'string' ||
      board?.kind !== 'breadboard' ||
      !leadHoles(part, part.mount.hole, board.value)
    )
      throw new Error('Компонент установлен мимо отверстий макетной платы.');
  }
  if (
    value.module !== undefined &&
    !(
      value.board === 'esp32'
        ? ['wroom', 'wrover']
        : value.board === 'esp32s3'
          ? ['s3-n8', 's3-r8']
          : []
    ).includes(value.module)
  )
    throw new Error('Несовместимый вариант модуля.');
  const project: McuProject = {
    version: 1,
    name: value.name.trim(),
    board: value.board!,
    source: value.source,
    parts,
    wires: [],
    ...(value.module === undefined ? {} : { module: value.module }),
    ...(value.radio === undefined ? {} : { radio: validateRadio(value.radio) }),
    ...(value.files === undefined ? {} : { files: validateProjectFiles(value.files) }),
  };
  const terminals = new Set(allTerminals(project)),
    wireIds = new Set<string>(),
    pairs = new Set<string>();
  project.wires = value.wires.map((wire) => {
    if (
      !wire ||
      typeof wire !== 'object' ||
      typeof wire.id !== 'string' ||
      !/^[a-z0-9-]{1,80}$/i.test(wire.id) ||
      wireIds.has(wire.id) ||
      !terminals.has(wire.from) ||
      !terminals.has(wire.to) ||
      wire.from === wire.to
    )
      throw new Error('Некорректное соединение.');
    const pair = [wire.from, wire.to].sort().join('|');
    if (pairs.has(pair)) throw new Error('Повторное соединение.');
    wireIds.add(wire.id);
    pairs.add(pair);
    if (wire.color !== undefined && !/^#[a-f0-9]{6}$/i.test(wire.color))
      throw new Error('Некорректный цвет провода.');
    const color = wire.color === undefined ? {} : { color: wire.color };
    if (wire.via === undefined) return { id: wire.id, from: wire.from, to: wire.to, ...color };
    if (
      !Array.isArray(wire.via) ||
      wire.via.length > 8 ||
      wire.via.some(
        (point) =>
          !point ||
          typeof point !== 'object' ||
          !Number.isFinite(point.x) ||
          !Number.isFinite(point.y) ||
          point.x < -400 ||
          point.x > 2800 ||
          point.y < -400 ||
          point.y > 2000,
      )
    )
      throw new Error('Некорректные изгибы провода.');
    return {
      id: wire.id,
      from: wire.from,
      to: wire.to,
      ...color,
      ...(wire.via.length
        ? { via: wire.via.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) })) }
        : {}),
    };
  });
  if (value.scenario !== undefined) project.scenario = validateScenario(value.scenario, project);
  return project;
}
export function plural(count: number, one: string, few: string, many: string) {
  const tens = count % 100,
    units = count % 10;
  return `${count} ${tens >= 11 && tens <= 14 ? many : units === 1 ? one : units >= 2 && units <= 4 ? few : many}`;
}
export function formatOhm(value: number) {
  return value >= 1_000_000
    ? `${+(value / 1_000_000).toFixed(2)} МΩ`
    : value >= 1000
      ? `${+(value / 1000).toFixed(2)} кΩ`
      : `${value} Ω`;
}
