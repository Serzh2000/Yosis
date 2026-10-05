import { useEffect, useRef, type PointerEvent } from 'react';
import type { Hd44780 } from '../../lib/lab/bus/hd44780';
import { PS2_KEYS, REMOTE_KEYS } from '../../lib/lab/bus/sensors';
import type { Device } from '../../lib/lab/devices';
import './bus-parts.css';

type Act = (name: string, value?: unknown) => void;
type View = Record<string, never>;

/** A canvas that is redrawn only when `stamp` changes. */
function Picture({
  width,
  height,
  stamp,
  draw,
  label,
  className,
}: {
  width: number;
  height: number;
  stamp: string | number;
  draw: (context: CanvasRenderingContext2D) => void;
  label: string;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawn = useRef<string | number>('');
  useEffect(() => {
    if (drawn.current === stamp) return;
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    drawn.current = stamp;
    draw(context);
  });
  return (
    <canvas
      ref={canvas}
      className={className}
      width={width}
      height={height}
      role="img"
      aria-label={label}
    />
  );
}

const SEGMENTS: [number, number, number, number][] = [
  [9, 3, 22, 6],
  [31, 8, 6, 23],
  [31, 37, 6, 23],
  [9, 59, 22, 6],
  [3, 37, 6, 23],
  [3, 8, 6, 23],
  [9, 31, 22, 6],
];
/** One seven-segment digit; `mask` has bits 0..6 for a..g and bit 7 for the point. */
function Digit({ mask, color, glow = 1 }: { mask: number; color: string; glow?: number }) {
  const lit = (bit: number) => ((mask >> bit) & 1) === 1;
  const fill = (on: boolean) => ({
    fill: color,
    opacity: on ? 0.35 + glow * 0.65 : 0.1,
    filter: on ? `drop-shadow(0 0 3px ${color})` : undefined,
  });
  return (
    <svg className="bus-digit" viewBox="0 0 46 68" aria-hidden="true">
      {SEGMENTS.map(([x, y, w, h], bit) => (
        <rect key={bit} x={x} y={y} width={w} height={h} rx="2.5" style={fill(lit(bit))} />
      ))}
      <circle cx="42" cy="62" r="3" style={fill(lit(7))} />
    </svg>
  );
}

const hex = (value: number, digits = 2) => value.toString(16).toUpperCase().padStart(digits, '0');
const russian = (value: number, digits = 1) => value.toFixed(digits).replace('.', ',');

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  shown,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  shown?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="bus-slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>
        {shown ?? value}
        {unit ? ` ${unit}` : ''}
      </output>
    </label>
  );
}

function Oled({ view }: { view: View }) {
  const stamp = `${view.rev}${view.awake}${view.pump}${view.contrast}${view.invert}${view.allOn}${view.flipX}${view.flipY}`;
  const ram = view.ram as unknown as Uint8Array;
  const visible = view.awake && view.pump;
  return (
    <div className="bus-oled">
      <Picture
        className="bus-oled-glass"
        width={128}
        height={64}
        label="Экран OLED 128 на 64"
        stamp={stamp}
        draw={(context) => {
          const image = context.createImageData(128, 64);
          const level = 90 + Math.round((view.contrast / 255) * 165);
          for (let y = 0; y < 64; y++)
            for (let x = 0; x < 128; x++) {
              const column = view.flipX ? x : 127 - x;
              const row = view.flipY ? y : 63 - y;
              let on = ((ram[(row >> 3) * 128 + column] >> (row & 7)) & 1) === 1;
              if (view.allOn) on = true;
              else if (view.invert) on = !on;
              const at = (y * 128 + x) * 4;
              const lit = visible && on;
              image.data[at] = lit ? level * 0.62 : 4;
              image.data[at + 1] = lit ? level * 0.86 : 7;
              image.data[at + 2] = lit ? level : 12;
              image.data[at + 3] = 255;
            }
          context.putImageData(image, 0, 0);
        }}
      />
      <small>
        {!view.awake
          ? 'Выключен: нужна команда AF'
          : !view.pump
            ? 'Нет питания матрицы: команда 8D 14'
            : `Идёт запись, байт: ${view.writes}`}
      </small>
    </div>
  );
}

