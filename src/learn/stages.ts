// The route of a lesson. Every lesson goes through the same few stages (an idea, a guess, a try);
// the pages of a lesson are sorted into them, so the learner sees where in the lesson they are
// without counting pages. Pure, no React.
import { t } from '../lib/i18n';
import type { PageDef } from './content/schema';

export type StageId = 'idea' | 'predict' | 'practice';

export interface StageInfo {
  id: StageId;
  label: string;
  /** What the learner does at this stage, in one verb. */
  verb: string;
  /** «К практике»: the button that leads into the stage. */
  to: string;
}

export const stages: StageInfo[] = [
  { id: 'idea', label: t('Идея'), verb: t('Разберись'), to: t('К идее') },
  { id: 'predict', label: t('Прогноз'), verb: t('Предскажи'), to: t('К прогнозу') },
  { id: 'practice', label: t('Практика'), verb: t('Попробуй'), to: t('К практике') },
];
const rank = new Map(stages.map((stage, at) => [stage.id, at]));
export const stageInfo = (id: StageId) => stages[rank.get(id)!]!;

/** The stage a page announces by what it holds, or nothing when it only explains. */
function marked(page: PageDef): StageId | null {
  const task = page.task;
  if (task?.kind === 'quiz' || page.blocks.some((block) => block.kind === 'quiz')) return 'predict';
  if (
    task?.kind === 'sim' ||
    task?.kind === 'circuit' ||
    task?.kind === 'build' ||
    page.blocks.some(
      (block) => block.kind === 'parts' || (block.kind === 'code' && block.insertable),
    )
  )
    return 'practice';
  return null;
}

/**
 * The stage of every page of a lesson, in order. A page that only explains stays in the stage of
 * the page before it; stages never go back.
 */
export function stagesOfLesson(pages: PageDef[]): StageId[] {
  const out: StageId[] = [];
  let previous: StageId = 'idea';
  for (const page of pages) {
    let next: StageId = marked(page) ?? previous;
    if (rank.get(next)! < rank.get(previous)!) next = previous;
    out.push(next);
    previous = next;
  }
  return out;
}

export interface Stop {
  stage: StageInfo;
  /** Index (in the lesson) of the first page of the stage. */
  first: number;
  /** How many pages the stage has. */
  count: number;
}

/** The stages a lesson really has, each with its first page. */
export function routeOf(stageIds: StageId[]): Stop[] {
  const stops: Stop[] = [];
  stageIds.forEach((id, at) => {
    const last = stops[stops.length - 1];
    if (last && last.stage.id === id) last.count += 1;
    else stops.push({ stage: stageInfo(id), first: at, count: 1 });
  });
  return stops;
}

/** Which part of the desk a page asks for: its own work, or just the board to look at. */
export type DeskView = 'design' | 'bench';
export function deskFor(page: PageDef): DeskView | null {
  const task = page.task;
  if (task?.kind === 'sim' || task?.kind === 'circuit') return 'design';
  if (task?.kind === 'build' || page.blocks.some((block) => block.kind === 'parts')) return 'bench';
  return null;
}
