import type { Project, SimulationConfig } from '../../../shared/types';
import type { Connections } from '../../components/lab/reference/bridge';
import type { LessonCase } from '../../lib/lessons';
import type { LabLayout } from '../../lib/lab/runtime';

/**
 * Two ways to design a device, so two kinds of book: lessons that write Verilog, and lessons that
 * draw the circuit from blocks (the schematic editor). Both end the same way: the design is run in
 * the simulator, parts are put on the bench and wired to the board, and the bitstream is built.
 */
export type LearnMode = 'verilog' | 'schematic';

export interface BookDef {
  /** 'verilog', 'schematic', … */
  id: string;
  title: string;
  mode: LearnMode;
  /** One line under the title on the shelf. */
  summary: string;
  /** false: a grey spine marked «скоро» that does not open. */
  available: boolean;
  spine: { color: string };
  chapters: ChapterDef[];
  /** The reference at the end of the book. */
  reference: PageDef[];
}
export interface ChapterDef {
  id: string;
  title: string;
  lessons: LessonDef[];
}
export interface LessonDef {
  id: string;
  title: string;
  /** Minutes the lesson takes, for the contents. */
  minutes?: number;
  pages: PageDef[];
}
export interface PageDef {
  /** Stable and unique within the book; addresses use it, never a page number. */
  id: string;
  title?: string;
  blocks: Block[];
  /** At most one task per page. */
  task?: TaskDef;
}
export type Block =
  /** Limited markdown: paragraphs, **bold**, `code`, lists. */
  | { kind: 'text'; md: string }
  | { kind: 'image'; src: string; alt: string; caption?: string }
  | {
      kind: 'code';
      code: string;
      language?: 'verilog' | 'text';
      caption?: string;
      /** A button puts this code into the learner's editor. */
      insertable?: boolean;
    }
  | { kind: 'quiz'; question: string; options: string[]; answer: number; explain: string }
  /** Parts of the bench that this page offers in the tray. */
  | { kind: 'parts'; items: { def: string; count: number }[] };

/** What the bench is in: the layout of the table and the wires that join its parts. */
export interface BenchState {
  layout: LabLayout;
  connections: Connections;
}
export interface ChecklistItem {
  text: string;
  until: (state: BenchState) => boolean;
}
/**
 * What a design is judged by: the simulator runs it, and its output port is compared with the
 * cases. The project is the starter the learner begins from: Verilog, or a .ysch schematic.
 */
export interface Exercise {
  project: Project;
  config: SimulationConfig;
  cases: LessonCase[];
  /** The output port of the top module that the cases are about. */
  output: string;
}
/** A circuit is judged the same way as a program. */
export type CircuitExercise = Exercise;
export type TaskDef =
  /** Counted when the quiz block of the same page is answered correctly. */
  | { kind: 'quiz'; text: string }
  /** The learner's circuit, drawn in the schematic editor, runs against the checks of its exercise. */
  | { kind: 'circuit'; text: string; exercise: CircuitExercise; hints?: string[] }
  /** The learner's Verilog runs against the checks of a lesson of the course (lessons.ts). */
  | { kind: 'sim'; text: string; lessonId?: string; exercise?: Exercise; hints?: string[] }
  /** The bench is judged by what stands on it; with a checklist every item must hold at once. */
  | {
      kind: 'build';
      text: string;
      until: (state: BenchState) => boolean;
      checklist?: ChecklistItem[];
    };

/** Pages of a book in reading order, with where each one sits. */
export interface FlatPage {
  page: PageDef;
  chapter: ChapterDef | null;
  lesson: LessonDef | null;
}
export function flattenBook(book: BookDef): FlatPage[] {
  const pages: FlatPage[] = [];
  for (const chapter of book.chapters)
    for (const lesson of chapter.lessons)
      for (const page of lesson.pages) pages.push({ page, chapter, lesson });
  for (const page of book.reference) pages.push({ page, chapter: null, lesson: null });
  return pages;
}
