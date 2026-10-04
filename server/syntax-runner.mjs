import { TextDecoder, stripVTControlCharacters } from 'node:util';
import { createWorkerChannel } from './worker-ipc.mjs';

const { send, disconnect } = createWorkerChannel();
process.once('message', async ({ project }) => {
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
      .map((file) => `read_verilog ${file.name.endsWith('.sv') ? '-sv ' : ''}-I. ${file.name}`);
    files['syntax.ys'] = [
      ...commands,
      `hierarchy -check -top ${project.top}`,
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
