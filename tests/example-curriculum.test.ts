import test from 'node:test';
import assert from 'node:assert/strict';
import { examples } from '../src/lib/examples';
import {
  curriculumLevels,
  curriculumTopics,
  exampleCurriculum,
  getExampleLesson,
  compareCurriculumExamples,
} from '../src/lib/example-curriculum';

test('each built-in project has a complete authored lesson in the curriculum', () => {
  assert.deepEqual(
    Object.keys(exampleCurriculum).sort(),
    examples.map((example) => example.id).sort(),
  );
  const levels = new Set(curriculumLevels.map((level) => level.id));
  const topics = new Set(curriculumTopics.map((topic) => topic.id));
  assert.deepEqual([...levels], [1, 2, 3, 4]);
  for (const example of examples) {
    const entry = getExampleLesson(example.id)!;
    assert.ok(levels.has(entry.level), `${example.id}: unknown level`);
    assert.ok(topics.has(entry.topic), `${example.id}: unknown topic`);
    for (const [name, text] of Object.entries({
      objective: entry.objective,
      observe: entry.observe,
      experiment: entry.experiment,
    })) {
      assert.ok(text.trim().length > 20, `${example.id}: missing actionable ${name}`);
    }
    assert.ok(Number.isInteger(entry.order));
  }
  assert.equal(
    new Set(Object.values(exampleCurriculum).map((entry) => entry.objective)).size,
    examples.length,
    'different projects must teach a distinct objective',
  );
  assert.equal(getExampleLesson('not-a-project'), undefined);
  assert.equal(getExampleLesson('__proto__'), undefined);
});

test('prerequisites refer to earlier lessons and the learning graph has no cycles', () => {
  const visited = new Set<string>(),
    visiting = new Set<string>();
  function visit(id: string) {
    if (visited.has(id)) return;
    assert.ok(!visiting.has(id), `${id}: prerequisite cycle`);
    visiting.add(id);
    const entry = getExampleLesson(id)!;
    assert.equal(
      new Set(entry.prerequisites).size,
      entry.prerequisites.length,
      `${id}: duplicate prerequisite`,
    );
    for (const prerequisite of entry.prerequisites) {
      assert.ok(
        getExampleLesson(prerequisite),
        `${id}: prerequisite ${prerequisite} does not exist`,
      );
      assert.notEqual(prerequisite, id);
      assert.ok(
        compareCurriculumExamples({ id: prerequisite }, { id }) < 0,
        `${id}: prerequisite ${prerequisite} must appear earlier in learning order`,
      );
      visit(prerequisite);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const example of examples) visit(example.id);
  assert.equal(visited.size, examples.length);
});

test('novice path starts with direct connection, inversion and truth tables before state', () => {
  const ordered = [...examples].sort(compareCurriculumExamples);
  assert.deepEqual(
    ordered.slice(0, 3).map((example) => example.id),
    ['button', 'not', 'gates'],
  );
  assert.equal(getExampleLesson('button')!.level, 1);
  assert.equal(getExampleLesson('counter')!.level, 2);
  assert.equal(getExampleLesson('uart-rx')!.level, 3);
  assert.equal(getExampleLesson('alu')!.level, 4);
  assert.ok(compareCurriculumExamples({ id: 'half-adder' }, { id: 'full-adder' }) < 0);
  assert.ok(compareCurriculumExamples({ id: 'counter' }, { id: 'blink' }) < 0);
  assert.ok(compareCurriculumExamples({ id: 'small-rom' }, { id: 'fifo-four' }) < 0);
  assert.ok(compareCurriculumExamples({ id: 'alu' }, { id: 'unknown' }) < 0);
});

test('topics separate storage, timing, protocols and processing by their actual learning task', () => {
  const expected = {
    gates: 'gates',
    mux: 'routing',
    'full-adder': 'arithmetic',
    'hamming-syndrome': 'coding',
    shift: 'state',
    'button-debounce': 'clocks',
    traffic: 'fsm',
    'fifo-four': 'memory',
    'uart-tx': 'interfaces',
    'majority-filter': 'dsp',
    pwm: 'display',
    alu: 'architecture',
  };
  for (const [id, topic] of Object.entries(expected))
    assert.equal(getExampleLesson(id)!.topic, topic, id);
  assert.equal(new Set(curriculumTopics.map((topic) => topic.id)).size, 12);
  assert.equal(new Set(curriculumTopics.map((topic) => topic.title)).size, 12);
  assert.equal(new Set(Object.values(exampleCurriculum).map((entry) => entry.topic)).size, 12);
  assert.match(getExampleLesson('spi-loopback')!.experiment, /внутренний/);
  assert.match(getExampleLesson('i2c-pattern')!.experiment, /ACK здесь нет/);
  assert.match(getExampleLesson('async-toggle-sync')!.experiment, /один clk/);
});

test('broader application lessons cover real signal processing, raster, CPU and protocol observations', () => {
  const expected = {
    'moving-average': [3, 'dsp'],
    'fir-filter': [4, 'dsp'],
    'raster-scan': [3, 'display'],
    'dds-tone': [3, 'dsp'],
    'sigma-delta': [4, 'dsp'],
    'tiny-cpu': [4, 'architecture'],
    'stream-skid': [4, 'interfaces'],
    'protocol-checker': [3, 'architecture'],
  };
  for (const [id, [level, topic]] of Object.entries(expected)) {
    const entry = getExampleLesson(id)!;
    assert.equal(entry.level, level, id);
    assert.equal(entry.topic, topic, id);
    assert.ok(entry.prerequisites.length > 0, `${id}: applications build on earlier exercises`);
  }
  assert.match(getExampleLesson('raster-scan')!.experiment, /98 тактов/);
  assert.match(getExampleLesson('fir-filter')!.experiment, /32,0,−32/);
  assert.match(getExampleLesson('tiny-cpu')!.experiment, /halted/);
  assert.match(getExampleLesson('stream-skid')!.observe, /valid И ready/);
  assert.match(getExampleLesson('protocol-checker')!.experiment, /fault очищается только сбросом/);
});
