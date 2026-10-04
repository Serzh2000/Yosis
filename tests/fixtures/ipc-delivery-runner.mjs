import { createWorkerChannel } from '../../server/worker-ipc.mjs';

const channel = createWorkerChannel();
process.once('message', async ({ size, logs, cancel }) => {
  if (cancel) await new Promise((resolve) => setTimeout(resolve, 20));
  try {
    for (let index = 0; index < logs; index++)
      channel.send({ type: 'log', index, text: 'L'.repeat(16 * 1024) });
    channel.send({ type: 'artifact', text: 'A'.repeat(size) });
    channel.send({ type: 'success' });
    await channel.disconnect();
  } catch {
    process.exitCode = 1;
  }
});
