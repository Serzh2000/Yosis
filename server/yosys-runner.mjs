// Keep the WASM runtime in a separate process so cancellation also interrupts
// synchronous synthesis and cannot block the HTTP server event loop.
import { TextDecoder, stripVTControlCharacters } from 'node:util';
import { createWorkerChannel } from './worker-ipc.mjs';

const { send, disconnect } = createWorkerChannel();
let buffer = '';
let loggedBytes = 0;
const decoder = new TextDecoder();
function flush() {
  if (buffer) {
    send({ type: 'log', text: stripVTControlCharacters(buffer) });
    buffer = '';
  }
}
function output(bytes) {
  if (!bytes) {
    flush();
    return;
  }
  const text = decoder.decode(bytes, { stream: true });
  loggedBytes += Buffer.byteLength(text);
  if (loggedBytes > 4 * 1024 * 1024) throw new Error('Журнал синтеза превышает лимит 4 МБ.');
  buffer += text;
  if (buffer.length >= 4096 || text.includes('ERROR:')) flush();
}
const options = { stdout: output, stderr: output, decodeASCII: true, fetchProgress: () => {} };
function textFile(files, name) {
  const data = files[name];
  if (!(typeof data === 'string' || data instanceof Uint8Array))
    throw new Error(`Yosys не создал ${name}.`);
  const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
  if (text.length > 64 * 1024 * 1024)
    throw new Error('Нетлист превышает лимит 64 МБ. Уменьшите размер проекта.');
  const result = JSON.parse(text);
  if (!result.modules || typeof result.modules !== 'object')
    throw new Error(`Некорректный нетлист ${name}.`);
  return result;
}
function virtualSources(project) {
  const result = Object.create(null);
  for (const file of project.files) {
    const components = file.name.split('/');
    const name = components.pop();
    let directory = result;
    for (const component of components) {
      directory[component] ??= Object.create(null);
      directory = directory[component];
    }
    directory[name] = file.content;
  }
  return result;
}

process.once('message', async (request) => {
  try {
    send({ type: 'stage', stage: 'Загрузка Yosys WebAssembly' });
    const { runYosys } = await import('@yowasp/yosys');
    if (request.probe) {
      await runYosys(['-V'], {}, options);
      flush();
      send({ type: 'probe-success' });
      await disconnect();
      return;
    }
    const project = request.project;
    const files = virtualSources(project);
    const sourceCommands = project.files
      .filter((file) => /\.(v|sv)$/.test(file.name))
      .map((file) => `read_verilog ${file.name.endsWith('.sv') ? '-sv ' : ''}-I. ${file.name}`);
    files['rtl.ys'] = [
      ...sourceCommands,
      `hierarchy -check -top ${project.top}`,
      'proc',
      'opt',
      'write_json rtl.json',
    ].join('\n');
    send({ type: 'stage', stage: 'Синтез RTL' });
    const rtlFiles = await runYosys(['-T', '-s', 'rtl.ys'], files, options);
    const rtl = textFile(rtlFiles, 'rtl.json');
    flush();
    send({ type: 'netlist', name: 'rtl', netlist: rtl });
    if (request.prepareSimulation) {
      const exported = await runYosys(
        ['-T', '-p', 'read_json rtl.json; write_verilog -noattr design.v'],
        { 'rtl.json': rtlFiles['rtl.json'] },
        options,
      );
      const data = exported['design.v'];
      if (!(typeof data === 'string' || data instanceof Uint8Array))
        throw new Error('Не удалось экспортировать RTL для симуляции.');
      flush();
      send({
        type: 'simulation-design',
        ports: rtl.modules[project.top].ports,
        modules: Object.keys(rtl.modules),
        design: typeof data === 'string' ? data : new TextDecoder().decode(data),
      });
      send({ type: 'success' });
      await disconnect();
      return;
    }
    send({ type: 'stage', stage: 'Отображение на примитивы Gowin' });
    // Mapping pads during a hierarchy-preserving synthesis would add package
    // buffers to every submodule. Only the actual top-level ports face pins.
    const technologyScript = [
      'read_json rtl.json',
      `synth_gowin -family gw2a -noflatten -noiopads -top ${project.top}`,
      `iopadmap -bits -inpad IBUF O:I -outpad OBUF I:O -toutpad TBUF ~OEN:I:O -tinoutpad IOBUF ~OEN:O:I:IO ${project.top}`,
      'check -noinit',
      'write_json technology.json',
    ].join('; ');
    const technologyFiles = await runYosys(
      ['-T', '-p', technologyScript],
      {
        'rtl.json': rtlFiles['rtl.json'],
      },
      options,
    );
    const technology = textFile(technologyFiles, 'technology.json');
    flush();
    send({ type: 'netlist', name: 'technology', netlist: technology });
    send({ type: 'success' });
    await disconnect();
  } catch (error) {
    flush();
    send({ type: 'failure', error: error?.message || String(error) });
    // A cancelled parent can close IPC while WASM is still producing logs.
    // Its delivery error is already handled by the send callback.
    try {
      await disconnect();
    } catch {
      /* Parent no longer receives results. */
    }
    process.exitCode = 1;
  }
});
