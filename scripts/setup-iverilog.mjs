import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Official MSYS2 packages; versions and SHA256 values are pinned for reproducible setup.
// Package metadata and licenses: https://packages.msys2.org/packages/mingw-w64-x86_64-iverilog
const packages = [
  ['iverilog-1~13.0-2', 'e22c86dad1a0658d5f769362bfbec6533028c0d0bb63059b4fda0cc1084d1406'],
  ['bzip2-1.0.8-4', '123768f30ae14ba654a6feb70f8526146a331bc85f831a91a549ffb3f6cbffc7'],
  ['readline-8.3.003-1', 'b943d7e2a61ac6e0304eac11cdcee15370a8c2ccee5b84487f8ad6c1e103d66c'],
  ['zlib-1.3.2-2', '9e75842a070ba648e986e12424e1c92c9d7d77200e85f6a34eeb600819f2e694'],
  ['termcap-1.3.1-7', '04ca275febc3ef461d55f8468fd05c6355ca0fda3be4a77bfdb906cf9d88a1e8'],
  [
    'libwinpthread-14.0.0.r426.g4564ee4b5-1',
    '543017ce2731292b215bf1d36fd70a86d8a8d5ed0afba9d3db9fff89804cda71',
  ],
  ['libgcc-16.2.0-4', 'd615f6a8536ca16b1f049daea1fa440a3b7a405449ec0e93ad6106db43682d54'],
  ['libstdc++-16.2.0-4', '3d4c3faf4c2c5c7a851ff12214ddcbf8c0d6df0964fc1d3ebd8c38f227183034'],
];
const workspace = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(workspace, '.tools', 'iverilog');
const cache = path.join(workspace, '.tools', 'downloads');
const hash = (data) => createHash('sha256').update(data).digest('hex');
function runTar(args) {
  const result = spawnSync('tar', args, {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      result.stderr || 'Не удалось распаковать пакет MSYS2. Нужен tar с поддержкой zstd.',
    );
  return result.stdout;
}
if (process.platform !== 'win32') {
  // Server setup checks the system package. Docker installs it at image build time;
  // this launcher never changes system packages or asks a student to install tools.
  const compiler = spawnSync(process.env.YOSIS_IVERILOG ?? 'iverilog', ['-V'], {
    encoding: 'utf8',
  });
  const runtime = spawnSync(process.env.YOSIS_VVP ?? 'vvp', ['-V'], { encoding: 'utf8' });
  if (compiler.error || runtime.error || compiler.status !== 0 || runtime.status !== 0) {
    throw new Error(
      'Установите пакет iverilog на сервере (Debian/Ubuntu: apt-get install iverilog) либо используйте Dockerfile проекта.',
    );
  }
  console.log(compiler.stdout.split(/\r?\n/)[0]);
  console.log('Icarus Verilog и vvp доступны на сервере.');
  process.exit(0);
}
if (process.arch !== 'x64')
  throw new Error('Пакеты MSYS2 в этом установщике предназначены для Windows x64.');
await mkdir(cache, { recursive: true });
await mkdir(target, { recursive: true });
const receipt = [];
for (const [name, sha256] of packages) {
  const filename = `mingw-w64-x86_64-${name}-any.pkg.tar.zst`;
  const archive = path.join(cache, filename);
  const url = `https://repo.msys2.org/mingw/mingw64/${encodeURIComponent(filename)}`;
  let data;
  try {
    data = await readFile(archive);
  } catch {
    /* Download missing archives. */
  }
  if (!data || hash(data) !== sha256) {
    console.log(`Загрузка ${name}…`);
    // Use Windows' HTTP client so the user's system proxy also applies to downloads.
    const download = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '$ErrorActionPreference="Stop"; Invoke-WebRequest -Uri $env:YOSIS_DOWNLOAD_URL -OutFile $env:YOSIS_DOWNLOAD_FILE -TimeoutSec 60',
      ],
      {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 75_000,
        env: { ...process.env, YOSIS_DOWNLOAD_URL: url, YOSIS_DOWNLOAD_FILE: archive },
      },
    );
    if (download.error || download.status !== 0)
      throw new Error(
        download.error?.message || download.stderr || `Не удалось загрузить ${filename}`,
      );
    data = await readFile(archive);
    if (hash(data) !== sha256)
      throw new Error(`Контрольная сумма ${filename} не совпала. Пакет не распакован.`);
    await writeFile(archive, data);
  }
  const entries = runTar(['-tf', archive]).trim().split(/\r?\n/);
  if (
    entries.length > 10_000 ||
    entries.some(
      (entry) =>
        /^[/\\]/.test(entry) || /^[A-Za-z]:/.test(entry) || entry.split(/[/\\]/).includes('..'),
    )
  ) {
    throw new Error(`Небезопасные пути в ${filename}. Пакет не распакован.`);
  }
  runTar(['-xf', archive, '-C', target, 'mingw64']);
  receipt.push({ filename, url, sha256 });
  console.log(`Готово: ${name}`);
}
await writeFile(
  path.join(target, 'receipt.json'),
  JSON.stringify({ source: 'MSYS2', packages: receipt }, null, 2),
);
const executable = path.join(target, 'mingw64', 'bin', 'iverilog.exe');
const library = path.join(target, 'mingw64', 'lib', 'ivl');
const probe = spawnSync(executable, ['-B', library, '-V'], {
  encoding: 'utf8',
  windowsHide: true,
  env: { ...process.env, PATH: `${path.dirname(executable)};${process.env.PATH ?? ''}` },
});
if (probe.error || probe.status !== 0)
  throw new Error(
    probe.error?.message || probe.stderr || `Icarus завершился с кодом ${probe.status}`,
  );
console.log(probe.stdout.split(/\r?\n/)[0]);
console.log(`Симулятор готов: ${executable}`);
