import { BusDevice, option, us } from './base';

/** Segments a..g and dp of the digits 0..9 and the Code B extras of the MAX7219 (bit 0 is a). */
const CODE_B = [
  0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x40, 0x79, 0x76, 0x38, 0x73, 0x00,
];

/**
 * MAX7219 LED driver on SPI-like pins: DIN, CLK, CS (LOAD). A frame is 16 bits, most significant
 * first, shifted in on rising CLK and latched on rising CS: four bits of register address, then
 * eight bits of data. Like the real chip it starts shut down with one digit scanned.
 * Pin order: DIN, CLK, CS.
 */
export class Max7219 extends BusDevice {
  readonly registers = new Uint8Array(16);
  private shift = 0;
  private count = 0;
  private active = false;
  rev = 0;
  protected reset() {
    this.active = this.line(2) === 0;
  }
  protected edge(pin: number, level: 0 | 1) {
    if (pin === 2) {
      if (level === 0) {
        this.active = true;
        this.count = 0;
      } else if (this.active) {
        this.active = false;
        if (this.count >= 16) this.latch(this.shift & 0xffff);
      }
    } else if (pin === 1 && level === 1 && this.active) {
      this.shift = ((this.shift << 1) | this.line(0)) >>> 0;
      this.count++;
    }
  }
  private latch(frame: number) {
    const register = (frame >> 8) & 0x0f;
    this.registers[register] = frame & 0xff;
    this.rev++;
  }
  private get shutdown() {
    return (this.registers[0x0c] & 1) === 0;
  }
  /** Number of digits being scanned (scan limit plus one). */
  private get digits() {
    return (this.registers[0x0b] & 7) + 1;
  }
  /** Segment bits of a digit as lit: bit 0..6 are a..g, bit 7 is dp. */
  segments(digit: number): number {
    if (this.registers[0x0f] & 1) return 0xff;
    if (this.shutdown || digit >= this.digits) return 0;
    const raw = this.registers[digit + 1];
    if (!((this.registers[9] >> digit) & 1)) {
      // Raw data: bit 7 is dp, bit 6 is a ... bit 0 is g. Turn it around into a..g, dp.
      let out = raw & 0x80;
      for (let segment = 0; segment < 7; segment++)
        if ((raw >> (6 - segment)) & 1) out |= 1 << segment;
      return out;
    }
    return CODE_B[raw & 0x0f] | (raw & 0x80);
  }
  /** Matrix rows as lit: row r is digit register r, bit 7 is the left column. */
  row(row: number): number {
    if (this.registers[0x0f] & 1) return 0xff;
    if (this.shutdown || row >= this.digits) return 0;
    return this.registers[row + 1];
  }
  protected update() {
    this.view = {
      rows: Array.from({ length: 8 }, (_, row) => this.row(row)),
      segments: Array.from({ length: 8 }, (_, digit) => this.segments(digit)),
      intensity: this.registers[0x0a] & 15,
      shutdown: this.shutdown,
      test: (this.registers[0x0f] & 1) !== 0,
      rev: this.rev,
    };
  }
}

/**
 * TM1637 four-digit display with its own two-wire protocol: START and STOP are DIO moving while
 * CLK is high, bytes go out least significant bit first, and the chip acknowledges each byte by
 * pulling DIO low during the ninth clock. Pin order: CLK, DIO.
 */
export class Tm1637 extends BusDevice {
  readonly digits = new Uint8Array(6);
  private n = 0;
  private shift = 0;
  private acked = 0;
  private writing = false;
  private autoIncrement = true;
  private address = 0;
  private bright = 0;
  private on = false;
  rev = 0;
  protected edge(pin: number, level: 0 | 1) {
    const clk = this.line(0);
    if (pin === 1) {
      if (!clk) return;
      if (level === 0) this.begin();
      else this.finish();
    } else if (level === 1) {
      if (this.n < 8) {
        this.shift |= this.line(1) << this.n;
        if (++this.n === 8) this.byte(this.shift);
      }
    } else if (this.n === 8) {
      // Acknowledge: hold DIO low from the falling edge of the eighth clock to the ninth.
      this.pull(1, true);
      this.acked++;
      this.n = 9;
    } else if (this.n === 9) {
      this.pull(1, false);
      this.n = 0;
      this.shift = 0;
    }
  }
  private begin() {
    this.n = 0;
    this.shift = 0;
    this.writing = false;
  }
  private finish() {
    this.pull(1, false);
    this.n = 0;
    this.writing = false;
  }
  private byte(value: number) {
    if (this.writing) {
      this.digits[this.address % 6] = value;
      if (this.autoIncrement) this.address = (this.address + 1) % 6;
      this.rev++;
      return;
    }
    const kind = value & 0xc0;
    if (kind === 0x40) this.autoIncrement = (value & 0x04) === 0;
    else if (kind === 0xc0) {
      this.address = (value & 0x07) % 6;
      this.writing = true;
    } else if (kind === 0x80) {
      this.on = (value & 0x08) !== 0;
      this.bright = value & 7;
      this.rev++;
    }
  }
  protected update() {
    this.view = {
      digits: Array.from(this.digits),
      on: this.on,
      brightness: this.bright,
      count: this.params.digits ?? 4,
      acked: this.acked,
      rev: this.rev,
    };
  }
}

