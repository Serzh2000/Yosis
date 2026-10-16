# Вырезает из PDF область над каждой подписью «Рис.» и собирает листы-обзоры для глазной проверки.
# Запуск из textbook/: python tools/figure_sheets.py [pdf] [папка_вывода]
import os
import sys

import fitz

pdf = sys.argv[1] if len(sys.argv) > 1 else 'Digital_Design.pdf'
dest = sys.argv[2] if len(sys.argv) > 2 else 'build/figs'
os.makedirs(dest, exist_ok=True)
for name in os.listdir(dest):
    os.remove(os.path.join(dest, name))

doc = fitz.open(pdf)
crops = []
for number, page in enumerate(doc, 1):
    for block in page.get_text('blocks'):
        text = block[4].strip()
        if text.startswith('Рис.'):
            cap = fitz.Rect(block[:4])
            top = max(45, cap.y0 - 330)
            rect = fitz.Rect(30, top, page.rect.width - 30, cap.y1 + 4)
            pix = page.get_pixmap(dpi=96, clip=rect)
            path = os.path.join(dest, 'c%03d_%d.png' % (number, len(crops)))
            pix.save(path)
            crops.append((number, path, pix.width, pix.height))
print('рисунков:', len(crops))

# листы: по 4 рисунка в сетке 2x2
from PIL import Image, ImageDraw  # noqa: E402

PER = 4
for sheet in range(0, len(crops), PER):
    group = crops[sheet:sheet + PER]
    w = max(c[2] for c in group)
    h = max(c[3] for c in group)
    img = Image.new('RGB', (w * 2 + 20, (h + 22) * 2), 'white')
    draw = ImageDraw.Draw(img)
    for k, (number, path, pw, ph) in enumerate(group):
        x = (k % 2) * (w + 20)
        y = (k // 2) * (h + 22)
        draw.text((x + 4, y + 2), 'стр. %d' % number, fill=(200, 0, 0))
        img.paste(Image.open(path), (x, y + 18))
    img.save(os.path.join(dest, 'sheet_%02d.png' % (sheet // PER + 1)))
print('листов:', (len(crops) + PER - 1) // PER)
