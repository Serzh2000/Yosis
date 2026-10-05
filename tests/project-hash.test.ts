import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { projectHash } from '../server/validation';
import { getProjectSnapshot } from '../src/lib/projects';
import type { Project } from '../shared/types';

test('server project hash equals the hash of the client snapshot, with or without origin', () => {
  const plain: Project = {
    id: '11111111-2222-4333-8444-555555555555',
    name: 'chaser',
    top: 'top',
    board: 'tangnano20k',
    files: [{ name: 'top.v', content: 'module top; endmodule\n' }],
  };
  const fromExample: Project = {
    ...plain,
    origin: { exampleId: 'chaser', sourceHash: '0123456789abcdef', copyHash: 'fedcba9876543210' },
  };
  for (const project of [plain, fromExample])
    assert.equal(
      projectHash(project),
      createHash('sha256').update(getProjectSnapshot(project)).digest('hex'),
    );
  assert.equal(projectHash(plain), projectHash(fromExample));
});
