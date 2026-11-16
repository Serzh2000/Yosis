// The schematic book: the same road as the Verilog book, but the device is drawn from blocks in
// the schematic editor. A circuit is judged by the simulator like Verilog is, and the last
// chapter takes it to the board: parts on the bench, wired to the pins.
import { emptyCircuit, newCircuitNode } from '../../../shared/schematic';
import { combinationalCases, config, type LessonCase } from '../../lib/lessons';
import { authoredSchematicChapters, schematicChapters } from './authored';
import type { BenchState, BookDef, ChapterDef, CircuitExercise, PageDef } from './schema';
import { t } from '../../lib/i18n';

/**
 * A starter with the ports already placed: inputs on the left, the output `y` on the right. The
 * learner brings the blocks between them; the ports are what the checks drive and read.
 */
function circuitExercise(inputs: string[], cases: LessonCase[]): CircuitExercise {
  const doc = emptyCircuit();
  inputs.forEach((name, index) => {
    const node = newCircuitNode(doc, 'input', { width: 1 }, name);
    node.name = name;
    node.x = 60;
    node.y = 60 + index * 110;
    doc.nodes.push(node);
  });
  const out = newCircuitNode(doc, 'output', { width: 1 }, 'y');
  out.name = 'y';
  out.x = 560;
  out.y = 60 + ((inputs.length - 1) * 110) / 2;
  doc.nodes.push(out);
  return {
    project: {
      name: 'Схема из урока',
      top: 'top',
      board: 'tangnano20k',
      files: [{ name: 'top.ysch', content: JSON.stringify(doc, null, 2) }],
    },
    config: config(cases),
    cases,
    output: 'y',
  };
}
const table = (names: string[], expected: string[]) =>
  combinationalCases(
    expected.map((_, row) =>
      Object.fromEntries(
        names.map((name, index) => [name, String((row >> (names.length - 1 - index)) & 1)]),
      ),
    ),
    expected,
  );

const circuitPage = (
  id: string,
  title: string,
  md: string,
  task: string,
  exercise: CircuitExercise,
): PageDef => ({
  id,
  title,
  blocks: [{ kind: 'text', md }],
  task: { kind: 'circuit', text: task, exercise },
});

const wirePage = circuitPage(
  'circuit-wire',
  t('Провод: вход прямо в выход'),
  t('Схема — это рисунок устройства: блоки и провода между ними. Слева стоит **вход** `a`, справа **выход** `y`. Сигнал идёт слева направо.\n\nЧтобы соединить, потяните провод от контакта входа к контакту выхода. Когда схема готова, нажмите «Проверить»: Logra превратит рисунок в Verilog и прогонит его в симуляторе.'),
  t('Соедини вход a с выходом y, чтобы y всегда повторял a.'),
  circuitExercise(['a'], table(['a'], ['0', '1'])),
);
const notPage = circuitPage(
  'circuit-not',
  t('Инвертор: НЕ'),
  t('Блок **НЕ (NOT)** меняет 0 на 1 и 1 на 0. Найдите его в палитре элементов, поставьте между входом и выходом и соедините всё проводами.'),
  t('Собери схему, в которой y — это «не a».'),
  circuitExercise(['a'], table(['a'], ['1', '0'])),
);
const andPage = circuitPage(
  'circuit-and',
  t('Элемент И'),
  t('Блок **И (AND)** даёт 1 только тогда, когда оба входа равны 1. Это «и то, и другое сразу».'),
  t('Собери y = a И b.'),
  circuitExercise(['a', 'b'], table(['a', 'b'], ['0', '0', '0', '1'])),
);
const orPage = circuitPage(
  'circuit-or',
  t('Элемент ИЛИ'),
  t('Блок **ИЛИ (OR)** даёт 1, когда хотя бы один вход равен 1.'),
  t('Собери y = a ИЛИ b.'),
  circuitExercise(['a', 'b'], table(['a', 'b'], ['0', '1', '1', '1'])),
);
const xorPage = circuitPage(
  'circuit-xor',
  t('Исключающее ИЛИ'),
  t('Блок **XOR** даёт 1, когда входы **разные**. Если оба 0 или оба 1, выход 0.'),
  t('Собери y = a XOR b.'),
  circuitExercise(['a', 'b'], table(['a', 'b'], ['0', '1', '1', '0'])),
);
const comboPage = circuitPage(
  'circuit-combo',
  t('Две ступени: (a И b) ИЛИ c'),
  t('Схемы можно строить по ступеням: выход одного блока идёт на вход другого. Сначала **И** для a и b, потом **ИЛИ** с сигналом c.'),
  t('Собери y = (a И b) ИЛИ c.'),
  circuitExercise(
    ['a', 'b', 'c'],
    table(['a', 'b', 'c'], ['0', '1', '0', '1', '0', '1', '1', '1']),
  ),
);

