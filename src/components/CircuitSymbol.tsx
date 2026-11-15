import type { CircuitNode, SymbolSpec } from '../../shared/schematic';
import {
  circuitGeometry,
  noteLines,
  symbolTransform,
  type NodeGeometry,
} from '../lib/circuit-geometry';

/** Стиль условных графических обозначений: ANSI (формы вентилей) или ЕСКД/IEC (прямоугольники). */
export type SymbolStyle = 'ansi' | 'gost';

/** Расстояние от вывода до центра кружка инверсии: кружок касается тела и не лезет на вывод. */
const BUBBLE_OFFSET = 9;
/** Сколько места съедает кружок инверсии (его диаметр и зазор до вывода). */
const BUBBLE_SPACE = 13;
const BUBBLE_R = 4;

/** Обозначение функции внутри прямоугольника по ЕСКД (ГОСТ 2.743, IEC 60617). */
function gostQualifier(spec: SymbolSpec): string {
  switch (spec.shape) {
    case 'and':
      return '&';
    case 'or':
      return '≥1';
    case 'xor':
      return '=1';
    case 'buf':
      return '1';
    case 'mux':
      return 'MUX';
    case 'demux':
      return 'DMX';
    default:
      return spec.label;
  }
}

/** Подписи блоков в ЕСКД: сокращения, принятые в стандарте, вместо английских. */
const gostLabels: Record<string, string> = { DEC: 'DC', ENC: 'CD' };

/**
 * Вогнутая сторона ИЛИ: квадратичная кривая от (x, h) через (x + 2·bow, h/2) к (x, 0).
 * Её глубина в точке y равна 4·bow·t·(1 − t), где t = 1 − y/h: по ней выводы получают «усики».
 */
const backDepth = (bow: number, y: number, h: number) => {
  const t = Math.min(1, Math.max(0, 1 - y / h));
  return 4 * bow * t * (1 - t);
};

/** Форма символа в его собственных координатах (до поворота). */
function Shape({ spec, geo, style }: { spec: SymbolSpec; geo: NodeGeometry; style: SymbolStyle }) {
  const w = geo.localWidth,
    h = geo.localHeight,
    outBubble = spec.invertOut ? BUBBLE_SPACE : 0,
    inBubble = spec.invertIn?.some(Boolean) ? BUBBLE_SPACE : 0;
  const clock = geo.pins.find((pin) => pin.clock);
  const inputs = geo.pins.filter((pin) => pin.direction === 'input');
  const gate =
    spec.shape === 'and' || spec.shape === 'or' || spec.shape === 'xor' || spec.shape === 'buf';
  const outBubbleMark = outBubble > 0 && (
    <circle className="cs-bubble" cx={w - BUBBLE_OFFSET} cy={h / 2} r={BUBBLE_R} />
  );
  if (style === 'gost' && gate) {
    // Прямоугольник с обозначением функции; инверсия — кружок на границе, как в стандарте.
    return (
      <>
        <rect
          className="cs-body"
          x={inBubble}
          y={0}
          width={w - outBubble - inBubble}
          height={h}
          rx={2}
        />
        {outBubbleMark}
      </>
    );
  }
  switch (spec.shape) {
    case 'and': {
      const x0 = inBubble,
        x1 = w - outBubble,
        r = Math.min(h / 2, 30);
      return (
        <>
          <path
            className="cs-body"
            d={`M${x0},0 H${x1 - r} A${r},${r} 0 0 1 ${x1},${r} V${h - r} A${r},${r} 0 0 1 ${x1 - r},${h} H${x0} Z`}
          />
          {outBubbleMark}
        </>
      );
    }
    case 'or':
    case 'xor': {
      const xor = spec.shape === 'xor',
        // У исключающего ИЛИ тело сдвинуто на 7: слева остаётся место под вторую дугу.
        x0 = inBubble + (xor ? 7 : 0),
        x1 = w - outBubble,
        span = x1 - x0,
        bow = Math.min(span * 0.2, 14);
      const body =
        `M${x0},0 C${x0 + span * 0.42},0 ${x1 - span * 0.2},${h * 0.16} ${x1},${h / 2} ` +
        `C${x1 - span * 0.2},${h * 0.84} ${x0 + span * 0.42},${h} ${x0},${h} ` +
        `Q${x0 + bow * 2},${h / 2} ${x0},0 Z`;
      return (
        <>
          <path className="cs-body" d={body} />
          {xor && (
            <path
              className="cs-line"
              d={`M${inBubble},${h} Q${inBubble + bow * 2},${h / 2} ${inBubble},0`}
            />
          )}
          {/* Усики: вывод тянется до вогнутой стороны, как у обычного вентиля. */}
          {inBubble === 0 &&
            inputs.map((pin) => {
              const reach = backDepth(bow, pin.ly, h);
              return reach > 1 ? (
                <line
                  key={pin.name}
                  className="cs-line"
                  x1={0}
                  y1={pin.ly}
                  x2={reach + (xor ? 0 : 0)}
                  y2={pin.ly}
                />
              ) : null;
            })}
          {outBubbleMark}
        </>
      );
    }
    case 'buf':
      return (
        <>
          <path
            className="cs-body"
            d={`M${inBubble},0 L${w - outBubble},${h / 2} L${inBubble},${h} Z`}
          />
          {outBubbleMark}
        </>
      );
    case 'mux':
      return style === 'gost' ? (
        <rect className="cs-body" x={0} y={0} width={w} height={h} rx={2} />
      ) : (
        <path className="cs-body" d={`M0,0 L${w},12 L${w},${h - 12} L0,${h} Z`} />
      );
    case 'demux':
      return style === 'gost' ? (
        <rect className="cs-body" x={0} y={0} width={w} height={h} rx={2} />
      ) : (
        <path className="cs-body" d={`M0,12 L${w},0 L${w},${h} L0,${h - 12} Z`} />
      );
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
            // Клин такта стоит внутри корпуса, у самого вывода CLK.
            <path className="cs-line" d={`M0,${clock.ly - 7} L10,${clock.ly} L0,${clock.ly + 7}`} />
          )}
        </>
      );
  }
}

