import { I2cDevice } from './i2c';
import { option } from './base';

export const OLED_WIDTH = 128;
export const OLED_PAGES = 8;
/** Number of argument bytes that follow a command byte. */
const ARGUMENTS: Record<number, number> = {
  0x20: 1,
  0x21: 2,
  0x22: 2,
  0x26: 6,
  0x27: 6,
  0x29: 5,
  0x2a: 5,
  0x81: 1,
  0x8d: 1,
  0xa3: 2,
  0xa8: 1,
  0xd3: 1,
  0xd5: 1,
  0xd9: 1,
  0xda: 1,
  0xdb: 1,
};

/**
 * SSD1306 128x64 OLED on I2C. Memory is 8 pages of 128 bytes; one byte is a column of eight
 * pixels, least significant bit on top. After reset the panel is off and its charge pump is
 * off, as on the real chip, so a program has to switch both on before anything shows.
 */
export class Ssd1306 extends I2cDevice {
  readonly ram = new Uint8Array(OLED_WIDTH * OLED_PAGES);
  rev = 0;
  private awake = false;
  private pump = false;
  private contrast = 0x7f;
  private invert = false;
  private allOn = false;
  private flipX = false;
  private flipY = false;
  private mode = 0;
  private column = 0;
  private page = 0;
  private columnRange = [0, OLED_WIDTH - 1];
  private pageRange = [0, OLED_PAGES - 1];
  private phase: 'control' | 'stream' | 'single' = 'control';
  private isData = false;
  private command = -1;
  private args: number[] = [];
  private address7 = option(this.opts, 'address', 0x3c);
  /** Data bytes written, for the part's counter. */
  writes = 0;

  address(address: number) {
    return address === this.address7;
  }
  begin() {
    // After every START the next byte is a control byte again.
    this.phase = 'control';
    this.command = -1;
  }
  write(byte: number) {
    if (this.phase === 'control') {
      this.isData = (byte & 0x40) !== 0;
      this.phase = byte & 0x80 ? 'single' : 'stream';
      return true;
    }
    if (this.phase === 'single') this.phase = 'control';
    if (this.isData) this.data(byte);
    else this.accept(byte);
    return true;
  }
  read() {
    return 0;
  }

  private accept(byte: number) {
    if (this.command >= 0) {
      this.args.push(byte);
      if (this.args.length >= (ARGUMENTS[this.command] ?? 0)) {
        this.execute(this.command, this.args);
        this.command = -1;
      }
      return;
    }
    if (ARGUMENTS[byte]) {
      this.command = byte;
      this.args = [];
      return;
    }
    this.execute(byte, []);
  }
  private execute(code: number, args: number[]) {
    this.rev++;
    if (code <= 0x0f) this.column = (this.column & 0xf0) | code;
    else if (code <= 0x1f) this.column = (this.column & 0x0f) | ((code & 0x0f) << 4);
    else if (code >= 0xb0 && code <= 0xb7) this.page = code & 7;
    else
      switch (code) {
        case 0x20:
          this.mode = args[0] & 3;
          break;
        case 0x21:
          this.columnRange = [args[0] & 0x7f, args[1] & 0x7f];
          this.column = this.columnRange[0];
          break;
        case 0x22:
          this.pageRange = [args[0] & 7, args[1] & 7];
          this.page = this.pageRange[0];
          break;
        case 0x81:
          this.contrast = args[0];
          break;
        case 0x8d:
          this.pump = (args[0] & 0x04) !== 0;
          break;
        case 0xa0:
        case 0xa1:
          this.flipX = code === 0xa1;
          break;
        case 0xa4:
        case 0xa5:
          this.allOn = code === 0xa5;
          break;
        case 0xa6:
        case 0xa7:
          this.invert = code === 0xa7;
          break;
        case 0xae:
        case 0xaf:
          this.awake = code === 0xaf;
          break;
        case 0xc0:
        case 0xc8:
          this.flipY = code === 0xc8;
          break;
        default:
        // Clock, multiplex, offset, pre-charge and similar settings change nothing visible here.
      }
  }
  private data(byte: number) {
    this.ram[this.page * OLED_WIDTH + this.column] = byte;
    this.rev++;
    this.writes++;
    if (this.mode === 2) {
      this.column = (this.column + 1) % OLED_WIDTH;
      return;
    }
    const [c0, c1] = this.columnRange;
    const [p0, p1] = this.pageRange;
    if (this.mode === 0) {
      if (++this.column > c1) {
        this.column = c0;
        this.page = this.page >= p1 ? p0 : this.page + 1;
      }
    } else if (++this.page > p1) {
      this.page = p0;
      this.column = this.column >= c1 ? c0 : this.column + 1;
    }
  }

  /** Is pixel (x, y) lit on the glass, taking inversion and flips into account? */
  pixel(x: number, y: number): boolean {
    if (!this.visible || this.allOn) return this.visible && this.allOn;
    // The panel is mounted so that its default scan (A0, C0) shows the picture turned by 180
    // degrees; the usual start-up sequence sends A1 and C8 to set it upright again.
    const column = this.flipX ? x : OLED_WIDTH - 1 - x;
    const row = this.flipY ? y : 63 - y;
    const bit = (this.ram[(row >> 3) * OLED_WIDTH + column] >> (row & 7)) & 1;
    return (bit === 1) !== this.invert;
  }
  get visible() {
    return this.awake && this.pump;
  }
  protected update() {
    this.view = {
      ram: this.ram,
      rev: this.rev,
      awake: this.awake,
      pump: this.pump,
      contrast: this.contrast,
      invert: this.invert,
      allOn: this.allOn,
      flipX: this.flipX,
      flipY: this.flipY,
      writes: this.writes,
    };
  }
}
