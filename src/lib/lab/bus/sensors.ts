import { BusDevice, option, ms, us } from './base';

/**
 * HC-SR04 ultrasonic ranger. A TRIG pulse of at least 10 us makes it send a burst; ECHO then
 * stays high for the round trip, 58 us per centimetre. Pin order: TRIG, ECHO.
 */
export class HcSr04 extends BusDevice {
  private rose = 0;
  private busyUntil = 0;
  measurements = 0;
  protected reset() {
    this.host.out(this, 1, 0);
  }
  protected edge(_pin: number, level: 0 | 1, cycle: number) {
    if (level) {
      this.rose = cycle;
      return;
    }
    if (cycle - this.rose < us(8) || cycle < this.busyUntil) return;
    const distance = Math.max(2, Math.min(400, option(this.opts, 'distance', 50)));
    const begin = cycle + us(200);
    const end = begin + us(distance * 58);
    this.host.out(this, 1, 1, begin);
    this.host.out(this, 1, 0, end);
    this.busyUntil = end;
    this.measurements++;
  }
  act(name: string, value?: unknown) {
    if (name === 'distance') this.opts.distance = Math.max(2, Math.min(400, Number(value)));
  }
  protected update() {
    this.view = {
      distance: option(this.opts, 'distance', 50),
      echoing: this.now < this.busyUntil,
      measurements: this.measurements,
    };
  }
}

/** Bit pulse lengths of the DHT11 in microseconds. */
const DHT_LOW = 50;
const DHT_ZERO = 27;
const DHT_ONE = 70;

/**
 * DHT11 temperature and humidity sensor on one wire. The host pulls the line low for at least
 * 18 ms and lets go; the sensor answers with 80 us low, 80 us high, then 40 bits (a 50 us low
 * and a high of 27 us for 0 or 70 us for 1): humidity, temperature (integer and tenth parts)
 * and a checksum. Pin: DATA (bidirectional, open drain with a pull-up).
 */
export class Dht11 extends BusDevice {
  private fell = 0;
  private busyUntil = 0;
  private lastFrame = [0, 0, 0, 0, 0];
  responses = 0;
  protected edge(_pin: number, level: 0 | 1, cycle: number) {
    if (cycle < this.busyUntil) return;
    if (!level) {
      this.fell = cycle;
      return;
    }
    // The host let go after a long enough low pulse: answer.
    if (this.fell && cycle - this.fell >= ms(16)) this.respond(cycle);
  }
  private respond(cycle: number) {
    const humidity = Math.max(20, Math.min(90, Math.round(option(this.opts, 'humidity', 45))));
    const temp = Math.max(0, Math.min(50, Math.round(option(this.opts, 'temp', 24))));
    const bytes = [humidity, 0, temp, 0, (humidity + temp) & 0xff];
    this.lastFrame = bytes;
    this.fell = 0;
    let at = cycle + us(30);
    const step = (low: 0 | 1, microseconds: number) => {
      this.pad(0, low, at);
      at += us(microseconds);
    };
    step(0, 80);
    step(1, 80);
    for (const byte of bytes)
      for (let bit = 7; bit >= 0; bit--) {
        step(0, DHT_LOW);
        step(1, (byte >> bit) & 1 ? DHT_ONE : DHT_ZERO);
      }
    step(0, DHT_LOW);
    this.pad(0, null, at);
    this.busyUntil = at;
    this.responses++;
  }
  act(name: string, value?: unknown) {
    if (name === 'temp') this.opts.temp = Math.max(0, Math.min(50, Number(value)));
    else if (name === 'humidity') this.opts.humidity = Math.max(20, Math.min(90, Number(value)));
  }
  protected update() {
    this.view = {
      temp: option(this.opts, 'temp', 24),
      humidity: option(this.opts, 'humidity', 45),
      responses: this.responses,
      frame: this.lastFrame,
    };
  }
}

/** The 562.5 us unit of the NEC infrared protocol. */
const NEC_UNIT = us(562.5);
export const REMOTE_KEYS: { id: string; label: string; code: number }[] = [
  { id: 'power', label: '⏻', code: 0x45 },
  { id: 'vol+', label: 'VOL+', code: 0x15 },
  { id: 'vol-', label: 'VOL−', code: 0x07 },
  { id: 'prev', label: '⏮', code: 0x44 },
  { id: 'play', label: '⏯', code: 0x43 },
  { id: 'next', label: '⏭', code: 0x40 },
  { id: '1', label: '1', code: 0x0c },
  { id: '2', label: '2', code: 0x18 },
  { id: '3', label: '3', code: 0x5e },
  { id: '4', label: '4', code: 0x08 },
  { id: '5', label: '5', code: 0x1c },
  { id: '6', label: '6', code: 0x5a },
  { id: '7', label: '7', code: 0x42 },
  { id: '8', label: '8', code: 0x52 },
  { id: '9', label: '9', code: 0x4a },
  { id: '0', label: '0', code: 0x16 },
];

/**
 * IR receiver module with a remote control. The module demodulates the 38 kHz carrier, so OUT
 * idles high and goes low for every burst. A key sends one NEC frame: a 9 ms burst and 4.5 ms
 * gap, then address, inverted address, command and inverted command (least significant bit
 * first, each bit a 562 us burst followed by a 562 us gap for 0 or 1.69 ms for 1), and a final
 * burst. Pin: OUT.
 */
