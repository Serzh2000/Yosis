# Соответствие глав учебника и уроков/примеров Logra.
# Читает TS-исходники регулярными выражениями, проверяет, что названия и id существуют,
# и порождает tex/chapters/a3_logra_map.tex по ручной карте (MAP, PROJECT ниже).
# Запуск из textbook/: python tools/gen_map.py [--dump] [--check]
#   без ключей: проверка + запись a3_logra_map.tex; --check: только проверка; --dump: список всех уроков.
# Функции для других скриптов: load_authored(), load_guided(), load_examples(), known_names().
import glob
import io
import os
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(REPO, 'src')
OUT = os.path.join(HERE, '..', 'tex', 'chapters', 'a3_logra_map.tex')


def _read(p):
    return io.open(p, encoding='utf8').read()


def _unesc(s):
    return s.replace("\\'", "'").replace('\\"', '"').replace('\\\\', '\\')


def load_authored():
    """{(book, id): (title, chapter)}; book: 'schematic' (Схемы) или 'verilog' (Verilog)."""
    res = {}
    rx = re.compile(
        r"\bid:\s*'([^']+)',\s*chapter:\s*'([^']+)',\s*title:\s*t\(\s*('|\")((?:\\.|(?!\3).)*)\3", re.S)
    for f in sorted(glob.glob(os.path.join(SRC, 'learn', 'content', 'authored', '*.ts'))):
        name = os.path.basename(f)
        if name.startswith('schematic-') or name == 'bench-schematic.ts':
            book = 'schematic'
        elif name.startswith('verilog-') or name == 'bench-verilog.ts':
            book = 'verilog'
        else:
            continue
        for m in rx.finditer(_read(f)):
            res[(book, m.group(1))] = (_unesc(m.group(4)), m.group(2))
    return res


def load_guided():
    """{id: title} управляемых уроков (learning-course.ts, beginner-course.ts), а также упражнений."""
    res = {}
    rx = re.compile(r"\bid:\s*'([^']+)',\s*(?:number:\s*'[^']*',\s*)?title:\s*t\(\s*('|\")((?:\\.|(?!\2).)*)\2", re.S)
    for fn in ('learning-course.ts', 'beginner-course.ts'):
        for m in rx.finditer(_read(os.path.join(SRC, 'lib', fn))):
            res[m.group(1)] = _unesc(m.group(3))
    return res


def load_examples():
    """Множество id примеров из example-curriculum.ts."""
    s = _read(os.path.join(SRC, 'lib', 'example-curriculum.ts'))
    i = s.index('const lessons = {')
    ids = set()
    for m in re.finditer(r"(?m)^  (?:'([a-z0-9-]+)'|([A-Za-z_][A-Za-z0-9_]*)): lesson\(", s[i:]):
        ids.add(m.group(1) or m.group(2))
    return ids


def known_names():
    """Все известные названия и id для проверки упоминаний в \\code{}."""
    names = set()
    for (book, i), (title, _ch) in load_authored().items():
        names.add(i)
        names.add(title)
    for i, title in load_guided().items():
        names.add(i)
        names.add(title)
    names |= load_examples()
    return names


# ---------------- ручная карта ----------------
# Запись: (метка главы или заголовок, [(книга, название урока)], [id примеров])
# Книги: «Схемы» = authored schematic, «Verilog» = authored verilog, «Курс» = guided lessons
# (learning-course/beginner-course, ищутся по названию или id).
B_SCH, B_VER, B_GUI = 'Схемы', 'Verilog', 'Курс'

S, V, G = B_SCH, B_VER, B_GUI

