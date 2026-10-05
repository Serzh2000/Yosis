import { BusDevice } from './base';

/** What the part does with the bytes of an I2C transaction. */
export interface I2cHandler {
  /** Does the part answer to this 7-bit address? Return false to stay silent. */
  address(address: number, read: boolean, cycle: number): boolean;
  /** A byte written by the master; return false to NACK it. */
  write(byte: number, cycle: number): boolean;
  /** The next byte the master reads. */
  read(cycle: number): number;
  /** START or repeated START on the bus (whoever it is for), and STOP. */
  begin?(cycle: number): void;
  end?(cycle: number): void;
}

type Mode = 'idle' | 'ignore' | 'addr' | 'wr' | 'rd';

/**
 * The slave side of I2C, decoded from edges alone: START and STOP are SDA moving while SCL is
 * high, data is sampled on rising SCL and changes after falling SCL. `n` counts the rising
 * clock edges of the current byte; the ninth is the acknowledge bit.
 */
export class I2cSlave {
  private mode: Mode = 'idle';
  private after: Mode = 'idle';
  private n = 0;
  private shift = 0;
  private ack = false;
  private out = 0;
  constructor(
    private handler: I2cHandler,
    /** Pull SDA low (true) or let it go (false). */
    private drive: (low: boolean) => void,
  ) {}

  /** SDA changed while SCL was at `scl`. */
  sdaChanged(sda: 0 | 1, scl: 0 | 1, cycle: number) {
    if (!scl) return;
    if (!sda) this.begin(cycle);
    else this.end(cycle);
  }
  /** SCL changed while SDA was at `sda`. */
  sclChanged(scl: 0 | 1, sda: 0 | 1, cycle: number) {
    if (scl) this.rise(sda, cycle);
    else this.fall();
  }

  private begin(cycle: number) {
    this.drive(false);
    this.mode = 'addr';
    this.n = 0;
    this.shift = 0;
    this.handler.begin?.(cycle);
  }
  private end(cycle: number) {
    this.drive(false);
    if (this.mode !== 'idle') this.handler.end?.(cycle);
    this.mode = 'idle';
  }
  private rise(sda: 0 | 1, cycle: number) {
    if (this.mode === 'idle' || this.mode === 'ignore') return;
    this.n++;
    if (this.mode === 'rd') {
      // The ninth clock carries the master's answer: low asks for another byte.
      if (this.n === 9 && sda) this.mode = 'ignore';
      return;
    }
    if (this.n <= 8) this.shift = ((this.shift << 1) | sda) & 0xff;
    if (this.n !== 8) return;
    if (this.mode === 'addr') {
      const read = (this.shift & 1) === 1;
      this.ack = this.handler.address(this.shift >> 1, read, cycle);
      this.after = this.ack ? (read ? 'rd' : 'wr') : 'ignore';
    } else this.ack = this.handler.write(this.shift, cycle);
  }
  private fall() {
    if (this.mode === 'idle' || this.mode === 'ignore') return;
    if (this.mode === 'rd') {
      if (this.n >= 1 && this.n < 8) this.drive(!((this.out >> (7 - this.n)) & 1));
      else if (this.n === 8) this.drive(false);
      else if (this.n === 9) this.sendByte();
      return;
    }
    if (this.n === 8) this.drive(this.ack);
    else if (this.n === 9) {
      this.drive(false);
      this.n = 0;
      this.shift = 0;
      if (this.mode === 'addr') {
        this.mode = this.after;
        if (this.mode === 'rd') this.sendByte();
      }
    }
  }
  private sendByte() {
    this.out = this.handler.read(this.cycleHint);
    this.n = 0;
    this.drive(!((this.out >> 7) & 1));
  }
  /** Cycle of the latest bus event, for handlers that keep time. */
  cycleHint = 0;
}

/** A part with SDA on pin 0 and SCL on pin 1 that answers on one I2C address. */
export abstract class I2cDevice extends BusDevice implements I2cHandler {
  protected slave = new I2cSlave(this, (low) => this.pull(0, low));
  abstract address(address: number, read: boolean, cycle: number): boolean;
  abstract write(byte: number, cycle: number): boolean;
  abstract read(cycle: number): number;
  protected edge(pin: number, level: 0 | 1, cycle: number) {
    this.slave.cycleHint = cycle;
    if (pin === 0) this.slave.sdaChanged(level, this.line(1), cycle);
    else if (pin === 1) this.slave.sclChanged(level, this.line(0), cycle);
  }
}
