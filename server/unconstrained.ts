/**
 * Ports of the top module that the .cst gives no pin. The vendor's tool places such a port
 * on any free pin by itself; nextpnr refuses the whole design. Here the port is left out of
 * the bitstream instead: its pad cell is removed, and logic that read an unplaced input sees
 * a constant zero. Nothing then appears on a pin the pupil did not choose.
 */
import { blankComments } from '../shared/text-scan';

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

/**
 * The constraints nextpnr reads. Comments are removed (nextpnr does not know block comments and
 * would read the lines inside them), the pin list of a pair becomes one pin for P with its own line
 * for N, and a pin without IO_TYPE gets LVCMOS33: left alone, gowin_pack picks LVCMOS18 for it and
 * then refuses a bank shared with a 3.3 V neighbour.
 */
function withPairs(text: string, pairs: string): string {
  const typed = new Set(
    [...text.matchAll(/\bIO_PORT\s+"([^"]+)"([^;]*)/gi)]
      .filter((match) => /\bIO_TYPE\s*=/i.test(match[2]))
      .map((match) => match[1]),
  );
  const untyped = [...text.matchAll(/\bIO_LOC\s+"([^"]+)"/gi)]
    .map((match) => match[1])
    .filter((name, index, all) => !typed.has(name) && all.indexOf(name) === index);
  return (
    text.replace(/(\bIO_LOC\s+"[^"]+"\s+\d+)\s*,\s*\d+/gi, '$1') +
    untyped.map((name) => `\nIO_PORT "${name}" IO_TYPE=LVCMOS33;`).join('') +
    pairs
  );
}

/**
 * The text nextpnr will read. Its parser knows only upper-case keywords and single spaces, while
 * Gowin's own tool accepts tabs, any case and a byte-order mark: the same file would be read as
 * pins assigned here and as «Unconstrained IO» there. Every statement is rewritten in one form.
 */
export function canonicalCst(cst: string): string {
  const text = blankComments(cst.replace(/^\uFEFF/, ''));
  const out: string[] = [];
  // Statement by statement, each matched with an anchored pattern: a file of 500 KB of unfinished
  // statements must not make the server re-read it from every keyword. A forgotten \u00AB;\u00BB ends a
  // statement at the next keyword, as the vendor's tool reads it.
  for (const chunk of text.split(';'))
    for (const piece of chunk.split(/(?=\b(?:IO_LOC|IO_PORT|CLOCK_LOC|INS_LOC)\s+")/i)) {
      const match = /^(IO_LOC|IO_PORT|CLOCK_LOC|INS_LOC)\s+"([^"\n]+)"\s+(\S[\s\S]*)$/i.exec(
        piece.trim(),
      );
      if (match)
        out.push(`${match[1].toUpperCase()} "${match[2]}" ${match[3].replace(/\s+/g, ' ')};`);
    }
  return out.join('\n');
}

