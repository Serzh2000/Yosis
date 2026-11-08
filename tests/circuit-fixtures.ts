import { emptyCircuit, newCircuitNode, type CircuitDocument } from '../shared/schematic';

/** The first starter of the Конструктор: plain input → NOT → plain output, for tests of generic ports. */
export function genericStarter(): CircuitDocument {
  const doc = emptyCircuit();
  for (const [kind, name, x, params] of [
    ['input', 'button', 80, {}],
    ['buf', 'invert', 340, { invert: true }],
    ['output', 'led_n', 600, {}],
  ] as const) {
    doc.nodes.push({ ...newCircuitNode(doc, kind, params), name, x, y: 220 });
  }
  doc.wires = [
    { id: 'w1', from: { node: 'n1', pin: 'Y' }, to: { node: 'n2', pin: 'A' } },
    { id: 'w2', from: { node: 'n2', pin: 'Y' }, to: { node: 'n3', pin: 'A' } },
  ];
  return doc;
}
