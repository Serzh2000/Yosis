export interface GlossaryTerm {
  id: string;
  /** How the term is shown in the glossary list. */
  term: string;
  /** What it means, in plain words. */
  meaning: string;
  /** An everyday comparison, when it helps. */
  analogy?: string;
  /** Spellings found in lesson text (case-insensitive, whole words). */
  pattern: RegExp;
}

// Russian word endings: stems below end with `\w*`, but only for words that do not collide with
// other terms (for example "бит" must not swallow "битстрим").
export const glossary: GlossaryTerm[] = [
  {
    id: 'fpga',
    term: 'ПЛИС (FPGA)',
    meaning:
      'Микросхема, внутри которой много одинаковых «кубиков». Ты сам решаешь, как их соединить, и она становится нужным устройством.',
    analogy:
      'Как набор конструктора: из одних и тех же деталей можно собрать и машину, и дом. Одна ПЛИС может стать и счётчиком, и светофором.',
    pattern: /\b(?:ПЛИС|FPGA)\b/i,
  },
  {
    id: 'bit',
    term: 'Бит',
    meaning: 'Одна ячейка информации. В ней может быть только 0 или 1.',
    analogy: 'Как выключатель: либо выключен (0), либо включён (1).',
    pattern: /\bбит(?:а|у|ом|е|ы|ов|ам|ами|ах)?\b/i,
  },
  {
    id: 'gate',
    term: 'Логический элемент (вентиль)',
    meaning: 'Крошечная схема, которая по одному или нескольким битам на входе выдаёт один бит.',
    analogy: 'Как правило в игре: «если обе кнопки нажаты, то лампа горит».',
    pattern: /\b(?:логическ\w+ элемент\w*|вентил\w+)\b/i,
  },
  {
    id: 'verilog',
    term: 'Verilog',
    meaning:
      'Язык, на котором описывают цифровые схемы. Это не программа, которая выполняется по порядку, а описание деталей и проводов.',
    analogy: 'Скорее чертёж, чем рецепт: он говорит, что с чем соединено.',
    pattern: /\bVerilog\b/i,
  },
  {
    id: 'module',
    term: 'Модуль',
    meaning: 'Блок схемы со своими входами и выходами. Из модулей собирают более крупные схемы.',
    analogy: 'Как деталь конструктора с разъёмами по краям.',
    pattern: /\bмодул(?:ь|я|ю|ем|е|и|ей|ям|ями|ях)\b/i,
  },
  {
    id: 'port',
    term: 'Порт',
    meaning: 'Вход или выход модуля: «разъём», через который сигнал попадает в блок или выходит.',
    pattern: /\bпорт(?:а|у|ом|е|ы|ов|ам|ами|ах)?\b/i,
  },
  {
    id: 'simulation',
    term: 'Симуляция',
    meaning: 'Проверка схемы на компьютере: он «играет» роль платы и показывает, что бы произошло.',
    analogy: 'Как примерка в приложении: проверяем, не покупая настоящую вещь.',
    pattern: /\bсимуляци\w*|\bсимулятор\w*/i,
  },
  {
    id: 'synthesis',
    term: 'Синтез',
    meaning:
      'Превращение текста на Verilog в список «кубиков» ПЛИС и соединений между ними. Его делает программа Yosys.',
    analogy: 'Как перевод рецепта в список покупок и порядок готовки.',
    pattern: /\bсинтез(?:а|у|ом|е|ировать|ируй|ируем|ируешь|ируйте)?\b/i,
  },
  {
    id: 'rtl',
    term: 'RTL',
    meaning:
      'Схема, нарисованная прямо по твоему тексту: логические элементы, регистры и провода. Она ещё не привязана к настоящей микросхеме.',
    pattern: /\bRTL\b/,
  },
  {
    id: 'netlist',
    term: 'Нетлист',
    meaning: 'Список всех деталей схемы и того, что с чем соединено.',
    pattern: /\bнетлист\w*/i,
  },
  {
    id: 'lut',
    term: 'LUT',
    meaning:
      'Маленькая таблица ответов: для каждой комбинации входов в ней записано, 0 или 1 выдать. Из таких таблиц ПЛИС собирает логику.',
    analogy: 'Как шпаргалка с готовыми ответами: смотришь строку и сразу видишь результат.',
    pattern: /\bLUT\d*\b/,
  },
  {
    id: 'register',
    term: 'Триггер и регистр',
    meaning:
      'Ячейка памяти на один бит: запоминает 0 или 1 и хранит, пока не придёт такт. Регистр — несколько триггеров рядом.',
    analogy: 'Как записная ячейка: пишешь число, и оно лежит там, пока не перепишешь.',
    pattern: /\b(?:триггер\w*|регистр(?:а|у|ом|е|ы|ов|ам|ами|ах)?)\b/i,
  },
  {
    id: 'clock',
    term: 'Такт',
    meaning:
      'Ровное «тик-тик-тик»: сигнал, который снова и снова меняется 0 → 1 → 0. По нему обновляется вся память схемы.',
    analogy: 'Как дирижёр: все музыканты вступают по его взмаху.',
    pattern: /\bтакт(?:а|у|ом|е|ы|ов|ам|ами|ах|овый|овая|овое|овые|ового|овой)?\b/i,
  },
  {
    id: 'edge',
    term: 'Фронт',
    meaning:
      'Момент, когда сигнал меняется. Положительный фронт (posedge) — переход из 0 в 1, отрицательный — из 1 в 0.',
    analogy: 'Как щелчок выключателя: важен сам момент щелчка.',
    pattern: /\b(?:фронт(?:а|у|ом|е|ы|ов|ам|ами|ах)?|posedge)\b/i,
  },
  {
    id: 'bus',
    term: 'Шина',
    meaning: 'Несколько проводов под одним именем. Например, led[5:0] — это шесть проводов.',
    analogy: 'Как кабель из нескольких жил.',
    pattern: /\bшин(?:а|ы|у|ой|е|ам|ами|ах)\b/i,
  },
  {
    id: 'width',
    term: 'Разрядность',
    meaning: 'Сколько бит в сигнале. В 4 битах помещаются числа от 0 до 15.',
    pattern: /\bразрядност\w*/i,
  },
  {
    id: 'active-level',
    term: 'Активный уровень',
    meaning:
      'Какой уровень «включает» устройство. Если включает 0, уровень называют активным низким. Светодиоды на плате Tang Nano 20K горят при 0.',
    analogy: 'Как лампочка, которая светится, когда ток «стекает» в землю через вывод.',
    pattern: /\bактивн\w+ (?:низк|высок)\w+(?: уровн\w+)?|\bактивн\w+ уровн\w+/i,
  },
  {
    id: 'combinational',
    term: 'Комбинационная логика',
    meaning: 'Схема без памяти: выход зависит только от того, что на входах прямо сейчас.',
    analogy: 'Лампочка и выключатель: щёлкнул, и лампа тут же отреагировала.',
    pattern: /\bкомбинационн\w+(?: логик\w+| схем\w+)?/i,
  },
  {
    id: 'sequential',
    term: 'Последовательная логика',
    meaning: 'Схема с памятью: выход зависит не только от входов, но и от того, что было раньше.',
    analogy: 'Счётчик шагов в телефоне: он помнит, сколько уже прошли.',
    pattern: /\bпоследовательн\w+ (?:логик\w+|схем\w+)/i,
  },
  {
    id: 'testbench',
    term: 'Тестбенч',
    meaning:
      'Программа-проверяльщик: подаёт на твою схему входы и смотрит, что получилось. В обучении мы запускаем её за тебя.',
    analogy: 'Как экзаменатор, который задаёт вопросы и сверяет ответы.',
    pattern: /\b(?:тестбенч\w*|testbench\w*)\b/i,
  },
  {
    id: 'mux',
    term: 'Мультиплексор',
    meaning: 'Переключатель сигналов: по выбору пропускает на выход один из нескольких входов.',
    analogy: 'Стрелка на железной дороге: решает, по какому пути поедет сигнал.',
    pattern: /\bмультиплексор\w*/i,
  },
  {
    id: 'decoder',
    term: 'Дешифратор',
    meaning:
      'Превращает число в «включи одну линию». Число 2 включает только третью лампу из ряда.',
    pattern: /\bдешифратор\w*/i,
  },
  {
    id: 'fsm',
    term: 'Автомат состояний',
    meaning:
      'Схема, которая в каждый момент находится в одном из нескольких состояний и переходит между ними по правилам.',
    analogy: 'Светофор: красный → зелёный → жёлтый → красный.',
    pattern: /\b(?:автомат\w* состояний|FSM)\b/i,
  },
  {
    id: 'cst',
    term: '.cst',
    meaning:
      'Файл-«карта проводов». В нём записано, какой порт твоей схемы подключён к какой ножке микросхемы.',
    pattern: /\.cst\b/i,
  },
  {
    id: 'pin',
    term: 'Вывод (пин)',
    meaning:
      'Металлическая ножка микросхемы. К ней на плате подключены светодиод, кнопка или разъём.',
    pattern: /\bпин(?:а|у|ом|е|ы|ов|ам|ами|ах)?\b/i,
  },
  {
    id: 'bitstream',
    term: 'Битстрим',
    meaning: 'Файл-прошивка: готовая настройка всех «кубиков» ПЛИС. Его загружают на плату.',
    pattern: /\bбитстрим\w*/i,
  },
  {
    id: 'literal',
    term: "Запись числа 4'b1010",
    meaning:
      "Число, записанное вместе с шириной и системой счисления. 4'b1010: «4 бита, двоичное, 1010». 6'd5: «6 бит, десятичное, 5».",
    pattern: /\b\d+'[bdhBDH][0-9a-fA-F_]+/,
  },
  {
    id: 'parameter',
    term: 'Параметр',
    meaning: 'Число, которое можно поменять в одном месте, и оно изменится во всём модуле.',
    analogy: 'Как настройка громкости: одна ручка, а звук меняется везде.',
    pattern: /\bпараметр(?:а|у|ом|е|ы|ов|ам|ами|ах)?\b/i,
  },
];

