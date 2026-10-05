import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildFingerprint, buildIsCurrent, dependenciesAreCurrent } from './build-state.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 13)) {
  console.error('Для запуска Yosis нужен Node.js 22.13 или новее.');
  process.exit(1);
}
process.chdir(root);
process.env.NODE_ENV = 'production';
process.env.PORT ??= '4444';
process.env.YOSIS_LISTEN_HOST ??= '0.0.0.0';
process.env.YOSIS_STANDALONE ??= '1';

let child;
let stopping = false;
function stopBootstrap() {
  stopping = true;
  if (child) {
    if (process.platform === 'win32') child.kill();
    else {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
  }
}
process.on('SIGINT', stopBootstrap);
process.on('SIGTERM', stopBootstrap);
const shutdownMessage = (message) => {
  if (message === 'shutdown') stopBootstrap();
};
process.on('message', shutdownMessage);

async function run(command, args) {
  if (stopping) return;
  await new Promise((resolve, reject) => {
    child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
      detached: process.platform !== 'win32',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      child = undefined;
      if (stopping) resolve();
      else if (code === 0) resolve();
      else reject(new Error(`Подготовка приложения завершилась с ошибкой (${signal ?? code}).`));
    });
  });
}

try {
  if (!(await dependenciesAreCurrent(root))) {
    console.log('Yosis: устанавливаем зависимости по package-lock.json…');
    const args = ['ci', '--include=dev', '--no-audit', '--no-fund'];
    if (process.platform === 'win32') {
      const npm =
        process.env.npm_execpath ??
        path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
      if (!existsSync(npm)) throw new Error('npm не найден. Установите Node.js 22.13+ с npm.');
      await run(process.execPath, [npm, ...args]);
    } else await run('npm', args);
  }
  if (!stopping) {
    const fingerprint = await buildFingerprint(root);
    if (!(await buildIsCurrent(root, fingerprint))) {
      console.log('Yosis: собираем интерфейс и сервер…');
      await run(process.execPath, ['scripts/build.mjs']);
    }
  }
  if (!stopping) {
    // PM2 supervises the HTTP server itself; signals and ready use the same IPC channel.
    const { startServer } = await import(
      pathToFileURL(path.join(root, '.server-dist', 'index.mjs'))
    );
    if (!stopping) startServer();
  }
  process.removeListener('SIGINT', stopBootstrap);
  process.removeListener('SIGTERM', stopBootstrap);
  process.removeListener('message', shutdownMessage);
  if (stopping && process.connected) process.disconnect();
} catch (error) {
  console.error(`Yosis не запущен: ${error.message}`);
  process.exitCode = 1;
  process.removeListener('SIGINT', stopBootstrap);
  process.removeListener('SIGTERM', stopBootstrap);
  process.removeListener('message', shutdownMessage);
  if (process.connected) process.disconnect();
}
