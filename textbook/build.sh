#!/bin/bash
# Сборка учебника. Нужны: TeX Live (xelatex), Python Pygments (для minted).
# Шрифты: Times New Roman/Arial/Consolas либо Liberation + DejaVu Sans Mono.
# Использование: ./build.sh [ru|en]   (по умолчанию ru)
set -e
LANGSEL="${1:-ru}"
if [ "$LANGSEL" = "en" ]; then SRC=tex-en; else SRC=tex; fi
cd "$(dirname "$0")/$SRC"
mkdir -p "../build/$LANGSEL"
# minted v3 берёт папку сборки из этой переменной (TeX Live 2024 и новее)
export TEXMF_OUTPUT_DIRECTORY="$(cd ../build/$LANGSEL && pwd -W 2>/dev/null || pwd)"
for i in 1 2; do
    xelatex -shell-escape -interaction=nonstopmode -halt-on-error \
            -output-directory="../build/$LANGSEL" main.tex > /dev/null
done
cp "../build/$LANGSEL/main.pdf" "../Digital_Design_$LANGSEL.pdf"
if [ "$LANGSEL" = "ru" ]; then cp ../build/ru/main.pdf ../Digital_Design.pdf; fi
echo "Готово: Digital_Design_$LANGSEL.pdf"
