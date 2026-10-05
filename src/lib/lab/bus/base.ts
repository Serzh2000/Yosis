import { BOARD_CLOCK_HZ, Device, type DeviceHost } from '../devices';

/** The part of the laboratory that bidirectional pins need. */
export interface BusHost extends DeviceHost {
  /**
   * Drive an `io` pin of a device: 0 pulls the line low, 1 pushes it high, null lets go (the
   * line is pulled up). `at` schedules the change for a later cycle.
   */
  pad(device: Device, pin: number, level: 0 | 1 | null, at?: number): void;
}

/** Cycles in the given number of microseconds of board time. */
export const us = (microseconds: number) => Math.round((microseconds * BOARD_CLOCK_HZ) / 1e6);
export const ms = (milliseconds: number) => us(milliseconds * 1000);

/**
 * A part on a serial bus. Pins listed as `in` carry the FPGA's levels to the part; `io` pins are
 * open-drain lines that both sides may pull low. All timing is decoded from edges, so the part
 * works at any bus speed.
 */
export abstract class BusDevice extends Device {
  /** Levels seen on every pin; kept from events because probes are refreshed in a fixed order. */
  protected levels: (0 | 1)[] = this.pins.map(() => 1);
  /** Cycle of the latest event or frame. */
  protected now = 0;

  protected pad(pin: number, level: 0 | 1 | null, at?: number) {
    (this.host as Partial<BusHost>).pad?.(this, pin, level, at);
  }
  /** Pull a line low, or let it go. */
  protected pull(pin: number, low: boolean, at?: number) {
    this.pad(pin, low ? 0 : null, at);
  }
  start() {
    this.levels = this.pins.map((_, pin) => (this.probes[pin] ? this.level(pin) : 1));
    this.now = this.host.cycle();
    this.reset();
  }
  /** Called once the wires are known; set the starting state of the lines here. */
  protected reset(): void {}
  pinChanged(pin: number, level: 0 | 1, cycle: number) {
    this.levels[pin] = level;
    this.now = cycle;
    this.edge(pin, level, cycle);
  }
  protected edge(_pin: number, _level: 0 | 1, _cycle: number): void {}
  frame(cycle: number, elapsed: number) {
    this.now = Math.max(this.now, cycle);
    super.frame(cycle, elapsed);
  }
  /** Level of a pin right now; an unwired pin reads high like a floating pulled-up line. */
  protected line(pin: number): 0 | 1 {
    return this.probes[pin] ? this.level(pin) : 1;
  }
}

/** A device's own copy of its settings that survives a reset of the bench. */
export function option<T>(opts: Record<string, unknown>, key: string, fallback: T): T {
  const value = opts[key];
  return (value === undefined ? fallback : value) as T;
}
