/**
 * Единственное место, которое обращается к `localStorage` и `sessionStorage`. Здесь собраны все
 * ключи с версиями, а чтение и запись не бросают исключений: в приватном режиме, при выключенном
 * хранилище или переполнении студия продолжает работать в памяти.
 *
 * Ключи и форматы данных менять нельзя: в браузерах учеников уже лежат сохранённые данные.
 * Для нового формата заводится новый ключ с другой версией и миграция при чтении.
 */
export const STORAGE_KEYS = {
  /** localStorage: тема интерфейса, `'light'` или `'dark'`. */
  theme: 'yosis.theme.v1',
  /** localStorage: старая библиотека проектов; читается только для переноса в IndexedDB. */
  legacyProjects: 'yosis.projects.v1',
  /** localStorage: старый текущий проект; читается только для переноса в IndexedDB. */
  legacyCurrentProject: 'yosis.current.v1',
  /** sessionStorage: последняя сборка текущей вкладки, `{id, snapshot}`. */
  lastBuild: 'yosis.build.v1',
  /** sessionStorage: последнее размещение на кристалле, `{id, project}`. */
  physicalJob: 'yosis.physical.v1',
  /** localStorage: пройденные уроки (`LessonsPanel`), массив идентификаторов. */
  lessons: 'yosis.lessons.v1',
  /** localStorage: прогресс курса «Обучение». */
  learningCourse: 'yosis.learning-course.v1',
  /** localStorage: черновики решений курса. */
  learningDrafts: 'yosis.learning-drafts.v1',
  /** localStorage: прогресс первой миссии. */
  firstMission: 'yosis.first-mission.v1',
  /** localStorage: скрытые напоминания об устаревших копиях примеров, `{проект: отпечаток}`. */
  staleExampleDismissed: 'yosis.stale-example.dismissed.v1',
  /** localStorage: стол лаборатории проекта, по ключу на проект. */
  labLayout: (projectKey: string) => `yosis.lab.v1.${projectKey}`,
} as const;

/** Базы IndexedDB (не `Storage`, но тоже часть реестра: имя и версия схемы). */
export const DATABASES = {
  /** Проекты ученика: хранилища `projects`, `summaries`, `meta`. */
  projects: { name: 'yosis.projects.v2', version: 1 },
  /** Резервные копии прошивки отладчика. */
  debuggerBackups: { name: 'yosis.debugger-backups', version: 1 },
} as const;

export interface KeyValueStore {
  /** Значение или `null`, если ключа нет или хранилище недоступно. */
  getItem(key: string): string | null;
  /** `false`, если браузер не принял запись. */
  setItem(key: string, value: string): boolean;
  /** Запись, которая бросает исходную ошибку браузера: для вызывающих, откатывающих изменения сами. */
  setItemStrict(key: string, value: string): void;
  removeItem(key: string): void;
  /** Разобранное значение; при отсутствии, повреждении или отказе `parse` — `fallback`. */
  readJson<T>(key: string, parse: (value: unknown) => T, fallback: T): T;
  /** `false`, если значение не удалось сериализовать или сохранить. */
  writeJson(key: string, value: unknown): boolean;
}

function createStore(name: 'localStorage' | 'sessionStorage'): KeyValueStore {
  // Хранилище берётся при каждом обращении: оно может быть подменено (тесты) или заблокировано.
  const area = (): Storage | undefined => {
    try {
      return globalThis[name];
    } catch {
      return undefined;
    }
  };
  const store: KeyValueStore = {
    getItem(key) {
      try {
        return area()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        store.setItemStrict(key, value);
        return true;
      } catch {
        return false;
      }
    },
    setItemStrict(key, value) {
      const target = area();
      if (!target) throw new Error('Хранилище браузера недоступно.');
      target.setItem(key, value);
    },
    removeItem(key) {
      try {
        area()?.removeItem(key);
      } catch {
        /* Нечего удалять, если хранилище недоступно. */
      }
    },
    readJson(key, parse, fallback) {
      const raw = store.getItem(key);
      if (raw === null) return fallback;
      try {
        return parse(JSON.parse(raw));
      } catch {
        return fallback;
      }
    },
    writeJson(key, value) {
      try {
        return store.setItem(key, JSON.stringify(value));
      } catch {
        return false;
      }
    },
  };
  return store;
}

export const localStore: KeyValueStore = createStore('localStorage');
export const sessionStore: KeyValueStore = createStore('sessionStorage');
