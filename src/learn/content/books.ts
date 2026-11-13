import type { BookDef } from './schema';
import { schematicBook } from './schematic-book';
import { verilogBook } from './verilog-book';

/** The shelf: one book for each way to learn. */
export const books: BookDef[] = [verilogBook, schematicBook];
