import type { YosysCell } from '../../shared/types';
import type { GraphNode, GraphPort } from '../lib/netlist';

export type RtlSymbolKind =
  | 'and'
  | 'or'
  | 'xor'
  | 'not'
  | 'buffer'
  | 'mux'
  | 'adder'
  | 'comparator'
  | 'shift'
  | 'dff'
  | 'latch';
export interface RtlSymbolPort {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
  side: 'WEST' | 'EAST' | 'NORTH' | 'SOUTH';
  role: 'input' | 'output' | 'select' | 'clock' | 'enable' | 'reset';
  negative?: boolean;
}
export interface RtlSymbolSpec {
  kind: RtlSymbolKind;
  width: number;
  height: number;
  ports: RtlSymbolPort[];
  label: string;
  detail: string;
  inverted?: boolean;
  resetInfo?: string;
  parallelMux?: boolean;
  subtract?: boolean;
}

function polarity(value: string | number | undefined, fallback = true): boolean {
  if (value === undefined) return fallback;
  return typeof value === 'number' ? value !== 0 : /1/.test(value);
}
function resetValue(value: string | number | undefined): string {
  if (value === undefined) return '?';
  if (typeof value === 'number') return String(value);
  if (!/^[01]+$/.test(value)) return value.toUpperCase();
  const number = BigInt(`0b${value}`);
  return number < 10n ? String(number) : `0x${number.toString(16).toUpperCase()}`;
}
function portLabel(port: GraphPort): string {
  return port.bits.length > 1 ? `${port.name}[${port.bits.length - 1}:0]` : port.name;
}
function shortName(name: string): string {
  return name.length > 26 ? `${name.slice(0, 25)}…` : name;
}

