import type { ExampleLesson } from './example-curriculum';
import type { Example } from './examples';
import { CLK, LEDS, labExample, type LabPin } from './examples-lab-kit';
import { UART_TX_V } from './lab/bus/verilog-cores';

/**
 * Two examples for every plain part of the laboratory. An example is a recipe: the part, the
 * wires between its pins and the design, and the body of the top module. The module header,
 * the .cst, the lesson and the ready bench are all made from the recipe, so they cannot
 * drift apart.
 */
type Lesson = Omit<ExampleLesson, 'order'>;
type Use = 'clk' | 's1' | 's2' | 'leds';
/** One wire: a pin of the part and the signal of the design; `dir` is the design's side. */
type Link = [pin: string, signal: string, dir: 'out' | 'in', note: string];
interface Fixture {
  def: string;
  opts?: Record<string, unknown>;
  links: Link[];
}
interface Recipe extends Fixture {
  id: string;
  title: string;
  /** What the example shows, for the library card. */
  about: string;
  /** Comment lines at the top of the source. */
  intro: string[];
  use: Use[];
  body: string;
  /** Extra source files next to top.v. */
  files?: { name: string; content: string }[];
  /** More parts on the bench besides the main one. */
  extra?: Fixture[];
  topic: Lesson['topic'];
  objective: string;
  observe: string;
  experiment: string;
}
export interface BenchPart {
  def: string;
  x: number;
  opts?: Record<string, unknown>;
  pins: Record<string, number>;
}

/** Header contacts handed out to parts in order: the top row of the board, left to right. */
const CONTACTS = [75, 80, 42, 41, 56, 54, 51, 48, 55, 49, 86, 79, 72, 71, 53, 52];
const S1: LabPin = ['s1', 88, 'Кнопка S1 платы: нажата = 1.'];
const S2: LabPin = ['s2', 87, 'Кнопка S2 платы: нажата = 1.'];

/** Ports of the top module: board signals first, then the wires to the parts as vectors. */
function ports(use: Use[], links: Link[]): string {
  const lines: string[] = [];
  if (use.includes('clk')) lines.push('    input  wire clk');
  if (use.includes('s1')) lines.push('    input  wire s1');
  if (use.includes('s2')) lines.push('    input  wire s2');
  const width = new Map<string, { dir: Link[2]; top: number }>();
  for (const [, signal, dir] of links) {
    const match = /^(\w+)(?:\[(\d+)\])?$/.exec(signal)!;
    const top = match[2] === undefined ? -1 : Number(match[2]);
    width.set(match[1], { dir, top: Math.max(top, width.get(match[1])?.top ?? -1) });
  }
  for (const [name, { dir, top }] of width)
    lines.push(
      `    ${dir === 'out' ? 'output' : 'input '} wire ${top >= 0 ? `[${top}:0] ` : ''}${name}`,
    );
  if (use.includes('leds')) lines.push('    output wire [5:0] led_n');
  return lines.join(',\n');
}

const div = (
  bits: number,
) => `  // Такт платы 27 МГц слишком быстр для глаз: tick приходит раз в 2^${bits} тактов.
  // В лаборатории время идёт медленнее настоящего. Для спокойного шага на настоящей
  // плате увеличьте DIV на 2–3.
  localparam DIV = ${bits};
  reg [DIV-1:0] div = 0;
  always @(posedge clk) div <= div + 1'b1;
  wire tick = (div == 0);`;
const press = (
  name: string,
  source = name,
) => `  // ${source} приходит не в такт: два триггера привязывают сигнал к clk, третий помнит
  // прошлое значение. ${name}_press равен 1 ровно один такт в момент нажатия.
  reg [2:0] ${name}_sync = 0;
  always @(posedge clk) ${name}_sync <= {${name}_sync[1:0], ${source}};
  wire ${name}_press = ${name}_sync[1] & ~${name}_sync[2];`;
const SEG7 = `  // Дешифратор: какие сегменты a…g горят для цифры (бит 0 — сегмент a).
  function [6:0] seg7(input [3:0] digit);
    case (digit)
      4'h0: seg7 = 7'b0111111;  4'h1: seg7 = 7'b0000110;
      4'h2: seg7 = 7'b1011011;  4'h3: seg7 = 7'b1001111;
      4'h4: seg7 = 7'b1100110;  4'h5: seg7 = 7'b1101101;
      4'h6: seg7 = 7'b1111101;  4'h7: seg7 = 7'b0000111;
      4'h8: seg7 = 7'b1111111;  4'h9: seg7 = 7'b1101111;
      4'hA: seg7 = 7'b1110111;  4'hB: seg7 = 7'b1111100;
      4'hC: seg7 = 7'b0111001;  4'hD: seg7 = 7'b1011110;
      4'hE: seg7 = 7'b1111001;  default: seg7 = 7'b1110001;
    endcase
  endfunction`;
const LEDS_OFF = `  assign led_n = 6'b111111;  // светодиоды платы не нужны: 1 гасит их`;
/** Shows the low six bits of a value on the board LEDs (0 lights a LED). */
const showOnLeds = (value: string) =>
  `  assign led_n = ~${value};  // светодиод платы горит при 0, поэтому инверсия`;

const bus = (pins: string[], signal: string, dir: Link[2], note: string): Link[] =>
  pins.map((pin, index) => [pin, `${signal}[${index}]`, dir, `${note}, бит ${index}`] as Link);
const SEGMENT_LINKS = bus(
  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'],
  'seg',
  'out',
  'Сегмент индикатора',
);

