import test from 'node:test';
import assert from 'node:assert/strict';
import {
  answerCourseQuiz,
  advanceCourseStep,
  canAdvanceCourseStep,
  courseLevels,
  createCourseProgress,
  getCourseLessonState,
  getCourseStep,
  guidedLessons,
  invalidateCourseExercise,
  isCourseExerciseCurrent,
  isCourseLessonUnlocked,
  parseCourseProgress,
  previousCourseStep,
  recordCourseExerciseResult,
  resetCourseLesson,
  revealCourseHint,
  selectCourseLesson,
  type CourseProgress,
} from '../src/lib/learning-course';
import type { LessonVerdict } from '../src/lib/lessons';
import { beginnerExercises, beginnerLessons } from '../src/lib/beginner-course';
import { validateProject, validateSimulationConfig } from '../server/validation';

const hash = 'ab'.repeat(32);
function verdicts(id: string): LessonVerdict[] {
  return guidedLessons
    .find((lesson) => lesson.id === id)!
    .exercise!.cases.map((item) => ({ ...item, actual: item.expected, passed: true }));
}
function finishLesson(progress: CourseProgress, id: string): CourseProgress {
  progress = selectCourseLesson(progress, id);
  for (const step of guidedLessons.find((lesson) => lesson.id === id)!.steps) {
    assert.equal(getCourseStep(progress).id, step.id);
    if (step.quiz)
      progress = answerCourseQuiz(progress, id, step.id, step.quiz.correctOptionId).progress;
    if (step.kind === 'practice')
      progress = recordCourseExerciseResult(progress, id, verdicts(id), hash);
    progress = advanceCourseStep(progress);
  }
  assert.equal(getCourseLessonState(progress, id).completed, true);
  return progress;
}

/** The beginner strand comes first; the older labs start after it is finished. */
function atCore(): CourseProgress {
  let progress = createCourseProgress();
  for (const lesson of beginnerLessons) progress = finishLesson(progress, lesson.id);
  return progress;
}

test('guided course contains the beginner strand, an orientation and ten independent practical laboratories across six levels', () => {
  assert.equal(courseLevels.length, 6);
  assert.equal(guidedLessons.length, 11 + beginnerLessons.length);
  assert.equal(
    guidedLessons.filter((lesson) => lesson.exercise).length,
    10 + beginnerExercises.length,
  );
  assert.equal(new Set(guidedLessons.map((lesson) => lesson.id)).size, guidedLessons.length);
  for (const lesson of guidedLessons) {
    assert.ok(courseLevels.some((level) => level.id === lesson.levelId));
    assert.equal(new Set(lesson.steps.map((step) => step.id)).size, lesson.steps.length);
    assert.ok(lesson.steps.some((step) => step.quiz));
    for (const step of lesson.steps.filter((step) => step.quiz)) {
      assert.ok(step.quiz!.options.some((option) => option.id === step.quiz!.correctOptionId));
      assert.equal(
        new Set(step.quiz!.options.map((option) => option.feedback)).size,
        step.quiz!.options.length,
      );
    }
    if (lesson.exercise) {
      assert.equal(lesson.steps.at(-1)!.kind, 'practice');
      assert.equal(lesson.hints.length, 3);
      assert.ok(lesson.exercise.cases.length >= 2);
      assert.deepEqual(validateProject(lesson.exercise.project), lesson.exercise.project);
      assert.equal(
        JSON.stringify(validateSimulationConfig(lesson.exercise.config)),
        JSON.stringify(lesson.exercise.config),
      );
      assert.match(lesson.exercise.project.files[0].content, /Учебная лаборатория/);
    }
  }
  assert.ok(
    guidedLessons
      .find((lesson) => lesson.id === 'welcome')!
      .steps.some((step) => step.id === 'bit-quiz'),
  );
  assert.equal(
    guidedLessons[0].id,
    beginnerLessons[0].id,
    'the course starts with the beginner strand',
  );
});

