import type { Project } from '../../shared/types';
import { validateProject } from '../../shared/project-validation';
import type { Example } from './examples';
import { starterProject } from './starter-project';
import { markExampleOrigin } from './example-origin';
export { validateProject };
export type { Example };

const CURRENT_KEY = 'yosis.current.v1';
const LIBRARY_KEY = 'yosis.projects.v1';
const LAST_BUILD_KEY = 'yosis.build.v1';
export const PROJECT_DATABASE = 'yosis.projects.v2';

export interface ProjectSummary {
  id: string;
  name: string;
  top: string;
  fileCount: number;
  updatedAt: number;
}
interface ProjectRecord {
  id: string;
  project: Project;
  updatedAt: number;
}
interface SavedBuild {
  id: string;
  snapshot: string;
}

export function loadLastBuild(project: Project | string): SavedBuild | null {
  try {
    const raw = sessionStorage.getItem(LAST_BUILD_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<SavedBuild>;
    if (
      typeof saved.id !== 'string' ||
      !/^[0-9a-f-]{36}$/.test(saved.id) ||
      typeof saved.snapshot !== 'string'
    )
      throw new Error('Invalid build record');
    const builtProject = validateProject(JSON.parse(saved.snapshot));
    const matches =
      typeof project === 'string'
        ? builtProject.name === project
        : project.id && builtProject.id
          ? project.id === builtProject.id
          : project.name === builtProject.name;
    if (!matches) {
      clearLastBuild();
      return null;
    }
    return { id: saved.id, snapshot: getProjectSnapshot(builtProject) };
  } catch {
    clearLastBuild();
    return null;
  }
}

export function saveLastBuild(id: string, snapshot: string): void {
  try {
    sessionStorage.setItem(LAST_BUILD_KEY, JSON.stringify({ id, snapshot }));
  } catch {
    /* A live build still works when session storage is disabled. */
  }
}
export function clearLastBuild(): void {
  try {
    sessionStorage.removeItem(LAST_BUILD_KEY);
  } catch {
    /* Optional session recovery. */
  }
}

export function cloneProject(project: Project): Project {
  return { ...project, files: project.files.map((file) => ({ ...file })) };
}
const snapshots = new WeakMap<Project, string>();
/** Stable content identity: JSON key order changes during validation are irrelevant. */
export function getProjectSnapshot(project: Project): string {
  const cached = snapshots.get(project);
  if (cached !== undefined) return cached;
  const value = JSON.stringify({
    ...(project.id ? { id: project.id } : {}),
    name: project.name.trim(),
    top: project.top,
    board: project.board,
    files: project.files.map((file) => ({ name: file.name, content: file.content })),
  });
  snapshots.set(project, value);
  return value;
}
export function identifyProject(project: Project, fresh = false): Project {
  return { ...cloneProject(project), id: !fresh && project.id ? project.id : crypto.randomUUID() };
}
function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Не удалось прочитать хранилище проектов.'));
  });
}
function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Не удалось сохранить проект.'));
    transaction.onerror = () => {
      /* onabort supplies the final failure. */
    };
  });
}
function summary(record: ProjectRecord): ProjectSummary {
  return {
    id: record.id,
    name: record.project.name,
    top: record.project.top,
    fileCount: record.project.files.length,
    updatedAt: record.updatedAt,
  };
}
async function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined')
    throw new Error(
      'Браузер не предоставляет IndexedDB. Проект доступен в памяти; сохранение недоступно.',
    );
  const request = indexedDB.open(PROJECT_DATABASE, 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore('projects', { keyPath: 'id' });
    request.result.createObjectStore('summaries', { keyPath: 'id' });
    request.result.createObjectStore('meta');
  };
  return idbRequest(request);
}
function readLegacy(): {
  library: string | null;
  current: string | null;
  projects: Project[];
  selected?: Project;
  libraryValid: boolean;
} {
  let library: string | null = null,
    current: string | null = null;
  try {
    library = localStorage.getItem(LIBRARY_KEY);
    current = localStorage.getItem(CURRENT_KEY);
  } catch {
    /* IndexedDB can still work. */
  }
  const projects: Project[] = [];
  let libraryValid = true;
  try {
    const values: unknown = JSON.parse(library ?? '{}');
    if (values && typeof values === 'object' && !Array.isArray(values)) {
      for (const value of Object.values(values)) {
        try {
          projects.push(identifyProject(validateProject(value), true));
        } catch {
          libraryValid = false;
        }
      }
    } else libraryValid = false;
  } catch {
    libraryValid = false;
  }
  let selected: Project | undefined;
  try {
    const value = JSON.parse(current ?? 'null') as Partial<Project> | null;
    if (value) {
      selected = validateProject({
        ...value,
        name:
          typeof value.name === 'string' && value.name.trim()
            ? value.name.slice(0, 100)
            : 'untitled',
        top:
          typeof value.top === 'string' && /^[A-Za-z_][A-Za-z0-9_$]{0,127}$/.test(value.top)
            ? value.top
            : 'top',
      });
      const existing = projects.findIndex((project) => project.name === selected!.name);
      selected = {
        ...identifyProject(selected, true),
        id: existing >= 0 ? projects[existing].id : crypto.randomUUID(),
      };
      if (existing >= 0) projects[existing] = selected;
      else projects.push(selected);
    }
  } catch {
    /* Invalid legacy keys are retained for recovery. */
  }
  return { library, current, projects, selected, libraryValid };
}
async function migrateLegacy(database: IDBDatabase): Promise<void> {
  const legacy = readLegacy();
  const transaction = database.transaction(['projects', 'summaries', 'meta'], 'readwrite');
  const done = transactionDone(transaction);
  try {
    const migrated = await idbRequest(transaction.objectStore('meta').get('migrated'));
    if (migrated) {
      await done;
      return;
    }
    const records = transaction.objectStore('projects');
    const summaries = transaction.objectStore('summaries');
    legacy.projects.forEach((project, index) => {
      const record = { id: project.id!, project, updatedAt: Date.now() + index };
      records.put(record);
      summaries.put(summary(record));
    });
    if (legacy.selected) transaction.objectStore('meta').put(legacy.selected.id, 'current');
    transaction.objectStore('meta').put(true, 'migrated');
    await done;
  } catch (cause) {
    try {
      transaction.abort();
    } catch {
      /* The transaction may already have aborted. */
    }
    await done.catch(() => {});
    throw cause;
  }
  // Only remove data after the complete atomic migration; leave malformed keys recoverable.
  try {
    if (
      legacy.libraryValid &&
      legacy.projects.length &&
      localStorage.getItem(LIBRARY_KEY) === legacy.library
    )
      localStorage.removeItem(LIBRARY_KEY);
    if (legacy.selected && localStorage.getItem(CURRENT_KEY) === legacy.current)
      localStorage.removeItem(CURRENT_KEY);
  } catch {
    /* Successful migration does not depend on deleting the old keys. */
  }
}
async function withDatabase<T>(operation: (database: IDBDatabase) => Promise<T>): Promise<T> {
  const database = await openDatabase();
  try {
    await migrateLegacy(database);
    return await operation(database);
  } finally {
    database.close();
  }
}

