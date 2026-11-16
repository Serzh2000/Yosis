"""Каркас домашних заданий по Verilog для CodeRunner.

Задание описывается словарём (см. tasks_*.py). Отсюда строятся:
  * шаблон CodeRunner (ответ ученика + испытательный стенд + тест),
  * ожидаемый вывод каждого теста (прогоном эталонного решения в Icarus Verilog),
  * проверка «неправильных» решений (каждое должно проваливать хотя бы один тест),
  * проверка, что нужные знания есть в презентациях (по ключевым словам),
  * Moodle XML.
"""
import os
import re
import subprocess
import tempfile
from xml.sax.saxutils import escape

IVERILOG = os.environ.get('IVERILOG', 'iverilog')
VVP = os.environ.get('VVP', 'vvp')

# Номера уроков → названия презентаций (0 — «Основы проектирования цифровых устройств на ПЛИС»)
LESSONS = {
    0: 'Основы проектирования цифровых устройств на ПЛИС',
    1: 'Verilog 01. Что такое Verilog', 2: 'Verilog 02. Модуль и порты', 3: 'Verilog 03. Логические операторы',
    4: 'Verilog 04. Шины и числа', 5: 'Verilog 05. Выводы платы и файл .cst',
    6: 'Verilog 06. Условный оператор и мультиплексор', 7: 'Verilog 07. Арифметика',
    8: 'Verilog 08. Блок always и оператор case', 9: 'Verilog 09. Иерархия модулей',
    10: 'Verilog 10. Симуляция и testbench', 11: 'Verilog 11. Такт и D-триггер',
    12: 'Verilog 12. Сброс, разрешение и виды присваивания', 13: 'Verilog 13. Счётчик и делитель частоты',
    14: 'Verilog 14. Сдвиговый регистр', 15: 'Verilog 15. Кнопки - синхронизация, дребезг, фронт',
    16: 'Verilog 16. Параметры и generate', 17: 'Verilog 17. Конечный автомат - светофор',
    18: 'Verilog 18. ШИМ - яркость и «дыхание» светодиода', 19: 'Verilog 19. Память - массивы, ПЗУ и ОЗУ',
    20: 'Verilog 20. UART - связь с компьютером и итоговый проект',
}

# Группы (папки в Moodle): порядок важен, уроки группы — то, что ученик уже прошёл к её заданиям
GROUPS = [
    {'id': 1, 'title': 'Основы: модуль, порты, логические элементы', 'lessons': [0, 1, 2, 3]},
    {'id': 2, 'title': 'Шины, числа и выбор', 'lessons': [4, 6, 7]},
    {'id': 3, 'title': 'Описание поведения и структура', 'lessons': [8, 9]},
    {'id': 4, 'title': 'Плата и проверка схемы', 'lessons': [5, 10]},
    {'id': 5, 'title': 'Время: триггеры, регистры, счётчики', 'lessons': [11, 12, 13, 14]},
    {'id': 6, 'title': 'Реальный мир и управление', 'lessons': [15, 16, 17, 18]},
    {'id': 7, 'title': 'Память и связь', 'lessons': [19, 20]},
]

LEVELS = {
    1: 'по образцу: допишите пропуск',
    2: 'исправьте или измените готовый код',
    3: 'по описанию: порты заданы, содержимое пишете вы',
    4: 'по задаче: интерфейс задан, устройство продумываете сами',
    5: 'комплексное: несколько идей из разных уроков',
}

CLOCK = ('  reg clk;\n  initial clk = 0;\n'
         '  task tick; begin #5 clk = 1; #5 clk = 0; end endtask\n'
         '  task rise; begin #5 clk = 1; end endtask\n'
         '  task fall; begin #5 clk = 0; end endtask\n')


def twig_safe(text):
    for bad in ('{{', '{%', '{#'):
        assert bad not in text, 'в шаблоне есть %r: Twig это разберёт' % bad


