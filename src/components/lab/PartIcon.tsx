import type { ReactNode } from 'react';
import type { PartDef } from '../../lib/lab/catalog';

/* Small pictures of parts for the library cards. They are drawn, not photographed: a
   picture has to stay readable at 48 by 36 pixels in both themes. */
const METAL = '#c9ccd1';
const DARK = '#0d0e0f';
const CHIP = '#3a4046';
const GOLD = '#e8b93a';
const RED = '#ff4a3d';
const GREEN = '#34d058';
const AMBER = '#ffb02e';
const BLUE = '#3d8bff';
const SCREEN = '#7ee0a8';

const legs = (xs: number[], y = 28, height = 7) =>
  xs.map((x) => <rect key={x} x={x - 0.8} y={y} width="1.6" height={height} fill={METAL} />);
const dome = (x: number, color: string, glow = true) => (
  <g key={`${x}${color}`}>
    {glow && <circle cx={x} cy="15" r="9" fill={color} opacity="0.25" />}
    <path d={`M${x - 6} 26V14a6 6 0 0 1 12 0v12z`} fill={color} />
  </g>
);
const digit = (x: number, color = RED, lit = '1111011') => {
  const bars: [number, number, number, number][] = [
    [x + 2, 7, 7, 2],
    [x + 9, 9, 2, 7],
    [x + 9, 18, 2, 7],
    [x + 2, 25, 7, 2],
    [x, 18, 2, 7],
    [x, 9, 2, 7],
    [x + 2, 16, 7, 2],
  ];
  return bars.map(([bx, by, w, h], index) => (
    <rect
      key={`${x}-${index}`}
      x={bx}
      y={by}
      width={w}
      height={h}
      rx="1"
      fill={color}
      opacity={lit[index] === '1' ? 1 : 0.16}
    />
  ));
};
const screen = (x: number, y: number, w: number, h: number, fill = DARK) => (
  <rect x={x} y={y} width={w} height={h} rx="2" fill={fill} />
);
const text = (value: string, x = 24, y = 22, size = 9, fill = SCREEN) => (
  <text
    x={x}
    y={y}
    textAnchor="middle"
    fontFamily="var(--font-mono)"
    fontSize={size}
    fontWeight="700"
    fill={fill}
  >
    {value}
  </text>
);
const chip = (label: string) => (
  <>
    <rect x="9" y="10" width="30" height="16" rx="2" fill={CHIP} />
    {legs([13, 19, 25, 31, 35], 26, 5)}
    {legs([13, 19, 25, 31, 35], 5, 5)}
    {text(label, 24, 21, 7, METAL)}
  </>
);
const dots = (cols: number, rows: number, color: string, on: (c: number, r: number) => boolean) =>
  Array.from({ length: cols * rows }, (_, index) => {
    const c = index % cols;
    const r = Math.floor(index / cols);
    return (
      <circle
        key={index}
        cx={24 - (cols - 1) * 2 + c * 4}
        cy={18 - (rows - 1) * 2 + r * 4}
        r="1.4"
        fill={color}
        opacity={on(c, r) ? 1 : 0.18}
      />
    );
  });

