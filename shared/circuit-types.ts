/** Типы формата .ysch версии 2 и описания блоков. Не содержит логики. */

export type ParamValue = number | boolean | string | string[];
export type Params = Record<string, ParamValue>;

export type Rotation = 0 | 90 | 180 | 270;
export interface CircuitNode {
  id: string;
  kind: BlockKind;
  name: string;
  x: number;
  y: number;
  rot: Rotation;
  flip: boolean;
  params: Params;
}
export interface Endpoint {
  node: string;
  pin: string;
}
export interface CircuitWire {
  id: string;
  from: Endpoint;
  to: Endpoint;
}
export interface CircuitDocument {
  format: 'yosis-schematic';
  version: 2;
  nodes: CircuitNode[];
  wires: CircuitWire[];
}
export interface CircuitPin {
  name: string;
  direction: 'input' | 'output';
  width: number;
  /** Короткая подпись для новичка. */
  hint?: string;
  /** Тактовый вход: допустим только сигнал, пришедший с внешнего входа. */
  clock?: boolean;
}
export interface CircuitIssue {
  node?: string;
  wire?: string;
  pin?: string;
  severity?: 'error' | 'warning';
  message: string;
}

export const blockKinds = [
  'input',
  'output',
  'const',
  'buf',
  'gate',
  'reduce',
  'mux',
  'demux',
  'decoder',
  'priority',
  'rom',
  'addsub',
  'incdec',
  'mult',
  'cmp',
  'shift',
  'extend',
  'slice',
  'concat',
  'split',
  'merge',
  'reg',
  'tff',
  'counter',
  'shreg',
  'divider',
  'sync2',
  'debounce',
  'edge',
  'button',
  'clock27',
  'led',
  'ledbank',
  'tag_out',
  'tag_in',
  'note',
] as const;
export type BlockKind = (typeof blockKinds)[number];

export type ParamSpec = {
  key: string;
  label: string;
  hint?: string;
  /** Параметр показывается только если условие истинно. */
  when?: (p: Params) => boolean;
} & (
  | { type: 'int'; min: number; max: number | ((p: Params) => number); unit?: string }
  | { type: 'float'; min: number; max: number; unit?: string }
  | { type: 'bool' }
  | { type: 'select'; options: [string, string][] }
  | { type: 'multi'; options: [string, string][] }
  | { type: 'mask'; countKey: string; names: string }
  | { type: 'big'; widthKey: string }
  | { type: 'table'; widthKey: string; lengthKey: string }
  | { type: 'text'; maxLength: number }
);

export type SymbolShape =
  | 'and'
  | 'or'
  | 'xor'
  | 'buf'
  | 'mux'
  | 'demux'
  | 'box'
  | 'port-in'
  | 'port-out'
  | 'const'
  | 'ff'
  | 'note'
  | 'label'
  | 'board-in'
  | 'board-out';
export interface SymbolSpec {
  shape: SymbolShape;
  /** Текст внутри символа. */
  label: string;
  /** Маленькая подпись под ним (параметры). */
  detail?: string;
  /** Кружки инверсии на выходе. */
  invertOut?: boolean;
  /** Кружки инверсии на входах (по порядку). */
  invertIn?: boolean[];
}

export interface EmitContext {
  p: Params;
  name: string;
  /** Выражение (имя цепи) на входном контакте. */
  in(pin: string): string;
  /** Имя цепи выходного контакта. */
  out(pin: string): string;
  /** Имя внутренней цепи: <имя>_<суффикс>. */
  net(suffix: string): string;
  width(pin: string): number;
}
export type State = Record<string, bigint | null>;
export interface EvalContext {
  p: Params;
  state: State;
  /** Значение входа; null — неизвестно. */
  in(pin: string): bigint | null;
  width(pin: string): number;
}
export interface RegDecl {
  /** Имя выходного контакта (объявить его как reg) или суффикс внутренней цепи. */
  key: string;
  width: number;
  /** Значение при включении платы. Нет значения — в симуляции X. */
  init?: bigint;
  internal?: boolean;
}
export interface BoardAssignment {
  /** Имя сигнала в .cst, например led[3]. */
  signal: string;
  pin: number;
  direction: 'input' | 'output';
}
export interface BlockDef {
  kind: BlockKind;
  title: string;
  help: string;
  defaults: Params;
  params: ParamSpec[];
  pins(p: Params): CircuitPin[];
  /** Ошибки параметров (до проверки соединений). */
  check?(p: Params): string[];
  /** Входы, которые влияют на выходы без участия такта (для поиска петель). */
  comb?(p: Params): string[];
  symbol(p: Params, name: string): SymbolSpec;
  describe(p: Params): string;
  regs?(p: Params): RegDecl[];
  /** Дополнительные внутренние wire; ключ '' — цепь с именем самого элемента. */
  wires?(p: Params): { key: string; width: number }[];
  emit(ctx: EmitContext): string[];
  /** Начальное состояние для предпросмотра. */
  init?(p: Params): State;
  /** Выходы по текущему состоянию и входам. */
  outputs(ctx: EvalContext): Record<string, bigint | null>;
  /** Состояние после положительного фронта такта (асинхронные сигналы — в `async`). */
  next?(ctx: EvalContext): State;
  /** Асинхронное действие: вернуть новое состояние или null, если не нужно. */
  async?(ctx: EvalContext): State | null;
  port?: {
    direction: 'input' | 'output';
    /** Выход инвертируется на плате (активный низкий уровень). */
    activeLow?: boolean;
    board?: (p: Params, name: string) => BoardAssignment[];
  };
  /** Не создаёт цепей Verilog (подписи, метки). */
  virtual?: boolean;
}

export type CategoryId = 'io' | 'logic' | 'select' | 'math' | 'memory' | 'bus' | 'board' | 'notes';
export interface LibraryEntry {
  id: string;
  kind: BlockKind;
  title: string;
  help: string;
  category: CategoryId;
  base: string;
  params?: Params;
  keywords?: string;
  /** Таблица истинности или временная диаграмма для карточки. */
  sketch?: string[];
}
