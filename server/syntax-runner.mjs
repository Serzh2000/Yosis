// @ts-check
import { TextDecoder, stripVTControlCharacters } from 'node:util';
import { compatibleProject, readCommand } from './verilog-compat.mjs';
import { createWorkerChannel, loadYosys } from './worker-ipc.mjs';

const { send, disconnect } =
  /** @type {ReturnType<typeof createWorkerChannel<import('../shared/worker-protocol').SyntaxWorkerMessage>>} */ (
    createWorkerChannel()
  );
async function check(
  /** @type {import('../shared/types').Project} */ original,
  /** @type {boolean} */ reuse,
) {
  let fatal = false;
  let bytes = 0;
  const decoder = new TextDecoder();
  const output = (/** @type {Uint8Array | null} */ data) => {
    if (!data) return;
    bytes += data.length;
    if (bytes > 1024 * 1024) throw new Error('Журнал проверки превышает 1 МБ.');
    send({ type: 'log', text: stripVTControlCharacters(decoder.decode(data, { stream: true })) });
  };
  try {
    const runYosys = await loadYosys();
    // The same rewrites as for synthesis; the notes belong to the build log, not to a check.
    const project = compatibleProject(original, () => {});
    const files = Object.create(null);
    for (const file of project.files) {
      const components = file.name.split('/'),
        name = /** @type {string} */ (components.pop());
      let directory = files;
      for (const component of components) {
        directory[component] ??= Object.create(null);
        directory = directory[component];
      }
      directory[name] = file.content;
    }
    const commands = project.files
      .filter((file) => /\.(v|sv)$/.test(file.name))
      .map((file) => readCommand(project, file));
    files['syntax.ys'] = [
      'read_verilog -lib +/gowin/cells_sim.v +/gowin/cells_xtra_gw2a.v',
      ...commands,
      `hierarchy -check -top ${project.top} -purge_lib`,
      'proc',
      'check',
    ].join('\n');
    await runYosys(['-T', '-s', 'syntax.ys'], files, {
      stdout: output,
      stderr: output,
      decodeASCII: true,
      fetchProgress: () => {},
    });
    send({ type: 'success' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A worker that ran out of stack or memory is not trusted with the next check.
    fatal = /RangeError|out of memory|unreachable|call stack/i.test(message);
    send({ type: 'failure', error: message });
  }
  if (reuse && !fatal) send({ type: 'idle' });
  else await disconnect();
}

// A spare worker loads Yosys and runs a tiny check before any project exists, so the first
// real check does not pay for the load and for the cold WebAssembly code.
let warming = Promise.resolve();
async function warmUp() {
  const runYosys = await loadYosys();
  await runYosys(
    ['-T', '-p', 'read_verilog warm.v; hierarchy -check -top warm; proc; check'],
    { 'warm.v': 'module warm(input a, output y); assign y = ~a; endmodule' },
    { stdout: () => {}, stderr: () => {}, decodeASCII: true, fetchProgress: () => {} },
  );
}
process.on(
  'message',
  (/** @type {import('../shared/worker-protocol').SyntaxRequest} */ request) => {
    if (request?.warm) {
      // A failed warm-up only costs speed; the check itself reports real errors.
      warming = warmUp().then(
        () => send({ type: 'warm' }),
        () => {},
      );
      return;
    }
    if (request?.project) {
      const project = request.project;
      void warming.then(() => check(project, request.reuse === true));
    }
  },
);
