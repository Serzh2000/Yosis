/**
 * Ports of the top module that the .cst gives no pin. The vendor's tool places such a port
 * on any free pin by itself; nextpnr refuses the whole design. Here the port is left out of
 * the bitstream instead: its pad cell is removed, and logic that read an unplaced input sees
 * a constant zero. Nothing then appears on a pin the pupil did not choose.
 */
interface Cell {
  type: string;
  connections: Record<string, (number | string)[]>;
}
interface Module {
  ports?: Record<string, { bits: (number | string)[]; offset?: number; upto?: number }>;
  cells?: Record<string, Cell>;
}

/** Pad cells of Gowin: the pin that faces the package, and the pin that feeds the fabric. */
const PADS: Record<string, { pad: string; fabric?: string }> = {
  IBUF: { pad: 'I', fabric: 'O' },
  OBUF: { pad: 'O' },
  TBUF: { pad: 'O' },
  IOBUF: { pad: 'IO', fabric: 'O' },
};

export function dropUnconstrainedPads(
  flatJson: string,
  cst: string,
  top: string,
): { json: string; dropped: string[] } {
  const netlist = JSON.parse(flatJson) as { modules: Record<string, Module> };
  const module = netlist.modules[top];
  if (!module?.ports || !module.cells) return { json: flatJson, dropped: [] };
  const text = cst.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, '');
  const placed = new Set([...text.matchAll(/\bIO_LOC\s+"([^"]+)"/gi)].map((match) => match[1]));
  const loose = new Set<number>();
  const dropped: string[] = [];
  for (const [name, port] of Object.entries(module.ports)) {
    const width = port.bits.length;
    const bitName = (bit: number) =>
      width === 1 && !port.offset
        ? name
        : `${name}[${(port.offset ?? 0) + (port.upto ? width - 1 - bit : bit)}]`;
    const free = port.bits
      .map((net, bit) => ({ net, bit }))
      .filter(({ bit }) => !placed.has(bitName(bit)) && !(width === 1 && placed.has(name)));
    if (!free.length) continue;
    for (const { net, bit } of free)
      if (typeof net === 'number') {
        loose.add(net);
        dropped.push(bitName(bit));
      }
    if (free.length === width) delete module.ports[name];
  }
  if (!loose.size) return { json: flatJson, dropped: [] };
  const zero = new Set<number>();
  for (const [name, cell] of Object.entries(module.cells)) {
    const pins = PADS[cell.type];
    const pad = pins && cell.connections[pins.pad]?.[0];
    if (typeof pad !== 'number' || !loose.has(pad)) continue;
    const fabric = pins.fabric ? cell.connections[pins.fabric]?.[0] : undefined;
    if (typeof fabric === 'number') zero.add(fabric);
    delete module.cells[name];
  }
  if (zero.size)
    for (const cell of Object.values(module.cells))
      for (const bits of Object.values(cell.connections))
        bits.forEach((bit, index) => {
          if (typeof bit === 'number' && zero.has(bit)) bits[index] = '0';
        });
  return { json: JSON.stringify(netlist), dropped };
}
