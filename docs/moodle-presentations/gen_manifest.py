#!/usr/bin/env python3
"""Манифест расстановки презентаций из папки ТСП по курсам Moodle.

Запуск:  python3 gen_manifest.py <папка ТСП> manifest.json

Каждое действие: добавить файл как «Файл» в раздел/подраздел курса (в начало), старые версии скрыть, не удалять.
"""
import json
import os
import sys

root, out = sys.argv[1], sys.argv[2]


def has(rel):
    p = os.path.join(root, rel)
    if not os.path.isfile(p):
        sys.exit('нет файла: ' + rel)
    return rel


def deck(folder, name, ext='pptx'):
    return has('%s/%s/%s.%s' % (folder, name, name, ext))


PPT = ['pptx', 'pdf']


def add(path, rel, name, replaces=None):
    return {'type': 'add', 'path': path, 'file': rel, 'name': name, 'replaces': replaces or []}


courses = []

# ---------------- ТСП ----------------
tsp = []
B1 = 'Блок 1. Аддитивные технологии'
B2 = 'Блок 2. Субтрактивные технологии'
B3 = 'Блок 3. Электроника и микропроцессорная техника'
ADD = '04 Аддитивные технологии'
CNC = '05 Станки и резка с ЧПУ'

tsp.append(add([B1], deck(ADD, 'Урок 1. CAD, CAM, CAE'), 'Урок 1. CAD, CAM, CAE'))
tsp.append(add([B1, '1. Термопласты. FDM печать.'],
               deck(ADD, 'FDM - экструзия, заполнение, постобработка, материалы'),
               'FDM - экструзия, заполнение, постобработка, материалы',
               [{'name': 'Презентация по FDM №1'}, {'name': 'Презентация по FDM №2'}]))
tsp.append(add([B1, '1. Термопласты. FDM печать.'],
               deck(ADD, 'Урок 4. Заполнение, постобработка, материалы'),
               'Урок 4. Заполнение, постобработка, материалы'))
tsp.append(add([B1, '2. Фотополимерная печать. SLA, DLP, LCD методы печати'],
               deck(ADD, 'Урок 5. Фотополимеризация - SLA, DLP, LCD'),
               'Урок 5. Фотополимеризация - SLA, DLP, LCD',
               [{'name': 'Презентация по SLA, DLP, LCD.'}]))
tsp.append(add([B1, '3. Лазерное спекание. SLS'],
                deck(ADD, 'Урок 6. Лазерное спекание SLS'), 'Урок 6. Лазерное спекание SLS',
                [{'name': 'Презентация по SLS'}]))
tsp.append(add([B1, '5. Печать металлами. DMLS, SLM, EDM'],
               deck(ADD, 'Урок 7. Печать металлами - DMLS, SLM, EBM'),
               'Урок 7. Печать металлами - DMLS, SLM, EBM',
               [{'name': 'Презентация по DMLS, SLM, EBM'}]))
tsp.append(add([B1], deck(ADD, 'Урок 8. Слайсеры и G-код'), 'Урок 8. Слайсеры и G-код'))
# дубли подразделов FDM: оставить первую копию, остальные скрыть
tsp.append({'type': 'hide_dupes', 'path': [B1, '1. Термопласты. FDM печать.'],
            'names': ['Конспект по FDM', 'Тест по FDM печати']})

for sub, name in [('2. Основы фрезерной обработки с ЧПУ: принцип работы и особенности', 'Фрезерный станок с ЧПУ'),
                  ('3. Основы токарной обработки с ЧПУ: принцип работы и особенности', 'Токарный станок с ЧПУ'),
                  ('4. Лазерная резка', 'Лазерная резка с ЧПУ'),
                  ('5. Гидроабразивная резка', 'Гидроабразивная резка с ЧПУ')]:
    tsp.append(add([B2, sub], deck(CNC, name), name, [{'name': name}]))
tsp.append(add([B2], deck(CNC, 'Плазменная (плазмохимическая) резка'), 'Плазменная (плазмохимическая) резка',
               [{'name': 'Плазменная (плазмохимическая) резка'}]))

MAT = '03 Материаловедение'
mats = [
    'Материаловедение 1. Полупроводники', 'Материаловедение 2. Получение чистого кремния',
    'Материаловедение 3. Кристаллография', 'Материаловедение 4. Дефекты и сопротивление',
    'Материаловедение 5. Зонная теория', 'Материаловедение 6. Собственная и примесная проводимость',
    'Материаловедение 7. Легирование, p-n переход, диод', 'Материаловедение 8. Электровакуумные лампы',
    'Материаловедение 9. Физика транзисторов', 'Материаловедение 10. Физические эффекты']
S31 = '3.1. Технологии получения полупроводников'
for i, m in enumerate(mats):
    reps = [{'name': x} for x in mats[:5]] + [{'name': 'shift register'}] if i == 0 else []
    tsp.append(add([B3, S31], deck(MAT, m), m, reps))

DIG = '01 Цифровая схемотехника и ПЛИС'
S33 = '3.3. Цифровая электроника'
dig = ['Введение в цифровую электронику', 'Триггеры', 'Шифраторы, дешифраторы, мультиплексоры',
       'Полусумматоры и сумматоры', 'Арифметико-логическое устройство']
for i, d in enumerate(dig):
    reps = [{'name': x, 'ext': PPT} for x in dig] + [{'name': 'diagnostika sli1de'}] if i == 0 else []
    tsp.append(add([B3, S33], deck(DIG, d), d, reps))

