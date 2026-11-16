# Аудит книги: ссылки вперёд, «Сделай сам» в каждом разделе, существование уроков/примеров Logra.
# Запуск из textbook/: python tools/audit_forward.py [--terms] [файл_вывода]
# Порядок глав и границы частей берутся из tex/main.tex (он может быть переупорядочен).
# Проверки (нарушения печатаются списком, код возврата 1, если они есть):
#   1. В каждом \section частей I и II (кроме «Вопросы и задачи», «Что дальше», «Типичные ошибки»,
#      «Ответы» и приложений) есть diybox или taskbox «Сделай сам».
#   2. В части I нет понятий части II (ПЛИС, LUT, Verilog, Yosys, nextpnr, RTL, ...)
#      вне \lookahead{...}, buildbox и diybox.
#   3. \ref на главы части II (ch:inside|flow|verilog|clocks|bridge|uart|sdram|logra|examples|cpu,
#      а также ch:fpga|board|sim) из части I только внутри \lookahead.
#   4. Названия уроков и id примеров в \code{} и «...» после слова «урок» во врезках существуют в src
#      (проверка через gen_map.known_names()).
# Флаг --terms дополнительно печатает старый справочный отчёт об упоминаниях терминов раньше их введения.
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import gen_map  # noqa: E402

ROOT = os.path.join(HERE, '..', 'tex')
main = io.open(os.path.join(ROOT, 'main.tex'), encoding='utf8').read()

# Разбор main.tex: часть I = главы до второго \part, часть II = после него, приложения a* отдельно.
part_no = 0
PART = {}
ORDER = []
for m in re.finditer(r'\\part\{|\\input\{chapters/([^}]+)\.tex\}', main):
    if m.group(1) is None:
        part_no += 1
        continue
    c = m.group(1)
    if c == '00_preface':
        continue
    ORDER.append(c)
    PART[c] = 0 if re.match(r'a\d', c) else part_no
chapters = ORDER
idx = {c: i for i, c in enumerate(chapters)}

SKIP_SECTIONS = re.compile(r'Вопросы и задачи|Что дальше|Типичные ошибки|Ответы|Questions and|What next|Common mistakes', re.I)
PART2_TERMS = {
    'ПЛИС': r'ПЛИС|\bFPGA\b',
    'LUT': r'\bLUT\d?',
    'Verilog': r'Verilog|always @',
    'Yosys': r'Yosys',
    'синтезатор': r'синтезатор',
    'nextpnr': r'nextpnr',
    'RTL': r'\bRTL\b',
    'битстрим': r'битстрим',
    'UART': r'UART',
    'SPI': r'\bSPI\b',
    'I2C': r'I\$\^2\$C',
    'PLL': r'\bPLL\b',
    'SDRAM': r'SDRAM',
    'BSRAM/DSP': r'BSRAM|\bDSP\b',
    'тактовый домен': r'тактов\w+ домен',
}
PART2_REFS = ('inside', 'flow', 'verilog', 'clocks', 'bridge', 'uart', 'sdram', 'logra', 'examples', 'cpu',
              'fpga', 'board', 'sim')


def read(c):
    return io.open(os.path.join(ROOT, 'chapters', c + '.tex'), encoding='utf8').read()


def strip_comments(t):
    t = re.sub(r'(?m)(?<!\\)%.*$', '', t)
    return t


def strip_tikz(t):
    return re.sub(r'\\begin\{tikzpicture\}.*?\\end\{tikzpicture\}', '', t, flags=re.S)


def blank_spans(t, spans):
    out = list(t)
    for a, b in spans:
        for i in range(a, b):
            if out[i] != '\n':
                out[i] = ' '
    return ''.join(out)


def lookahead_spans(t):
    spans = []
    for m in re.finditer(r'\\lookahead\s*\{', t):
        depth, i = 1, m.end()
        while i < len(t) and depth:
            if t[i] == '{' and t[i - 1] != '\\':
                depth += 1
            elif t[i] == '}' and t[i - 1] != '\\':
                depth -= 1
            i += 1
        spans.append((m.start(), i))
    return spans


def env_spans(t, names):
    spans = []
    for n in names:
        for m in re.finditer(r'\\begin\{%s\}.*?\\end\{%s\}' % (n, n), t, flags=re.S):
            spans.append((m.start(), m.end()))
    return spans


def lineno(t, pos):
    return t.count('\n', 0, pos) + 1


viol = []


def check_diy(c, t):
    secs = list(re.finditer(r'\\section\*?\{((?:[^{}]|\{[^{}]*\})*)\}', t))
    for k, m in enumerate(secs):
        title = m.group(1)
        if SKIP_SECTIONS.search(title):
            continue
        body = t[m.end(): secs[k + 1].start() if k + 1 < len(secs) else len(t)]
        ok = re.search(r'\\begin\{diybox\}', body) or re.search(r'\\begin\{taskbox\}\s*\[\s*Сделай сам', body)
        if not ok:
            viol.append('[%s] нет «Сделай сам» в разделе «%s» (строка %d)' % (c, title, lineno(t, m.start())))


def check_forward_terms(c, t):
    spans = lookahead_spans(t) + env_spans(t, ['buildbox', 'diybox'])
    clean = blank_spans(t, spans)
    clean = strip_tikz(clean)
    lines = clean.split('\n')
    for name, rx in PART2_TERMS.items():
        hits = [i for i, l in enumerate(lines, 1) if re.search(rx, l)]
        if hits:
            viol.append('[%s] понятие части II «%s» вне \\lookahead/buildbox/diybox: строки %s: %s'
                        % (c, name, hits[:8], lines[hits[0] - 1].strip()[:100]))


