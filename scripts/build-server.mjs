import { build } from 'esbuild';
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(workspace, '.server-dist');
await mkdir(output, { recursive: true });
await build({
  absWorkingDir: workspace,
  entryPoints: ['server/index.ts'],
  outfile: path.join(output, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  target: 'node22',
  sourcemap: true,
});
for (const entry of await readdir(path.join(workspace, 'server'))) {
  if (entry.endsWith('.mjs'))
    await copyFile(path.join(workspace, 'server', entry), path.join(output, entry));
}
console.log('Server compiled: .server-dist/index.mjs');
