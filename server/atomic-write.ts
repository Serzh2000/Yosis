import { rename, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';

export async function atomicWrite(filename: string, content: string) {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  await writeFile(temporary, content, 'utf8');
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(temporary, filename);
      return;
    } catch (error) {
      if (
        process.platform !== 'win32' ||
        !['EPERM', 'EACCES', 'EBUSY'].includes((error as NodeJS.ErrnoException).code ?? '') ||
        attempt >= 20
      )
        throw error;
      // Readers/antivirus can briefly hold a destination handle on Windows.
      await delay(25);
    }
  }
}
