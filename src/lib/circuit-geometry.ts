import { circuitPins, type CircuitNode } from '../../shared/schematic';
import type { GraphNode } from './netlist';
import { getRtlSymbol } from '../components/RtlSymbol';
const typeMap: Partial<Record<CircuitNode['kind'], string>> = {
  not: '$not',
  and: '$and',
  or: '$or',
  xor: '$xor',
  nand: '$_NAND_',
  nor: '$_NOR_',
  xnor: '$xnor',
  mux: '$mux',
  add: '$add',
  sub: '$sub',
  eq: '$eq',
  register: '$sdffe',
};
export function circuitGeometry(node: CircuitNode) {
  const pins = circuitPins(node);
  const graph: GraphNode = {
    id: node.id,
    name: node.name,
    type: typeMap[node.kind] ?? node.kind,
    kind: 'cell',
    source: [],
    ports: pins.map((pin) => ({
      id: pin.name,
      name: pin.name === 'CLK' ? 'CLK' : pin.name === 'RST' ? 'SRST' : pin.name,
      direction: pin.direction,
      bits: Array.from({ length: Math.max(1, pin.width) }, (_, i) => i),
    })),
  };
  const spec = getRtlSymbol(graph);
  if (spec)
    return {
      graph,
      spec,
      width: spec.width,
      height: spec.height,
      pins: pins.map((pin) => ({
        ...pin,
        ...(() => {
          const anchor = spec.ports.find((port) => port.id === pin.name)!;
          return { x: anchor.x, y: anchor.y };
        })(),
      })),
    };
  const inputs = pins.filter((pin) => pin.direction === 'input'),
    outputs = pins.filter((pin) => pin.direction === 'output');
  return {
    graph,
    spec: null,
    width: 160,
    height: 100,
    pins: pins.map((pin) => ({
      ...pin,
      x: pin.direction === 'input' ? 0 : 160,
      y: 25 + (pin.direction === 'input' ? inputs : outputs).indexOf(pin) * 28,
    })),
  };
}
