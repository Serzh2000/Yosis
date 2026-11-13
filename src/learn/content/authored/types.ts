// How a lesson is written. An author fills in a plain description (the text, a quiz, a starter, a
// reference solution and the cases the solution must meet) and never touches pages or tasks: the
// builders turn it into pages, and the tests run the starter and the solution through the real
// simulator, so a lesson that cannot be solved, or is solved already, never reaches a learner.
import type { SimulationConfig } from '../../../../shared/types';
import type { Params } from '../../../../shared/schematic';
import type { LessonCase } from '../../../lib/lessons';

/** One page of explanation: a short title, text in limited markdown, an optional listing. */
export interface TheoryPage {
  /** What the page is about, in a few words. */
  title: string;
  /** Limited markdown: paragraphs separated by a blank line, `- ` bullet lists, **bold**, `code`. */
  md: string;
  /** A listing shown under the text (Verilog, or a truth table as plain text). */
  code?: string;
}

export interface QuizSpec {
  question: string;
  /** Two to four options; the wrong ones must be plausible, never silly. */
  options: string[];
  /** Index of the right option. */
  answer: number;
  /** Why the right option is right (shown after any answer). */
  explain: string;
}

/**
 * Chapters of a book that the authored lessons fill. The order of the chapters is the order of this
 * list; the order of the lessons in a chapter is the order of the specs.
 */
export interface LessonBase {
  /** Lowercase letters, digits and hyphens; unique within its book. */
  id: string;
  chapter: string;
  title: string;
  /** Minutes for the contents (3 to 15). */
  minutes: number;
  /** Two to four pages of explanation, then the quiz, then the practice. */
  theory: TheoryPage[];
  quiz?: QuizSpec;
}

/**
 * The checks of a practice. `cases` are read at the clock period `cycle` (zero-based): the output
 * is sampled late in that period, after the inputs of the period have settled. A lesson without a
 * clock lists one case per combination of inputs, `cycle` 0, 1, 2, …
 */
export interface Checks {
  /** The output port of `top` that the cases are about. */
  output: string;
  cases: LessonCase[];
  /**
   * Overrides of the simulator's setup: `clock`, `reset`, `resetActiveLow`, `resetCycles`,
   * `periodNs`, `cycles`, `inputs` (initial values) and `stimuli` (input changes by cycle). Without
   * `stimuli` they are taken from the inputs of the cases, one period for each case.
   */
  config?: Partial<SimulationConfig>;
}

/** A lesson in Verilog: the learner edits `starter` until it behaves like `solution`. */
export interface VerilogLessonSpec extends LessonBase {
  practice: Checks & {
    /** What to do, in one to three sentences. */
    text: string;
    /** A complete file with `module top (...)`, written so that it fails the cases (use a TODO). */
    starter: string;
    /** The complete correct file; same ports as the starter. */
    solution: string;
    /** Two or three hints, from a nudge to almost the answer. */
    hints: string[];
  };
}

export interface PortSpec {
  name: string;
  /** Bits; 1 by default. */
  width?: number;
}

/** A block of the schematic editor (by its library id) placed in the reference solution. */
export interface SolutionBlock {
  /** Id of an entry of the editor's library, e.g. `and`, `not`, `mux`. */
  entry: string;
  name: string;
  /** Parameters over the entry's defaults, e.g. `{ inputs: 3 }`. */
  params?: Params;
}

/** A lesson drawn in the schematic editor: the starter has only the ports. */
export interface SchematicLessonSpec extends LessonBase {
  practice: Checks & {
    text: string;
    /** Input ports placed in the starter, top to bottom; a clock is an input named `clk`. */
    inputs: PortSpec[];
    /** The one output port that the cases read (`y` unless stated). */
    outputWidth?: number;
    solution: {
      blocks: SolutionBlock[];
      /** Wires as `name.PIN` → `name.PIN`; ports are `a.Y` (input) and `y.A` (output). */
      wires: [from: string, to: string][];
    };
    hints: string[];
  };
}

/**
 * A lesson at the bench: parts on the table, wired to the board. It has no starter to run; what
 * stands on the bench is what is judged.
 */
export interface BenchStep {
  /** What the learner sees in the checklist. */
  text: string;
  /** `placed`: at least `count` parts of the kind stand on the table. `wired`: at least `count`
   *  of them have a pin joined to the board. `pins`: at least `count` pins in all are joined. */
  check: 'placed' | 'wired' | 'pins';
  /** Id of a part of the lab library (`led`, `button`, `sw-toggle`, …). */
  part: string;
  count: number;
}
export interface BenchLessonSpec extends LessonBase {
  /** Parts the shelf offers on the page. */
  parts: { part: string; count: number }[];
  steps: BenchStep[];
  /** What the task says, in one or two sentences. */
  task: string;
}
