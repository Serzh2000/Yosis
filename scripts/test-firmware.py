"""Compile and run the real C overrides with a simulated USB/UART controller."""
from pathlib import Path
import os
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.tools' / 'firmware-tests'
OUT.mkdir(parents=True, exist_ok=True)

if os.name == 'nt':
    zig = ROOT / '.tools/zig-host/zig-x86_64-windows-0.15.2/zig.exe'
    if not zig.is_file():
        raise SystemExit('The pinned Zig host compiler is required at ' + str(zig))
    compiler = [str(zig), 'cc']
    executable = OUT / 'firmware-tests.exe'
    sanitizers = ['-fsanitize=undefined', '-fno-sanitize-recover=all']
else:
    cc = os.environ.get('CC') or shutil.which('cc') or shutil.which('gcc')
    if not cc:
        raise SystemExit('A native C compiler is required (CC, cc or gcc).')
    compiler = [cc]
    executable = OUT / 'firmware-tests'
    sanitizers = ['-fsanitize=address,undefined', '-fno-sanitize-recover=all']

command = compiler + ['-std=c11', '-Wall', '-Wextra', '-Werror', '-O1', '-g'] + sanitizers + [
    '-I', str(ROOT / 'tests/firmware/stubs'),
    '-I', str(ROOT / 'hardware/dirtyjtag/upstream/src'),
    '-I', str(ROOT / 'hardware/dirtyjtag/overrides'),
    str(ROOT / 'tests/firmware/harness.c'), '-o', str(executable),
]
environment = os.environ.copy()
environment['ZIG_GLOBAL_CACHE_DIR'] = str(OUT / 'zig-global-cache')
environment['ZIG_LOCAL_CACHE_DIR'] = str(OUT / 'zig-local-cache')
subprocess.run(command, cwd=ROOT, env=environment, check=True)
subprocess.run([str(executable)], cwd=ROOT, env=environment, check=True)
