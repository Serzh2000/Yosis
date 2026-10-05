import { glyphRows } from './font';
import { ms, us } from './base';

/**
 * The HD44780 character LCD controller. Both the PCF8574 backpack and the direct wiring feed it
 * the same way: one `nibble` or `byte` per falling edge of E. Commands that arrive before the
 * previous one could finish are counted, because a real display would drop them.
 */
export class Hd44780 {
  readonly ddram = new Uint8Array(128).fill(0x20);
  readonly cgram = new Uint8Array(64);
  rev = 0;
  /** Bytes that arrived while the controller was still busy (after start-up). */
  tooFast = 0;
  address = 0;
  inCgram = false;
  increment = true;
  entryShift = false;
  displayOn = false;
  cursorOn = false;
  blinkOn = false;
  /** Display shift in characters, as moved by the shift commands. */
  shift = 0;
  eightBit = true;
  twoLine = false;
  private pending: number | null = null;
  private busyUntil = 0;
  private checking = false;

  constructor(
    readonly columns: number,
    readonly rows: number,
  ) {}

  /** A transfer on D7..D4 only (4-bit mode, or the 8-bit start-up with D3..D0 low). */
  nibble(rs: number, value: number, cycle: number) {
    if (this.eightBit) {
      // Right after power-up the chip expects 8 bits; with only D7..D4 wired the rest read 0.
      this.byte(rs, (value & 0x0f) << 4, cycle);
      return;
    }
    if (this.pending === null) this.pending = value & 0x0f;
    else {
      const high = this.pending;
      this.pending = null;
      this.byte(rs, (high << 4) | (value & 0x0f), cycle);
    }
  }

  byte(rs: number, value: number, cycle: number) {
    if (this.checking && cycle < this.busyUntil) this.tooFast++;
    this.rev++;
    if (rs) {
      this.write(value);
      this.busyUntil = cycle + us(37 * 0.9);
      return;
    }
    this.command(value);
    const slow = value === 0x01 || (value & 0xfe) === 0x02;
    this.busyUntil = cycle + (slow ? ms(1.52 * 0.9) : us(37 * 0.9));
    // The 8-bit function sets of the start-up need longer waits that are not checked.
    if (value > 0x3f || (value & 0xf0) === 0x00) this.checking = true;
  }

  private command(value: number) {
    if (value & 0x80) {
      this.address = value & 0x7f;
      this.inCgram = false;
    } else if (value & 0x40) {
      this.address = value & 0x3f;
      this.inCgram = true;
    } else if (value & 0x20) {
      const wasEight = this.eightBit;
      this.eightBit = (value & 0x10) !== 0;
      this.twoLine = (value & 0x08) !== 0;
      // Switching to 4 bits happens in the middle of a byte: the next nibble is a high one.
      if (wasEight && !this.eightBit) this.pending = null;
    } else if (value & 0x10) {
      const right = (value & 0x04) !== 0;
      // Shifting the display left makes the window look further along the memory.
      if (value & 0x08) this.shift = (this.shift + (right ? -1 : 1) + this.span) % this.span;
      else this.moveAddress(right ? 1 : -1);
    } else if (value & 0x08) {
      this.displayOn = (value & 0x04) !== 0;
      this.cursorOn = (value & 0x02) !== 0;
      this.blinkOn = (value & 0x01) !== 0;
    } else if (value & 0x04) {
      this.increment = (value & 0x02) !== 0;
      this.entryShift = (value & 0x01) !== 0;
    } else if (value & 0x02) {
      this.address = 0;
      this.shift = 0;
      this.inCgram = false;
    } else if (value & 0x01) {
      this.ddram.fill(0x20);
      this.address = 0;
      this.shift = 0;
      this.increment = true;
      this.inCgram = false;
    }
  }
  /** Characters in one line of memory. */
  private get span() {
    return this.twoLine ? 40 : 80;
  }
  private write(value: number) {
    if (this.inCgram) {
      this.cgram[this.address & 0x3f] = value & 0x1f;
      this.address = (this.address + (this.increment ? 1 : -1)) & 0x3f;
      return;
    }
    this.ddram[this.address & 0x7f] = value;
    if (this.entryShift)
      this.shift = (this.shift + (this.increment ? 1 : -1) + this.span) % this.span;
    this.moveAddress(this.increment ? 1 : -1);
  }
  private moveAddress(step: number) {
    let next = this.address + step;
    if (this.twoLine) {
      if (next === 0x28) next = 0x40;
      else if (next === 0x3f) next = 0x27;
      else if (next === 0x68) next = 0;
      else if (next < 0) next = 0x67;
    } else next = (next + 80) % 80;
    this.address = next & 0x7f;
  }

  /** DDRAM address shown at a screen position, with the display shift applied. */
  cellAddress(row: number, column: number): number {
    if (!this.twoLine) return (column + this.shift + 80 * 4) % 80;
    const base = row % 2 === 1 ? 0x40 : 0;
    // A 20x4 module is a two-line display whose lines continue on rows 3 and 4.
    const offset = row >= 2 ? this.columns : 0;
    return base + ((offset + column + this.shift + 40 * 4) % 40);
  }
  /** Code of the character shown at a screen position (0x20 when the display is off). */
  charAt(row: number, column: number): number {
    if (!this.displayOn) return 0x20;
    if (!this.twoLine && row > 0) return 0x20;
    return this.ddram[this.cellAddress(row, column)];
  }
  /** Text of one screen row as the display shows it. */
  text(row: number): string {
    let line = '';
    for (let column = 0; column < this.columns; column++)
      line += String.fromCharCode(this.charAt(row, column));
    return line;
  }
  /** Eight 5-bit rows for a character code, from the custom glyphs or the built-in font. */
  glyph(code: number): number[] {
    if (code < 16) return Array.from({ length: 8 }, (_, row) => this.cgram[(code & 7) * 8 + row]);
    if (code >= 0x20 && code < 0x80) return glyphRows(code);
    return [0x1f, 0x1f, 0x1f, 0x1f, 0x1f, 0x1f, 0x1f, 0x1f];
  }
  /** Screen position of the cursor, or null while it is off the visible area. */
  cursor(): { row: number; column: number } | null {
    for (let row = 0; row < this.rows; row++) {
      if (row > 0 && !this.twoLine) break;
      for (let column = 0; column < this.columns; column++)
        if (this.cellAddress(row, column) === this.address) return { row, column };
    }
    return null;
  }
}
