# Digital Design: from Logic Gates to FPGAs

[Русский](./README.md) · **English**

A textbook for beginners in two editions (Russian and English, identical structure). The book follows a
"design → run → observe" rhythm: every theory section ends with a "Do it yourself" task in the
[Logra](../README.md) environment, and Part I is a chain of "sprint" chapters with one running project, the
"Security Panel". No prior electronics knowledge is required.

The examples build with the same open tools Logra uses (Yosys, nextpnr, Project Apicula); the sources
(`.v`, `.cst`) can be used as starter projects for the Code and Pins tabs.

**[English PDF](./Digital_Design_en.pdf)** · **[Russian PDF](./Digital_Design_ru.pdf)**

## Contents

**Part I. Combinational and Sequential Logic**

1. Signals: bits, logic levels, timing diagrams, the clock
2. Number systems and codes: HEX, BCD, ASCII, Gray code, parity, Hamming code, fixed point
3. Logic gates and Boolean algebra
4. Combinational circuits: from a truth table to a circuit, Karnaugh maps, delays, glitches
5. Minimizing logic functions (with advanced sections: Quine--McCluskey)
6. Decoders and encoders, the seven-segment display
7. Multiplexers and demultiplexers
8. Arithmetic blocks: adders, sign and overflow, comparators, ALU
9. Flip-flops
10. Registers and counters
11. Synchronous circuits, state machines and memory
12. Designing state machines and FIFO queues (the Security Panel state machine)
13. Electrical basics: CMOS, outputs, buses, pull-ups
14. Digital meets analog: DAC, ADC, PWM

**Part II. FPGAs and the Logra Environment: Tang Nano 20K** --- chapters 15--28: what an FPGA is, what is
inside, the board, the design flow, Verilog, a first sprint in Logra, the same blocks in Verilog, seven projects,
simulation, clocking, UART/SPI/I²C, SDRAM, a processor, assignments for the board.

**Appendices:** cheat sheet; answers (with worked solutions and difficulty level); chapter ↔ Logra lesson map.

## How sprints and "Do it yourself" work

A Part I chapter has: a bridge ("what we can do → which question is left"); a "Build it first" box (a task in
Logra before the theory); the theory; in **every section** a "Do it yourself" box (task, expected result, how to
check it on the Waveforms/RTL/Gowin tabs); "Common mistakes"; "Questions and problems" at three levels
(★ repeat, ★★ modify / find the error, ★★★ project with acceptance criteria); "What's next". Lesson and example
names are verified against `src/` by `tools/gen_map.py`. Plan and work log: [PLAN.md](./PLAN.md).

## Layout

```
tex/        Russian edition (main.tex, chapters/, styles/ --- the preamble shared by both editions)
tex-en/     English edition (main.tex, chapters/, GLOSSARY.md --- terminology)
code/       examples with Russian comments;  code-en/  the same with English comments
img/        Russian Logra screenshots;  img/en/  English ones (same file names);  img/SHOTS.md
tools/      shoot.mjs, shoot3.mjs, lib.mjs (screenshots via Playwright); gen_tasks.py, tasks_ext.py
            (answers of the Russian edition); gen_map.py (chapter ↔ lesson table); audit_*.py (checks)
build.sh, build.bat   build with an argument: ru (default) or en
```

## Building the PDF

XeLaTeX (TeX Live 2024+ or MiKTeX) and Python with Pygments are required (`minted`, `-shell-escape`).

```bash
cd textbook
./build.sh en       # or build.bat en  -> Digital_Design_en.pdf
./build.sh ru       # or build.bat ru  -> Digital_Design_ru.pdf (+ Digital_Design.pdf)
```

If `minted` complains that it cannot find `main.listing`, delete `build/<lang>` and build again (stale highlight cache).

## Refreshing screenshots

Start Logra (`npm run dev` in the repository root) and, from the repository root:

```bash
LANG_UI=en node textbook/tools/shoot.mjs tour      # then: bridge, gates
LANG_UI=en node textbook/tools/shoot3.mjs
```

English frames go to `textbook/img/en`, Russian ones (`LANG_UI=ru`) to `textbook/img`. Variables: `OUT_DIR`, `SCALE`, `THEME`, `APP_URL`.

## Checks

```bash
python tools/audit_forward.py     # "Do it yourself" in each section; no forward references from Part I
python tools/audit_terms.py       # terminology, no "Yosis"
python tools/gen_map.py --check   # lesson / example names exist in src/
```