PART1 = [
    ('Сигналы', [(G, 'Бит: ноль и единица'), (G, 'Логический элемент'), (G, 'Число из четырёх бит')], ['button', 'not', 'blink']),
    ('Системы счисления и коды', [(S, 'Двоично-десятичный код'), (S, 'Код Грея блоком'), (V, 'Бит чётности')], ['gray', 'parity', 'binary-bcd', 'hamming-encode']),
    ('Логические элементы и булева алгебра', [(S, 'И-НЕ из блоков'), (S, 'Закон де Моргана'), (S, 'XOR из четырёх И-НЕ')], ['gates', 'inverse-gates', 'demorgan']),
    ('Комбинационные схемы', [(S, 'Два из трёх'), (S, 'Мультиплексор из НЕ, И, ИЛИ'), (V, 'Голосование «два из трёх»')], ['logic', 'majority']),
    ('Минимизация логических функций', [(S, 'Равенство: XNOR'), (S, 'ИЛИ на три входа')], ['implication', 'consensus']),
    ('Дешифраторы и шифраторы', [(S, 'Дешифратор'), (S, 'Приоритетный шифратор'), (V, 'Дешифратор 3 в 8')], ['decoder', 'priority']),
    ('Мультиплексоры и демультиплексоры', [(S, 'Мультиплексор 2→1'), (S, 'Мультиплексор 4→1'), (S, 'Демультиплексор')], ['mux', 'mux-four', 'demux-four']),
    ('Арифметические узлы', [(S, 'Полусумматор из вентилей'), (S, 'Полный сумматор'), (S, 'Вычитание'), (S, 'Меньше: A < B'), (V, 'Четырёхразрядный сумматор')], ['half-adder', 'full-adder', 'comparator']),
    ('Триггеры', [(G, 'Память на один бит'), (S, 'SR-триггер: установить и сбросить'), (S, 'D-триггер: запомнить бит'), (S, 'Детектор фронта: один импульс на нажатие')], ['edge-toggle']),
    ('Регистры и счётчики', [(S, 'Регистр на четыре бита'), (S, 'Сдвиговый регистр блоком'), (S, 'Счётчик одним блоком'), (S, 'Счётчик с паузой')], ['shift', 'counter', 'johnson']),
    ('Синхронные схемы, автоматы и память', [(S, 'Синхронизатор: привязать кнопку к такту'), (S, 'Делитель частоты на 2'), (V, 'ПЗУ из массива')], ['async-toggle-sync', 'button-debounce', 'divide-by-three']),
    ('Проектирование автоматов и очереди FIFO', [(G, 'Собери светофор'), (S, 'Детектор 101'), (S, 'Кодовый замок'), (S, 'Выход Мура')], ['traffic', 'vending-fsm', 'sequence-1011', 'fifo-four']),
    ('Электрические основы: КМОП, выходы и шины', [(S, 'Светодиод и ограничение тока'), (S, 'Тумблер')], ['button']),
    ('Цифра и аналоговый мир: ЦАП, АЦП, ШИМ', [(V, 'ШИМ: яркость числом')], ['pwm', 'breathing-pwm', 'sigma-delta']),
]
PART2 = [
    ('Что такое ПЛИС', [(G, 'Что у нас в руках'), (G, '1. Осмотр мастерской')], ['blink']),
    ('Что внутри ПЛИС', [(G, 'Сколько длится один период?')], ['logic']),
    ('Плата Sipeed Tang Nano 20K', [(G, 'Кнопка на настоящей плате'), (V, 'Светодиод горит нулём')], ['button']),
    ('Среда Logra', [(G, 'Ты в мастерской цифровых схем'), (G, 'Куда ты попал')], ['blink']),
    ('От текста до работающей схемы', [(G, 'Привет!'), (V, 'Светодиод и кнопка вместе')], ['button']),
    ('Основы Verilog', [(G, 'Первый провод'), (G, 'Склей биты'), (G, 'Выбор по условию'), (G, 'Первая ячейка памяти'), (G, 'Модуль внутри модуля')], ['gates', 'not']),
    ('От схемы к Verilog: узлы теоретических глав', [(V, 'Полный сумматор: учитываем перенос'), (V, 'Счётчик с загрузкой'), (V, 'Мур и Мили: когда выход реагирует')], ['full-adder', 'decoder', 'traffic', 'fifo-four', 'hamming-syndrome']),
    ('Практика: семь проектов', [(V, 'Бегущий огонёк'), (V, 'Мигание: делим частоту на 8'), (V, 'Нажал: переключил')], ['gates', 'blink', 'chaser', 'button-debounce', 'traffic', 'breathing-pwm', 'mux']),
    ('Симуляция', [(G, 'Сколько длится один период?')], ['blink']),
    ('Тактирование и временной анализ', [(V, 'Синхронизатор из двух триггеров'), (V, 'Сброс сразу или по такту')], ['async-toggle-sync', 'button-debounce']),
    ('UART, SPI, I2C', [], ['uart-tx', 'uart-rx', 'spi-loopback', 'i2c-pattern']),
    ('Память SDRAM', [(V, 'ОЗУ 8×4: запись по такту'), (V, 'ПЗУ из массива')], ['ram-write-read', 'small-rom']),
    ('Собираем процессор', [(V, 'Мини-АЛУ на четыре бита')], ['alu', 'tiny-cpu']),
    ('Задания для самостоятельной работы', [(V, 'Секундомер по кнопке'), (V, 'Охрана: два датчика из трёх')], ['stopwatch']),
]
# Единая книга без частей: порядок строк = порядок глав в tex/main.tex.
_BY = {row[0]: row for row in PART1 + PART2}
ORDER = [
    'Что такое ПЛИС', 'Среда Logra',
    'Сигналы', 'Системы счисления и коды', 'Логические элементы и булева алгебра', 'Основы Verilog',
    'Комбинационные схемы', 'Минимизация логических функций', 'Дешифраторы и шифраторы',
    'Мультиплексоры и демультиплексоры', 'Арифметические узлы', 'Триггеры', 'Регистры и счётчики',
    'Синхронные схемы, автоматы и память', 'Проектирование автоматов и очереди FIFO',
    'Что внутри ПЛИС', 'Плата Sipeed Tang Nano 20K', 'От текста до работающей схемы',
    'Электрические основы: КМОП, выходы и шины', 'Цифра и аналоговый мир: ЦАП, АЦП, ШИМ',
    'От схемы к Verilog: узлы теоретических глав', 'Практика: семь проектов', 'Симуляция',
    'Тактирование и временной анализ', 'UART, SPI, I2C', 'Память SDRAM', 'Собираем процессор',
    'Задания для самостоятельной работы',
]
assert set(ORDER) == set(_BY) and len(ORDER) == len(_BY), set(_BY) ^ set(ORDER)
MAP = [_BY[t] for t in ORDER]
# Сквозной проект «Охранная панель»: (этап, что собираем, [(книга, урок)], [id примеров], критерий приёмки)
PROJECT = [
    ('Сигналы', 'Датчик двери как бит; светодиод «тревога» на кнопке', [(G, 'Бит: ноль и единица')], ['button'], 'LED светится при нажатой кнопке'),
    ('Логические элементы', 'alarm = дверь И (ночь ИЛИ охрана)', [(S, 'И на три входа')], ['gates'], 'таблица на Диаграммах совпала с формулой'),
    ('Комбинационные схемы и минимизация', 'Три датчика, голосование «2 из 3», минимальная форма', [(S, 'Голосование «2 из 3» с охраной'), (V, 'Охрана: два датчика из трёх')], ['majority'], 'все 8 комбинаций; число LUT не больше одной'),
    ('Дешифраторы и мультиплексоры', 'Выбор зоны и показ её номера на семи сегментах', [(S, 'Цифра на семи сегментах')], ['decoder', 'mux'], 'номер зоны виден на индикаторе'),
    ('Арифметические узлы', 'Порог: уровень шума A > B', [(S, 'Меньше: A < B')], ['comparator'], 'тревога только выше порога'),
    ('Коды', 'Код замка в BCD и бит чётности при передаче', [(S, 'Проверка чётности слова')], ['parity'], 'ошибка в одном бите обнаруживается'),
    ('Триггеры', 'Запоминание тревоги, сброс ключом', [(S, 'Сигнализация с запоминанием'), (V, 'Сигнализация с памятью')], ['edge-toggle'], 'тревога держится после ухода сигнала'),
    ('Регистры и счётчики', 'Счётчик времени тревоги, делитель для писка', [(S, 'Удлинитель импульса')], ['counter'], 'сирена выключается через заданное число тактов'),
    ('Автоматы', 'ОХРАНА_ВЫКЛ, ОХРАНА, ТРЕВОГА; ввод кода 1-0-1', [(S, 'Кодовый замок'), (V, 'Кодовый замок: 1, 0, 1')], ['door-controller'], 'неверный код не снимает охрану'),
    ('Электрика и ШИМ', 'Зуммер через ШИМ, подтяжка кнопок, плата', [(S, 'Зуммер'), (V, 'ШИМ: яркость числом')], ['pwm'], 'работает на плате Tang Nano 20K'),
]


