import { createHash } from 'node:crypto';
import type { Project } from '../shared/types';

/** What a check or a laboratory preparation depends on: the sources and the top module. */
export function sourceKey(project: Project): string {
  const files = project.files
    .filter((file) => !/\.(cst|sdc)$/i.test(file.name))
    .map((file) => [file.name, file.content])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return createHash('sha256')
    .update(JSON.stringify([project.top, files]))
    .digest('hex');
}

export interface Produced<T> {
  result: T;
  /** The result is the tool's own answer, the same for the same sources; false after a cancel or a timeout. */
  final: boolean;
}

/**
 * Results by sources. Many pupils open the same example, so the same project arrives from
 * many people at once or one after another: it is run once, the others wait for that run or
 * take its result. A run that ended by a cancel or a timeout is not an answer, and whoever
 * waited for it starts again.
 */
export class JobCache<T> {
  private done = new Map<string, T>();
  private running = new Map<string, Promise<Produced<T>>>();
  constructor(private capacity = 200) {}

  /** A finished result, if there is one; nothing is run. */
  peek(key: string): T | undefined {
    return this.done.get(key);
  }

  async get(key: string, produce: () => Promise<Produced<T>>): Promise<T> {
    for (;;) {
      const known = this.done.get(key);
      if (known !== undefined) {
        // Most recently used last, so the oldest entry is the one to drop.
        this.done.delete(key);
        this.done.set(key, known);
        return known;
      }
      let own = false;
      let run = this.running.get(key);
      if (!run) {
        own = true;
        run = produce().finally(() => this.running.delete(key));
        this.running.set(key, run);
      }
      const outcome = await run;
      if (outcome.final) {
        if (own) this.remember(key, outcome.result);
        return outcome.result;
      }
      if (own) return outcome.result;
    }
  }

  private remember(key: string, result: T) {
    this.done.set(key, result);
    while (this.done.size > this.capacity) this.done.delete(this.done.keys().next().value!);
  }
}
