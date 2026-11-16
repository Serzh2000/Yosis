/**
 * nextpnr-himbaechel-gowin before 0.11.1.89 (apicula #541, fixed by nextpnr commit 6030081a15)
 * gives the head of a carry chain whose carry-in comes from logic the table 0x505a. That table
 * makes the cell compute `I0 | CIN`, and CIN of the first ALU of a tile is the hardware carry of the
 * neighbouring tile, not a constant: the sum then depends on where the design happened to be placed.
 * The corrected table is 0x000a, as the later nextpnr writes it. Applied between nextpnr and the
 * packer; harmless (finds nothing) once nextpnr itself is new enough.
 */
const BROKEN_TABLE = '00000000000000000101000001011010';
const FIXED_TABLE = '00000000000000000000000000001010';

interface PlacedCell {
  type?: string;
  parameters?: Record<string, string>;
  connections?: Record<string, unknown[]>;
}

export function fixCarryHeads(placementJson: string): { json: string; fixed: number } {
  const netlist = JSON.parse(placementJson) as {
    modules?: Record<string, { cells?: Record<string, PlacedCell> }>;
  };
  let fixed = 0;
  for (const module of Object.values(netlist.modules ?? {}))
    for (const cell of Object.values(module.cells ?? {})) {
      const parameters = cell.parameters;
      if (
        cell.type === 'ALU' &&
        parameters?.CIN_NETTYPE === 'LOGIC' &&
        parameters.RAW_ALU_LUT === BROKEN_TABLE &&
        !(cell.connections?.CIN?.length ?? 0)
      ) {
        parameters.RAW_ALU_LUT = FIXED_TABLE;
        fixed++;
      }
    }
  return { json: fixed ? JSON.stringify(netlist) : placementJson, fixed };
}
