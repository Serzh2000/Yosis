import type { PartDef } from '../catalog';
import type { Device, DeviceHost, Options } from '../devices';
import { Ds1307, Eeprom24c02, Lm75, Pcf8574 } from './i2c-devices';
import { LcdI2c, LcdParallel } from './lcd';
import { deviceFactories } from './registry';
import { Dht11, HcSr04, IrReceiver, Ps2Keyboard } from './sensors';
import { Max7219, Mcp3008, Tm1637, Ws2812 } from './serial-devices';
import { Ssd1306 } from './ssd1306';

/** Models of the bus parts; a part definition names its model in `params.model`. */
const MODELS = {
  ssd1306: Ssd1306,
  'lcd-i2c': LcdI2c,
  'lcd-parallel': LcdParallel,
  lm75: Lm75,
  eeprom: Eeprom24c02,
  ds1307: Ds1307,
  pcf8574: Pcf8574,
  max7219: Max7219,
  tm1637: Tm1637,
  ws2812: Ws2812,
  mcp3008: Mcp3008,
  hcsr04: HcSr04,
  dht11: Dht11,
  ir: IrReceiver,
  ps2: Ps2Keyboard,
} as const;
export type BusModel = keyof typeof MODELS;

export function createBusDevice(def: PartDef, opts: Options, host: DeviceHost): Device {
  const model = def.params?.model as BusModel | undefined;
  const Model = model && MODELS[model];
  if (!Model) throw new Error(`Нет модели для детали ${def.id}`);
  return new Model(def, opts, host);
}

/** Lets `createDevice` build bus parts; called once by the runtime. */
export function registerBusDevices() {
  deviceFactories.set('bus', createBusDevice);
}
