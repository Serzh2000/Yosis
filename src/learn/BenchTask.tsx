import { Suspense, lazy } from 'react';
import type { Project } from '../../shared/types';
import { partById } from '../lib/lab/catalog';
import type { BenchState, TaskDef } from './content/schema';

const LabPanel = lazy(() =>
  import('../components/lab/LabPanel').then((module) => ({ default: module.LabPanel })),
);

/** The bench of the book is its own: lessons do not touch the learner's projects. */
export const BENCH_PROJECT: Project = {
  id: '00000000-0000-4000-8000-00000000b001',
  name: 'Стол учебника',
  top: 'top',
  board: 'tangnano20k',
  files: [
    {
      name: 'top.v',
      content: 'module top (input wire a, output wire y);\n    assign y = a;\nendmodule\n',
    },
  ],
};

/** Judges a state of the bench by the checklist of the task, or by its one condition. */
export function judgeBench(task: Extract<TaskDef, { kind: 'build' }>, state: BenchState) {
  const safe = (until: (state: BenchState) => boolean) => {
    try {
      return until(state);
    } catch {
      return false;
    }
  };
  const items = (task.checklist ?? []).map((item) => ({ text: item.text, ok: safe(item.until) }));
  const done = safe(task.until) && items.every((item) => item.ok);
  return { items, done };
}

/** The parts the pages of a book ask for; the library offers just those (and the breadboard). */
export function offeredParts(wanted: string[]) {
  const known = wanted.filter((id) => partById.has(id));
  return known.length ? [...new Set([...known, 'breadboard'])] : undefined;
}

/**
 * The bench of the desk: the laboratory with the board on its breadboard. It keeps running while
 * hidden behind another view, so the layout the learner built is still there when they come back.
 */
export function Bench({
  active,
  wanted,
  onBench,
}: {
  active: boolean;
  wanted: string[];
  onBench: (state: BenchState) => void;
}) {
  return (
    <Suspense fallback={<p className="learn-note desk-note">Готовим стол…</p>}>
      <LabPanel
        project={BENCH_PROJECT}
        active={active}
        onChange={() => undefined}
        onOpenPins={() => undefined}
        onBench={onBench}
        allowedParts={offeredParts(wanted)}
        sceneOnly
      />
    </Suspense>
  );
}
