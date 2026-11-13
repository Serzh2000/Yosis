#!/usr/bin/env python3
"""Генерирует questions.xml (Moodle XML) для CodeRunner из папок заданий ../tasks.

Запуск:  python3 gen_questions.py <папка tasks> <куда писать questions.xml>

Тест = короткий фрагмент, подающий входы (`a = 1; b = 0;`); шаблон вопроса оборачивает ответ ученика
и этот фрагмент в тестбенч и печатает выходы. Проверяется точное совпадение напечатанного.
"""
import itertools
import os
import sys
from xml.sax.saxutils import escape

tasks_dir, out_path = sys.argv[1], sys.argv[2]

CATEGORY = '$course$/top/Verilog'

# Описание заданий: имя папки -> (модуль, входы, выходы, функция выходов от входов)
SPEC = {
    '01-wire': ('wire_demo', ['a'], ['y'], lambda v: {'y': v['a']}),
    '02-not': ('not_gate', ['a'], ['y'], lambda v: {'y': 1 - v['a']}),
    '03-and-or': ('gates2', ['a', 'b'], ['y_and', 'y_or'],
                  lambda v: {'y_and': v['a'] & v['b'], 'y_or': v['a'] | v['b']}),
    '04-half-adder': ('half_adder', ['a', 'b'], ['sum', 'carry'],
                      lambda v: {'sum': v['a'] ^ v['b'], 'carry': v['a'] & v['b']}),
    '05-mux': ('mux2', ['a', 'b', 'sel'], ['y'], lambda v: {'y': v['b'] if v['sel'] else v['a']}),
}


def cdata(s):
    return '<![CDATA[' + s + ']]>'


def template(module, ins, outs):
    regs = ', '.join(ins)
    wires = ', '.join(outs)
    ports = ', '.join('.%s(%s)' % (p, p) for p in ins + outs)
    fmt = ' '.join('%s=%%b' % o for o in outs)
    args = ', '.join(outs)
    return (
        '{{ STUDENT_ANSWER }}\n\n'
        '`timescale 1ns/1ps\n'
        'module tb;\n'
        '  reg %s;\n'
        '  wire %s;\n'
        '  %s dut(%s);\n'
        '  initial begin\n'
        '    {{ TEST.testcode }}\n'
        '    #1 $display("%s", %s);\n'
        '    $finish;\n'
        '  end\n'
        'endmodule\n'
    ) % (regs, wires, module, ports, fmt, args)


