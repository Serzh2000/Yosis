// Which authored lessons a test looks at: all of them, or only those of one file when an author
// runs `LEARN_FILE=verilog-b npx tsx --test tests/learn-authored.test.ts` on their own work.
import {
  schematicBenchSpecs,
  schematicSpecs,
  verilogBenchSpecs,
  verilogSpecs,
} from '../src/learn/content/authored';
import type {
  BenchLessonSpec,
  SchematicLessonSpec,
  VerilogLessonSpec,
} from '../src/learn/content/authored/types';

const file = process.env.LEARN_FILE?.trim();
let own: { specs: Array<VerilogLessonSpec | SchematicLessonSpec | BenchLessonSpec> } | undefined;
if (file) {
  if (!/^(verilog|schematic)-[a-z]$|^bench-(verilog|schematic)$/.test(file))
    throw new Error(`LEARN_FILE=${file}: expected verilog-a … schematic-j or bench-verilog`);
  own = (await import(`../src/learn/content/authored/${file}.ts`)) as typeof own;
}
const mine = <T extends { id: string }>(all: T[], kind: string) =>
  !file ? all : file.startsWith(kind) ? (own!.specs as unknown as T[]) : [];

export const verilog = mine<VerilogLessonSpec>(verilogSpecs, 'verilog');
export const schematic = mine<SchematicLessonSpec>(schematicSpecs, 'schematic');
export const benchVerilog = !file || file === 'bench-verilog' ? verilogBenchSpecs : [];
export const benchSchematic = !file || file === 'bench-schematic' ? schematicBenchSpecs : [];
