import type { LessonCase } from '../../../lib/lessons';
import type { VerilogLessonSpec } from './types';
import { t } from '../../../lib/i18n';

// Проверки автоматов строятся по потокам входов. Первые LEAD тактов держится сброс: входы в них
// «лежат» на автомате, а он обязан их проигнорировать. Бит i основного потока подаётся в такте
// LEAD + i, выход читается в конце того же такта, то есть после фронта, принявшего бит.
const LEAD = 3;

type Step = { cycle: number; inputs: Record<string, string> };

/** Потоки входов: `lead` действует во время сброса, `rows` после него (символ i в такте LEAD + i). */
function drive(rows: Record<string, string>, lead: Record<string, string> = {}): Step[] {
  const names = Object.keys(rows);
  const length = Math.max(...Object.values(rows).map((row) => row.length));
  return Array.from({ length: LEAD + length }, (_, cycle) => ({
    cycle,
    inputs: Object.fromEntries(
      names.map((name) => [
        name,
        cycle < LEAD ? (lead[name]?.[cycle] ?? '0') : (rows[name]![cycle - LEAD] ?? '0'),
      ]),
    ),
  }));
}

/**
 * Случаи по выбранным шагам: ключ — номер шага основного потока (-1 — последний такт сброса),
 * значение — подпись. `expected[шаг]` — ожидаемый выход, `before` — выход во время сброса.
 */
function pick(
  steps: Step[],
  expected: string[],
  titles: Record<number, string>,
  before = '0',
): LessonCase[] {
  return Object.entries(titles).map(([key, title]) => {
    const at = Number(key);
    const step = steps[at + LEAD]!;
    return {
      title,
      cycle: step.cycle,
      inputs: step.inputs,
      expected: at < 0 ? before : expected[at]!,
    };
  });
}

const stimuli = (steps: Step[]) =>
  steps.map((step) => ({ cycle: step.cycle, inputs: step.inputs }));
const lines = (rows: string[]) => rows.join('\n') + '\n';
const bits = (text: string) => text.split(' ');

// 1. Переключатель
const toggleSteps = drive({ btn: '0100101101' }, { btn: '111' });
const toggleExpected = bits('0 1 1 1 0 0 1 0 0 1');

// 2. Детектор 101: перед основным потоком во время сброса приходят «10»
const d101Steps = drive({ x: '10101100101101' }, { x: '010' });
const d101Expected = bits('0 0 1 0 1 0 0 0 0 0 1 0 0 1');

// 3. Детектор 1011: во время сброса приходит почти весь код, «101»
const d1011Steps = drive({ x: '1011011010111011' }, { x: '101' });
const d1011Expected = bits('0 0 0 1 0 0 1 0 0 0 0 1 0 0 0 1');

// 4. Мур и Мили
const mealySteps = drive({ take: '1101010010', x: '1011000101' });
const mealyExpected = bits('0 0 1 0 0 0 0 1 0 0');

// 5. Автомат с монетами: во время сброса бросают три монеты по 5
const vendSteps = drive(
  { coin5: '1110000100001', coin10: '0000110001010' },
  { coin5: '111', coin10: '000' },
);
const vendExpected = bits('0 0 1 0 0 1 0 0 0 1 0 0 1');

// 6. Кодовый замок: во время сброса вводят верный код 1, 0, 1
const lockSteps = drive(
  { b1: '1000111001000101', b0: '0011000100010010', lock: '0000000000001000' },
  { b1: '101', b0: '010' },
);
const lockExpected = bits('0 0 0 0 0 0 0 0 0 1 1 1 0 0 0 1');

// 7. Бегунок one-hot
const runnerSteps = drive({ go: '1101111101' }, { go: '111' });
const runnerExpected = bits('0010 0100 0100 1000 0001 0010 0100 1000 1000 0001');

// 9. Рукопожатие: во время сброса клиент уже держит req и ready
const shakeSteps = drive(
  { req: '01111101011101', ready: '00010001111001' },
  { req: '111', ready: '111' },
);
const shakeExpected = bits('0 0 0 1 1 1 0 0 0 0 1 1 0 0');

