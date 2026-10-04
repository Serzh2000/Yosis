import type { YosysNetlist } from '../../shared/types';
import type { VcdSignal } from './vcd';
export interface RtlSignalLink {
  module: string;
  name: string;
  bits: number[];
}
/** Resolve the DUT instance path, never a similarly named signal in the testbench. */
export function linkVcdSignal(
  rtl: YosysNetlist,
  top: string,
  signal: VcdSignal,
): RtlSignalLink | null {
  let path: string[];
  if (signal.scope[0] === '__yosis_testbench' && signal.scope[1] === 'dut')
    path = signal.scope.slice(2);
  else if (signal.scope[0] === top) path = signal.scope.slice(1);
  else return null;
  let module = top;
  for (const instance of path) {
    const cell = rtl.modules[module]?.cells[instance];
    if (!cell || !rtl.modules[cell.type]) return null;
    module = cell.type;
  }
  const value = rtl.modules[module];
  if (!value) return null;
  const reference = signal.name.replace(/^\\/, '');
  const name =
    value.netnames[reference] || value.ports[reference]
      ? reference
      : reference.replace(/\s*\[\s*-?\d+\s*:\s*-?\d+\s*\]\s*$/, '');
  const net = value.netnames[name] ?? value.ports[name];
  if (!net || net.bits.length !== signal.width) return null;
  const bits = [...new Set(net.bits.filter((bit): bit is number => typeof bit === 'number'))];
  return bits.length ? { module, name, bits } : null;
}
