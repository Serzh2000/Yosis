import type { ChildProcess } from 'node:child_process';

/** Jobs one worker serves before it is replaced. */
const MAX_JOBS = 100;

/**
 * Worker processes started ahead of the jobs. A new worker loads Yosys (WebAssembly) and
 * warms it up before its first job, which costs far more than a small check itself; a spare
 * has done that while nobody was waiting. Only a spare that reported `warm` is handed out:
 * one still warming up would make the job wait for it, so the job starts a fresh worker.
 */
export class SpareWorkers {
  private spares = new Map<ChildProcess, boolean>();
  private uses = new WeakMap<ChildProcess, number>();
  private enabled = false;
  constructor(
    private spawn: () => ChildProcess,
    private warm: (child: ChildProcess) => void,
    /** How many warm workers to keep. */
    private size: number,
  ) {}

  /** The server calls this once; tests and tools leave the pool off. */
  enable() {
    this.enabled = true;
    this.refill();
  }

  /** A warm worker, or undefined when none is ready (the caller then starts its own). */
  take(): ChildProcess | undefined {
    for (const [child, ready] of this.spares) {
      if (!ready) continue;
      this.spares.delete(child);
      this.uses.set(child, (this.uses.get(child) ?? 0) + 1);
      child.removeAllListeners('error');
      child.removeAllListeners('exit');
      child.removeAllListeners('message');
      setImmediate(() => this.refill());
      if (child.connected && child.exitCode === null) return child;
    }
    return undefined;
  }

  /**
   * A worker that finished its job and is alive goes back to the pool, so the next job does not
   * start a process. After a number of jobs it is let go: WebAssembly memory only grows.
   */
  give(child: ChildProcess): boolean {
    if (
      !this.enabled ||
      this.spares.size >= this.size ||
      !child.connected ||
      child.exitCode !== null ||
      (this.uses.get(child) ?? 0) >= MAX_JOBS
    )
      return false;
    this.spares.set(child, true);
    const drop = () => {
      if (this.spares.delete(child) && this.enabled) setTimeout(() => this.refill(), 1000);
    };
    child.once('error', drop);
    child.once('exit', drop);
    return true;
  }

  stop() {
    this.enabled = false;
    for (const child of this.spares.keys()) child.kill();
    this.spares.clear();
  }

  private refill() {
    while (this.enabled && this.spares.size < this.size) {
      let child: ChildProcess;
      try {
        child = this.spawn();
      } catch {
        return;
      }
      this.spares.set(child, false);
      const drop = () => {
        if (this.spares.delete(child) && this.enabled) setTimeout(() => this.refill(), 1000);
      };
      child.once('error', drop);
      child.once('exit', drop);
      child.on('message', (value) => {
        if ((value as { type?: string }).type === 'warm' && this.spares.has(child))
          this.spares.set(child, true);
      });
      this.warm(child);
    }
  }
}