const ICONS: Record<string, (def: PartDef) => ReactNode> = {
  led: () => (
    <>
      {dome(24, RED)}
      {legs([21, 27])}
    </>
  ),
  rgb: () => (
    <>
      <circle cx="24" cy="15" r="10" fill="#fff" opacity="0.16" />
      <path d="M18 26V14a6 6 0 0 1 12 0v12z" fill="url(#lab-icon-rgb)" />
      {legs([19, 22.5, 25.5, 29])}
    </>
  ),
  bicolor: () => (
    <>
      <path d="M18 26V14a6 6 0 0 1 6-6v18z" fill={RED} />
      <path d="M30 26V14a6 6 0 0 0-6-6v18z" fill={GREEN} />
      {legs([21, 27])}
    </>
  ),
  bar: () => (
    <>
      {[8, 14, 20, 26, 32, 38].map((x, index) => (
        <rect
          key={x}
          x={x}
          y="9"
          width="4"
          height="16"
          rx="1"
          fill={GREEN}
          opacity={index < 4 ? 1 : 0.2}
        />
      ))}
    </>
  ),
  ring: () => (
    <>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        return (
          <circle
            key={index}
            cx={24 + Math.sin(angle) * 11}
            cy={18 - Math.cos(angle) * 11}
            r="2"
            fill={[RED, AMBER, GREEN, BLUE][index % 4]}
          />
        );
      })}
    </>
  ),
  traffic: () => (
    <>
      <rect x="17" y="3" width="14" height="30" rx="5" fill={DARK} />
      <circle cx="24" cy="9" r="3.4" fill={RED} />
      <circle cx="24" cy="18" r="3.4" fill={AMBER} opacity="0.3" />
      <circle cx="24" cy="27" r="3.4" fill={GREEN} opacity="0.3" />
    </>
  ),
  laser: () => (
    <>
      <rect x="6" y="13" width="14" height="10" rx="2" fill="#b98a2b" />
      <rect x="20" y="17" width="24" height="2" fill={RED} />
      <circle cx="42" cy="18" r="3" fill={RED} opacity="0.4" />
    </>
  ),
  seg: (def) =>
    def.kind === 'scan' ? (
      <>
        {screen(4, 4, 40, 28)}
        {digit(8, RED, '0110000')}
        {digit(22, RED, '1101101')}
        {digit(35, RED, '1111001')}
      </>
    ) : (
      <>
        {screen(14, 3, 20, 30)}
        {digit(19)}
      </>
    ),
  matrix: () => (
    <>
      {screen(6, 2, 36, 32)}
      {dots(
        7,
        7,
        RED,
        (c, r) =>
          (r === 1 && (c === 2 || c === 4)) ||
          (r === 4 && c > 0 && c < 6) ||
          (r === 3 && (c === 1 || c === 5)),
      )}
    </>
  ),
  hex: () => (
    <>
      {screen(14, 3, 20, 30)}
      {text('F', 24, 26, 20, AMBER)}
    </>
  ),
  bcd7: () => (
    <>
      {screen(14, 3, 20, 30)}
      {digit(19, GREEN, '1011011')}
    </>
  ),
  byte: () => (
    <>
      {screen(5, 7, 38, 22)}
      {text('255', 24, 23, 13, AMBER)}
    </>
  ),
  counter: () => (
    <>
      {screen(5, 7, 38, 22)}
      {text('0042', 24, 22, 11, AMBER)}
    </>
  ),
  button: () => (
    <>
      <rect x="12" y="8" width="24" height="22" rx="3" fill={DARK} />
      <circle cx="24" cy="19" r="8" fill="#e5484d" />
      <circle cx="22" cy="17" r="3" fill="#fff" opacity="0.25" />
    </>
  ),
  slide: () => (
    <>
      <rect x="8" y="12" width="32" height="12" rx="3" fill={DARK} />
      <rect x="24" y="9" width="12" height="18" rx="2" fill={METAL} />
    </>
  ),
  toggle: () => (
    <>
      <circle cx="24" cy="24" r="8" fill={CHIP} />
      <path d="M24 24 32 6" stroke={METAL} strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  rocker: () => (
    <>
      <rect x="12" y="6" width="24" height="24" rx="3" fill={DARK} />
      <path d="M15 9h18v10l-18 8z" fill="#b3362b" />
      <path d="M21 13v5" stroke="#fff" strokeWidth="1.6" />
    </>
  ),
  dip: () => (
    <>
      <rect x="7" y="8" width="34" height="20" rx="2" fill="#b3362b" />
      {[11, 19, 27, 35].map((x, index) => (
        <g key={x}>
          <rect x={x - 2} y="11" width="5" height="14" fill={DARK} />
          <rect x={x - 2} y={index % 2 ? 19 : 11} width="5" height="6" fill="#f1f3f0" />
        </g>
      ))}
    </>
  ),
  keypad: () => (
    <>
      {screen(9, 2, 30, 32)}
      {Array.from({ length: 16 }, (_, index) => (
        <rect
          key={index}
          x={12 + (index % 4) * 6.5}
          y={5 + Math.floor(index / 4) * 6.8}
          width="4.6"
          height="4.6"
          rx="1"
          fill={index % 4 === 3 ? '#e5484d' : METAL}
        />
      ))}
    </>
  ),
  encoder: () => (
    <>
      <circle cx="24" cy="18" r="12" fill={CHIP} />
      <circle cx="24" cy="18" r="8" fill="#7d848b" />
      <rect x="23" y="7" width="2" height="7" rx="1" fill={GOLD} />
      <path d="M8 18a16 16 0 0 1 5-11" fill="none" stroke={GOLD} strokeWidth="1.6" />
    </>
  ),
  joystick: () => (
    <>
      <rect x="10" y="4" width="28" height="28" rx="4" fill={DARK} />
      <path d="M24 7l3 5h-6zM24 29l3-5h-6zM13 18l5-3v6zM35 18l-5-3v6z" fill={METAL} />
      <circle cx="24" cy="18" r="3.4" fill="#e5484d" />
    </>
  ),
  thumbwheel: () => (
    <>
      <rect x="12" y="4" width="24" height="28" rx="3" fill={CHIP} />
      {screen(16, 10, 16, 16)}
      {text('7', 24, 23, 13, '#f1f3f0')}
      <path d="M24 5l3 3h-6zM24 31l3-3h-6z" fill={GOLD} />
    </>
  ),
  const: () => (
    <>
      <rect x="12" y="8" width="24" height="20" rx="3" fill={CHIP} />
      {text('1/0', 24, 22, 10, '#f1f3f0')}
    </>
  ),
  sensor: (def) => (
    <>
      <rect x="6" y="6" width="36" height="24" rx="3" fill="#1f4f8a" />
      <circle cx="10" cy="10" r="1.6" fill={GOLD} />
      <text x="26" y="24" textAnchor="middle" fontSize="15">
        {(def.params?.icon as string | undefined) ?? '◉'}
      </text>
    </>
  ),
  buzzer: () => (
    <>
      <circle cx="20" cy="18" r="11" fill={DARK} />
      <circle cx="20" cy="18" r="2.4" fill={CHIP} />
      <path
        d="M35 11a10 10 0 0 1 0 14M39 7a16 16 0 0 1 0 22"
        fill="none"
        stroke={GOLD}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
  relay: () => (
    <>
      <rect x="8" y="8" width="32" height="22" rx="2" fill="#2f6fd0" />
      <path
        d="M14 24h7l9-6M30 24h4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
  motor: () => (
    <>
      <rect x="8" y="9" width="24" height="18" rx="4" fill={METAL} />
      <rect x="32" y="16" width="10" height="4" fill="#7d848b" />
      <rect x="5" y="14" width="3" height="8" fill={GOLD} />
    </>
  ),
  fan: () => (
    <>
      <rect x="8" y="2" width="32" height="32" rx="4" fill={DARK} />
      <path
        d="M24 18c-6-8 0-12 3-10s1 6-3 10c8-6 12 0 10 3s-6 1-10-3c6 8 0 12-3 10s-1-6 3-10c-8 6-12 0-10-3s6-1 10 3z"
        fill={METAL}
      />
      <circle cx="24" cy="18" r="2.6" fill={CHIP} />
    </>
  ),
  vibro: () => (
    <>
      <rect x="12" y="12" width="22" height="12" rx="6" fill={METAL} />
      <path
        d="M6 12q3 6 0 12M40 12q-3 6 0 12"
        fill="none"
        stroke={GOLD}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
  servo: () => (
    <>
      <rect x="10" y="14" width="28" height="18" rx="2" fill="#1f4f8a" />
      <circle cx="18" cy="14" r="5" fill="#f1f3f0" />
      <path d="M18 14 36 5" stroke="#f1f3f0" strokeWidth="3.4" strokeLinecap="round" />
    </>
  ),
  stepper: () => (
    <>
      <rect x="9" y="5" width="26" height="26" rx="3" fill={CHIP} />
      <circle cx="22" cy="18" r="8" fill={METAL} />
      <rect x="35" y="16" width="8" height="4" fill="#7d848b" />
      <path d="M22 18v-8" stroke={GOLD} strokeWidth="2" />
    </>
  ),
  sr595: () => chip('595'),
  sr165: () => chip('165'),
  probe: () => (
    <>
      <path d="M6 30 30 10l6 6-24 16z" fill={CHIP} />
      <path d="M33 13l9-9" stroke={METAL} strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="25" r="2.6" fill={GOLD} />
    </>
  ),
  freq: () => (
    <>
      {screen(4, 8, 40, 20)}
      {text('1.0k', 22, 22, 10)}
      {text('Hz', 38, 22, 6, METAL)}
    </>
  ),
  volt: () => (
    <>
      {screen(4, 8, 40, 20)}
      {text('3.30', 22, 22, 10)}
      {text('V', 39, 22, 7, METAL)}
    </>
  ),
  analyzer: () => (
    <>
      {screen(4, 5, 40, 26)}
      <path
        d="M7 13h6V9h8v4h6V9h6v4h5M7 25h10v-4h6v4h10v-4h5"
        fill="none"
        stroke={SCREEN}
        strokeWidth="1.5"
      />
    </>
  ),
  pulse: () => (
    <>
      <rect x="6" y="7" width="36" height="22" rx="3" fill={CHIP} />
      <path d="M10 23h5V13h7v10h6V13h7v10h3" fill="none" stroke={GOLD} strokeWidth="2" />
    </>
  ),
  uart: () => (
    <>
      {screen(4, 5, 40, 26)}
      {text('>_ok', 22, 21, 9)}
    </>
  ),
  'bus-oled': () => (
    <>
      <rect x="6" y="3" width="36" height="30" rx="2" fill="#1f4f8a" />
      {screen(9, 8, 30, 18)}
      {text('OLED', 24, 20, 8, '#bfe6ff')}
    </>
  ),
  'bus-lcd': () => (
    <>
      <rect x="3" y="6" width="42" height="24" rx="2" fill="#1c6b3a" />
      <rect x="6" y="10" width="36" height="16" rx="1" fill="#b6d94c" />
      {text('Hello', 24, 21, 8, '#1d2b10')}
    </>
  ),
  'bus-lm75': () => (
    <>
      <rect x="20" y="4" width="8" height="20" rx="4" fill="#f1f3f0" />
      <circle cx="24" cy="27" r="6" fill={RED} />
      <rect x="22.5" y="12" width="3" height="14" fill={RED} />
    </>
  ),
  'bus-eeprom': () => chip('24C02'),
  'bus-rtc': () => (
    <>
      <circle cx="24" cy="18" r="13" fill={CHIP} />
      <circle cx="24" cy="18" r="10" fill="#f1f3f0" />
      <path d="M24 18V11M24 18l6 3" stroke={DARK} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  'bus-pcf8574': () => chip('8574'),
  'bus-matrix': () => (
    <>
      {screen(6, 2, 36, 32)}
      {dots(8, 7, RED, (c, r) => (c + r) % 3 === 0)}
    </>
  ),
  'bus-tm1637': () => (
    <>
      {screen(2, 5, 44, 26)}
      {digit(5, RED, '0110000')}
      {digit(16, RED, '1101101')}
      {digit(27, RED, '1111001')}
      {digit(37, RED, '0110011')}
    </>
  ),
  'bus-strip': () => (
    <>
      <rect x="2" y="12" width="44" height="12" rx="2" fill={DARK} />
      {[RED, AMBER, GREEN, BLUE, '#b46cff'].map((color, index) => (
        <rect key={color} x={5 + index * 8.4} y="14.5" width="6" height="7" rx="1" fill={color} />
      ))}
    </>
  ),
  'bus-adc': () => (
    <>
      <circle cx="24" cy="18" r="12" fill={CHIP} />
      <circle cx="24" cy="18" r="7" fill={METAL} />
      <path d="M24 18 29 10" stroke={DARK} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  'bus-hcsr04': () => (
    <>
      <rect x="3" y="7" width="42" height="22" rx="2" fill="#1f4f8a" />
      <circle cx="14" cy="18" r="8" fill={METAL} />
      <circle cx="34" cy="18" r="8" fill={METAL} />
      <circle cx="14" cy="18" r="4" fill={CHIP} />
      <circle cx="34" cy="18" r="4" fill={CHIP} />
    </>
  ),
  'bus-dht11': () => (
    <>
      <rect x="12" y="3" width="24" height="26" rx="2" fill="#3d8bff" />
      {Array.from({ length: 9 }, (_, index) => (
        <rect
          key={index}
          x={16 + (index % 3) * 6}
          y={7 + Math.floor(index / 3) * 6}
          width="4"
          height="4"
          fill="#12305c"
        />
      ))}
      {legs([17, 24, 31], 29, 5)}
    </>
  ),
  'bus-ir': () => (
    <>
      <rect x="14" y="3" width="20" height="30" rx="4" fill={DARK} />
      <circle cx="24" cy="9" r="3" fill={RED} />
      {Array.from({ length: 6 }, (_, index) => (
        <circle
          key={index}
          cx={20 + (index % 2) * 8}
          cy={17 + Math.floor(index / 2) * 5}
          r="1.8"
          fill={METAL}
        />
      ))}
    </>
  ),
  'bus-ps2': () => (
    <>
      <rect x="3" y="9" width="42" height="18" rx="2" fill={CHIP} />
      {Array.from({ length: 18 }, (_, index) => (
        <rect
          key={index}
          x={6 + (index % 9) * 4.1}
          y={12 + Math.floor(index / 9) * 5}
          width="3"
          height="3.4"
          rx="0.6"
          fill="#f1f3f0"
        />
      ))}
      <rect x="14" y="22" width="20" height="3" rx="0.6" fill="#f1f3f0" />
    </>
  ),
};

/** The picture on a library card. Unknown shapes get a plain module. */
export function PartIcon({ def }: { def: PartDef }) {
  const draw = ICONS[def.shape];
  return (
    <svg className="lab-icon" viewBox="0 0 48 36" aria-hidden="true">
      <defs>
        <linearGradient id="lab-icon-rgb" x1="0" x2="1">
          <stop offset="0" stopColor={RED} />
          <stop offset="0.5" stopColor={GREEN} />
          <stop offset="1" stopColor={BLUE} />
        </linearGradient>
      </defs>
      {draw ? draw(def) : chip('IC')}
    </svg>
  );
}
