import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const python = process.env.YOSIS_PYTHON ?? (process.platform === 'win32' ? 'py' : 'python3');
const args = [
  ...(process.platform === 'win32' && python === 'py' ? ['-3'] : []),
  'scripts/test-firmware.py',
];
const child = spawn(python, args, {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
