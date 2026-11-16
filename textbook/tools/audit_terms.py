# Проверка порядка терминов: для каждого термина ищем первое упоминание и первое определение
# (\term{...}, полужирный разбор или заголовок раздела) в порядке глав книги.
# Запуск из textbook/: python tools/audit_terms.py
import io
import os
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.join(os.path.dirname(__file__), '..', 'tex')
main = io.open(os.path.join(ROOT, 'main.tex'), encoding='utf8').read()
chapters = re.findall(r'\\input\{chapters/([^}]+)\.tex\}', main)
chapters = [c for c in chapters if c != '00_preface']

TERMS = {
    # термин: регулярное выражение для упоминания
    'ПЛИС': r'ПЛИС',
    'LUT': r'\bLUT',
    'триггер': r'триггер',
    'такт': r'такт',
    'Verilog': r'Verilog',
    'синтез': r'синтез',
    'битстрим': r'битстрим',
    'RTL': r'\bRTL\b',
    'метастаб': r'метастаб',
    'setup': r'setup|времен[иь]\s+установки',
    'мультиплексор': r'мультиплексор',
    'дешифратор': r'дешифратор',
    'сумматор': r'сумматор',
    'код Грея': r'код\w*\s+Грея',
    'BCD': r'\bBCD\b',
    'FIFO': r'\bFIFO\b',
    'конечный автомат': r'автомат',
    'Мура/Мили': r'Мура|Мили',
    'PLL': r'\bPLL\b',
    'SDRAM': r'SDRAM',
    'BSRAM': r'BSRAM',
    'DSP': r'\bDSP\b',
    'АЛУ': r'АЛУ|\bALU\b',
    'тестбенч': r'тестбенч|testbench',
    'ШИМ': r'ШИМ|PWM',
    'UART': r'UART',
    'I2C': r'I\$\^2\$C|I2C',
    'SPI': r'\bSPI\b',
    'КМОП': r'КМОП|CMOS',
    'высокоимпедансн': r'высокоимпедан|состояни\w* Z|\bZ\b',
    'open drain': r'открыт\w+ сток',
    'синхронизатор': r'синхронизатор',
    'конвейер': r'конвейер',
    'критический путь': r'критическ\w+ пут',
    'Logra': r'Logra',
    'Yosys': r'Yosys',
    'nextpnr': r'nextpnr',
    'Gowin': r'Gowin',
    'дребезг': r'дребезг',
    'мантисса': r'мантисс',
    'ЦАП/АЦП': r'ЦАП|АЦП',
    'шина': r'\bшин',
    'ПЗУ': r'ПЗУ',
    'ОЗУ': r'ОЗУ',
    'LFSR': r'LFSR',
    'синдром': r'синдром',
    'импликанта': r'импликант',
    'минтерм': r'минтерм',
    'карта Карно': r'карт\w+ Карно',
    'допкод': r'дополнительн\w+ код',
    'fmax': r'f_\{?max\}?|максимальн\w+ тактов',
    'clock enable': r'clock enable|разрешени\w+ тактов|импульс\w* разрешения',
    'тактовый домен': r'тактов\w+ домен',
    'устройство управления': r'устройство управления',
}
DEF = r'\\term\{[^}]*%s[^}]*\}|\\textbf\{[^}]*%s[^}]*\}'


def strip(tex):
    tex = re.sub(r'(?m)^\s*%.*$', '', tex)
    tex = re.sub(r'\\begin\{tikzpicture\}.*?\\end\{tikzpicture\}', '', tex, flags=re.S)
    tex = re.sub(r'\\begin\{(vcode|minted)\}.*?\\end\{\1\}', '', tex, flags=re.S)
    return tex


text = {c: strip(io.open(os.path.join(ROOT, 'chapters', c + '.tex'), encoding='utf8').read()) for c in chapters}
num = {c: i + 1 for i, c in enumerate(chapters)}
print('Порядок глав:', ', '.join('%d=%s' % (num[c], c) for c in chapters))
print()
for name, rx in TERMS.items():
    first = None
    for c in chapters:
        if re.search(rx, text[c], flags=re.I):
            first = c
            break
    # первое определение: \term{...} или \textbf с корнем термина
    root = rx
    first_def = None
    for c in chapters:
        if re.search(r'\\(term|textbf)\{[^{}]*(' + root + r')[^{}]*\}', text[c], flags=re.I):
            first_def = c
            break
    flag = ''
    if first and first_def and num[first] < num[first_def]:
        flag = '  <-- ИСПОЛЬЗУЕТСЯ РАНЬШЕ ОПРЕДЕЛЕНИЯ'
    if first and not first_def:
        flag = '  <-- нет явного определения'
    print('%-26s первое: %-18s определение: %-18s%s' % (name, first, first_def, flag))


# Проверка названия продукта: «Yosis» (старое имя) не должно встречаться; Yosys (синтезатор) допустим.
bad = 0
for fn in sorted(os.listdir(os.path.join(ROOT, 'chapters'))) + ['main.tex']:
    path = os.path.join(ROOT, 'chapters', fn) if fn != 'main.tex' else os.path.join(ROOT, fn)
    if not fn.endswith('.tex'):
        continue
    for i, l in enumerate(io.open(path, encoding='utf8').read().splitlines(), 1):
        if re.search(r'Yosis', l):
            bad += 1
            print('Yosis: %s:%d: %s' % (fn, i, l.strip()[:100]))
print()
print('Упоминаний «Yosis»: %d' % bad)
sys.exit(1 if bad else 0)
