@echo off
rem Сборка учебника в Windows (MiKTeX или TeX Live + Python с пакетом Pygments)
cd /d "%~dp0tex"
if not exist ..\build mkdir ..\build
xelatex -shell-escape -interaction=nonstopmode -output-directory=../build main.tex
xelatex -shell-escape -interaction=nonstopmode -output-directory=../build main.tex
copy /Y ..\build\main.pdf ..\Tang_Nano_20K.pdf
