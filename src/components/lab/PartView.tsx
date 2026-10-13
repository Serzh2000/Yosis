import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { BOARD_CLOCK_HZ, type Device } from '../../lib/lab/devices';
import { BusPartBody } from './BusPartView';

export function formatHz(value: number): string {
  if (!value) return '0 Гц';
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} МГц`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(value >= 1e5 ? 0 : 2)} кГц`;
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} Гц`;
}
const russian = (value: number, digits = 2) => value.toFixed(digits).replace('.', ',');

/** A lamp of the given colour at brightness 0..1. */
function glow(color: string, brightness: number): CSSProperties {
  const b = Math.max(0, Math.min(1, brightness));
  // A lamp that is off is a tinted lens with a rim, like a real one against its board: it
  // must be easy to find and to tell its colour before it lights.
  return {
    background: `color-mix(in srgb, ${color} ${Math.round(38 + b * 62)}%, #3a3f45)`,
    boxShadow:
      b > 0.03
        ? `0 0 ${4 + b * 14}px ${1 + b * 4}px ${color}, inset 0 0 0 1px #fff5`
        : `inset 0 0 0 1.5px color-mix(in srgb, ${color} 70%, #fff), inset 0 -5px 6px #0006`,
  };
}

const SEGMENT_RECTS: [number, number, number, number][] = [
  [9, 3, 22, 6],
  [31, 8, 6, 23],
  [31, 37, 6, 23],
  [9, 59, 22, 6],
  [3, 37, 6, 23],
  [3, 8, 6, 23],
  [9, 31, 22, 6],
];
/** Segments a..g lit for each decimal digit, as a BCD-to-seven-segment decoder drives them. */
const DECODED = [
  0b0111111, 0b0000110, 0b1011011, 0b1001111, 0b1100110, 0b1101101, 0b1111101, 0b0000111, 0b1111111,
  0b1101111,
];
function Digit({ levels, color }: { levels: number[]; color: string }) {
  const fill = (b: number) => ({
    fill: color,
    opacity: 0.22 + Math.min(1, b) * 0.78,
    filter: b > 0.3 ? `drop-shadow(0 0 3px ${color})` : undefined,
  });
  return (
    <svg className="lab-digit" viewBox="0 0 46 68" aria-hidden="true">
      {SEGMENT_RECTS.map(([x, y, w, h], index) => (
        <rect
          key={index}
          x={x}
          y={y}
          width={w}
          height={h}
          rx="2.5"
          style={fill(levels[index] ?? 0)}
        />
      ))}
      <circle cx="42" cy="62" r="3" style={fill(levels[7] ?? 0)} />
    </svg>
  );
}

/** A square wave at the buzzer's frequency. The browser allows sound only after a click. */
let audio: AudioContext | undefined;
function useTone(frequency: number, muted: boolean) {
  const voice = useRef<{ oscillator: OscillatorNode; gain: GainNode } | null>(null);
  useEffect(() => {
    if (!frequency || muted) {
      voice.current?.gain.gain.setTargetAtTime(0, audio!.currentTime, 0.01);
      return;
    }
    try {
      audio ??= new AudioContext();
      if (audio.state === 'suspended') void audio.resume();
      if (!voice.current) {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = 'square';
        gain.gain.value = 0;
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        voice.current = { oscillator, gain };
      }
      voice.current.oscillator.frequency.setTargetAtTime(frequency, audio.currentTime, 0.005);
      voice.current.gain.gain.setTargetAtTime(0.035, audio.currentTime, 0.01);
    } catch {
      /* No sound device: the picture still shows the frequency. */
    }
  }, [frequency, muted]);
  useEffect(
    () => () => {
      voice.current?.oscillator.stop();
      voice.current = null;
    },
    [],
  );
}

function Buzzer({ frequency, raw, muted }: { frequency: number; raw: number; muted: boolean }) {
  useTone(frequency, muted);
  return (
    <div className={`lab-buzzer ${frequency ? 'sounding' : ''}`}>
      <i />
      <small>{raw ? formatHz(raw) : 'тихо'}</small>
    </div>
  );
}

