import type { PartKind } from './catalog';

export interface ModuleProfile {
  size: [number, number];
  marking: string;
  /** Package-specific mounting bores in PCB millimetres, never inferred from its corners. */
  holes?: [number, number][];
  label?: [number, number];
}
export const moduleProfiles: Partial<Record<PartKind, ModuleProfile>> = {};
function modules(kinds: PartKind[], profile: ModuleProfile) {
  for (const kind of kinds) moduleProfiles[kind] = profile;
}
modules(['reed'], { size: [19, 18.5], marking: 'KY-021', label: [0, 2] });
modules(['shock'], { size: [18.5, 15], marking: 'KY-002', label: [0, 2] });
modules(['knock'], { size: [19, 18.5], marking: 'KY-031', label: [0, 3] });
modules(['tilt'], { size: [24, 20], marking: 'SW-520D', label: [0, 3] });
modules(['mercury'], { size: [24, 20], marking: 'KY-017', label: [0, 3] });
modules(['mpr121'], { size: [48, 26], marking: 'MPR121', label: [2, 1] });
modules(['ttp224'], { size: [48, 28], marking: 'TTP224', label: [0, 5] });
modules(['mpu6050'], {
  size: [21, 21],
  marking: 'GY-521',
  label: [0, -8],
  holes: [
    [-7, -6],
    [7, -6],
  ],
});
modules(['bmp280', 'bme280'], { size: [21, 18], marking: 'GY-280', label: [0, 2] });
modules(['bmp180'], { size: [21, 18], marking: 'GY-68', label: [0, 2] });
modules(['aht20'], { size: [22, 18], marking: 'AHT20', label: [0, 2] });
modules(['sht31'], { size: [22, 18], marking: 'SHT31', label: [0, 2] });
modules(['adxl345'], { size: [21, 18], marking: 'GY-291', label: [0, 2] });
modules(['hmc5883l', 'qmc5883l'], { size: [20, 18], marking: 'GY-271', label: [0, 2] });
modules(['ads1115'], { size: [28, 20], marking: 'ADS1115', label: [0, -8] });
modules(['mcp4725'], { size: [20, 18], marking: 'MCP4725', label: [0, 2] });
modules(['pcf8591'], { size: [40, 24], marking: 'PCF8591', label: [0, -10] });
modules(['pcf8574'], { size: [38, 24], marking: 'PCF8574', label: [0, -10] });
modules(['mcp23017'], { size: [56, 26], marking: 'MCP23017', label: [0, 3] });
modules(['eeprom'], { size: [30, 22], marking: 'AT24C32', label: [0, 3] });
modules(['shift165', 'shift595'], { size: [38, 24], marking: '74HC', label: [0, 4] });
modules(['lm75'], { size: [24, 20], marking: 'LM75', label: [0, 3] });
modules(['bh1750'], { size: [24, 20], marking: 'GY-302', label: [0, 3] });
modules(['tcs34725'], { size: [24, 24], marking: 'TCS34725', label: [0, 3] });
modules(['ina219'], { size: [30, 28], marking: 'INA219', label: [0, 4] });
modules(['mlx90614'], { size: [22, 22], marking: 'GY-906', label: [0, 4] });
modules(['levelshift'], { size: [26, 20], marking: 'HV / LV', label: [0, 3] });
modules(['pir'], { size: [33, 28], marking: 'HC-SR501', label: [0, -12] });
modules(
  [
    'ldr',
    'flame',
    'touch',
    'hall',
    'hall49e',
    'ntc',
    'thermky013',
    'temperature',
    'lm35',
    'ds18b20',
  ],
  { size: [24, 22], marking: '', label: [0, 4] },
);
modules(['gas', 'mq2', 'mq3', 'mq7', 'mq135'], { size: [36, 28], marking: 'MQ', label: [0, 6] });
modules(['sound', 'vibrsensor', 'metaltouch', 'digtemp', 'irobstacle'], {
  size: [34, 24],
  marking: '',
  label: [0, 5],
});
modules(['soil'], { size: [20, 32], marking: '' });
modules(['water', 'rain', 'steam'], { size: [26, 40], marking: '' });
modules(['soilcap'], { size: [24, 42], marking: 'CAPACITIVE', label: [0, 4] });
modules(['rcwl0516'], { size: [30, 26], marking: 'RCWL-0516', label: [0, 7] });
modules(['linetrack'], { size: [30, 24], marking: 'TCRT5000', label: [0, 5] });
modules(['linetrack3'], { size: [48, 24], marking: 'L     C     R', label: [0, 4] });
modules(['photogate'], { size: [28, 24], marking: 'KY-010', label: [0, 5] });
modules(['hx711'], { size: [32, 24], marking: 'HX711', label: [0, 4] });
modules(['max6675'], { size: [32, 24], marking: 'MAX6675', label: [0, 5] });
modules(['hcsr04'], { size: [45, 22], marking: 'HC-SR04', label: [0, -9] });
modules(['gps'], { size: [35, 35], marking: 'NEO-6M', label: [0, 12] });
modules(['mhz19'], { size: [40, 30], marking: 'MH-Z19B', label: [0, 9] });
modules(['dht11', 'dht22'], { size: [24, 30], marking: '' });
modules(['ws2812ring'], { size: [44, 44], marking: '' });
modules(['ws2812stick'], { size: [56, 16], marking: '' });
modules(['rc522'], {
  size: [60, 40],
  marking: 'MFRC522',
  label: [0, 13],
  holes: [
    [-26, -16],
    [26, -16],
  ],
});
modules(['nrf24'], { size: [34, 22], marking: 'nRF24L01+', label: [-5, 5] });
modules(['hc05'], { size: [40, 28], marking: 'HC-05', label: [0, 8] });
modules(['sdcard', 'dfplayer'], { size: [36, 30], marking: 'microSD', label: [0, 8] });
modules(['rtc', 'ds1302'], { size: [44, 30], marking: 'RTC', label: [-10, 9] });
modules(['pca9685'], { size: [65, 28], marking: 'PCA9685', label: [-20, 7] });
modules(['tm1638'], { size: [72, 42], marking: 'TM1638', label: [0, 10] });
modules(['lanalyzer'], { size: [64, 34], marking: 'LA', label: [0, 3] });
modules(['encoder'], { size: [28, 26], marking: 'KY-040', label: [0, 8] });
modules(['max7219seg'], { size: [76, 26], marking: '' });
modules(['tm1637'], { size: [42, 28], marking: '' });
modules(['oled', 'oled32', 'sh1106', 'oledspi'], { size: [34, 28], marking: '' });
modules(['st7735'], { size: [40, 48], marking: '' });
modules(['ili9341'], { size: [54, 70], marking: '' });
modules(['pcd8544'], { size: [46, 38], marking: '' });
modules(['lcd1602', 'lcd1602p'], { size: [80, 36], marking: '' });
modules(['lcd2004'], { size: [98, 60], marking: '' });
modules(['max7219'], { size: [38, 38], marking: '' });
modules(['relay'], { size: [28, 42], marking: 'SRD-05VDC', label: [0, 13] });
modules(['relay2'], { size: [52, 42], marking: '2 CHANNEL RELAY', label: [0, 13] });
modules(['relay4'], { size: [100, 42], marking: '4 CHANNEL RELAY', label: [0, 13] });
modules(['ssr', 'mosfet'], { size: [34, 30], marking: '', label: [0, 9] });
modules(['stepper', 'l298n'], { size: [66, 48], marking: '' });

