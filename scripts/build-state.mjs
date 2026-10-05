import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

async function sourceFiles(root, directory) {
  const files = [];
  async function visit(relative) {
    for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
      const name = `${relative}/${entry.name}`;
      if (entry.isDirectory()) await visit(name);
      else if (entry.isFile()) files.push(name);
    }
  }
  await visit(directory);
  return files;
}

export async function dependenciesAreCurrent(root) {
  try {
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
    const installed = JSON.parse(
      await readFile(path.join(root, 'node_modules', '.package-lock.json'), 'utf8'),
    );
    const entries = (value) => JSON.stringify(Object.entries(value ?? {}).sort());
    for (const key of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      if (entries(pkg[key]) !== entries(lock.packages[''][key])) return false;
    }
    for (const [name, entry] of Object.entries(installed.packages)) {
      const expected = lock.packages[name];
      if (!expected || entry.version !== expected.version || entry.integrity !== expected.integrity)
        return false;
      const matches = (selectors, value) =>
        !selectors ||
        (!selectors.includes(`!${value}`) &&
          (!selectors.some((item) => !item.startsWith('!')) ||
            selectors.includes(value) ||
            selectors.includes('any')));
      if (!matches(expected.os, process.platform) || !matches(expected.cpu, process.arch))
        return false;
      await access(path.join(root, name, 'package.json'));
    }
    for (const [name, entry] of Object.entries(lock.packages)) {
      if (name && !entry.optional && !installed.packages[name]) return false;
    }
    for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
      const installedPackage = JSON.parse(
        await readFile(path.join(root, 'node_modules', name, 'package.json'), 'utf8'),
      );
      if (installedPackage.version !== lock.packages[`node_modules/${name}`]?.version) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Generated output and job data never participate in deciding whether to rebuild.
export async function buildFingerprint(root) {
  const files = [];
  for (const directory of ['src', 'server', 'shared', 'public'])
    files.push(...(await sourceFiles(root, directory)));
  files.push(
    'package.json',
    'package-lock.json',
    'index.html',
    'vite.config.ts',
    'scripts/check.mjs',
    'scripts/build.mjs',
    'scripts/build-server.mjs',
    'scripts/build-state.mjs',
  );
  for (const entry of await readdir(root)) {
    if (/^tsconfig.*\.json$/.test(entry)) files.push(entry);
  }
  const hash = createHash('sha256');
  for (const name of files.sort()) {
    hash
      .update(name)
      .update('\0')
      .update(await readFile(path.join(root, name)))
      .update('\0');
  }
  return hash.digest('hex');
}

export async function buildIsCurrent(root, fingerprint) {
  try {
    const manifest = JSON.parse(
      await readFile(path.join(root, '.server-dist', 'startup-manifest.json'), 'utf8'),
    );
    if (manifest.fingerprint !== fingerprint) return false;
    const assets = JSON.parse(
      await readFile(path.join(root, 'dist', '.vite', 'manifest.json'), 'utf8'),
    );
    for (const entry of Object.values(assets)) {
      for (const name of [entry.file, ...(entry.css ?? []), ...(entry.assets ?? [])]) {
        if (typeof name !== 'string' || !name || path.isAbsolute(name) || name.includes('..'))
          return false;
        await access(path.join(root, 'dist', name));
      }
    }
    await access(path.join(root, 'dist', 'index.html'));
    await access(path.join(root, '.server-dist', 'index.mjs'));
    for (const name of await readdir(path.join(root, 'server'))) {
      if (name.endsWith('.mjs')) await access(path.join(root, '.server-dist', name));
    }
    for (const name of await sourceFiles(root, 'public')) {
      await access(path.join(root, 'dist', name.slice('public/'.length)));
    }
    return true;
  } catch {
    return false;
  }
}
