import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { buildFingerprint } from './build-state.mjs';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const fingerprint = await buildFingerprint(workspace);
for (const args of [
  ['scripts/check.mjs'],
  ['node_modules/vite/bin/vite.js', 'build'],
  ['scripts/build-server.mjs'],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: workspace,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (fingerprint !== (await buildFingerprint(workspace))) {
  console.error('Исходники изменились во время сборки. Повторите запуск.');
  process.exit(1);
}
await writeFile(
  new URL('../.server-dist/startup-manifest.json', import.meta.url),
  JSON.stringify({ fingerprint }),
);
