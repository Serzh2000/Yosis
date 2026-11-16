#!/usr/bin/env python3
"""Собирает домашние задания: проверка эталонов и неправильных решений, проверка знаний по презентациям, XML.

Запуск (из этой папки):
  python build.py <папка ТСП с презентациями> [--no-verify] [--only 1.1,2.3]

Нужен Icarus Verilog (переменные IVERILOG и VVP) и pdftotext. Результат:
  questions.xml   вопросы CodeRunner (+ прототип verilog_py для текстовых проверок)
  homework.json   группы и вопросы по порядку (для скрипта загрузки в Moodle)
  coverage.md     карта «что нужно знать для задания и где это объясняется»
"""
import argparse
import html
import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hw_lib as H  # noqa: E402
import tasks_g1_g2, tasks_g3_g4, tasks_g5_g6, tasks_g7  # noqa: E402,E401
from texts import TEXTS  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('root', help='папка ТСП с презентациями')
ap.add_argument('--no-verify', action='store_true', help='не прогонять проверки решений')
ap.add_argument('--only', default='', help='только эти задания, например 1.1,2.3')
ap.add_argument('--no-prototype', action='store_true', help='не включать прототип в XML')
ap.add_argument('--out', default='questions.xml', help='куда писать XML (в папке скрипта)')
opts = ap.parse_args()
root = opts.root
verify_on = not opts.no_verify
only = set(opts.only.split(',')) if opts.only else None

TASKS = tasks_g1_g2.TASKS + tasks_g3_g4.TASKS + tasks_g5_g6.TASKS + tasks_g7.TASKS
here = os.path.dirname(os.path.abspath(__file__))


def lesson_text(n):
    if n == 0:
        pdf = os.path.join(root, '01 Цифровая схемотехника и ПЛИС', H.LESSONS[0], H.LESSONS[0] + '.pdf')
    else:
        name = H.LESSONS[n]
        pdf = os.path.join(root, '02 Verilog', name, name + '.pdf')
    r = subprocess.run(['pdftotext', '-layout', '-enc', 'UTF-8', pdf, '-'], capture_output=True)
    text = r.stdout.decode('utf-8', 'replace')
    import re
    return re.sub(r'[ \t]+', ' ', text)


lessons_text = {n: lesson_text(n) for n in H.LESSONS}

group_by_id = {g['id']: g for g in H.GROUPS}
allowed_by_group = {}
acc = set()
for g in H.GROUPS:
    acc |= set(g['lessons'])
    allowed_by_group[g['id']] = set(acc)

ok_all = True
report = []
questions = []
for t in TASKS:
    if only and t['id'] not in only:
        continue
    if verify_on:
        exp, problems = H.verify(t, lessons_text, allowed_by_group[t['group']])
    else:
        exp, problems = H.expected_for(t), []
    mark = 'ok ' if not problems else 'ERR'
    print('%s %-4s %-52s тестов: %d, неверных решений: %d' % (mark, t['id'], t['qname'], len(exp), len(t.get('mutants', []))))
    for p in problems:
        print('      -', p)
    ok_all = ok_all and not problems
    t['_exp'] = exp
    report.append((t, problems))

    # текст вопроса
    lessons_needed = sorted({lesson for lesson, _r, _w in t.get('needs', [])})

    def lesson_label(n):
        # метка @@L<n>@@ при загрузке в Moodle заменяется адресом презентации урока (create_homework.php, режим texts)
        if n == 0:
            return '<a href="@@L0@@">введение «Основы проектирования на ПЛИС»</a>'
        title = H.LESSONS[n].split('. ', 1)[1] if '. ' in H.LESSONS[n] else H.LESSONS[n]
        return '<a href="@@L%d@@">урок %d «%s»</a>' % (n, n, html.escape(title))

    stars = '★' * t['level'] + '☆' * (5 - t['level'])
    intro = TEXTS[t['id']]
    t['_text'] = ('<p><i>Сложность %s (%s). Пригодится: %s.</i></p>\n%s'
                  % (stars, H.LEVELS[t['level']], ', '.join(lesson_label(n) for n in lessons_needed), intro))

if not ok_all:
    print('\nЕСТЬ ПРОБЛЕМЫ: исправьте их до загрузки')
    if verify_on:
        sys.exit(1)

# XML
xml = ['<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n',
       '<question type="category"><category><text>$course$/top/Verilog</text></category></question>\n']
if not opts.no_prototype:
    xml.append(H.prototype_xml('VERILOG_PY', 'verilog_py', 'python3', 'python',
                               'Прототип: проверка текста ответа скриптом Python (шаблон задаётся в вопросе).'))
for t in TASKS:
    if only and t['id'] not in only:
        continue
    xml.append(H.question_xml(t, t['_exp'], t['_text']))
xml.append('</quiz>\n')
with open(os.path.join(here, opts.out), 'w', encoding='utf-8', newline='\n') as f:
    f.write(''.join(xml))
if only:
    print('\nГотово (частично): %s' % opts.out)
    sys.exit(0)

hw = []
for g in H.GROUPS:
    hw.append({'id': g['id'], 'title': g['title'], 'lessons': [H.LESSONS[n] for n in g['lessons']],
               'questions': [t['qname'] for t in TASKS if t['group'] == g['id'] and (not only or t['id'] in only)]})
with open(os.path.join(here, 'homework.json'), 'w', encoding='utf-8', newline='\n') as f:
    json.dump({'groups': hw, 'lessons': {str(n): name for n, name in H.LESSONS.items()}}, f, ensure_ascii=False, indent=1)

# карта покрытия
lines = ['# Карта заданий: что нужно знать и где это объяснено\n',
         'Строится автоматически (`build.py`): для каждого задания перечислены знания и урок, где они объяснены; '
         'сборка падает, если нужной фразы нет в презентации или урок ученик ещё не проходил.\n']
for g in H.GROUPS:
    lines.append('\n## Группа %d. %s\n' % (g['id'], g['title']))
    lines.append('Презентации: ' + '; '.join(H.LESSONS[n] for n in g['lessons']) + '\n')
    lines.append('| Задание | Уровень | Тестов | Нужные знания (урок: что) |\n|---|---|---|---|')
    for t, _p in report:
        if t['group'] != g['id']:
            continue
        needs = '; '.join('%d: %s' % (n, why) for n, _r, why in t.get('needs', []))
        lines.append('| %s | %d. %s | %d | %s |' % (t['qname'], t['level'], H.LEVELS[t['level']], len(t['_exp']), needs))
open(os.path.join(here, 'coverage.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
print('\nГотово: questions.xml, homework.json, coverage.md')
