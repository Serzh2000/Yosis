// @ts-check
import { TextDecoder, stripVTControlCharacters } from 'node:util';
import { createWorkerChannel, loadYosys } from './worker-ipc.mjs';

const { send, disconnect } =
  /** @type {ReturnType<typeof createWorkerChannel<import('../shared/worker-protocol').FlattenWorkerMessage>>} */ (
    createWorkerChannel()
  );
let bytes = 0;
const decoder = new TextDecoder();
const output = (/** @type {Uint8Array | null} */ data) => {
  if (!data) return;
  bytes += data.byteLength;
  if (bytes > 4 * 1024 * 1024) throw new Error('Журнал подготовки размещения превышает 4 МБ.');
  send({ type: 'log', text: stripVTControlCharacters(decoder.decode(data, { stream: true })) });
};
process.once(
  'message',
  async (/** @type {import('../shared/worker-protocol').FlattenRequest} */ { technology, top }) => {
    try {
      const runYosys = await loadYosys();
      // The synthesized JSON already has resolved parameters and top attributes.
      // Running hierarchy again tries to derive vendor black boxes whose parameter
      // declarations are absent from JSON. Flatten only the existing user hierarchy.
      // Recent Yosys versions retain $buf / $_BUF_ cells for aliased named wires.
      // They are logical connections, not Gowin resources nextpnr can place.
      // Convert them back to connections only in this physical snapshot, leaving
      // the hierarchy-preserving RTL and technology views intact. IBUF/OBUF/BUFG
      // are vendor cells and are deliberately not selected for this mapping.
      // An explicit identity techmap also handles fragmented output buses and
      // padded aliases, where bufnorm -conn in the bundled Yosys asserts.
      const aliases = `(* techmap_celltype = "$buf $_BUF_" *)
module _yosis_wire_alias #(parameter WIDTH = 1)
  (input [WIDTH-1:0] A, output [WIDTH-1:0] Y);
  assign Y = A;
endmodule
`;
      const files = await runYosys(
        [
          '-T',
          '-p',
          `read_json technology.json; flatten -noscopeinfo ${top}; techmap -map aliases.v t:$buf t:$_BUF_; opt_clean; write_json flat.json`,
        ],
        { 'technology.json': JSON.stringify(technology), 'aliases.v': aliases },
        { stdout: output, stderr: output, decodeASCII: true, fetchProgress: () => {} },
      );
      const data = files['flat.json'];
      if (!(typeof data === 'string' || data instanceof Uint8Array))
        throw new Error('Yosys не создал плоский нетлист.');
      send({
        type: 'flat',
        text: typeof data === 'string' ? data : new TextDecoder().decode(data),
      });
      await disconnect();
    } catch (cause) {
      send({ type: 'error', error: /** @type {Error} */ (cause)?.message ?? String(cause) });
      try {
        await disconnect();
      } catch {
        /* Parent cancelled the worker. */
      }
      process.exitCode = 1;
    }
  },
);
