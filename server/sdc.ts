/**
 * nextpnr reads only a small part of SDC: `create_clock -name N -period P [get_ports|get_nets {x}]`.
 * The editor of Gowin EDA writes more (`-waveform {0 18.5}`, `get_clocks`, false paths), and nextpnr
 * answers such a file with an error and no placement at all. Here the file is reduced to what
 * nextpnr understands; everything else is reported back so the pupil knows it was not applied.
 */
export function sanitizeSdc(source: string): { text: string; skipped: string[] } {
  const kept: string[] = [];
  const skipped: string[] = [];
  // A command may continue on the next line after a backslash.
  const lines = source.replace(/\\\r?\n/g, ' ').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.replace(/(?:#|\/\/).*$/, '').trim();
    if (!line) continue;
    if (!/^create_clock\b/.test(line)) {
      skipped.push(line);
      continue;
    }
    const period = /-period\s+([0-9.]+)/.exec(line)?.[1];
    const target = /\[\s*get_(ports|nets)\s+(?:\{([^}]+)\}|([^\s\]]+))\s*\]/.exec(line);
    if (!period || !target) {
      skipped.push(line);
      continue;
    }
    const name = /-name\s+(\S+)/.exec(line)?.[1];
    kept.push(
      `create_clock ${name ? `-name ${name} ` : ''}-period ${period} [get_${target[1]} {${(target[2] ?? target[3]).trim()}}]`,
    );
  }
  return { text: kept.join('\n') + (kept.length ? '\n' : ''), skipped };
}

interface FlatModule {
  ports?: Record<string, { bits: (number | string)[]; offset?: number; upto?: number }>;
  cells?: Record<string, { type: string; connections: Record<string, (number | string)[]> }>;
  netnames?: Record<string, { bits: (number | string)[]; hide_name?: number }>;
}

/**
 * `get_ports {clk}` names the pad, but timing is analysed on the net behind the input buffer
 * (`clk_IBUF_I_O`): constrained at the pad, the period never reaches the checked clock domain.
 * Each `get_ports` of an input becomes `get_nets` of that buffer's output net.
 */
export function retargetToBufferNets(
  sdc: string,
  flatJson: string,
  top: string,
  onMissing?: (port: string) => void,
): string {
  const module = (JSON.parse(flatJson) as { modules: Record<string, FlatModule> }).modules[top];
  if (!module?.ports || !module.cells) return sdc;
  const netOf = new Map<string, string>();
  for (const [name, port] of Object.entries(module.ports)) {
    const width = port.bits.length;
    port.bits.forEach((bit, index) => {
      if (typeof bit !== 'number') return;
      const label =
        width === 1 && !port.offset
          ? name
          : `${name}[${(port.offset ?? 0) + (port.upto ? width - 1 - index : index)}]`;
      const buffer = Object.values(module.cells ?? {}).find(
        (cell) => cell.type === 'IBUF' && cell.connections.I?.[0] === bit,
      );
      const inner = buffer?.connections.O?.[0];
      if (typeof inner !== 'number') return;
      const net = Object.entries(module.netnames ?? {}).find(([, value]) =>
        value.bits.includes(inner),
      );
      if (net) netOf.set(label, net[0]);
    });
  }
  return sdc.replace(/\[get_ports \{([^}]+)\}\]/g, (whole, port: string) => {
    const net = netOf.get(port);
    if (!net) onMissing?.(port);
    return net ? `[get_nets {${net}}]` : whole;
  });
}

interface PllCell {
  type: string;
  parameters: Record<string, string | number>;
  connections: Record<string, (number | string)[]>;
}

/** Yosys writes an integer parameter as 32 binary digits and a string parameter as its text. */
function parameterValue(value: string | number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value === 'number') return value;
  const text = value.trim();
  return /^[01]{32}$/.test(text) ? parseInt(text, 2) : Number.parseFloat(text) || fallback;
}

/**
 * nextpnr checks every clock net against one target (`--freq`, the 27 MHz oscillator). The
 * outputs of a PLL run faster: a 96 MHz clock would be reported as `PASS at 27 MHz`. Their real
 * frequency follows from the primitive's parameters, so it is written down for nextpnr:
 * CLKOUT = FCLKIN × (FBDIV_SEL + 1) / (IDIV_SEL + 1); CLKOUTD divides it by SDIV_SEL, CLKOUTD3 by 3.
 */
export function pllClockConstraints(
  flatJson: string,
  top: string,
  skip: ReadonlySet<string>,
): string {
  const module = (
    JSON.parse(flatJson) as {
      modules: Record<string, FlatModule & { cells?: Record<string, PllCell> }>;
    }
  ).modules[top];
  if (!module?.cells) return '';
  const nameOf = (bit: number | string | undefined) =>
    typeof bit === 'number'
      ? Object.entries(module.netnames ?? {}).find(([, net]) => net.bits.includes(bit))?.[0]
      : undefined;
  const lines: string[] = [];
  for (const cell of Object.values(module.cells as Record<string, PllCell>)) {
    if (cell.type !== 'rPLL') continue;
    const input = parameterValue(cell.parameters.FCLKIN, 27);
    const out =
      (input * (parameterValue(cell.parameters.FBDIV_SEL, 0) + 1)) /
      (parameterValue(cell.parameters.IDIV_SEL, 0) + 1);
    const outputs: [string, number][] = [
      ['CLKOUT', out],
      ['CLKOUTP', out],
      ['CLKOUTD', out / Math.max(2, parameterValue(cell.parameters.SDIV_SEL, 2))],
      ['CLKOUTD3', out / 3],
    ];
    for (const [pin, mhz] of outputs) {
      const net = nameOf(cell.connections[pin]?.[0]);
      if (!net || skip.has(net) || !Number.isFinite(mhz) || mhz <= 0) continue;
      lines.push(
        `create_clock -name ${net} -period ${(1000 / mhz).toFixed(3)} [get_nets {${net}}]`,
      );
    }
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
}
