import type { PointerEvent } from 'react';
import { PIN_PITCH, partLayout, pinOffset } from '../../lib/lab/bench';
import { partPins, propValue, resolvePart, type PartDef } from '../../lib/lab/catalog';
import type { Device } from '../../lib/lab/devices';
import type { LabPart } from '../../lib/lab/runtime';
import { PartBody } from './PartView';

export interface PinStatus {
  ok: boolean;
  /** Why a drop here would not work. */
  reason?: string;
}
export interface PartHandlers {
  onPress: (event: PointerEvent, uid: string) => void;
  onOpen: (uid: string) => void;
  onSelect: (uid: string) => void;
  onPinDown: (event: PointerEvent, uid: string, pin: string) => void;
  onPinClick: (uid: string, pin: string) => void;
  onPinHover: (uid: string, pin: string | null) => void;
  act: (uid: string, name: string, value?: unknown) => void;
}
interface Props {
  part: LabPart;
  def: PartDef;
  device: Device | undefined;
  selected: boolean;
  muted: boolean;
  /** The pin that waits for a click on a pad, if any. */
  pending: string | null;
  wired: ReadonlySet<string>;
  /** The pin whose wire is hovered. */
  lit: string | null;
  /** While a wire is dragged: can it end on each pin of this part? */
  status: (pin: string) => PinStatus | null;
  /** The contact and signal a pin is wired to, for its tooltip. */
  describe: (pin: string) => string;
  /** Supply pins are not both wired: the part is dead. */
  unpowered: boolean;
  handlers: PartHandlers;
}

/** One part on the bench: name, picture, and the pins with their hit areas. */
export function PartShell({
  part,
  def,
  device,
  selected,
  muted,
  pending,
  wired,
  lit,
  status,
  describe,
  unpowered,
  handlers,
}: Props) {
  const title = part.label || def.title;
  const layout = partLayout(def, part.opts, part.rot, title);
  const { shape } = resolvePart(def, part.opts);
  const pins = partPins(def, part.opts);
  const color = propValue(def, part.opts, 'color') as string | undefined;
  return (
    <div
      className={`lab-part rot-${part.rot} ${selected ? 'selected' : ''} ${unpowered ? 'unpowered' : ''}`}
      data-part={part.uid}
      role="group"
      aria-label={title}
      tabIndex={0}
      style={{ left: part.x, top: part.y, width: layout.w, height: layout.h }}
      onPointerDown={(event) => handlers.onPress(event, part.uid)}
      onDoubleClick={(event) => {
        if (!(event.target as Element).closest('button, input, select, textarea, [data-nodrag]'))
          handlers.onOpen(part.uid);
      }}
      // Tabbing onto a part selects it; a press does its own selecting (a multi-selection must survive).
      onFocus={(event) => {
        if (event.target === event.currentTarget && event.currentTarget.matches(':focus-visible'))
          handlers.onSelect(part.uid);
      }}
    >
      <div
        className="lab-part-title"
        style={{ left: layout.title.x, top: layout.title.y, width: layout.title.w }}
        title={`${title}. Потяните, чтобы переставить; двойной щелчок открывает свойства.`}
      >
        {title}
      </div>
      <div
        className={`lab-part-body shape-${shape}`}
        data-nodrag={shape === 'uart' ? '' : undefined}
        style={{
          left: layout.body.x,
          top: layout.body.y,
          width: layout.body.w,
          height: layout.body.h,
        }}
      >
        {device && (
          <PartBody
            device={device}
            title={title}
            color={color}
            muted={muted}
            act={(name, value) => handlers.act(part.uid, name, value)}
          />
        )}
      </div>
      <div
        className="lab-part-pins"
        style={{
          left: layout.pins.x,
          top: layout.pins.y,
          width: layout.pins.w,
          height: layout.pins.h,
        }}
      >
        {pins.map((pin, index) => {
          const at = pinOffset(layout, pins.length, index);
          const state = status(pin[0]);
          return (
            <button
              key={pin[0]}
              type="button"
              data-target="pin"
              data-part={part.uid}
              data-pin={pin[0]}
              className={`lab-pin dir-${pin[2]} ${pending === pin[0] ? 'pending' : ''} ${
                wired.has(pin[0]) ? 'wired' : ''
              } ${lit === pin[0] ? 'lit' : ''} ${
                state ? (state.ok ? 'target-ok' : 'target-bad') : ''
              }`}
              style={
                layout.vertical
                  ? { left: 0, top: at.y - layout.pins.y - PIN_PITCH / 2, height: PIN_PITCH }
                  : { top: 0, left: at.x - layout.pins.x - PIN_PITCH / 2, width: PIN_PITCH }
              }
              title={`${pin[1]}: ${
                pin[2] === 'vcc'
                  ? 'питание детали — соедините с контактом 3V3 или 5V платы'
                  : pin[2] === 'gnd'
                    ? 'земля детали — соедините с контактом GND платы'
                    : pin[2] === 'in'
                      ? 'вход детали — сюда идёт сигнал от ПЛИС'
                      : pin[2] === 'io'
                        ? 'двусторонний вывод: ПЛИС и деталь по очереди тянут линию к нулю, единицу даёт подтяжка'
                        : 'выход детали — отсюда сигнал идёт в ПЛИС'
              }. ${describe(pin[0])}${state && !state.ok ? ` ${state.reason}` : ''}`}
              aria-label={`${title}, вывод ${pin[1]}`}
              onPointerDown={(event) => handlers.onPinDown(event, part.uid, pin[0])}
              onClick={() => handlers.onPinClick(part.uid, pin[0])}
              onPointerEnter={() => handlers.onPinHover(part.uid, pin[0])}
              onPointerLeave={() => handlers.onPinHover(part.uid, null)}
            >
              <i />
              <b>{pin[1]}</b>
            </button>
          );
        })}
      </div>
    </div>
  );
}
