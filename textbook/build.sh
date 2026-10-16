#!/bin/bash
# Сборка учебника. Нужны: TeX Live (xelatex), Python Pygments (для minted).
# Шрифты: Times New Roman/Arial/Consolas либо Liberation + DejaVu Sans Mono.
set -e
cd "$(dirname "$0")/tex"
mkdir -p ../build
# minted v3 берёт папку сборки из этой переменной (TeX Live 2024 и новее)
export TEXMF_OUTPUT_DIRECTORY=../build
for i in 1 2; do
    xelatex -shell-escape -interaction=nonstopmode -halt-on-error \
            -output-directory=../build main.tex > /dev/null
done
cp ../build/main.pdf ../Tang_Nano_20K.pdf
echo "Готово: Tang_Nano_20K.pdf"
