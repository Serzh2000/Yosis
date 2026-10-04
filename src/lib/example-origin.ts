import type { Project, SourceFile } from '../../shared/types';
import type { Example } from './examples';

/**
 * Копия встроенного примера хранится в браузере навсегда, а библиотека примеров
 * со временем исправляется. Здесь распознаются устаревшие копии, чтобы предложить
 * свежую копию, не трогая проект ученика.
 */

function fnv1a(text: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Отпечаток набора файлов; не криптографический, переводы строк не важны. */
export function hashFiles(files: readonly SourceFile[]): string {
  const text = JSON.stringify(
    [...files]
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .map((file) => [file.name, file.content.replace(/\r\n/g, '\n')]),
  );
  return [0x811c9dc5, 0x9747b28c]
    .map((seed) => fnv1a(text, seed).toString(16).padStart(8, '0'))
    .join('');
}

/** Помечает свежесозданную копию примера; вызывать после всех изменений при создании. */
export function markExampleOrigin(
  project: Project,
  example: Pick<Example, 'id' | 'project'>,
): Project {
  return {
    ...project,
    origin: {
      exampleId: example.id,
      sourceHash: hashFiles(example.project.files),
      copyHash: hashFiles(project.files),
    },
  };
}

export interface StaleExampleCopy {
  example: Example;
  /** `marked` — у проекта есть метка происхождения; `guess` — старый проект, распознан по имени и содержимому. */
  certainty: 'marked' | 'guess';
  /** Отпечаток текущей версии примера; по нему запоминается скрытие уведомления. */
  currentHash: string;
}

function lineBag(files: readonly SourceFile[]): Map<string, number> {
  const bag = new Map<string, number>();
  for (const file of files)
    for (const raw of file.content.split(/\r?\n/)) {
      const line = raw.trim();
      if (line) bag.set(line, (bag.get(line) ?? 0) + 1);
    }
  return bag;
}

/** Доля общих строк (с учётом повторов) относительно большего файла: 1 — одинаковые. */
export function contentSimilarity(a: readonly SourceFile[], b: readonly SourceFile[]): number {
  const first = lineBag(a),
    second = lineBag(b);
  let common = 0,
    totalFirst = 0,
    totalSecond = 0;
  for (const count of first.values()) totalFirst += count;
  for (const count of second.values()) totalSecond += count;
  for (const [line, count] of first) common += Math.min(count, second.get(line) ?? 0);
  const largest = Math.max(totalFirst, totalSecond);
  return largest === 0 ? 1 : common / largest;
}

export const LEGACY_SIMILARITY = 0.6;

/** Имя копии без отметки: само имя примера либо «имя-N», как выдаёт loadExample. */
function nameMatches(projectName: string, exampleName: string): boolean {
  const name = projectName.trim();
  if (name === exampleName) return true;
  if (!name.startsWith(`${exampleName}-`)) return false;
  return /^\d+$/.test(name.slice(exampleName.length + 1));
}

/**
 * Проект — копия примера, исходник которого в библиотеке уже другой?
 * Отмеченные копии сообщают только пока ученик не менял файлы. Старые проекты без отметки
 * распознаются осторожно: имя, верхний модуль и набор файлов как у примера, содержимое
 * отличается, но остаётся похожим (не переписано заново).
 */
export function findStaleExampleCopy(
  project: Project,
  library: readonly Example[],
): StaleExampleCopy | null {
  const origin = project.origin;
  if (origin) {
    const example = library.find((item) => item.id === origin.exampleId);
    if (!example) return null;
    if (hashFiles(project.files) !== origin.copyHash) return null;
    const currentHash = hashFiles(example.project.files);
    if (currentHash === origin.sourceHash) return null;
    return { example, certainty: 'marked', currentHash };
  }
  for (const example of library) {
    if (!nameMatches(project.name, example.project.name)) continue;
    if (project.top !== example.project.top) continue;
    const names = (files: readonly SourceFile[]) =>
      files
        .map((file) => file.name)
        .sort()
        .join('\0');
    if (names(project.files) !== names(example.project.files)) continue;
    const currentHash = hashFiles(example.project.files);
    if (hashFiles(project.files) === currentHash) return null;
    // Похожесть считается по исходникам: общий файл выводов не доказывает, что код — пример.
    const code = (files: readonly SourceFile[]) =>
      files.filter((file) => !file.name.endsWith('.cst'));
    if (contentSimilarity(code(project.files), code(example.project.files)) < LEGACY_SIMILARITY)
      return null;
    return { example, certainty: 'guess', currentHash };
  }
  return null;
}

const DISMISSED_KEY = 'yosis.stale-example.dismissed.v1';

/** Скрытие уведомления привязано к проекту и версии примера: новая правка библиотеки покажет его снова. */
export function isStaleNoticeDismissed(
  projectId: string | undefined,
  currentHash: string,
): boolean {
  if (!projectId) return false;
  try {
    const saved = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '{}') as Record<
      string,
      unknown
    >;
    return saved[projectId] === currentHash;
  } catch {
    return false;
  }
}

export function dismissStaleNotice(projectId: string | undefined, currentHash: string): void {
  if (!projectId) return;
  try {
    const saved = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '{}') as Record<
      string,
      unknown
    >;
    const entries = Object.entries(saved).filter(([, value]) => typeof value === 'string');
    localStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify(Object.fromEntries([...entries.slice(-199), [projectId, currentHash]])),
    );
  } catch {
    /* Уведомление просто покажется снова. */
  }
}
