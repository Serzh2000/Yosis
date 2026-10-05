import { BOARD_CLOCK_HZ } from '../devices';
import { ms, option } from './base';
import { I2cDevice } from './i2c';

/**
 * LM75 temperature sensor. Registers: 0 temperature (two bytes, 0.5 degree steps), 1 configuration,
 * 2 hysteresis, 3 over-temperature limit. The first byte of every write picks the register.
 */
export class Lm75 extends I2cDevice {
  private pointer = 0;
  private fresh = true;
  private byteIndex = 0;
  private config = 0;
  private limits = [0x4b00, 0x5000];
  private address7 = option(this.opts, 'address', 0x48);
  address(address: number) {
    return address === this.address7;
  }
  begin() {
    this.fresh = true;
    this.byteIndex = 0;
  }
  /** Temperature as the two register bytes: whole degrees (two's complement) and the half. */
  private temperature(): number {
    const halves = Math.round(option(this.opts, 'temp', 25) * 2);
    const bits = ((halves << 7) & 0xff80) >>> 0;
    return bits & 0xffff;
  }
  private register(): number {
    return this.pointer === 0
      ? this.temperature()
      : this.pointer === 1
        ? this.config << 8
        : this.limits[this.pointer - 2];
  }
  write(byte: number) {
    if (this.fresh) {
      this.pointer = byte & 3;
      this.fresh = false;
      this.byteIndex = 0;
      return true;
    }
    if (this.pointer === 1) this.config = byte;
    else if (this.pointer >= 2) {
      const slot = this.pointer - 2;
      this.limits[slot] =
        this.byteIndex === 0
          ? (byte << 8) | (this.limits[slot] & 0xff)
          : (this.limits[slot] & 0xff00) | byte;
    }
    this.byteIndex++;
    return true;
  }
  read() {
    const value = this.register();
    const high = this.pointer === 1 ? true : this.byteIndex % 2 === 0;
    this.byteIndex++;
    return high ? value >> 8 : value & 0xff;
  }
  act(name: string, value?: unknown) {
    if (name === 'temp') this.opts.temp = Math.max(-25, Math.min(100, Number(value)));
  }
  protected update() {
    this.view = { temp: option(this.opts, 'temp', 25) };
  }
}

const EEPROM_SIZE = 256;
const EEPROM_PAGE = 8;

/**
 * 24C02 EEPROM: 256 bytes, 8-byte pages. A write needs a few milliseconds to finish, and during
 * that time the chip does not answer (this is how a program polls for completion). The bytes
 * live in the part's options so they survive a restart of the simulation, like real flash.
 */
export class Eeprom24c02 extends I2cDevice {
  private data: number[];
  private pointer = 0;
  private fresh = true;
  private pending: { at: number; value: number }[] = [];
  private busyUntil = 0;
  private address7 = option(this.opts, 'address', 0x50);
  private rev = 0;
  /** Address of the byte written last, for the picture. */
  private lastWrite = -1;
  constructor(...args: ConstructorParameters<typeof I2cDevice>) {
    super(...args);
    const stored = this.opts.data;
    this.data =
      Array.isArray(stored) && stored.length === EEPROM_SIZE
        ? (stored as number[])
        : new Array<number>(EEPROM_SIZE).fill(0xff);
    this.opts.data = this.data;
  }
  address(address: number, _read: boolean, cycle: number) {
    return address === this.address7 && cycle >= this.busyUntil;
  }
  begin() {
    this.fresh = true;
    this.pending = [];
  }
  write(byte: number) {
    if (this.fresh) {
      this.pointer = byte;
      this.fresh = false;
      return true;
    }
    // Writes stay inside their page: past the last byte the address wraps to the page start.
    this.pending.push({ at: this.pointer, value: byte });
    this.pointer = (this.pointer & ~(EEPROM_PAGE - 1)) | ((this.pointer + 1) & (EEPROM_PAGE - 1));
    return true;
  }
  end(cycle: number) {
    if (!this.pending.length) return;
    for (const item of this.pending) {
      this.data[item.at] = item.value;
      this.lastWrite = item.at;
    }
    this.pending = [];
    this.rev++;
    this.busyUntil = cycle + ms(5);
  }
  read() {
    const value = this.data[this.pointer];
    this.pointer = (this.pointer + 1) % EEPROM_SIZE;
    return value;
  }
  /** The stored byte at an address, for tests and the picture. */
  peek(address: number) {
    return this.data[address];
  }
  act(name: string, value?: unknown) {
    if (name === 'erase') {
      this.data.fill(0xff);
      this.rev++;
      this.lastWrite = -1;
    } else if (name === 'poke') {
      const { at, value: byte } = value as { at: number; value: number };
      this.data[at & 0xff] = byte & 0xff;
      this.rev++;
    }
  }
  protected update(cycle: number) {
    this.view = {
      data: this.data,
      rev: this.rev,
      busy: cycle < this.busyUntil,
      lastWrite: this.lastWrite,
    };
  }
}

/** Two digits of binary coded decimal. */
const bcd = (value: number) => ((Math.floor(value / 10) % 10) << 4) | (value % 10);
const unbcd = (value: number) => (value >> 4) * 10 + (value & 15);

