export interface ProjectFile {
  name: string;
  source: string;
}
export interface BuildDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
}
export function validateProjectFiles(input: unknown): ProjectFile[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 20)
    throw new Error('Допустимо до 20 дополнительных файлов.');
  const names = new Set(['sketch.ino', 'circuitlabruntime.cpp']);
  let total = 0;
  return input.map((file) => {
    if (
      !file ||
      typeof file.name !== 'string' ||
      !/^[a-z][a-z0-9_-]{0,63}\.(ino|h|hpp|c|cpp)$/i.test(file.name) ||
      names.has(file.name.toLowerCase()) ||
      file.name.toLowerCase().startsWith('circuitlab')
    )
      throw new Error('Недопустимое или повторное имя файла.');
    if (
      typeof file.source !== 'string' ||
      file.source.length > 100000 ||
      (total += file.source.length) > 200000
    )
      throw new Error('Дополнительные файлы превышают 200 КБ.');
    names.add(file.name.toLowerCase());
    return { name: file.name, source: file.source };
  });
}
