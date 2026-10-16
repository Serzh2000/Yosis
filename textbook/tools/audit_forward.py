# Для каждой главы показывает упоминания терминов, которые вводятся в более поздних главах.
# Запуск из textbook/: python tools/audit_forward.py [файл_вывода]
import io
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..', 'tex')
main = io.open(os.path.join(ROOT, 'main.tex'), encoding='utf8').read()
chapters = [c for c in re.findall(r'\\input\{chapters/([^}]+)\.tex\}', main) if c not in ('00_preface',)]
idx = {c: i for i, c in enumerate(chapters)}

# термин -> (регулярное выражение, глава, где он вводится)
TERMS = {
    'ПЛИС': (r'ПЛИС', '01_what_is_fpga'),
    'LUT': (r'\bLUT\d?', 'b5_mux'),
    'Verilog': (r'Verilog|\\code\{assign|always @', '05_verilog'),
    'Yosis': (r'Yosis', '03a_yosis'),
    'Yosys/синтезатор': (r'Yosys|синтезатор', '04_flow'),
    'nextpnr': (r'nextpnr', '04_flow'),
    'RTL': (r'\bRTL\b', '03a_yosis'),
    'битстрим': (r'битстрим', '04_flow'),
    'UART': (r'UART', '06a_uart'),
    'SPI': (r'\bSPI\b', '06a_uart'),
    'I2C': (r'I\$\^2\$C', '06a_uart'),
    'PLL': (r'\bPLL\b', '02_inside'),
    'SDRAM': (r'SDRAM', '08_sdram'),
    'BSRAM/DSP': (r'BSRAM|\bDSP\b', '02_inside'),
    'ШИМ': (r'ШИМ', 'b9b_analog'),
    'FIFO': (r'\bFIFO\b', 'b9a_fsmdesign'),
    'ЦАП/АЦП': (r'ЦАП|АЦП', 'b9b_analog'),
    'тристабильный/Z': (r'тр[её]х состояни|состояни\w* \$?Z|высокоимпеданс', 'b5a_electrical'),
    'метастабильность': (r'метастаб', 'b7_flipflops'),
    'setup/hold': (r'setup|hold|времен\w+ (установки|удержания)', 'b7_flipflops'),
    'f_max': (r'f_\{?\\?m?a?x|предельн\w+ частот|максимальн\w+ тактов', 'b9_sync'),
    'автомат': (r'конечн\w+ автомат|автомат Мура|автомат Мили', 'b9_sync'),
    'BCD': (r'\bBCD\b|двоично-десятичн', 'b1a_codes'),
    'код Грея': (r'код\w* Грея', 'b4_coders'),
    'XOR/исключающее ИЛИ': (r'исключающ\w+ ИЛИ|\\oplus|\bXOR\b', 'b2_gates'),
    'триггер': (r'триггер', 'b7_flipflops'),
    'регистр': (r'регистр', 'b8_registers'),
    'сумматор': (r'сумматор', 'b6_arith'),
    'мультиплексор': (r'мультиплексор', 'b5_mux'),
    'дешифратор': (r'дешифратор', 'b4_coders'),
    'карта Карно': (r'карт\w+ Карно', 'b3_combinational'),
    'АЛУ': (r'\bАЛУ\b|\bALU\b', 'b6_arith'),
    'тактовый домен': (r'тактов\w+ домен', '07a_clocks'),
    'память ПЗУ/ОЗУ': (r'\bПЗУ\b|\bОЗУ\b', 'b9_sync'),
}


def strip(t):
    t = re.sub(r'(?m)^\s*%.*$', '', t)
    t = re.sub(r'\\begin\{tikzpicture\}.*?\\end\{tikzpicture\}', '', t, flags=re.S)
    return t


out = []
for c in chapters:
    if c.startswith('a') or c == '09_tasks':
        continue
    text = strip(io.open(os.path.join(ROOT, 'chapters', c + '.tex'), encoding='utf8').read())
    lines = text.split('\n')
    for name, (rx, home) in TERMS.items():
        if idx[c] >= idx[home]:
            continue
        hits = [i for i, l in enumerate(lines, 1) if re.search(rx, l, flags=re.I)]
        if hits:
            out.append('[%s] %s (вводится в %s): строки %s' % (c, name, home, hits[:12]))
            for i in hits[:3]:
                out.append('      %d: %s' % (i, lines[i - 1].strip()[:140]))
dest = sys.argv[1] if len(sys.argv) > 1 else None
text = '\n'.join(out)
if dest:
    io.open(dest, 'w', encoding='utf8').write(text)
else:
    print(text)