export const specs: VerilogLessonSpec[] = [
  {
    id: 'fsm-toggle',
    chapter: 'fsm',
    title: t('Автомат из двух состояний: кнопка-переключатель'),
    minutes: 8,
    theory: [
      {
        title: t('Что такое конечный автомат'),
        md: t(
          'Схема, у которой есть **память о прошлом**, ведёт себя по-разному в зависимости от того, что с ней уже было. Такую схему удобно описывать как **конечный автомат** (по-английски FSM, finite state machine): у него есть список **состояний**, и в каждый момент он находится ровно в одном из них.\n\nНа каждом фронте тактового сигнала автомат смотрит на входы и решает, остаться в своём состоянии или перейти в другое. Это правило называется **переходом**. Выход зависит от состояния: пока автомат в состоянии «включено», светодиод горит.\n\nСамый маленький полезный автомат имеет два состояния. Он помнит, горит ли светодиод, и каждое нажатие кнопки переворачивает это.',
        ),
        code: t(
          '            btn = 1\n  +--------+ ------------> +--------+\n  |  OFF   |               |   ON   |\n  | led = 0| <------------ | led = 1|\n  +--------+     btn = 1   +--------+\n\nбез нажатия (btn = 0) автомат остаётся где был',
        ),
      },
      {
        title: t('Состояние, переход, сброс'),
        md: t(
          'В Verilog состояние хранится в регистре `state`. Его меняет блок `always @(posedge clk)`: на каждом фронте он вычисляет, каким станет состояние. Имена состояний удобно задавать через `localparam`, чтобы в коде было `ON` и `OFF`, а не загадочные нули и единицы.\n\n**Сброс** нужен, чтобы автомат знал, с чего начинать, когда плата только включилась. Он стоит первым в цепочке `if`: если `reset` равен 1, то остальное неважно, автомат уходит в начальное состояние `OFF`.\n\nВыход здесь берётся прямо из состояния: `led` равен 1, когда `state` равен `ON`. Выход, который зависит только от состояния, называют выходом автомата Мура.',
        ),
        code: "localparam OFF = 1'b0, ON = 1'b1;\nreg state;\n\nalways @(posedge clk) begin\n    if (reset)\n        state <= OFF;\n    else if (btn)\n        state <= (state == OFF) ? ON : OFF;\nend\n\nassign led = (state == ON);",
      },
      {
        title: t('Про длинное нажатие'),
        md: t(
          'В проверках кнопка нажимается ровно на один такт. На настоящей плате человек держит кнопку тысячи тактов подряд, и такой автомат переключался бы на каждом из них, а светодиод мерцал бы. Чтобы этого не было, нужно реагировать не на «кнопка нажата», а на «кнопка только что нажата». Эту хитрость мы разберём позже, а пока научимся самому автомату.',
        ),
      },
    ],
    quiz: {
      question: t('Автомат в состоянии OFF, кнопка не нажата, приходит фронт такта. Что будет?'),
      options: [
        t('Автомат останется в OFF: перехода нет, пока btn равен 0'),
        t('Автомат перейдёт в ON, ведь пришёл фронт'),
        t('Автомат сбросится, потому что кнопка не нажата'),
      ],
      answer: 0,
      explain: t(
        'Фронт сам по себе только «даёт слово» автомату. Переход происходит, когда выполнено его условие, здесь это btn = 1. Без нажатия состояние сохраняется.',
      ),
    },
    practice: {
      text: t(
        'Доделай автомат: при btn = 1 на фронте состояние меняется на противоположное. Сброс важнее кнопки: при reset = 1 светодиод гаснет, даже если кнопка нажата.',
      ),
      starter: lines([
        '// Урок: кнопка-переключатель',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire btn,',
        '    output wire led',
        ');',
        "    localparam OFF = 1'b0, ON = 1'b1;",
        '    reg state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= OFF;',
        '        // TODO: при btn менять состояние на противоположное',
        '    end',
        '',
        '    assign led = (state == ON);',
        'endmodule',
      ]),
      solution: lines([
        '// Урок: кнопка-переключатель',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire btn,',
        '    output wire led',
        ');',
        "    localparam OFF = 1'b0, ON = 1'b1;",
        '    reg state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= OFF;',
        '        else if (btn)',
        '            state <= (state == OFF) ? ON : OFF;',
        '    end',
        '',
        '    assign led = (state == ON);',
        'endmodule',
      ]),
      output: 'led',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetActiveLow: false,
        resetCycles: LEAD,
        periodNs: 10,
        cycles: toggleSteps.length + 1,
        inputs: { btn: '0' },
        stimuli: stimuli(toggleSteps),
      },
      cases: pick(toggleSteps, toggleExpected, {
        '0': t('Кнопку не нажимали: светодиод погашен'),
        '1': t('Первое нажатие: светодиод горит'),
        '2': t('Кнопку отпустили: горит дальше'),
        '4': t('Второе нажатие: гаснет'),
        '6': t('Третье нажатие: горит'),
        '7': t('Четвёртое нажатие: гаснет'),
        '8': t('Кнопку отпустили: погашен'),
        '9': t('Пятое нажатие: горит'),
        '-1': t('Кнопка нажата во время сброса: светодиод не горит'),
      }),
      hints: [
        t('Нужна ещё одна ветка после if (reset): условие, что кнопка нажата.'),
        t('В этой ветке состояние должно стать противоположным: из OFF в ON, из ON в OFF.'),
        'else if (btn) state <= (state == OFF) ? ON : OFF;',
      ],
    },
  },
  {
    id: 'fsm-detect-101',
    chapter: 'fsm',
    title: t('Детектор последовательности 101'),
    minutes: 12,
    theory: [
      {
        title: t('Что ищет детектор'),
        md: t(
          'По одному проводу `x` в схему приходит поток нулей и единиц, по одному биту на такт. Детектор должен выдать `y = 1` в тот такт, когда **только что** пришли подряд биты 1, 0, 1. В остальные такты `y = 0`.\n\nПамяти для этого нужно мало. Автомату не надо помнить весь поток: достаточно знать, **какую часть нужной последовательности мы уже набрали**. Отсюда и состояния: ничего не набрано, набрана «1», набрано «10», набрано «101».',
        ),
        code: t(
          'поток x:   1 0 1 0 1 1 0\nответ y:   0 0 1 0 1 0 0\n               ^   ^\n          закончилась 101 (первый раз и второй)',
        ),
      },
      {
        title: t('Граф состояний'),
        md: t(
          'Состояний четыре. В `FOUND` автомат попадает, когда последовательность только что завершилась, и там выход равен 1. Дальше надо аккуратно решить, куда идти из `FOUND`: последний принятый бит был 1, а значит он может оказаться началом новой последовательности. Поэтому из `FOUND` по x = 1 мы идём в `GOT1`, а по x = 0 в `GOT10`: после 101 и нуля уже набраны «10».\n\nТак последовательности могут **перекрываться**: в потоке 10101 есть две последовательности 101, и у них общая единица посередине.',
        ),
        code: t(
          'IDLE  --x=1--> GOT1\nIDLE  --x=0--> IDLE\nGOT1  --x=1--> GOT1    (две единицы: хвост всё равно "1")\nGOT1  --x=0--> GOT10\nGOT10 --x=1--> FOUND   (y = 1)\nGOT10 --x=0--> IDLE\nFOUND --x=1--> GOT1    (101, затем 1: хвост "1")\nFOUND --x=0--> GOT10   (101, затем 0: хвост "10")\n\nreset из любого состояния ведёт в IDLE',
        ),
      },
      {
        title: t('Как записать'),
        md: t(
          'Состояния кодируем двумя битами, а переходы пишем через `case (state)`: для каждого состояния своя ветка с условием по `x`. Выход берём из состояния, как в прошлом уроке.\n\nОдин такт, пока автомат стоит в `FOUND`, и есть тот самый единственный такт, в который `y = 1`.',
        ),
        code: 'always @(posedge clk) begin\n    if (reset)\n        state <= IDLE;\n    else case (state)\n        IDLE:  state <= x ? GOT1  : IDLE;\n        GOT1:  state <= x ? GOT1  : GOT10;\n        GOT10: state <= x ? FOUND : IDLE;\n        FOUND: state <= x ? GOT1  : GOT10;\n        default: state <= IDLE;\n    endcase\nend\n\nassign y = (state == FOUND);',
      },
    ],
    quiz: {
      question: t(
        'Поток 1 1 0 1. Закончилась ли в нём последовательность 101, и в каком состоянии автомат после последнего бита?',
      ),
      options: [
        t('Да, закончилась: автомат в FOUND'),
        t('Нет: автомат в GOT1, так как последний бит 1, но перед ним был 1, а не 0'),
        t('Да, но автомат в IDLE, потому что в потоке есть лишняя единица'),
      ],
      answer: 0,
      explain: t(
        'Первая единица нас не смущает: из GOT1 по второй единице автомат остаётся в GOT1 (набрана «1», та, что последняя). Затем приходят 0 (GOT10) и 1 (FOUND). Лишние единицы в начале не мешают.',
      ),
    },
    practice: {
      text: t(
        'Допиши переходы автомата так, чтобы y = 1 ровно в тот такт, когда в потоке x только что завершилась последовательность 101. Последовательности могут перекрываться.',
      ),
      starter: lines([
        '// Урок: детектор 101',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire x,',
        '    output wire y',
        ');',
        "    localparam [1:0] IDLE = 2'd0, GOT1 = 2'd1, GOT10 = 2'd2, FOUND = 2'd3;",
        '    reg [1:0] state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= IDLE;',
        '        else case (state)',
        '            IDLE:  state <= x ? GOT1 : IDLE;',
        '            GOT1:  state <= x ? GOT1 : GOT10;',
        '            GOT10: state <= IDLE; // TODO: по x = 1 найдено',
        '            FOUND: state <= IDLE; // TODO: куда идти после находки',
        '            default: state <= IDLE;',
        '        endcase',
        '    end',
        '',
        "    assign y = 1'b0; // TODO: выход из состояния",
        'endmodule',
      ]),
      solution: lines([
        '// Урок: детектор 101',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire x,',
        '    output wire y',
        ');',
        "    localparam [1:0] IDLE = 2'd0, GOT1 = 2'd1, GOT10 = 2'd2, FOUND = 2'd3;",
        '    reg [1:0] state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= IDLE;',
        '        else case (state)',
        '            IDLE:  state <= x ? GOT1 : IDLE;',
        '            GOT1:  state <= x ? GOT1 : GOT10;',
        '            GOT10: state <= x ? FOUND : IDLE;',
        '            FOUND: state <= x ? GOT1 : GOT10;',
        '            default: state <= IDLE;',
        '        endcase',
        '    end',
        '',
        '    assign y = (state == FOUND);',
        'endmodule',
      ]),
      output: 'y',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetActiveLow: false,
        resetCycles: LEAD,
        periodNs: 10,
        cycles: d101Steps.length + 1,
        inputs: { x: '0' },
        stimuli: stimuli(d101Steps),
      },
      cases: pick(d101Steps, d101Expected, {
        '0': t('Во время сброса приходило 1 0, теперь 1: это не 101'),
        '1': t('Поток 1 0: ещё не готово'),
        '2': t('Поток 101: найдено'),
        '3': t('Сразу после находки: выход один такт, дальше 0'),
        '4': t('Поток 10101: найдено второй раз (перекрытие)'),
        '5': t('Следом единица: 011 не годится'),
        '7': t('Ложное начало 1 0 0: не годится'),
        '9': t('Снова ложное начало'),
        '10': t('Поток 101 после ложных начал: найдено'),
        '12': t('Поток 1 0 после находки: ещё не готово'),
        '13': t('Поток 101 после находки: найдено'),
      }),
      hints: [
        t(
          'Из GOT10 нужна ветка по x: единица завершает последовательность, ноль начинает всё заново.',
        ),
        t(
          'FOUND: последний бит был единицей. Если дальше 1, она может начать новую последовательность (GOT1), если 0, то уже набрано «10» (GOT10).',
        ),
        t('Выход: assign y = (state == FOUND);'),
      ],
    },
  },
  {
    id: 'fsm-detect-1011',
    chapter: 'fsm',
    title: t('Детектор 1011 с перекрытием'),
    minutes: 12,
    theory: [
      {
        title: t('Длиннее и коварнее'),
        md: t(
          'Теперь ищем 1011. Состояний пять: ничего, «1», «10», «101» и «1011» (находка). Новая трудность в том, что при **неудаче** нельзя просто возвращаться в начало: уже принятые биты могут быть началом новой попытки.\n\nПример: набрано «101», и приходит 0. Нужное было 1, значит 1011 не вышло. Но последние два бита теперь «10», это начало новой попытки. Правильный переход из «101» по x = 0 ведёт в `GOT10`, а не в `IDLE`.',
        ),
        code: t(
          'поток:  1 0 1 0 1 1\n        1 0 1 0        <- ждали 1, пришёл 0: попытка сорвана\n            1 0 1 1    <- но хвост "10" уже начало новой\nответ:  0 0 0 0 0 1',
        ),
      },
      {
        title: t('Граф состояний'),
        md: t(
          'Правило для расстановки переходов: из каждого состояния по каждому биту идём в состояние, которое соответствует **самому длинному хвосту потока, являющемуся началом 1011**.\n\n- из `FOUND` (хвост 1011) по 1 идём в `GOT1`: хвост «1»\n- из `FOUND` по 0 идём в `GOT10`: хвост «10»\n- из `GOT101` по 0 идём в `GOT10` (хвост «10»)\n- из `GOT10` по 0 идём в `IDLE`: хвоста нет\n\nПерекрытие в 1011 даёт общая единица: в потоке 1011011 последовательность заканчивается дважды.',
        ),
        code: t(
          'IDLE   --x=1--> GOT1\nIDLE   --x=0--> IDLE\nGOT1   --x=1--> GOT1     (две единицы: хвост всё равно "1")\nGOT1   --x=0--> GOT10\nGOT10  --x=1--> GOT101\nGOT10  --x=0--> IDLE     (хвоста нет)\nGOT101 --x=1--> FOUND    (y = 1)\nGOT101 --x=0--> GOT10    (хвост "10")\nFOUND  --x=1--> GOT1     (хвост "1")\nFOUND  --x=0--> GOT10    (хвост "10")',
        ),
      },
    ],
    quiz: {
      question: t('Автомат в GOT101 (набрано «101»), приходит 0. Куда ему надо перейти?'),
      options: [
        t('В GOT10: хвост «10» начало новой попытки'),
        t('В IDLE: попытка сорвана, начинаем заново'),
        t('В FOUND: 0 тоже подходит'),
      ],
      answer: 0,
      explain: t(
        'Из IDLE было бы потеряно «10», и поток 1 0 1 0 1 1 не дал бы находки, хотя она там есть. Всегда идём в состояние, соответствующее самому длинному подходящему хвосту.',
      ),
    },
    practice: {
      text: t(
        'Сделай детектор последовательности 1011: y = 1 в такт, когда она только что завершилась, перекрывающиеся находки считаются. Не забудь про «подлый» переход GOT101 по нулю.',
      ),
      starter: lines([
        '// Урок: детектор 1011',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire x,',
        '    output wire y',
        ');',
        "    localparam [2:0] IDLE = 3'd0, GOT1 = 3'd1, GOT10 = 3'd2, GOT101 = 3'd3, FOUND = 3'd4;",
        '    reg [2:0] state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= IDLE;',
        '        else case (state)',
        '            IDLE:   state <= x ? GOT1 : IDLE;',
        '            GOT1:   state <= x ? GOT1 : GOT10;',
        '            GOT10:  state <= x ? GOT101 : IDLE;',
        '            GOT101: state <= IDLE; // TODO: x = 1 даёт находку, x = 0 не в начало',
        '            FOUND:  state <= IDLE; // TODO: какой хвост остался после находки',
        '            default: state <= IDLE;',
        '        endcase',
        '    end',
        '',
        "    assign y = 1'b0; // TODO",
        'endmodule',
      ]),
      solution: lines([
        '// Урок: детектор 1011',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire x,',
        '    output wire y',
        ');',
        "    localparam [2:0] IDLE = 3'd0, GOT1 = 3'd1, GOT10 = 3'd2, GOT101 = 3'd3, FOUND = 3'd4;",
        '    reg [2:0] state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= IDLE;',
        '        else case (state)',
        '            IDLE:   state <= x ? GOT1 : IDLE;',
        '            GOT1:   state <= x ? GOT1 : GOT10;',
        '            GOT10:  state <= x ? GOT101 : IDLE;',
        '            GOT101: state <= x ? FOUND : GOT10;',
        '            FOUND:  state <= x ? GOT1 : GOT10;',
        '            default: state <= IDLE;',
        '        endcase',
        '    end',
        '',
        '    assign y = (state == FOUND);',
        'endmodule',
      ]),
      output: 'y',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetActiveLow: false,
        resetCycles: LEAD,
        periodNs: 10,
        cycles: d1011Steps.length + 1,
        inputs: { x: '0' },
        stimuli: stimuli(d1011Steps),
      },
      cases: pick(d1011Steps, d1011Expected, {
        '0': t('Во время сброса приходило 101, теперь 1: сброс стёр начало'),
        '2': t('Поток 101: ещё не готово'),
        '3': t('Поток 1011: найдено'),
        '4': t('Следом ноль: выход один такт'),
        '6': t('Поток 1011011: найдено второй раз (перекрытие)'),
        '7': t('После находки пошёл 0: ещё нет'),
        '10': t('Поток 10101: попытка сорвалась, но «10» осталось'),
        '11': t('Поток 101011: найдено, несмотря на срыв'),
        '12': t('После находки идёт 1: ещё нет'),
        '14': t('Поток 1 0 1 после находки: ещё не готово'),
        '15': t('Поток 1011 после находки: найдено'),
      }),
      hints: [
        t('Находка: из GOT101 по x = 1 идём в FOUND. А если x = 0?'),
        t(
          'Из GOT101 по нулю идём не в IDLE, а в GOT10: «10» в хвосте уже есть. FOUND ведёт себя как после «1» при x = 1 и как после «10» при x = 0.',
        ),
        'GOT101: state <= x ? FOUND : GOT10;  FOUND: state <= x ? GOT1 : GOT10;  assign y = (state == FOUND);',
      ],
    },
  },
  {
    id: 'fsm-moore-mealy',
    chapter: 'fsm',
    title: t('Мур и Мили: когда выход реагирует'),
    minutes: 12,
    theory: [
      {
        title: t('Два способа получить выход'),
        md: t(
          'В автоматах есть два классических вида.\n\n- **Автомат Мура**: выход зависит только от состояния. В прошлых уроках `y = (state == FOUND)` была именно такой. Выход меняется после фронта, когда сменилось состояние.\n- **Автомат Мили**: выход зависит от состояния **и** от текущего входа. Он может измениться сразу, как только изменился вход, не дожидаясь фронта.\n\nОбычно Мили выдаёт ответ на такт раньше: ему не нужно заводить отдельное состояние «нашёл», достаточно заметить, что мы в состоянии «набрано 10» и сейчас пришла единица.',
        ),
        code: t('Мур:   assign y = (state == FOUND);\nМили:  assign y = (state == GOT10) && x;'),
      },
      {
        title: t('Как увидеть разницу'),
        md: t(
          'В этом уроке у детектора 101 появляется вход **take** («принять бит»). Автомат переходит в следующее состояние только когда `take = 1`; когда `take = 0`, бит `x` просто лежит на входе, и состояние стоит.\n\nПредставь, что `x = 1`, а `take = 0`, и автомат в состоянии `GOT10`. В Мили выход уже равен 1: он видит и состояние, и входной бит. В Мура выход остаётся 0, пока автомат не принял бит и не пришёл в `FOUND`.\n\nА после того как бит принят (`take = 1`), состояние сменилось и у Мили единица пропала: условие «в GOT10 и x = 1» уже не выполняется.',
        ),
        code: t(
          '          take   x   state после фронта   Мур(FOUND)  Мили(GOT10 и x)\nтакт A:     0    1       GOT10                0            1\nтакт B:     1    1       GOT1                 0 -> 1 *     0\n\n* Мур поднимает выход уже после того, как принял бит.',
        ),
      },
      {
        title: t('Что делаешь ты'),
        md: t(
          'Автомат (состояния и переходы) уже написан. Тебе нужно записать **выход в стиле Мили**: единица, когда автомат в состоянии `GOT10`, а на входе прямо сейчас `x = 1`.\n\nОбрати внимание: выход здесь считается от состояния и входа без `always`, обычным `assign`. Это и есть признак Мили.',
        ),
      },
    ],
    quiz: {
      question: t('Чем выход Мили отличается от выхода Мура?'),
      options: [
        t('Он зависит не только от состояния, но и от текущих входов'),
        t('Он обновляется только по фронту, а Мура сразу'),
        t('Мили не нуждается в состояниях'),
      ],
      answer: 0,
      explain: t(
        'Мили сочетает состояние и входы, поэтому может измениться, как только изменится вход. Мур зависит только от состояния и поэтому меняется после фронта. Состояния нужны обоим.',
      ),
    },
    practice: {
      text: t(
        'Допиши выход y как у автомата Мили: y = 1, когда автомат в состоянии GOT10 и на входе x прямо сейчас единица. Не требуй при этом take.',
      ),
      starter: lines([
        '// Урок: выход в стиле Мили',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire x,',
        '    input wire take,',
        '    output wire y',
        ');',
        "    localparam [1:0] IDLE = 2'd0, GOT1 = 2'd1, GOT10 = 2'd2;",
        '    reg [1:0] state;',
        '',
        '    // Состояние меняется только когда take = 1',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= IDLE;',
        '        else if (take) begin',
        '            case (state)',
        '                IDLE:  state <= x ? GOT1 : IDLE;',
        '                GOT1:  state <= x ? GOT1 : GOT10;',
        '                GOT10: state <= x ? GOT1 : IDLE;',
        '                default: state <= IDLE;',
        '            endcase',
        '        end',
        '    end',
        '',
        "    assign y = 1'b0; // TODO: Мили: состояние и вход вместе",
        'endmodule',
      ]),
      solution: lines([
        '// Урок: выход в стиле Мили',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire x,',
        '    input wire take,',
        '    output wire y',
        ');',
        "    localparam [1:0] IDLE = 2'd0, GOT1 = 2'd1, GOT10 = 2'd2;",
        '    reg [1:0] state;',
        '',
        '    // Состояние меняется только когда take = 1',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= IDLE;',
        '        else if (take) begin',
        '            case (state)',
        '                IDLE:  state <= x ? GOT1 : IDLE;',
        '                GOT1:  state <= x ? GOT1 : GOT10;',
        '                GOT10: state <= x ? GOT1 : IDLE;',
        '                default: state <= IDLE;',
        '            endcase',
        '        end',
        '    end',
        '',
        '    assign y = (state == GOT10) && x;',
        'endmodule',
      ]),
      output: 'y',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetActiveLow: false,
        resetCycles: LEAD,
        periodNs: 10,
        cycles: mealySteps.length + 1,
        inputs: { x: '0', take: '0' },
        stimuli: stimuli(mealySteps),
      },
      cases: pick(mealySteps, mealyExpected, {
        '0': t('Бит 1 принят: рано, выход 0'),
        '1': t('Бит 0 принят (набрано «10», x = 0): выход 0'),
        '2': t('Бит 1 лежит на входе, take = 0: Мили уже отвечает 1'),
        '3': t('Бит 1 принят: состояние сменилось, выход снова 0'),
        '4': t('Ничего не принимаем, x = 0: выход 0'),
        '6': t('Набрано «10», x = 0, take = 0: выход 0'),
        '7': t('Набрано «10», x = 1, take = 0: выход 1'),
        '8': t('Бит 0 принят: «10» сорвалось, выход 0'),
        '9': t('x = 1 в состоянии IDLE: выход 0'),
      }),
      hints: [
        t('Выход должен быть единицей в двух условиях сразу: автомат в GOT10 и x равен 1.'),
        t('take в выходе не нужен: Мили отвечает на вход, пока бит ещё не принят.'),
        'assign y = (state == GOT10) && x;',
      ],
    },
  },
  {
    id: 'fsm-vending',
    chapter: 'fsm',
    title: t('Автомат с монетами: товар за 15'),
    minutes: 12,
    theory: [
      {
        title: t('Состояние как накопленная сумма'),
        md: t(
          'Автомат с газировкой принимает монеты по 5 и по 10 и отдаёт товар, когда набрано 15 или больше. Состояние здесь удобно назвать по накопленной сумме: `SUM0`, `SUM5`, `SUM10`. Когда сумма достигла 15, автомат переходит в `PAID` (оплачено) и выход `dispense` (выдать товар) равен 1 ровно на один такт. Следом автомат возвращается в `SUM0` и ждёт нового покупателя.\n\nМонета приходит одним тактом на входе `coin5` или `coin10`. Если монет нет, состояние не меняется: покупатель может подумать. Сдачи автомат не даёт: 10 + 10 тоже хватает на товар.\n\nСлово `release` в Verilog уже занято языком, поэтому выход называется `dispense`.',
        ),
        code: t(
          'SUM0  --coin5-->  SUM5\nSUM0  --coin10--> SUM10\nSUM5  --coin5-->  SUM10\nSUM5  --coin10--> PAID   (dispense = 1)\nSUM10 --coin5-->  PAID\nSUM10 --coin10--> PAID\nPAID  --любой---> SUM0\nнет монеты: остаёмся где были',
        ),
      },
      {
        title: t('Запись переходов'),
        md: t(
          'Таблица переходов часто яснее графа. Строки это состояния, столбцы это монеты.\n\nВ Verilog это `case`, внутри каждой ветки условия по монетам. Если ни одна монета не пришла, ветка ничего не присваивает, и регистр сохраняет старое значение.',
        ),
        code: t(
          'состояние | coin5 | coin10\nSUM0      | SUM5  | SUM10\nSUM5      | SUM10 | PAID\nSUM10     | PAID  | PAID\nPAID      | SUM0 (всегда)',
        ),
      },
    ],
    quiz: {
      question: t('В состоянии SUM10 приходит монета coin10. Что делает автомат?'),
      options: [
        t('Идёт в PAID: 20 уже хватает на товар, сдачи нет'),
        t('Остаётся в SUM10 и ждёт ещё монет'),
        t('Идёт в SUM0, лишняя монета возвращается'),
      ],
      answer: 0,
      explain: t(
        'Правило «15 или больше»: 10 + 10 = 20, значит оплата завершена. Наш автомат сдачи не выдаёт.',
      ),
    },
    practice: {
      text: t(
        'Допиши автомат: dispense = 1 на один такт, когда сумма монет по 5 и 10 достигла 15 или больше. После выдачи автомат снова ждёт монет. Сброс обнуляет накопленную сумму.',
      ),
      starter: lines([
        '// Урок: автомат с монетами',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire coin5,',
        '    input wire coin10,',
        '    output wire dispense',
        ');',
        "    localparam [1:0] SUM0 = 2'd0, SUM5 = 2'd1, SUM10 = 2'd2, PAID = 2'd3;",
        '    reg [1:0] state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= SUM0;',
        '        else case (state)',
        '            SUM0: begin',
        '                if (coin5) state <= SUM5;',
        '                else if (coin10) state <= SUM10;',
        '            end',
        '            // TODO: SUM5 и SUM10',
        '            PAID: state <= SUM0;',
        '            default: state <= SUM0;',
        '        endcase',
        '    end',
        '',
        "    assign dispense = 1'b0; // TODO",
        'endmodule',
      ]),
      solution: lines([
        '// Урок: автомат с монетами',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire coin5,',
        '    input wire coin10,',
        '    output wire dispense',
        ');',
        "    localparam [1:0] SUM0 = 2'd0, SUM5 = 2'd1, SUM10 = 2'd2, PAID = 2'd3;",
        '    reg [1:0] state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= SUM0;',
        '        else case (state)',
        '            SUM0: begin',
        '                if (coin5) state <= SUM5;',
        '                else if (coin10) state <= SUM10;',
        '            end',
        '            SUM5: begin',
        '                if (coin5) state <= SUM10;',
        '                else if (coin10) state <= PAID;',
        '            end',
        '            SUM10: begin',
        '                if (coin5 || coin10) state <= PAID;',
        '            end',
        '            PAID: state <= SUM0;',
        '            default: state <= SUM0;',
        '        endcase',
        '    end',
        '',
        '    assign dispense = (state == PAID);',
        'endmodule',
      ]),
      output: 'dispense',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetActiveLow: false,
        resetCycles: LEAD,
        periodNs: 10,
        cycles: vendSteps.length + 1,
        inputs: { coin5: '0', coin10: '0' },
        stimuli: stimuli(vendSteps),
      },
      cases: pick(vendSteps, vendExpected, {
        '0': t('Первая монета 5 после сброса: рано'),
        '1': t('5 + 5 = 10: рано'),
        '2': t('5 + 5 + 5 = 15: выдача'),
        '3': t('Следом тишина: выдача только один такт'),
        '5': t('10 + 10 = 20: выдача'),
        '6': t('Следом тишина: выдача закончилась'),
        '8': t('5, потом пауза без монет: ждём'),
        '9': t('5 + 10 = 15: выдача'),
        '10': t('Снова тишина: выдача закончилась'),
        '12': t('10 + 5 = 15: выдача'),
        '-1': t('Три монеты по 5 брошены во время сброса: выдачи нет'),
      }),
      hints: [
        t(
          'Для SUM5 нужны две ветки: coin5 ведёт в SUM10, coin10 в PAID. Для SUM10 любая монета приводит в PAID.',
        ),
        t('Если ни одна монета не пришла, ничего не присваивайте: состояние сохранится само.'),
        t('assign dispense = (state == PAID); а в SUM10: if (coin5 || coin10) state <= PAID;'),
      ],
    },
  },
  {
    id: 'fsm-door-lock',
    chapter: 'fsm',
    title: t('Кодовый замок: 1, 0, 1'),
    minutes: 12,
    theory: [
      {
        title: t('Чем замок отличается от детектора'),
        md: t(
          'Замок похож на детектор, но правила другие. У замка две кнопки: `b1` и `b0` (это «цифры» кода), и ещё кнопка `lock` («закрыть»).\n\n- Код 1, 0, 1. Пока кнопки не нажаты, замок просто ждёт: пауза между цифрами не ломает ввод.\n- Любая **неверная** цифра сбрасывает ввод в начало. Перекрытия нет: набрал 1, потом ещё раз 1, начинай заново.\n- Когда код введён, `unlock` становится 1 и **остаётся** 1, что бы ни нажимали, пока не нажмут `lock`.\n\nПоследний пункт важен: у замка есть состояние `OPEN`, из которого выход только по `lock` или сбросу.',
        ),
        code: t(
          'WAIT1  --b1-->   WAIT0\nWAIT0  --b0-->   WAIT1B\nWAIT0  --b1-->   WAIT1   (ошибка)\nWAIT1B --b1-->   OPEN    (unlock = 1)\nWAIT1B --b0-->   WAIT1   (ошибка)\nOPEN   --lock--> WAIT1\n\nбез нажатий: остаёмся в своём состоянии',
        ),
      },
      {
        title: t('Ожидание нужной кнопки'),
        md: t(
          'Назовём состояния по тому, что замок ждёт: `WAIT1` (ждёт первую единицу), `WAIT0` (ждёт ноль), `WAIT1B` (ждёт вторую единицу), `OPEN`.\n\nВ каждом состоянии две ветки: верная кнопка и неверная. Если не нажато ничего, ни одна ветка не сработает, и состояние сохраняется.\n\nВыход Мура: `unlock = (state == OPEN)`.',
        ),
        code: 'WAIT1:  if (b1) state <= WAIT0;\nWAIT0:  if (b0) state <= WAIT1B;\n        else if (b1) state <= WAIT1;\nWAIT1B: if (b1) state <= OPEN;\n        else if (b0) state <= WAIT1;\nOPEN:   if (lock) state <= WAIT1;',
      },
    ],
    quiz: {
      question: t('Нажато 1, потом ещё раз 1. Что сделает строгий замок?'),
      options: [
        t('Вернётся в начало: вторая единица стоит не на месте (ждали 0)'),
        t('Перейдёт к ожиданию единицы: две единицы подряд тоже подходят'),
        t('Откроется, потому что 1 уже была'),
      ],
      answer: 0,
      explain: t(
        'В состоянии «ждём ноль» единица не подходит, и строгий замок начинает ввод заново. Так отличается замок от детектора: у замка перекрытия нет.',
      ),
    },
    practice: {
      text: t(
        'Допиши кодовый замок: код 1, 0, 1 (кнопки b1, b0, b1). Неверная кнопка возвращает ввод в начало, пауза его не ломает. unlock держится в 1 до нажатия lock или сброса.',
      ),
      starter: lines([
        '// Урок: кодовый замок',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire b0,',
        '    input wire b1,',
        '    input wire lock,',
        '    output wire unlock',
        ');',
        "    localparam [1:0] WAIT1 = 2'd0, WAIT0 = 2'd1, WAIT1B = 2'd2, OPEN = 2'd3;",
        '    reg [1:0] state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= WAIT1;',
        '        else case (state)',
        '            WAIT1: if (b1) state <= WAIT0;',
        '            WAIT0: if (b0) state <= WAIT1B; // TODO: неверная кнопка',
        '            // TODO: WAIT1B и OPEN',
        '            default: state <= WAIT1;',
        '        endcase',
        '    end',
        '',
        "    assign unlock = 1'b0; // TODO",
        'endmodule',
      ]),
      solution: lines([
        '// Урок: кодовый замок',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire b0,',
        '    input wire b1,',
        '    input wire lock,',
        '    output wire unlock',
        ');',
        "    localparam [1:0] WAIT1 = 2'd0, WAIT0 = 2'd1, WAIT1B = 2'd2, OPEN = 2'd3;",
        '    reg [1:0] state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= WAIT1;',
        '        else case (state)',
        '            WAIT1: if (b1) state <= WAIT0;',
        '            WAIT0: begin',
        '                if (b0) state <= WAIT1B;',
        '                else if (b1) state <= WAIT1;',
        '            end',
        '            WAIT1B: begin',
        '                if (b1) state <= OPEN;',
        '                else if (b0) state <= WAIT1;',
        '            end',
        '            OPEN: if (lock) state <= WAIT1;',
        '            default: state <= WAIT1;',
        '        endcase',
        '    end',
        '',
        '    assign unlock = (state == OPEN);',
        'endmodule',
      ]),
      output: 'unlock',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetActiveLow: false,
        resetCycles: LEAD,
        periodNs: 10,
        cycles: lockSteps.length + 1,
        inputs: { b0: '0', b1: '0', lock: '0' },
        stimuli: stimuli(lockSteps),
      },
      cases: pick(lockSteps, lockExpected, {
        '2': t('Ввели 1, пауза, 0: ещё закрыто'),
        '3': t('Вместо второй цифры снова 0 (ждали единицу): ошибка'),
        '5': t('Два раза подряд 1: ошибка, ввод заново'),
        '9': t('Ввели 1, 0, пауза, 1: открыто'),
        '10': t('Ничего не нажимают: остаётся открыто'),
        '11': t('Нажали 0 при открытом замке: остаётся открыто'),
        '12': t('Нажали lock: закрыто'),
        '15': t('Новый ввод 1, 0, 1 после закрытия: открыто'),
        '-1': t('Верный код нажат во время сброса: замок закрыт'),
      }),
      hints: [
        t(
          'Неверная кнопка из WAIT0 и WAIT1B возвращает замок в WAIT1. Если нажата верная кнопка, идём вперёд, если ничего не нажато, ничего не присваиваем.',
        ),
        t('OPEN держит состояние, пока не нажмут lock: OPEN: if (lock) state <= WAIT1;'),
        t(
          'WAIT1B: begin if (b1) state <= OPEN; else if (b0) state <= WAIT1; end и assign unlock = (state == OPEN);',
        ),
      ],
    },
  },
  {
    id: 'fsm-onehot',
    chapter: 'fsm',
    title: t('Бегущий огонёк и кодировка one-hot'),
    minutes: 8,
    theory: [
      {
        title: t('Один бит на состояние'),
        md: t(
          'До сих пор состояния кодировались числами: 0, 1, 2, 3. Это **двоичная кодировка**. Есть другая, **one-hot** («одна горячая»): на каждое состояние отдельный бит, и в любой момент горит ровно один. Для четырёх состояний это четыре бита: `0001`, `0010`, `0100`, `1000`.\n\nПлюс в том, что дешифровать ничего не надо: бит состояния сам служит сигналом «мы в состоянии №3». Минус в том, что регистров больше. В ПЛИС регистров много, поэтому one-hot там популярна.',
        ),
        code: t(
          'состояние   двоичная   one-hot\nS0              00      0001\nS1              01      0010\nS2              10      0100\nS3              11      1000',
        ),
      },
      {
        title: t('Бегунок'),
        md: t(
          'Бегущий огонёк на четырёх светодиодах как раз ходит по состояниям one-hot: горит один, и с каждым тактом он сдвигается влево, а из последнего возвращается в первый. Регистр состояния и есть выход `leds`.\n\nСдвиг влево на единицу записывается `{leds[2:0], leds[3]}`: три младших бита становятся старшими, а старший уходит в младший разряд. Вход `go` разрешает сдвиг; при `go = 0` огонёк стоит. Сброс ставит огонёк в начало, `0001`.\n\nОбрати внимание: на настоящей плате светодиод включается нулём, но здесь `leds` это просто сигнал, в котором 1 означает «горит».',
        ),
        code: t(
          'такт 0:  0001\nтакт 1:  0010\nтакт 2:  0100\nтакт 3:  1000\nтакт 4:  0001   (круг замкнулся)',
        ),
      },
    ],
    quiz: {
      question: t('Чем one-hot отличается от двоичной кодировки для автомата из 4 состояний?'),
      options: [
        t('Один бит на состояние: 4 бита вместо 2, зато ничего не надо дешифровать'),
        t('Состояний может быть меньше, ведь one-hot экономит память'),
        t('Он работает без тактового сигнала'),
      ],
      answer: 0,
      explain: t(
        'One-hot тратит больше триггеров (по одному на состояние), но каждое состояние читается одним битом, без сравнений. Число состояний и такт от кодировки не зависят.',
      ),
    },
    practice: {
      text: t(
        'Сделай бегунок: сброс ставит 0001, а при go = 1 на каждом фронте единица сдвигается на бит влево по кругу (после 1000 снова 0001). При go = 0 огонёк стоит.',
      ),
      starter: lines([
        '// Урок: бегунок one-hot',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire go,',
        '    output reg [3:0] leds',
        ');',
        '    always @(posedge clk) begin',
        '        if (reset)',
        "            leds <= 4'b0001;",
        '        else if (go)',
        '            leds <= leds; // TODO: сдвиг влево по кругу',
        '    end',
        'endmodule',
      ]),
      solution: lines([
        '// Урок: бегунок one-hot',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire go,',
        '    output reg [3:0] leds',
        ');',
        '    always @(posedge clk) begin',
        '        if (reset)',
        "            leds <= 4'b0001;",
        '        else if (go)',
        '            leds <= {leds[2:0], leds[3]};',
        '    end',
        'endmodule',
      ]),
      output: 'leds',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetActiveLow: false,
        resetCycles: LEAD,
        periodNs: 10,
        cycles: runnerSteps.length + 1,
        inputs: { go: '1' },
        stimuli: stimuli(runnerSteps),
      },
      cases: pick(
        runnerSteps,
        runnerExpected,
        {
          '0': t('Первый шаг: огонёк в бите 1'),
          '1': t('Второй шаг: бит 2'),
          '2': t('Пауза go = 0: огонёк стоит'),
          '3': t('Третий шаг: бит 3'),
          '4': t('Круг замкнулся: снова бит 0'),
          '5': t('Новый круг начался'),
          '7': t('Опять бит 3'),
          '8': t('Пауза go = 0: огонёк стоит на бите 3'),
          '9': t('Круг замкнулся второй раз'),
          '-1': t('go = 1 во время сброса: огонёк в начале, 0001'),
        },
        '0001',
      ),
      hints: [
        t('Сдвиг на бит влево без потери: старший бит должен вернуться в младший разряд.'),
        t('Три младших бита leds[2:0] станут старшими, а leds[3] встанет на место младшего.'),
        'leds <= {leds[2:0], leds[3]};',
      ],
    },
  },
  {
    id: 'fsm-pattern',
    chapter: 'fsm',
    title: t('Генератор последовательности из четырёх значений'),
    minutes: 8,
    theory: [
      {
        title: t('Автомат без входов'),
        md: t(
          'Бывает автомат, которому входы не нужны: он просто идёт по кругу сам, по одному шагу за такт. Состояния делают роль «номера шага», а выход определяется номером. Так работают генераторы сигналов: мигалки, сирены, управление шаговым двигателем.\n\nНапример, на выходе `y` из двух бит надо по кругу получать значения 3, 1, 0, 2. Состояние хранит номер шага от 0 до 3, и он растёт на каждом такте. Дойдя до 3, двухбитный счётчик сам переходит в 0, потому что 3 + 1 в двух битах это 0.',
        ),
        code: t(
          'шаг (state)   y\n    0        11\n    1        01\n    2        00\n    3        10\nдальше снова шаг 0',
        ),
      },
      {
        title: t('Номер шага и значение: case'),
        md: t(
          'Связать номер шага с выходом удобно через `case` в блоке `always @*`: для каждого номера записано своё значение, как строка в таблице. Такой автомат называется автоматом Мура: выход зависит только от состояния.\n\nПорядок значений ты выбираешь сам, а любое другое можно задать, просто поменяв строки таблицы. Сброс возвращает автомат на шаг 0.',
        ),
        code: "always @* begin\n    case (state)\n        2'd0: y = 2'b11;\n        2'd1: y = 2'b01;\n        2'd2: y = 2'b00;\n        2'd3: y = 2'b10;\n    endcase\nend",
      },
    ],
    quiz: {
      question: t(
        'Двухбитный счётчик шага дошёл до 3. Что будет на следующем такте, если ничего не писать про переполнение?',
      ),
      options: [
        t('Он станет 0: 3 + 1 не умещается в двух битах, и остаётся 00'),
        t('Он остановится на 3'),
        t('Он станет 4, ведь выход шире'),
      ],
      answer: 0,
      explain: t(
        'Регистр из двух бит хранит числа 0..3. При прибавлении единицы к 3 старший бит теряется, остаётся 00, и круг замыкается сам.',
      ),
    },
    practice: {
      text: t(
        'Допиши таблицу выхода: на шагах 0, 1, 2, 3 выход y равен 11, 01, 00, 10. Номер шага уже считается; сброс возвращает его на шаг 0.',
      ),
      starter: lines([
        '// Урок: генератор последовательности',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    output reg [1:0] y',
        ');',
        '    reg [1:0] state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        "            state <= 2'd0;",
        '        else',
        "            state <= state + 2'd1;",
        '    end',
        '',
        '    always @* begin',
        '        case (state)',
        "            2'd0: y = 2'b11;",
        '            // TODO: шаги 1, 2 и 3',
        "            default: y = 2'b00;",
        '        endcase',
        '    end',
        'endmodule',
      ]),
      solution: lines([
        '// Урок: генератор последовательности',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    output reg [1:0] y',
        ');',
        '    reg [1:0] state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        "            state <= 2'd0;",
        '        else',
        "            state <= state + 2'd1;",
        '    end',
        '',
        '    always @* begin',
        '        case (state)',
        "            2'd0: y = 2'b11;",
        "            2'd1: y = 2'b01;",
        "            2'd2: y = 2'b00;",
        "            2'd3: y = 2'b10;",
        "            default: y = 2'b00;",
        '        endcase',
        '    end',
        'endmodule',
      ]),
      output: 'y',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetActiveLow: false,
        resetCycles: LEAD,
        periodNs: 10,
        cycles: 12,
        inputs: {},
      },
      cases: [
        { title: t('Во время сброса: шаг 0, выход 11'), cycle: 2, inputs: {}, expected: '11' },
        { title: t('Шаг 1: выход 01'), cycle: 3, inputs: {}, expected: '01' },
        { title: t('Шаг 2: выход 00'), cycle: 4, inputs: {}, expected: '00' },
        { title: t('Шаг 3: выход 10'), cycle: 5, inputs: {}, expected: '10' },
        { title: t('Круг замкнулся: шаг 0, выход 11'), cycle: 6, inputs: {}, expected: '11' },
        { title: t('Шаг 1 второго круга: выход 01'), cycle: 7, inputs: {}, expected: '01' },
        { title: t('Шаг 2 второго круга: выход 00'), cycle: 8, inputs: {}, expected: '00' },
        { title: t('Шаг 3 второго круга: выход 10'), cycle: 9, inputs: {}, expected: '10' },
        { title: t('Третий круг начался: выход 11'), cycle: 10, inputs: {}, expected: '11' },
      ],
      hints: [
        t('Каждая строка case: номер шага, двоеточие, значение выхода. Нужны ещё три строки.'),
        t('Шаг 1 даёт 01, шаг 2 даёт 00, шаг 3 даёт 10.'),
        "2'd1: y = 2'b01;  2'd2: y = 2'b00;  2'd3: y = 2'b10;",
      ],
    },
  },
  {
    id: 'fsm-handshake',
    chapter: 'fsm',
    title: t('Рукопожатие req/ack'),
    minutes: 12,
    theory: [
      {
        title: t('Договор двух устройств'),
        md: t(
          'Когда два устройства передают друг другу данные и работают с разной скоростью, им нужен «договор». Самый простой называется **рукопожатием** (handshake):\n\n- клиент поднимает **req** («запрос») и держит его;\n- сервер, когда готов, поднимает **ack** («подтверждение»);\n- клиент видит ack и опускает req;\n- сервер видит, что req опущен, и опускает ack.\n\nПока кто-то не ответил, другой ждёт. Скорость поэтому неважна: оба знают, что шаг сделан.',
        ),
        code: t(
          'req   ____/~~~~~~~~~~~~~~~\\____\nack   _________/~~~~~~~\\_____\n          ^ запрос  ^ ответ  ^ запрос снят, затем ответ снят',
        ),
      },
      {
        title: t('Сервер как автомат'),
        md: t(
          'Сервер удобно описать тремя состояниями.\n\n- `IDLE`: запроса нет, ack = 0.\n- `WORK`: запрос пришёл, но данные ещё не готовы (вход `ready` равен 0). Сервер ждёт. Если клиент передумал и опустил req, сервер возвращается в `IDLE`.\n- `ACK`: данные готовы, ack = 1. Он держится, пока req равен 1, и снимается, когда клиент опустил req.\n\nВыход ack берётся из состояния (Мур): `ack = (state == ACK)`. Заметь, что готовность `ready` нужна только в `WORK`; в `ACK` её уже можно не смотреть.',
        ),
        code: t(
          'IDLE --req=1-->           WORK\nWORK --req=0-->           IDLE   (клиент передумал)\nWORK --req=1, ready=1--> ACK    (ack = 1)\nACK  --req=0-->           IDLE\n\nв IDLE и WORK ack = 0; из ACK ждём только падения req',
        ),
      },
    ],
    quiz: {
      question: t('Сервер в состоянии ACK, а клиент всё ещё держит req = 1. Что делает ack?'),
      options: [
        t('Остаётся 1: клиент не сказал, что принял ответ'),
        t('Падает в 0: ответ дан, дольше не нужно'),
        t('Мигает, пока не придёт ready'),
      ],
      answer: 0,
      explain: t(
        'Смысл рукопожатия в том, что ack держится, пока клиент не опустит req. Если бы сервер сам опускал ack, клиент мог бы пропустить ответ.',
      ),
    },
    practice: {
      text: t(
        'Допиши сервер: из IDLE по req = 1 идём в WORK; из WORK по ready = 1 (и пока req = 1) идём в ACK, а при req = 0 возвращаемся в IDLE; из ACK уходим в IDLE, когда req опущен. ack = 1 только в ACK.',
      ),
      starter: lines([
        '// Урок: рукопожатие req/ack',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire req,',
        '    input wire ready,',
        '    output wire ack',
        ');',
        "    localparam [1:0] IDLE = 2'd0, WORK = 2'd1, ACK = 2'd2;",
        '    reg [1:0] state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= IDLE;',
        '        else case (state)',
        '            IDLE: if (req) state <= WORK;',
        '            // TODO: WORK и ACK',
        '            default: state <= IDLE;',
        '        endcase',
        '    end',
        '',
        "    assign ack = 1'b0; // TODO",
        'endmodule',
      ]),
      solution: lines([
        '// Урок: рукопожатие req/ack',
        'module top (',
        '    input wire clk,',
        '    input wire reset,',
        '    input wire req,',
        '    input wire ready,',
        '    output wire ack',
        ');',
        "    localparam [1:0] IDLE = 2'd0, WORK = 2'd1, ACK = 2'd2;",
        '    reg [1:0] state;',
        '',
        '    always @(posedge clk) begin',
        '        if (reset)',
        '            state <= IDLE;',
        '        else case (state)',
        '            IDLE: if (req) state <= WORK;',
        '            WORK: begin',
        '                if (!req) state <= IDLE;',
        '                else if (ready) state <= ACK;',
        '            end',
        '            ACK: if (!req) state <= IDLE;',
        '            default: state <= IDLE;',
        '        endcase',
        '    end',
        '',
        '    assign ack = (state == ACK);',
        'endmodule',
      ]),
      output: 'ack',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetActiveLow: false,
        resetCycles: LEAD,
        periodNs: 10,
        cycles: shakeSteps.length + 1,
        inputs: { req: '0', ready: '0' },
        stimuli: stimuli(shakeSteps),
      },
      cases: pick(shakeSteps, shakeExpected, {
        '2': t('Запрос есть, данные не готовы: ack = 0'),
        '3': t('Данные готовы: ack = 1'),
        '5': t('ready снова 0, req держится: ack держится'),
        '6': t('Клиент опустил req: ack снят'),
        '7': t('Новый req при готовых данных: сначала WORK, ack = 0'),
        '8': t('Клиент передумал до ответа: ack не появляется'),
        '10': t('Запрос и готовность: ack = 1'),
        '11': t('Готовность пропала, req держится: ack держится'),
        '12': t('Клиент снова опустил req: ack снят'),
        '13': t('Новый запрос: ack = 0'),
        '-1': t('req и ready держались во время сброса: ack = 0'),
      }),
      hints: [
        t(
          'В WORK сначала проверь, что клиент не ушёл (req = 0, тогда в IDLE), и только потом ready.',
        ),
        t('В ACK единственное условие выхода: req опустился.'),
        'WORK: if (!req) state <= IDLE; else if (ready) state <= ACK;  ACK: if (!req) state <= IDLE;  assign ack = (state == ACK);',
      ],
    },
  },
];