function Terminal({ device, act }: { device: Device; act: Act }) {
  const [draft, setDraft] = useState('');
  const view = device.view as { text: string; baud: number; sending?: boolean };
  const screen = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (screen.current) screen.current.scrollTop = screen.current.scrollHeight;
  }, [view.text]);
  return (
    <div className="lab-terminal">
      <pre ref={screen} aria-label="Принятые данные">
        {view.text || 'Здесь появятся принятые байты.'}
      </pre>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (draft) act('send', `${draft}\r\n`);
          setDraft('');
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Текст для схемы"
          aria-label="Текст для отправки"
        />
        <button type="submit" className="lab-mini">
          Отправить
        </button>
      </form>
      <div className="lab-terminal-tools">
        <label>
          Скорость
          <select value={view.baud} onChange={(event) => act('baud', Number(event.target.value))}>
            {[9600, 19200, 57600, 115200, 230400, 1_000_000].map((baud) => (
              <option key={baud} value={baud}>
                {baud}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="lab-mini" onClick={() => act('clear')}>
          Очистить
        </button>
      </div>
    </div>
  );
}

function Waves({ device, act }: { device: Device; act: Act }) {
  const view = device.view as {
    window: number;
    from: number;
    to: number;
    channels: { wired: boolean; start: number; edges: { cycle: number; level: number }[] | null }[];
  };
  const width = 250;
  const x = (cycle: number) => ((cycle - view.from) / view.window) * width;
  return (
    <div className="lab-waves">
      <svg viewBox={`0 0 ${width} ${view.channels.length * 22}`} preserveAspectRatio="none">
        {view.channels.map((channel, index) => {
          const top = index * 22 + 4;
          const y = (level: number) => top + (level ? 0 : 13);
          if (!channel.wired)
            return (
              <line key={index} x1="0" x2={width} y1={top + 7} y2={top + 7} className="idle" />
            );
          if (!channel.edges)
            return <rect key={index} x="0" y={top} width={width} height="13" className="dense" />;
          let path = `M0 ${y(channel.start)}`;
          for (const edge of channel.edges)
            path += ` H${x(edge.cycle).toFixed(1)} V${y(edge.level)}`;
          return <path key={index} d={`${path} H${width}`} />;
        })}
      </svg>
      <label>
        Окно
        <select value={view.window} onChange={(event) => act('window', Number(event.target.value))}>
          {[200, 2000, 20_000, 200_000, 2_000_000, 27_000_000].map((cycles) => (
            <option key={cycles} value={cycles}>
              {cycles >= BOARD_CLOCK_HZ
                ? '1 с'
                : cycles / BOARD_CLOCK_HZ >= 0.001
                  ? `${russian((cycles / BOARD_CLOCK_HZ) * 1000, 1)} мс`
                  : `${russian((cycles / BOARD_CLOCK_HZ) * 1e6, 1)} мкс`}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

type Act = (name: string, value?: unknown) => void;

interface PartBodyProps {
  device: Device;
  /** `device.viewVersion` at the time of drawing: the picture is redrawn when it changes. */
  version: number;
  /** What the part is called on the bench; names its controls. */
  title: string;
  /** The colour property of the part, which is not part of its behaviour. */
  color?: string;
  act: Act;
  muted: boolean;
}
/**
 * The picture depends on the device, its view version and the few props below. `act` is a fresh
 * closure on every bench render and behaves the same, so it does not count.
 */
export const PartBody = memo(
  PartBodyView,
  (previous, next) =>
    previous.device === next.device &&
    previous.version === next.version &&
    previous.title === next.title &&
    previous.color === next.color &&
    previous.muted === next.muted,
);
/** The picture of a part and its controls. Everything shown comes from `device.view`. */
function PartBodyView({ device, version, title, color = '#ffd23f', act, muted }: PartBodyProps) {
  const shape = device.shape;
  const view = device.view as Record<string, never>;
  const hold = (pin: number) => ({
    onPointerDown: (event: React.PointerEvent) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      act('set', { pin, on: true });
    },
    onPointerUp: () => act('set', { pin, on: false }),
    onPointerCancel: () => act('set', { pin, on: false }),
    onKeyDown: (event: React.KeyboardEvent) => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat)
        act('set', { pin, on: true });
    },
    onKeyUp: (event: React.KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') act('set', { pin, on: false });
    },
  });
  switch (device.def.kind) {
    case 'light': {
      const b = (view.b as number[] | undefined) ?? [];
      if (shape === 'seg') return <Digit levels={b} color={color} />;
      if (shape === 'ring')
        return (
          <div className="lab-ring">
            {b.map((value, index) => (
              <i
                key={index}
                style={{
                  ...glow(color, value),
                  transform: `rotate(${(index * 360) / b.length}deg) translateY(-36px)`,
                }}
              />
            ))}
          </div>
        );
      if (shape === 'rgb')
        return (
          <i
            className="lab-dome"
            style={{
              background: `rgb(${b.map((value) => Math.round(96 + (value ?? 0) * 159)).join(' ')})`,
              boxShadow:
                Math.max(...b, 0) > 0.03
                  ? `0 0 16px 4px rgb(${b.map((value) => Math.round((value ?? 0) * 255)).join(' ')})`
                  : 'inset 0 0 0 1.5px #e9edf0, inset 0 -5px 6px #0006',
            }}
          />
        );
      if (shape === 'traffic')
        return (
          <div className="lab-traffic">
            {['#ff3b30', '#ffd23f', '#34d058'].map((lamp, index) => (
              <i key={lamp} style={glow(lamp, b[index] ?? 0)} />
            ))}
          </div>
        );
      if (shape === 'bar')
        return (
          <div className="lab-bar">
            {device.pins.map((pin, index) => (
              <i key={pin[0]} style={glow(color, b[index] ?? 0)} />
            ))}
          </div>
        );
      if (shape === 'laser')
        return (
          <div className="lab-laser">
            <b />
            <i style={{ opacity: b[0] ?? 0, background: color, boxShadow: `0 0 8px ${color}` }} />
          </div>
        );
      return <i className="lab-dome" style={glow(color, b[0] ?? 0)} />;
    }
    case 'bicolor': {
      const [red, green] = (view.b as number[] | undefined) ?? [0, 0];
      const mix = [red, green].map((value) => Math.round(40 + (value ?? 0) * 215));
      return (
        <i
          className="lab-dome"
          style={{
            background: `rgb(${mix[0]} ${mix[1]} 40)`,
            boxShadow:
              Math.max(red, green) > 0.03
                ? `0 0 16px 4px rgb(${Math.round(red * 255)} ${Math.round(green * 255)} 0)`
                : 'inset 0 0 0 1.5px #e9edf0, inset 0 -5px 6px #0006',
          }}
        />
      );
    }
    case 'scan': {
      const b = (view.b as number[][] | undefined) ?? [];
      if (shape === 'seg')
        return (
          <div className="lab-digits">
            {b.map((levels, index) => (
              <Digit key={index} levels={levels} color={color} />
            ))}
          </div>
        );
      return (
        <div
          className="lab-matrix"
          style={{ gridTemplateColumns: `repeat(${b[0]?.length ?? 1}, 1fr)` }}
        >
          {b.flatMap((row, r) =>
            row.map((value, c) => <i key={`${r}-${c}`} style={glow(color, value)} />),
          )}
        </div>
      );
    }
    case 'number': {
      const value = (view.value as number | undefined) ?? 0;
      if (shape === 'bcd7') {
        const decoded = value < 10 && view.wired ? DECODED[value] : 0;
        return (
          <Digit
            color={color}
            levels={Array.from({ length: 7 }, (_, bit) => (decoded >> bit) & 1)}
          />
        );
      }
      return shape === 'hex' ? (
        <output className="lab-hex">{value.toString(16).toUpperCase()}</output>
      ) : (
        <output className="lab-byte">
          <b>{value}</b>
          <span>
            0x{value.toString(16).toUpperCase().padStart(2, '0')} ·{' '}
            {value.toString(2).padStart(8, '0')}
          </span>
        </output>
      );
    }
    case 'counter': {
      const digits = (view.digits as number | undefined) ?? 4;
      const count = (view.count as number | undefined) ?? 0;
      return <output className="lab-counter">{String(count).padStart(digits, '0')}</output>;
    }
    case 'switch': {
      const on = (view.on as boolean[] | undefined) ?? [];
      const keys = device.params.keys as string[];
      if (shape === 'const')
        return <output className="lab-const">{device.params.fixed as number}</output>;
      if (!device.params.momentary && (shape === 'button' || shape === 'arcade'))
        return (
          <div className={`lab-keys shape-${shape}`}>
            <button
              type="button"
              className={`lab-cap ${on[0] ? 'down' : ''}`}
              style={{ '--cap': color } as CSSProperties}
              role="switch"
              aria-checked={!!on[0]}
              aria-label={title}
              onClick={() => act('set', { pin: 0 })}
            />
          </div>
        );
      if (device.params.momentary)
        return (
          <div className={`lab-keys shape-${shape}`}>
            {keys.map((label, pin) => (
              <button
                key={pin}
                type="button"
                className={`lab-cap ${on[pin] ? 'down' : ''}`}
                style={{ '--cap': color } as CSSProperties}
                aria-pressed={!!on[pin]}
                aria-label={`${title} ${label}`.trim()}
                {...hold(pin)}
              >
                {label}
              </button>
            ))}
          </div>
        );
      if (shape === 'sensor')
        return (
          <button
            type="button"
            className={`lab-sensor ${on[0] ? 'hit' : ''}`}
            aria-pressed={!!on[0]}
            aria-label={title}
            onClick={() => act('set', { pin: 0 })}
          >
            <i aria-hidden="true">{device.params.icon as string}</i>
            <span>{(on[0] ? device.params.hit : device.params.idle) as string}</span>
          </button>
        );
      return (
        <div className={`lab-toggles shape-${shape}`}>
          {keys.map((label, pin) => (
            <button
              key={pin}
              type="button"
              className={`lab-toggle ${on[pin] ? 'on' : ''}`}
              role="switch"
              aria-checked={!!on[pin]}
              aria-label={`${title} ${label}`.trim()}
              onClick={() => act('set', { pin })}
            >
              <i />
            </button>
          ))}
        </div>
      );
    }
    case 'dial':
      return (
        <div className="lab-dial">
          <button
            type="button"
            className="lab-mini"
            aria-label="Меньше"
            onClick={() => act('step', -1)}
          >
            −
          </button>
          <output>{((view.value as number | undefined) ?? 0).toString(16).toUpperCase()}</output>
          <button
            type="button"
            className="lab-mini"
            aria-label="Больше"
            onClick={() => act('step', 1)}
          >
            +
          </button>
        </div>
      );
    case 'keypad': {
      const rows = device.params.keys as string[];
      const pressed = new Set((view.pressed as string[] | undefined) ?? []);
      return (
        <div
          className="lab-keypad"
          style={{ gridTemplateColumns: `repeat(${rows[0].length}, 1fr)` }}
        >
          {rows.flatMap((row, r) =>
            row.split('').map((label, c) => {
              const key = `${r},${c}`;
              return (
                <button
                  key={key}
                  type="button"
                  className={pressed.has(key) ? 'down' : ''}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    act('key', { key, on: true });
                  }}
                  onPointerUp={() => act('key', { key, on: false })}
                  onPointerCancel={() => act('key', { key, on: false })}
                >
                  {label}
                </button>
              );
            }),
          )}
        </div>
      );
    }
    case 'encoder':
      return (
        <div className="lab-encoder">
          <button
            type="button"
            className="lab-mini"
            aria-label="Повернуть влево"
            onClick={() => act('turn', -1)}
          >
            ↺
          </button>
          <button
            type="button"
            className={`lab-knob ${view.pressed ? 'down' : ''}`}
            style={{ transform: `rotate(${((view.position as number | undefined) ?? 0) * 18}deg)` }}
            aria-label="Нажать на ручку"
            onPointerDown={() => act('press', true)}
            onPointerUp={() => act('press', false)}
            onPointerLeave={() => act('press', false)}
          >
            <i />
          </button>
          <button
            type="button"
            className="lab-mini"
            aria-label="Повернуть вправо"
            onClick={() => act('turn', 1)}
          >
            ↻
          </button>
        </div>
      );
    case 'buzzer':
      return (
        <Buzzer
          frequency={(view.frequency as number | undefined) ?? 0}
          raw={(view.raw as number | undefined) ?? 0}
          muted={muted}
        />
      );
    case 'gauge': {
      const duty = (view.duty as number | undefined) ?? 0;
      const frequency = (view.frequency as number | undefined) ?? 0;
      const spin: CSSProperties =
        duty > 0.03
          ? { animationDuration: `${(0.18 / duty).toFixed(2)}s` }
          : { animationName: 'none' };
      switch (shape) {
        case 'relay':
          return (
            <div className={`lab-relay ${duty > 0.5 ? 'closed' : ''}`}>
              <i />
              <small>{duty > 0.5 ? 'замкнуто' : 'разомкнуто'}</small>
            </div>
          );
        case 'motor':
        case 'fan':
          return (
            <div className={`lab-rotor shape-${shape}`}>
              <i style={spin} />
              <small>{Math.round(duty * 100)}%</small>
            </div>
          );
        case 'vibro':
          return (
            <div className={`lab-vibro ${duty > 0.03 ? 'shaking' : ''}`}>
              <i />
              <small>{Math.round(duty * 100)}%</small>
            </div>
          );
        case 'servo': {
          const angle = view.angle as number | null;
          return (
            <div className="lab-servo">
              <i style={{ transform: `rotate(${(angle ?? 90) - 90}deg)` }} />
              <small>{angle === null ? 'нет импульсов' : `${Math.round(angle)}°`}</small>
            </div>
          );
        }
        case 'freq':
          return <output className="lab-readout">{formatHz(frequency)}</output>;
        case 'volt':
          return <output className="lab-readout">{russian(duty * 3.3)} В</output>;
        default:
          return (
            <div className="lab-probe">
              <i style={glow('#ffd23f', duty)} />
              <span>
                {view.wired ? (view.level ? '1' : '0') : '—'} · {Math.round(duty * 100)}%
                <br />
                {formatHz(frequency)}
              </span>
            </div>
          );
      }
    }
    case 'stepper': {
      const coils = (view.coils as number[] | undefined) ?? [];
      return (
        <div className="lab-stepper">
          <i style={{ transform: `rotate(${(view.angle as number | undefined) ?? 0}deg)` }} />
          <div>
            {coils.map((level, index) => (
              <b key={index} style={glow('#ff8a1f', level)} />
            ))}
          </div>
        </div>
      );
    }
    case 'sr595': {
      const latch = (view.latch as number | undefined) ?? 0;
      return (
        <div className="lab-chip">
          <strong>74HC595</strong>
          <div className="lab-bar">
            {Array.from({ length: 8 }, (_, bit) => (
              <i key={bit} title={`Q${bit}`} style={glow('#34d058', (latch >> bit) & 1)} />
            ))}
          </div>
        </div>
      );
    }
    case 'sr165': {
      const switches = (view.switches as number | undefined) ?? 0;
      return (
        <div className="lab-chip">
          <strong>74HC165</strong>
          <div className="lab-toggles shape-dip">
            {Array.from({ length: 8 }, (_, index) => {
              const bit = 7 - index;
              return (
                <button
                  key={bit}
                  type="button"
                  className={`lab-toggle ${(switches >> bit) & 1 ? 'on' : ''}`}
                  role="switch"
                  aria-checked={!!((switches >> bit) & 1)}
                  aria-label={`Вход D${bit}`}
                  onClick={() => act('toggle', bit)}
                >
                  <i />
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case 'bus':
      return <BusPartBody device={device} version={version} act={act} />;
    case 'analyzer':
      return <Waves device={device} act={act} />;
    case 'pulse':
      return (
        <label className="lab-pulse">
          <span aria-hidden="true">⎍</span>
          <select
            value={(view.hz as number | undefined) ?? 2}
            onChange={(event) => act('hz', Number(event.target.value))}
            aria-label="Частота"
          >
            {[1, 2, 10, 100, 1000, 10_000, 100_000, 1_000_000].map((hz) => (
              <option key={hz} value={hz}>
                {formatHz(hz)}
              </option>
            ))}
          </select>
        </label>
      );
    case 'uart':
      return <Terminal device={device} act={act} />;
  }
}