export class IrReceiver extends BusDevice {
  private free = 0;
  last = -1;
  presses = 0;
  protected reset() {
    this.host.out(this, 0, 1);
  }
  act(name: string, value?: unknown) {
    if (name !== 'press') return;
    const command = REMOTE_KEYS.find((key) => key.id === value)?.code ?? Number(value);
    const address = option(this.opts, 'address', 0);
    let at = Math.max(this.host.cycle() + 2, this.free);
    const mark = (low: boolean, units: number) => {
      this.host.out(this, 0, low ? 0 : 1, at);
      at += Math.round(units * NEC_UNIT);
    };
    mark(true, 16);
    mark(false, 8);
    const word =
      (address & 0xff) |
      ((~address & 0xff) << 8) |
      ((command & 0xff) << 16) |
      ((~command & 0xff) << 24);
    for (let bit = 0; bit < 32; bit++) {
      mark(true, 1);
      mark(false, (word >>> bit) & 1 ? 3 : 1);
    }
    mark(true, 1);
    this.host.out(this, 0, 1, at);
    this.free = at + ms(40);
    this.last = command;
    this.presses++;
  }
  protected update() {
    this.view = { last: this.last, presses: this.presses };
  }
}

/** Scan code set 2 make codes; keys with `extended` are sent after an E0 prefix. */
export const PS2_KEYS: { id: string; label: string; code: number; extended?: boolean }[] = [
  ...'QWERTYUIOP'.split('').map((c, i) => ({
    id: c,
    label: c,
    code: [0x15, 0x1d, 0x24, 0x2d, 0x2c, 0x35, 0x3c, 0x43, 0x44, 0x4d][i],
  })),
  ...'ASDFGHJKL'.split('').map((c, i) => ({
    id: c,
    label: c,
    code: [0x1c, 0x1b, 0x23, 0x2b, 0x34, 0x33, 0x3b, 0x42, 0x4b][i],
  })),
  ...'ZXCVBNM'
    .split('')
    .map((c, i) => ({ id: c, label: c, code: [0x1a, 0x22, 0x21, 0x2a, 0x32, 0x31, 0x3a][i] })),
  ...'1234567890'.split('').map((c, i) => ({
    id: c,
    label: c,
    code: [0x16, 0x1e, 0x26, 0x25, 0x2e, 0x36, 0x3d, 0x3e, 0x46, 0x45][i],
  })),
  { id: 'Space', label: 'Пробел', code: 0x29 },
  { id: 'Enter', label: 'Enter', code: 0x5a },
  { id: 'Esc', label: 'Esc', code: 0x76 },
  { id: 'Backspace', label: '⌫', code: 0x66 },
  { id: 'Up', label: '↑', code: 0x75, extended: true },
  { id: 'Down', label: '↓', code: 0x72, extended: true },
  { id: 'Left', label: '←', code: 0x6b, extended: true },
  { id: 'Right', label: '→', code: 0x74, extended: true },
];

/**
 * PS/2 keyboard. The keyboard owns the clock: about 12.5 kHz, data valid before each falling
 * edge, eleven bits per byte (start 0, eight data bits least significant first, odd parity,
 * stop 1). A key press sends its make code, a release F0 and the code. The keyboard waits while
 * the host holds CLK low. Pin order: CLK, DATA (both open drain).
 */
export class Ps2Keyboard extends BusDevice {
  private queue: number[] = [];
  private busyUntil = 0;
  sent: number[] = [];
  act(name: string, value?: unknown) {
    if (name !== 'key') return;
    const { id, on } = value as { id: string; on: boolean };
    const key = PS2_KEYS.find((item) => item.id === id);
    if (!key) return;
    const prefix = key.extended ? [0xe0] : [];
    this.queue.push(...prefix, ...(on ? [key.code] : [0xf0, key.code]));
    this.pump(this.host.cycle());
  }
  protected edge(_pin: number, _level: 0 | 1, cycle: number) {
    this.pump(cycle);
  }
  protected update(cycle: number) {
    this.pump(cycle);
    this.view = { queued: this.queue.length, sent: this.sent.slice(-8) };
  }
  private pump(cycle: number) {
    // Send only on an idle bus: both lines released and the host not inhibiting.
    if (!this.queue.length || cycle < this.busyUntil || !this.line(0) || !this.line(1)) return;
    let at = cycle + us(50);
    for (const byte of this.queue) {
      const parity = (countBits(byte) & 1) === 0 ? 1 : 0;
      const bits = [0, ...Array.from({ length: 8 }, (_, i) => (byte >> i) & 1), parity, 1];
      for (const bit of bits) {
        this.pad(1, bit ? null : 0, at);
        this.pad(0, 0, at + us(20));
        this.pad(0, null, at + us(60));
        at += us(80);
      }
      this.pad(1, null, at);
      at += us(400);
      this.sent.push(byte);
    }
    if (this.sent.length > 64) this.sent.splice(0, this.sent.length - 32);
    this.queue = [];
    this.busyUntil = at;
  }
}
function countBits(value: number): number {
  let count = 0;
  for (; value; value >>= 1) count += value & 1;
  return count;
}
