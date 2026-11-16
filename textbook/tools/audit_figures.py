# Ищет в PDF рисунки, которые накладываются друг на друга: растровые снимки и векторные блоки.
# Рамка вокруг снимка (тот же прямоугольник, что у картинки) наложением не считается.
# Запуск из textbook/: python tools/audit_figures.py [pdf]
import sys
import warnings

warnings.filterwarnings('ignore')
import fitz  # noqa: E402

pdf = sys.argv[1] if len(sys.argv) > 1 else 'Digital_Design.pdf'
doc = fitz.open(pdf)
pages = 0
for number, page in enumerate(doc, 1):
    boxes = []
    for info in page.get_image_info():
        rect = fitz.Rect(info['bbox'])
        if rect.width > 30 and rect.height > 30:
            boxes.append(('img', rect))
    try:
        for rect in page.cluster_drawings():
            if rect.width > 40 and rect.height > 25:
                boxes.append(('vec', fitz.Rect(rect)))
    except Exception:
        pass
    hits = []
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            a, b = boxes[i][1], boxes[j][1]
            inter = a & b
            if inter.is_empty:
                continue
            small = min(a.width * a.height, b.width * b.height)
            same = (
                abs(a.width - b.width) < 6
                and abs(a.height - b.height) < 6
                and abs(a.x0 - b.x0) < 6
                and abs(a.y0 - b.y0) < 6
            )
            share = inter.width * inter.height / small if small else 0
            if share > 0.15 and not same:
                hits.append((boxes[i][0], tuple(int(x) for x in a), boxes[j][0], tuple(int(x) for x in b), round(share, 2)))
    if hits:
        pages += 1
        print('страница', number, hits[:3])
print('страниц с наложенными рисунками:', pages)
