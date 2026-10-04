import { validateProject } from '../../shared/project-validation';
import type { Project, YosysNetlist } from '../../shared/types';
import { boardPorts, portBitName } from './virtual-board';
import packageData from './tangnano20k-pins.json';

export interface PlannerSignal {
  name: string;
  direction: 'input' | 'output' | 'inout';
}
export interface PackagePin {
  number: number;
  io?: string;
  bank?: number;
  functions: string[];
  label: string;
  reserved: boolean;
  direction?: 'input' | 'output';
}
const labels: Record<number, string> = {
  4: 'Генератор 27 МГц',
  5: 'JTAG TMS',
  6: 'JTAG TCK',
  7: 'JTAG TDI',
  8: 'JTAG TDO',
  9: 'RECONFIG_N',
  59: 'Flash CLK',
  60: 'Flash CS',
  61: 'Flash MOSI',
  62: 'Flash MISO',
  69: 'UART TX → BL616',
  70: 'UART RX ← BL616',
  87: 'Кнопка S2 · нажата = 1',
  88: 'Кнопка S1 · нажата = 1',
};
const reserved = new Set([5, 6, 7, 8, 9, 59, 60, 61, 62]);
export const packagePins: PackagePin[] = Array.from({ length: 88 }, (_, index) => {
  const number = index + 1,
    pin = packageData.pins.find((value) => value.number === number);
  return {
    number,
    io: pin?.io,
    bank: pin?.bank,
    functions: pin?.functions ?? [],
    label:
      labels[number] ??
      (number >= 15 && number <= 20
        ? `LED${number - 15} · светится при 0`
        : pin
          ? 'I/O · сверяйте подключение со схемой платы'
          : 'Питание, земля или служебный контакт'),
    reserved: !pin || reserved.has(number),
    ...([4, 70, 87, 88].includes(number)
      ? { direction: 'input' as const }
      : [15, 16, 17, 18, 19, 20, 69].includes(number)
        ? { direction: 'output' as const }
        : {}),
  };
});

export function plannerSignals(project: Project, rtl?: YosysNetlist): PlannerSignal[] {
  const ports = boardPorts(project, rtl);
  if (ports.reduce((sum, port) => sum + port.width, 0) > 4096)
    throw new Error('Верхний модуль содержит больше 4096 бит портов.');
  return ports.flatMap((port) =>
    Array.from({ length: port.width }, (_, bit) => ({
      name: portBitName(port, bit),
      direction: port.direction,
    })),
  );
}

/** CST changes don't change the ports; HDL edits must be analysed again. */
export function hasSameHdlSources(project: Project, snapshot: string): boolean {
  try {
    const previous = JSON.parse(snapshot) as Project;
    const hdl = (value: Project) =>
      value.files
        .filter((file) => !file.name.endsWith('.cst'))
        .map((file) => [file.name, file.content]);
    return (
      previous.top === project.top &&
      previous.board === project.board &&
      JSON.stringify(hdl(previous)) === JSON.stringify(hdl(project))
    );
  } catch {
    return false;
  }
}

export interface CstDirective {
  kind: 'IO_LOC' | 'IO_PORT' | 'CLOCK_LOC';
  signal: string;
  value: string;
  file: string;
  line: number;
  start: number;
  end: number;
}
/** Mask comments without changing offsets, including comments between command tokens. */
export function readCst(project: Project): CstDirective[] {
  return project.files
    .filter((file) => file.name.endsWith('.cst'))
    .flatMap((file) => {
      const source = file.content.replace(
        /"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g,
        (token) => (token.startsWith('"') ? token : token.replace(/[^\r\n]/g, ' ')),
      );
      return [...source.matchAll(/\b(IO_LOC|IO_PORT|CLOCK_LOC)\s+"([^"\r\n]+)"\s+([^;]+);/gi)].map(
        (match) => ({
          kind: match[1].toUpperCase() as CstDirective['kind'],
          signal: match[2],
          value: match[3].trim(),
          file: file.name,
          line: file.content.slice(0, match.index).split('\n').length,
          start: match.index,
          end: match.index + match[0].length,
        }),
      );
    });
}

