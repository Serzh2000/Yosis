import type { CircuitNode, SymbolSpec } from '../../shared/schematic';
import {
  circuitGeometry,
  noteLines,
  symbolTransform,
  type NodeGeometry,
} from '../lib/circuit-geometry';

/** Форма символа в его собственных координатах (до поворота). */
function Shape({ spec, geo }: { spec: SymbolSpec; geo: NodeGeometry }) {
  const w = geo.localWidth,
    h = geo.localHeight,
    bubble = spec.invertOut ? 8 : 0,
    inBubble = spec.invertIn?.some(Boolean) ? 10 : 0;
  const clock = geo.pins.find((pin) => pin.clock);
  switch (spec.shape) {
    case 'and': {
      const r = Math.min(h / 2, 30),
        end = w - bubble;
      return (
        <>
          <path
            className="cs-body"
            d={`M${inBubble},0 H${end - r} A${r},${h / 2} 0 0 1 ${end - r},${h} H${inBubble} Z`}
          />
          {bubble > 0 && <circle className="cs-bubble" cx={w - 4} cy={h / 2} r={4} />}
        </>
      );
    }
    case 'or':
    case 'xor': {
      const end = w - bubble;
      return (
        <>
          <path
            className="cs-body"
            d={`M${inBubble},0 Q${end * 0.55},0 ${end},${h / 2} Q${end * 0.55},${h} ${inBubble},${h} Q${inBubble + 16},${h / 2} ${inBubble},0 Z`}
          />
          {spec.shape === 'xor' && (
            <path
              className="cs-line"
              d={`M${inBubble - 7},${h} Q${inBubble + 9},${h / 2} ${inBubble - 7},0`}
            />
          )}
          {bubble > 0 && <circle className="cs-bubble" cx={w - 4} cy={h / 2} r={4} />}
        </>
      );
    }
    case 'buf':
      return (
        <>
          <path className="cs-body" d={`M0,0 L${w - bubble},${h / 2} L0,${h} Z`} />
          {bubble > 0 && <circle className="cs-bubble" cx={w - 4} cy={h / 2} r={4} />}
        </>
      );
    case 'mux':
      return <path className="cs-body" d={`M0,0 L${w},12 L${w},${h - 12} L0,${h} Z`} />;
    case 'demux':
      return <path className="cs-body" d={`M0,12 L${w},0 L${w},${h} L0,${h - 12} Z`} />;
    case 'port-in':
    case 'board-in':
      return (
        <path
          className={spec.shape === 'board-in' ? 'cs-body cs-board' : 'cs-body cs-port'}
          d={`M0,0 H${w - 14} L${w},${h / 2} L${w - 14},${h} H0 Z`}
        />
      );
    case 'port-out':
    case 'board-out':
      return (
        <path
          className={spec.shape === 'board-out' ? 'cs-body cs-board' : 'cs-body cs-port'}
          d={`M14,0 H${w} V${h} H14 L0,${h / 2} Z`}
        />
      );
    case 'const':
      return <rect className="cs-body" x={0} y={0} width={w} height={h} rx={h / 2} />;
    case 'label':
      return (
        <path
          className="cs-body cs-tag"
          d={
            spec.detail === '→'
              ? `M0,0 H${w - 14} L${w},${h / 2} L${w - 14},${h} H0 Z`
              : `M14,0 H${w} V${h} H14 L0,${h / 2} Z`
          }
        />
      );
    case 'note':
      return <rect className="cs-note" x={0} y={0} width={w} height={h} rx={4} />;
    default:
      return (
        <>
          <rect className="cs-body" x={0} y={0} width={w} height={h} rx={5} />
          {spec.shape === 'ff' && clock && (
            <path
              className="cs-line"
              d={`M${clock.lx},${clock.ly - 7} L${clock.lx + 11},${clock.ly} L${clock.lx},${clock.ly + 7}`}
            />
          )}
        </>
      );
  }
}

export function CircuitSymbol({
  node,
  hideDetail = false,
}: {
  node: CircuitNode;
  hideDetail?: boolean;
}) {
  const geo = circuitGeometry(node),
    spec = geo.spec;
  const cx = geo.width / 2,
    cy = geo.height / 2;
  const insideLabel = !['and', 'or', 'xor', 'buf'].includes(spec.shape);
  const showPinNames = ['box', 'ff', 'mux', 'demux', 'and', 'or', 'xor'].includes(spec.shape);
  const showInstanceName = ![
    'port-in',
    'port-out',
    'const',
    'note',
    'board-in',
    'board-out',
    'label',
  ].includes(spec.shape);
  return (
    <>
      <g transform={symbolTransform(node, geo)}>
        <Shape spec={spec} geo={geo} />
        {spec.invertIn?.map((inverted, index) => {
          const pin = geo.pins.filter((value) => value.direction === 'input')[index];
          return inverted && pin ? (
            <circle key={index} className="cs-bubble" cx={5} cy={pin.ly} r={4} />
          ) : null;
        })}
      </g>
      {spec.shape === 'note' ? (
        <text className="cs-text" x={node.x} y={node.y} aria-hidden="true">
          {noteLines(spec.label).map((line, index) => (
            <tspan key={index} x={10} y={20 + index * 18}>
              {line}
            </tspan>
          ))}
        </text>
      ) : (
        insideLabel && (
          <g aria-hidden="true">
            <text className="cs-title" x={cx} y={spec.detail ? cy - 2 : cy + 5} textAnchor="middle">
              {spec.label}
            </text>
            {spec.detail && !hideDetail && (
              <text className="cs-detail" x={cx} y={cy + 16} textAnchor="middle">
                {spec.detail}
              </text>
            )}
          </g>
        )
      )}
      {!insideLabel && spec.detail && (
        <text
          className="cs-detail"
          x={cx}
          y={geo.height + 14}
          textAnchor="middle"
          aria-hidden="true"
        >
          {spec.detail}
        </text>
      )}
      {showPinNames &&
        geo.pins.map((pin) => {
          const inward = { x: -pin.dx, y: -pin.dy };
          const x = pin.x + inward.x * 6,
            y = pin.y + inward.y * 6 + (inward.y !== 0 ? inward.y * 6 : 4);
          const anchor = inward.x > 0 ? 'start' : inward.x < 0 ? 'end' : 'middle';
          return (
            <text
              key={pin.name}
              className="cs-pin-name"
              x={x + (inward.x > 0 ? 3 : inward.x < 0 ? -3 : 0)}
              y={y}
              textAnchor={anchor}
              aria-hidden="true"
            >
              {pin.name}
            </text>
          );
        })}
      {showInstanceName && (
        <text className="cs-instance" x={cx} y={-8} textAnchor="middle" aria-hidden="true">
          {node.name}
        </text>
      )}
    </>
  );
}
