import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const workspace = fileURLToPath(new URL('../', import.meta.url));
for (const config of ['tsconfig.client.json', 'tsconfig.server.json', 'tsconfig.tests.json']) {
  const result = spawnSync(
    process.execPath,
    ['node_modules/typescript/bin/tsc', '--noEmit', '-p', config],
    {
      cwd: workspace,
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
