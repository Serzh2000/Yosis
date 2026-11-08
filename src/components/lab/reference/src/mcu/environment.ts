// Bench tools: a flashlight, a burner, a magnet, a hand and a water spray that the user moves
// over the scene. Each one sets the physical input of nearby sensors (light, temperature,
// field, presence, moisture) by distance. The result is a live copy of the project for the
// simulator; the saved project and its undo history are untouched, so removing the tool
// restores the values set by hand. Firmware still reads the sensors through its own pins.
import { partCatalog, type PartKind } from '../../shared/catalog';
import type { CircuitPart, McuProject } from '../../shared/mcu';
import { benchLayout, turnOffset } from './scene/layout';

export type ToolKind =
  | 'flashlight'
  | 'burner'
  | 'magnet'
  | 'hand'
  | 'water'
  | 'shaker'
  | 'sound'
  | 'gas'
  | 'load'
  | 'uv'
  | 'source'
  | 'pressure'
  | 'wheel';
export interface BenchTool {
  id: string;
  kind: ToolKind;
  /** Position on the bench, millimetres in scene coordinates. */
  x: number;
  z: number;
  /** Heading in radians about the vertical axis; see `toolAngle` for the default. */
  angle?: number;
  /** Height of the middle of the hand above the table, mm. */
  height?: number;
  /** The palm looks down instead of forward, for measuring from above. */
  palmDown?: boolean;
  /** Slotted test disk speed, independent of saved sensor values. */
  rpm?: number;
}
export const HAND_HEIGHT = { min: 8, max: 120, rest: 22 };
export const toolHeight = (tool: Pick<BenchTool, 'kind' | 'height'>) =>
  tool.kind === 'hand' ? (tool.height ?? HAND_HEIGHT.rest) : 0;
/** A hand starts with its palm towards the viewer, which is the front of a sensor facing away. */
export const toolAngle = (tool: Pick<BenchTool, 'kind' | 'angle'>) =>
  tool.angle ?? (tool.kind === 'hand' ? Math.PI : 0);
/** Direction the palm (or lens) faces, as a unit vector; y is up. */
export const toolFacing = (tool: Pick<BenchTool, 'kind' | 'angle' | 'palmDown'>) => {
  if (tool.palmDown) return { x: 0, y: -1, z: 0 };
  const angle = toolAngle(tool);
  return { x: -Math.sin(angle), y: 0, z: -Math.cos(angle) };
};
export const toolInfo: Record<ToolKind, { name: string; radius: number; hint: string }> = {
  flashlight: {
    name: 'Фонарик',
    radius: 80,
    hint: 'Освещает фоторезисторы и люксметры',
  },
  burner: {
    name: 'Горелка',
    radius: 45,
    hint: 'Греет термодатчики, видна датчику пламени и газа',
  },
  magnet: { name: 'Магнит', radius: 30, hint: 'Срабатывают датчики Холла, геркон, компас' },
  hand: {
    name: 'Рука',
    radius: 40,
    hint: 'PIR, препятствие, касание и расстояние для HC-SR04 · ПКМ — повернуть',
  },
  water: { name: 'Вода', radius: 35, hint: 'Влага, влажность воздуха и поток через расходомер' },
  shaker: {
    name: 'Встряхивание',
    radius: 32,
    hint: 'Вибростенд: повторные удары, наклон и ускорение каждые 360 мс',
  },
  sound: { name: 'Источник звука', radius: 65, hint: 'Повышает уровень на микрофоне' },
  gas: {
    name: 'Газовая проба',
    radius: 40,
    hint: 'Тестовая концентрация для MQ и CO₂; составы задаются условно',
  },
  load: { name: 'Груз', radius: 25, hint: 'Нагружает FSR и тензодатчик HX711' },
  uv: { name: 'УФ-лампа', radius: 60, hint: 'УФ-индекс и освещение оптических датчиков' },
  source: {
    name: 'Источник питания',
    radius: 30,
    hint: 'Тестовые напряжение и ток на измерительном входе датчика',
  },
  pressure: {
    name: 'Воздушная помпа',
    radius: 35,
    hint: 'Повышает давление для BMP180, BMP280 и BME280',
  },
  wheel: {
    name: 'Диск с прорезями',
    radius: 25,
    hint: 'Вращение перед датчиком скорости и оптопрерывателем',
  },
};
export const toolKinds = Object.keys(toolInfo) as ToolKind[];

/**
 * What a tool does to a value at strength s (0 far away, 1 right above):
 * `to` moves it towards a target, `add` adds up to an amount, `on` switches a two-state sensor
 * once s passes the threshold. `index` names an extra control instead of the main one.
 */