/** One definition supplies both ELK anchors and SVG terminals, so wires meet the symbol. */
export function getRtlSymbol(node: GraphNode, cell?: YosysCell): RtlSymbolSpec | null {
  if (node.kind !== 'cell' || node.moduleName || !node.type.startsWith('$')) return null;
  const type = node.type;
  const params = cell?.parameters ?? {};
  const outputs = node.ports.filter((port) => port.direction === 'output');
  const inputs = node.ports.filter((port) => port.direction !== 'output');
  const outputWidth =
    outputs.find((port) => port.name === 'Y' || port.name === 'Q')?.bits.length ??
    outputs[0]?.bits.length ??
    1;
  const inputWidth =
    inputs.find((port) => port.name === 'A')?.bits.length ?? inputs[0]?.bits.length ?? 1;
  const gateType = type.match(
    /^\$(and|or|xor|xnor|not|logic_and|logic_or|logic_not|reduce_and|reduce_or|reduce_xor|reduce_xnor|reduce_bool)$/,
  )?.[1];
  const internalGate = type.match(/^\$_(AND|NAND|OR|NOR|XOR|XNOR|NOT|BUF)_$/)?.[1];
  if (gateType || internalGate) {
    const operation = gateType ?? internalGate!.toLowerCase();
    const kind: RtlSymbolKind = /xor|xnor/.test(operation)
      ? 'xor'
      : /and/.test(operation)
        ? 'and'
        : /or|nor|reduce_bool/.test(operation)
          ? 'or'
          : operation === 'buf'
            ? 'buffer'
            : 'not';
    const inverted = /not|nand|nor|xnor/.test(operation);
    const logical = operation.startsWith('logic_');
    const reduce = operation.startsWith('reduce_');
    const label =
      kind === 'buffer'
        ? 'BUF'
        : kind === 'not'
          ? 'NOT'
          : kind.toUpperCase() + (inverted ? ' + NOT' : '');
    const detail = logical
      ? `${kind === 'not' ? 'A == 0' : kind === 'and' ? '&&' : '||'} · логическое ${inputWidth}→${outputWidth}`
      : reduce
        ? `свёртка ${inputWidth}→${outputWidth}`
        : `${kind === 'not' ? '~ · ' : ''}${outputWidth > 1 ? `×${outputWidth} · побитовое` : label}`;
    const pins: RtlSymbolPort[] = node.ports.map((port) => {
      const output = port.direction === 'output';
      const index = inputs.indexOf(port);
      return {
        id: port.id,
        name: port.name,
        label: portLabel(port),
        x: output ? 180 : 0,
        y: output || inputs.length === 1 ? 62 : 46 + index * 32,
        side: output ? 'EAST' : 'WEST',
        role: output ? 'output' : 'input',
      };
    });
    return { kind, width: 180, height: 138, ports: pins, label, detail, inverted };
  }
  if (type === '$mux' || type === '$pmux' || type === '$_MUX_' || type === '$_NMUX_') {
    const selector = node.ports.find((port) => port.name === 'S');
    const b = node.ports.find((port) => port.name === 'B');
    const parallel = type === '$pmux';
    return {
      kind: 'mux',
      width: 180,
      height: 166,
      label: parallel ? 'PMUX' : 'MUX',
      parallelMux: parallel,
      inverted: type === '$_NMUX_',
      detail: parallel
        ? `one-hot · ${selector?.bits.length ?? '?'}×${outputWidth}`
        : `${outputWidth} бит`,
      ports: node.ports.map((port) => ({
        id: port.id,
        name: port.name,
        label: portLabel(port),
        x: port.name === 'S' ? 88 : port.direction === 'output' ? 180 : 0,
        y: port.name === 'S' ? 166 : port.direction === 'output' ? 70 : port.name === 'B' ? 94 : 48,
        side: port.name === 'S' ? 'SOUTH' : port.direction === 'output' ? 'EAST' : 'WEST',
        role: port.name === 'S' ? 'select' : port.direction === 'output' ? 'output' : 'input',
      })),
      ...(parallel && b && selector && b.bits.length !== selector.bits.length * outputWidth
        ? { detail: `one-hot · B=${b.bits.length} бит` }
        : {}),
    };
  }
  if (type === '$add' || type === '$sub') {
    return {
      kind: 'adder',
      width: 180,
      height: 138,
      label: type === '$sub' ? '−' : '+',
      subtract: type === '$sub',
      detail: `${outputWidth} бит${polarity(params.A_SIGNED, false) && polarity(params.B_SIGNED, false) ? ' · знаковый' : ''}`,
      ports: node.ports.map((port) => ({
        id: port.id,
        name: port.name,
        label: portLabel(port),
        x: port.direction === 'output' ? 180 : 0,
        y: port.direction === 'output' ? 62 : port.name === 'B' ? 80 : 44,
        side: port.direction === 'output' ? 'EAST' : 'WEST',
        role: port.direction === 'output' ? 'output' : 'input',
      })),
    };
  }
  const comparisons: Record<string, string> = {
    $eq: '=',
    $ne: '≠',
    $lt: '<',
    $le: '≤',
    $gt: '>',
    $ge: '≥',
    $eqx: '===',
    $nex: '!==',
  };
  const shifts: Record<string, string> = { $shl: '<<', $shr: '>>', $sshl: '<<<', $sshr: '>>>' };
  if (comparisons[type] || shifts[type]) {
    const compare = !!comparisons[type];
    // Yosys compares signed operands only when both signedness flags are set.
    const signed = compare
      ? polarity(params.A_SIGNED, false) && polarity(params.B_SIGNED, false)
      : type === '$sshr' && polarity(params.A_SIGNED, false);
    return {
      kind: compare ? 'comparator' : 'shift',
      width: 180,
      height: 138,
      label: comparisons[type] ?? shifts[type],
      detail: compare
        ? `сравнение${signed ? ' · знаковое' : ''}${type === '$eqx' || type === '$nex' ? ' · X/Z' : ''}`
        : `${outputWidth} бит · ${signed ? 'со знаком' : 'сдвиг'}`,
      ports: node.ports.map((port) => ({
        id: port.id,
        name: port.name,
        label: portLabel(port),
        x: port.direction === 'output' ? 180 : 0,
        y: port.direction === 'output' ? 62 : port.name === 'B' ? 80 : 44,
        side: port.direction === 'output' ? 'EAST' : 'WEST',
        role: port.direction === 'output' ? 'output' : 'input',
      })),
    };
  }
  const wordFF = /^\$(dff|dffe|adff|adffe|sdff|sdffe|sdffce|dffsr|dffsre)$/.test(type);
  const gateFF = type.match(/^\$_(DFF|DFFE|SDFF|SDFFE|SDFFCE|DFFSR|DFFSRE)_([PN01]+)_$/);
  const wordLatch = /^\$(dlatch|adlatch|dlatchsr)$/.test(type);
  const gateLatch = type.match(/^\$_(DLATCH|DLATCHSR)_([PN01]+)_$/);
  const latch = wordLatch || !!gateLatch;
  if (!wordFF && !gateFF && !latch) return null;
  let clockPositive = polarity(params.CLK_POLARITY);
  let enablePositive = polarity(params.EN_POLARITY);
  let resetPositive = polarity(params.ARST_POLARITY ?? params.SRST_POLARITY ?? params.CLR_POLARITY);
  let setPositive = polarity(params.SET_POLARITY);
  let synchronous = type.startsWith('$sdff');
  let value = resetValue(params.ARST_VALUE ?? params.SRST_VALUE);
  let enabledReset = type === '$sdffce';
  if (gateFF) {
    const [, family, code] = gateFF;
    let parsed: RegExpMatchArray | null;
    if (family === 'DFF') parsed = code.match(/^([PN])(?:([PN])([01]))?$/);
    else if (family === 'DFFE') parsed = code.match(/^([PN])(?:([PN])([01]))?([PN])$/);
    else if (family === 'SDFF') parsed = code.match(/^([PN])([PN])([01])$/);
    else if (family === 'SDFFE' || family === 'SDFFCE')
      parsed = code.match(/^([PN])([PN])([01])([PN])$/);
    else
      parsed = code.match(
        family === 'DFFSR' ? /^([PN])([PN])([PN])$/ : /^([PN])([PN])([PN])([PN])$/,
      );
    if (!parsed) return null;
    clockPositive = parsed[1] === 'P';
    resetPositive = (family.startsWith('DFFSR') ? parsed[3] : parsed[2]) !== 'N';
    setPositive = parsed[2] !== 'N';
    enablePositive = parsed[4] !== 'N';
    value = parsed[3] === '0' || parsed[3] === '1' ? parsed[3] : '?';
    synchronous = family.startsWith('SDFF');
    enabledReset = family === 'SDFFCE';
  }
  if (gateLatch) {
    const [, family, code] = gateLatch;
    const parsed = code.match(
      family === 'DLATCH' ? /^([PN])(?:([PN])([01]))?$/ : /^([PN])([PN])([PN])$/,
    );
    if (!parsed) return null;
    enablePositive = parsed[1] === 'P';
    setPositive = parsed[2] !== 'N';
    resetPositive = (family === 'DLATCHSR' ? parsed[3] : parsed[2]) !== 'N';
    value = family === 'DLATCH' && parsed[3] ? parsed[3] : '?';
  }
  const resetPorts = node.ports.filter((port) =>
    ['ARST', 'SRST', 'CLR', 'SET', 'R', 'S'].includes(port.name),
  );
  const enable = node.ports.some((port) => port.name === 'EN' || port.name === 'E');
  const resetInfo =
    resetPorts.length === 1
      ? `${synchronous ? 'sync' : 'async'} R=${value}`
      : resetPorts.length > 1
        ? 'async SET / CLR'
        : undefined;
  return {
    kind: latch ? 'latch' : 'dff',
    width: 180,
    height: 172,
    label: latch ? 'LATCH' : 'DFF',
    resetInfo,
    detail: `${outputWidth} бит${latch ? ' · по уровню EN' : synchronous && enable ? ` · ${enabledReset ? 'EN > R' : 'R > EN'}` : ''}`,
    ports: node.ports.map((port) => {
      const resetIndex = resetPorts.indexOf(port);
      if (resetIndex >= 0)
        return {
          id: port.id,
          name: port.name,
          label: portLabel(port),
          x: resetPorts.length === 1 ? 88 : 66 + resetIndex * 44,
          y: 0,
          side: 'NORTH',
          role: 'reset',
          negative: !(port.name === 'SET' || port.name === 'S' ? setPositive : resetPositive),
        };
      const clock = port.name === 'CLK' || port.name === 'C';
      const en = port.name === 'EN' || port.name === 'E';
      const output = port.direction === 'output';
      return {
        id: port.id,
        name: port.name,
        label: portLabel(port),
        x: output ? 180 : 0,
        y: output || port.name === 'D' ? 56 : clock ? 108 : 82,
        side: output ? 'EAST' : 'WEST',
        role: clock ? 'clock' : en ? 'enable' : output ? 'output' : 'input',
        negative: clock ? !clockPositive : en ? !enablePositive : false,
      };
    }),
  };
}

