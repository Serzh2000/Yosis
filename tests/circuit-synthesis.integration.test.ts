import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BuildManager } from '../server/builds';
import { compileCircuit } from '../shared/schematic';
import type { Project } from '../shared/types';
import { cases } from './circuit-cases';
import { buildDut } from './circuit-harness';

/** Каждый вид блока (во всех проверенных вариантах) должен пройти настоящий синтез Yosys для Gowin. */
const CHUNK = 30;
const range = (width: number) => (width === 1 ? '' : `[${width - 1}:0] `);
for (let start = 0; start < cases.length; start += CHUNK)
  test(
    `generated Verilog of block cases ${start}-${Math.min(cases.length, start + CHUNK) - 1} passes Yosys synthesis`,
    { timeout: 400_000 },
    async () => {
      const slice = cases.slice(start, start + CHUNK),
        modules: string[] = [],
        ports: string[] = [],
        instances: string[] = [];
      slice.forEach((item, offset) => {
        const index = start + offset,
          { doc, inputs, outputs } = buildDut(item),
          module = `c${index}`;
        modules.push(compileCircuit(doc, module));
        const connections: string[] = [];
        for (const input of inputs) {
          const name = input.clock ? 'clk' : `i_${input.pin.toLowerCase()}`;
          ports.push(`input wire ${range(input.width)}t${index}_${name}`);
          connections.push(`.${name}(t${index}_${name})`);
        }
        for (const output of outputs) {
          const name = `o_${output.pin.toLowerCase()}`;
          ports.push(`output wire ${range(output.width)}t${index}_${name}`);
          connections.push(`.${name}(t${index}_${name})`);
        }
        instances.push(`    ${module} u${index}(${connections.join(', ')});`);
      });
      const content = `${modules.join('\n')}\nmodule top(\n    ${ports.join(',\n    ')}\n);\n${instances.join('\n')}\nendmodule\n`;
      const project: Project = {
        name: 'all blocks',
        top: 'top',
        board: 'tangnano20k',
        files: [{ name: 'top.v', content }],
      };
      const directory = await mkdtemp(path.join(tmpdir(), 'yosis-blocks-synth-'));
      const manager = new BuildManager(directory);
      try {
        let result = await manager.create(project);
        const deadline = Date.now() + 280_000;
        while (result.status === 'queued' || result.status === 'running') {
          assert.ok(Date.now() < deadline, 'Yosys не уложился во время');
          await new Promise((resolve) => setTimeout(resolve, 200));
          result = await manager.get(result.id);
        }
        assert.equal(result.status, 'success', `${result.error}\n${result.logs.slice(-3000)}`);
      } finally {
        await manager.close();
        await rm(directory, { recursive: true, force: true });
      }
    },
  );