export function assignedPins(directives: CstDirective[]): number[] {
  return directives
    .filter((value) => value.kind === 'IO_LOC')
    .flatMap((value) =>
      value.value
        .split(',')
        .map((pin) => Number(pin.trim()))
        .filter(Number.isInteger),
    );
}
export function pinCompatibility(signal: PlannerSignal, pin: PackagePin): string | null {
  if (pin.reserved)
    return `Вывод ${pin.number} занят питанием, конфигурацией или программатором платы.`;
  if (pin.direction && pin.direction !== signal.direction)
    return `Вывод ${pin.number}: ${pin.label}. Здесь нужен ${pin.direction === 'input' ? 'вход' : 'выход'} схемы.`;
  return null;
}

export interface PinEdit {
  signal: string;
  pin: number | null;
  file: string;
  pull: 'NONE' | 'UP' | 'DOWN';
}
function properties(directives: CstDirective[], signal: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const directive of directives.filter(
    (value) => value.kind === 'IO_PORT' && value.signal === signal,
  )) {
    const matches = [...directive.value.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^\s]+)/g)];
    if (
      !matches.length ||
      directive.value.replace(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^\s]+)/g, '').trim()
    )
      throw new Error(
        `Не удалось разобрать свойства ${signal}. Исправьте IO_PORT в текстовом редакторе.`,
      );
    for (const match of matches) {
      const key = match[1].toUpperCase();
      if (result.has(key) && result.get(key) !== match[2])
        throw new Error(`Для ${signal} заданы противоречивые свойства ${key} в .cst.`);
      result.set(key, match[2]);
    }
  }
  return result;
}
export function readPinProperties(
  directives: CstDirective[],
  signal: string,
): Record<string, string> {
  try {
    return Object.fromEntries(properties(directives, signal));
  } catch {
    return {};
  }
}