// The bench: parts that the design drives or reads are put on the table and wired to the board.
const partIds = (state: BenchState, def: string) =>
  state.layout.parts.filter((part) => part.def === def).map((part) => part.uid);
const hasPart = (def: string) => (state: BenchState) => partIds(state, def).length > 0;
const joined = (def: string) => (state: BenchState) => {
  const owners = new Set(partIds(state, def));
  return state.connections.wires.some((wire) => owners.has(wire.part));
};
const joinedPins = (def: string) => (state: BenchState) => {
  const owners = new Set(partIds(state, def));
  return new Set(state.connections.wires.filter((wire) => owners.has(wire.part)).map((w) => w.pin))
    .size;
};

const ledPage: PageDef = {
  id: 'led-first',
  title: t('Светодиод на столе'),
  blocks: [
    {
      kind: 'text',
      md: t('Схема живёт в плате, но свет и кнопки — это детали вокруг неё. Светодиод светится, когда через него идёт ток в одну сторону. У него два вывода: плюс (A) и минус (K).\n\nНа столе плата уже стоит на макетке. Поставьте светодиод и соедините его выводы с контактами платы.'),
    },
    { kind: 'parts', items: [{ def: 'led', count: 1 }] },
  ],
  task: {
    kind: 'build',
    text: t('Поставь светодиод на стол и соедини его выводы с контактами платы.'),
    until: (state) => joinedPins('led')(state) >= 2,
    checklist: [
      { text: t('Светодиод стоит на столе'), until: hasPart('led') },
      { text: t('Хотя бы один его вывод соединён с платой'), until: joined('led') },
      { text: t('Оба вывода соединены с платой'), until: (state) => joinedPins('led')(state) >= 2 },
    ],
  },
};
const buttonPage: PageDef = {
  id: 'button-first',
  title: t('Кнопка на столе'),
  blocks: [
    {
      kind: 'text',
      md: t('Кнопка замыкает цепь, пока её держат. Плата видит это как смену уровня на входе: 1 или 0.'),
    },
    { kind: 'parts', items: [{ def: 'button', count: 1 }] },
  ],
  task: {
    kind: 'build',
    text: t('Поставь кнопку на стол и подключи её к плате.'),
    until: (state) => joined('button')(state),
    checklist: [
      { text: t('Кнопка стоит на столе'), until: hasPart('button') },
      { text: t('Кнопка соединена с платой'), until: joined('button') },
    ],
  },
};
const quizPage: PageDef = {
  id: 'led-quiz',
  title: t('Проверь себя'),
  blocks: [
    {
      kind: 'quiz',
      question: t('Что нужно светодиоду, чтобы он засветился?'),
      options: [
        t('Ток в нужном направлении: от плюса к минусу'),
        t('Только чтобы он стоял на столе'),
        t('Два одинаковых вывода'),
      ],
      answer: 0,
      explain: t('Светодиод пропускает ток только в одну сторону, и светится, когда он идёт.'),
    },
  ],
  task: { kind: 'quiz', text: t('Выбери верный ответ.') },
};

/** Lessons written by hand, by chapter; the authored ones follow them in the same chapter. */
const handwritten: ChapterDef[] = [
  {
    id: 'blocks',
    title: t('Первые схемы'),
    lessons: [
      { id: 'wire', title: t('Провод'), minutes: 4, pages: [wirePage] },
      { id: 'not', title: t('Инвертор'), minutes: 4, pages: [notPage] },
      { id: 'gates', title: t('И, ИЛИ, XOR'), minutes: 8, pages: [andPage, orPage, xorPage] },
      { id: 'combo', title: t('Схема из двух ступеней'), minutes: 6, pages: [comboPage] },
    ],
  },
  {
    id: 'bench',
    title: t('Подключаем к плате'),
    lessons: [
      { id: 'led', title: t('Светодиод'), minutes: 5, pages: [ledPage, quizPage] },
      { id: 'button', title: t('Кнопка'), minutes: 5, pages: [buttonPage] },
    ],
  },
];
function mergedChapters(): ChapterDef[] {
  const authored = new Map(authoredSchematicChapters().map((chapter) => [chapter.id, chapter]));
  const own = new Map(handwritten.map((chapter) => [chapter.id, chapter]));
  return schematicChapters.flatMap((info) => {
    const lessons = [
      ...(own.get(info.id)?.lessons ?? []),
      ...(authored.get(info.id)?.lessons ?? []),
    ];
    return lessons.length ? [{ id: info.id, title: info.title, lessons }] : [];
  });
}

export const schematicBook: BookDef = {
  id: 'schematic',
  title: t('Схемы и плата'),
  mode: 'schematic',
  summary: t('Тянешь блоки, соединяешь провода и смотришь, как рисунок становится устройством.'),
  available: true,
  spine: { color: '#3d8bff' },
  chapters: mergedChapters(),
  reference: [],
};
