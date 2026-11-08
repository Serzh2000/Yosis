import { padTerminal } from '../src/lib/lab/pads';
import type { LabLayout } from '../src/lib/lab/runtime';
import type { Options } from '../src/lib/lab/devices';

/** A bench written the short way: parts by id and wires from a pin to a contact of the board. */
export interface ShortBench {
  parts: { uid: string; def: string; opts: Options; x?: number; y?: number; rot?: number }[];
  wires: { id: string; part: string; pin: string; fpga: number }[];
}

/** The same bench in the form the laboratory keeps: wires between terminals. */
export function fromShort(bench: ShortBench): LabLayout {
  return {
    parts: bench.parts.map(({ uid, def, opts, x = 0, y = 0 }) => ({
      uid,
      def,
      x,
      y,
      turn: 0,
      opts,
    })),
    wires: bench.wires.map((wire) => ({
      id: wire.id,
      from: `${wire.part}:${wire.pin}`,
      to: padTerminal(wire.fpga),
    })),
  };
}
