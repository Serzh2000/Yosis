import type { Project } from '../../shared/types';
import {
  boardAssignments,
  type BoardAssignment,
  type CircuitDocument,
} from '../../shared/schematic';
import { applyPinEdit, assignedPins, readCst, type PlannerSignal } from './pin-planner';

export interface BoardSync {
  project: Project;
  /** Сообщения для ученика: что назначено автоматически и что не удалось. */
  messages: string[];
}
const cstName = (project: Project) =>
  project.files.find((file) => file.name.endsWith('.cst'))?.name ?? 'board.cst';

/** Удаляет все команды сигнала (IO_LOC, IO_PORT, CLOCK_LOC), остальной текст .cst не меняется. */
function removeSignal(project: Project, signal: string): Project {
  const directives = readCst(project).filter((value) => value.signal === signal);
  return {
    ...project,
    files: project.files.map((file) => {
      let content = file.content;
      for (const command of directives
        .filter((value) => value.file === file.name)
        .sort((a, b) => b.start - a.start)) {
        const lineStart = content.lastIndexOf('\n', command.start - 1) + 1,
          lineEnd = content.indexOf('\n', command.end),
          rest =
            content.slice(lineStart, command.start) +
            content.slice(command.end, lineEnd < 0 ? content.length : lineEnd);
        content = rest.trim()
          ? content.slice(0, command.start) + content.slice(command.end)
          : content.slice(0, lineStart) + content.slice(lineEnd < 0 ? content.length : lineEnd + 1);
      }
      return { ...file, content };
    }),
  };
}
/**
 * Приводит .cst в соответствие с платными терминалами схемы (кнопки, светодиоды, такт).
 * Назначения, которые ученик сделал для других портов, не трогаются.
 * `previous` — схема до изменения: убираем только то, что ставили сами, и только если вывод не менялся вручную.
 */
export function syncBoardConstraints(
  project: Project,
  previous: CircuitDocument | null,
  next: CircuitDocument,
): BoardSync {
  const wanted = boardAssignments(next),
    before = previous ? boardAssignments(previous) : [];
  const signals: PlannerSignal[] = next.nodes.flatMap((node) => {
    const assignments = boardAssignments({ ...next, nodes: [node] });
    return assignments.map((item) => ({ name: item.signal, direction: item.direction }));
  });
  const messages: string[] = [];
  let current = project;
  const file = cstName(project);
  const pinOf = (signal: string) =>
    assignedPins(
      readCst(current).filter((value) => value.kind === 'IO_LOC' && value.signal === signal),
    )[0];
  // 1. Снимаем назначения терминалов, которые удалены или переименованы (вместе с их IO_PORT).
  const keep = new Set(wanted.map((item) => item.signal));
  for (const old of before) {
    if (keep.has(old.signal) || pinOf(old.signal) !== old.pin) continue;
    current = removeSignal(current, old.signal);
  }
  // 2. Назначаем нужные выводы.
  for (const item of wanted as BoardAssignment[]) {
    if (pinOf(item.signal) === item.pin) continue;
    const holder = readCst(current).find(
      (value) =>
        value.kind === 'IO_LOC' &&
        value.signal !== item.signal &&
        assignedPins([value]).includes(item.pin),
    );
    if (holder && signals.some((signal) => signal.name === holder.signal)) {
      messages.push(
        `Вывод ${item.pin} уже занят портом ${holder.signal}. Для ${item.signal} назначение не добавлено.`,
      );
      continue;
    }
    try {
      if (holder)
        current = applyPinEdit(current, [{ name: holder.signal, direction: item.direction }], {
          signal: holder.signal,
          pin: null,
          file,
          pull: 'NONE',
        });
      current = applyPinEdit(current, signals, {
        signal: item.signal,
        pin: item.pin,
        file,
        pull: 'NONE',
      });
      messages.push(`${item.signal} → вывод ${item.pin}`);
    } catch (error) {
      messages.push(
        error instanceof Error ? error.message : `${item.signal}: назначение не удалось.`,
      );
    }
  }
  return { project: current, messages };
}
