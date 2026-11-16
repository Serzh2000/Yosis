# Статическая проверка рисунков TikZ по правилам из textbook/FIGURE_RULES.md.
# Запуск из textbook/: python tools/audit_tikz.py [папка с главами ...]
# Ищет в исходниках главные причины «кривых» схем: переопределение размеров вентилей, короткие
# отступы проводов (меньше 3 мм), провода `|-` без отступа перед входом, вентили, поставленные
# абсолютными координатами ближе допустимого шага.
import io
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

roots = sys.argv[1:] or ['tex/chapters', 'tex-en/chapters']
GATE = r'g(?:AND|OR|XOR|NAND|NOR|XNOR|NOT)|i(?:AND|OR|XOR|NAND|NOR|XNOR|NOT)'
WIDTH = {'gNOT': 0.9}  # ширина по умолчанию, см (остальные 1,2)
problems = 0


def report(path, number, text, message):
    global problems
    problems += 1
    print(f'{path}:{number}: {message}\n    {text.strip()[:140]}')


for root in roots:
    for path in sorted(Path(root).glob('*.tex')):
        lines = path.read_text(encoding='utf-8').splitlines()
        gates = []  # (строка, имя, x, y) внутри одного tikzpicture
        for number, line in enumerate(lines, 1):
            if 'fig-ok' in line:  # осознанное исключение: `% fig-ok: причина`
                continue
            code = line.split('%')[0]
            if '\\begin{tikzpicture}' in code or '\\begin{scope}' in code:
                gates = []
            if re.search(rf'\[(?:{GATE})[^\]]*(minimum (?:width|height)\s*=)', code):
                report(path, number, code, 'размер вентиля переопределён: используйте стиль из preamble.tex (правило 1)')
            for m in re.finditer(r'\+\+\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)', code):
                dx, dy = abs(float(m.group(1))), abs(float(m.group(2)))
                step = max(dx, dy)
                if 0 < step < 0.3 and re.search(r'wire|draw', code):
                    report(path, number, code, f'отрезок провода {step * 10:.0f} мм короче 3 мм (правило 4)')
            if re.search(r'\|-\s*\(', code) and re.search(r'output\)\s*--\s*\+\+\(\s*0?\.\d', code):
                report(path, number, code, 'провод `-- ++(…) |-` без отступа перед входом: используйте `-| ([xshift=-4mm]g.input N)` (правило 3)')
            node = re.search(rf'\\node\[((?:{GATE}))[^\]]*\]\s*\((\w+)\)\s*at\s*\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)', code)
            if node:
                kind, name, x, y = node.group(1), node.group(2), float(node.group(3)), float(node.group(4))
                width = WIDTH.get(kind, 1.2)
                height = 0.9 if kind != 'gNOT' else 0.6
                for other in gates:
                    dx, dy = abs(other[2] - x), abs(other[3] - y)
                    if dx < width + 0.2 and dy < height + 0.15:
                        report(path, number, code, f'вентиль {name} перекрывается с {other[1]} (строка {other[0]}; правило 2)')
                    elif dy < 0.5 and dx < width + 1.4:
                        report(path, number, code, f'вентили {name} и {other[1]} (строка {other[0]}) ближе {width + 1.4:.1f} см по x (правило 2)')
                gates.append((number, name, x, y))
print(f'\nзамечаний: {problems}')
sys.exit(1 if problems else 0)
