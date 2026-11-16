import {
  circuitPins,
  connectCircuit,
  type CircuitDocument,
  type Endpoint,
} from '../../shared/schematic';
import { t } from './i18n';
import { stripSchemaPrefix } from '../../shared/circuit-util';

export type ConnectCheck =
  { ok: true; from: Endpoint; to: Endpoint } | { ok: false; reason: string };

function pinOf(doc: CircuitDocument, endpoint: Endpoint) {
  const node = doc.nodes.find((value) => value.id === endpoint.node);
  const pin = node && circuitPins(node).find((value) => value.name === endpoint.pin);
  return node && pin ? { node, pin } : null;
}
/** Дешёвая проверка без поиска петель: направление, ширина, занятость входа. */
export function quickCheck(
  doc: CircuitDocument,
  a: Endpoint,
  b: Endpoint,
  ignoreWire?: string,
): ConnectCheck {
  const first = pinOf(doc, a),
    second = pinOf(doc, b);
  if (!first || !second) return { ok: false, reason: t('Такого контакта нет.') };
  if (first.pin.direction === second.pin.direction)
    return {
      ok: false,
      reason:
        first.pin.direction === 'output'
          ? t('Это два выхода. Провод должен соединять выход одного элемента со входом другого.')
          : t('Это два входа. Начните провод с выхода элемента.'),
    };
  const [from, to] = first.pin.direction === 'output' ? [a, b] : [b, a],
    source = first.pin.direction === 'output' ? first : second,
    target = first.pin.direction === 'output' ? second : first;
  if (source.pin.width !== target.pin.width)
    return {
      ok: false,
      reason: t(
        'Ширины не совпадают: {width} и {width2} бит. Вставьте «Срез шины» или «Расширение шины».',
        { width: source.pin.width, width2: target.pin.width },
      ),
    };
  if (
    doc.wires.some(
      (wire) => wire.id !== ignoreWire && wire.to.node === to.node && wire.to.pin === to.pin,
    )
  )
    return {
      ok: false,
      reason: t('К этому входу уже подключён провод. Удалите его или перетащите его конец.'),
    };
  return { ok: true, from, to };
}
export function fullCheck(
  doc: CircuitDocument,
  a: Endpoint,
  b: Endpoint,
  ignoreWire?: string,
): ConnectCheck {
  const quick = quickCheck(doc, a, b, ignoreWire);
  if (!quick.ok) return quick;
  try {
    connectCircuit(doc, quick.from, quick.to, ignoreWire);
    return quick;
  } catch (error) {
    const message =
      error instanceof Error ? stripSchemaPrefix(error.message) : t('Соединение невозможно.');
    return { ok: false, reason: message };
  }
}
