// Integrity rules of a book. Returns human-readable problems; an empty list means fine.
import { guidedLessons } from '../../lib/learning-course';
import { ID_MAX, ID_PATTERN } from '../../../shared/learn-sync';
import { flattenBook, type BookDef, type PageDef } from './schema';

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>(),
    dup = new Set<string>();
  for (const id of ids) (seen.has(id) ? dup : seen).add(id);
  return [...dup];
}

function checkPage(book: BookDef, page: PageDef, problems: string[]) {
  const where = `${book.id}/${page.id}`;
  // The id travels to the account server, which accepts only this shape.
  if (page.id.length > ID_MAX || !ID_PATTERN.test(page.id))
    problems.push(`${where}: page id is not letters, digits, - and _`);
  const count = (kind: string) => page.blocks.filter((block) => block.kind === kind).length;
  if (count('quiz') > 1) problems.push(`${where}: more than one quiz block`);
  const task = page.task;
  if (task?.kind === 'quiz' && count('quiz') === 0)
    problems.push(`${where}: quiz task without a quiz block`);
  if (task?.kind === 'build' && typeof task.until !== 'function')
    problems.push(`${where}: build task without an until function`);
  if (task?.kind === 'circuit') {
    if (book.mode !== 'schematic')
      problems.push(`${where}: a circuit task belongs to a schematic book`);
    if (!task.exercise.project.files.some((file) => file.name.endsWith('.ysch')))
      problems.push(`${where}: circuit task without a .ysch starter`);
    if (task.exercise.cases.length === 0) problems.push(`${where}: circuit task without checks`);
  }
  if (task?.kind === 'sim') {
    if (book.mode !== 'verilog') problems.push(`${where}: a sim task belongs to a verilog book`);
    if (task.exercise) {
      if (task.exercise.cases.length === 0) problems.push(`${where}: sim task without checks`);
      if (!task.exercise.project.files.some((file) => file.name.endsWith('.v')))
        problems.push(`${where}: sim task without a Verilog starter`);
    } else {
      const lesson = guidedLessons.find((item) => item.id === task.lessonId);
      if (!lesson?.exercise)
        problems.push(`${where}: sim task refers to lesson ${task.lessonId} without an exercise`);
      else if (lesson.exercise.cases.length === 0)
        problems.push(`${where}: lesson ${task.lessonId} has no checks`);
    }
  }
  for (const block of page.blocks) {
    if (block.kind !== 'quiz') continue;
    if (!Number.isInteger(block.answer) || block.answer < 0 || block.answer >= block.options.length)
      problems.push(`${where}: quiz answer ${block.answer} is not an option index`);
  }
}

export function checkBook(book: BookDef): string[] {
  const problems: string[] = [];
  const flat = flattenBook(book);
  if (!flat.length) problems.push(`${book.id}: no pages`);
  if (!ID_PATTERN.test(book.id) || book.id.length > ID_MAX)
    problems.push(`${book.id}: book id is not valid`);
  for (const id of duplicates(flat.map(({ page }) => page.id)))
    problems.push(`${book.id}: duplicate page id ${id}`);
  for (const id of duplicates(book.chapters.map((chapter) => chapter.id)))
    problems.push(`${book.id}: duplicate chapter id ${id}`);
  for (const id of duplicates(book.chapters.flatMap((c) => c.lessons.map((lesson) => lesson.id))))
    problems.push(`${book.id}: duplicate lesson id ${id}`);
  for (const { page } of flat) checkPage(book, page, problems);
  return problems;
}