def template(t):
    """Шаблон CodeRunner (на каждый тест)."""
    kind = t.get('kind', 'verilog')
    if kind == 'tbwrite':
        parts = []
        for i, (key, dut) in enumerate(t['variants'].items()):
            parts.append(('{%% if TEST.testcode == "%s" %%}\n%s\n' % (key, dut)) if i == 0
                         else ('{%% elseif TEST.testcode == "%s" %%}\n%s\n' % (key, dut)))
        s = ''.join(parts) + '{% endif %}\n\n{{ STUDENT_ANSWER }}\n'
        twig_safe(s.replace('{% if', '').replace('{% elseif', '').replace('{% endif %}', '')
                  .replace('{{ STUDENT_ANSWER }}', '').replace('%}', ''))
        return s
    if kind == 'python':
        return t['python_template']
    tb = t['tb']
    decls = tb.get('decls', '')
    body = (
        '{{ STUDENT_ANSWER }}\n\n'
        '`timescale 1ns/1ps\n'
        'module tb;\n'
        + decls + ('\n' if decls and not decls.endswith('\n') else '')
        + tb['inst'] + '\n'
        + ('  task show; begin #1; ' + tb['show'] + ' end endtask\n' if tb.get('show') else '')
        + tb.get('helpers', '') + '\n'
        '  initial begin\n'
        '    {{ TEST.testcode }}\n'
        '    $finish;\n'
        '  end\n'
        'endmodule\n')
    twig_safe(body.replace('{{ STUDENT_ANSWER }}', '').replace('{{ TEST.testcode }}', ''))
    return body


def run_verilog(source, extra_args=()):
    with tempfile.TemporaryDirectory() as d:
        src = os.path.join(d, 'prog.v')
        open(src, 'w', encoding='utf-8').write(source)
        out = os.path.join(d, 'prog.vvp')
        c = subprocess.run([IVERILOG, '-g2012', '-Wall', '-Wno-timescale', '-o', out, src, *extra_args],
                           capture_output=True, text=True, encoding='utf-8', errors='replace')
        if c.returncode != 0:
            return None, c.stderr
        try:
            r = subprocess.run([VVP, '-n', out], capture_output=True, text=True, encoding='utf-8',
                               errors='replace', timeout=20)
        except subprocess.TimeoutExpired:
            return None, 'таймаут'
        # Icarus 12 печатает «$finish called at …» в stdout, в песочнице (Icarus 11) этого нет
        out_lines = [l for l in r.stdout.splitlines() if '$finish called' not in l and '$stop called' not in l]
        return '\n'.join(out_lines) + '\n', r.stderr


def render(t, answer, testcode):
    if t.get('kind') == 'tbwrite':
        # Twig выбирает вариант испытуемого модуля по тесту; локально делаем то же напрямую
        return t['variants'][testcode] + '\n\n' + answer
    tpl = template(t)
    return tpl.replace('{{ STUDENT_ANSWER }}', answer).replace('{{ TEST.testcode }}', testcode)


def norm(s):
    return '\n'.join(line.rstrip() for line in (s or '').strip().splitlines())


def expected_for(t):
    """Ожидаемый вывод каждого теста (для обычных заданий) или регулярное выражение (для стендов)."""
    kind = t.get('kind', 'verilog')
    if kind == 'tbwrite':
        return [(k, v) for k, v in t['variants_expect'].items()]
    if kind == 'python':
        return [(c, 'ok') for c in t['tests']]
    res = []
    for code in t['tests']:
        out, err = run_verilog(render(t, t['answer'], code))
        if out is None:
            raise SystemExit('эталон не компилируется/не работает в задании %s: %s' % (t['id'], err[:600]))
        res.append((code, norm(out)))
    return res


def run_task_case(t, answer, code, expect):
    """True, если решение проходит тест."""
    kind = t.get('kind', 'verilog')
    if kind == 'python':
        out = run_python_template(t, answer, code)
        return norm(out) == expect
    out, err = run_verilog(render(t, answer, code))
    if out is None:
        return False
    if kind == 'tbwrite':
        return re.search(expect, out, re.M | re.S) is not None
    return norm(out) == expect


def run_python_template(t, answer, code):
    escaped = answer.replace('\\', '\\\\').replace('"', '\\"')  # e('py'): слэши и кавычки; переводы строк остаются
    src = t['python_template'].replace("{{ STUDENT_ANSWER | e('py') }}", escaped) \
        .replace('{{ TEST.testcode }}', code)
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, 'x.py')
        open(p, 'w', encoding='utf-8').write(src)
        env = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONUTF8='1')
        r = subprocess.run(['python', p], capture_output=True, text=True, encoding='utf-8', errors='replace',
                           timeout=20, env=env)
        return r.stdout


