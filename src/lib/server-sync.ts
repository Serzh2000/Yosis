import type { Project } from '../../shared/types';
import type { CourseProgress } from './learning-course';
import type { LearningDrafts } from './learning-session';
import { LEARNING_PROGRESS_KEY, parseCourseProgress } from './learning-course';
import { LEARNING_DRAFTS_KEY, parseLearningDrafts } from './learning-session';
import { request } from './api';
import { validateProject } from './projects';

export interface ServerProjectSummary {
  id: string;
  name: string;
  top: string;
  board: string;
  updatedAt: string;
  revision: string;
}
export interface ServerProject {
  project: Project;
  revision: string;
  updatedAt: string;
}
export interface CourseBackup {
  version: 1;
  course: CourseProgress;
  drafts: LearningDrafts;
}
export async function serverProjects(): Promise<ServerProjectSummary[]> {
  return request('/api/projects');
}
export async function serverProject(id: string): Promise<ServerProject> {
  const value = await request<ServerProject>(`/api/projects/${id}`);
  return { ...value, project: validateProject(value.project) };
}
export async function uploadProject(project: Project, revision?: string): Promise<ServerProject> {
  if (!project.id) throw new Error('Сначала сохраните проект в браузере.');
  return request(`/api/projects/${project.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(revision ? { 'If-Match': revision } : {}) },
    body: JSON.stringify({ project: validateProject(project) }),
  });
}
export async function removeServerProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Не удалось удалить проект на сервере.');
}
export function currentCourseBackup(): CourseBackup {
  return {
    version: 1,
    course: parseCourseProgress(localStorage.getItem(LEARNING_PROGRESS_KEY)),
    drafts: parseLearningDrafts(localStorage.getItem(LEARNING_DRAFTS_KEY)),
  };
}
export function parseCourseBackup(value: unknown): CourseBackup {
  if (!value || typeof value !== 'object' || (value as Partial<CourseBackup>).version !== 1)
    throw new Error('Сохранённый прогресс имеет неизвестный формат.');
  const backup = value as Partial<CourseBackup>;
  return {
    version: 1,
    course: parseCourseProgress(backup.course),
    drafts: parseLearningDrafts(backup.drafts),
  };
}
export async function uploadCourse(): Promise<void> {
  const body = JSON.stringify(currentCourseBackup());
  const response = await fetch('/api/progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!response.ok) {
    const result = (await response.json()) as { error?: string };
    throw new Error(result.error ?? 'Не удалось сохранить прогресс на сервере.');
  }
}
export async function downloadCourse(): Promise<CourseBackup> {
  const value = await request<unknown>('/api/progress');
  if (value === null) throw new Error('На сервере пока нет сохранённого прогресса курса.');
  return parseCourseBackup(value);
}
export function restoreCourse(backup: CourseBackup): void {
  const progress = localStorage.getItem(LEARNING_PROGRESS_KEY),
    drafts = localStorage.getItem(LEARNING_DRAFTS_KEY);
  try {
    localStorage.setItem(LEARNING_DRAFTS_KEY, JSON.stringify(backup.drafts));
    localStorage.setItem(LEARNING_PROGRESS_KEY, JSON.stringify(backup.course));
  } catch (cause) {
    try {
      if (progress === null) localStorage.removeItem(LEARNING_PROGRESS_KEY);
      else localStorage.setItem(LEARNING_PROGRESS_KEY, progress);
      if (drafts === null) localStorage.removeItem(LEARNING_DRAFTS_KEY);
      else localStorage.setItem(LEARNING_DRAFTS_KEY, drafts);
    } catch {
      /* Preserve the initial failure. */
    }
    throw cause;
  }
}
