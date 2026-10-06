import type { Project, ProjectOrigin } from './types';
import { RequestError } from './errors';
import { parseCircuit } from './schematic';

const MAX_FILES = 40;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_PROJECT_BYTES = 2 * 1024 * 1024;
const RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

export function validateProject(value: unknown): Project {
  if (!value || typeof value !== 'object') throw new RequestError('Проект не передан.');
  const project = value as Record<string, unknown>;
  if (typeof project.name !== 'string' || !project.name.trim() || project.name.length > 100)
    throw new RequestError('Название проекта должно содержать от 1 до 100 символов.');
  if (typeof project.top !== 'string' || !/^[A-Za-z_][A-Za-z0-9_$]{0,127}$/.test(project.top))
    throw new RequestError('Укажите корректное имя верхнего модуля Verilog.');
  if (project.board !== 'tangnano20k')
    throw new RequestError('Поддерживается профиль Tang Nano 20K.');
  if (!Array.isArray(project.files) || project.files.length < 1 || project.files.length > MAX_FILES)
    throw new RequestError(`Проект должен содержать от 1 до ${MAX_FILES} файлов.`);
  const names = new Set<string>();
  let bytes = 0;
  let hasSource = false;
  const files = project.files.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new RequestError('Некорректный исходный файл.');
    const file = value as Record<string, unknown>;
    if (
      typeof file.name !== 'string' ||
      file.name.length > 160 ||
      !/^(?:[A-Za-z0-9_][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_][A-Za-z0-9_.-]*\.(?:v|sv|vh|svh|cst|sdc|ysch|hex|mem)$/.test(
        file.name,
      )
    )
      throw new RequestError(
        'Имена файлов: относительные пути из латинских букв, цифр, _, -, . и / с расширением .v, .sv, .vh, .svh, .cst, .sdc, .ysch, .hex или .mem.',
      );
    const components = file.name.split('/');
    if (
      components.length > 6 ||
      components.some((name) => RESERVED_NAME.test(name) || name.endsWith('.'))
    )
      throw new RequestError(`Недопустимое имя файла: ${file.name}.`);
    const nameKey = file.name.toLowerCase();
    if (names.has(nameKey)) throw new RequestError(`Имя файла повторяется: ${file.name}.`);
    if (
      [...names].some(
        (existing) => existing.startsWith(`${nameKey}/`) || nameKey.startsWith(`${existing}/`),
      )
    )
      throw new RequestError(`Путь ${file.name} используется одновременно как файл и папка.`);
    names.add(nameKey);
    if (typeof file.content !== 'string' || file.content.includes('\0'))
      throw new RequestError(`Файл ${file.name} должен содержать текст.`);
    const fileBytes = new TextEncoder().encode(file.content).length;
    if (fileBytes > MAX_FILE_BYTES)
      throw new RequestError(`Файл ${file.name} превышает 512 КБ.`, 413);
    bytes += fileBytes;
    if (/\.(v|sv|ysch)$/.test(file.name)) hasSource = true;
    if (file.name.endsWith('.ysch')) parseCircuit(file.content as string);
    return { name: file.name, content: file.content };
  });
  if (bytes > MAX_PROJECT_BYTES) throw new RequestError('Размер исходников превышает 2 МБ.', 413);
  if (!hasSource) throw new RequestError('Добавьте хотя бы один исходный файл .v, .sv или .ysch.');
  if (files.filter((file) => file.name.endsWith('.ysch')).length > 1)
    throw new RequestError('В первой версии допустим один файл .ysch на проект.');
  if (
    project.id !== undefined &&
    (typeof project.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.id))
  )
    throw new RequestError('Некорректный идентификатор проекта.');
  const origin = validateOrigin(project.origin);
  return {
    ...(project.id ? { id: project.id as string } : {}),
    name: project.name.trim(),
    top: project.top,
    board: 'tangnano20k',
    files,
    ...(origin ? { origin } : {}),
  };
}

/** Происхождение необязательно: повреждённое значение отбрасывается, а не отклоняет проект. */
function validateOrigin(value: unknown): ProjectOrigin | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const origin = value as Record<string, unknown>;
  const hash = /^[0-9a-f]{16}$/;
  if (
    typeof origin.exampleId !== 'string' ||
    !/^[a-z0-9][a-z0-9-]{0,63}$/.test(origin.exampleId) ||
    typeof origin.sourceHash !== 'string' ||
    !hash.test(origin.sourceHash) ||
    typeof origin.copyHash !== 'string' ||
    !hash.test(origin.copyHash)
  )
    return undefined;
  return {
    exampleId: origin.exampleId,
    sourceHash: origin.sourceHash,
    copyHash: origin.copyHash,
  };
}