const LETTER = String.raw`[\p{L}\p{N}_]`;
const compiled = new WeakMap<RegExp, RegExp>();
/** JavaScript's \b and \w only know Latin letters; this makes them work for Russian words. */
function unicodePattern(pattern: RegExp): RegExp {
  let result = compiled.get(pattern);
  if (!result) {
    const source = pattern.source
      .replace(/\\b/g, (_match, offset: number, whole: string) => {
        const before = whole[offset - 1];
        const leading = offset === 0 || before === '|' || before === '(' || before === ':';
        return leading ? `(?<!${LETTER})` : `(?!${LETTER})`;
      })
      .replace(/\\w/g, LETTER);
    result = new RegExp(source, `${pattern.flags.replace(/[gu]/g, '')}u`);
    compiled.set(pattern, result);
  }
  return result;
}

export type GlossarySegment = string | { term: GlossaryTerm; text: string };

/**
 * Split text into plain pieces and the first occurrence of every glossary term.
 * Only the first mention of a term in a block is marked, so a paragraph stays readable.
 */
export function splitGlossary(
  text: string,
  options: { skip?: ReadonlySet<string> } = {},
): GlossarySegment[] {
  const found: { start: number; end: number; term: GlossaryTerm }[] = [];
  for (const term of glossary) {
    if (options.skip?.has(term.id)) continue;
    const match = unicodePattern(term.pattern).exec(text);
    if (match) found.push({ start: match.index, end: match.index + match[0].length, term });
  }
  found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const result: GlossarySegment[] = [];
  let cursor = 0;
  for (const item of found) {
    if (item.start < cursor) continue;
    if (item.start > cursor) result.push(text.slice(cursor, item.start));
    result.push({ term: item.term, text: text.slice(item.start, item.end) });
    cursor = item.end;
  }
  if (cursor < text.length) result.push(text.slice(cursor));
  return result;
}

export function findGlossaryTerm(id: string): GlossaryTerm | undefined {
  return glossary.find((term) => term.id === id);
}
export function searchGlossary(query: string): GlossaryTerm[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return glossary;
  return glossary.filter(
    (term) =>
      term.term.toLowerCase().includes(needle) || term.meaning.toLowerCase().includes(needle),
  );
}
