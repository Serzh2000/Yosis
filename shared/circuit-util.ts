import type { CircuitPin, EvalContext, Params } from './circuit-types';

export const mask = (width: number): bigint => (1n << BigInt(width)) - 1n;
/** Число бит, нужное для адресации n значений (не меньше 1). */
export function clog2(n: number): number {
  let bits = 1;
  while (2 ** bits < n) bits++;
  return bits;
}
export const range = (width: number): string => (width === 1 ? '' : `[${width - 1}:0] `);
export const lit = (width: number, value: bigint): string => `${width}'d${value}`;
export const toSigned = (value: bigint, width: number): bigint =>
  value >= 1n << BigInt(width - 1) ? value - (1n << BigInt(width)) : value;
export const fromSigned = (value: bigint, width: number): bigint => BigInt.asUintN(width, value);
export const num = (p: Params, key: string): number => p[key] as number;
export const flag = (p: Params, key: string): boolean => p[key] as boolean;
export const text = (p: Params, key: string): string => p[key] as string;
export const list = (p: Params, key: string): string[] => p[key] as string[];
export const big = (p: Params, key: string): bigint => BigInt(p[key] as string);

export const input = (
  name: string,
  width: number,
  extra: Partial<CircuitPin> = {},
): CircuitPin => ({
  name,
  width,
  direction: 'input',
  ...extra,
});
export const output = (
  name: string,
  width: number,
  extra: Partial<CircuitPin> = {},
): CircuitPin => ({
  name,
  width,
  direction: 'output',
  ...extra,
});
export const clockPin = (): CircuitPin => input('CLK', 1, { clock: true, hint: 'Такт' });

/** Выходы с учётом неизвестных входов: любой неизвестный вход делает все выходы неизвестными. */
export function combine(
  ctx: EvalContext,
  pins: string[],
  outputs: string[],
  compute: (values: Record<string, bigint>) => Record<string, bigint>,
): Record<string, bigint | null> {
  const values: Record<string, bigint> = {};
  for (const pin of pins) {
    const value = ctx.in(pin);
    if (value === null) return Object.fromEntries(outputs.map((name) => [name, null]));
    values[pin] = value;
  }
  return compute(values);
}
export class Unknown extends Error {}
/** Значение входа или Unknown — чтобы последовательные блоки читали вход только когда он нужен. */
export function need(ctx: EvalContext, pin: string): bigint {
  const value = ctx.in(pin);
  if (value === null) throw new Unknown();
  return value;
}
export function guarded(
  keys: string[],
  compute: () => Record<string, bigint | null>,
): Record<string, bigint | null> {
  try {
    return compute();
  } catch (error) {
    if (error instanceof Unknown) return Object.fromEntries(keys.map((key) => [key, null]));
    throw error;
  }
}
/** Нумерованные имена контактов: A, B, C… */
export const letters = 'ABCDEFGH';
