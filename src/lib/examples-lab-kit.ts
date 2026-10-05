import type { Example } from './examples';
import { glyphColumns } from './lab/bus/font';
import { I2C_MASTER_V } from './lab/bus/verilog';
import { I2C_PLAYER_V } from './lab/bus/verilog-player';

/**
 * Examples for the laboratory's protocol parts: screens, memories, sensors and remote controls.
 * Each one runs on the bench with its parts already placed and wired (see lab/presets.ts), and
 * the lab tests run every one of them against the part models.
 */
export type Pull = 'UP' | 'NONE';
export type LabPin = [signal: string, pin: number, explanation: string, pull?: Pull];
export interface LabFile {
  name: string;
  content: string;
}

export const hex = (value: number, digits = 2) =>
  value.toString(16).toUpperCase().padStart(digits, '0');

function constraints(pins: LabPin[]): string {
  return (
    `// Tang Nano 20K (GW2AR-LV18QN88C8/I7). IO_LOC — номер вывода корпуса FPGA, не позиция на разъёме.
// Выводы 75, 80, 42, 41, 56, 54 … выведены на разъём J5 платы: к ним подключаются детали.
// Кнопки 87/88 и светодиоды 15–20 уже стоят на плате. LVCMOS33 — логические уровни 3,3 В.
// PULL_MODE=UP подтягивает линию к питанию: шины с открытым коллектором (SDA, DIO, DHT, PS/2)
// без подтяжки не получают единицу. На готовых модулях резисторы уже есть, а здесь это страховка.
\n` +
    pins
      .map(
        ([signal, pin, explanation, pull = 'NONE']) => `// ${signal}: ${explanation}
IO_LOC "${signal}" ${pin};
IO_PORT "${signal}" IO_TYPE=LVCMOS33 PULL_MODE=${pin === 87 || pin === 88 ? 'DOWN' : pull};
${signal === 'clk' ? 'CLOCK_LOC "clk" BUFG;\n' : ''}`,
      )
      .join('\n')
  );
}

export const CLK: LabPin = ['clk', 4, 'Генератор платы 27 МГц.'];
export const LEDS = (explanation = 'LED0…LED5: уровень 0 зажигает светодиод.'): LabPin[] =>
  Array.from({ length: 6 }, (_, bit) => [`led_n[${bit}]`, 15 + bit, explanation] as LabPin);
export const SDA: LabPin = [
  'sda',
  75,
  'Линия данных I²C (J5): тянется к нулю микросхемой и FPGA.',
  'UP',
];
export const SCL: LabPin = ['scl', 80, 'Линия тактов I²C (J5): её ведёт FPGA.'];

export function labExample(
  id: string,
  title: string,
  description: string,
  files: LabFile[],
  pins: LabPin[],
): Example {
  return {
    id,
    title,
    description,
    category: 'systems',
    project: {
      name: `${id}-lab`,
      top: 'top',
      board: 'tangnano20k',
      files: [...files, { name: 'board.cst', content: constraints(pins) }],
    },
  };
}
export const i2cFiles = (...more: LabFile[]): LabFile[] => [
  { name: 'i2c_master.v', content: I2C_MASTER_V },
  { name: 'i2c_player.v', content: I2C_PLAYER_V },
  ...more,
];

/** A table of the program for `i2c_player`: one line per step with its meaning. */
export function program(steps: [text: string, comment?: string][]): string {
  const code: Record<string, number> = {
    END: 0,
    START: 1,
    STOP: 2,
    WRITE: 3,
    WRITEV: 4,
    READ: 5,
    READL: 6,
    WAIT: 7,
    LOOPIF: 8,
    JUMP: 9,
  };
  const lines = steps.map(([text, comment], index) => {
    const [name, argument] = text.split(' ');
    // Байты для WRITE записаны в шестнадцатеричном виде, остальные числа — в десятичном.
    const value =
      argument === undefined ? 0 : name === 'WRITE' ? parseInt(argument, 16) : Number(argument);
    const shownText = name === 'WRITE' ? `WRITE 0x${argument}` : text;
    const word = `{4'd${code[name]}, 8'h${hex(value)}}`;
    return `      ${String(index).padEnd(3)}: op = ${word};  // ${shownText}${comment ? ` — ${comment}` : ''}`;
  });
  return `  // Программа обмена: по одной команде на шаг (коды команд смотрите в i2c_player.v).
  reg [11:0] op;
  always @* begin
    case (step)
${lines.join('\n')}
      default: op = {4'd0, 8'h00};  // END
    endcase
  end`;
}

/** A Verilog function that returns the columns of a text in the 5x7 font, six per character. */
export function textFunction(name: string, text: string): string {
  const rows: string[] = [];
  [...text].forEach((char, index) => {
    [...glyphColumns(char.charCodeAt(0)), 0].forEach((column, offset) =>
      rows.push(
        `      7'd${index * 6 + offset}: ${name} = 8'h${hex(column)};${offset === 0 ? `  // символ «${char}»` : ''}`,
      ),
    );
  });
  return `  // Столбцы надписи «${text}»: пять столбцов буквы и один пустой. Бит 0 — верхний пиксель.
  function [7:0] ${name}(input [6:0] i);
    case (i)
${rows.join('\n')}
      default: ${name} = 8'h00;
    endcase
  endfunction`;
}

/** Items for the character LCD drivers: {short, rs, byte}. */
export function lcdProgram(lines: string[]): string[] {
  const item = (short: number, rs: number, byte: number, note: string) =>
    `10'h${hex((short << 9) | (rs << 8) | byte, 3)}; // ${note}`;
  const list: string[] = [
    item(1, 0, 0x30, 'старший полубайт 3: «режим 8 бит»'),
    item(1, 0, 0x30, 'повтор'),
    item(1, 0, 0x30, 'ещё раз'),
    item(1, 0, 0x20, 'полубайт 2: переходим на 4 бита'),
    item(0, 0, 0x28, 'функция: 4 бита, две строки, шрифт 5x8'),
    item(0, 0, 0x0c, 'экран включён, курсора нет'),
    item(0, 0, 0x01, 'очистить экран (долгая команда)'),
    item(0, 0, 0x06, 'после символа курсор идёт вправо'),
  ];
  lines.forEach((line, row) => {
    list.push(item(0, 0, 0x80 | (row ? 0x40 : 0), `курсор в начало строки ${row + 1}`));
    for (const char of line) list.push(item(0, 1, char.charCodeAt(0), `символ «${char}»`));
  });
  return list;
}
export const lcdRom = (items: string[]) =>
  items.map((text, index) => `      ${String(index).padEnd(3)}: item = ${text}`).join('\n');