const CELL_W = 6;
const CELL_H = 9;
const DOT = 3;
function Lcd({ view }: { view: View }) {
  const lcd = view.lcd as unknown as Hd44780;
  const columns = view.columns as number;
  const rows = view.rows as number;
  const blink = view.blinkOn ? Math.floor(Date.now() / 500) % 2 : 0;
  const stamp = `${view.rev}${view.displayOn}${view.cursorOn}${view.blinkOn}${blink}${view.backlight}`;
  const cursor = view.cursor as { row: number; column: number } | null;
  return (
    <div className="bus-lcd">
      <Picture
        className={`bus-lcd-glass ${view.backlight ? '' : 'dark'}`}
        width={columns * CELL_W * DOT}
        height={rows * CELL_H * DOT}
        label={`Символьный экран ${columns} на ${rows}`}
        stamp={stamp}
        draw={(context) => {
          const on = '#14230a';
          const faint = view.backlight ? 'rgba(20,35,10,0.07)' : 'rgba(0,0,0,0.12)';
          context.clearRect(0, 0, columns * CELL_W * DOT, rows * CELL_H * DOT);
          for (let row = 0; row < rows; row++)
            for (let column = 0; column < columns; column++) {
              const glyph = lcd.glyph(lcd.charAt(row, column));
              const covered = cursor && cursor.row === row && cursor.column === column;
              const block = covered && blink === 1;
              for (let y = 0; y < 8; y++)
                for (let x = 0; x < 5; x++) {
                  let lit = view.displayOn ? ((glyph[y] >> (4 - x)) & 1) === 1 : false;
                  if (block) lit = !lit;
                  if (covered && view.cursorOn && y === 7) lit = true;
                  context.fillStyle = lit ? on : faint;
                  context.fillRect(
                    (column * CELL_W + x) * DOT,
                    (row * CELL_H + y) * DOT,
                    DOT - 0.5,
                    DOT - 0.5,
                  );
                }
            }
        }}
      />
      {view.tooFast ? (
        <small className="bus-warn">
          Команды идут слишком часто: настоящий экран пропустил бы {view.tooFast}. Добавьте паузы.
        </small>
      ) : !view.displayOn ? (
        <small>Экран выключен: нужна команда 0x0C</small>
      ) : null}
    </div>
  );
}

function Eeprom({ view, act }: { view: View; act: Act }) {
  const data = view.data as unknown as number[];
  return (
    <div className="bus-eeprom">
      <pre aria-label="Первые 64 байта памяти">
        {Array.from({ length: 4 }, (_, row) => (
          <span key={row}>
            <b>{hex(row * 16)}</b>{' '}
            {data.slice(row * 16, row * 16 + 16).map((byte, index) => (
              <i
                key={index}
                className={`${byte === 0xff ? 'blank' : ''} ${view.lastWrite === row * 16 + index ? 'fresh' : ''}`}
              >
                {hex(byte)}
              </i>
            ))}
            {'\n'}
          </span>
        ))}
      </pre>
      <div className="bus-row">
        <small className={view.busy ? 'bus-warn' : ''}>
          {view.busy ? 'Идёт запись: микросхема не отвечает' : 'Готова'}
        </small>
        <button type="button" className="bus-button" onClick={() => act('erase')}>
          Стереть
        </button>
      </div>
    </div>
  );
}

function Expander({ view, act }: { view: View; act: Act }) {
  const pins = view.pins as number;
  const switches = view.switches as number;
  return (
    <div className="bus-expander">
      {Array.from({ length: 8 }, (_, bit) => (
        <div key={bit} className="bus-expander-pin">
          <i className={`bus-led ${((pins >> bit) & 1) === 0 ? 'on' : ''}`} title={`P${bit}`} />
          <button
            type="button"
            role="switch"
            aria-checked={((switches >> bit) & 1) === 1}
            aria-label={`Переключатель P${bit}`}
            className={`bus-toggle ${((switches >> bit) & 1) === 1 ? 'on' : ''}`}
            onClick={() => act('toggle', bit)}
          >
            <i />
          </button>
          <span>P{bit}</span>
        </div>
      ))}
    </div>
  );
}