const recipes: Recipe[] = [
  // ---------- Светодиоды ----------
  {
    id: 'lab-led-blink',
    def: 'led',
    title: 'Светодиод: мигание',
    about: 'Внешний светодиод мигает от делителя частоты.',
    intro: [
      'Первый внешний светодиод. Счётчик делит такт 27 МГц, и раз в tick состояние',
      'светодиода переворачивается. На выводе 1 — светодиод горит.',
    ],
    use: ['clk', 'leds'],
    links: [['A', 'lamp', 'out', 'Анод светодиода: 1 зажигает']],
    body: `${div(21)}
  reg state = 0;
  always @(posedge clk) if (tick) state <= ~state;
  assign lamp = state;
  assign led_n = {5'b11111, ~state};  // LED0 платы мигает в такт (он горит при 0)`,
    topic: 'clocks',
    objective: 'Заставить внешний светодиод мигать, поделив такт платы счётчиком.',
    observe:
      'Светодиод на столе и LED0 платы мигают вместе: у внешнего 1 — горит, у LED0 наоборот.',
    experiment:
      'Поменяйте DIV на 19 и на 23. В свойствах светодиода включите «горит при 0» и объясните результат.',
  },
  {
    id: 'lab-led-breathe',
    def: 'led',
    opts: { color: '#3d8bff' },
    title: 'Светодиод: плавное дыхание (ШИМ)',
    about: 'Яркость светодиода плавно растёт и падает за счёт ШИМ.',
    intro: [
      'Яркость задаёт ШИМ: светодиод включён, пока быстрый счётчик меньше уровня level.',
      'Уровень медленно ходит вверх и вниз — получается «дыхание».',
    ],
    use: ['clk', 'leds'],
    links: [['A', 'lamp', 'out', 'Анод светодиода: ШИМ-сигнал']],
    body: `  reg [13:0] slow = 0;            // младшие 8 бит — пила ШИМ, весь счётчик — шаг яркости
  always @(posedge clk) slow <= slow + 1'b1;
  reg [7:0] level = 0;
  reg rising = 1;
  always @(posedge clk)
    if (slow == 0) begin
      if (rising) begin level <= level + 1'b1; if (level == 8'd254) rising <= 0; end
      else        begin level <= level - 1'b1; if (level == 8'd1)   rising <= 1; end
    end
  assign lamp = slow[7:0] < level;
${LEDS_OFF}`,
    topic: 'dsp',
    objective: 'Плавно менять яркость светодиода широтно-импульсной модуляцией.',
    observe:
      'Светодиод разгорается и гаснет без ступенек: меняется доля времени, когда на выводе 1.',
    experiment:
      'Поставьте вольтметр на тот же контакт и следите за средним напряжением. Сделайте level постоянным.',
  },
  {
    id: 'lab-rgb-colors',
    def: 'rgb',
    title: 'RGB-светодиод: восемь цветов',
    about: 'Трёхбитный счётчик перебирает все сочетания красного, зелёного и синего.',
    intro: [
      'Три кристалла в одном корпусе. Трёхбитный счётчик включает их во всех восьми',
      'сочетаниях: чёрный, красный, зелёный, жёлтый, синий, пурпурный, голубой, белый.',
    ],
    use: ['clk', 'leds'],
    links: [
      ['R', 'rgb[0]', 'out', 'Красный кристалл'],
      ['G', 'rgb[1]', 'out', 'Зелёный кристалл'],
      ['B', 'rgb[2]', 'out', 'Синий кристалл'],
    ],
    body: `${div(22)}
  reg [2:0] color = 0;
  always @(posedge clk) if (tick) color <= color + 1'b1;
  assign rgb = color;
  assign led_n = ~{3'b000, color};  // номер цвета на светодиодах платы`,
    topic: 'coding',
    objective: 'Получить восемь цветов из трёх однобитных каналов RGB.',
    observe: 'Цвет меняется по порядку двоичного счёта; LED0–LED2 платы показывают его номер.',
    experiment:
      'Поменяйте порядок цветов кодом Грея. В свойствах выберите «общий анод» и исправьте схему.',
  },
  {
    id: 'lab-rgb-fade',
    def: 'rgb',
    title: 'RGB-светодиод: плавная радуга',
    about: 'Три ШИМ-канала со сдвигом дают плавный переход цветов.',
    intro: [
      'Каждый цвет управляется своим ШИМ. Круг цветов разбит на три части: в каждой один',
      'канал убывает, соседний растёт, третий выключен.',
    ],
    use: ['clk', 'leds'],
    links: [
      ['R', 'rgb[0]', 'out', 'Красный кристалл, ШИМ'],
      ['G', 'rgb[1]', 'out', 'Зелёный кристалл, ШИМ'],
      ['B', 'rgb[2]', 'out', 'Синий кристалл, ШИМ'],
    ],
    body: `  reg [13:0] slow = 0;
  always @(posedge clk) slow <= slow + 1'b1;
  reg [9:0] phase = 0;            // 0…767: три участка по 256 шагов
  always @(posedge clk) if (slow == 0) phase <= (phase == 10'd767) ? 10'd0 : phase + 1'b1;
  wire [7:0] up = phase[7:0];
  wire [7:0] down = ~phase[7:0];
  reg [7:0] r, g, b;
  always @* begin
    case (phase[9:8])
      2'd0:    begin r = down;  g = up;    b = 8'd0; end
      2'd1:    begin r = 8'd0;  g = down;  b = up;   end
      default: begin r = up;    g = 8'd0;  b = down; end
    endcase
  end
  assign rgb = {slow[7:0] < b, slow[7:0] < g, slow[7:0] < r};
${LEDS_OFF}`,
    topic: 'dsp',
    objective: 'Смешать цвета тремя ШИМ-каналами с разной скважностью.',
    observe: 'Красный перетекает в зелёный, тот в синий и обратно в красный без резких скачков.',
    experiment: 'Замедлите переход, расширив slow. Остановите phase кнопкой и подберите свой цвет.',
  },
  {
    id: 'lab-bicolor-swap',
    def: 'bicolor',
    title: 'Двухцветный светодиод: красный и зелёный по очереди',
    about: 'Полярность на двух выводах задаёт цвет.',
    intro: [
      'В корпусе два кристалла навстречу друг другу. P = 1, N = 0 — красный; наоборот — зелёный.',
      'Одинаковые уровни на обоих выводах гасят светодиод.',
    ],
    use: ['clk', 'leds'],
    links: [
      ['P', 'lead_p', 'out', 'Вывод P: 1 при красном'],
      ['N', 'lead_n', 'out', 'Вывод N: 1 при зелёном'],
    ],
    body: `${div(22)}
  reg state = 0;
  always @(posedge clk) if (tick) state <= ~state;
  assign lead_p = state;
  assign lead_n = ~state;
${LEDS_OFF}`,
    topic: 'routing',
    objective: 'Менять цвет двухвыводного светодиода, переворачивая полярность.',
    observe:
      'Цвет меняется, когда уровни на P и N меняются местами; ток идёт то в одну, то в другую сторону.',
    experiment: 'Подайте на оба вывода один и тот же сигнал и убедитесь, что светодиод гаснет.',
  },
  {
    id: 'lab-bicolor-buttons',
    def: 'bicolor',
    title: 'Двухцветный светодиод: цвет по кнопкам',
    about: 'S1 включает красный, S2 — зелёный.',
    intro: [
      'Кнопка S1 даёт красный цвет, S2 — зелёный. Без кнопок или с обеими сразу',
      'уровни на выводах равны и светодиод не горит.',
    ],
    use: ['s1', 's2', 'leds'],
    links: [
      ['P', 'lead_p', 'out', 'Вывод P: 1 при красном'],
      ['N', 'lead_n', 'out', 'Вывод N: 1 при зелёном'],
    ],
    body: `  assign lead_p = s1;
  assign lead_n = s2;
  assign led_n = {4'b1111, ~s2, ~s1};  // LED0 и LED1 повторяют кнопки`,
    topic: 'gates',
    objective: 'Управлять двухцветным светодиодом двумя кнопками без такта.',
    observe: 'Одна кнопка — один цвет. Обе кнопки вместе дают равные уровни, и светодиод гаснет.',
    experiment:
      'Сделайте так, чтобы при двух нажатых кнопках горел красный: измените выражение для lead_n.',
  },
  {
    id: 'lab-bar-chaser',
    def: 'bar',
    title: 'Линейка светодиодов: бегущий огонь',
    about: 'Единица бежит по восьми светодиодам сдвиговым регистром.',
    intro: [
      'Восьмибитный регистр с одной единицей сдвигается по кругу на каждый tick.',
      'Каждый бит регистра — свой светодиод линейки.',
    ],
    use: ['clk', 'leds'],
    links: bus(['1', '2', '3', '4', '5', '6', '7', '8'], 'bar', 'out', 'Светодиод линейки'),
    body: `${div(20)}
  reg [7:0] ring = 8'b00000001;
  always @(posedge clk) if (tick) ring <= {ring[6:0], ring[7]};
  assign bar = ring;
${LEDS_OFF}`,
    topic: 'state',
    objective: 'Построить бегущий огонь на кольцевом сдвиговом регистре из восьми бит.',
    observe: 'Горит ровно один светодиод; после восьмого огонь возвращается на первый.',
    experiment: 'Запустите две единицы сразу. Смените направление: {ring[0], ring[7:1]}.',
  },
  {
    id: 'lab-bar-level',
    def: 'bar',
    opts: { color: '#ff8a1f' },
    title: 'Линейка светодиодов: шкала уровня',
    about: 'Кнопки S1 и S2 поднимают и опускают столбик.',
    intro: [
      'Число level от 0 до 8 показывается столбиком: горят первые level светодиодов.',
      'S1 прибавляет единицу, S2 убавляет.',
    ],
    use: ['clk', 's1', 's2', 'leds'],
    links: bus(['1', '2', '3', '4', '5', '6', '7', '8'], 'bar', 'out', 'Светодиод линейки'),
    body: `${press('s1')}
${press('s2')}
  reg [3:0] level = 4'd3;
  always @(posedge clk) begin
    if (s1_press && level != 4'd8) level <= level + 1'b1;
    if (s2_press && level != 4'd0) level <= level - 1'b1;
  end
  // «Термометрический» код: level единиц подряд.
  assign bar = 8'hFF >> (4'd8 - level);
  assign led_n = ~{2'b00, level};`,
    topic: 'coding',
    objective: 'Показать число столбиком светодиодов — термометрическим кодом.',
    observe:
      'Столбик растёт и убывает на один светодиод за нажатие; LED платы показывают то же число двоично.',
    experiment:
      'Сделайте так, чтобы при переполнении столбик начинался с нуля. Покажите только верхнюю точку столбика.',
  },
  {
    id: 'lab-ring-chase',
    def: 'ring',
    title: 'Кольцо светодиодов: огонь по кругу',
    about: 'Одна точка бежит по двенадцати светодиодам.',
    intro: [
      'Двенадцать светодиодов стоят по кругу, как на циферблате. Кольцевой регистр из',
      'двенадцати бит с одной единицей двигает огонь по часовой стрелке.',
    ],
    use: ['clk', 'leds'],
    links: bus(
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
      'dot',
      'out',
      'Светодиод кольца',
    ),
    body: `${div(20)}
  reg [11:0] ring = 12'b000000000001;
  always @(posedge clk) if (tick) ring <= {ring[10:0], ring[11]};
  assign dot = ring;
${LEDS_OFF}`,
    topic: 'state',
    objective: 'Провести огонь по кольцу из двенадцати светодиодов.',
    observe: 'Точка обходит круг за двенадцать шагов и не останавливается на стыке.',
    experiment: 'Добавьте вторую точку напротив первой. Пустите огонь против часовой стрелки.',
  },
  {
    id: 'lab-ring-fill',
    def: 'ring',
    opts: { color: '#3d8bff' },
    title: 'Кольцо светодиодов: заполнение',
    about: 'Круг заполняется по одному светодиоду и гаснет целиком.',
    intro: [
      'Счётчик считает от 0 до 12. Светодиод с номером i горит, пока i меньше счётчика:',
      'круг заполняется, как индикатор хода, и начинается заново.',
    ],
    use: ['clk', 'leds'],
    links: bus(
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
      'dot',
      'out',
      'Светодиод кольца',
    ),
    body: `${div(20)}
  reg [3:0] count = 0;
  always @(posedge clk) if (tick) count <= (count == 4'd12) ? 4'd0 : count + 1'b1;
  genvar i;
  generate
    for (i = 0; i < 12; i = i + 1) begin : lamps
      assign dot[i] = (i < count);
    end
  endgenerate
  assign led_n = ~{2'b00, count};`,
    topic: 'coding',
    objective: 'Заполнять кольцо светодиодов по счётчику сравнением номера с порогом.',
    observe: 'Светодиоды зажигаются по одному и все гаснут, когда счётчик возвращается в ноль.',
    experiment: 'Сделайте убывание вместо сброса. Замените generate одной строкой со сдвигом.',
  },
  {
    id: 'lab-traffic-cycle',
    def: 'traffic',
    title: 'Светофор: автомат из четырёх фаз',
    about: 'Красный, красный с жёлтым, зелёный, жёлтый.',
    intro: [
      'Конечный автомат: у каждой фазы свои лампы и своя длительность в тиках.',
      'Счётчик left отсчитывает время фазы, затем автомат переходит к следующей.',
    ],
    use: ['clk', 'leds'],
    links: [
      ['R', 'lamp[0]', 'out', 'Красная лампа'],
      ['Y', 'lamp[1]', 'out', 'Жёлтая лампа'],
      ['G', 'lamp[2]', 'out', 'Зелёная лампа'],
    ],
    body: `${div(21)}
  localparam RED = 2'd0, RED_YELLOW = 2'd1, GREEN = 2'd2, YELLOW = 2'd3;
  reg [1:0] phase = RED;
  reg [3:0] left = 4'd8;
  always @(posedge clk)
    if (tick) begin
      if (left != 0) left <= left - 1'b1;
      else begin
        phase <= phase + 1'b1;
        // Длинные фазы — красный и зелёный, короткие — с жёлтым.
        left <= (phase == RED || phase == GREEN) ? 4'd2 : 4'd8;
      end
    end
  assign lamp = (phase == RED)        ? 3'b001 :
                (phase == RED_YELLOW) ? 3'b011 :
                (phase == GREEN)      ? 3'b100 : 3'b010;
  assign led_n = ~{4'b0000, phase};`,
    topic: 'fsm',
    objective: 'Описать светофор конечным автоматом с длительностью каждой фазы.',
    observe:
      'Лампы идут в порядке красный, красный с жёлтым, зелёный, жёлтый; номер фазы виден на LED платы.',
    experiment: 'Добавьте мигающий зелёный перед жёлтым. Сделайте красный вдвое длиннее зелёного.',
  },
  {
    id: 'lab-traffic-crossing',
    def: 'traffic',
    title: 'Светофор: кнопка пешехода',
    about: 'Зелёный горит, пока пешеход не нажмёт S1.',
    intro: [
      'Машинам горит зелёный. Нажатие S1 запоминается, автомат переходит на жёлтый, затем',
      'на красный, держит его и возвращает зелёный.',
    ],
    use: ['clk', 's1', 'leds'],
    links: [
      ['R', 'lamp[0]', 'out', 'Красная лампа'],
      ['Y', 'lamp[1]', 'out', 'Жёлтая лампа'],
      ['G', 'lamp[2]', 'out', 'Зелёная лампа'],
    ],
    body: `${div(21)}
${press('s1')}
  localparam GO = 2'd0, SLOW = 2'd1, STOP = 2'd2, READY = 2'd3;
  reg [1:0] phase = GO;
  reg [3:0] left = 0;
  reg request = 0;               // пешеход нажал кнопку и ждёт
  always @(posedge clk) begin
    if (s1_press) request <= 1;
    if (tick) begin
      if (left != 0) left <= left - 1'b1;
      else case (phase)
        GO:    if (request) begin phase <= SLOW; left <= 4'd2; end
        SLOW:  begin phase <= STOP; left <= 4'd8; request <= 0; end
        STOP:  begin phase <= READY; left <= 4'd2; end
        default: phase <= GO;
      endcase
    end
  end
  assign lamp = (phase == GO) ? 3'b100 : (phase == SLOW) ? 3'b010 :
                (phase == STOP) ? 3'b001 : 3'b011;
  assign led_n = {5'b11111, ~request};  // LED0 горит, пока запрос принят`,
    topic: 'fsm',
    objective: 'Запомнить запрос пешехода и обслужить его автоматом светофора.',
    observe:
      'После нажатия S1 загорается LED0, зелёный сменяется жёлтым и красным, затем всё возвращается.',
    experiment:
      'Запретите новый запрос раньше, чем машины проедут восемь тиков. Добавьте вторую кнопку.',
  },
  {
    id: 'lab-laser-button',
    def: 'laser',
    title: 'Лазерный модуль: луч по кнопке',
    about: 'Пока нажата S1, лазер светит.',
    intro: ['Самая простая схема: вход соединён с выходом. Луч включён, пока нажата S1.'],
    use: ['s1', 'leds'],
    links: [['S', 'beam', 'out', 'Вход модуля: 1 включает луч']],
    body: `  assign beam = s1;
  assign led_n = {5'b11111, ~s1};`,
    topic: 'gates',
    objective: 'Включать лазерный модуль уровнем с кнопки без единого триггера.',
    observe: 'Луч и LED0 платы повторяют кнопку S1 сразу, без задержки на такт.',
    experiment: 'Добавьте S2 как блокировку: луч включается, только если S2 отпущена.',
  },
  {
    id: 'lab-laser-sos',
    def: 'laser',
    title: 'Лазерный модуль: сигнал SOS',
    about: 'Луч передаёт три коротких, три длинных и три коротких вспышки.',
    intro: [
      'Сообщение записано в константу: один бит — один tick. Регистр-указатель идёт по',
      'битам и повторяет сообщение по кругу.',
    ],
    use: ['clk', 'leds'],
    links: [['S', 'beam', 'out', 'Вход модуля: 1 включает луч']],
    body: `${div(20)}
  // Точка — 1 тик, тире — 3 тика, пауза между знаками — 1 тик, между буквами — 3.
  localparam [33:0] MESSAGE = 34'b0000000_10101_000_11101110111_000_10101;
  reg [5:0] index = 0;
  always @(posedge clk) if (tick) index <= (index == 6'd33) ? 6'd0 : index + 1'b1;
  assign beam = MESSAGE[index];
  assign led_n = {5'b11111, ~beam};`,
    topic: 'memory',
    objective: 'Передать сообщение азбукой Морзе, читая биты из константы по указателю.',
    observe:
      'Луч даёт три коротких вспышки, три длинных и снова три коротких, затем длинную паузу.',
    experiment: 'Закодируйте другое слово. Замедлите передачу, не меняя константу.',
  },
  // ---------- Индикаторы ----------
  {
    id: 'lab-seg1-count',
    def: 'seg1',
    title: 'Индикатор, 1 разряд: счёт от 0 до 9',
    about: 'Счётчик и дешифратор семи сегментов.',
    intro: [
      'Счётчик идёт от 0 до 9. Функция seg7 переводит цифру в набор горящих сегментов.',
      'Индикатор с общим катодом: сегмент горит при 1.',
    ],
    use: ['clk', 'leds'],
    links: SEGMENT_LINKS,
    body: `${div(22)}
${SEG7}
  reg [3:0] digit = 0;
  always @(posedge clk) if (tick) digit <= (digit == 4'd9) ? 4'd0 : digit + 1'b1;
  assign seg = {1'b0, seg7(digit)};  // точка dp выключена
  assign led_n = ~{2'b00, digit};`,
    topic: 'display',
    objective: 'Показать цифры от 0 до 9 на одном семисегментном индикаторе через дешифратор.',
    observe: 'Цифры сменяются по порядку; LED платы показывают то же число в двоичном виде.',
    experiment: 'Считайте до F. Выберите в свойствах «общий анод» и инвертируйте сегменты.',
  },
  {
    id: 'lab-seg1-presses',
    def: 'seg1',
    opts: { color: '#34d058' },
    title: 'Индикатор, 1 разряд: счётчик нажатий',
    about: 'Каждое нажатие S1 прибавляет единицу, S2 сбрасывает.',
    intro: [
      'Нажатие S1 ловится по фронту и прибавляет единицу к шестнадцатеричной цифре.',
      'S2 обнуляет её. Точка горит, пока S1 удерживается.',
    ],
    use: ['clk', 's1', 's2', 'leds'],
    links: SEGMENT_LINKS,
    body: `${press('s1')}
${SEG7}
  reg [3:0] digit = 0;
  always @(posedge clk)
    if (s2) digit <= 0;
    else if (s1_press) digit <= digit + 1'b1;
  assign seg = {s1_sync[1], seg7(digit)};
  assign led_n = ~{2'b00, digit};`,
    topic: 'display',
    objective: 'Считать нажатия кнопки по фронту и показывать их шестнадцатеричной цифрой.',
    observe: 'Одно нажатие — плюс один, сколько бы ни держали кнопку; после F идёт 0.',
    experiment:
      'Уберите выделение фронта и посмотрите, что будет при удержании. Добавьте счёт назад.',
  },
  {
    id: 'lab-segn-counter',
    def: 'segn',
    title: 'Индикатор на 4 разряда: динамическая индикация',
    about: 'Четыре цифры на общих сегментах зажигаются по очереди.',
    intro: [
      'У четырёх разрядов общие сегменты. Схема быстро перебирает разряды: выбирает один',
      'нулём на D1…D4 и в этот момент выдаёт его цифру. Глаз видит все четыре сразу.',
    ],
    use: ['clk', 'leds'],
    links: [...SEGMENT_LINKS, ...bus(['D1', 'D2', 'D3', 'D4'], 'dig', 'out', 'Выбор разряда')],
    body: `${div(19)}
${SEG7}
  // Четыре десятичные цифры: число растёт на единицу каждый tick.
  reg [15:0] bcd = 0;
  always @(posedge clk)
    if (tick) begin
      if (bcd[3:0] != 4'd9) bcd[3:0] <= bcd[3:0] + 1'b1;
      else begin
        bcd[3:0] <= 0;
        if (bcd[7:4] != 4'd9) bcd[7:4] <= bcd[7:4] + 1'b1;
        else begin
          bcd[7:4] <= 0;
          if (bcd[11:8] != 4'd9) bcd[11:8] <= bcd[11:8] + 1'b1;
          else begin bcd[11:8] <= 0; bcd[15:12] <= (bcd[15:12] == 4'd9) ? 4'd0 : bcd[15:12] + 1'b1; end
        end
      end
    end
  // Развёртка: два старших бита делителя выбирают разряд. D1 — левый.
  wire [1:0] scan = div[9:8];
  wire [3:0] digit = (scan == 2'd0) ? bcd[15:12] : (scan == 2'd1) ? bcd[11:8] :
                     (scan == 2'd2) ? bcd[7:4]   : bcd[3:0];
  assign seg = {1'b0, seg7(digit)};
  assign dig = ~(4'b0001 << scan);   // общий катод: выбранный разряд — 0
  assign led_n = ~{2'b00, bcd[3:0]};`,
    topic: 'display',
    objective: 'Вывести четырёхзначное число динамической индикацией на общих сегментах.',
    observe:
      'Все четыре цифры видны одновременно, хотя в каждый момент горит одна; младшая цифра бежит быстрее всех.',
    experiment:
      'Замедлите развёртку (возьмите div[18:17]) и увидите разряды по одному. Погасите ведущие нули.',
  },
  {
    id: 'lab-segn-stopwatch',
    def: 'segn',
    opts: { color: '#34d058' },
    title: 'Индикатор на 4 разряда: секундомер',
    about: 'S1 запускает и останавливает счёт, S2 сбрасывает.',
    intro: [
      'Секундомер: S1 переключает «идёт / стоит», S2 обнуляет. Показания выводятся',
      'динамической индикацией; точка отделяет два старших разряда.',
    ],
    use: ['clk', 's1', 's2', 'leds'],
    links: [...SEGMENT_LINKS, ...bus(['D1', 'D2', 'D3', 'D4'], 'dig', 'out', 'Выбор разряда')],
    body: `${div(19)}
${press('s1')}
${SEG7}
  reg running = 0;
  reg [15:0] bcd = 0;
  always @(posedge clk) begin
    if (s1_press) running <= ~running;
    if (s2) bcd <= 0;
    else if (tick && running) begin
      if (bcd[3:0] != 4'd9) bcd[3:0] <= bcd[3:0] + 1'b1;
      else begin
        bcd[3:0] <= 0;
        if (bcd[7:4] != 4'd9) bcd[7:4] <= bcd[7:4] + 1'b1;
        else begin
          bcd[7:4] <= 0;
          if (bcd[11:8] != 4'd9) bcd[11:8] <= bcd[11:8] + 1'b1;
          else begin bcd[11:8] <= 0; bcd[15:12] <= (bcd[15:12] == 4'd9) ? 4'd0 : bcd[15:12] + 1'b1; end
        end
      end
    end
  end
  wire [1:0] scan = div[9:8];
  wire [3:0] digit = (scan == 2'd0) ? bcd[15:12] : (scan == 2'd1) ? bcd[11:8] :
                     (scan == 2'd2) ? bcd[7:4]   : bcd[3:0];
  assign seg = {scan == 2'd1, seg7(digit)};  // точка после второго разряда
  assign dig = ~(4'b0001 << scan);
  assign led_n = {5'b11111, ~running};`,
    topic: 'fsm',
    objective: 'Собрать секундомер с пуском, остановкой и сбросом на четырёхразрядном индикаторе.',
    observe: 'S1 запускает и останавливает счёт, LED0 горит во время хода, S2 обнуляет показания.',
    experiment:
      'Сделайте круг: S2 при работающем секундомере замораживает показания, а счёт идёт дальше.',
  },
  {
    id: 'lab-matrix-picture',
    def: 'matrix',
    title: 'Светодиодная матрица: картинка развёрткой',
    about: 'Смайлик 8×8 рисуется по строкам.',
    intro: [
      'В матрице 64 светодиода и всего 16 выводов. Точка горит, когда её строка R = 1, а',
      'столбец C = 0. Схема по очереди включает строки и выдаёт для каждой свой узор.',
    ],
    use: ['clk', 'leds'],
    links: [
      ...bus(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'], 'col', 'out', 'Столбец'),
      ...bus(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'], 'row', 'out', 'Строка'),
    ],
    body: `  reg [10:0] scan_div = 0;
  always @(posedge clk) scan_div <= scan_div + 1'b1;
  wire [2:0] line = scan_div[10:8];
  // Узор строки: 1 — точка горит. Младший бит — левый столбец.
  reg [7:0] pattern;
  always @* begin
    case (line)
      3'd0: pattern = 8'b00111100;
      3'd1: pattern = 8'b01000010;
      3'd2: pattern = 8'b10100101;
      3'd3: pattern = 8'b10000001;
      3'd4: pattern = 8'b10100101;
      3'd5: pattern = 8'b10011001;
      3'd6: pattern = 8'b01000010;
      default: pattern = 8'b00111100;
    endcase
  end
  assign row = 8'b00000001 << line;
  assign col = ~pattern;            // столбец включается нулём
${LEDS_OFF}`,
    topic: 'display',
    objective: 'Нарисовать картинку на матрице 8×8 построчной развёрткой.',
    observe: 'Виден целый смайлик, хотя в каждый момент включена одна строка из восьми.',
    experiment:
      'Нарисуйте свою картинку. Замедлите развёртку и посмотрите, как строки зажигаются по одной.',
  },
  {
    id: 'lab-matrix-dot',
    def: 'matrix',
    opts: { color: '#34d058' },
    title: 'Светодиодная матрица: прыгающая точка',
    about: 'Точка летает по полю и отскакивает от краёв.',
    intro: [
      'Точка одна, поэтому развёртка не нужна: включаем её строку и её столбец.',
      'Координаты меняются на единицу каждый tick и отражаются от краёв поля.',
    ],
    use: ['clk', 'leds'],
    links: [
      ...bus(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'], 'col', 'out', 'Столбец'),
      ...bus(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'], 'row', 'out', 'Строка'),
    ],
    body: `${div(20)}
  reg [2:0] x = 3'd1, y = 3'd4;
  reg right = 1, down = 1;
  always @(posedge clk)
    if (tick) begin
      if (right) begin x <= x + 1'b1; if (x == 3'd6) right <= 0; end
      else       begin x <= x - 1'b1; if (x == 3'd1) right <= 1; end
      if (down)  begin y <= y + 1'b1; if (y == 3'd6) down <= 0; end
      else       begin y <= y - 1'b1; if (y == 3'd1) down <= 1; end
    end
  assign row = 8'b00000001 << y;
  assign col = ~(8'b00000001 << x);
  assign led_n = ~{y, x};`,
    topic: 'state',
    objective: 'Двигать точку по матрице и отражать её от границ поля.',
    observe:
      'Точка идёт по диагонали и меняет направление у каждого края; координаты видны на LED платы.',
    experiment:
      'Дайте точке разную скорость по x и y. Добавьте вторую точку — понадобится развёртка.',
  },
  {
    id: 'lab-hex-count',
    def: 'hex-display',
    title: 'Шестнадцатеричный индикатор: счёт от 0 до F',
    about: 'Индикатор сам расшифровывает четыре бита.',
    intro: [
      'Этому индикатору дешифратор не нужен: он сам превращает четыре бита в цифру 0–F.',
      'Достаточно четырёхбитного счётчика.',
    ],
    use: ['clk', 'leds'],
    links: bus(['D0', 'D1', 'D2', 'D3'], 'value', 'out', 'Двоичный разряд числа'),
    body: `${div(22)}
  reg [3:0] count = 0;
  always @(posedge clk) if (tick) count <= count + 1'b1;
  assign value = count;
${showOnLeds("{2'b00, count}")}`,
    topic: 'coding',
    objective: 'Связать четыре двоичных разряда с шестнадцатеричной цифрой на индикаторе.',
    observe: 'После 9 идут A, B, C, D, E, F; четыре LED платы показывают те же биты.',
    experiment: 'Считайте через два. Перепутайте провода D0 и D3 и объясните, что стало с цифрами.',
  },
  {
    id: 'lab-hex-buttons',
    def: 'hex-display',
    title: 'Шестнадцатеричный индикатор: плюс и минус',
    about: 'S1 прибавляет единицу, S2 вычитает.',
    intro: ['Реверсивный счётчик: S1 прибавляет единицу, S2 вычитает. Переполнение идёт по кругу.'],
    use: ['clk', 's1', 's2', 'leds'],
    links: bus(['D0', 'D1', 'D2', 'D3'], 'value', 'out', 'Двоичный разряд числа'),
    body: `${press('s1')}
${press('s2')}
  reg [3:0] count = 4'd8;
  always @(posedge clk) begin
    if (s1_press) count <= count + 1'b1;
    else if (s2_press) count <= count - 1'b1;
  end
  assign value = count;
${showOnLeds("{2'b00, count}")}`,
    topic: 'arithmetic',
    objective:
      'Построить реверсивный счётчик с двумя кнопками и вывести его в шестнадцатеричном виде.',
    observe:
      'От F плюс один даёт 0, от 0 минус один даёт F: число четырёхбитное и считает по кругу.',
    experiment: 'Запретите переход через F и через 0. Сделайте шаг 3 для S1.',
  },
  {
    id: 'lab-bcd7-count',
    def: 'bcd7',
    title: 'Индикатор с дешифратором: десятичный счёт',
    about: 'Двоично-десятичный счётчик от 0 до 9.',
    intro: [
      'Индикатор принимает двоично-десятичный код: четыре бита — одна цифра 0–9.',
      'Счётчик после девятки возвращается в ноль.',
    ],
    use: ['clk', 'leds'],
    links: bus(['D0', 'D1', 'D2', 'D3'], 'value', 'out', 'Разряд двоично-десятичной цифры'),
    body: `${div(22)}
  reg [3:0] digit = 0;
  always @(posedge clk) if (tick) digit <= (digit == 4'd9) ? 4'd0 : digit + 1'b1;
  assign value = digit;
${showOnLeds("{2'b00, digit}")}`,
    topic: 'coding',
    objective: 'Считать в двоично-десятичном коде и не выходить за девятку.',
    observe: 'После 9 идёт 0, а не A: сравнение с девяткой сбрасывает счётчик.',
    experiment: 'Уберите сброс на девятке и посмотрите, что показывает индикатор для кодов 10–15.',
  },
  {
    id: 'lab-bcd7-dice',
    def: 'bcd7',
    opts: { color: '#3d8bff' },
    title: 'Индикатор с дешифратором: игральный кубик',
    about: 'Пока нажата S1, цифры 1–6 быстро меняются; отпустили — выпало число.',
    intro: [
      'Счётчик очень быстро бежит от 1 до 6, пока нажата S1. Человек не может выбрать',
      'момент отпускания с точностью до такта, поэтому результат случаен.',
    ],
    use: ['clk', 's1', 'leds'],
    links: bus(['D0', 'D1', 'D2', 'D3'], 'value', 'out', 'Разряд двоично-десятичной цифры'),
    body: `  reg [3:0] face = 4'd1;
  always @(posedge clk)
    if (s1) face <= (face == 4'd6) ? 4'd1 : face + 1'b1;
  assign value = face;
  assign led_n = {5'b11111, ~s1};`,
    topic: 'state',
    objective:
      'Получить случайное число от 1 до 6 из быстрого счётчика и момента отпускания кнопки.',
    observe: 'Пока S1 нажата, цифра сливается; после отпускания остаётся одно число от 1 до 6.',
    experiment:
      'Сделайте кубик на 1–9. Посчитайте в лаборатории на скорости 2 такта в секунду, как идёт счёт.',
  },
  {
    id: 'lab-byte-count',
    def: 'byte-display',
    title: 'Индикатор байта: счётчик от 0 до 255',
    about: 'Восемь бит показаны десятичным, шестнадцатеричным и двоичным числом.',
    intro: [
      'Индикатор показывает восемь бит сразу в трёх видах. Восьмибитный счётчик проходит',
      'все значения от 0 до 255 и переполняется.',
    ],
    use: ['clk', 'leds'],
    links: bus(['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'], 'value', 'out', 'Бит байта'),
    body: `${div(20)}
  reg [7:0] count = 0;
  always @(posedge clk) if (tick) count <= count + 1'b1;
  assign value = count;
${showOnLeds('count[5:0]')}`,
    topic: 'arithmetic',
    objective: 'Сопоставить двоичную, шестнадцатеричную и десятичную запись одного байта.',
    observe: 'Три записи меняются вместе; после 255 (0xFF) счётчик возвращается в 0.',
    experiment:
      'Считайте с шагом 16 и посмотрите на шестнадцатеричную запись. Остановите счёт на 100.',
  },
  {
    id: 'lab-byte-random',
    def: 'byte-display',
    title: 'Индикатор байта: псевдослучайные числа',
    about: 'Сдвиговый регистр с обратной связью выдаёт неповторяющийся ряд.',
    intro: [
      'Регистр сдвига с линейной обратной связью (LFSR): новый бит — исключающее ИЛИ',
      'нескольких старых. Получается ряд из 255 чисел, похожий на случайный.',
    ],
    use: ['clk', 'leds'],
    links: bus(['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'], 'value', 'out', 'Бит байта'),
    body: `${div(21)}
  reg [7:0] lfsr = 8'h01;       // ноль запрещён: из него регистр не выйдет
  wire feedback = lfsr[7] ^ lfsr[5] ^ lfsr[4] ^ lfsr[3];
  always @(posedge clk) if (tick) lfsr <= {lfsr[6:0], feedback};
  assign value = lfsr;
${showOnLeds('lfsr[5:0]')}`,
    topic: 'dsp',
    objective: 'Построить генератор псевдослучайных чисел на сдвиговом регистре с обратной связью.',
    observe: 'Числа идут без видимого порядка и повторяются только через 255 шагов.',
    experiment:
      'Запишите в регистр ноль и убедитесь, что он застрял. Поменяйте отводы и найдите короткий цикл.',
  },
  {
    id: 'lab-counter-pulses',
    def: 'counter',
    title: 'Счётчик импульсов: считаем фронты',
    about: 'Схема шлёт импульсы, прибор считает их; S1 обнуляет.',
    intro: [
      'Прибор прибавляет единицу на каждый фронт CLK. Схема выдаёт короткий импульс раз в',
      'tick, а кнопка S1 подаёт единицу на RST и обнуляет счёт.',
    ],
    use: ['clk', 's1', 'leds'],
    links: [
      ['CLK', 'pulse', 'out', 'Счётный вход: считает фронты'],
      ['RST', 'clear', 'out', 'Сброс: 1 держит ноль'],
    ],
    body: `${div(20)}
  reg strobe = 0;
  always @(posedge clk) strobe <= tick;   // импульс длиной в один такт
  assign pulse = strobe;
  assign clear = s1;
  assign led_n = {5'b11111, ~s1};`,
    topic: 'clocks',
    objective: 'Отличить импульс от уровня: счётчик считает фронты, а не длительность.',
    observe:
      'Показания растут на единицу за tick, какой бы короткий ни был импульс; S1 держит ноль.',
    experiment:
      'Сделайте импульс длиной полтика — счёт не изменится. Поставьте логический анализатор на CLK.',
  },
  {
    id: 'lab-counter-burst',
    def: 'counter',
    opts: { digits: 3 },
    title: 'Счётчик импульсов: пачка по кнопке',
    about: 'Нажатие S1 отправляет ровно пять импульсов.',
    intro: [
      'По нажатию S1 автомат выдаёт пачку из пяти импульсов и останавливается.',
      'Счётчик на столе проверяет, что импульсов действительно пять. S2 — сброс прибора.',
    ],
    use: ['clk', 's1', 's2', 'leds'],
    links: [
      ['CLK', 'pulse', 'out', 'Счётный вход: считает фронты'],
      ['RST', 'clear', 'out', 'Сброс: 1 держит ноль'],
    ],
    body: `${div(16)}
${press('s1')}
  reg [3:0] left = 0;           // сколько полупериодов ещё осталось
  reg level = 0;
  always @(posedge clk) begin
    if (s1_press && left == 0) left <= 4'd10;   // пять импульсов — десять перепадов
    else if (tick && left != 0) begin
      level <= ~level;
      left <= left - 1'b1;
    end
  end
  assign pulse = level;
  assign clear = s2;
  assign led_n = {5'b11111, ~(left != 0)};`,
    topic: 'fsm',
    objective: 'Выдать заданное число импульсов по одному нажатию кнопки.',
    observe: 'Каждое нажатие S1 прибавляет к показаниям ровно пять; LED0 горит, пока идёт пачка.',
    experiment: 'Сделайте пачку из семи импульсов. Запретите новую пачку, пока удерживается S1.',
  },
  // ---------- Кнопки и переключатели ----------
  {
    id: 'lab-button-direct',
    def: 'button',
    title: 'Кнопка: зажигаем светодиод',
    about: 'Внешняя кнопка напрямую управляет LED0.',
    intro: [
      'Внешняя кнопка даёт 1, пока нажата. Светодиод платы горит при 0, поэтому сигнал',
      'нужно инвертировать.',
    ],
    use: ['leds'],
    links: [['OUT', 'key', 'in', 'Выход кнопки: нажата = 1']],
    body: `  assign led_n = {5'b11111, ~key};`,
    topic: 'gates',
    objective: 'Подключить внешнюю кнопку ко входу ПЛИС и учесть полярность светодиода.',
    observe: 'LED0 горит ровно столько, сколько нажата кнопка на столе.',
    experiment: 'В свойствах кнопки включите «нажата = 0» и исправьте схему. Включите фиксацию.',
  },
  {
    id: 'lab-button-toggle',
    def: 'button',
    opts: { color: '#30a46c' },
    title: 'Кнопка: включить и выключить одним нажатием',
    about: 'Каждое нажатие переворачивает состояние светодиода.',
    intro: [
      'Триггер запоминает состояние. Нажатие ловится по фронту и переворачивает его:',
      'первое нажатие включает LED0, второе выключает.',
    ],
    use: ['clk', 'leds'],
    links: [['OUT', 'key', 'in', 'Выход кнопки: нажата = 1']],
    body: `${press('key')}
  reg lamp = 0;
  always @(posedge clk) if (key_press) lamp <= ~lamp;
  assign led_n = {5'b11111, ~lamp};`,
    topic: 'state',
    objective: 'Сделать из кнопки без фиксации выключатель с памятью на одном триггере.',
    observe: 'Светодиод меняет состояние в момент нажатия и не реагирует на отпускание.',
    experiment: 'Переключайте по отпусканию. Уберите выделение фронта и объясните мерцание.',
  },
  ...(
    [
      ['sw-slide', 'Ползунковый переключатель', 'lab-slide', 'ползунок'],
      ['sw-toggle', 'Тумблер', 'lab-toggle', 'тумблер'],
      ['sw-rocker', 'Клавишный выключатель', 'lab-rocker', 'клавишу'],
    ] as const
  ).flatMap(([def, name, id, what], index): Recipe[] => [
    {
      id: `${id}-direct`,
      def,
      title: `${name}: положение на светодиоде`,
      about: `LED0 показывает, в каком положении ${what.replace('клавишу', 'клавиша')}.`,
      intro: [
        `${name} держит уровень сам: 1 во включённом положении, 0 в выключенном.`,
        'Триггеры не нужны — память уже есть в самом переключателе.',
      ],
      use: ['leds'],
      links: [['OUT', 'sw', 'in', 'Выход переключателя: включён = 1']],
      body: `  assign led_n = {5'b11111, ~sw};`,
      topic: 'gates',
      objective: `Прочитать положение детали «${name}» и показать его светодиодом.`,
      observe: `LED0 горит, пока ${what} во включённом положении, и не гаснет, когда руку убрали.`,
      experiment: `Добавьте кнопку S1: пусть LED0 горит только при включённом переключателе и нажатой S1.`,
    },
    [
      {
        id: `${id}-speed`,
        def,
        title: `${name}: быстро или медленно`,
        about: 'Переключатель выбирает частоту мигания.',
        intro: [
          'Переключатель выбирает, какой бит счётчика выводить на светодиод: старший мигает',
          'медленно, соседний младший — вдвое быстрее.',
        ],
        use: ['clk', 'leds'],
        links: [['OUT', 'sw', 'in', 'Выход переключателя: включён = 1']],
        body: `  reg [22:0] count = 0;
  always @(posedge clk) count <= count + 1'b1;
  wire blink = sw ? count[20] : count[22];   // мультиплексор 2 в 1
  assign led_n = {5'b11111, ~blink};`,
        topic: 'routing',
        objective: `Выбрать один из двух сигналов мультиплексором по положению детали «${name}».`,
        observe: 'В одном положении LED0 мигает медленно, в другом — вчетверо быстрее.',
        experiment: 'Добавьте S1 как второй адресный бит и выбирайте из четырёх частот.',
      } as Recipe,
      {
        id: `${id}-direction`,
        def,
        title: `${name}: направление бегущего огня`,
        about: 'Переключатель разворачивает огонь на светодиодах платы.',
        intro: [
          'Шесть светодиодов платы — бегущий огонь. Переключатель выбирает, в какую сторону',
          'сдвигать регистр на каждом тике.',
        ],
        use: ['clk', 'leds'],
        links: [['OUT', 'sw', 'in', 'Выход переключателя: включён = 1']],
        body: `${div(20)}
  reg [5:0] ring = 6'b000001;
  always @(posedge clk)
    if (tick) ring <= sw ? {ring[0], ring[5:1]} : {ring[4:0], ring[5]};
  assign led_n = ~ring;`,
        topic: 'state',
        objective: `Менять направление сдвига регистра по положению детали «${name}».`,
        observe:
          'Огонь бежит в одну сторону, а после переключения разворачивается с того же места.',
        experiment: 'Сделайте остановку огня кнопкой S1. Запустите два огня навстречу друг другу.',
      } as Recipe,
      {
        id: `${id}-pause`,
        def,
        title: `${name}: пуск и пауза счётчика`,
        about: 'Счётчик на светодиодах идёт, только пока переключатель включён.',
        intro: [
          'Сигнал разрешения: счётчик прибавляет единицу на тике, только если переключатель',
          'включён. В выключенном положении число замирает.',
        ],
        use: ['clk', 'leds'],
        links: [['OUT', 'sw', 'in', 'Выход переключателя: включён = 1']],
        body: `${div(21)}
  reg [5:0] count = 0;
  always @(posedge clk) if (tick && sw) count <= count + 1'b1;
  assign led_n = ~count;`,
        topic: 'state',
        objective: `Остановить и продолжить счёт сигналом разрешения от детали «${name}».`,
        observe:
          'Число на светодиодах растёт, замирает при выключении и продолжается с того же места.',
        experiment: 'Добавьте сброс кнопкой S1. Сделайте счёт назад в выключенном положении.',
      } as Recipe,
    ][index],
  ]),
  {
    id: 'lab-dip-leds',
    def: 'dip',
    title: 'DIP-переключатель: четыре бита на светодиодах',
    about: 'Каждый движок управляет своим светодиодом.',
    intro: [
      'Четыре движка — четыре независимых бита. Так на платах задают адрес или режим.',
      'Светодиоды платы показывают набранное число.',
    ],
    use: ['leds'],
    links: bus(['1', '2', '3', '4'], 'sw', 'in', 'Движок переключателя'),
    body: `  assign led_n = ~{2'b00, sw};`,
    topic: 'coding',
    objective: 'Набрать двоичное число движками DIP-переключателя и прочитать его в схеме.',
    observe: 'Каждый движок зажигает свой светодиод; вместе они образуют число от 0 до 15.',
    experiment: 'Зажгите LED5, только когда набрано число 10. В свойствах поставьте 8 движков.',
  },
  {
    id: 'lab-dip-adder',
    def: 'dip',
    title: 'DIP-переключатель: сумматор двух чисел',
    about: 'Два двухбитных числа складываются, сумма видна на светодиодах.',
    intro: [
      'Движки 1–2 задают первое число, 3–4 — второе. Схема складывает их: сумма двух',
      'двухбитных чисел занимает три бита.',
    ],
    use: ['leds'],
    links: bus(['1', '2', '3', '4'], 'sw', 'in', 'Движок переключателя'),
    body: `  wire [1:0] a = sw[1:0];
  wire [1:0] b = sw[3:2];
  wire [2:0] sum = a + b;       // третий бит — перенос
  assign led_n = ~{3'b000, sum};`,
    topic: 'arithmetic',
    objective: 'Сложить два двухбитных числа и увидеть перенос в третьем разряде.',
    observe: 'LED0–LED2 показывают сумму; при 3 + 3 загорается перенос и получается 6.',
    experiment:
      'Сделайте вычитание и покажите знак на LED5. Поставьте шестнадцатеричный индикатор.',
  },
  {
    id: 'lab-keypad-scan',
    def: 'keypad',
    title: 'Матричная клавиатура: опрос строк',
    about: 'Номер нажатой клавиши показывается на светодиодах.',
    intro: [
      'Шестнадцать клавиш на восьми проводах. Схема по очереди подаёт 0 на одну строку и',
      'читает столбцы: 0 в столбце значит, что клавиша на пересечении нажата.',
    ],
    use: ['clk', 'leds'],
    links: [
      ...bus(['R1', 'R2', 'R3', 'R4'], 'row', 'out', 'Строка: опрашивается нулём'),
      ...bus(['C1', 'C2', 'C3', 'C4'], 'col', 'in', 'Столбец: 0 при нажатой клавише'),
    ],
    body: `  reg [11:0] scan_div = 0;
  always @(posedge clk) scan_div <= scan_div + 1'b1;
  wire [1:0] line = scan_div[11:10];
  assign row = ~(4'b0001 << line);
  reg [3:0] code = 0;           // {строка, столбец} последней клавиши
  reg pressed = 0;
  reg seen = 0;                 // в этом проходе клавиша встретилась
  always @(posedge clk)
    if (scan_div[9:0] == 10'h3FF) begin   // конец опроса строки: столбцы установились
      if (col != 4'b1111) begin
        seen <= 1;
        pressed <= 1;
        code <= {line, !col[0] ? 2'd0 : !col[1] ? 2'd1 : !col[2] ? 2'd2 : 2'd3};
      end
      if (line == 2'd3) begin
        if (!seen && col == 4'b1111) pressed <= 0;
        seen <= 0;
      end
    end
  assign led_n = ~{pressed, 1'b0, code};`,
    topic: 'interfaces',
    objective: 'Опросить матричную клавиатуру по строкам и определить нажатую клавишу.',
    observe:
      'LED0–LED3 показывают номер клавиши (строка и столбец), LED5 горит, пока клавиша нажата.',
    experiment:
      'Переведите номер в цифру на клавише. Нажмите две клавиши в одной строке и объясните результат.',
  },
  {
    id: 'lab-keypad-count',
    def: 'keypad',
    opts: { layout: '3x4' },
    title: 'Матричная клавиатура: счётчик нажатий',
    about: 'Любая клавиша прибавляет единицу к числу на светодиодах.',
    intro: [
      'Все строки опрашиваются сразу нулём, поэтому достаточно знать, нажато ли хоть что-то.',
      'Нажатие любой клавиши ловится по фронту и считается.',
    ],
    use: ['clk', 'leds'],
    links: [
      ...bus(['R1', 'R2', 'R3', 'R4'], 'row', 'out', 'Строка: опрашивается нулём'),
      ...bus(['C1', 'C2', 'C3'], 'col', 'in', 'Столбец: 0 при нажатой клавише'),
    ],
    body: `  assign row = 4'b0000;         // все строки активны: ловим любую клавишу
  wire any = (col != 3'b111);
${press('any')}
  reg [5:0] count = 0;
  always @(posedge clk) if (any_press) count <= count + 1'b1;
  assign led_n = ~count;`,
    topic: 'interfaces',
    objective: 'Обнаружить нажатие любой клавиши матрицы без опроса по строкам.',
    observe: 'Число на светодиодах растёт на единицу за каждое нажатие любой клавиши.',
    experiment:
      'Считайте только клавиши левого столбца. Объясните, почему так нельзя узнать номер клавиши.',
  },
  {
    id: 'lab-encoder-count',
    def: 'encoder',
    title: 'Энкодер: счёт поворотов',
    about: 'Поворот вправо прибавляет, влево убавляет.',
    intro: [
      'Энкодер выдаёт два сигнала, сдвинутых друг относительно друга. В момент спада A',
      'смотрим на B: при повороте вправо там 1, при повороте влево 0.',
    ],
    use: ['clk', 'leds'],
    links: [
      ['A', 'enc_a', 'in', 'Фаза A энкодера'],
      ['B', 'enc_b', 'in', 'Фаза B энкодера'],
      ['SW', 'enc_sw', 'in', 'Кнопка ручки: нажата = 0'],
    ],
    body: `  reg [2:0] a_sync = 3'b111;
  reg [1:0] b_sync = 2'b11;
  always @(posedge clk) begin
    a_sync <= {a_sync[1:0], enc_a};
    b_sync <= {b_sync[0], enc_b};
  end
  wire a_fall = a_sync[2] & ~a_sync[1];
  reg [5:0] position = 6'd8;
  always @(posedge clk)
    if (!enc_sw) position <= 6'd8;                       // нажатие ручки возвращает середину
    else if (a_fall) position <= b_sync[1] ? position + 1'b1 : position - 1'b1;
  assign led_n = ~position;`,
    topic: 'interfaces',
    objective: 'Определить направление вращения энкодера по порядку фронтов двух фаз.',
    observe: 'Щелчок вправо прибавляет единицу, влево убавляет; нажатие ручки возвращает число 8.',
    experiment: 'Считайте оба фронта A — шаг станет вдвое мельче. Перепутайте провода A и B.',
  },
  {
    id: 'lab-encoder-dimmer',
    def: 'encoder',
    title: 'Энкодер: регулятор яркости',
    about: 'Ручка меняет яркость светодиода ШИМ.',
    intro: [
      'Ручка задаёт уровень от 0 до 15, а ШИМ превращает уровень в яркость внешнего',
      'светодиода. Уровень не выходит за края диапазона.',
    ],
    use: ['clk', 'leds'],
    links: [
      ['A', 'enc_a', 'in', 'Фаза A энкодера'],
      ['B', 'enc_b', 'in', 'Фаза B энкодера'],
      ['SW', 'enc_sw', 'in', 'Кнопка ручки: нажата = 0'],
    ],
    extra: [{ def: 'led', links: [['A', 'lamp', 'out', 'Светодиод: ШИМ-яркость']] }],
    body: `  reg [2:0] a_sync = 3'b111;
  reg [1:0] b_sync = 2'b11;
  always @(posedge clk) begin
    a_sync <= {a_sync[1:0], enc_a};
    b_sync <= {b_sync[0], enc_b};
  end
  wire a_fall = a_sync[2] & ~a_sync[1];
  reg [3:0] level = 4'd4;
  always @(posedge clk)
    if (!enc_sw) level <= 0;
    else if (a_fall) begin
      if (b_sync[1] && level != 4'd15) level <= level + 1'b1;
      if (!b_sync[1] && level != 4'd0) level <= level - 1'b1;
    end
  reg [3:0] ramp = 0;
  always @(posedge clk) ramp <= ramp + 1'b1;
  assign lamp = ramp < level;
  assign led_n = ~{2'b00, level};`,
    topic: 'dsp',
    objective: 'Управлять яркостью светодиода энкодером через ШИМ с ограничением диапазона.',
    observe:
      'Каждый щелчок меняет яркость на одну ступень из шестнадцати; у краёв уровень упирается.',
    experiment:
      'Сделайте шаг яркости неравномерным (квадрат уровня). Нажатием ручки включайте полную яркость.',
  },
  {
    id: 'lab-joystick-leds',
    def: 'joystick',
    title: 'Джойстик: пять направлений',
    about: 'Каждое направление зажигает свой светодиод.',
    intro: [
      'Под рычажком пять кнопок: вверх, вниз, влево, вправо и нажатие. Каждая — отдельный',
      'вход ПЛИС и свой светодиод платы.',
    ],
    use: ['leds'],
    links: [
      ['UP', 'joy[0]', 'in', 'Вверх'],
      ['DN', 'joy[1]', 'in', 'Вниз'],
      ['LT', 'joy[2]', 'in', 'Влево'],
      ['RT', 'joy[3]', 'in', 'Вправо'],
      ['OK', 'joy[4]', 'in', 'Нажатие'],
    ],
    body: `  assign led_n = ~{1'b0, joy};`,
    topic: 'gates',
    objective: 'Прочитать пять независимых кнопок джойстика пятью входами.',
    observe: 'LED0–LED4 повторяют направления; LED5 не используется.',
    experiment: 'Зажгите LED5 при диагонали — когда нажаты два соседних направления.',
  },
  {
    id: 'lab-joystick-cursor',
    def: 'joystick',
    title: 'Джойстик: курсор на светодиодах',
    about: 'Влево и вправо двигают огонёк, нажатие ставит его в середину.',
    intro: [
      'Огонёк стоит на одном из шести светодиодов. Нажатие «влево» и «вправо» ловится по',
      'фронту и сдвигает его на шаг, у края он останавливается.',
    ],
    use: ['clk', 'leds'],
    links: [
      ['UP', 'joy[0]', 'in', 'Вверх'],
      ['DN', 'joy[1]', 'in', 'Вниз'],
      ['LT', 'joy[2]', 'in', 'Влево'],
      ['RT', 'joy[3]', 'in', 'Вправо'],
      ['OK', 'joy[4]', 'in', 'Нажатие'],
    ],
    body: `${press('left', 'joy[2]')}
${press('right', 'joy[3]')}
  reg [2:0] place = 3'd2;
  always @(posedge clk)
    if (joy[4]) place <= 3'd2;
    else if (left_press && place != 3'd0) place <= place - 1'b1;
    else if (right_press && place != 3'd5) place <= place + 1'b1;
  assign led_n = ~(6'b000001 << place);`,
    topic: 'state',
    objective: 'Двигать курсор по шести позициям кнопками джойстика с остановкой у краёв.',
    observe: 'Одно нажатие — один шаг огонька; у края он не перескакивает на другую сторону.',
    experiment:
      'Сделайте переход через край по кругу. Пусть «вверх» и «вниз» прыгают на три позиции.',
  },
  {
    id: 'lab-rotary-code',
    def: 'rotary',
    title: 'Кодовый переключатель: цифра в двоичном коде',
    about: 'Набранная цифра видна четырьмя битами.',
    intro: [
      'Переключатель выдаёт цифру четырьмя битами с весами 1, 2, 4 и 8.',
      'Светодиоды платы показывают эти биты.',
    ],
    use: ['leds'],
    links: bus(['1', '2', '4', '8'], 'code', 'in', 'Бит кода цифры'),
    body: `  assign led_n = ~{2'b00, code};`,
    topic: 'coding',
    objective: 'Прочитать десятичную цифру кодового переключателя как четыре двоичных разряда.',
    observe: 'Для цифры 5 горят LED0 и LED2: веса 1 и 4 в сумме дают 5.',
    experiment: 'Зажгите LED5 для чётных цифр. В свойствах выберите диапазон 0–F.',
  },
  {
    id: 'lab-rotary-select',
    def: 'rotary',
    title: 'Кодовый переключатель: выбор светодиода',
    about: 'Цифра выбирает, какой из шести светодиодов горит.',
    intro: [
      'Дешифратор «один из шести»: набранная цифра 0–5 зажигает светодиод с таким номером.',
      'Для цифр 6–9 не горит ни один.',
    ],
    use: ['leds'],
    links: bus(['1', '2', '4', '8'], 'code', 'in', 'Бит кода цифры'),
    body: `  wire [5:0] one_hot = (code < 4'd6) ? (6'b000001 << code) : 6'b000000;
  assign led_n = ~one_hot;`,
    topic: 'routing',
    objective: 'Построить дешифратор: двоичный номер включает ровно один выход.',
    observe: 'Горит один светодиод с номером набранной цифры; для 6–9 все погашены.',
    experiment: 'Для цифр 6–9 зажигайте все светодиоды. Сделайте столбик вместо одной точки.',
  },
  {
    id: 'lab-const-gate',
    def: 'const',
    title: 'Постоянный уровень: разрешение для кнопки',
    about: 'Кнопка S1 работает, только пока на входе единица.',
    intro: [
      'Постоянный уровень — перемычка на плюс или на землю. Здесь он разрешает кнопку:',
      'элемент И пропускает S1, только если на входе enable единица.',
    ],
    use: ['s1', 'leds'],
    links: [['OUT', 'enable', 'in', 'Постоянный уровень: 1 разрешает']],
    body: `  wire lamp = s1 & enable;
  assign led_n = {4'b1111, ~enable, ~lamp};`,
    topic: 'gates',
    objective: 'Использовать постоянный уровень как сигнал разрешения для элемента И.',
    observe:
      'С единицей на входе LED0 повторяет S1; с нулём кнопка ничего не делает. LED1 показывает уровень.',
    experiment: 'В свойствах поставьте уровень 0. Замените И на ИЛИ и объясните, что изменилось.',
  },
  {
    id: 'lab-const-enable',
    def: 'const',
    title: 'Постоянный уровень: режим мигания',
    about: 'Уровень на входе выбирает: мигать или гореть постоянно.',
    intro: [
      'Так на платах перемычкой выбирают режим работы. Единица на входе mode включает',
      'мигание, ноль — постоянный свет.',
    ],
    use: ['clk', 'leds'],
    links: [['OUT', 'mode', 'in', 'Постоянный уровень: режим']],
    body: `  reg [21:0] count = 0;
  always @(posedge clk) count <= count + 1'b1;
  wire lamp = mode ? count[21] : 1'b1;
  assign led_n = {5'b11111, ~lamp};`,
    topic: 'routing',
    objective: 'Выбрать режим работы схемы уровнем на конфигурационном входе.',
    observe:
      'При единице LED0 мигает, при нуле горит ровно; режим не меняется, пока не поменяли уровень.',
    experiment:
      'Добавьте второй такой вход и получите четыре режима. Замените деталь переключателем.',
  },
];

// ---------- Датчики: одна и та же пара схем подходит каждому цифровому модулю ----------
const SENSORS: [id: string, name: string, hit: string, event: string][] = [
  ['pir', 'Датчик движения', 'есть движение', 'проходов'],
  ['reed', 'Геркон', 'магнит рядом', 'открываний двери'],
  ['tilt', 'Датчик наклона', 'наклон', 'наклонов'],
  ['touch', 'Сенсорная кнопка', 'касание', 'касаний'],
  ['gate', 'Оптический щелевой датчик', 'щель закрыта', 'предметов'],
  ['hall', 'Датчик Холла', 'поле есть', 'оборотов магнита'],
  ['limit', 'Концевой выключатель', 'упор', 'касаний упора'],
  ['obstacle', 'ИК-датчик препятствия', 'препятствие', 'препятствий'],
  ['flame', 'Датчик пламени', 'огонь', 'вспышек'],
  ['sound', 'Датчик звука', 'хлопок', 'хлопков'],
  ['water', 'Датчик уровня воды', 'вода', 'заливов'],
  ['vibration', 'Датчик вибрации', 'удар', 'ударов'],
  ['light', 'Датчик освещённости', 'светло', 'включений света'],
  ['line', 'Датчик линии', 'линия', 'пересечений линии'],
];
for (const [id, name, hit, event] of SENSORS)
  recipes.push(
    {
      id: `lab-${id}-alarm`,
      def: `sensor-${id}`,
      title: `${name}: сигнал с памятью`,
      about: `Срабатывание запоминается, пока его не сбросят кнопкой S1.`,
      intro: [
        `${name} выдаёт 1, когда «${hit}». Срабатывание может быть коротким, поэтому`,
        'триггер запоминает его: LED1 горит до сброса кнопкой S1. LED0 показывает датчик сейчас.',
      ],
      use: ['clk', 's1', 'leds'],
      links: [['OUT', 'sense', 'in', `Выход датчика: 1, когда «${hit}»`]],
      body: `  reg [1:0] sense_sync = 0;      // датчик не привязан к такту — синхронизируем
  always @(posedge clk) sense_sync <= {sense_sync[0], sense};
  reg alarm = 0;
  always @(posedge clk)
    if (s1) alarm <= 0;
    else if (sense_sync[1]) alarm <= 1;
  assign led_n = {4'b1111, ~alarm, ~sense_sync[1]};`,
      topic: 'state',
      objective: `Запомнить срабатывание детали «${name}» в триггере до ручного сброса.`,
      observe: `LED0 горит, пока «${hit}»; LED1 остаётся гореть и после этого, пока не нажата S1.`,
      experiment:
        'Сделайте автоматический сброс через несколько секунд. Включите зуммер по тревоге.',
    },
    {
      id: `lab-${id}-count`,
      def: `sensor-${id}`,
      title: `${name}: счётчик срабатываний`,
      about: `Схема считает, сколько раз сработал датчик.`,
      intro: [
        `Считаем события: каждое новое срабатывание («${hit}») прибавляет единицу.`,
        'Считается фронт сигнала, поэтому долгое срабатывание — всё равно одно событие.',
      ],
      use: ['clk', 's1', 'leds'],
      links: [['OUT', 'sense', 'in', `Выход датчика: 1, когда «${hit}»`]],
      body: `${press('sense')}
  reg [5:0] count = 0;
  always @(posedge clk)
    if (s1) count <= 0;
    else if (sense_press) count <= count + 1'b1;
  assign led_n = ~count;`,
      topic: 'state',
      objective: `Подсчитать число ${event} по фронтам сигнала детали «${name}».`,
      observe: `Число на светодиодах растёт на единицу за каждое новое срабатывание; S1 обнуляет его.`,
      experiment:
        'Считайте и начало, и конец срабатывания. Остановите счёт на десяти и зажгите все светодиоды.',
    },
  );

const pwmSteps = (signal: string) => `${press('s1')}
  reg [1:0] step = 2'd1;
  always @(posedge clk) if (s1_press) step <= step + 1'b1;
  // Заполнение ШИМ: 0, 25, 50 и 100 процентов.
  wire [7:0] duty = (step == 2'd0) ? 8'd0 : (step == 2'd1) ? 8'd64 :
                    (step == 2'd2) ? 8'd128 : 8'd255;
  reg [7:0] ramp = 0;
  always @(posedge clk) ramp <= ramp + 1'b1;
  assign ${signal} = (ramp < duty) | (step == 2'd3);
  assign led_n = ~{4'b0000, step};`;

recipes.push(
  // ---------- Звук и движение ----------
  {
    id: 'lab-buzzer-beep',
    def: 'buzzer',
    opts: { type: 'active' },
    title: 'Зуммер: короткие гудки',
    about: 'Активный зуммер пищит, пока на входе единица.',
    intro: [
      'Активный зуммер звучит сам, ему нужен только уровень. Схема включает его на один',
      'тик из четырёх — получаются короткие гудки с паузами.',
    ],
    use: ['clk', 'leds'],
    links: [['S', 'sound', 'out', 'Вход зуммера: 1 включает звук']],
    body: `${div(21)}
  reg [1:0] beat = 0;
  always @(posedge clk) if (tick) beat <= beat + 1'b1;
  assign sound = (beat == 2'd0);
  assign led_n = {5'b11111, ~sound};`,
    topic: 'clocks',
    objective: 'Получить прерывистый сигнал с заданным соотношением гудка и паузы.',
    observe: 'Гудок занимает один тик, пауза — три; LED0 платы горит вместе со звуком.',
    experiment: 'Сделайте два гудка подряд и длинную паузу. Включайте гудки только при нажатой S1.',
  },
  {
    id: 'lab-buzzer-tones',
    def: 'buzzer',
    opts: { type: 'passive' },
    title: 'Зуммер: две ноты',
    about: 'Пассивный зуммер играет ноту ля; S1 поднимает её на октаву.',
    intro: [
      'Пассивному зуммеру нужен меандр звуковой частоты. Полупериод ноты ля (440 Гц) —',
      '27 000 000 / 440 / 2 тактов. Кнопка S1 берёт вдвое меньший полупериод — 880 Гц.',
    ],
    use: ['clk', 's1', 'leds'],
    links: [['S', 'sound', 'out', 'Вход зуммера: меандр звуковой частоты']],
    body: `  localparam HALF_A4 = 30682;    // 27 МГц / 440 Гц / 2
  wire [15:0] half = s1 ? HALF_A4 / 2 : HALF_A4;
  reg [15:0] count = 0;
  reg wave = 0;
  always @(posedge clk)
    if (count >= half - 1) begin count <= 0; wave <= ~wave; end
    else count <= count + 1'b1;
  assign sound = wave;
  assign led_n = {5'b11111, ~s1};`,
    topic: 'clocks',
    objective: 'Получить звук нужной частоты делением такта и поднять его на октаву.',
    observe: 'Зуммер показывает 440 Гц, а при нажатой S1 — 880 Гц: вдвое выше, та же нота.',
    experiment:
      'Посчитайте полупериод для ноты до (262 Гц). Сыграйте три ноты по очереди от делителя.',
  },
  {
    id: 'lab-relay-blink',
    def: 'relay',
    title: 'Реле: медленное переключение',
    about: 'Реле щёлкает раз в несколько тиков.',
    intro: [
      'Реле — механический контакт: ему нужно время, чтобы замкнуться. Поэтому его',
      'переключают редко. Здесь оно меняет состояние раз в четыре тика.',
    ],
    use: ['clk', 'leds'],
    links: [['IN', 'coil', 'out', 'Вход реле: 1 замыкает контакты']],
    body: `${div(21)}
  reg [2:0] beat = 0;
  always @(posedge clk) if (tick) beat <= beat + 1'b1;
  assign coil = beat[2];
  assign led_n = {5'b11111, ~coil};`,
    topic: 'clocks',
    objective: 'Управлять реле редкими переключениями, пригодными для механического контакта.',
    observe: 'Контакты реле замкнуты четыре тика и разомкнуты четыре; LED0 показывает то же.',
    experiment: 'Попробуйте подать на реле ШИМ и объясните, почему так не делают.',
  },
  {
    id: 'lab-relay-latch',
    def: 'relay',
    title: 'Реле: включить и выключить кнопками',
    about: 'S1 замыкает контакты, S2 размыкает.',
    intro: [
      'RS-триггер: S1 включает реле, S2 выключает. Реле помнит состояние, когда обе',
      'кнопки отпущены. При двух нажатых кнопках выигрывает выключение.',
    ],
    use: ['clk', 's1', 's2', 'leds'],
    links: [['IN', 'coil', 'out', 'Вход реле: 1 замыкает контакты']],
    body: `  reg on = 0;
  always @(posedge clk)
    if (s2) on <= 0;              // выключение главнее: так безопаснее
    else if (s1) on <= 1;
  assign coil = on;
  assign led_n = {5'b11111, ~on};`,
    topic: 'state',
    objective: 'Собрать пускатель «пуск — стоп» на триггере с приоритетом выключения.',
    observe: 'Короткое нажатие S1 включает реле надолго; S2 выключает его даже при нажатой S1.',
    experiment:
      'Отдайте приоритет включению и сравните. Добавьте автоматическое выключение по таймеру.',
  },
  {
    id: 'lab-motor-speeds',
    def: 'motor',
    title: 'Мотор: четыре скорости',
    about: 'S1 переключает заполнение ШИМ: 0, 25, 50 и 100 %.',
    intro: [
      'Скорость мотора задаёт доля времени, когда на драйвер подана единица.',
      'Нажатия S1 перебирают четыре значения заполнения.',
    ],
    use: ['clk', 's1', 'leds'],
    links: [['PWM', 'drive', 'out', 'Вход драйвера: ШИМ']],
    body: pwmSteps('drive'),
    topic: 'dsp',
    objective: 'Задать скорость мотора заполнением ШИМ и переключать её кнопкой.',
    observe:
      'Мотор стоит, крутится на четверть, на половину и на полную скорость; номер ступени на LED платы.',
    experiment: 'Добавьте ступень 75 %. Увеличьте разрядность ШИМ до 10 бит.',
  },
  {
    id: 'lab-motor-ramp',
    def: 'motor',
    title: 'Мотор: плавный разгон',
    about: 'Скорость растёт постепенно; S1 запускает разгон заново.',
    intro: [
      'Резкий пуск вреден мотору и механике. Заполнение ШИМ растёт на единицу за шаг, пока',
      'не дойдёт до максимума. S1 сбрасывает его в ноль.',
    ],
    use: ['clk', 's1', 'leds'],
    links: [['PWM', 'drive', 'out', 'Вход драйвера: ШИМ']],
    body: `  reg [15:0] slow = 0;
  always @(posedge clk) slow <= slow + 1'b1;
  reg [7:0] duty = 0;
  always @(posedge clk)
    if (s1) duty <= 0;
    else if (slow == 0 && duty != 8'd255) duty <= duty + 1'b1;
  assign drive = slow[7:0] < duty;
  assign led_n = ~duty[7:2];`,
    topic: 'dsp',
    objective: 'Плавно разогнать мотор, постепенно увеличивая заполнение ШИМ.',
    observe:
      'После сброса мотор трогается медленно и набирает скорость; LED платы показывают заполнение.',
    experiment: 'Добавьте плавное торможение по S2. Сделайте разгон вдвое быстрее торможения.',
  },
  {
    id: 'lab-fan-steps',
    def: 'fan',
    title: 'Вентилятор: больше и меньше',
    about: 'S1 прибавляет обороты, S2 убавляет.',
    intro: [
      'Восемь ступеней оборотов. S1 поднимает ступень, S2 опускает; заполнение ШИМ',
      'пропорционально номеру ступени.',
    ],
    use: ['clk', 's1', 's2', 'leds'],
    links: [['PWM', 'drive', 'out', 'Вход вентилятора: ШИМ']],
    body: `${press('s1')}
${press('s2')}
  reg [2:0] level = 3'd2;
  always @(posedge clk) begin
    if (s1_press && level != 3'd7) level <= level + 1'b1;
    if (s2_press && level != 3'd0) level <= level - 1'b1;
  end
  reg [2:0] ramp = 0;
  always @(posedge clk) ramp <= ramp + 1'b1;
  assign drive = (ramp < level) | (level == 3'd7);
  assign led_n = ~{3'b000, level};`,
    topic: 'dsp',
    objective: 'Регулировать обороты вентилятора двумя кнопками через ступени ШИМ.',
    observe: 'Обороты меняются на ступень за нажатие; на нулевой ступени вентилятор стоит.',
    experiment:
      'Запретите ступени ниже второй: настоящий вентилятор на малом заполнении не стартует.',
  },
  {
    id: 'lab-fan-wave',
    def: 'fan',
    title: 'Вентилятор: волна оборотов',
    about: 'Обороты сами плавно растут и падают.',
    intro: [
      'Заполнение ШИМ ходит вверх и вниз треугольником — вентилятор то разгоняется, то',
      'притормаживает, как при автоматической регулировке.',
    ],
    use: ['clk', 'leds'],
    links: [['PWM', 'drive', 'out', 'Вход вентилятора: ШИМ']],
    body: `  reg [15:0] slow = 0;
  always @(posedge clk) slow <= slow + 1'b1;
  reg [8:0] wave = 0;            // старший бит — направление
  always @(posedge clk) if (slow == 0) wave <= wave + 1'b1;
  wire [7:0] duty = wave[8] ? ~wave[7:0] : wave[7:0];   // треугольник из пилы
  assign drive = slow[7:0] < duty;
  assign led_n = ~duty[7:2];`,
    topic: 'dsp',
    objective: 'Получить треугольный закон изменения оборотов из пилообразного счётчика.',
    observe: 'Обороты плавно растут до максимума и так же плавно падают до нуля, без скачка.',
    experiment: 'Ограничьте обороты снизу четвертью. Сделайте пилу вместо треугольника.',
  },
  {
    id: 'lab-vibro-hold',
    def: 'vibro',
    title: 'Вибромотор: отклик на кнопку',
    about: 'Мотор вибрирует, пока нажата S1.',
    intro: ['Тактильный отклик, как в телефоне: вибрация идёт, пока нажата кнопка S1.'],
    use: ['s1', 'leds'],
    links: [['IN', 'buzz', 'out', 'Вход вибромотора: 1 включает']],
    body: `  assign buzz = s1;
  assign led_n = {5'b11111, ~s1};`,
    topic: 'gates',
    objective: 'Дать тактильный отклик на нажатие кнопки прямым соединением входа с выходом.',
    observe: 'Вибромотор и LED0 работают ровно столько, сколько нажата S1.',
    experiment: 'Ограничьте вибрацию одним коротким импульсом на каждое нажатие.',
  },
  {
    id: 'lab-vibro-pattern',
    def: 'vibro',
    title: 'Вибромотор: двойной сигнал',
    about: 'Два коротких импульса и пауза, как уведомление.',
    intro: [
      'Узор вибрации записан в восьмибитной константе: бит на тик. «Два коротких и пауза»',
      'повторяется по кругу.',
    ],
    use: ['clk', 'leds'],
    links: [['IN', 'buzz', 'out', 'Вход вибромотора: 1 включает']],
    body: `${div(20)}
  localparam [7:0] PATTERN = 8'b00000101;   // читается с младшего бита
  reg [2:0] index = 0;
  always @(posedge clk) if (tick) index <= index + 1'b1;
  assign buzz = PATTERN[index];
  assign led_n = {5'b11111, ~buzz};`,
    topic: 'memory',
    objective: 'Воспроизвести узор вибрации по битам константы.',
    observe: 'Мотор даёт два коротких толчка подряд и молчит до конца цикла.',
    experiment:
      'Задайте узор «длинный — короткий — короткий». Запускайте узор один раз по кнопке S1.',
  },
  {
    id: 'lab-servo-sweep',
    def: 'servo',
    title: 'Сервопривод: качание',
    about: 'Вал ходит от 0° до 180° и обратно.',
    intro: [
      'Сервоприводу нужен импульс раз в 20 мс. Его длина задаёт угол: 1 мс — 0°, 2 мс — 180°.',
      'В тактах 27 МГц это 540 000 на период и от 27 000 до 54 000 на импульс.',
    ],
    use: ['clk', 'leds'],
    links: [['PWM', 'pulse', 'out', 'Управляющий импульс сервопривода']],
    body: `  localparam PERIOD = 540000;    // 20 мс
  reg [19:0] count = 0;
  wire frame = (count == PERIOD - 1);
  always @(posedge clk) count <= frame ? 20'd0 : count + 1'b1;
  reg [15:0] width = 16'd27000;  // 1 мс
  reg rising = 1;
  always @(posedge clk)
    if (frame) begin              // новый угол — раз в период
      if (rising) begin width <= width + 16'd1350; if (width >= 16'd52650) rising <= 0; end
      else        begin width <= width - 16'd1350; if (width <= 16'd28350) rising <= 1; end
    end
  assign pulse = count < width;
  assign led_n = {5'b11111, ~rising};`,
    topic: 'clocks',
    objective: 'Сформировать импульс сервопривода заданной длительности с периодом 20 мс.',
    observe: 'Стрелка идёт от 0° к 180° и обратно шагами по 9°; LED0 показывает направление.',
    experiment: 'Поставьте логический анализатор на импульс и измерьте его. Остановите вал на 90°.',
  },
  {
    id: 'lab-servo-buttons',
    def: 'servo',
    title: 'Сервопривод: три положения',
    about: 'S1 ставит вал в 0°, S2 — в 180°, без кнопок — середина.',
    intro: [
      'Длина импульса выбирается кнопками: 1 мс, 1,5 мс или 2 мс. Импульс повторяется каждые',
      '20 мс, иначе сервопривод теряет положение.',
    ],
    use: ['clk', 's1', 's2', 'leds'],
    links: [['PWM', 'pulse', 'out', 'Управляющий импульс сервопривода']],
    body: `  localparam PERIOD = 540000;    // 20 мс
  reg [19:0] count = 0;
  always @(posedge clk) count <= (count == PERIOD - 1) ? 20'd0 : count + 1'b1;
  wire [15:0] width = s1 ? 16'd27000 : s2 ? 16'd54000 : 16'd40500;
  assign pulse = count < width;
  assign led_n = {4'b1111, ~s2, ~s1};`,
    topic: 'clocks',
    objective: 'Выбрать угол сервопривода длительностью импульса: 1, 1,5 и 2 миллисекунды.',
    observe: 'Вал стоит на 90°, уходит в 0° при S1 и в 180° при S2, возвращается при отпускании.',
    experiment: 'Добавьте положение 45°. Запомните последнее положение, чтобы вал не возвращался.',
  },
  {
    id: 'lab-stepper-rotate',
    def: 'stepper',
    title: 'Шаговый мотор: вращение',
    about: 'Единица бежит по четырём обмоткам, вал шагает.',
    intro: [
      'У мотора четыре обмотки. Если включать их по очереди, вал делает шаг за шагом.',
      'Здесь единица бежит по четырёхбитному кольцевому регистру.',
    ],
    use: ['clk', 'leds'],
    links: bus(['IN1', 'IN2', 'IN3', 'IN4'], 'coil', 'out', 'Обмотка мотора'),
    body: `${div(20)}
  reg [3:0] phase = 4'b0001;
  always @(posedge clk) if (tick) phase <= {phase[2:0], phase[3]};
  assign coil = phase;
  assign led_n = ~{2'b00, phase};`,
    topic: 'state',
    objective: 'Вращать шаговый мотор, включая обмотки по очереди кольцевым регистром.',
    observe: 'Вал поворачивается на шаг за тик; на LED платы видна бегущая обмотка.',
    experiment:
      'Увеличьте скорость и найдите, где шаги сливаются. Остановите мотор, сняв единицу со всех обмоток.',
  },
  {
    id: 'lab-stepper-reverse',
    def: 'stepper',
    title: 'Шаговый мотор: реверс и полушаг',
    about: 'S1 меняет направление; обмотки включаются по одной и по две.',
    intro: [
      'Полушаговый режим: между шагами включаются две соседние обмотки сразу. Шагов на',
      'оборот становится вдвое больше, ход плавнее. S1 разворачивает направление.',
    ],
    use: ['clk', 's1', 'leds'],
    links: bus(['IN1', 'IN2', 'IN3', 'IN4'], 'coil', 'out', 'Обмотка мотора'),
    body: `${div(20)}
${press('s1')}
  reg back = 0;
  reg [2:0] step = 0;
  always @(posedge clk) begin
    if (s1_press) back <= ~back;
    if (tick) step <= back ? step - 1'b1 : step + 1'b1;
  end
  reg [3:0] phase;
  always @* begin
    case (step)
      3'd0: phase = 4'b0001;  3'd1: phase = 4'b0011;
      3'd2: phase = 4'b0010;  3'd3: phase = 4'b0110;
      3'd4: phase = 4'b0100;  3'd5: phase = 4'b1100;
      3'd6: phase = 4'b1000;  default: phase = 4'b1001;
    endcase
  end
  assign coil = phase;
  assign led_n = ~{back, 1'b0, phase};`,
    topic: 'fsm',
    objective: 'Управлять шаговым мотором в полушаговом режиме и менять направление вращения.',
    observe: 'Обмотки включаются то по одной, то по две; после S1 вал идёт в обратную сторону.',
    experiment:
      'Вернитесь к полному шагу и сравните ход. Сделайте ровно один оборот по нажатию S2.',
  },
  // ---------- Микросхемы ----------
  {
    id: 'lab-sr595-chaser',
    def: 'sr595',
    title: '74HC595: восемь выходов по трём проводам',
    about: 'Бегущий огонь выдвигается в сдвиговый регистр бит за битом.',
    intro: [
      'Микросхема принимает биты по одному: бит с DS вдвигается по фронту SHCP, а фронт STCP',
      'выводит все восемь бит на выходы разом. Три провода управляют восемью светодиодами.',
    ],
    use: ['clk', 'leds'],
    links: [
      ['DS', 'ser', 'out', 'Данные: очередной бит'],
      ['SHCP', 'shift', 'out', 'Такт сдвига: фронт вдвигает бит'],
      ['STCP', 'latch', 'out', 'Защёлка: фронт выводит байт на выходы'],
      ['Q7S', 'carry', 'in', 'Выход переноса: старый старший бит'],
    ],
    body: `${div(20)}
  reg [7:0] pattern = 8'b00000001;
  // Передача: 16 шагов — на чётных выставляем бит, на нечётных поднимаем SHCP; затем STCP.
  reg [4:0] step = 5'd17;        // 17 — «свободно»
  reg [9:0] pace = 0;
  always @(posedge clk) begin
    pace <= pace + 1'b1;
    if (tick) begin
      pattern <= {pattern[6:0], pattern[7]};
      step <= 0;
    end else if (pace == 0 && step != 5'd17) step <= step + 1'b1;
  end
  wire [2:0] bit_index = 3'd7 - step[3:1];   // старший бит идёт первым
  assign ser = pattern[bit_index];
  assign shift = (step < 5'd16) & step[0];
  assign latch = (step == 5'd16);
  assign led_n = {4'b1111, ~carry, ~latch};`,
    topic: 'interfaces',
    objective: 'Передать байт в сдвиговый регистр 74HC595 последовательно и защёлкнуть его.',
    observe:
      'Светодиоды на микросхеме меняются все сразу по импульсу STCP, хотя биты пришли по одному.',
    experiment:
      'Уберите импульс STCP и посмотрите, что останется на выходах. Передавайте младший бит первым.',
  },
  {
    id: 'lab-sr595-counter',
    def: 'sr595',
    title: '74HC595: двоичный счётчик на выходах',
    about: 'Восьмибитное число растёт и каждый раз целиком передаётся в регистр.',
    intro: [
      'Тот же обмен, но данные — счётчик. После каждого шага счёта байт заново уходит в',
      'микросхему, и её светодиоды показывают число в двоичном виде.',
    ],
    use: ['clk', 'leds'],
    links: [
      ['DS', 'ser', 'out', 'Данные: очередной бит'],
      ['SHCP', 'shift', 'out', 'Такт сдвига: фронт вдвигает бит'],
      ['STCP', 'latch', 'out', 'Защёлка: фронт выводит байт на выходы'],
      ['Q7S', 'carry', 'in', 'Выход переноса: старый старший бит'],
    ],
    body: `${div(20)}
  reg [7:0] number = 0;
  reg [4:0] step = 5'd17;
  reg [9:0] pace = 0;
  always @(posedge clk) begin
    pace <= pace + 1'b1;
    if (tick) begin
      number <= number + 1'b1;
      step <= 0;
    end else if (pace == 0 && step != 5'd17) step <= step + 1'b1;
  end
  wire [2:0] bit_index = 3'd7 - step[3:1];
  assign ser = number[bit_index];
  assign shift = (step < 5'd16) & step[0];
  assign latch = (step == 5'd16);
  assign led_n = ~number[5:0];`,
    topic: 'interfaces',
    objective:
      'Вывести счётчик на светодиоды через последовательный интерфейс сдвигового регистра.',
    observe:
      'Светодиоды микросхемы считают в двоичном виде, шесть младших бит повторяются на LED платы.',
    experiment: 'Передавайте число в коде Грея. Сократите паузу между битами и найдите предел.',
  },
  {
    id: 'lab-sr165-read',
    def: 'sr165',
    opts: { switches: 0b10110100 },
    title: '74HC165: восемь входов по трём проводам',
    about: 'Схема читает восемь переключателей последовательно.',
    intro: [
      'Микросхема запоминает восемь входов по нулю на PL и выдвигает их по одному на Q7 по',
      'фронтам CP. Схема собирает биты обратно в байт.',
    ],
    use: ['clk', 'leds'],
    links: [
      ['PL', 'load', 'out', 'Загрузка: 0 запоминает входы'],
      ['CP', 'shift', 'out', 'Такт сдвига: фронт выдвигает бит'],
      ['Q7', 'ser', 'in', 'Последовательный выход: старший бит первым'],
    ],
    body: `  // Цикл из 32 шагов: загрузка, затем 8 раз «прочитать бит — сдвинуть».
  reg [9:0] pace = 0;
  reg [4:0] step = 0;
  reg [7:0] shifter = 0, value = 0;
  always @(posedge clk) begin
    pace <= pace + 1'b1;
    if (pace == 0) begin
      step <= step + 1'b1;
      // На чётных шагах 2…16 на Q7 стоит очередной бит: забираем его.
      if (step >= 5'd2 && step <= 5'd16 && !step[0]) shifter <= {shifter[6:0], ser};
      if (step == 5'd18) value <= shifter;
    end
  end
  assign load = ~(step == 5'd0);
  assign shift = (step >= 5'd2 && step <= 5'd17) & step[0];
  assign led_n = ~value[5:0];`,
    topic: 'interfaces',
    objective: 'Прочитать восемь входов через сдвиговый регистр 74HC165 по одному проводу данных.',
    observe:
      'Шесть младших переключателей микросхемы повторяются на LED платы с небольшой задержкой.',
    experiment: 'Покажите на светодиодах старшие шесть бит. Опрашивайте регистр вдвое реже.',
  },
  {
    id: 'lab-sr165-ones',
    def: 'sr165',
    opts: { switches: 0b00010111 },
    title: '74HC165: сколько переключателей включено',
    about: 'Схема считает единицы среди восьми входов.',
    intro: [
      'Биты приходят по одному — удобно считать единицы прямо на лету: каждый принятый',
      'бит прибавляется к сумме. Результат от 0 до 8 виден на светодиодах.',
    ],
    use: ['clk', 'leds'],
    links: [
      ['PL', 'load', 'out', 'Загрузка: 0 запоминает входы'],
      ['CP', 'shift', 'out', 'Такт сдвига: фронт выдвигает бит'],
      ['Q7', 'ser', 'in', 'Последовательный выход: старший бит первым'],
    ],
    body: `  reg [9:0] pace = 0;
  reg [4:0] step = 0;
  reg [3:0] sum = 0, ones = 0;
  always @(posedge clk) begin
    pace <= pace + 1'b1;
    if (pace == 0) begin
      step <= step + 1'b1;
      if (step == 5'd0) sum <= 0;
      if (step >= 5'd2 && step <= 5'd16 && !step[0]) sum <= sum + ser;
      if (step == 5'd18) ones <= sum;
    end
  end
  assign load = ~(step == 5'd0);
  assign shift = (step >= 5'd2 && step <= 5'd17) & step[0];
  assign led_n = ~{2'b00, ones};`,
    topic: 'arithmetic',
    objective: 'Подсчитать число единиц в байте, принимая его последовательно.',
    observe: 'На светодиодах число включённых переключателей микросхемы — от 0 до 8.',
    experiment: 'Зажигайте LED5, когда единиц нечётное число: получится бит чётности.',
  },
  // ---------- Приборы ----------
  {
    id: 'lab-probe-pwm',
    def: 'probe',
    title: 'Логический пробник: заполнение 25 %',
    about: 'Пробник показывает уровень, заполнение и частоту сигнала.',
    intro: [
      'Сигнал с заполнением 25 %: единица четверть периода. Пробник измеряет это сам —',
      'так проверяют ШИМ без осциллографа.',
    ],
    use: ['clk', 'leds'],
    links: [['IN', 'signal', 'out', 'Измеряемый сигнал']],
    body: `  reg [9:0] count = 0;
  always @(posedge clk) count <= count + 1'b1;
  assign signal = (count < 10'd256);   // 256 из 1024 — четверть периода
${LEDS_OFF}`,
    topic: 'clocks',
    objective: 'Измерить заполнение и частоту сигнала логическим пробником.',
    observe: 'Пробник показывает около 25 % и частоту 27 МГц / 1024 ≈ 26,4 кГц.',
    experiment: 'Получите 75 % и 10 %. Измените период так, чтобы частота стала ровно 10 кГц.',
  },
  {
    id: 'lab-probe-select',
    def: 'probe',
    title: 'Логический пробник: три частоты',
    about: 'S1 переключает частоту сигнала на пробнике.',
    intro: [
      'Каждый бит счётчика — меандр вдвое более низкой частоты, чем соседний младший.',
      'S1 выбирает, какой бит подать на пробник.',
    ],
    use: ['clk', 's1', 'leds'],
    links: [['IN', 'signal', 'out', 'Измеряемый сигнал']],
    body: `${press('s1')}
  reg [15:0] count = 0;
  always @(posedge clk) count <= count + 1'b1;
  reg [1:0] choice = 0;
  always @(posedge clk) if (s1_press) choice <= (choice == 2'd2) ? 2'd0 : choice + 1'b1;
  assign signal = (choice == 2'd0) ? count[9] : (choice == 2'd1) ? count[12] : count[15];
  assign led_n = ~{4'b0000, choice};`,
    topic: 'clocks',
    objective: 'Получить несколько частот из разных битов одного счётчика.',
    observe: 'Частота на пробнике падает в восемь раз с каждым нажатием; заполнение всегда 50 %.',
    experiment: 'Вычислите частоту бита 12 и сравните с прибором. Добавьте четвёртую частоту.',
  },
  {
    id: 'lab-freq-1khz',
    def: 'freq-counter',
    title: 'Частотомер: ровно 1 кГц',
    about: 'Делитель с точным коэффициентом даёт 1 кГц из 27 МГц.',
    intro: [
      'Нужна точная частота, а не «какой-нибудь бит счётчика». Период 1 кГц — 27 000 тактов,',
      'полупериод — 13 500: счётчик считает до него и переворачивает выход.',
    ],
    use: ['clk', 'leds'],
    links: [['IN', 'signal', 'out', 'Измеряемый сигнал']],
    body: `  localparam HALF = 13500;       // 27 000 000 / 1000 / 2
  reg [13:0] count = 0;
  reg wave = 0;
  always @(posedge clk)
    if (count == HALF - 1) begin count <= 0; wave <= ~wave; end
    else count <= count + 1'b1;
  assign signal = wave;
${LEDS_OFF}`,
    topic: 'clocks',
    objective: 'Получить точную частоту делителем с произвольным коэффициентом.',
    observe: 'Частотомер показывает 1,00 кГц: счёт до 13 500 даёт ровно тысячу периодов в секунду.',
    experiment: 'Получите 50 Гц и 440 Гц. Объясните, почему 3 кГц получится точно, а 7 кГц — нет.',
  },
  {
    id: 'lab-freq-octaves',
    def: 'freq-counter',
    title: 'Частотомер: удвоение частоты',
    about: 'Каждое нажатие S1 поднимает частоту вдвое.',
    intro: [
      'Полупериод хранится в регистре. Нажатие S1 сдвигает его вправо на один бит — делит',
      'пополам, и частота удваивается: 1, 2, 4, 8 кГц.',
    ],
    use: ['clk', 's1', 'leds'],
    links: [['IN', 'signal', 'out', 'Измеряемый сигнал']],
    body: `${press('s1')}
  reg [1:0] octave = 0;
  always @(posedge clk) if (s1_press) octave <= octave + 1'b1;
  wire [13:0] half = 14'd13500 >> octave;   // сдвиг вправо делит на 2, 4, 8
  reg [13:0] count = 0;
  reg wave = 0;
  always @(posedge clk)
    if (count >= half - 1) begin count <= 0; wave <= ~wave; end
    else count <= count + 1'b1;
  assign signal = wave;
  assign led_n = ~{4'b0000, octave};`,
    topic: 'arithmetic',
    objective: 'Удваивать частоту, деля период сдвигом вправо.',
    observe: 'Частотомер показывает 1, 2, 4 и 8 кГц по кругу; номер ступени на LED платы.',
    experiment:
      'Сделайте шаг в полтора раза. Проверьте, что 8 кГц получается не совсем точно, и объясните.',
  },
  {
    id: 'lab-volt-half',
    def: 'voltmeter',
    title: 'Вольтметр: половина напряжения',
    about: 'ШИМ с заполнением 50 % даёт в среднем 1,65 В.',
    intro: [
      'Вольтметр усредняет сигнал. Половину времени на выводе 3,3 В, половину — 0 В, поэтому',
      'среднее равно 1,65 В. Так цифровой выход изображает аналоговое напряжение.',
    ],
    use: ['clk', 'leds'],
    links: [['IN', 'signal', 'out', 'Измеряемый сигнал']],
    body: `  reg [7:0] ramp = 0;
  always @(posedge clk) ramp <= ramp + 1'b1;
  assign signal = ramp < 8'd128;
${LEDS_OFF}`,
    topic: 'dsp',
    objective: 'Получить среднее напряжение 1,65 В из цифрового сигнала с заполнением 50 %.',
    observe: 'Вольтметр показывает 1,65 В, хотя на выводе бывают только 0 и 3,3 В.',
    experiment: 'Получите 1,0 В: посчитайте порог сравнения. Снимите тот же сигнал пробником.',
  },
  {
    id: 'lab-volt-steps',
    def: 'voltmeter',
    title: 'Вольтметр: ступени напряжения',
    about: 'S1 перебирает заполнение ШИМ: 0, 25, 50 и 100 %.',
    intro: [
      'Простейший цифро-аналоговый преобразователь: число задаёт заполнение ШИМ, а среднее',
      'напряжение пропорционально числу.',
    ],
    use: ['clk', 's1', 'leds'],
    links: [['IN', 'signal', 'out', 'Измеряемый сигнал']],
    body: pwmSteps('signal'),
    topic: 'dsp',
    objective: 'Задать напряжение числом через заполнение ШИМ, как в простом ЦАП.',
    observe: 'Вольтметр показывает 0, около 0,83, 1,65 и 3,30 В; номер ступени на LED платы.',
    experiment:
      'Сделайте шестнадцать ступеней по 0,2 В. Объясните, почему ступень 255 из 256 — не ровно 3,3 В.',
  },
  {
    id: 'lab-analyzer-counter',
    def: 'analyzer',
    title: 'Логический анализатор: биты счётчика',
    about: 'Четыре бита счётчика на временной диаграмме.',
    intro: [
      'Анализатор рисует сигналы во времени. Четыре соседних бита счётчика — это четыре',
      'меандра, каждый вдвое медленнее предыдущего.',
    ],
    use: ['clk', 'leds'],
    links: bus(['1', '2', '3', '4'], 'bits', 'out', 'Бит счётчика'),
    body: `  reg [8:0] count = 0;
  always @(posedge clk) count <= count + 1'b1;
  assign bits = count[8:5];
${LEDS_OFF}`,
    topic: 'clocks',
    objective: 'Увидеть на временной диаграмме, как биты счётчика делят частоту на два.',
    observe:
      'Каждая следующая дорожка меняется вдвое реже предыдущей; вместе они образуют двоичный счёт.',
    experiment:
      'Поменяйте окно просмотра в свойствах. Выведите счётчик в коде Грея и сравните диаграммы.',
  },
  {
    id: 'lab-analyzer-spi',
    def: 'analyzer',
    opts: { window: 20000 },
    title: 'Логический анализатор: посылка по трём проводам',
    about: 'Выбор, такт и данные последовательной передачи байта.',
    intro: [
      'Так выглядит передача байта по SPI: линия выбора CS опускается, на каждый такт SCK',
      'выставляется бит данных MOSI. Анализатор показывает все три линии и сам байт.',
    ],
    use: ['clk', 'leds'],
    links: [
      ['1', 'cs', 'out', 'Выбор устройства: 0 во время передачи'],
      ['2', 'sck', 'out', 'Такт передачи'],
      ['3', 'mosi', 'out', 'Данные: старший бит первым'],
      ['4', 'done', 'out', 'Импульс в конце посылки'],
    ],
    body: `  localparam [7:0] BYTE = 8'hA5;
  reg [8:0] pace = 0;
  reg [5:0] step = 0;            // 0…15 — восемь бит, дальше пауза
  always @(posedge clk) begin
    pace <= pace + 1'b1;
    if (pace == 0) step <= step + 1'b1;
  end
  wire active = (step < 6'd16);
  assign cs = ~active;
  assign sck = active & step[0];
  assign mosi = active & BYTE[3'd7 - step[3:1]];
  assign done = (step == 6'd16);
${LEDS_OFF}`,
    topic: 'interfaces',
    objective: 'Прочитать байт по временной диаграмме последовательной передачи.',
    observe: 'Пока CS = 0, идут восемь импульсов SCK; на фронтах SCK линия MOSI даёт 1010 0101.',
    experiment: 'Передайте другой байт и прочитайте его по диаграмме. Поменяйте порядок бит.',
  },
  {
    id: 'lab-pulse-count',
    def: 'pulse',
    opts: { hz: 1000 },
    title: 'Генератор импульсов: счёт внешних импульсов',
    about: 'Схема считает импульсы от генератора на столе.',
    intro: [
      'Генератор — внешний источник сигнала, не связанный с тактом платы. Сигнал сначала',
      'синхронизируют двумя триггерами, потом ловят фронт и считают.',
    ],
    use: ['clk', 's1', 'leds'],
    links: [['OUT', 'source', 'in', 'Выход генератора: меандр']],
    body: `${press('source')}
  reg [5:0] count = 0;
  always @(posedge clk)
    if (s1) count <= 0;
    else if (source_press) count <= count + 1'b1;
  assign led_n = ~count;`,
    topic: 'clocks',
    objective: 'Безопасно принять внешний несинхронный сигнал и подсчитать его фронты.',
    observe: 'Число на светодиодах растёт с частотой генератора; S1 обнуляет его.',
    experiment:
      'Меняйте частоту в свойствах генератора. Уберите синхронизатор и обсудите, чем это грозит на плате.',
  },
  {
    id: 'lab-pulse-divide',
    def: 'pulse',
    opts: { hz: 100 },
    title: 'Генератор импульсов: делитель на 2, 4 и 8',
    about: 'Внешний сигнал делится триггерами.',
    intro: [
      'Счётный триггер делит частоту пополам. Три таких ступени дают деление на 2, 4 и 8.',
      'LED0 повторяет сам сигнал, LED1–LED3 — поделённые частоты.',
    ],
    use: ['clk', 'leds'],
    links: [['OUT', 'source', 'in', 'Выход генератора: меандр']],
    body: `${press('source')}
  reg [2:0] divided = 0;
  always @(posedge clk) if (source_press) divided <= divided + 1'b1;
  assign led_n = ~{2'b00, divided, source_sync[1]};`,
    topic: 'clocks',
    objective: 'Поделить частоту внешнего сигнала счётными триггерами.',
    observe: 'LED1 мигает вдвое реже LED0, LED2 — вчетверо, LED3 — в восемь раз.',
    experiment:
      'Получите деление на 3: сбрасывайте счётчик на двойке. Сравните заполнение сигналов.',
  },
  {
    id: 'lab-uart-hello',
    def: 'uart',
    title: 'UART-терминал: строка «HELLO»',
    about: 'Схема раз за разом отправляет слово в терминал на столе.',
    intro: [
      'UART передаёт байт без такта: старт-бит, восемь бит данных, стоп-бит. Скорость 115200 бод',
      '— это 234 такта на бит. Буквы лежат в таблице, счётчик выбирает очередную.',
    ],
    use: ['clk', 'leds'],
    files: [{ name: 'uart_sender.v', content: UART_TX_V }],
    links: [
      ['RX', 'tx', 'out', 'Линия передачи: вход терминала'],
      ['TX', 'rx', 'in', 'Линия приёма: здесь не используется'],
    ],
    body: `${div(18)}
  reg [2:0] index = 0;
  reg [7:0] letter;
  always @* begin
    case (index)
      3'd0: letter = "H";  3'd1: letter = "E";  3'd2: letter = "L";
      3'd3: letter = "L";  3'd4: letter = "O";  3'd5: letter = 8'h0D;
      default: letter = 8'h0A;
    endcase
  end
  wire busy;
  reg send = 0;
  always @(posedge clk) begin
    send <= 0;
    if (tick && !busy) begin
      send <= 1;
      index <= (index == 3'd6) ? 3'd0 : index + 1'b1;
    end
  end
  // send приходит на такт позже index, поэтому байт выбираем по прошлому индексу.
  reg [7:0] data = 0;
  always @(posedge clk) if (tick && !busy) data <= letter;
  uart_sender sender (.clk(clk), .send(send), .data(data), .busy(busy), .tx(tx));
  assign led_n = {4'b1111, ~rx, ~busy};`,
    topic: 'interfaces',
    objective:
      'Передать строку по UART: старт-бит, восемь бит данных и стоп-бит на заданной скорости.',
    observe:
      'В терминале на столе строка за строкой появляется HELLO; LED0 вспыхивает на каждый байт.',
    experiment:
      'Поменяйте скорость в свойствах терминала на 9600 и исправьте делитель. Отправьте своё слово.',
  },
  {
    id: 'lab-uart-echo',
    def: 'uart',
    title: 'UART-терминал: эхо с заменой регистра',
    about: 'Схема принимает байт и возвращает его заглавной буквой.',
    intro: [
      'Приёмник ждёт старт-бит, отсчитывает полтора бита и читает восемь бит в серединах.',
      'Принятая строчная латинская буква возвращается заглавной: у них отличается один бит.',
    ],
    use: ['clk', 'leds'],
    files: [{ name: 'uart_sender.v', content: UART_TX_V }],
    links: [
      ['RX', 'tx', 'out', 'Линия передачи: вход терминала'],
      ['TX', 'rx', 'in', 'Линия приёма: выход терминала'],
    ],
    body: `  localparam BIT = 234;          // 27 МГц / 115200 бод
  reg [1:0] rx_sync = 2'b11;
  always @(posedge clk) rx_sync <= {rx_sync[0], rx};
  reg receiving = 0;
  reg [8:0] timer = 0;
  reg [3:0] bit_count = 0;
  reg [7:0] shifter = 0, received = 0;
  reg ready = 0;
  always @(posedge clk) begin
    ready <= 0;
    if (!receiving) begin
      if (!rx_sync[1]) begin receiving <= 1; timer <= BIT + BIT / 2 - 1; bit_count <= 0; end
    end else if (timer != 0) timer <= timer - 1'b1;
    else begin
      timer <= BIT - 1;
      if (bit_count == 4'd8) begin receiving <= 0; received <= shifter; ready <= 1; end
      else begin shifter <= {rx_sync[1], shifter[7:1]}; bit_count <= bit_count + 1'b1; end
    end
  end
  // Строчные a…z отличаются от заглавных битом 5.
  wire lower = (received >= "a") && (received <= "z");
  wire [7:0] answer = lower ? received & 8'hDF : received;
  // Передатчик может быть ещё занят прошлым байтом, когда пришёл новый: ответ ждёт в
  // регистре held, пока передатчик не освободится.
  wire busy;
  reg waiting = 0, send = 0;
  reg [7:0] held = 0;
  always @(posedge clk) begin
    send <= 0;
    if (ready) begin held <= answer; waiting <= 1; end
    else if (waiting && !busy && !send) begin send <= 1; waiting <= 0; end
  end
  uart_sender sender (.clk(clk), .send(send), .data(held), .busy(busy), .tx(tx));
  assign led_n = ~received[5:0];`,
    topic: 'interfaces',
    objective: 'Принять байт по UART, изменить его и отправить обратно.',
    observe:
      'Набранный в терминале текст возвращается заглавными буквами; код последнего байта на LED платы.',
    experiment:
      'Возвращайте следующую по алфавиту букву. Отвечайте только на цифры, остальное пропускайте.',
  },
);

/** Left edges for one, two or three parts above the board. */
const PLACES: Record<number, number[]> = { 1: [330], 2: [220, 660], 3: [200, 520, 800] };

function build(recipe: Recipe): { example: Example; bench: BenchPart[]; lesson: Lesson } {
  const fixtures: Fixture[] = [recipe, ...(recipe.extra ?? [])];
  const links = fixtures.flatMap((fixture) => fixture.links);
  if (links.length > CONTACTS.length) throw new Error(`${recipe.id}: too many wires`);
  let next = 0;
  const pins: LabPin[] = [];
  const bench = fixtures.map((fixture, index): BenchPart => {
    const wired: Record<string, number> = {};
    for (const [pin, signal, , note] of fixture.links) {
      const contact = CONTACTS[next++];
      wired[pin] = contact;
      pins.push([signal, contact, `${note} (контакт ${contact} гребёнки J5).`]);
    }
    return {
      def: fixture.def,
      x: (PLACES[fixtures.length] ?? PLACES[3])[index],
      ...(fixture.opts ? { opts: fixture.opts } : {}),
      pins: wired,
    };
  });
  const board: LabPin[] = [
    ...(recipe.use.includes('clk') ? [CLK] : []),
    ...(recipe.use.includes('s1') ? [S1] : []),
    ...(recipe.use.includes('s2') ? [S2] : []),
    ...(recipe.use.includes('leds') ? LEDS() : []),
  ];
  const source = `${recipe.intro.map((line) => `// ${line}`).join('\n')}
module top (
${ports(recipe.use, links)}
);
${recipe.body}
endmodule
`;
  return {
    example: labExample(
      recipe.id,
      recipe.title,
      `${recipe.about} На стенде: ${fixtures.length > 1 ? 'детали уже стоят и подключены' : 'деталь уже стоит и подключена'} — откройте «Лабораторию» и нажмите «Пуск».`,
      [{ name: 'top.v', content: source }, ...(recipe.files ?? [])],
      [...board, ...pins],
    ),
    bench,
    lesson: {
      level: 2,
      topic: recipe.topic,
      objective: recipe.objective,
      prerequisites: ['button'],
      observe: recipe.observe,
      experiment: recipe.experiment,
    },
  };
}

const built = recipes.map(build);
/** Examples for the plain parts of the laboratory: two for each part. */
export const partExamples: Example[] = built.map((item) => item.example);
export const partLessons: Record<string, Lesson> = Object.fromEntries(
  recipes.map((recipe, index) => [recipe.id, built[index].lesson]),
);
export const partBenches: Record<string, BenchPart[]> = Object.fromEntries(
  recipes.map((recipe, index) => [recipe.id, built[index].bench]),
);
