import type { Connections } from '../../components/lab/reference/bridge';
import { headerByFpga, terminalPad } from './pads';
import type { LabWire, ResolvedWire } from './runtime';

/** Pins of parts that a wire's net joins to the board: what the wire carries to or from. */
export const wirePins = (connections: Connections, wire: Pick<LabWire, 'id'>): ResolvedWire[] =>
  connections.wires.filter((pin) => connections.netWires.get(pin.id)?.includes(wire.id));

/** The pin of a part (`uid`, `name`) as it is joined to the board, if it is. */
export const pinLink = (connections: Connections, uid: string, name: string) =>
  connections.wires.find((item) => item.id === `${uid}:${name}`);

/** Contact of the board a wire leads to, through breadboards if need be; undefined for supply. */
export function wireFpga(connections: Connections, wire: LabWire): number | undefined {
  const own = [wire.from, wire.to]
    .map((end) => terminalPad(end))
    .find((pad) => pad && pad.rail === undefined);
  if (own) return own.fpga;
  const pin = wirePins(connections, wire)[0];
  return pin && !headerByFpga.get(pin.fpga)?.rail ? pin.fpga : undefined;
}
