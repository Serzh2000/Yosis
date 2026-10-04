import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateProgrammingBitstream } from '../server/programming-bitstream';

const report = JSON.parse(await readFile('.physical/example-smoke-report.json', 'utf8')) as {
  checks: { id: string; physicalId: string; status: string }[];
};
const results = [];
for (const check of report.checks) {
  assert.equal(check.status, 'success', check.id);
  const original = await readFile(path.join('.physical', check.physicalId, 'design.fs'), 'utf8');
  const digest = createHash('sha256').update(original).digest('hex');
  const validated = validateProgrammingBitstream(original, digest);
  const rows = (value: string) => value.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('//'));
  assert.deepEqual(rows(validated.programmerText), rows(original), check.id);
  results.push({ id: check.id, sha256: digest, frames: validated.frames, userCode: validated.userCode });
}
await writeFile('.physical/programming-bitstream-audit.json', JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
console.log(`PASS: ${results.length} real example bitstreams; frame CRCs valid and adapter preserves every binary row.`);
