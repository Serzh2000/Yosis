// process.send() queues large messages. Keep the IPC channel open until every
// callback confirms that its bytes have been written, including logs and errors.
export function createWorkerChannel(channel = process) {
  const pending = new Set();
  let failure;
  function send(message) {
    if (!channel.connected || typeof channel.send !== 'function') {
      failure ??= new Error('Worker IPC channel is closed.');
      return;
    }
    const delivery = new Promise((resolve) => {
      try {
        channel.send(message, (error) => {
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
