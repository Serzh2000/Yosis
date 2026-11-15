// The Verilog book is the existing guided course of Logra, told in the form of a textbook: every
// step becomes a page, a quiz step brings its quiz, a practice step brings the checks of its
// lesson. Nothing of the course is copied: the book is built from `guidedLessons`, so a lesson
// edited there changes here too.
import {
  courseLevels,
  guidedLessons,
  type CourseStep,
  type GuidedLesson,
} from '../../lib/learning-course';
import { authoredVerilogChapters } from './authored';
import type { Block, BookDef, LessonDef, PageDef } from './schema';

/** Ids of pages are letters, digits, hyphens; a step id from the course already is. */
const pageId = (lesson: GuidedLesson, step: CourseStep) =>
  `${lesson.id}-${step.id}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .slice(0, 100);

function pageOf(lesson: GuidedLesson, step: CourseStep): PageDef {
  const blocks: Block[] = [{ kind: 'text', md: step.text }];
  if (step.code)
    blocks.push({ kind: 'code', code: step.code, language: 'verilog', insertable: true });
  const page: PageDef = { id: pageId(lesson, step), title: step.title, blocks };
  if (step.kind === 'quiz' && step.quiz) {
    const answer = Math.max(
      0,
      step.quiz.options.findIndex((option) => option.id === step.quiz!.correctOptionId),
    );
    blocks.push({
      kind: 'quiz',
      question: step.quiz.question,
      options: step.quiz.options.map((option) => option.label),
      answer,
      explain: step.quiz.options[answer]?.feedback ?? '',
    });
    page.task = { kind: 'quiz', text: 'Выбери верный ответ.' };
  } else if (step.kind === 'practice' && lesson.exercise)
    page.task = { kind: 'sim', text: step.text, lessonId: lesson.id };
  return page;
}

const lessonOf = (lesson: GuidedLesson): LessonDef => ({
  id: lesson.id,
  title: lesson.title,
  minutes: lesson.minutes,
  pages: lesson.steps.map((step) => pageOf(lesson, step)),
});

export const verilogBook: BookDef = {
  id: 'verilog',
  title: 'Verilog и плата',
  mode: 'verilog',
  summary:
    'От бита и логического элемента до автоматов и счётчиков: пишешь модуль и проверяешь его.',
  available: true,
  spine: { color: '#e0a82e' },
  chapters: [
    ...courseLevels
      .map((level) => ({
        id: level.id,
        title: level.title,
        lessons: guidedLessons.filter((lesson) => lesson.levelId === level.id).map(lessonOf),
      }))
      .filter((chapter) => chapter.lessons.length > 0),
    ...authoredVerilogChapters(),
  ],
  reference: [],
};
