import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

const { buildFingerprint, buildIsCurrent, dependenciesAreCurrent } = (await import(
  new URL('../scripts/build-state.mjs', import.meta.url).href
)) as {
  buildFingerprint(root: string): Promise<string>;
  buildIsCurrent(root: string, fingerprint: string): Promise<boolean>;
  dependenciesAreCurrent(root: string): Promise<boolean>;
};

test('PM2 profile runs exactly one production server on 4444 from its own workspace', () => {
  const config = createRequire(import.meta.url)('../ecosystem.config.cjs');
  const [app] = config.apps;
  assert.equal(config.apps.length, 1);
  assert.equal(app.name, 'yosis');
  assert.equal(app.exec_mode, 'fork');
  assert.equal(app.instances, 1);
  assert.equal(app.env.PORT, '4444');
  assert.equal(app.env.YOSIS_API_PORT, '4444');
  assert.equal(app.env.YOSIS_LISTEN_HOST, '0.0.0.0');
  assert.equal(app.env.YOSIS_STANDALONE, '1');
  assert.equal(app.wait_ready, true);
  assert.equal(app.shutdown_with_message, true);
  assert.equal(app.watch, false);
  assert.ok(path.isAbsolute(app.cwd));
  assert.equal(path.resolve(app.cwd, app.script), path.resolve('scripts/start.mjs'));
});

test('startup reuses complete output, rebuilds source changes and missing assets, ignores job data', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-startup-'));
  try {
    for (const dir of [
      'src',
      'server',
      'shared',
      'public',
      'scripts',
      'dist/.vite',
      '.server-dist',
      '.builds',
    ]) {
      await mkdir(path.join(root, dir), { recursive: true });
    }
    for (const name of [
      'package.json',
      'package-lock.json',
      'index.html',
      'vite.config.ts',
      'tsconfig.json',
      'scripts/check.mjs',
      'scripts/build.mjs',
      'scripts/build-server.mjs',
      'scripts/build-state.mjs',
      'src/main.tsx',
    ]) {
      await writeFile(path.join(root, name), name);
    }
    const fingerprint = await buildFingerprint(root);
    assert.equal(await buildIsCurrent(root, fingerprint), false);
    await writeFile(
      path.join(root, '.server-dist/startup-manifest.json'),
      JSON.stringify({ fingerprint }),
    );
    await writeFile(
      path.join(root, 'dist/.vite/manifest.json'),
      JSON.stringify({ main: { file: 'main.js', css: ['main.css'] } }),
    );
    for (const name of [
      'dist/index.html',
      'dist/main.js',
      'dist/main.css',
      '.server-dist/index.mjs',
      '.server-dist/yosys-runner.mjs',
    ]) {
      await writeFile(path.join(root, name), 'built');
    }
    assert.equal(await buildIsCurrent(root, fingerprint), true);
    await writeFile(path.join(root, 'public', 'firmware.bin'), 'firmware');
    assert.equal(
      await buildIsCurrent(root, fingerprint),
      false,
      'copied public firmware is mandatory',
    );
    await writeFile(path.join(root, 'dist', 'firmware.bin'), 'firmware');
    await writeFile(path.join(root, 'server', 'syntax-runner.mjs'), 'runner');
    assert.equal(
      await buildIsCurrent(root, fingerprint),
      false,
      'all worker runners are mandatory',
    );
    await writeFile(path.join(root, '.server-dist', 'syntax-runner.mjs'), 'runner');
    assert.equal(await buildIsCurrent(root, fingerprint), true);
    await rm(path.join(root, 'public', 'firmware.bin'));
    await rm(path.join(root, 'server', 'syntax-runner.mjs'));
    await writeFile(path.join(root, '.builds/new-job.json'), 'new job');
    assert.equal(await buildFingerprint(root), fingerprint);
    await writeFile(path.join(root, 'src/main.tsx'), 'new source');
    assert.notEqual(await buildFingerprint(root), fingerprint);
    assert.equal(await buildIsCurrent(root, await buildFingerprint(root)), false);
    await rm(path.join(root, 'dist/main.css'));
    assert.equal(await buildIsCurrent(root, fingerprint), false);
    await writeFile(path.join(root, '.server-dist/startup-manifest.json'), 'unfinished manifest');
    assert.equal(await buildIsCurrent(root, fingerprint), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('dependency changes in the lockfile and missing transitive packages require npm ci', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-startup-deps-'));
  try {
    const direct = 'node_modules/direct';
    const transitive = 'node_modules/transitive';
    for (const name of [direct, transitive])
      await mkdir(path.join(root, name), { recursive: true });
    const packages = {
      [direct]: { version: '1.0.0', integrity: 'a' },
      [transitive]: { version: '1.0.0', integrity: 'b' },
    };
    const dependencies = { direct: '^1.0.0' };
    const lock = { packages: { '': { dependencies }, ...packages } };
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies }));
    await writeFile(path.join(root, 'package-lock.json'), JSON.stringify(lock));
    await writeFile(
      path.join(root, 'node_modules/.package-lock.json'),
      JSON.stringify({ packages }),
    );
    for (const name of [direct, transitive])
      await writeFile(path.join(root, name, 'package.json'), '{"version":"1.0.0"}');
    assert.equal(await dependenciesAreCurrent(root), true);
    lock.packages[transitive].version = '1.1.0';
    await writeFile(path.join(root, 'package-lock.json'), JSON.stringify(lock));
    assert.equal(await dependenciesAreCurrent(root), false);
    lock.packages[transitive].version = '1.0.0';
    await writeFile(path.join(root, 'package-lock.json'), JSON.stringify(lock));
    await rm(path.join(root, transitive, 'package.json'));
    assert.equal(await dependenciesAreCurrent(root), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
