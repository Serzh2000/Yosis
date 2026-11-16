@echo off
rem Сборка учебника в Windows (MiKTeX или TeX Live + Python с пакетом Pygments).
rem Использование: build.bat [ru|en]   (по умолчанию ru)
rem   ru -> tex\main.tex    -> Digital_Design_ru.pdf (и копия Digital_Design.pdf)
rem   en -> tex-en\main.tex -> Digital_Design_en.pdf
set LANGSEL=%1
if "%LANGSEL%"=="" set LANGSEL=ru
if "%LANGSEL%"=="en" (set SRC=tex-en) else (set SRC=tex)
cd /d "%~dp0%SRC%"
if not exist ..\build\%LANGSEL% mkdir ..\build\%LANGSEL%
rem minted v3 берёт папку сборки из этой переменной (TeX Live 2024 и новее)
set TEXMF_OUTPUT_DIRECTORY=../build/%LANGSEL%
xelatex -shell-escape -interaction=nonstopmode -output-directory=../build/%LANGSEL% main.tex
xelatex -shell-escape -interaction=nonstopmode -output-directory=../build/%LANGSEL% main.tex
copy /Y ..\build\%LANGSEL%\main.pdf ..\Digital_Design_%LANGSEL%.pdf
if "%LANGSEL%"=="ru" copy /Y ..\build\ru\main.pdf ..\Digital_Design.pdf
