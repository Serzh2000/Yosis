import type { LabDesign } from '../../../../shared/lab';
import type { Project } from '../../../../shared/types';
import { CLOCK_PIN } from '../../board-parts';
import type { PartDef } from '../catalog';
import type { Device, Options } from '../devices';
import { LabSim } from '../engine';
import { pinTargets } from '../runtime';
import type { BusHost } from './base';
import { createBusDevice } from './index';
import { PadWiring } from './pads';

export interface BenchPart {
  def: PartDef;
  opts?: Options;
  /** Part pin id -> FPGA pin number. */
  wires: Record<string, number>;
}

/**
 * A small bench for exercising bus parts without the whole laboratory: the design, the parts
 * and their wires. It wires pins exactly as the laboratory does for `in`, `out` and `io` pins.
 */
export class BusBench implements BusHost {
  readonly sim: LabSim;
  readonly devices: Device[] = [];
  private keys = new Map<Device, string>();
  private outputs = new Map<string, number[]>();
  private pads: PadWiring;
  constructor(
    readonly design: LabDesign,
    project: Project,
    parts: BenchPart[],
  ) {
    const targets = pinTargets(design, project);
    const clock = targets.get(CLOCK_PIN);
    this.sim = new LabSim(design, clock?.direction === 'input' ? clock.net : null);
    this.pads = new PadWiring(this.sim);
    parts.forEach((part, index) => {
      const device = createBusDevice(part.def, part.opts ?? {}, this);
      this.devices.push(device);
      this.keys.set(device, `p${index}`);
      device.pins.forEach((pin, pinIndex) => {
        const fpga = part.wires[pin[0]];
        const target = fpga === undefined ? undefined : targets.get(fpga);
        if (!target) return;
        const key = `p${index}:${pinIndex}`;
        if (pin[2] !== 'out')
          device.probes[pinIndex] = this.sim.probe(target.net, (level, cycle) =>
            device.pinChanged(pinIndex, level, cycle),
          );
        if (pin[2] === 'out') this.outputs.set(key, [target.net]);
        else if (pin[2] === 'io') this.pads.attach(key, target.net);
      });
    });
    for (const device of this.devices) device.start();
    this.sim.refresh();
    this.frame(0);
  }
  cycle() {
    return this.sim.cycle;
  }
  high(probe: Parameters<BusHost['high']>[0]) {
    return this.sim.highUntilNow(probe);
  }
  out(device: Device, pin: number, level: 0 | 1, at?: number) {
    for (const net of this.outputs.get(`${this.keys.get(device)}:${pin}`) ?? [])
      if (at !== undefined && at > this.sim.cycle) this.sim.setInputAt(at, net, level);
      else this.sim.setInput(net, level);
  }
  pad(device: Device, pin: number, level: 0 | 1 | null, at?: number) {
    this.pads.drive(`${this.keys.get(device)}:${pin}`, level, at);
  }
  advance(cycles: number) {
    const done = this.sim.run(cycles);
    this.frame(done);
  }
  private frame(elapsed: number) {
    this.sim.refresh();
    for (const device of this.devices) device.frame(this.sim.cycle, elapsed);
  }
}
