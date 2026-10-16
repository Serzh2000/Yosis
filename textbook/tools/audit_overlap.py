# Ищет в PDF фрагменты текста, которые накладываются друг на друга (слипшиеся подписи на рисунках).
# Листинги кода (моноширинный шрифт) пропускаются: minted режет строки на куски.
# Запуск из textbook/: python tools/audit_overlap.py [pdf] [выходной_файл]
import io
import sys

import fitz

pdf = sys.argv[1] if len(sys.argv) > 1 else 'Digital_Design.pdf'
dest = sys.argv[2] if len(sys.argv) > 2 else None
MONO = ('mono', 'consol', 'courier', 'typewriter', 'code')

doc = fitz.open(pdf)
out = []
bad = 0
for number, page in enumerate(doc, 1):
    spans = []
    for block in page.get_text('dict')['blocks']:
        for line_no, line in enumerate(block.get('lines', [])):
            for span in line['spans']:
                text = span['text'].strip()
                if not text or any(m in span['font'].lower() for m in MONO):
                    continue
                spans.append((fitz.Rect(span['bbox']), text, id(line)))
    hits = []
    for i in range(len(spans)):
        for j in range(i + 1, len(spans)):
            ra, ta, la = spans[i]
            rb, tb, lb = spans[j]
            if la == lb:
                continue
            inter = ra & rb
            if inter.is_empty:
                continue
            small = min(ra.get_area(), rb.get_area())
            if small > 0 and inter.get_area() / small > 0.2:
                hits.append((ta[:18], tb[:18], round(ra.x0), round(ra.y0)))
    if hits:
        bad += 1
        out.append('страница %d: %s' % (number, '; '.join('«%s»/«%s» (%d,%d)' % h for h in hits[:5])))
out.append('страниц с наложениями: %d' % bad)
text = '\n'.join(out)
if dest:
    io.open(dest, 'w', encoding='utf8').write(text)
else:
    print(text)
