import { memo } from 'react';
import { BOARD } from '../../lib/lab/bench';

interface Props {
  top: string;
  /** Brightness 0..1 of LED0..LED5. */
  leds: readonly number[];
  pressed: readonly boolean[];
  onButton: (pin: number, on: boolean) => void;
}

const sameList = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/**
 * The Tang Nano 20K as a picture, with its own LEDs and buttons. It is redrawn only when what it
 * shows changes; `onButton` is a fresh closure on every bench render and does not count.
 */
export const BoardView = memo(
  BoardViewPicture,
  (previous, next) =>
    previous.top === next.top &&
    sameList(previous.leds, next.leds) &&
    sameList(previous.pressed, next.pressed),
);
function BoardViewPicture({ top, leds, pressed, onButton }: Props) {
  return (
    <div
      className="vb-board lab-board"
      style={{ left: BOARD.x, top: BOARD.y }}
      role="group"
      aria-label="Плата Tang Nano 20K"
    >
      <div className="vb-usb" aria-hidden="true" />
      <div className="vb-hdmi" aria-hidden="true" />
      <div className="vb-fpc" aria-hidden="true" />
      <div className="vb-bl616" aria-hidden="true" />
      <div className="vb-chip-b" aria-hidden="true" />
      <div className="vb-update" aria-hidden="true">
        <i />
        <b>UPDATE</b>
      </div>
      <div className="vb-rgb" aria-hidden="true" />
      <div className="vb-pads" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="vb-fpga" aria-hidden="true">
        <i />
        <strong>GOWIN</strong>
        <span>GW2AR-18</span>
        <small>{top}</small>
      </div>
      <div className="vb-leds">
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const b = leds[index] ?? 0;
          return (
            <div className="vb-led-slot" key={index}>
              <span
                className="vb-led off"
                title={`LED${index}, вывод ${15 + index}: горит при 0`}
                style={
                  b > 0.02
                    ? {
                        background: `color-mix(in srgb, #fff6c9 ${Math.round(b * 100)}%, #8f9094)`,
                        boxShadow: `0 0 ${6 * b}px ${2 * b}px #ffd23f, 0 0 ${18 * b}px ${8 * b}px #ffb30080`,
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
      <div className="vb-silk" aria-hidden="true">
        <strong>SiPEED</strong>
        <i />
        <i />
        <strong>TANG NANO</strong>
        <em>20K</em>
      </div>
      <div className="vb-buttons">
        {(['S1', 'S2'] as const).map((id, pin) => (
          <div className="vb-button-slot" key={id}>
            <button
              type="button"
              className={`vb-button ${pressed[pin] ? 'pressed' : ''}`}
              aria-pressed={!!pressed[pin]}
              aria-label={`Кнопка ${id}`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                onButton(pin, true);
              }}
              onPointerUp={() => onButton(pin, false)}
              onPointerCancel={() => onButton(pin, false)}
            >
              <span>{id}</span>
              <b>{pressed[pin] ? 1 : 0}</b>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