const WS_BIT_THRESHOLD = us(0.62);
const WS_RESET = us(50);

/**
 * WS2812B addressable LEDs on one wire. A bit is a high pulse: about 0.4 us is a 0, about 0.8 us
 * is a 1. Colours arrive green, red, blue, most significant bit first; the first pixel keeps the
 * first 24 bits and the rest of the stream would travel on. Low for more than 50 us latches.
 */
export class Ws2812 extends BusDevice {
  readonly count = this.params.pixels as number;
  /** Latched colours, three bytes (red, green, blue) per pixel. */
  readonly colors = new Uint8Array(this.count * 3);
  private incoming = new Uint8Array(this.count * 3);
  private rose = 0;
  private fell = 0;
  private bits = 0;
  private pixel = 0;
  private accumulator = 0;
  private dirty = false;
  rev = 0;
  protected edge(_pin: number, level: 0 | 1, cycle: number) {
    if (level) {
      if (this.fell && cycle - this.fell > WS_RESET) this.latch();
      this.rose = cycle;
      return;
    }
    this.fell = cycle;
    const bit = cycle - this.rose >= WS_BIT_THRESHOLD ? 1 : 0;
    this.accumulator = ((this.accumulator << 1) | bit) & 0xffffff;
    if (++this.bits === 24) {
      if (this.pixel < this.count) {
        const grb = this.accumulator;
        this.incoming.set([(grb >> 8) & 255, (grb >> 16) & 255, grb & 255], this.pixel * 3);
        this.dirty = true;
      }
      this.pixel++;
      this.bits = 0;
    }
  }
  private latch() {
    this.bits = 0;
    this.pixel = 0;
    if (!this.dirty) return;
    this.dirty = false;
    this.colors.set(this.incoming);
    this.rev++;
  }
  protected update(cycle: number) {
    // The last frame of a stream is followed by silence, not by another edge.
    if (this.fell && this.line(0) === 0 && cycle - this.fell > WS_RESET) this.latch();
    this.view = { colors: this.colors, count: this.count, rev: this.rev };
  }
}

/**
 * MCP3008 10-bit SPI ADC (mode 0). After CS falls the master sends a start bit, the single-ended
 * bit and three channel bits; the chip answers a null bit and then ten data bits, most
 * significant first, each changing on a falling clock. Extra leading zero bits are fine, so
 * the common three-byte exchange works. Channel 0 is a potentiometer; the others read zero.
 * Pin order: CS, CLK, DIN, DOUT.
 */
export class Mcp3008 extends BusDevice {
  private selected = false;
  private started = false;
  private k = 0;
  private channel = 0;
  private single = true;
  private value = 0;
  protected reset() {
    this.out(false);
  }
  private out(level: boolean) {
    this.host.out(this, 3, level ? 1 : 0);
  }
  private sample(): number {
    const pot = Math.max(0, Math.min(1023, Math.round(option(this.opts, 'value', 512))));
    const read = (channel: number) => (channel === 0 ? pot : 0);
    return this.single
      ? read(this.channel)
      : Math.max(0, read(this.channel & 6) - read((this.channel & 6) + 1));
  }
  protected edge(pin: number, level: 0 | 1) {
    if (pin === 0) {
      this.selected = level === 0;
      this.started = false;
      this.k = 0;
      if (level) this.out(false);
      return;
    }
    if (pin !== 1 || !this.selected) return;
    if (level) {
      if (!this.started) {
        if (this.line(2)) {
          this.started = true;
          this.k = 0;
        }
        return;
      }
      this.k++;
      const din = this.line(2);
      if (this.k === 1) this.single = din === 1;
      else if (this.k <= 4) this.channel = ((this.channel << 1) | din) & 7;
      if (this.k === 1) this.channel = 0;
      if (this.k === 4) this.value = this.sample();
    } else if (this.started) {
      // Null bit after the fifth, then B9..B0 after the sixth to fifteenth rising edge.
      this.out(this.k >= 6 && this.k <= 15 && ((this.value >> (15 - this.k)) & 1) === 1);
    }
  }
  act(name: string, value?: unknown) {
    if (name === 'value') this.opts.value = Math.max(0, Math.min(1023, Number(value)));
  }
  protected update() {
    this.view = { value: option(this.opts, 'value', 512) };
  }
}