test('wrong quiz answer gives its own explanation and cannot advance or complete the lesson', () => {
  let progress = selectCourseLesson(atCore(), 'welcome');
  for (let index = 0; index < 3; index++) progress = advanceCourseStep(progress);
  assert.equal(getCourseStep(progress).id, 'hardware-quiz');
  const wrong = answerCourseQuiz(progress, 'welcome', 'hardware-quiz', '1');
  assert.equal(wrong.correct, false);
  assert.match(wrong.feedback, /обычных программ/);
  assert.equal(canAdvanceCourseStep(wrong.progress), false);
  assert.throws(() => advanceCourseStep(wrong.progress), /Пройдите/);
  assert.equal(isCourseLessonUnlocked(wrong.progress, 'ports'), false);
  const right = answerCourseQuiz(wrong.progress, 'welcome', 'hardware-quiz', '0');
  assert.equal(right.correct, true);
  assert.equal(canAdvanceCourseStep(right.progress), true);
  assert.throws(() => answerCourseQuiz(right.progress, 'welcome', 'bit-quiz', '0'), /текущему/);
});

test('completion needs every quiz and a complete successful VCD verdict rather than next button alone', () => {
  let progress = finishLesson(atCore(), 'welcome');
  assert.equal(isCourseLessonUnlocked(progress, 'ports'), true);
  assert.equal(isCourseLessonUnlocked(progress, 'not'), false);
  assert.throws(() => selectCourseLesson(progress, 'not'), /предыдущий/);
  progress = selectCourseLesson(progress, 'ports');
  progress = advanceCourseStep(progress);
  progress = advanceCourseStep(progress);
  progress = answerCourseQuiz(progress, 'ports', 'port-quiz', '0').progress;
  progress = advanceCourseStep(progress);
  assert.equal(getCourseStep(progress).kind, 'practice');
  assert.equal(canAdvanceCourseStep(progress), false);
  const complete = verdicts('ports');
  assert.equal(
    canAdvanceCourseStep(recordCourseExerciseResult(progress, 'ports', complete.slice(0, 1), hash)),
    false,
  );
  assert.equal(
    canAdvanceCourseStep(
      recordCourseExerciseResult(
        progress,
        'ports',
        [{ ...complete[0], passed: false }, complete[1]],
        hash,
      ),
    ),
    false,
  );
  assert.equal(
    canAdvanceCourseStep(
      recordCourseExerciseResult(
        progress,
        'ports',
        [{ ...complete[0], actual: '1' }, complete[1]],
        hash,
      ),
    ),
    false,
  );
  assert.equal(
    canAdvanceCourseStep(
      recordCourseExerciseResult(progress, 'ports', [...complete].reverse(), hash),
    ),
    false,
  );
  assert.throws(
    () => recordCourseExerciseResult(progress, 'ports', complete, 'unbound'),
    /симуляции/,
  );
  progress = recordCourseExerciseResult(progress, 'ports', complete, hash);
  assert.equal(getCourseLessonState(progress, 'ports').completed, false);
  assert.equal(isCourseExerciseCurrent(progress, 'ports', hash), true);
  assert.equal(isCourseExerciseCurrent(progress, 'ports', 'cd'.repeat(32)), false);
  progress = advanceCourseStep(progress);
  assert.equal(getCourseLessonState(progress, 'ports').completed, true);
  assert.equal(isCourseLessonUnlocked(progress, 'not'), true);
  progress = invalidateCourseExercise(progress, 'ports');
  assert.equal(canAdvanceCourseStep(progress), false);
  assert.equal(isCourseLessonUnlocked(progress, 'not'), false);
});

