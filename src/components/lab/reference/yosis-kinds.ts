import { partPins, type PartDef, type PartOptions } from '../../../lib/lab/catalog';
import { partCatalog, type PartKind } from './shared/catalog';
import { cabledKinds, instrumentKinds, moduleProfiles } from './shared/physical';
import { standaloneKinds, uprightKinds } from './shared/mount';

/**
 * Which model of the reference draws each part of the laboratory. The laboratory's parts keep
 * their own pins and behaviour; only the picture is borrowed: a Logra LED is the reference's
 * LED module, a Logra OLED its OLED board, and so on.
 */
export const LOOKS: Record<string, PartKind> = {
  led: 'ledmod',
  rgb: 'smdrgb',
  bicolor: 'bicolor',
  bar: 'ledbar',
  ring: 'ws2812ring',
  traffic: 'traffic',
  laser: 'laser',
  ws2812: 'ws2812stick',
  seg1: 'seg7',
  segn: 'tm1637',
  matrix: 'max7219',
  'hex-display': 'tm1637',
  bcd7: 'seg7',
  'byte-display': 'max7219seg',
  counter: 'tm1637',
  button: 'btnmod',
  'sw-slide': 'slideswitch',
  'sw-toggle': 'toggleswitch',
  'sw-rocker': 'rockerswitch',
  dip: 'dip',
  keypad: 'keypad',
  encoder: 'encoder',
  joystick: 'joystick',
  rotary: 'potmod',
  const: 'switch',
  'sensor-pir': 'pir',
  'sensor-reed': 'reed',
  'sensor-tilt': 'tilt',
  'sensor-touch': 'touch',
  'sensor-gate': 'photogate',
  'sensor-hall': 'hall',
  'sensor-limit': 'limit',
  'sensor-obstacle': 'irobstacle',
  'sensor-flame': 'flame',
  'sensor-sound': 'sound',
  'sensor-water': 'water',
  'sensor-vibration': 'vibrsensor',
  'sensor-light': 'ldr',
  'sensor-line': 'linetrack',
  'sensor-collision': 'collision',
  'sensor-knock': 'knock',
  'sensor-shock': 'shock',
  'sensor-mercury': 'mercury',
  'sensor-metal': 'metaltouch',
  'sensor-radar': 'rcwl0516',
  'sensor-door': 'doorsensor',
  'sensor-rain': 'rain',
  'sensor-mq2': 'mq2',
  'sensor-mq3': 'mq3',
  'sensor-mq7': 'mq7',
  'sensor-mq135': 'mq135',
  'sensor-heat': 'digtemp',
  'sensor-hall49': 'hall49e',
  'sensor-soil': 'soil',
  'sensor-uv': 'uvsensor',
  buzzer: 'buzzer',
  relay: 'relay',
  motor: 'motor',
  fan: 'motor',
  vibro: 'vibration',
  servo: 'servo',
  stepper: 'stepper',
  sr595: 'shift595',
  sr165: 'shift165',
  probe: 'voltagesens',
  'freq-counter': 'voltagesens',
  voltmeter: 'voltagesens',
  analyzer: 'lanalyzer',
  pulse: 'mcp4725',
  uart: 'hc05',
  'oled-ssd1306': 'oled',
  'lcd-i2c': 'lcd1602',
  'lcd-parallel': 'lcd1602p',
  lm75: 'lm75',
  'eeprom-24c02': 'eeprom',
  'rtc-ds1307': 'rtc',
  pcf8574: 'pcf8574',
  max7219: 'max7219',
  tm1637: 'tm1637',
  'adc-mcp3008': 'ads1115',
  'hc-sr04': 'hcsr04',
  dht11: 'dht11',
  'ir-receiver': 'irremote',
  'ps2-keyboard': 'ps2keyboard',
};
/** A part with no model of its own is drawn as a plain module with a chip. */
const FALLBACK: PartKind = 'mcp4725';

/**
 * The kind of the reference that stands for `def` with these properties. Parts whose pins
 * depend on their properties get a kind per set of pins; kinds are made once and kept.
 */
export function kindFor(def: PartDef, opts: PartOptions): PartKind {
  if (def.kind === 'breadboard') return 'breadboard';
  const pins = partPins(def, opts).map((pin) => pin[0]);
  // A button with a latch is the reference's latching button; the picture follows the property.
  const look =
    def.id === 'button' && opts.latching ? ('latchbtn' as PartKind) : (LOOKS[def.id] ?? FALLBACK);
  const key = `y:${def.id}:${look}:${pins.join(',')}` as PartKind;
  if (partCatalog[key]) return key;
  const base = partCatalog[look];
  partCatalog[key] = {
    ...base,
    name: def.title,
    pins,
    look,
    supply: { vcc: 'VCC', gnd: 'GND', min: 2.7 },
    // What the electrical solver of the reference would do with it is the laboratory's job.
    drive: undefined,
    joins: undefined,
    emit: undefined,
    load: undefined,
    outputs: undefined,
    i2c: undefined,
    spi: undefined,
  };
  const profile = moduleProfiles[look];
  if (profile) moduleProfiles[key] = profile;
  if (cabledKinds.has(look)) cabledKinds.add(key);
  if (instrumentKinds.has(look)) instrumentKinds.add(key);
  if (standaloneKinds.has(look)) standaloneKinds.add(key);
  if (uprightKinds.has(look)) uprightKinds.add(key);
  return key;
}