export function dropUnconstrainedPads(
  flatJson: string,
  cst: string,
  top: string,
): { json: string; dropped: string[]; cst: string } {
  const netlist = JSON.parse(flatJson) as { modules: Record<string, Module> };
  const module = netlist.modules[top];
  if (!module?.ports || !module.cells) return { json: flatJson, dropped: [], cst };
  // A one-bit port declared as `x` may be constrained as `x[0]` (the vendor's tool accepts both),
  // while nextpnr knows only the plain name.
  const singles = new Set(
    Object.entries(module.ports)
      .filter(([, port]) => port.bits.length === 1 && !port.offset)
      .map(([name]) => name),
  );
  const text = canonicalCst(cst).replace(
    /^(\w+ ")([^"\n]+)\[0\]"/gm,
    (whole, head: string, name: string) => (singles.has(name) ? `${head}${name}"` : whole),
  );
  const placed = new Set([...text.matchAll(/\bIO_LOC\s+"([^"]+)"/gi)].map((match) => match[1]));
  // Gowin names a differential pair by its P port only: IO_LOC "p" 33,34. nextpnr reads just the
  // first pin, so the N port (the OB/IB pin of the LVDS buffer) is given its own pin here.
  let pairs = '';
  const nameOfNet = new Map<number, string>();
  for (const [name, port] of Object.entries(module.ports)) {
    const width = port.bits.length;
    port.bits.forEach((net, bit) => {
      if (typeof net === 'number')
        nameOfNet.set(
          net,
          width === 1 && !port.offset
            ? name
            : `${name}[${(port.offset ?? 0) + (port.upto ? width - 1 - bit : bit)}]`,
        );
    });
  }
  // A pad buffer sits between the port and the LVDS cell: follow the net across it.
  const padOf = new Map<number, number>();
  for (const cell of Object.values(module.cells)) {
    const pins = PADS[cell.type];
    const pad = pins && cell.connections[pins.pad]?.[0];
    const inner = pins && (cell.connections[pins.fabric ?? 'I']?.[0] ?? cell.connections.I?.[0]);
    if (typeof pad === 'number' && typeof inner === 'number') padOf.set(inner, pad);
  }
  const portName = (net: number) => nameOfNet.get(net) ?? nameOfNet.get(padOf.get(net) ?? -1);
  for (const match of text.matchAll(/\bIO_LOC\s+"([^"]+)"\s+(\d+)\s*,\s*(\d+)/gi)) {
    for (const cell of Object.values(module.cells)) {
      if (!/LVDS/.test(cell.type)) continue;
      for (const [positive, negative] of [
        ['O', 'OB'],
        ['I', 'IB'],
        ['IO', 'IOB'],
      ]) {
        const net = cell.connections[positive]?.[0];
        const other = cell.connections[negative]?.[0];
        if (typeof net !== 'number' || typeof other !== 'number') continue;
        if (portName(net) !== match[1]) continue;
        const name = portName(other);
        if (name && !placed.has(name)) {
          placed.add(name);
          pairs += `\nIO_LOC "${name}" ${match[3]};`;
        }
      }
    }
  }
  const loose = new Set<number>();
  const netOfFabric = new Map<number, number>();
  const dropped: string[] = [];
  for (const [name, port] of Object.entries(module.ports)) {
    // The GW2AR's on-package SDRAM is wired by nextpnr from the port names (O_sdram_*, IO_sdram_*),
    // not from the .cst: such a port needs no pin and must not be thrown away.
    if (/^(?:O|IO)_sdram_/.test(name)) continue;
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
  if (!loose.size) return { json: flatJson, dropped: [], cst: withPairs(text, pairs) };
  const zero = new Set<number>();
  for (const [name, cell] of Object.entries(module.cells)) {
    const pins = PADS[cell.type];
    const pad = pins && cell.connections[pins.pad]?.[0];
    if (typeof pad !== 'number' || !loose.has(pad)) continue;
    const fabric = pins.fabric ? cell.connections[pins.fabric]?.[0] : undefined;
    if (typeof fabric === 'number') {
      zero.add(fabric);
      netOfFabric.set(fabric, pad);
    }
    delete module.cells[name];
  }
  if (zero.size) {
    // An input that clocks a register cannot become a constant: the design would run on a dead
    // clock and still be reported as a success.
    for (const cell of Object.values(module.cells))
      for (const pin of ['CLK', 'CLKIN'])
        for (const bit of cell.connections[pin] ?? [])
          if (typeof bit === 'number' && zero.has(bit))
            throw new Error(
              `Тактовому входу ${nameOfNet.get(netOfFabric.get(bit) ?? -1) ?? ''} не назначен вывод в .cst: без него схема осталась бы без такта. Назначьте ему вывод во вкладке «Выводы».`,
            );
    for (const cell of Object.values(module.cells))
      for (const bits of Object.values(cell.connections))
        bits.forEach((bit, index) => {
          if (typeof bit === 'number' && zero.has(bit)) bits[index] = '0';
        });
  }
  return { json: JSON.stringify(netlist), dropped, cst: withPairs(text, pairs) };
}

/** Does the constraint file put a port on one of the pins 52-57 shared with SSPI/flash configuration? */
export function usesConfigurationPins(cst: string): boolean {
  const text = canonicalCst(cst);
  return [...text.matchAll(/\bIO_LOC\s+"[^"]+"\s+(\d+)/gi)].some(
    (match) => Number(match[1]) >= 52 && Number(match[1]) <= 57,
  );
}

/** Pins the configuration of the board owns: JTAG (5-8), RECONFIG_N (9) and the flash (59-62). */
const CONFIGURATION_PINS: Record<number, string> = {
  5: 'JTAG TMS',
  6: 'JTAG TCK',
  7: 'JTAG TDI',
  8: 'JTAG TDO',
  9: 'RECONFIG_N',
  59: 'flash CLK',
  60: 'flash CS',
  61: 'flash MOSI',
  62: 'flash MISO',
};

/** Ports the constraint file puts on a pin that belongs to the board's configuration. */
export function reservedPinsUsed(cst: string): { port: string; pin: number; role: string }[] {
  const text = canonicalCst(cst);
  return [...text.matchAll(/\bIO_LOC\s+"([^"]+)"\s+(\d+)/gi)]
    .filter((match) => Number(match[2]) in CONFIGURATION_PINS)
    .map((match) => ({
      port: match[1],
      pin: Number(match[2]),
      role: CONFIGURATION_PINS[Number(match[2])],
    }));
}