type Effect = { index?: number } & (
  { to: number } | { add: number } | { on: number; value?: number }
);
const heat = (index?: number, add = 90): Effect => ({ index, add });
const effects: Record<ToolKind, Partial<Record<PartKind, Effect[]>>> = {
  flashlight: {
    ldr: [{ to: 100 }],
    bh1750: [{ index: 0, add: 30000 }],
    tcs34725: [{ index: 3, to: 100 }],
  },
  burner: {
    temperature: [heat()],
    lm35: [heat()],
    ntc: [heat()],
    thermky013: [heat()],
    digtemp: [heat()],
    ds18b20: [heat()],
    max6675: [heat(undefined, 400)],
    rtc: [heat(0, 30)],
    dht11: [heat(0)],
    dht22: [heat(0)],
    aht20: [heat(0)],
    sht31: [heat(0)],
    bme280: [heat(0)],
    bmp280: [heat(0)],
    bmp180: [heat(0)],
    lm75: [heat(0)],
    mpu6050: [heat(6)],
    mlx90614: [heat(0, 300), heat(1, 20)],
    flame: [{ on: 0.15 }],
    mq2: [{ add: 3000 }],
    mq7: [{ add: 400 }],
  },
  magnet: {
    hall: [{ on: 0.35 }],
    reed: [{ on: 0.35 }],
    doorsensor: [{ on: 0.35, value: 0 }],
    hall49e: [{ add: 100 }],
    hmc5883l: [{ index: 0, add: 600 }],
    qmc5883l: [{ index: 0, add: 600 }],
  },
  hand: {
    pir: [{ on: 0.2 }],
    touch: [{ on: 0.9 }],
    metaltouch: [{ on: 0.9 }],
    rcwl0516: [{ on: 0.2 }],
    photogate: [{ on: 0.6 }],
    irobstacle: [{ on: 0.6 }],
    linetrack: [{ on: 0.7 }],
    linetrack3: [{ on: 0.7, value: 7 }],
    sharpir: [{ to: 10 }],
    collision: [{ on: 0.8 }],
    limit: [{ on: 0.8 }],
    ttp224: [{ on: 0.9, value: 1 }],
    mpr121: [{ on: 0.9, value: 1 }],
  },
  water: {
    rain: [{ to: 100 }],
    steam: [{ to: 100 }],
    soil: [{ to: 100 }],
    soilcap: [{ to: 100 }],
    water: [{ to: 100 }],
    flowmeter: [{ to: 20 }],
    dht11: [{ index: 1, to: 90 }],
    dht22: [{ index: 1, to: 100 }],
    aht20: [{ index: 1, to: 100 }],
    sht31: [{ index: 1, to: 100 }],
    bme280: [{ index: 2, to: 100 }],
  },
  shaker: {
    knock: [{ on: 0.25 }],
    shock: [{ on: 0.25 }],
    vibrsensor: [{ on: 0.25 }],
    tilt: [{ on: 0.35 }],
    mercury: [{ on: 0.35 }],
    mpu6050: [
      { index: 0, add: 2.5 },
      { index: 4, add: 180 },
    ],
    adxl345: [{ index: 0, add: 2.5 }],
  },
  sound: { sound: [{ to: 100 }] },
  gas: {
    gas: [{ to: 7000 }],
    mq2: [{ to: 7000 }],
    mq3: [{ to: 8 }],
    mq7: [{ to: 1500 }],
    mq135: [{ to: 800 }],
    mhz19: [{ to: 3000 }],
  },
  load: { force: [{ to: 100 }], hx711: [{ to: 3000 }] },
  uv: {
    uvsensor: [{ to: 10 }],
    ldr: [{ to: 100 }],
    bh1750: [{ index: 0, add: 5000 }],
    tcs34725: [{ index: 3, to: 100 }],
  },
  source: {
    voltagesens: [{ to: 12 }],
    acs712: [{ to: 3 }],
    ina219: [
      { index: 0, to: 12 },
      { index: 1, to: 1.5 },
    ],
  },
  pressure: {
    bmp180: [{ index: 1, to: 1100 }],
    bmp280: [{ index: 1, to: 1100 }],
    bme280: [{ index: 1, to: 1100 }],
  },
  wheel: { speedsensor: [{ to: 1200 }], photogate: [{ on: 0.5 }] },
};
/** Kinds a tool acts on, for hints and tests. */
export const toolTargets = (kind: ToolKind): PartKind[] => [
  ...(Object.keys(effects[kind]) as PartKind[]),
  ...(kind === 'hand' ? ['hcsr04' as const] : []),
];
/** Discoverable matching stimuli, shared by the component card and the coverage audit. */
export const toolsForSensor = (kind: PartKind) =>
  toolKinds.filter((tool) => toolTargets(tool).includes(kind));
