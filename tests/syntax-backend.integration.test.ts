import test from 'node:test';
import assert from 'node:assert/strict';
import { SyntaxManager } from '../server/syntax';
import type { Project } from '../shared/types';

const project: Project = {
  name: 'syntax',
  top: 'top',
  board: 'tangnano20k',
  files: [{ name: 'top.v', content: 'module top(input a, output y); assign y=a; endmodule' }],
};
test('syntax check accepts valid Verilog and returns actual file/line diagnostics without Gowin synthesis', async () => {
  const manager = new SyntaxManager();
  try {
    const valid = await manager.check('alice', project, new AbortController().signal);
    assert.equal(valid.error, undefined);
    assert.deepEqual(valid.diagnostics, []);
    const invalid = await manager.check(
      'alice',
      {
        ...project,
        files: [
          { name: 'top.v', content: 'module top(input a, output y);\nassign y = ;\nendmodule' },
        ],
      },
      new AbortController().signal,
    );
    assert.ok(invalid.error);
    assert.ok(
      invalid.diagnostics.some(
        (item) => item.severity === 'error' && item.file === 'top.v' && item.line === 2,
      ),
      JSON.stringify(invalid),
    );
  } finally {
    manager.close();
  }
});

test('superseded or aborted checks stop work and leave the newest user request usable', async () => {
  const manager = new SyntaxManager();
  try {
    const abort = new AbortController(),
      first = manager.check('alice', project, abort.signal);
    abort.abort();
    assert.match((await first).error ?? '', /отменена/);
    const old = manager.check('alice', project, new AbortController().signal);
    const current = manager.check('alice', project, new AbortController().signal);
    assert.match((await old).error ?? '', /заменена/);
    assert.equal((await current).error, undefined);
  } finally {
    manager.close();
  }
});