def verify(t, lessons_text, allowed_lessons):
    """Проверки задания; возвращает список (ожидание, список сообщений-проблем)."""
    problems = []
    exp = expected_for(t)
    # эталон проходит всё
    for code, e in exp:
        if not run_task_case(t, t['answer'], code, e):
            problems.append('эталон не проходит тест %r' % code)
    # неправильные решения провалятся
    for i, m in enumerate(t.get('mutants', [])):
        fails = sum(1 for code, e in exp if not run_task_case(t, m, code, e))
        if fails == 0:
            problems.append('неправильное решение #%d проходит все тесты' % (i + 1))
    # заготовка не должна проходить всё
    if t.get('starter') is not None and t.get('kind', 'verilog') != 'python':
        passes = sum(1 for code, e in exp if run_task_case(t, t['starter'], code, e))
        if passes == len(exp) and exp:
            problems.append('заготовка уже проходит все тесты')
    # нужные знания есть в презентациях и в нужном порядке
    for lesson, regex, why in t.get('needs', []):
        if lesson not in allowed_lessons:
            problems.append('знание «%s» из урока %d, который ученик ещё не прошёл' % (why, lesson))
        txt = lessons_text.get(lesson, '')
        if not re.search(regex, txt, re.I | re.S):
            problems.append('в уроке %d не найдено «%s» (%s)' % (lesson, why, regex))
    return exp, problems


# ---------------------------------------------------------------- XML

def cdata(s):
    assert ']]>' not in s
    return '<![CDATA[' + s + ']]>'


PROTOTYPE_TEMPLATE = '''
<question type="coderunner">
  <name><text>%(name)s</text></name>
  <questiontext format="html"><text>%(text)s</text></questiontext>
  <generalfeedback format="html"><text></text></generalfeedback>
  <defaultgrade>1.0000000</defaultgrade>
  <penalty>0.0000000</penalty>
  <hidden>0</hidden>
  <coderunnertype>%(ctype)s</coderunnertype>
  <prototypetype>2</prototypetype>
  <allornothing>0</allornothing>
  <penaltyregime>0</penaltyregime>
  <precheck>0</precheck>
  <hidecheck>0</hidecheck>
  <showsource>0</showsource>
  <answerboxlines>14</answerboxlines>
  <answerboxcolumns>90</answerboxcolumns>
  <answerpreload></answerpreload>
  <globalextra></globalextra>
  <useace>1</useace>
  <resultcolumns></resultcolumns>
  <template>{{ STUDENT_ANSWER }}</template>
  <iscombinatortemplate>0</iscombinatortemplate>
  <allowmultiplestdins>0</allowmultiplestdins>
  <answer></answer>
  <validateonsave>0</validateonsave>
  <testsplitterre></testsplitterre>
  <language>%(lang)s</language>
  <acelang>%(ace)s</acelang>
  <sandbox></sandbox>
  <grader>EqualityGrader</grader>
  <cputimelimitsecs></cputimelimitsecs>
  <memlimitmb></memlimitmb>
  <sandboxparams></sandboxparams>
  <templateparams></templateparams>
  <hoisttemplateparams>1</hoisttemplateparams>
  <extractcodefromjson>1</extractcodefromjson>
  <templateparamslang>None</templateparamslang>
  <templateparamsevalpertry>0</templateparamsevalpertry>
  <templateparamsevald>{}</templateparamsevald>
  <twigall>0</twigall>
  <uiplugin>ace</uiplugin>
  <uiparameters></uiparameters>
  <attachments>0</attachments>
  <attachmentsrequired>0</attachmentsrequired>
  <maxfilesize>10240</maxfilesize>
  <filenamesregex></filenamesregex>
  <filenamesexplain></filenamesexplain>
  <displayfeedback>1</displayfeedback>
  <giveupallowed>0</giveupallowed>
  <prototypeextra></prototypeextra>
  <testcases>
    <testcase testtype="0" useasexample="0" hiderestiffail="0" mark="1.0000000">
      <testcode><text></text></testcode>
      <stdin><text></text></stdin>
      <expected><text></text></expected>
      <extra><text></text></extra>
      <display><text>SHOW</text></display>
    </testcase>
  </testcases>
</question>
'''


