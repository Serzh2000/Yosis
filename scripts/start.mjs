import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (
  !existsSync(path.join(root, 'dist', 'index.html')) ||
  !existsSync(path.join(root, '.server-dist', 'index.mjs'))
) {
  console.error('Сначала соберите приложение: npm run build');
  process.exit(1);
}
const child = spawn(process.execPath, ['.server-dist/index.mjs', '--production'], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
  windowsHide: true,
});
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
