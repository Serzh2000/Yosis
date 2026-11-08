import { partById } from './catalog';
import { padTerminal, HEADER } from './pads';
import type { LabLayout, LabWire } from './runtime';
import { freeSpot } from './layout-ops';

/**
 * Every part has a plus and a minus, and works only when both are wired: there is no power
 * the bench gives by itself. A bench made for the pupil (an example's, or one saved before the
 * supply was wired by hand) comes with the supply already wired, so that it works at once:
 * VCC to the 3V3 contact and GND to a ground contact of the board. A part plugged into a
 * breadboard takes its supply from the rails and is left alone.
 */
export function withSupply(layout: LabLayout): LabLayout {
  const plus = HEADER.find((pad) => pad.rail === '3V3');
  const minus = HEADER.find((pad) => pad.rail === 'GND');
  if (!plus || !minus) return layout;
  const added: LabWire[] = [];
  const wired = (terminal: string) =>
    layout.wires.some((wire) => wire.from === terminal || wire.to === terminal);
  for (const part of layout.parts) {
    if (part.mount || partById.get(part.def)?.kind === 'breadboard') continue;
    for (const [pin, pad] of [
      ['VCC', plus],
      ['GND', minus],
    ] as const)
      if (!wired(`${part.uid}:${pin}`))
        added.push({
          id: `${part.uid}-${pin}`,
          from: `${part.uid}:${pin}`,
          to: padTerminal(pad.fpga),
        });
  }
  return added.length ? { ...layout, wires: [...layout.wires, ...added] } : layout;
}

/** Sets out parts that have no place yet (a bench saved on the old flat table), one after another. */
export function addMissing(layout: LabLayout): LabLayout {
  const placed: LabLayout = {
    ...layout,
    parts: layout.parts.filter((part) => partById.get(part.def)?.kind === 'breadboard'),
  };
  for (const part of layout.parts) {
    if (partById.get(part.def)?.kind === 'breadboard') continue;
    const { mount: _mount, ...loose } = part;
    placed.parts.push({ ...loose, ...freeSpot(placed, part.def) });
  }
  return placed;
}
