import type { LabSim } from '../engine';

/**
 * Connects the `io` pins of parts to pads of the design. Every wire is one driver of the pad;
 * the simulator resolves them (any driver pulling low wins, nothing driving means pull-up).
 */
export class PadWiring {
  private nets = new Map<string, number[]>();
  constructor(private sim: LabSim) {}
  attach(key: string, net: number) {
    this.nets.set(key, [...(this.nets.get(key) ?? []), net]);
    // The line is pulled up from the start, even where the design only reads it.
    this.sim.drivePad(net, key, null);
  }
  drive(key: string, level: 0 | 1 | null, at?: number) {
    for (const net of this.nets.get(key) ?? [])
      if (at !== undefined && at > this.sim.cycle) this.sim.drivePadAt(at, net, key, level);
      else this.sim.drivePad(net, key, level);
  }
}
