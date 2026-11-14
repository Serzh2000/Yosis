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
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    if (!/^create_clock\b/.test(line)) {
      skipped.push(line);
      continue;
    }
    const period = /-period\s+([0-9.]+)/.exec(line)?.[1];
    const target = /\[\s*get_(ports|nets)\s+\{?\s*([^\s}\]]+)\s*\}?\s*\]/.exec(line);
    if (!period || !target) {
      skipped.push(line);
      continue;
    }
    const name = /-name\s+(\S+)/.exec(line)?.[1];
    kept.push(
      `create_clock ${name ? `-name ${name} ` : ''}-period ${period} [get_${target[1]} {${target[2]}}]`,
    );
  }
  return { text: kept.join('\n') + (kept.length ? '\n' : ''), skipped };
}
