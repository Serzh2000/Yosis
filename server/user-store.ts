import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { atomicWrite } from './atomic-write';
import { RequestError, validateProject } from './validation';
import type { Project } from '../shared/types';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class UserStore {
  private pending = new Map<string, Promise<unknown>>();
  constructor(private root: string) {}
  private directory(user: string) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(user))
      throw new Error('Invalid user storage identity.');
    return path.join(this.root, user);
  }
  private filename(user: string, id: string) {
    if (!ID.test(id)) throw new RequestError('Проект не найден.', 404);
    return path.join(this.directory(user), 'projects', `${id.toLowerCase()}.json`);
  }
  async list(user: string) {
    const directory = path.join(this.directory(user), 'projects');
    let names: string[];
    try {
      names = await readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const projects = [];
    for (const name of names) {
      if (!ID.test(name.slice(0, -5)) || !name.endsWith('.json')) continue;
      const saved = JSON.parse(await readFile(path.join(directory, name), 'utf8'));
      projects.push({
        id: saved.project.id,
        name: saved.project.name,
        top: saved.project.top,
        board: saved.project.board,
        updatedAt: saved.updatedAt,
        revision: saved.revision,
      });
    }
    return projects;
  }
  async get(
    user: string,
    id: string,
  ): Promise<{ project: Project; revision: string; updatedAt: string }> {
    try {
      return JSON.parse(await readFile(this.filename(user, id), 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new RequestError('Проект не найден.', 404);
      throw error;
    }
  }
  save(user: string, id: string, value: unknown, previousRevision?: string) {
    return this.serialize(user, async () => {
      const filename = this.filename(user, id),
        project = validateProject(value);
      if (project.id && project.id.toLowerCase() !== id.toLowerCase())
        throw new RequestError('Идентификатор проекта не совпадает с адресом.');
      project.id = id.toLowerCase();
      let previous: Awaited<ReturnType<UserStore['get']>> | undefined;
      try {
        previous = await this.get(user, id);
      } catch (error) {
        if (!(error instanceof RequestError && error.status === 404)) throw error;
      }
      if (previous && previousRevision !== previous.revision)
        throw new RequestError(
          'Проект изменён в другой вкладке. Откройте свежую версию перед сохранением.',
          409,
        );
      const content = JSON.stringify(project),
        revision = createHash('sha256').update(content).digest('hex');
      const directory = path.dirname(filename);
      await mkdir(directory, { recursive: true });
      const names = (await readdir(directory)).filter(
        (name) => name.endsWith('.json') && ID.test(name.slice(0, -5)),
      );
      if (!previous && names.length >= 50)
        throw new RequestError('В библиотеке разрешено до 50 проектов на пользователя.', 429);
      let bytes = 0;
      for (const name of names)
        if (name !== path.basename(filename))
          bytes += (await stat(path.join(directory, name))).size;
      if (bytes + Buffer.byteLength(content) > 100 * 1024 * 1024)
        throw new RequestError('Библиотека проектов превышает 100 МБ.', 413);
      const saved = { project, revision, updatedAt: new Date().toISOString() };
      await atomicWrite(filename, JSON.stringify(saved));
      return saved;
    });
  }
  delete(user: string, id: string) {
    return this.serialize(user, async () => {
      await this.get(user, id);
      await rm(this.filename(user, id));
    });
  }
  async progress(user: string) {
    try {
      return JSON.parse(await readFile(path.join(this.directory(user), 'progress.json'), 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
  saveProgress(user: string, value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new RequestError('Прогресс должен быть объектом JSON.');
    const content = JSON.stringify(value);
    if (Buffer.byteLength(content) > 64 * 1024)
      throw new RequestError('Прогресс превышает 64 КБ.', 413);
    return this.serialize(user, async () => {
      await mkdir(this.directory(user), { recursive: true });
      await atomicWrite(path.join(this.directory(user), 'progress.json'), content);
    });
  }
  private async serialize<T>(user: string, action: () => Promise<T>): Promise<T> {
    const operation = (this.pending.get(user) ?? Promise.resolve()).catch(() => {}).then(action);
    this.pending.set(user, operation);
    try {
      return await operation;
    } finally {
      if (this.pending.get(user) === operation) this.pending.delete(user);
    }
  }
}