PROTOTYPE = '''
<question type="coderunner">
  <name><text>VERILOG_TB</text></name>
  <questiontext format="html"><text>Прототип: Verilog, ответ ученика плюс тестбенч из шаблона вопроса.</text></questiontext>
  <generalfeedback format="html"><text></text></generalfeedback>
  <defaultgrade>1.0000000</defaultgrade>
  <penalty>0.0000000</penalty>
  <hidden>0</hidden>
  <coderunnertype>verilog_tb</coderunnertype>
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
  <language>verilog</language>
  <acelang>verilog</acelang>
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


def question(folder):
    module, ins, outs, fn = SPEC[folder]
    d = os.path.join(tasks_dir, folder)
    title = open(os.path.join(d, 'title.txt'), encoding='utf-8').read().strip()
    description = open(os.path.join(d, 'description.html'), encoding='utf-8').read()
    starter = open(os.path.join(d, 'starter.v'), encoding='utf-8').read()
    solution = open(os.path.join(d, 'solution.v'), encoding='utf-8').read()
    text = (description +
            '<p><b>Что делать.</b> Допишите код в окне ниже и нажмите «Проверить». '
            'Когда все проверки зелёные, нажмите «Закончить попытку…» внизу страницы: так оценка запишется в журнал '
            'и откроется следующее задание.</p>')
    tests = []
    combos = list(itertools.product([0, 1], repeat=len(ins)))
    for i, combo in enumerate(combos):
        v = dict(zip(ins, combo))
        stim = ' '.join('%s = %d;' % (k, v[k]) for k in ins)
        out = fn(v)
        expected = ' '.join('%s=%d' % (o, out[o]) for o in outs)
        example = '1' if i < 2 else '0'
        tests.append(
            '    <testcase testtype="0" useasexample="%s" hiderestiffail="0" mark="1.0000000">\n'
            '      <testcode><text>%s</text></testcode>\n'
            '      <stdin><text></text></stdin>\n'
            '      <expected><text>%s</text></expected>\n'
            '      <extra><text></text></extra>\n'
            '      <display><text>SHOW</text></display>\n'
            '    </testcase>\n' % (example, escape(stim), escape(expected)))
    return (
        '<question type="coderunner">\n'
        '  <name><text>%s</text></name>\n'
        '  <questiontext format="html"><text>%s</text></questiontext>\n'
        '  <generalfeedback format="html"><text>%s</text></generalfeedback>\n'
        '  <defaultgrade>1.0000000</defaultgrade>\n'
        '  <penalty>0.0000000</penalty>\n'
        '  <hidden>0</hidden>\n'
        '  <coderunnertype>verilog_tb</coderunnertype>\n'
        '  <prototypetype>0</prototypetype>\n'
        '  <allornothing>0</allornothing>\n'
        '  <penaltyregime>0</penaltyregime>\n'
        '  <precheck>0</precheck>\n'
        '  <hidecheck>0</hidecheck>\n'
        '  <showsource>0</showsource>\n'
        '  <answerboxlines>14</answerboxlines>\n'
        '  <answerboxcolumns>90</answerboxcolumns>\n'
        '  <answerpreload>%s</answerpreload>\n'
        '  <globalextra></globalextra>\n'
        '  <useace>1</useace>\n'
        '  <resultcolumns>[["Что подали", "testcode"], ["Ожидалось", "expected"], ["Получено", "got"]]</resultcolumns>\n'
        '  <template>%s</template>\n'
        '  <iscombinatortemplate>0</iscombinatortemplate>\n'
        '  <allowmultiplestdins>0</allowmultiplestdins>\n'
        '  <answer>%s</answer>\n'
        '  <validateonsave>0</validateonsave>\n'
        '  <testsplitterre></testsplitterre>\n'
        '  <language></language>\n'
        '  <acelang></acelang>\n'
        '  <sandbox></sandbox>\n'
        '  <grader></grader>\n'
        '  <cputimelimitsecs></cputimelimitsecs>\n'
        '  <memlimitmb></memlimitmb>\n'
        '  <sandboxparams></sandboxparams>\n'
        '  <templateparams></templateparams>\n'
        '  <hoisttemplateparams>1</hoisttemplateparams>\n'
        '  <extractcodefromjson>1</extractcodefromjson>\n'
        '  <templateparamslang>None</templateparamslang>\n'
        '  <templateparamsevalpertry>0</templateparamsevalpertry>\n'
        '  <templateparamsevald>{}</templateparamsevald>\n'
        '  <twigall>0</twigall>\n'
        '  <uiplugin></uiplugin>\n'
        '  <uiparameters></uiparameters>\n'
        '  <attachments>0</attachments>\n'
        '  <attachmentsrequired>0</attachmentsrequired>\n'
        '  <maxfilesize>10240</maxfilesize>\n'
        '  <filenamesregex></filenamesregex>\n'
        '  <filenamesexplain></filenamesexplain>\n'
        '  <displayfeedback>1</displayfeedback>\n'
        '  <giveupallowed>0</giveupallowed>\n'
        '  <prototypeextra></prototypeextra>\n'
        '  <testcases>\n%s  </testcases>\n'
        '</question>\n' % (
            escape(title), cdata(text),
            cdata('<p>Верно! Теперь закончите попытку и переходите к следующему заданию.</p>'),
            escape(starter), cdata(template(module, ins, outs)), escape(solution), ''.join(tests)))


body = ['<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n',
        '<question type="category"><category><text>%s</text></category></question>\n' % CATEGORY,
        PROTOTYPE]
for folder in sorted(SPEC):
    body.append(question(folder))
body.append('</quiz>\n')
with open(out_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(''.join(body))
print('ok', len(SPEC), 'вопросов ->', out_path)