/** Patch only this signal's commands; all other constraints and comments survive. */
export function applyPinEdit(project: Project, signals: PlannerSignal[], edit: PinEdit): Project {
  const signal = signals.find((value) => value.name === edit.signal);
  if (!signal) throw new Error('Сигнал отсутствует в свежем верхнем модуле. Обновите порты.');
  if (/["\r\n\\]/.test(edit.signal))
    throw new Error('Это имя порта требует ручного назначения в .cst.');
  if (!/\.cst$/i.test(edit.file)) throw new Error('Выберите файл .cst.');
  if (!['NONE', 'UP', 'DOWN'].includes(edit.pull)) throw new Error('Неизвестная подтяжка.');
  const directives = readCst(project);
  if (edit.pin !== null) {
    const pin = packagePins.find((value) => value.number === edit.pin);
    if (!pin) throw new Error('Такого вывода нет у QN88.');
    const incompatible = pinCompatibility(signal, pin);
    if (incompatible) throw new Error(incompatible);
    const occupied = directives.find(
      (value) =>
        value.kind === 'IO_LOC' &&
        value.signal !== edit.signal &&
        assignedPins([value]).includes(edit.pin!),
    );
    if (occupied)
      throw new Error(
        `Вывод ${edit.pin} уже назначен сигналу ${occupied.signal} (${occupied.file}:${occupied.line}).`,
      );
  }
  const attributes = properties(directives, edit.signal);
  if (attributes.has('IO_TYPE') && !/^LVCMOS33$/i.test(attributes.get('IO_TYPE')!))
    throw new Error(
      'Дифференциальные и другие стандарты редактируйте в тексте .cst. Планировщик поддерживает LVCMOS33.',
    );
  // Never turn an existing pair assignment into a single pin silently.
  if (
    directives.some(
      (value) =>
        value.kind === 'IO_LOC' && value.signal === edit.signal && !/^\d+$/.test(value.value),
    )
  )
    throw new Error('Парное или символьное назначение редактируйте в тексте .cst.');
  attributes.set('IO_TYPE', 'LVCMOS33');
  attributes.set('PULL_MODE', edit.pull);
  const replaceKinds = edit.pin === null ? ['IO_LOC'] : ['IO_LOC', 'IO_PORT'];
  const files = project.files.map((file) => {
    let content = file.content;
    for (const command of directives
      .filter(
        (value) =>
          value.file === file.name &&
          value.signal === edit.signal &&
          replaceKinds.includes(value.kind),
      )
      .sort((a, b) => b.start - a.start)) {
      const segment = content.slice(command.start, command.end);
      const comments = [...segment.matchAll(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g)]
        .map((match) => match[0])
        .join('\n');
      let start = command.start,
        end = command.end;
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = content.indexOf('\n', end);
      const remaining =
        content.slice(lineStart, start) +
        content.slice(end, lineEnd < 0 ? content.length : lineEnd);
      if (!comments && !remaining.trim()) {
        start = lineStart;
        end = lineEnd < 0 ? content.length : lineEnd + 1;
      }
      content = content.slice(0, start) + comments + content.slice(end);
    }
    return { ...file, content };
  });
  if (edit.pin !== null) {
    let file = files.find((value) => value.name === edit.file);
    if (!file) {
      file = {
        name: edit.file,
        content: '// Назначения Tang Nano 20K: номера выводов корпуса QN88.\n',
      };
      files.push(file);
    }
    const clock =
      edit.pin === 4 &&
      signal.direction === 'input' &&
      !directives.some((value) => value.kind === 'CLOCK_LOC' && value.signal === edit.signal)
        ? `CLOCK_LOC "${edit.signal}" BUFG;\n`
        : '';
    file.content += `${file.content.endsWith('\n') ? '' : '\n'}IO_LOC "${edit.signal}" ${edit.pin};\nIO_PORT "${edit.signal}" ${[...attributes].map(([key, value]) => `${key}=${value}`).join(' ')};\n${clock}`;
  }
  return validateProject({ ...project, files });
}

export function plannerIssues(project: Project, signals: PlannerSignal[]): string[] {
  const directives = readCst(project).filter((value) => value.kind === 'IO_LOC'),
    seenSignals = new Set<string>(),
    usedPins = new Map<number, string>(),
    issues: string[] = [];
  for (const assignment of directives) {
    if (seenSignals.has(assignment.signal)) issues.push(`${assignment.signal}: несколько IO_LOC.`);
    seenSignals.add(assignment.signal);
    const signal = signals.find((value) => value.name === assignment.signal);
    if (!signal) issues.push(`${assignment.signal}: нет такого порта в верхнем модуле.`);
    const pins = assignedPins([assignment]);
    if (!pins.length)
      issues.push(`${assignment.signal}: символьное назначение, проверяйте в .cst.`);
    for (const number of pins) {
      if (usedPins.has(number))
        issues.push(`Вывод ${number}: конфликт ${usedPins.get(number)} и ${assignment.signal}.`);
      usedPins.set(number, assignment.signal);
      const pin = packagePins.find((value) => value.number === number);
      if (!pin) issues.push(`${assignment.signal}: вывод ${number} вне корпуса QN88.`);
      else if (signal) {
        const error = pinCompatibility(signal, pin);
        if (error) issues.push(`${assignment.signal}: ${error}`);
      }
    }
  }
  return issues;
}

export function pinPosition(number: number): {
  x: number;
  y: number;
  side: 'left' | 'bottom' | 'right' | 'top';
} {
  const side = Math.floor((number - 1) / 22),
    index = (number - 1) % 22,
    p = 153 + index * 19;
  return side === 0
    ? { x: 115, y: p, side: 'left' }
    : side === 1
      ? { x: p, y: 585, side: 'bottom' }
      : side === 2
        ? { x: 585, y: 552 - index * 19, side: 'right' }
        : { x: 552 - index * 19, y: 115, side: 'top' };
}