function Matrix({ view }: { view: View }) {
  const rows = view.rows as unknown as number[];
  const bright = 0.45 + ((view.intensity as number) / 15) * 0.55;
  const stamp = `${rows.join(',')}${view.intensity}`;
  return (
    <div className="bus-matrix">
      <Picture
        width={136}
        height={136}
        label="Матрица 8 на 8"
        stamp={stamp}
        draw={(context) => {
          context.clearRect(0, 0, 136, 136);
          for (let y = 0; y < 8; y++)
            for (let x = 0; x < 8; x++) {
              const lit = ((rows[y] >> (7 - x)) & 1) === 1;
              context.beginPath();
              context.arc(10 + x * 16, 10 + y * 16, 6.2, 0, Math.PI * 2);
              context.fillStyle = lit ? `rgba(255,70,50,${bright})` : 'rgba(255,70,50,0.12)';
              if (lit) {
                context.shadowColor = '#ff4632';
                context.shadowBlur = 8;
              } else context.shadowBlur = 0;
              context.fill();
            }
          context.shadowBlur = 0;
        }}
      />
      {view.shutdown ? <small>Спит: регистр 0x0C = 0</small> : null}
    </div>
  );
}

function MaxDigits({ view }: { view: View }) {
  const segments = view.segments as unknown as number[];
  const glow = 0.45 + ((view.intensity as number) / 15) * 0.55;
  return (
    <div className="bus-digits">
      {Array.from({ length: 8 }, (_, index) => (
        <Digit key={index} mask={segments[7 - index]} color="#ff4a3d" glow={glow} />
      ))}
      {view.shutdown ? <small>Спит: регистр 0x0C = 0</small> : null}
    </div>
  );
}

function Tm1637({ view }: { view: View }) {
  const digits = view.digits as unknown as number[];
  const count = (view.count as number) || 4;
  const glow = view.on ? 0.45 + ((view.brightness as number) / 7) * 0.55 : 0;
  return (
    <div className="bus-tm">
      <div className="bus-digits">
        {Array.from({ length: count }, (_, index) => (
          <span key={index} className="bus-tm-cell">
            <Digit mask={view.on ? digits[index] & 0x7f : 0} color="#ff4a3d" glow={glow} />
            {index === 1 && count === 4 ? (
              <i className={`bus-colon ${view.on && digits[1] & 0x80 ? 'on' : ''}`} />
            ) : null}
          </span>
        ))}
      </div>
      <small>{view.on ? `Яркость ${view.brightness} из 7` : 'Индикатор выключен'}</small>
    </div>
  );
}

