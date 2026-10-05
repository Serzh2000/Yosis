/** Gate-level form of the project that the laboratory runs in the browser. */
export interface LabPort {
  name: string;
  direction: 'input' | 'output' | 'inout';
  /** Net of every bit, least significant first. */
  bits: number[];
  offset: number;
  upto: boolean;
}
export interface LabDesign {
  top: string;
  /** Net ids are 0..nets-1; net 0 is constant 0 and net 1 is constant 1. */
  nets: number;
  ports: LabPort[];
  /** Five numbers per gate: operation, A, B, S, Y. Pads that the design may release use LAB_OP.TRI. */
  gates: number[];
  /** Four numbers per flip-flop: clock, D, Q, initial value. */
  dffs: number[];
}
export const LAB_OP = {
  NOT: 0,
  AND: 1,
  NAND: 2,
  OR: 3,
  NOR: 4,
  XOR: 5,
  XNOR: 6,
  ANDNOT: 7,
  ORNOT: 8,
  MUX: 9,
  BUF: 10,
  /** Tri-state pad: Y = E ? A : external level. A is `a`, E is `b`, `s` is unused. */
  TRI: 11,
} as const;
export const LAB_MAX_GATES = 250_000;
