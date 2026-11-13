#!/bin/bash
# Кнопка «Запуск» в VPL: компиляция и симуляция с тестбенчем, если он есть,
# иначе — только проверка синтаксиса.
cat > vpl_execution <<'EOF'
#!/bin/bash
STUDENT=$(ls *.v 2>/dev/null | grep -v '^tb\.v$')
if [ -z "$STUDENT" ]; then echo "Не найдено ни одного файла .v"; exit 1; fi
if [ -f tb.v ]; then
  iverilog -g2012 -Wall -Wno-timescale -o sim.vvp tb.v $STUDENT || exit 1
  timeout 10 vvp -n sim.vvp
else
  iverilog -g2012 -Wall -Wno-timescale -t null $STUDENT && echo "Синтаксис в порядке"
fi
EOF
chmod +x vpl_execution
