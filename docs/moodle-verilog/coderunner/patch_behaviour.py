#!/usr/bin/env python3
"""Исправляет плагин qbehaviour_adaptive_adapted_for_coderunner на Moodle 5.2.

Без правки после завершения теста выпадает «Class "qbehaviour_adaptive_type" not found»: файл behaviourtype.php
плагина наследуется от класса, который не подгружается автоматически.

Запуск на сервере:  python3 patch_behaviour.py /путь/к/public/question/behaviour/adaptive_adapted_for_coderunner
Повторный запуск безопасен; оригинал сохраняется как behaviourtype.php.orig. После обновления плагина применить снова.
"""
import os
import shutil
import sys

path = os.path.join(sys.argv[1], 'behaviourtype.php')
mark = 'Локальная правка'
text = open(path, encoding='utf-8', newline='').read()
if mark in text:
    print('без изменений:', path)
    sys.exit(0)
anchor = "defined('MOODLE_INTERNAL') || die();"
if anchor not in text:
    sys.exit('не найдено место вставки; версия плагина изменилась')
add = ("\n\n// " + mark + ": базовый класс типа поведения не подгружается автоматически (Moodle 5.2).\n"
       "require_once($CFG->dirroot . \"/question/behaviour/adaptive/behaviourtype.php\");")
if not os.path.exists(path + '.orig'):
    shutil.copyfile(path, path + '.orig')
open(path, 'w', encoding='utf-8', newline='').write(text.replace(anchor, anchor + add, 1))
print('исправлен:', path)
