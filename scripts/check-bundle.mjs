import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../dist/', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(output, '.vite/manifest.json'), 'utf8'));
const entry = Object.entries(manifest).find(([, asset]) => asset.isEntry)?.[0];
if (!entry) throw new Error('Vite entry is missing. Run npm run build.');
const files = new Set();
function visit(key) {
  const asset = manifest[key];
  if (!asset) throw new Error(`Missing chunk ${key}`);
  if (files.has(asset.file)) return;
  files.add(asset.file);
  for (const dependency of asset.imports ?? []) visit(dependency);
}
visit(entry);
let bytes = 0;
for (const file of files) bytes += (await stat(path.join(output, file))).size;
console.log(`Initial JavaScript: ${(bytes / 1024).toFixed(1)} KiB across ${files.size} files`);
if (bytes >= 1024 * 1024) throw new Error('Initial JavaScript exceeds the 1 MiB budget.');
