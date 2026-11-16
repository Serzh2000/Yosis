// What the cabinets show, computed from plain data: the matrix «learner × lesson», sorting,
// the «stuck» label and the CSV for the teacher. No React, no network.
import { language, t } from '../../lib/i18n';
import type { BookDef, LessonDef } from '../content/schema';
import { flattenBook } from '../content/schema';
import { bookProgress, lessonState, type BookProgress, type LessonState } from '../progress';
import type { StudentSummary } from './api';

export interface LessonColumn {
  lesson: LessonDef;
  /** Number in the book, from 1. */
  no: number;
}
export const lessonColumns = (book: BookDef): LessonColumn[] =>
  book.chapters.flatMap((chapter) => chapter.lessons).map((lesson, at) => ({ lesson, no: at + 1 }));

/** The progress of a learner in one book, in the form the textbook's own helpers expect. */
export function progressOf(student: StudentSummary, bookId: string): BookProgress {
  return {
    done: student.done[bookId] ?? [],
    skipped: student.skipped[bookId] ?? [],
    quiz: {},
  };
}

export function lessonStates(student: StudentSummary, book: BookDef): LessonState[] {
  const progress = progressOf(student, book.id);
  return lessonColumns(book).map((column) => lessonState(column.lesson, progress));
}

export const STATE_LABEL: Record<LessonState, string> = {
  new: t('не начат'),
  started: t('начат'),
  done: t('пройден'),
};
export const STATE_MARK: Record<LessonState, string> = { new: '·', started: '◐', done: '✓' };

/** «Урок 12: Мигающий светодиод» for the page where a learner is stuck, or the page id when unknown. */
export function describePage(book: BookDef | undefined, pageId: string): string {
  if (!book) return pageId;
  const found = flattenBook(book).find(({ page }) => page.id === pageId);
  if (!found) return pageId;
  if (!found.lesson) return t('Справочник');
  const no = lessonColumns(book).find((column) => column.lesson === found.lesson)?.no;
  return t('Урок {no}: {title}', { no: String(no), title: found.lesson.title });
}

export type SortKey = 'name' | 'activity' | 'progress';
export interface RosterFilter {
  query: string;
  classId: string | 'all' | 'none';
  onlyStuck: boolean;
}

export function filterStudents(students: StudentSummary[], filter: RosterFilter): StudentSummary[] {
  const query = filter.query.trim().toLowerCase();
  return students.filter((student) => {
    if (query && !`${student.displayName} ${student.login}`.toLowerCase().includes(query))
      return false;
    if (filter.classId === 'none' && student.classId) return false;
    if (filter.classId !== 'all' && filter.classId !== 'none' && student.classId !== filter.classId)
      return false;
    if (filter.onlyStuck && !student.stuck) return false;
    return true;
  });
}

export function sortStudents(
  students: StudentSummary[],
  key: SortKey,
  book: BookDef,
): StudentSummary[] {
  const doneIn = (student: StudentSummary) => bookProgress(book, progressOf(student, book.id)).done;
  const byName = (a: StudentSummary, b: StudentSummary) =>
    a.displayName.localeCompare(b.displayName, language() === 'en' ? 'en' : 'ru');
  return [...students].sort((a, b) => {
    if (key === 'activity') return (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0) || byName(a, b);
    if (key === 'progress') return doneIn(b) - doneIn(a) || byName(a, b);
    return byName(a, b);
  });
}

const DAY = 24 * 60 * 60 * 1000;
export function classSummary(students: StudentSummary[], now: number) {
  return {
    total: students.length,
    activeToday: students.filter((s) => s.lastActiveAt !== null && now - s.lastActiveAt < DAY)
      .length,
    stuck: students.filter((s) => s.stuck).length,
    away: students.filter((s) => s.lastActiveAt === null || now - s.lastActiveAt > 7 * DAY).length,
  };
}

/** Локаль для дат: русская по умолчанию, английская в английском интерфейсе. */
export const dateLocale = () => (language() === 'en' ? 'en-GB' : 'ru-RU');

/** «5 мин назад», «вчера», «12 дней назад», «не заходил». */
export function ago(at: number | null, now = Date.now()): string {
  if (at === null) return t('не заходил');
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return t('только что');
  if (minutes < 60) return t('{n} мин назад', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('{n} ч назад', { n: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t('вчера');
  return t('{n} дн. назад', { n: days });
}

/* CSV: Excel in a Russian locale opens UTF-8 with a BOM and wants «;» between the cells. */

/** Cells that start like a formula are written as text, so a learner's name cannot run anything in a spreadsheet. */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function classCsv(
  students: StudentSummary[],
  book: BookDef,
  className: (id: string | null) => string,
): string {
  const columns = lessonColumns(book);
  const head = [
    t('Имя'),
    t('Логин'),
    t('Класс'),
    t('Последний вход'),
    t('Заданий выполнено'),
    t('Заданий всего'),
    t('Застрял'),
    ...columns.map((column) => t('Урок {n}', { n: column.no })),
  ];
  const rows = students.map((student) => {
    const share = bookProgress(book, progressOf(student, book.id));
    return [
      student.displayName,
      student.login,
      className(student.classId),
      student.lastActiveAt === null
        ? ''
        : new Date(student.lastActiveAt).toISOString().slice(0, 16).replace('T', ' '),
      share.done,
      share.total,
      student.stuck ? describePage(book, student.stuck.pageId) : '',
      ...lessonStates(student, book).map((state) => STATE_LABEL[state]),
    ];
  });
  return '﻿' + [head, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

export function credentialsCsv(rows: { displayName: string; login: string; password: string }[]) {
  const lines = [
    [t('Имя'), t('Логин'), t('Временный пароль')],
    ...rows.map((r) => [r.displayName, r.login, r.password]),
  ];
  return '﻿' + lines.map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
