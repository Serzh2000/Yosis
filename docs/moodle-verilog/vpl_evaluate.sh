#!/bin/bash
# Автопроверка Verilog в Moodle (VPL) через Icarus Verilog.
#
# Файлы задания (вкладка «Файлы исполнения»):
#   tb.v            — тестбенч преподавателя (обязательно называется tb.v)
#   vpl_evaluate.sh — этот скрипт
# Файлы ученика: любые *.v (кроме tb.v).
#
# Тестбенч печатает по одной строке на проверку:
#   CHECK PASS <имя>
#   CHECK FAIL <имя>: ожидалось X, получено Y
# Оценка = 100 * число PASS / (PASS + FAIL). Если тестбенч не напечатал ни одной
# строки CHECK, оценка 0. Ошибка компиляции — 0 и текст ошибки в комментарии.

cat > vpl_execution <<'EOF'
#!/bin/bash
MAXLINES=40
TL=10

show() { printf 'Comment :=>>%s\n' "$1"; }
grade() { printf 'Grade :=>>%s\n' "$1"; }

# Исходники ученика: все .v, кроме тестбенча
STUDENT=$(ls *.v 2>/dev/null | grep -v '^tb\.v$')
if [ -z "$STUDENT" ]; then
  show "Не найдено ни одного файла .v"
  grade 0
  exit 0
fi

# Системные задачи, которые выполняют команды или читают файлы, ученикам не нужны
if grep -n -E '\$(system|fopen|fwrite|fdisplay|fscanf|readmem[bh]|dumpfile)' $STUDENT >/dev/null 2>&1; then
  show "В решении есть запрещённые системные задачи (\$system, \$fopen, \$readmem и т. п.)"
  grade 0
  exit 0
fi

if ! iverilog -g2012 -Wall -Wno-timescale -o sim.vvp tb.v $STUDENT 2> compile.txt; then
  show "Ошибка компиляции:"
  head -n $MAXLINES compile.txt | while IFS= read -r l; do show "  $l"; done
  grade 0
  exit 0
fi
# Предупреждения компилятора показываем, но оценку они не снижают
if [ -s compile.txt ]; then
  show "Предупреждения компилятора:"
  head -n 10 compile.txt | while IFS= read -r l; do show "  $l"; done
fi

timeout $TL vvp -n sim.vvp > run.txt 2> run.err
code=$?
if [ $code -eq 124 ]; then
  show "Симуляция не завершилась за $TL с (возможна бесконечная петля или нет \$finish)"
fi

pass=$(grep -c '^CHECK PASS' run.txt)
fail=$(grep -c '^CHECK FAIL' run.txt)
total=$((pass + fail))

grep '^CHECK FAIL' run.txt | head -n $MAXLINES | while IFS= read -r l; do show "$l"; done
if [ $total -eq 0 ]; then
  show "Тестбенч не выдал ни одной проверки. Проверьте имя модуля и порты."
  grade 0
  exit 0
fi
show "Пройдено проверок: $pass из $total"
grade $((100 * pass / total))
exit 0
EOF
chmod +x vpl_execution