def check_refs(c, t):
    spans = lookahead_spans(t)
    for m in re.finditer(r'\\(?:ref|pageref|autoref|cref)\{ch:(%s)\}' % '|'.join(PART2_REFS), t):
        if not any(a <= m.start() < b for a, b in spans):
            viol.append('[%s] ссылка на часть II \\ref{ch:%s} вне \\lookahead (строка %d)' % (c, m.group(1), lineno(t, m.start())))


def norm(s):
    s = s.replace('~', ' ').replace('\\,', ' ').replace('\\_', '_').replace('--', '-')
    return re.sub(r'\s+', ' ', s).strip()


KNOWN = None
KNOWN_NORM = None
TOOL_WORDS = {'nextpnr-himbaechel', 'nextpnr-gowin', 'clk', 'rst', 'reg', 'wire'}
ID_RX = re.compile(r'^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$')


def check_names(c, t):
    global KNOWN, KNOWN_NORM
    if KNOWN is None:
        KNOWN = gen_map.known_names()
        for book in gen_map.CHAPTER_TITLES.values():
            KNOWN |= set(book)
        KNOWN_NORM = {norm(x) for x in KNOWN}
    for env in ('buildbox', 'diybox', 'taskbox'):
        for m in re.finditer(r'\\begin\{%s\}(.*?)\\end\{%s\}' % (env, env), t, flags=re.S):
            body = m.group(1)
            base = lineno(t, m.start())
            for cm in re.finditer(r'\\code\{([^{}]*)\}', body):
                v = norm(cm.group(1))
                before = body[max(0, cm.start() - 40):cm.start()]
                is_ex = re.search(r'(пример\w*|\bid)\s*$', before, flags=re.I)
                if (ID_RX.match(v) or (is_ex and re.match(r'^[a-z][a-z0-9-]*$', v))) and v not in KNOWN_NORM and v not in TOOL_WORDS:
                    viol.append('[%s] нет такого id урока/примера в src: %s (строка %d)' % (c, v, base + body[:cm.start()].count('\n')))
            for lm in re.finditer(r'[Уу]рок\w*\s+(?:«|<<)([^»>]+)(?:»|>>)', body):
                v = norm(lm.group(1))
                if v not in KNOWN_NORM:
                    viol.append('[%s] нет такого урока в src: «%s» (строка %d)' % (c, v, base + body[:lm.start()].count('\n')))


for c in chapters:
    if PART[c] not in (1, 2):
        continue
    t = strip_comments(read(c))
    check_diy(c, t)
    if PART[c] == 1:
        check_forward_terms(c, t)
        check_refs(c, t)
    check_names(c, t)

out = list(viol)
out.append('')
out.append('Нарушений: %d (главы части I: %d, части II: %d)' % (
    len(viol), sum(1 for c in chapters if PART[c] == 1), sum(1 for c in chapters if PART[c] == 2)))

if '--terms' in sys.argv:
    # справочный отчёт: термины раньше места, где они вводятся
    TERMS = {
        'тристабильный/Z': (r'тр[её]х состояни|состояни\w* \$?Z|высокоимпеданс', 'b5a_electrical'),
        'метастабильность': (r'метастаб', 'b7_flipflops'),
        'setup/hold': (r'setup|hold|времен\w+ (установки|удержания)', 'b7_flipflops'),
        'автомат': (r'конечн\w+ автомат|автомат Мура|автомат Мили', 'b9_sync'),
        'BCD': (r'\bBCD\b|двоично-десятичн', 'b1a_codes'),
        'код Грея': (r'код\w* Грея', 'b4_coders'),
        'XOR': (r'исключающ\w+ ИЛИ|\\oplus|\bXOR\b', 'b2_gates'),
        'триггер': (r'триггер', 'b7_flipflops'),
        'регистр': (r'регистр', 'b8_registers'),
        'сумматор': (r'сумматор', 'b6_arith'),
        'мультиплексор': (r'мультиплексор', 'b5_mux'),
        'дешифратор': (r'дешифратор', 'b4_coders'),
        'карта Карно': (r'карт\w+ Карно', 'b3_combinational'),
        'ШИМ': (r'ШИМ', 'b9b_analog'),
        'FIFO': (r'\bFIFO\b', 'b9a_fsmdesign'),
        'ЦАП/АЦП': (r'ЦАП|АЦП', 'b9b_analog'),
    }
    out.append('')
    out.append('--- справка: термины раньше введения ---')
    for c in chapters:
        if PART[c] == 0:
            continue
        lines = strip_tikz(strip_comments(read(c))).split('\n')
        for name, (rx, home) in TERMS.items():
            if home not in idx or idx[c] >= idx[home]:
                continue
            hits = [i for i, l in enumerate(lines, 1) if re.search(rx, l, flags=re.I)]
            if hits:
                out.append('[%s] %s (вводится в %s): строки %s' % (c, name, home, hits[:12]))

dest = next((a for a in sys.argv[1:] if not a.startswith('--')), None)
text = '\n'.join(out)
if dest:
    io.open(dest, 'w', encoding='utf8').write(text)
else:
    print(text)
sys.exit(1 if viol else 0)