/** Reads one project. Source files are never loaded while rendering the chooser. */
export async function loadProject(id?: string): Promise<Project> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(['projects', 'meta'], 'readonly');
    const done = transactionDone(transaction);
    const selected =
      id ??
      ((await idbRequest(transaction.objectStore('meta').get('current'))) as string | undefined);
    const record = selected
      ? ((await idbRequest(transaction.objectStore('projects').get(selected))) as
          ProjectRecord | undefined)
      : undefined;
    await done;
    if (record) return validateProject(record.project);
    if (id) throw new Error('Проект из ссылки не найден в этом браузере.');
    return identifyProject(starterProject(), true);
  });
}
export async function saveProject(project: Project, makeCurrent = true): Promise<Project> {
  const validated = identifyProject(validateProject(project));
  return withDatabase(async (database) => {
    const transaction = database.transaction(['projects', 'summaries', 'meta'], 'readwrite', {
      durability: 'strict',
    });
    const done = transactionDone(transaction);
    const record = { id: validated.id!, project: validated, updatedAt: Date.now() };
    transaction.objectStore('projects').put(record);
    transaction.objectStore('summaries').put(summary(record));
    if (makeCurrent) transaction.objectStore('meta').put(record.id, 'current');
    await done;
    return validated;
  });
}
export async function listProjects(): Promise<ProjectSummary[]> {
  return withDatabase(async (database) => {
    const transaction = database.transaction('summaries', 'readonly');
    const done = transactionDone(transaction);
    const values = (await idbRequest(
      transaction.objectStore('summaries').getAll(),
    )) as ProjectSummary[];
    await done;
    return values.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
  });
}
export async function deleteProject(id: string): Promise<void> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(['projects', 'summaries', 'meta'], 'readwrite', {
      durability: 'strict',
    });
    const done = transactionDone(transaction);
    transaction.objectStore('projects').delete(id);
    transaction.objectStore('summaries').delete(id);
    if ((await idbRequest(transaction.objectStore('meta').get('current'))) === id)
      transaction.objectStore('meta').delete('current');
    await done;
  });
}
export async function renameProject(id: string, name: string): Promise<Project> {
  const project = await loadProject(id);
  return saveProject({ ...project, name }, false);
}
export async function duplicateProject(id: string, name: string): Promise<Project> {
  const project = identifyProject(await loadProject(id), true);
  return saveProject({ ...project, name });
}
export function loadExample(
  example: Example,
  existingNames: string | readonly string[] = [],
): Project {
  const names = new Set(typeof existingNames === 'string' ? [existingNames] : existingNames);
  const copy = identifyProject(example.project, true);
  let suffix = 2;
  while (names.has(copy.name)) copy.name = `${example.project.name}-${suffix++}`;
  return markExampleOrigin(copy, example);
}
export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
