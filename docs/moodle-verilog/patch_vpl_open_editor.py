#!/usr/bin/env python3
"""Делает так, чтобы ссылка на задание VPL в курсе сразу открывала редактор кода с условием
на весь экран (без вкладок Moodle). Выйти из полного экрана можно кнопкой в панели редактора;
параметр forms/edit.php?id=...&full=0 отключает полноэкранный режим.

Страница описания и настроек (с файлами исполнения) остаётся доступной через вкладку
«Описание» или по адресу view.php?id=...&info=1.

Запуск на сервере Moodle:  python3 patch_vpl_open_editor.py /путь/к/public/mod/vpl
Повторный запуск безопасен. После обновления плагина VPL патч нужно применить снова.
Оригиналы сохраняются рядом с файлами с расширением .orig.
"""
import os
import shutil
import sys

root = sys.argv[1]

VIEW_MARK = '// Yosis: открыть редактор'
VIEW_ANCHOR = '\\mod_vpl\\event\\vpl_description_viewed::log($vpl);'
VIEW_PATCH = (
    VIEW_MARK + ' с условием сразу; описание и настройки: view.php?id=...&info=1\n'
    "if (!optional_param('info', 0, PARAM_BOOL) && $vpl->has_capability(VPL_SUBMIT_CAPABILITY)) {\n"
    "    redirect(new moodle_url('/mod/vpl/forms/edit.php', ['id' => $id]));\n"
    '}\n\n'
)

MENU_OLD = "$href = \\vpl_mod_href('view.php', $parmsuser);"
MENU_NEW = "$href = \\vpl_mod_href('view.php', $parmsuser + ['info' => 1]);"


def patch(path, fn):
    with open(path, encoding='utf-8', newline='') as f:
        text = f.read()
    new = fn(text)
    if new == text:
        print('без изменений:', path)
        return
    if not os.path.exists(path + '.orig'):
        shutil.copyfile(path, path + '.orig')
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(new)
    print('исправлен:', path)


def patch_view(text):
    if VIEW_MARK in text:
        return text
    if VIEW_ANCHOR not in text:
        sys.exit('в view.php не найдено место вставки; версия VPL изменилась')
    return text.replace(VIEW_ANCHOR, VIEW_PATCH + VIEW_ANCHOR, 1)


def patch_menu(text):
    if MENU_NEW in text:
        return text
    if MENU_OLD not in text:
        sys.exit('в activity_menu.php не найдена ссылка вкладки «Описание»; версия VPL изменилась')
    return text.replace(MENU_OLD, MENU_NEW, 1)

EDIT_MARK = '// Yosis: редактор на весь экран'
EDIT_ANCHOR = '$vpl->print_footer();'
EDIT_PATCH = (
    EDIT_MARK + '; выйти: кнопка в панели редактора, отключить: &full=0\n'
    "if (optional_param('full', 1, PARAM_BOOL)) {\n"
    "    echo '<script>(function(){var n=0,t=setInterval(function(){"
    "var b=document.getElementById(\"vpl_ide_fullscreen\");"
    "if(b){clearInterval(t);b.click();}else if(++n>100){clearInterval(t);}},100);})();</script>';\n"
    '}\n\n'
)


def patch_edit(text):
    if EDIT_MARK in text:
        return text
    if text.count(EDIT_ANCHOR) != 1:
        sys.exit('в forms/edit.php не найдено место вставки; версия VPL изменилась')
    return text.replace(EDIT_ANCHOR, EDIT_PATCH + EDIT_ANCHOR, 1)


patch(os.path.join(root, 'view.php'), patch_view)
patch(os.path.join(root, 'classes', 'views', 'activity_menu.php'), patch_menu)
patch(os.path.join(root, 'forms', 'edit.php'), patch_edit)
