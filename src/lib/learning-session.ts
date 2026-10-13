import type { Project } from '../../shared/types';
import { guidedLessons } from './learning-course';
import type { LessonVerdict } from './lessons';

export type LearningDrafts = Record<string, string>;

export function parseLearningDrafts(input: unknown): LearningDrafts {
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch {
      return {};
    }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const saved = input as Record<string, unknown>;
  return Object.fromEntries(
    guidedLessons
      .filter((lesson) => lesson.exercise)
      .flatMap((lesson) => {
        const code = saved[lesson.id];
        return typeof code === 'string' && code.length <= 100_000 && !code.includes('\0')
          ? [[lesson.id, code]]
          : [];
      }),
  );
}

export function learningProject(lessonId: string, drafts: LearningDrafts): Project | null {
  const exercise = guidedLessons.find((lesson) => lesson.id === lessonId)?.exercise;
  if (!exercise) return null;
  return {
    ...exercise.project,
    files: exercise.project.files.map((file, index) =>
      index === 0 ? { ...file, content: drafts[lessonId] ?? file.content } : { ...file },
    ),
  };
}

export function explainLearningFailure(message: string): string {
  if (/syntax error|unexpected|malformed/i.test(message))
    return 'Симулятор не смог прочитать запись. Проверь ; в конце присваивания, скобки и пары begin / end. Номер строки есть в сообщении ниже.';
  if (/unable to bind|not found|unknown identifier|not declared/i.test(message))
    return 'Похоже, имя сигнала не совпало с объявлением. Verilog различает большие и маленькие буквы: A и a — разные имена.';
  if (/timeout|timed out|слишком долго/i.test(message))
    return 'Проверка не завершилась вовремя. Посмотри, нет ли в схеме связи выхода обратно на себя без регистра.';
  if (/fetch|network|сервиса|503|502/i.test(message))
    return 'Сервис симуляции сейчас недоступен. Код сохранён; проверку можно повторить, когда соединение восстановится.';
  return 'Проверка остановилась до сравнения сигналов. Посмотри сообщение симулятора; сначала нужно получить корректную схему.';
}

export function explainLearningVerdicts(verdicts: LessonVerdict[], output: string): string {
  if (!verdicts.length)
    return 'Симулятор не вернул результаты проверок. Пока устройство не проверено.';
  const failed = verdicts.find((verdict) => !verdict.passed);
  if (!failed)
    return `Все проверки прошли: ${verdicts.length} из ${verdicts.length}. Твой ${output} соответствует заданию во всех проверенных ситуациях.`;
  if (failed.actual === 'нет сигнала')
    return `В симуляции не найден выход ${output} верхнего модуля. Проверь его имя и объявление output; имена и порты из заготовки нужно сохранить.`;
  if (/[xz?]/i.test(failed.actual))
    return `В проверке «${failed.title}» выход ${output} не определён. Проверь, что ему присваивается значение, а память получает сброс перед использованием.`;
  return `Первое расхождение: «${failed.title}». При ${Object.entries(failed.inputs)
    .map(([key, value]) => `${key} = ${value}`)
    .join(
      ', ',
    )} ожидается ${output} = ${failed.expected}, а получается ${failed.actual}. Найди в коде ветку, которая отвечает за этот случай.`;
}