/**
 * DS1307 real-time clock. Registers 0..6 hold seconds (bit 7 halts the clock), minutes, hours
 * (24-hour mode), weekday, date, month and year as BCD; 0x08..0x3F is spare RAM. Time runs with
 * the board clock, optionally faster so that a bench demo does not take real minutes.
 */
export class Ds1307 extends I2cDevice {
  private ram = new Uint8Array(64);
  private pointer = 0;
  private fresh = true;
  /** Registers 0..6 as latched at the START of a transaction. */
  private snapshot: number[] = [];
  /** Time of day in simulated milliseconds since the epoch at cycle `since`. */
  private base = Date.UTC(2000, 0, 1, 0, 0, 0);
  private since = 0;
  private halted = true;
  private weekday = 1;
  private address7 = option(this.opts, 'address', 0x68);
  constructor(...args: ConstructorParameters<typeof I2cDevice>) {
    super(...args);
    const start = option<number | undefined>(this.opts, 'start', undefined);
    if (start !== undefined) {
      this.base = start;
      this.halted = false;
    }
  }
  private get warp() {
    return Math.max(1, option(this.opts, 'warp', 1));
  }
  /** Simulated time at a board cycle, in milliseconds. */
  private clock(cycle: number): number {
    if (this.halted) return this.base;
    return this.base + ((cycle - this.since) / BOARD_CLOCK_HZ) * 1000 * this.warp;
  }
  private fields(cycle: number) {
    const date = new Date(this.clock(cycle));
    return {
      second: date.getUTCSeconds(),
      minute: date.getUTCMinutes(),
      hour: date.getUTCHours(),
      date: date.getUTCDate(),
      month: date.getUTCMonth() + 1,
      year: date.getUTCFullYear() - 2000,
    };
  }
  private registers(cycle: number): number[] {
    const f = this.fields(cycle);
    return [
      bcd(f.second) | (this.halted ? 0x80 : 0),
      bcd(f.minute),
      bcd(f.hour),
      this.weekday,
      bcd(f.date),
      bcd(f.month),
      bcd(f.year),
    ];
  }
  address(address: number) {
    return address === this.address7;
  }
  begin(cycle: number) {
    this.fresh = true;
    this.snapshot = this.registers(cycle);
  }
  write(byte: number, cycle: number) {
    if (this.fresh) {
      this.pointer = byte & 0x3f;
      this.fresh = false;
      return true;
    }
    this.store(this.pointer, byte, cycle);
    this.pointer = (this.pointer + 1) & 0x3f;
    return true;
  }
  private store(register: number, byte: number, cycle: number) {
    if (register > 6) {
      this.ram[register] = byte;
      return;
    }
    const f = this.fields(cycle);
    const wasHalted = this.halted;
    if (register === 0) {
      f.second = Math.min(59, unbcd(byte & 0x7f));
      this.halted = (byte & 0x80) !== 0;
    } else if (register === 1) f.minute = Math.min(59, unbcd(byte));
    else if (register === 2) f.hour = Math.min(23, unbcd(byte & 0x3f));
    else if (register === 3) this.weekday = byte & 7;
    else if (register === 4) f.date = Math.max(1, Math.min(31, unbcd(byte)));
    else if (register === 5) f.month = Math.max(1, Math.min(12, unbcd(byte)));
    else f.year = unbcd(byte);
    this.base = Date.UTC(2000 + f.year, f.month - 1, f.date, f.hour, f.minute, f.second);
    // The clock starts counting from the moment CH is cleared or a field is set.
    if (wasHalted !== this.halted || !this.halted) this.since = cycle;
  }
  read() {
    const register = this.pointer;
    this.pointer = (this.pointer + 1) & 0x3f;
    return register <= 6 ? (this.snapshot[register] ?? 0) : this.ram[register];
  }
  act(name: string, value?: unknown) {
    if (name === 'warp') this.opts.warp = Number(value);
  }
  protected update(cycle: number) {
    const f = this.fields(cycle);
    const two = (n: number) => String(n).padStart(2, '0');
    this.view = {
      time: `${two(f.hour)}:${two(f.minute)}:${two(f.second)}`,
      date: `${two(f.date)}.${two(f.month)}.20${two(f.year)}`,
      halted: this.halted,
      warp: this.warp,
    };
  }
}

/**
 * PCF8574 8-bit I/O expander with a light and a switch on every pin. Writing 1 releases a pin
 * (it reads high through the weak pull-up), writing 0 pulls it low; a closed switch pulls the
 * pin low too. The lights are wired to supply, so a pin at 0 lights its LED.
 */
export class Pcf8574 extends I2cDevice {
  private port = 0xff;
  private address7 = option(this.opts, 'address', 0x20);
  private get switches() {
    return option(this.opts, 'switches', 0);
  }
  address(address: number) {
    return address === this.address7;
  }
  write(byte: number) {
    this.port = byte;
    return true;
  }
  read() {
    return this.port & ~this.switches & 0xff;
  }
  act(name: string, value?: unknown) {
    if (name === 'toggle') this.opts.switches = this.switches ^ (1 << (value as number));
  }
  protected update() {
    this.view = {
      port: this.port,
      switches: this.switches,
      pins: this.port & ~this.switches & 0xff,
    };
  }
}