S34 = '3.4. Проектирование электроники'
tsp.append({'type': 'add_subsection', 'path': [B3], 'name': S34})
tsp.append(add([B3, S34], deck(DIG, 'Основы проектирования цифровых устройств на ПЛИС'),
               'Основы проектирования цифровых устройств на ПЛИС'))
VER = '02 Verilog'
verilog = sorted(d for d in os.listdir(os.path.join(root, VER)) if d.startswith('Verilog '))
for d in verilog:
    tsp.append(add([B3, S34], deck(VER, d), d))
tsp.append({'type': 'hide_cm', 'path': [B3], 'name': '3.2.2. Операционные усилители', 'modname': 'subsection'})
courses.append({'shortname': 'ТСП', 'actions': tsp})

# ---------------- БАС ----------------
BPLA = '06 БПЛА'
bas = []
P1 = ['Блок 1. Право', '1. Правовые основы использования БПЛА в рамках законодательства РФ']
bas.append(add(P1, deck(BPLA, 'Нормативно-правовая база полётов'), 'Нормативно-правовая база полётов',
               [{'name': 'Нормативно-правовая база полётов'}]))
bas.append(add(P1, deck(BPLA, 'Оператор БПЛА — Модуль 1 - логические блоки'),
               'Оператор БПЛА — Модуль 1 - логические блоки'))
bas.append(add(P1, deck(BPLA, 'Безопасность и ответственность'), 'Безопасность и ответственность'))
bas.append(add(P1, deck(BPLA, 'Экипаж, нештатные ситуации и документация'),
               'Экипаж, нештатные ситуации и документация'))
bas.append(add(P1, deck(BPLA, 'Экзаменационные билеты. Практическая часть', 'docx'),
               'Экзаменационные билеты. Практическая часть (Word)'))
bas.append(add(P1, deck(BPLA, 'Экзаменационные билеты. Практическая часть', 'pdf'),
               'Экзаменационные билеты. Практическая часть (PDF)'))
P2 = ['Блок 2. Аппаратная часть.', '1. Основные составляющие БПЛА']
bas.append(add(P2, deck(BPLA, 'Конструкция БАС и системы взлёта-посадки'), 'Конструкция БАС и системы взлёта-посадки',
               [{'name': 'Презентация'}]))
bas.append(add(P2, deck(BPLA, 'Управление, связь и энергообеспечение'), 'Управление, связь и энергообеспечение'))
P3 = ['Блок 2. Аппаратная часть.', '2. Положение в пространстве. Режимы полёта.']
bas.append(add(P3, deck(BPLA, 'Аэродинамика и выполнение полётов'), 'Аэродинамика и выполнение полётов',
               [{'name': 'Как летает дрон — аэродинамика для юных пилотов'}]))
bas.append(add(P3, deck(BPLA, 'Навигация и метеорология'), 'Навигация и метеорология'))
bas.append({'type': 'hide_cm', 'path': ['Блок 2. Аппаратная часть.'], 'name': 'Новая подсекция',
            'modname': 'subsection'})
courses.append({'shortname': 'БАС', 'actions': bas})

# ---------------- Python ----------------
PY = '07 Python'
py = [
    add(['1. Типы данных'], deck(PY, 'Типы данных в Python'), 'Типы данных в Python',
        [{'name': 'Презентация к уроку', 'in_target': True}]),
    add(['1. Типы данных'], deck(PY, 'Арифметические операции в Python'), 'Арифметические операции в Python'),
]
courses.append({'shortname': 'Python для школьников', 'actions': py})

# ---------------- СиСа ----------------
sisa = [
    add(['Сетевое администрирование', '1. Работа с Linux (Ubuntu)'],
        deck('09 Linux', 'Базовые команды Linux'), 'Базовые команды Linux',
        [{'name': 'Базовые команды Linux. Презентация'}]),
    {'type': 'hide_sections', 'name': 'Новая секция'},
]
courses.append({'shortname': 'СиСа', 'actions': sisa})

# ---------------- Arduino и ESP32 (новый курс, скрытый) ----------------
AR = '08 Arduino и ESP32'
ard = [
    {'type': 'create_course', 'fullname': 'Arduino и ESP32', 'shortname': 'ArduinoESP32',
     'summary': 'Знакомство с Arduino и ESP32-S3.'},
    {'type': 'name_section', 'section': 1, 'name': 'Arduino'},
    {'type': 'name_section', 'section': 2, 'name': 'ESP32-S3'},
    {'type': 'add_to_section', 'section': 1, 'file': deck(AR, 'Arduino - первое знакомство'),
     'name': 'Arduino - первое знакомство'},
    {'type': 'add_to_section', 'section': 2, 'file': deck(AR, 'Базовые уроки по ESP32-S3', 'docx'),
     'name': 'Базовые уроки по ESP32-S3 (Word)'},
    {'type': 'add_to_section', 'section': 2, 'file': deck(AR, 'Базовые уроки по ESP32-S3', 'pdf'),
     'name': 'Базовые уроки по ESP32-S3 (PDF)'},
]
courses.append({'shortname': 'ArduinoESP32', 'actions': ard})

with open(out, 'w', encoding='utf-8', newline='\n') as f:
    json.dump({'courses': courses}, f, ensure_ascii=False, indent=1)
print('ok', sum(len(c['actions']) for c in courses), 'действий ->', out)