def _lookup(book, key, authored, guided):
    if book == B_GUI:
        for i, t in guided.items():
            if key in (i, t):
                return True
        return False
    bk = 'schematic' if book == B_SCH else 'verilog'
    for (b, i), (t, ch) in authored.items():
        if b == bk and (key == i or key == t or key == ch):
            return True
    # название главы книги (например «Сравнение и коды»)
    return key in CHAPTER_TITLES.get(bk, ())


def _chapter_titles():
    res = {'schematic': set(), 'verilog': set()}
    s = _read(os.path.join(SRC, 'learn', 'content', 'authored', 'index.ts'))
    for key, arr in (('verilog', 'verilogChapters'), ('schematic', 'schematicChapters')):
        m = re.search(arr + r'[^=]*=\s*\[(.*?)\n\];', s, re.S)
        if m:
            for t in re.finditer(r"title:\s*t\('((?:\\.|[^'])*)'\)", m.group(1)):
                res[key].add(_unesc(t.group(1)))
    return res


CHAPTER_TITLES = _chapter_titles()


def check_map():
    authored, guided, examples = load_authored(), load_guided(), load_examples()
    errs = []
    for table in (MAP,):
        for ch, lessons, exs in table:
            for book, key in lessons:
                if not _lookup(book, key, authored, guided):
                    errs.append('нет урока: %s / %s (глава %s)' % (book, key, ch))
            for e in exs:
                if e not in examples:
                    errs.append('нет примера: %s (глава %s)' % (e, ch))
    for stage, _what, lessons, exs, _crit in PROJECT:
        for book, key in lessons:
            if not _lookup(book, key, authored, guided):
                errs.append('нет урока: %s / %s (проект, %s)' % (book, key, stage))
        for e in exs:
            if e not in examples:
                errs.append('нет примера: %s (проект, %s)' % (e, stage))
    return errs


