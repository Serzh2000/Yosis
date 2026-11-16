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
    needs = {}
    for lesson, _regex, why in t.get('needs', []):
        needs.setdefault(lesson, []).append(why)
    lis = ''.join('<li>Урок %s: %s</li>' % (('«%s»' % H.LESSONS[n]) if n == 0 else
                                           ('%d «%s»' % (n, H.LESSONS[n].split('. ', 1)[1] if '. ' in H.LESSONS[n] else H.LESSONS[n])),
                                           html.escape('; '.join(w)))
                  for n, w in sorted(needs.items()))
    text = ('<p><b>Уровень самостоятельности %d из 5:</b> %s.</p>\n%s\n<p><b>На что опирается задание</b> (всё это объяснено в '
            'презентациях группы):</p><ul>%s</ul>\n<p>Напишите код в окне ниже и нажмите «Проверить». Результат покажет, на каких '
            'проверках решение работает неверно.</p>' % (t['level'], H.LEVELS[t['level']], t['intro'].strip(), lis))
    t['_text'] = text

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
    json.dump({'groups': hw}, f, ensure_ascii=False, indent=1)

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
