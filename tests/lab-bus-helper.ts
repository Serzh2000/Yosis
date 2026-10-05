import assert from 'node:assert/strict';
import { after } from 'node:test';
import { LabManager } from '../server/lab';
import type { Project } from '../shared/types';
import { BUS_PARTS } from '../src/lib/lab/catalog-bus';
import type { Options } from '../src/lib/lab/devices';
import { BusBench, type BenchPart } from '../src/lib/lab/bus/bench';
import { I2C_MASTER_V } from '../src/lib/lab/bus/verilog';

const manager = new LabManager();
after(() => manager.close());

export const part = (id: string) => {
  const def = BUS_PARTS.find((item) => item.id === id);
  assert.ok(def, id);
  return def;
};
export const loc = (pairs: Record<string, number>) =>
  Object.entries(pairs)
    .map(([signal, pin]) => `IO_LOC "${signal}" ${pin};`)
    .join('\n');

/** Compile a project (the given sources plus a .cst) and put the parts on a bench. */
export async function bench(
  files: { name: string; content: string }[],
  cst: string,
  parts: { id: string; opts?: Options; wires: Record<string, number> }[],
) {
  const project: Project = {
    name: 'bus',
    top: 'top',
    board: 'tangnano20k',
    files: [...files, { name: 'board.cst', content: cst }],
  };
  const result = await manager.compile('tester', project, new AbortController().signal);
  assert.equal(result.error, undefined, JSON.stringify(result.diagnostics));
  const list: BenchPart[] = parts.map((item) => ({
    def: part(item.id),
    opts: item.opts,
    wires: item.wires,
  }));
  const lab = new BusBench(result.design!, project, list);
  const design = result.design!;
  /** Value of a port of the design. */
  const read = (name: string) =>
    design.ports
      .find((port) => port.name === name)!
      .bits.reduce((sum, net, bit) => sum + BigInt(lab.sim.values[net]) * 2n ** BigInt(bit), 0n);
  return Object.assign(lab, {
    read,
    /** Run until a design output named `flag` rises or give up. */
    runUntil(flag: string, limit: number) {
      const step = 20_000;
      for (let done = 0; done < limit; done += step) {
        if (read(flag)) return done;
        lab.advance(step);
      }
      assert.ok(read(flag), `${flag} never rose within ${limit} cycles`);
      return limit;
    },
  });
}

export type Op =
  | { start: true }
  | { stop: true }
  | { write: number }
  | { read: 'ack' | 'nack' }
  /** Pause for this many tenths of a millisecond. */
  | { wait: number };

/**
 * A top module that runs an I2C script on pins sda (inout) and scl: `done` rises at the end,
 * `rx` collects the bytes read (the last one in the low byte), `nacks` has bit i set when the
 * i-th written byte was not acknowledged.
 */
export function i2cScript(ops: Op[], div = 8): { name: string; content: string }[] {
  const rows = ops
    .map((op, index) => {
      const word =
        'start' in op
          ? "{3'd1, 1'b0, 8'h00}"
          : 'stop' in op
            ? "{3'd2, 1'b0, 8'h00}"
            : 'wait' in op
              ? `{3'd5, 1'b0, 8'd${op.wait}}`
              : 'write' in op
                ? `{3'd3, 1'b0, 8'h${op.write.toString(16)}}`
                : `{3'd4, 1'b${op.read === 'nack' ? 1 : 0}, 8'h00}`;
      return `      ${index}: op = ${word};`;
    })
    .join('\n');
  const top = `module top(input clk, inout sda, output scl, output reg done = 0,
  output reg [127:0] rx = 0, output reg [63:0] nacks = 0);
  reg start = 0;
  reg [2:0] cmd = 0;
  reg [7:0] wdata = 0;
  reg nack = 0;
  wire busy, ack_error;
  wire [7:0] rdata;
  i2c_master #(.DIV(${div})) bus(.clk(clk), .start(start), .cmd(cmd), .wdata(wdata), .nack(nack),
    .busy(busy), .rdata(rdata), .ack_error(ack_error), .sda(sda), .scl(scl));
  reg [23:0] waitc = 0;
  reg [11:0] pc = 0;
  reg [1:0] s = 0;
  reg [5:0] writes = 0;
  reg [11:0] op;
  always @* begin
    op = 0;
    case (pc)
${rows}
      default: op = 0;
    endcase
  end
  always @(posedge clk) begin
    start <= 0;
    if (!done) case (s)
      0: if (op[11:9] == 0) done <= 1;
         else if (op[11:9] == 5) begin waitc <= op[7:0] * 2700; s <= 3; end
         else begin start <= 1; cmd <= op[11:9]; nack <= op[8]; wdata <= op[7:0]; s <= 1; end
      1: s <= 2;
      3: if (waitc == 0) begin pc <= pc + 1; s <= 0; end else waitc <= waitc - 1;
      2: if (!busy) begin
           if (cmd == 3) begin nacks[writes] <= ack_error; writes <= writes + 1; end
           if (cmd == 4) rx <= {rx[119:0], rdata};
           pc <= pc + 1;
           s <= 0;
         end
    endcase
  end
endmodule
`;
  return [
    { name: 'i2c_master.v', content: I2C_MASTER_V },
    { name: 'top.v', content: top },
  ];
}
