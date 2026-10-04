import type { Bit } from '../../shared/types';
import type { GraphEdge, GraphPort } from './netlist';

export interface BusTapAnnotation {
  label: string;
  description: string;
}

/** Yosys stores vectors LSB first, including vectors declared with ascending indices. */
export function graphPortBitIndex(port: GraphPort, position: number): number {
  return (port.offset ?? 0) + (port.upto ? port.bits.length - position - 1 : position);
}

function slice(
  port: GraphPort | undefined,
  bits: Bit[],
): { label: string; aliases: boolean } | null {
  if (!port || port.bits.length < 2) return null;
  if (port.bits.length === bits.length && port.bits.every((bit, index) => bit === bits[index]))
    return null;
  const selected = new Set(bits);
  const positions = port.bits.flatMap((bit, index) => (selected.has(bit) ? [index] : []));
  if (!positions.length) return null;
  const aliases =
    new Set(positions.map((position) => port.bits[position])).size !== positions.length;
  // A permutation or replication needs an explicit ordered list. A slice keeps
  // the declaration's direction and actual offset instead of guessing [n:0].
  const ordered = aliases
    ? positions
    : bits.map((bit) => port.bits.indexOf(bit)).filter((position) => position >= 0);
  const reordered =
    !aliases &&
    (ordered.length !== positions.length ||
      ordered.some((position, index) => position !== positions[index]));
  const indices = ordered.map((position) => graphPortBitIndex(port, position)).reverse();
  const contiguous =
    indices.length > 1 &&
    indices.every(
      (value, index) => index === 0 || value - indices[index - 1] === indices[1] - indices[0],
    ) &&
    Math.abs(indices[1] - indices[0]) === 1;
  const suffix = reordered
    ? `{${indices.join(',')}}`
    : indices.length === 1
      ? `[${indices[0]}]`
      : contiguous
        ? `[${indices[0]}:${indices.at(-1)}]`
        : `{${indices.join(',')}}`;
  return {
    label: `${port.name}${suffix}`,
    aliases: aliases || new Set(ordered).size !== ordered.length,
  };
}

/** A shared vector endpoint gathers labelled lanes; it does not tie the lanes together. */
export function getBusTapAnnotation(
  edge: GraphEdge,
  source?: GraphPort,
  target?: GraphPort,
): BusTapAnnotation | null {
  const from = slice(source, edge.bits);
  const to = slice(target, edge.bits);
  if (!from && !to) return null;
  const label = [from?.label, to?.label].filter(Boolean).join(' → ');
  return {
    label,
    description: `${label} · ${edge.width} бит. Подпись указывает разряды этой ветви в общей шине.${from?.aliases || to?.aliases ? ' Повторяющиеся позиции содержат один и тот же сигнал.' : ' Остальные разряды шины подключаются отдельными ветвями.'}`,
  };
}