export function CircuitSymbol({
  node,
  hideDetail = false,
  style = 'ansi',
}: {
  node: CircuitNode;
  hideDetail?: boolean;
  style?: SymbolStyle;
}) {
  const geo = circuitGeometry(node),
    spec = geo.spec;
  const cx = geo.width / 2,
    cy = geo.height / 2;
  const gost = style === 'gost';
  const gateShape = ['and', 'or', 'xor', 'buf'].includes(spec.shape);
  const boxLike = gost ? ['mux', 'demux'].includes(spec.shape) : false;
  // Формы ANSI подписывать внутри нечем; в ЕСКД обозначение функции — текст в прямоугольнике.
  const insideLabel = !gateShape || gost;
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
  const title = gost ? (gostLabels[spec.label] ?? gostQualifier(spec)) : spec.label;
  // В ЕСКД у вентилей обозначение стоит сверху по центру, а не посередине.
  const gostGate = gost && gateShape;
  const titleY = gostGate ? 17 : spec.detail ? cy - 2 : cy + 5;
  // Единственный выход вентиля не подписывается: «Y» мешал бы кривой и кружку инверсии.
  const hiddenPin = (pin: { direction: string; name: string }) =>
    (gateShape && !gost && pin.direction === 'output') ||
    // В прямоугольнике мультиплексора нет места для D0…D7 и Y0…Y3: остаются S и общий вывод.
    (boxLike && (/^[DY]\d+$/.test(pin.name) || (spec.shape === 'demux' && pin.name === 'A')));
  // Подпись корпуса стоит посередине между столбцами имён выводов: иначе «CLK» наезжает на неё.
  const NAME_W = 7.4;
  const reach = (side: 'left' | 'right') =>
    Math.max(
      0,
      ...geo.pins
        .filter((pin) => !hiddenPin(pin) && (side === 'left' ? -pin.dx > 0 : -pin.dx < 0))
        .map((pin) => 9 + (pin.clock && side === 'left' ? 10 : 0) + pin.name.length * NAME_W),
    );
  const textX =
    showPinNames && !gateShape && !boxLike
      ? (reach('left') + (geo.width - reach('right'))) / 2
      : cx;
  const mirrorDetail = gost && ['mux', 'demux'].includes(spec.shape) ? spec.label : spec.detail;
  return (
    <>
      <g transform={symbolTransform(node, geo)}>
        <Shape spec={spec} geo={geo} style={style} />
        {spec.invertIn?.map((inverted, index) => {
          const pin = geo.pins.filter((value) => value.direction === 'input')[index];
          return inverted && pin ? (
            <circle key={index} className="cs-bubble" cx={BUBBLE_OFFSET} cy={pin.ly} r={BUBBLE_R} />
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
            <text
              className={gostGate ? 'cs-qualifier' : 'cs-title'}
              x={
                gostGate
                  ? cx - (spec.invertOut ? 4 : 0)
                  : gost && spec.shape === 'demux'
                    ? cx + 5
                    : textX
              }
              y={boxLike ? cy - 2 : titleY}
              textAnchor="middle"
            >
              {title}
            </text>
            {!gostGate && (boxLike ? mirrorDetail : spec.detail) && !hideDetail && (
              <text
                className="cs-detail"
                x={boxLike ? cx : textX}
                y={boxLike ? cy + 14 : cy + 16}
                textAnchor="middle"
              >
                {boxLike ? mirrorDetail : spec.detail}
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
      {gostGate && spec.detail && !hideDetail && (
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
        geo.pins
          .filter((pin) => !hiddenPin(pin))
          .map((pin) => {
            const inward = { x: -pin.dx, y: -pin.dy };
            // Клин такта занимает первые 12 единиц от края: подпись CLK отодвигается за него.
            const clockShift = pin.clock && inward.x > 0 ? 10 : 0;
            // Входы ИЛИ/ИСКЛ. ИЛИ начинаются за вогнутой стороной.
            const gateShift = gateShape && !gost && pin.direction === 'input' ? 12 : 0;
            // Имя вывода не должно лезть на кружок инверсии, стоящий у этого вывода.
            const inputIndex = geo.pins.filter((value) => value.direction === 'input').indexOf(pin);
            const bubbled =
              pin.direction === 'output' ? !!spec.invertOut : !!spec.invertIn?.[inputIndex];
            const bubbleShift = bubbled ? BUBBLE_SPACE : 0;
            const x = pin.x + inward.x * (6 + bubbleShift),
              y = pin.y + inward.y * (6 + bubbleShift) + (inward.y !== 0 ? inward.y * 6 : 4);
            const anchor = inward.x > 0 ? 'start' : inward.x < 0 ? 'end' : 'middle';
            return (
              <text
                key={pin.name}
                className="cs-pin-name"
                x={x + (inward.x > 0 ? 3 + clockShift + gateShift : inward.x < 0 ? -3 : 0)}
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
