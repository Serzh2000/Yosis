// @ts-check
/** @typedef {import('@yowasp/yosys').Tree} Tree */
/** @typedef {(args: string[], files: Tree, options?: import('@yowasp/yosys').RunOptions) => Promise<Tree>} RunYosys */

/**
 * Загружает Yosys (WebAssembly) по первому обращению. Тип сужен: в этих воркерах команда всегда
 * возвращает дерево файлов, а не `undefined`.
 */
export async function loadYosys() {
  const { runYosys } = await import('@yowasp/yosys');
  return /** @type {RunYosys} */ (runYosys);
}

// process.send() queues large messages. Keep the IPC channel open until every
// callback confirms that its bytes have been written, including logs and errors.

/**
 * @template [Message=import('../shared/worker-protocol').WorkerMessage]
 * @param {Pick<NodeJS.Process, 'connected' | 'send' | 'disconnect'>} [channel]
 */
export function createWorkerChannel(channel = process) {
  /** @type {Set<Promise<void>>} */
  const pending = new Set();
  /** @type {unknown} */
  let failure;
  /** @param {Message} message */
  function send(message) {
    if (!channel.connected || typeof channel.send !== 'function') {
      failure ??= new Error('Worker IPC channel is closed.');
      return;
    }
    /** @type {Promise<void>} */
    const delivery = new Promise((resolve) => {
      try {
        // @ts-expect-error `send` was checked above; its type is optional on the shared Process.
        channel.send(message, (/** @type {Error | null} */ error) => {
          if (error) failure ??= error;
          resolve();
        });
      } catch (error) {
        failure ??= error;
        resolve();
      }
    });
    pending.add(delivery);
    void delivery.then(() => pending.delete(delivery));
  }
  async function disconnect() {
    await Promise.all(pending);
    if (channel.connected) channel.disconnect();
    if (failure) throw failure;
  }
  return { send, disconnect };
}