modules(['ledbar'], { size: [36, 22], marking: '' });
modules(['traffic'], { size: [24, 44], marking: 'R  Y  G', label: [0, 15] });
modules(['joystick'], { size: [32, 34], marking: 'KY-023', label: [0, 12] });
modules(['keypad'], { size: [58, 68], marking: '' });
modules(['keypad3x4'], { size: [48, 68], marking: '' });
modules(['slidepot'], { size: [64, 20], marking: 'SLIDE', label: [0, 6] });
modules(['activebuzzer'], { size: [24, 24], marking: 'KY-012', label: [0, 6] });
modules(['laser'], { size: [24, 24], marking: 'KY-008', label: [0, 7] });
modules(['spi-loopback'], { size: [24, 18], marking: 'SPI LOOP', label: [0, -5] });
modules(['bicolor'], { size: [24, 20], marking: 'KY-011', label: [0, 4] });
modules(['ledmod'], { size: [24, 20], marking: 'LED', label: [0, 4] });
modules(['led3w'], { size: [26, 28], marking: '3W', label: [0, 8] });
modules(['smdrgb'], { size: [24, 20], marking: 'KY-009', label: [0, 4] });
modules(['btnmod'], { size: [24, 22], marking: 'KY-004', label: [0, 5] });
modules(['collision'], { size: [28, 24], marking: 'LIMIT', label: [0, 6] });
modules(['potmod'], { size: [28, 26], marking: '10K', label: [0, 8] });
modules(['uvsensor'], { size: [24, 20], marking: 'GUVA-S12SD', label: [0, 4] });
modules(['voltagesens'], { size: [30, 24], marking: '0-25V', label: [0, 5] });
modules(['acs712'], { size: [34, 24], marking: 'ACS712', label: [0, 6] });
modules(['irremote'], { size: [36, 38], marking: 'IR', label: [-10, 11] });
modules(['speedsensor'], { size: [34, 26], marking: 'LM393', label: [0, 7] });

/** Desk adapters keep exposed component leads clear of Dupont plugs. Removed for insertion. */
export const benchAdapterSizes: Partial<Record<PartKind, [number, number]>> = {
  led: [18, 22],
  rgb: [22, 22],
  resistor: [15.16, 9],
  button: [20, 24],
  tact12: [24, 28],
  latchbtn: [22, 26],
  potentiometer: [26, 28],
  buzzer: [24, 28],
  piezo: [36, 44],
  switch: [24, 24],
  slideswitch: [26, 24],
  trimpot: [24, 24],
  seg7: [30, 44],
  dip: [28, 28],
  chip595: [48, 28],
  chip165: [48, 28],
};
export const benchAdapterKinds = new Set<PartKind>(Object.keys(benchAdapterSizes) as PartKind[]);

/** Physical package, independent of the peripheral's firmware API. */
export const cabledKinds = new Set<PartKind>([
  'servo',
  'servo360',
  'mg996r',
  'motor',
  'vibration',
  'flowmeter',
  'speaker',
  'nunchuk',
  'magnet',
  'sharpir',
  'force',
  'doorsensor',
  'limit',
]);
export const instrumentKinds = new Set<PartKind>(['scope']);
export function canMount(kind: PartKind) {
  return (
    kind !== 'breadboard' &&
    kind !== 'ws2812ring' &&
    !cabledKinds.has(kind) &&
    !instrumentKinds.has(kind)
  );
}

/** Actual solder-mask colours belong to packages, not UI categories. */
export function pcbColor(kind: PartKind) {
  if (moduleProfiles[kind]?.marking.startsWith('KY-')) return '#202d2a';
  if (['ws2812ring', 'ws2812stick', 'hc05', 'nrf24'].includes(kind)) return '#202c27';
  if (['lcd1602', 'lcd1602p', 'lcd2004', 'water', 'soil'].includes(kind)) return '#246749';
  if (['st7735', 'ili9341', 'ads1115', 'mcp4725'].includes(kind)) return '#9b3037';
  return '#285e91';
}
