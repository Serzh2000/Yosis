# Ищет в PDF текст, который пересекает границу рисунка: подпись или абзац, заехавшие на рисунок.
# Запуск из textbook/: python tools/audit_figure_text.py [pdf]
import sys
import warnings

warnings.filterwarnings('ignore')
import fitz  # noqa: E402

pdf = sys.argv[1] if len(sys.argv) > 1 else 'Digital_Design.pdf'
doc = fitz.open(pdf)
pages = 0
for number, page in enumerate(doc, 1):
    figures = [fitz.Rect(r) for r in page.cluster_drawings() if r.width > 60 and r.height > 40]
    figures += [
        fitz.Rect(i['bbox'])
        for i in page.get_image_info()
        if fitz.Rect(i['bbox']).width > 60 and fitz.Rect(i['bbox']).height > 40
    ]
    bad = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            rect = fitz.Rect(line['bbox'])
            text = ''.join(span['text'] for span in line['spans']).strip()
            if not text:
                continue
            for figure in figures:
                inter = rect & figure
                if inter.is_empty:
                    continue
                inside = inter.width * inter.height / (rect.width * rect.height)
                # Строка частично внутри рисунка: пересекает его границу.
                if 0.2 < inside < 0.95:
                    bad.append((text[:40], tuple(int(x) for x in rect), tuple(int(x) for x in figure), round(inside, 2)))
    if bad:
        pages += 1
        print('страница', number, bad[:3])
print('страниц с текстом на границе рисунка:', pages)
