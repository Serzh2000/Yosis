import { TextDecoder, stripVTControlCharacters } from 'node:util';
import { compatibleProject, readCommand } from './verilog-compat.mjs';
import { createWorkerChannel } from './worker-ipc.mjs';

const { send, disconnect } = createWorkerChannel();
process.once('message', async ({ project: original }) => {
  let bytes = 0;
  const decoder = new TextDecoder();
  const output = (data) => {
    if (!data) return;
    bytes += data.length;
    if (bytes > 1024 * 1024) throw new Error('Журнал проверки превышает 1 МБ.');
    send({ type: 'log', text: stripVTControlCharacters(decoder.decode(data, { stream: true })) });
  };
  try {
    const { runYosys } = await import('@yowasp/yosys');
    // The same rewrites as for synthesis; the notes belong to the build log, not to a check.
    const project = compatibleProject(original, () => {});
    const files = Object.create(null);
    for (const file of project.files) {
      const components = file.name.split('/'),
        name = components.pop();
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
    send({ type: 'failure', error: error instanceof Error ? error.message : String(error) });
  }
  await disconnect();
});
