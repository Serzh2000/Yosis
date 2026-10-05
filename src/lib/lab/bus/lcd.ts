import { BusDevice, option } from './base';
import { Hd44780 } from './hd44780';
import { I2cDevice } from './i2c';

/** What the picture of a character display needs. */
function lcdView(lcd: Hd44780, extra: Record<string, unknown> = {}) {
  return {
    lcd,
    rev: lcd.rev,
    rows: lcd.rows,
    columns: lcd.columns,
    displayOn: lcd.displayOn,
    cursorOn: lcd.cursorOn,
    blinkOn: lcd.blinkOn,
    cursor: lcd.cursor(),
    tooFast: lcd.tooFast,
    ...extra,
  };
}

/**
 * HD44780 behind a PCF8574 I2C backpack. The expander's pins are wired as on the common
 * module: P0 RS, P1 RW, P2 E, P3 backlight, P4..P7 data D4..D7.
 */
export class LcdI2c extends I2cDevice {
  readonly lcd = new Hd44780(this.params.columns as number, this.params.rows as number);
  private port = 0xff;
  private address7 = option(this.opts, 'address', 0x27);
  address(address: number) {
    return address === this.address7;
  }
  write(byte: number, cycle: number) {
    const fell = (this.port & 0x04) !== 0 && (byte & 0x04) === 0;
    this.port = byte;
    // The controller latches on the falling edge of E, and only when writing (RW low).
    if (fell && !(byte & 0x02)) this.lcd.nibble(byte & 1, byte >> 4, cycle);
    return true;
  }
  read() {
    // Reading the expander returns the pins; the busy flag (D7) of the display is always clear.
    return this.port & 0x7f;
  }
  protected update() {
    this.view = lcdView(this.lcd, { backlight: (this.port & 0x08) !== 0 });
  }
}

/**
 * HD44780 wired directly: RS, E and four (D4..D7) or eight (D0..D7) data pins, in that pin order.
 * RW is tied to ground, so the display is only ever written.
 */
export class LcdParallel extends BusDevice {
  readonly lcd = new Hd44780(this.params.columns as number, this.params.rows as number);
  private wide = (this.params.bits as number) === 8;
  protected edge(pin: number, level: 0 | 1, cycle: number) {
    if (pin !== 1 || level !== 0) return;
    const rs = this.line(0);
    const width = this.wide ? 8 : 4;
    let value = 0;
    for (let bit = 0; bit < width; bit++) value |= this.line(2 + bit) << bit;
    if (this.wide) this.lcd.byte(rs, value, cycle);
    else this.lcd.nibble(rs, value, cycle);
  }
  protected update() {
    this.view = lcdView(this.lcd, { backlight: true });
  }
}