def tex_escape(s):
    return (s.replace('\\', r'\textbackslash{}').replace('&', r'\&').replace('%', r'\%')
            .replace('_', r'\_').replace('#', r'\#').replace('$', r'\$').replace('{', r'\{').replace('}', r'\}'))


def code(s):
    return '\\code{%s}' % tex_escape(s) if s else ''


def render_lessons(lessons):
    return '; '.join('%s (%s)' % (tex_escape(k), b) for b, k in lessons) or '---'


def render_examples(exs):
    return ', '.join(code(e) for e in exs) or '---'


def build_tex():
    out = [
        '% Порождено tools/gen_map.py, не править вручную.',
        '\\chapter{Соответствие глав и уроков Logra}',
        '\\label{app:logramap}',
        '',
        'В скобках указана книга: «Схемы» и «Verilog» --- книги вкладки \\emph{Обучение}, «Курс» --- её управляемые уроки. Таблицы показывают, какой урок',
        'и какой пример (вкладки \\emph{Код} и \\emph{Конструктор}) соответствуют главам книги. Названия сверены с исходным',
        'кодом Logra при сборке этого приложения.',
        '',
    ]

    def table(title, rows):
        out.append('\\section*{%s}' % title)
        out.append('\\begin{longtable}{@{}p{0.24\\textwidth}p{0.38\\textwidth}p{0.26\\textwidth}@{}}')
        out.append('\\toprule Глава & Урок Logra (книга) & Пример (\\code{id}) \\\\ \\midrule \\endfirsthead')
        out.append('\\toprule Глава & Урок Logra (книга) & Пример (\\code{id}) \\\\ \\midrule \\endhead')
        for ttl, lessons, exs in rows:
            out.append('%s & %s & %s \\\\' % (tex_escape(ttl), render_lessons(lessons), render_examples(exs)))
        out.append('\\bottomrule')
        out.append('\\end{longtable}')
        out.append('')

    table('Главы по порядку книги', MAP)
    if PROJECT:
        out.append('\\section*{Сквозной проект «Охранная панель»}')
        out.append('\\begin{longtable}{@{}>{\\raggedright\\arraybackslash}p{0.20\\textwidth}>{\\raggedright\\arraybackslash}p{0.24\\textwidth}>{\\raggedright\\arraybackslash}p{0.26\\textwidth}>{\\raggedright\\arraybackslash}p{0.17\\textwidth}@{}}')
        hdr = '\\toprule Этап & Что собираем & Урок или пример & Критерий приёмки \\\\ \\midrule'
        out.append(hdr + ' \\endfirsthead')
        out.append(hdr + ' \\endhead')
        for stage, what, lessons, exs, crit in PROJECT:
            ref = ', '.join([render_lessons(lessons)] * bool(lessons) + [render_examples(exs)] * bool(exs)) or '---'
            out.append('%s & %s & %s & %s \\\\' % (tex_escape(stage), tex_escape(what), ref, tex_escape(crit)))
        out.append('\\bottomrule')
        out.append('\\end{longtable}')
        out.append('')
    return '\n'.join(out)


def dump():
    for (b, i), (t, ch) in sorted(load_authored().items()):
        print('authored', b, ch, i, t, sep=' | ')
    for i, t in load_guided().items():
        print('guided', i, t, sep=' | ')
    print('examples', ' '.join(sorted(load_examples())))


if __name__ == '__main__':
    if '--dump' in sys.argv:
        dump()
        sys.exit(0)
    errs = check_map()
    for e in errs:
        print('ОШИБКА:', e)
    if errs:
        sys.exit(1)
    if '--check' not in sys.argv:
        io.open(OUT, 'w', encoding='utf8', newline='\n').write(build_tex())
        print('записано', os.path.relpath(OUT))