function Strip({ view }: { view: View }) {
  const colors = view.colors as unknown as Uint8Array;
  const count = view.count as number;
  return (
    <div className="bus-strip" role="img" aria-label={`Лента из ${count} светодиодов`}>
      {Array.from({ length: count }, (_, index) => {
        const [r, g, b] = [colors[index * 3], colors[index * 3 + 1], colors[index * 3 + 2]];
        const lit = r + g + b > 0;
        return (
          <i
            key={index}
            title={`${index + 1}: R${r} G${g} B${b}`}
            style={{
              background: lit ? `rgb(${r}, ${g}, ${b})` : undefined,
              boxShadow: lit ? `0 0 10px 2px rgba(${r}, ${g}, ${b}, 0.7)` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function Remote({ view, act }: { view: View; act: Act }) {
  return (
    <div className="bus-remote">
      <div className="bus-remote-keys">
        {REMOTE_KEYS.map((key) => (
          <button
            key={key.id}
            type="button"
            className="bus-key"
            aria-label={`Кнопка пульта ${key.label}`}
            onClick={() => act('press', key.id)}
          >
            {key.label}
          </button>
        ))}
      </div>
      <small>
        {view.last >= 0
          ? `Последний код: 0x${hex(view.last as number)}, отправлено кадров: ${view.presses}`
          : 'Нажмите кнопку: приёмник выдаст кадр NEC'}
      </small>
    </div>
  );
}

function Keyboard({ view, act }: { view: View; act: Act }) {
  const key = (id: string) => ({
    onPointerDown: (event: PointerEvent) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      act('key', { id, on: true });
    },
    onPointerUp: () => act('key', { id, on: false }),
    onPointerCancel: () => act('key', { id, on: false }),
  });
  const sent = view.sent as unknown as number[];
  return (
    <div className="bus-ps2">
      <div className="bus-ps2-keys">
        {PS2_KEYS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`bus-key ${item.id.length > 1 && item.label.length > 1 ? 'wide' : ''}`}
            aria-label={`Клавиша ${item.label}`}
            {...key(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <small>
        {sent.length
          ? `Отправлено: ${sent.map((byte) => hex(byte)).join(' ')}`
          : 'Нажмите клавишу: уйдёт скан-код набора 2'}
      </small>
    </div>
  );
}

/** The picture and controls of a protocol part; everything shown comes from `device.view`. */
export function BusPartBody({ device, act }: { device: Device; act: Act }) {
  const view = device.view as View;
  if (!Object.keys(view).length) return null;
  switch (device.params.model) {
    case 'ssd1306':
      return <Oled view={view} />;
    case 'lcd-i2c':
    case 'lcd-parallel':
      return <Lcd view={view} />;
    case 'lm75':
      return (
        <div className="bus-card">
          <strong className="bus-big">{russian(view.temp as number)} °C</strong>
          <Slider
            label="Температура"
            value={view.temp as number}
            min={-25}
            max={100}
            step={0.5}
            shown=""
            onChange={(value) => act('temp', value)}
          />
        </div>
      );
    case 'eeprom':
      return <Eeprom view={view} act={act} />;
    case 'ds1307':
      return (
        <div className="bus-card">
          <strong className="bus-big">{view.time as string}</strong>
          <span>{view.date as string}</span>
          <small>
            {view.halted
              ? 'Часы стоят: бит CH в регистре 0 равен 1'
              : (view.warp as number) > 1
                ? `Идут в ${view.warp} раз быстрее`
                : 'Идут в реальном масштабе'}
          </small>
        </div>
      );
    case 'pcf8574':
      return <Expander view={view} act={act} />;
    case 'max7219':
      return device.shape === 'bus-digits' ? <MaxDigits view={view} /> : <Matrix view={view} />;
    case 'tm1637':
      return <Tm1637 view={view} />;
    case 'ws2812':
      return <Strip view={view} />;
    case 'mcp3008':
      return (
        <div className="bus-card">
          <Slider
            label="Потенциометр, канал 0"
            value={view.value as number}
            min={0}
            max={1023}
            shown={`${view.value} (${russian(((view.value as number) / 1023) * 3.3, 2)} В)`}
            onChange={(value) => act('value', value)}
          />
        </div>
      );
    case 'hcsr04':
      return (
        <div className="bus-card">
          <Slider
            label="Расстояние"
            value={view.distance as number}
            min={2}
            max={400}
            unit="см"
            onChange={(value) => act('distance', value)}
          />
          <small className={view.echoing ? 'bus-hot' : ''}>
            {view.echoing ? 'ECHO: идёт импульс' : `Измерений: ${view.measurements}`}
          </small>
        </div>
      );
    case 'dht11':
      return (
        <div className="bus-card">
          <Slider
            label="Температура"
            value={view.temp as number}
            min={0}
            max={50}
            unit="°C"
            onChange={(value) => act('temp', value)}
          />
          <Slider
            label="Влажность"
            value={view.humidity as number}
            min={20}
            max={90}
            unit="%"
            onChange={(value) => act('humidity', value)}
          />
          <small>Ответов датчика: {view.responses}</small>
        </div>
      );
    case 'ir':
      return <Remote view={view} act={act} />;
    case 'ps2':
      return <Keyboard view={view} act={act} />;
    default:
      return null;
  }
}
