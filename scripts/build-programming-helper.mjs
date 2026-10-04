import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../.helper-dist/', import.meta.url);
await mkdir(output, { recursive: true });
await build({
  absWorkingDir: root,
  entryPoints: ['server/programming-helper.ts'],
  outfile: fileURLToPath(new URL('yosis-helper.mjs', output)),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  // Bundled CommonJS dependencies still need Node's built-in module loader.
  banner: {
    js: "import { createRequire as yosisCreateRequire } from 'node:module'; const require = yosisCreateRequire(import.meta.url);",
  },
  legalComments: 'inline',
});
await writeFile(
  new URL('README.txt', output),
  `Yosis local USB helper\n\nRequirements: Node.js 22.12+ and a locally installed Gowin Programmer\n(Windows) or openFPGALoader (Linux/macOS).\n\nRun: node yosis-helper.mjs --allow-origin https://your-yosis-server.example\nFor the local Yosis app, omit --allow-origin.\nPaste the token printed in the terminal into the Connection tab.\nThe helper binds to 127.0.0.1:3211 and supports SRAM programming only.\nRun with --help to see all options.\n`,
);
console.log('Yosis USB helper: .helper-dist/yosis-helper.mjs (Node.js 22.12+)');