function orLeft(y: number): number {
  const fraction = (96 - y) / 68;
  return 40 + 44 * fraction * (1 - fraction);
}

export function RtlSymbol({ node, spec }: { node: GraphNode; spec: RtlSymbolSpec }) {
  const { kind } = spec;
  const storage = kind === 'dff' || kind === 'latch';
  const operator = kind === 'comparator' || kind === 'shift';
  const gate = ['and', 'or', 'xor', 'not', 'buffer'].includes(kind);
  const gateOutputX = kind === 'or' || kind === 'xor' ? 122 : kind === 'and' ? 114 : 114;
  const outputX = kind === 'mux' ? 130 : kind === 'adder' ? 128 : gateOutputX;
  const outputY = kind === 'mux' ? 70 : 62;
  return (
    <g className={`rtl-symbol rtl-${kind}`} data-symbol={kind}>
      <rect className="rtl-hit-area" x="0" y="0" width={spec.width} height={spec.height} />
      {gate && (
        <>
          {kind === 'and' ? (
            <path className="rtl-symbol-body" d="M40,28 H80 A34,34 0 0 1 80,96 H40 Z" />
          ) : kind === 'or' || kind === 'xor' ? (
            <>
              <path
                className="rtl-symbol-body"
                d="M40,28 C76,28 106,42 122,62 C106,82 76,96 40,96 Q62,62 40,28 Z"
              />
              {kind === 'xor' && <path className="rtl-symbol-detail" d="M31,28 Q53,62 31,96" />}
            </>
          ) : (
            <path className="rtl-symbol-body" d="M44,28 L114,62 L44,96 Z" />
          )}
        </>
      )}
      {kind === 'mux' && (
        <>
          <path className="rtl-symbol-body" d="M50,28 L130,44 V100 L50,116 Z" />
          <text className="rtl-symbol-operation" x="89" y="74" textAnchor="middle">
            {spec.label}
          </text>
          <text className="rtl-mux-choice" x="60" y="52">
            {spec.parallelMux ? 'A' : '0'}
          </text>
          <text className="rtl-mux-choice" x="60" y="98">
            {spec.parallelMux ? 'B' : '1'}
          </text>
        </>
      )}
      {kind === 'adder' && (
        <>
          <circle className="rtl-symbol-body" cx="90" cy="62" r="38" />
          <text className="rtl-adder-operation" x="90" y="72" textAnchor="middle">
            {spec.label}
          </text>
        </>
      )}
      {operator && (
        <>
          <rect className="rtl-symbol-body" x="44" y="28" width="88" height="68" />
          <text className="rtl-operator-operation" x="88" y="72" textAnchor="middle">
            {spec.label}
          </text>
        </>
      )}
      {storage && (
        <>
          <rect className="rtl-symbol-body" x="44" y="32" width="88" height="98" />
          <text className="rtl-symbol-operation" x="88" y="110" textAnchor="middle">
            {spec.label}
          </text>
          {spec.resetInfo && (
            <text className="rtl-reset-info" x="88" y="43" textAnchor="middle">
              {spec.resetInfo}
            </text>
          )}
        </>
      )}
      {spec.inverted && <circle className="rtl-inversion" cx={outputX + 6} cy={outputY} r="6" />}
      {spec.ports.map((port) => {
        let bodyX: number;
        let bodyY = port.y;
        if (storage) {
          bodyX = port.role === 'output' ? 132 : port.side === 'NORTH' ? port.x : 44;
          if (port.side === 'NORTH') bodyY = 32;
        } else if (kind === 'mux') {
          bodyX = port.role === 'output' ? outputX : port.role === 'select' ? port.x : 50;
          if (port.role === 'select') bodyY = 116 - ((port.x - 50) * 16) / 80;
        } else if (kind === 'adder')
          bodyX = port.role === 'output' ? outputX : 90 - Math.sqrt(38 ** 2 - (port.y - 62) ** 2);
        else if (operator) bodyX = port.role === 'output' ? 132 : 44;
        else
          bodyX =
            port.role === 'output'
              ? outputX
              : kind === 'not' || kind === 'buffer'
                ? 44
                : kind === 'or' || kind === 'xor'
                  ? orLeft(port.y)
                  : 40;
        let endX = bodyX;
        let endY = bodyY;
        if (port.role === 'output' && spec.inverted) endX += 12;
        if (port.negative) {
          if (port.side === 'NORTH') endY -= 12;
          else endX -= 12;
        }
        return (
          <g key={port.id} className={`rtl-terminal role-${port.role}`} data-pin={port.name}>
            <title>{`${port.label}${port.role === 'clock' ? (port.negative ? ' · спад тактового сигнала' : ' · фронт тактового сигнала') : port.negative ? ' · активный низкий уровень' : ''}`}</title>
            <path className="rtl-pin-line" d={`M${port.x},${port.y} L${endX},${endY}`} />
            <circle className="schematic-port rtl-port-dot" cx={port.x} cy={port.y} r="2" />
            {port.negative && (
              <circle
                className="rtl-inversion"
                cx={port.side === 'NORTH' ? bodyX : bodyX - 6}
                cy={port.side === 'NORTH' ? bodyY - 6 : bodyY}
                r="6"
              />
            )}
            {port.role === 'clock' && (
              <path
                className="rtl-clock-triangle"
                d={`M44,${port.y - 6} L53,${port.y} L44,${port.y + 6}`}
              />
            )}
            {storage && port.role !== 'reset' ? (
              <>
                <text
                  className="rtl-dff-pin-label"
                  x={port.role === 'output' ? 122 : port.role === 'clock' ? 57 : 54}
                  y={port.y + 3}
                  textAnchor={port.role === 'output' ? 'end' : 'start'}
                >
                  {port.role === 'enable' ? 'EN' : port.role === 'clock' ? 'C' : port.name}
                </text>
                {port.label !== port.name && (
                  <text
                    className="rtl-pin-label"
                    x={port.side === 'EAST' ? 174 : 6}
                    y={port.y - 7}
                    textAnchor={port.side === 'EAST' ? 'end' : 'start'}
                  >
                    {port.label}
                  </text>
                )}
              </>
            ) : (
              <text
                className="rtl-pin-label"
                x={
                  port.side === 'NORTH'
                    ? port.x + 8
                    : port.side === 'SOUTH'
                      ? port.x + 10
                      : port.side === 'EAST'
                        ? 174
                        : 6
                }
                y={port.side === 'NORTH' ? 13 : port.side === 'SOUTH' ? 155 : port.y - 7}
                textAnchor={port.side === 'EAST' ? 'end' : 'start'}
              >
                {port.label}
              </text>
            )}
          </g>
        );
      })}
      {storage ? (
        <>
          <text className="rtl-symbol-caption" x="90" y="148" textAnchor="middle">
            {spec.detail}
          </text>
          <text
            className="schematic-node-name rtl-instance-name"
            x="90"
            y="166"
            textAnchor="middle"
          >
            {shortName(node.name)}
          </text>
        </>
      ) : kind === 'mux' ? (
        <>
          <text className="schematic-node-name rtl-instance-name" x="90" y="15" textAnchor="middle">
            {shortName(node.name)}
          </text>
          <text className="rtl-symbol-caption rtl-mux-detail" x="99" y="134">
            {spec.detail}
          </text>
        </>
      ) : (
        <>
          <text className="schematic-node-name rtl-instance-name" x="90" y="15" textAnchor="middle">
            {shortName(node.name)}
          </text>
          <text className="rtl-symbol-caption" x="90" y="121" textAnchor="middle">
            {spec.detail}
          </text>
        </>
      )}
    </g>
  );
}
