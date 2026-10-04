import type { WorkTab } from '../components/StudioNavigation';

export const workTabs: readonly WorkTab[] = [
  'design',
  'code',
  'rtl',
  'technology',
  'constraints',
  'simulation',
  'virtual',
  'chip',
  'lessons',
  'board',
];
export function readStudioRoute(url: string): {
  tab: WorkTab;
  projectId?: string;
  lessonId?: string;
} {
  const parsed = new URL(url);
  const candidate = parsed.searchParams.get('tab');
  const project = parsed.searchParams.get('project');
  const lesson = parsed.searchParams.get('lesson');
  return {
    tab: workTabs.includes(candidate as WorkTab) ? (candidate as WorkTab) : 'code',
    projectId:
      project && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project)
        ? project
        : undefined,
    lessonId: lesson && /^[a-z0-9-]{1,80}$/i.test(lesson) ? lesson : undefined,
  };
}
export function studioUrl(
  url: string,
  tab: WorkTab,
  projectId?: string,
  lessonId?: string,
): string {
  const parsed = new URL(url);
  parsed.searchParams.set('tab', tab);
  if (projectId) parsed.searchParams.set('project', projectId);
  else parsed.searchParams.delete('project');
  if (tab === 'lessons' && lessonId) parsed.searchParams.set('lesson', lessonId);
  else parsed.searchParams.delete('lesson');
  return parsed.href;
}
