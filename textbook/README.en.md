# Digital Design: from Logic Gates to FPGAs

[Русский](./README.md) · **English**

A textbook for beginners in two editions (Russian and English, identical structure). The book follows a
"design → run → observe" rhythm: every theory section ends with a "Do it yourself" task in the
[Logra](../README.md) environment, and the book is a chain of "sprint" chapters with one running project, the
"Security Panel". No prior electronics knowledge is required.

The examples build with the same open tools Logra uses (Yosys, nextpnr, Project Apicula); the sources
(`.v`, `.cst`) can be used as starter projects for the Code and Pins tabs.

**[English PDF](./Digital_Design_en.pdf)** · **[Russian PDF](./Digital_Design_ru.pdf)**

## Contents

The book is a single continuous line with no parts: theory, Verilog, and work in Logra go together. Chapter order:

**Start**

1. What is an FPGA
2. A first sprint in Logra: the tabs, the "design → run → observe" cycle

**Sprints by topic** (theory + Verilog + Logra together)

3. Signals: bits, logic levels, timing diagrams, the clock
4. Number systems and codes: HEX, BCD, ASCII, Gray code, parity, Hamming code, fixed point
5. Logic gates and Boolean algebra
6. Verilog basics: code describes a circuit, `assign`, `always`, modules
7. Combinational circuits: from a truth table to a circuit, Karnaugh maps, delays, glitches
8. Minimizing logic functions (with advanced sections: Quine--McCluskey)
9. Decoders and encoders, the seven-segment display
10. Multiplexers and demultiplexers
11. Arithmetic blocks: adders, sign and overflow, comparators, ALU
12. Flip-flops
13. Registers and counters
14. Synchronous circuits, state machines and memory
15. Designing state machines and FIFO queues (the Security Panel state machine)

**Board, design flow, physics, analog**

16. What is inside an FPGA: LUTs, flip-flops, routing
17. The Sipeed Tang Nano 20K board
18. From text to a working circuit: the design flow
19. Electrical basics: CMOS, outputs, buses, pull-ups
20. Digital meets analog: DAC, ADC, PWM
21. The same blocks in Verilog: the bridge from circuits to code, the Security Panel in Verilog

**Projects and systems**

22. Practice: seven projects
23. Simulation and testbenches
24. Clocking, timing analysis, clock domains
25. Serial interfaces: UART, SPI, I²C
26. SDRAM memory
27. Building a processor
28. Assignments for independent work

**Appendices:** cheat sheet; answers (with worked solutions and difficulty level); chapter ↔ Logra lesson map.

## How sprints and "Do it yourself" work

A sprint chapter has: a bridge ("what we can do → which question is left"); a "Build it first" box (a task in
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
python tools/audit_forward.py     # "Do it yourself" in each section; no forward references to later chapters (except \lookahead, buildbox, diybox, "What next"); no Verilog before chapter 6 outside \lookahead
python tools/audit_terms.py       # terminology, no "Yosis"
python tools/gen_map.py --check   # lesson / example names exist in src/
```
