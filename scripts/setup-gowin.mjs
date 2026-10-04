import { spawn } from 'node:child_process';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(workspace, '.tools/gowin');
const python = process.env.YOSIS_PYTHON ?? (process.platform === 'win32' ? 'py' : 'python3');
const pythonArgs = process.platform === 'win32' && python === 'py' ? ['-3'] : [];
const packages = [
  'yowasp-nextpnr-himbaechel-gowin==0.11.1.0.post826',
  'Apycula==0.32',
  'yowasp-runtime==1.96',
  'wasmtime==47.0.1',
  'platformdirs==4.12.2',
  'msgspec==0.22.0',
  'numpy==2.5.3',
  'fastcrc==0.5.0',
];
function command(executable, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: workspace,
      env,
      windowsHide: true,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${path.basename(executable)} завершился с кодом ${code}.`)),
    );
  });
}
try {
  await mkdir(path.join(workspace, '.tools'), { recursive: true });
  console.log('Создаём изолированную среду Python для nextpnr и Apicula.');
  await command(python, [...pythonArgs, '-m', 'venv', directory]);
  const localPython = path.join(
    directory,
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
  );
  await command(localPython, ['-m', 'pip', 'install', '--disable-pip-version-check', ...packages]);
  await command(localPython, ['-m', 'pip', 'check']);
  const binary = path.join(
    directory,
    process.platform === 'win32'
      ? 'Scripts/yowasp-nextpnr-himbaechel-gowin.exe'
      : 'bin/yowasp-nextpnr-himbaechel-gowin',
  );
  await command(binary, ['--version'], {
    ...process.env,
    YOWASP_CACHE_DIR: path.join(workspace, '.tools/gowin-cache'),
    XDG_CACHE_HOME: path.join(workspace, '.tools/gowin-cache'),
    PYTHONUTF8: '1',
  });
  await writeFile(
    path.join(directory, 'yosis-install.json'),
    JSON.stringify(
      {
        installedAt: new Date().toISOString(),
        packages,
        source: 'https://pypi.org/project/yowasp-nextpnr-himbaechel-gowin/',
        device: 'GW2AR-LV18QN88C8/I7',
        family: 'GW2A-18C',
      },
      null,
      2,
    ),
  );
  console.log('Gowin-тулчейн готов. Перезапустите локальный сервер IDE.');
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : String(cause));
  console.error(
    'Нужен Python 3.13 x64 с pip. При другом пути задайте YOSIS_PYTHON. Установка остаётся внутри .tools/gowin.',
  );
  process.exitCode = 1;
}
