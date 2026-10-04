import { RequestError } from '../shared/errors';

export interface QueueOptions<T> {
  capacity: number;
  concurrency: number;
  timeoutMs: number;
  start: (record: T) => void;
  timeout: (record: T) => void;
}

/** Reserves slots before asynchronous source snapshots, and holds them through cleanup. */
export class JobQueue<T> {
  private pending = 0;
  private queued: T[] = [];
  private running = new Map<T, ReturnType<typeof setTimeout>>();
  stopping = false;
  constructor(private options: QueueOptions<T>) {
    if (
      !Number.isInteger(options.concurrency) ||
      options.concurrency < 1 ||
      options.concurrency > 8
    )
      throw new Error('Concurrency must be 1–8.');
  }
  reserve(): () => void {
    if (this.stopping) throw new RequestError('Сервис завершает работу.', 503);
    if (this.queued.length + this.pending >= this.options.capacity)
      throw new RequestError('Очередь заполнена. Дождитесь завершения текущих задач.', 429);
    this.pending++;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.pending--;
      }
    };
  }
  enqueue(record: T) {
    if (this.stopping) throw new RequestError('Сервис завершает работу.', 503);
    this.queued.push(record);
    setImmediate(() => this.drain());
  }
  complete(record: T) {
    this.queued = this.queued.filter((item) => item !== record);
    clearTimeout(this.running.get(record));
    this.running.delete(record);
    setImmediate(() => this.drain());
  }
  isActive(record: T) {
    return this.running.has(record) || this.queued.includes(record);
  }
  stop() {
    this.stopping = true;
  }
  private drain() {
    while (!this.stopping && this.running.size < this.options.concurrency && this.queued.length) {
      const record = this.queued.shift()!;
      const timer = setTimeout(() => this.options.timeout(record), this.options.timeoutMs);
      this.running.set(record, timer);
      this.options.start(record);
    }
  }
}

export function executorCount(name: 'build' | 'simulation' | 'physical') {
  const raw = process.env[`YOSIS_${name.toUpperCase()}_CONCURRENCY`] ?? '1';
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 8)
    throw new Error(`YOSIS_${name.toUpperCase()}_CONCURRENCY должен быть от 1 до 8.`);
  return value;
}
