import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commands = [
  ['server', ['--import', 'tsx', 'server/index.ts']],
  ['client', ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1']],
];

if (
  ['node_modules/tsx/dist/cli.mjs', 'node_modules/vite/bin/vite.js'].some(
    (entry) => !existsSync(path.join(root, entry)),
  )
) {
  console.error('Сначала установите зависимости: npm install');
  process.exit(1);
}

const children = [];
let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = exitCode;
}

for (const [name, args] of commands) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(`${name}: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`${name} завершён (${signal ?? code}).`);
      stop(code || 1);
    }
  });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