test('review, progressive hints, reset and full course completion preserve explicit user control', () => {
  let progress = createCourseProgress();
  for (const lesson of guidedLessons) progress = finishLesson(progress, lesson.id);
  assert.equal(
    guidedLessons.every((lesson) => getCourseLessonState(progress, lesson.id).completed),
    true,
  );
  const saved = structuredClone(progress);
  progress = selectCourseLesson(progress, 'and');
  progress = previousCourseStep(progress);
  assert.equal(getCourseStep(progress).id, 'and-quiz');
  for (let index = 0; index < 7; index++) progress = revealCourseHint(progress);
  assert.equal(getCourseLessonState(progress, 'and').hintsShown, 3);
  assert.equal(saved.lessons.and.hintsShown, 0, 'helpers do not mutate previous state');
  assert.deepEqual(parseCourseProgress(JSON.stringify(progress)), progress);
  progress = resetCourseLesson(progress, 'and');
  assert.equal(progress.activeLessonId, 'and');
  assert.equal(progress.lessons.not.completed, true);
  assert.equal(progress.lessons.and.completed, false);
  assert.equal(progress.lessons['traffic-fsm'].completed, false);
  assert.throws(() => resetCourseLesson(progress, 'traffic-fsm'), /предыдущий/);
});

test('local storage rejects unknown lesson IDs, unsupported versions, invented results and impossible step skips', () => {
  for (const value of [null, [], 'bad json', { version: 2, lessons: {} }])
    assert.deepEqual(parseCourseProgress(value), createCourseProgress());
  const fresh = atCore();
  const fake = structuredClone(fresh);
  fake.activeLessonId = 'mystery';
  fake.lessons.mystery = { ...fake.lessons.welcome, completed: true };
  fake.lessons.welcome = {
    ...fake.lessons.welcome,
    stepId: 'workflow',
    completed: true,
    passedQuizIds: ['hardware-quiz', 'bit-quiz', 'invented'],
    answers: { 'hardware-quiz': '1', 'bit-quiz': 'invalid' },
    hintsShown: -5,
  };
  fake.lessons.ports = {
    ...fake.lessons.ports,
    completed: true,
    stepId: 'practice',
    exercise: { passed: true, projectHash: hash },
  };
  const parsed = parseCourseProgress(fake);
  assert.equal(parsed.activeLessonId, guidedLessons[0].id);
  assert.equal(parsed.lessons.mystery, undefined);
  assert.equal(parsed.lessons.welcome.completed, false);
  assert.equal(parsed.lessons.welcome.stepId, 'hardware-quiz');
  assert.deepEqual(parsed.lessons.welcome.passedQuizIds, []);
  assert.equal(parsed.lessons.welcome.answers['hardware-quiz'], '1');
  assert.equal(parsed.lessons.welcome.hintsShown, 0);
  assert.deepEqual(parsed.lessons.ports, fresh.lessons.ports);
  const invalidStep = structuredClone(fresh);
  invalidStep.lessons.welcome.stepId = 'removed-step';
  assert.deepEqual(parseCourseProgress(invalidStep), fresh);
});

test('course verifiers exhaust combinational values and include memory reset, paused changed inputs and full FSM cycles', () => {
  assert.equal(guidedLessons.find((lesson) => lesson.id === 'buses')!.exercise!.cases.length, 16);
  assert.deepEqual(
    guidedLessons
      .find((lesson) => lesson.id === 'xor')!
      .exercise!.cases.map((item) => item.expected),
    ['0', '1', '1', '0'],
  );
  const register = guidedLessons.find((lesson) => lesson.id === 'register')!.exercise!;
  assert.equal(register.config.resetCycles, 2);
  assert.equal(register.cases[0].inputs.data, '1');
  assert.equal(register.cases[0].expected, '0');
  assert.deepEqual(
    register.cases.slice(2).map((item) => item.expected),
    ['1', '1', '1', '0', '0', '1'],
  );
  assert.equal(register.cases[3].inputs.data, '0');
  assert.equal(register.cases[3].inputs.enable, '0');
  const fsm = guidedLessons.find((lesson) => lesson.id === 'traffic-fsm')!.exercise!;
  assert.deepEqual(
    fsm.cases.map((item) => item.expected),
    ['001', '001', '100', '010', '010', '010', '001', '100', '010', '001'],
  );
  assert.match(
    guidedLessons
      .find((lesson) => lesson.id === 'ports')!
      .exercise!.project.files.find((file) => file.name.endsWith('.cst'))!.content,
    /IO_LOC "button" 88/,
  );
});
