import test from 'node:test';
import assert from 'node:assert/strict';
import { SyntaxManager } from '../server/syntax';
import type { Project } from '../shared/types';

const project = (body: string): Project => ({
  name: 'syntax',
  top: 'top',
  board: 'tangnano20k',
  files: [{ name: 'top.v', content: `module top(input a, output y);\n${body}\nendmodule` }],
});

test('warm workers serve many checks in turn, good and bad, and the answers stay right', async () => {
  const manager = new SyntaxManager();
  manager.prewarm();
  try {
    for (let round = 0; round < 3; round++) {
      const good = await manager.check(
        'u',
        project(`assign y = a ^ ${round};`),
        new AbortController().signal,
      );
      assert.equal(good.error, undefined);
      const bad = await manager.check(
        'u',
        project(`assign y = ${round};\nassign y = ;`),
        new AbortController().signal,
      );
      assert.ok(bad.error);
      assert.ok(bad.diagnostics.some((item) => item.severity === 'error' && item.line === 3));
    }
  } finally {
    manager.close();
  }
});

test('the same sources from many people give one answer', async () => {
  const manager = new SyntaxManager();
  manager.prewarm();
  try {
    const answers = await Promise.all(
      Array.from({ length: 12 }, (_, user) =>
        manager.check(`u${user}`, project('assign y = a;'), new AbortController().signal),
      ),
    );
    assert.ok(answers.every((answer) => answer.error === undefined));
  } finally {
    manager.close();
  }
});

test('the laboratory takes a failure the source check already found, without running Yosys', async () => {
  const { LabManager } = await import('../server/lab');
  const syntax = new SyntaxManager();
  const lab = new LabManager();
  lab.knownCheck = (value) => syntax.known(value);
  try {
    const bad = project('assign y = ;');
    const checked = await syntax.check('u', bad, new AbortController().signal);
    assert.ok(checked.error);
    const started = Date.now();
    const result = await lab.compile('u', bad, new AbortController().signal);
    assert.equal(result.error, checked.error);
    assert.deepEqual(result.diagnostics, checked.diagnostics);
    assert.ok(Date.now() - started < 50);
  } finally {
    syntax.close();
    lab.close();
  }
});