export const manualStimuli: Partial<Record<PartKind, string>> = {
  potentiometer: 'Поверните ручку или измените положение ползунком.',
  slidepot: 'Переместите движок ползунком положения.',
  gps: 'Задайте широту, долготу и число спутников ниже. Это сценарий GPS-сигнала.',
};

/** Falls from 1 above the part to 0 at the tool's radius. */
export function toolStrength(kind: ToolKind, distance: number) {
  const t = Math.max(0, 1 - distance / toolInfo[kind].radius);
  return t * t;
}
/**
 * HC-SR04 distance to a hand in cm, using the bench scale of 0.25 mm per cm. A module standing on
 * its edge looks along the table, a lying one looks up, so the same hand measures length or height.
 */
function sonarDistance(
  center: { x: number; z: number },
  turn: number,
  upright: boolean,
  hand: BenchTool,
) {
  const forward = upright ? turnOffset(0, -1, turn) : { x: 0, z: 0 },
    axis = upright ? { x: forward.x, y: 0, z: forward.z } : { x: 0, y: 1, z: 0 },
    // Transducers sit about 14 mm above the table on an upright module, on the table when lying.
    v = { x: hand.x - center.x, y: toolHeight(hand) - (upright ? 14 : 0), z: hand.z - center.z },
    along = v.x * axis.x + v.y * axis.y + v.z * axis.z,
    side = Math.hypot(v.x - along * axis.x, v.y - along * axis.y, v.z - along * axis.z);
  // The beam is about as wide as the module and opens up by roughly 15° each way.
  if (along < 12 || side > 20 + along * 0.27) return undefined;
  // A flat palm returns the echo; turned edge-on it deflects the beam away from the sensor.
  const palm = toolFacing(hand),
    distance = Math.hypot(v.x, v.y, v.z) || 1;
  if (Math.abs((palm.x * v.x + palm.y * v.y + palm.z * v.z) / distance) < 0.35) return undefined;
  return Math.max(2, Math.min(450, Math.round((along - 14) / 0.25)));
}
const clamp = (value: number, min = -Infinity, max = Infinity) =>
  Math.max(min, Math.min(max, value));
function apply(part: CircuitPart, effect: Effect, s: number): CircuitPart {
  const definition = partCatalog[part.kind],
    control = effect.index === undefined ? definition.control : definition.extras?.[effect.index];
  if (!control) return part;
  const values = part.values ?? definition.defaultValues ?? [],
    base = effect.index === undefined ? part.value : (values[effect.index] ?? 0);
  let next =
    'on' in effect
      ? s >= effect.on
        ? (effect.value ?? 1)
        : base
      : 'to' in effect
        ? base + (effect.to - base) * s
        : base + effect.add * s;
  next = clamp(next, control.min, control.max);
  if (control.step) next = Math.round(next / control.step) * control.step;
  next = Number(next.toFixed(4));
  if (next === base) return part;
  if (effect.index === undefined) return { ...part, value: next };
  const copy = [...values];
  copy[effect.index] = next;
  return { ...part, values: copy };
}
/** The project as the sensors see it with the tools in place; the same object if none act. */
export function applyTools(project: McuProject, tools: BenchTool[], timeMs = 0): McuProject {
  if (!tools.length) return project;
  const layouts = benchLayout(project);
  let changed = false;
  const parts = project.parts.map((part) => {
    const layout = layouts.get(part.id);
    if (!layout) return part;
    let result = part;
    for (const tool of tools) {
      // Real input transitions for firmware edge detection, with a quiet half-cycle.
      if (
        (tool.kind === 'shaker' || tool.kind === 'wheel') &&
        Math.floor(timeMs / 180) % 2 !== 0 &&
        (tool.kind === 'shaker' || part.kind === 'photogate')
      )
        continue;
      if (tool.kind === 'hand' && part.kind === 'hcsr04') {
        const cm = sonarDistance(layout.center, layout.turn, part.upright === true, tool);
        if (cm !== undefined && cm < result.value) result = { ...result, value: cm };
        continue;
      }
      const list = effects[tool.kind][part.kind];
      if (!list) continue;
      const s = toolStrength(
        tool.kind,
        Math.hypot(tool.x - layout.center.x, tool.z - layout.center.z),
      );
      if (s <= 0.01) continue;
      for (const effect of list) {
        const configured =
          tool.kind === 'wheel' && part.kind === 'speedsensor'
            ? { to: clamp(tool.rpm ?? 1200, 0, 3000) }
            : effect;
        result = apply(result, configured, s);
      }
    }
    if (result !== part) changed = true;
    return result;
  });
  return changed ? { ...project, parts } : project;
}