def prototype_xml(name, ctype, lang, ace, text):
    return PROTOTYPE_TEMPLATE % {'name': name, 'ctype': ctype, 'lang': lang, 'ace': ace, 'text': escape(text)}


def question_xml(t, exp, text_html):
    kind = t.get('kind', 'verilog')
    ctype = {'verilog': 'verilog_tb', 'tbwrite': 'verilog_tb', 'python': 'verilog_py'}[kind]
    grader = 'RegexGrader' if kind == 'tbwrite' else ''
    cols = ('[["Что проверяем", "testcode"], ["Результат", "expected"]]' if kind in ('tbwrite', 'python')
            else '[["Что подали", "testcode"], ["Ожидалось", "expected"], ["Получено", "got"]]')
    tests = []
    for i, (code, e) in enumerate(exp):
        example = '1' if i < t.get('examples', 2) else '0'
        tests.append(
            '    <testcase testtype="0" useasexample="%s" hiderestiffail="0" mark="1.0000000">\n'
            '      <testcode><text>%s</text></testcode>\n'
            '      <stdin><text></text></stdin>\n'
            '      <expected><text>%s</text></expected>\n'
            '      <extra><text></text></extra>\n'
            '      <display><text>SHOW</text></display>\n'
            '    </testcase>\n' % (example, escape(code), escape(e)))
    return (
        '<question type="coderunner">\n'
        '  <name><text>%s</text></name>\n'
        '  <questiontext format="html"><text>%s</text></questiontext>\n'
        '  <generalfeedback format="html"><text>%s</text></generalfeedback>\n'
        '  <defaultgrade>1.0000000</defaultgrade>\n  <penalty>0.0000000</penalty>\n  <hidden>0</hidden>\n'
        '  <coderunnertype>%s</coderunnertype>\n  <prototypetype>0</prototypetype>\n'
        '  <allornothing>0</allornothing>\n  <penaltyregime>0</penaltyregime>\n  <precheck>0</precheck>\n'
        '  <hidecheck>0</hidecheck>\n  <showsource>0</showsource>\n'
        '  <answerboxlines>%d</answerboxlines>\n  <answerboxcolumns>90</answerboxcolumns>\n'
        '  <answerpreload>%s</answerpreload>\n  <globalextra></globalextra>\n  <useace>1</useace>\n'
        '  <resultcolumns>%s</resultcolumns>\n  <template>%s</template>\n'
        '  <iscombinatortemplate>0</iscombinatortemplate>\n  <allowmultiplestdins>0</allowmultiplestdins>\n'
        '  <answer>%s</answer>\n  <validateonsave>0</validateonsave>\n  <testsplitterre></testsplitterre>\n'
        '  <language></language>\n  <acelang></acelang>\n  <sandbox></sandbox>\n  <grader>%s</grader>\n'
        '  <cputimelimitsecs></cputimelimitsecs>\n  <memlimitmb></memlimitmb>\n  <sandboxparams></sandboxparams>\n'
        '  <templateparams></templateparams>\n  <hoisttemplateparams>1</hoisttemplateparams>\n'
        '  <extractcodefromjson>1</extractcodefromjson>\n  <templateparamslang>None</templateparamslang>\n'
        '  <templateparamsevalpertry>0</templateparamsevalpertry>\n  <templateparamsevald>{}</templateparamsevald>\n'
        '  <twigall>0</twigall>\n  <uiplugin></uiplugin>\n  <uiparameters></uiparameters>\n'
        '  <attachments>0</attachments>\n  <attachmentsrequired>0</attachmentsrequired>\n'
        '  <maxfilesize>10240</maxfilesize>\n  <filenamesregex></filenamesregex>\n  <filenamesexplain></filenamesexplain>\n'
        '  <displayfeedback>1</displayfeedback>\n  <giveupallowed>0</giveupallowed>\n  <prototypeextra></prototypeextra>\n'
        '  <testcases>\n%s  </testcases>\n</question>\n' % (
            escape(t['qname']), cdata(text_html),
            cdata('<p>Все проверки пройдены. Переходите к следующему заданию группы.</p>'),
            ctype, t.get('lines', 16), escape(t.get('starter') or ''), cols, cdata(template(t)),
            escape(t['answer']), grader, ''.join(tests)))
