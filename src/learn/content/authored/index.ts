// The authored lessons of both books. Each file below belongs to one author (a person or a
// session) and holds a list of descriptions; this file only gathers them. Add a file here, never
// edit another author's.
import type { ChapterDef, LessonDef } from '../schema';
import { benchLesson, schematicLesson, verilogLesson, type ChapterInfo } from './build';
import type { BenchLessonSpec, SchematicLessonSpec, VerilogLessonSpec } from './types';
import { specs as benchSchematic } from './bench-schematic';
import { specs as benchVerilog } from './bench-verilog';
import { specs as schematicA } from './schematic-a';
import { specs as schematicB } from './schematic-b';
import { specs as schematicC } from './schematic-c';
import { specs as schematicD } from './schematic-d';
import { specs as schematicE } from './schematic-e';
import { specs as schematicF } from './schematic-f';
import { specs as schematicG } from './schematic-g';
import { specs as schematicH } from './schematic-h';
import { specs as schematicI } from './schematic-i';
import { specs as schematicJ } from './schematic-j';
import { specs as verilogA } from './verilog-a';
import { specs as verilogB } from './verilog-b';
import { specs as verilogC } from './verilog-c';
import { specs as verilogD } from './verilog-d';
import { specs as verilogE } from './verilog-e';
import { specs as verilogF } from './verilog-f';
import { specs as verilogG } from './verilog-g';
import { specs as verilogH } from './verilog-h';

/**
 * Chapters the authored lessons of the Verilog book go into, in reading order. They come after the
 * chapters of the guided course that the book already has.
 */
export const verilogChapters: ChapterInfo[] = [
  { id: 'comb', title: 'В. Комбинационная логика' },
  { id: 'arith', title: 'Г. Арифметика и сравнение' },
  { id: 'seq', title: 'Д. Память и такт' },
  { id: 'counters', title: 'Е. Счётчики, частоты и импульсы' },
  { id: 'fsm', title: 'Ж. Конечные автоматы' },
  { id: 'structure', title: 'З. Модули, параметры, массивы' },
  { id: 'board', title: 'И. Плата: кнопки, светодиоды, выводы' },
  { id: 'projects', title: 'К. Небольшие проекты' },
];

/** The same for the schematic book. `blocks` and `bench` also hold lessons written by hand. */
export const schematicChapters: ChapterInfo[] = [
  { id: 'blocks', title: 'Первые схемы' },
  { id: 'gates', title: 'Логические элементы' },
  { id: 'mux', title: 'Выбор и распределение' },
  { id: 'arith', title: 'Арифметика' },
  { id: 'compare', title: 'Сравнение и коды' },
  { id: 'flops', title: 'Триггеры и регистры' },
  { id: 'counters', title: 'Счётчики и делители' },
  { id: 'shift', title: 'Сдвиговые регистры' },
  { id: 'fsm', title: 'Автоматы' },
  { id: 'display', title: 'Индикаторы' },
  { id: 'bench', title: 'Подключаем к плате' },
  { id: 'projects', title: 'Проекты' },
];

export const verilogSpecs: VerilogLessonSpec[] = [
  ...verilogA,
  ...verilogB,
  ...verilogC,
  ...verilogD,
  ...verilogE,
  ...verilogF,
  ...verilogG,
  ...verilogH,
];
export const schematicSpecs: SchematicLessonSpec[] = [
  ...schematicA,
  ...schematicB,
  ...schematicC,
  ...schematicD,
  ...schematicE,
  ...schematicF,
  ...schematicG,
  ...schematicH,
  ...schematicI,
  ...schematicJ,
];
export const verilogBenchSpecs: BenchLessonSpec[] = benchVerilog;
export const schematicBenchSpecs: BenchLessonSpec[] = benchSchematic;

interface Entry {
  chapter: string;
  lesson: LessonDef;
}

/** Chapters of a book from its descriptions; a chapter keeps its lessons in the order they were written. */
function chaptersFrom(chapters: ChapterInfo[], entries: Entry[]): ChapterDef[] {
  return chapters
    .map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      lessons: entries.filter((entry) => entry.chapter === chapter.id).map((e) => e.lesson),
    }))
    .filter((chapter) => chapter.lessons.length > 0);
}

export const authoredVerilogChapters = (): ChapterDef[] =>
  chaptersFrom(verilogChapters, [
    ...verilogSpecs.map((spec) => ({ chapter: spec.chapter, lesson: verilogLesson(spec) })),
    ...verilogBenchSpecs.map((spec) => ({ chapter: spec.chapter, lesson: benchLesson(spec) })),
  ]);

export const authoredSchematicChapters = (): ChapterDef[] =>
  chaptersFrom(schematicChapters, [
    ...schematicSpecs.map((spec) => ({ chapter: spec.chapter, lesson: schematicLesson(spec) })),
    ...schematicBenchSpecs.map((spec) => ({ chapter: spec.chapter, lesson: benchLesson(spec) })),
  ]);
