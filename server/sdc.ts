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
