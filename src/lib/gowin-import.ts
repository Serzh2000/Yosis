import type { Project } from '../../shared/types';

/** One file of a folder the pupil picked: its path inside the folder and its text. */
export interface FolderFile {
  path: string;
  text: string;
}

/** What a project needs from a folder; everything else (bitstreams, reports) is left behind. */
export const IMPORTED_FILE = /\.(v|sv|vh|svh|cst|sdc|hex|mem|gprj|json)$/i;
const SOURCE = /\.(v|sv|vh|svh|cst|sdc|hex|mem)$/i;
const MAX_FILES = 40;

const withoutComments = (text: string) => text.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');

/**
 * The top module of a set of sources: a module nothing else instantiates. A library file may
 * leave several such modules; the one with the largest design under it is the top.
 */
export function guessTop(sources: string[]): string | undefined {
  const text = sources.map(withoutComments).join('\n');
  const bodies = new Map<string, string>();
  for (const match of text.matchAll(/\bmodule\s+([A-Za-z_]\w*)([\s\S]*?)\bendmodule\b/g))
    bodies.set(match[1], match[2]);
  const names = [...bodies.keys()];
  if (!names.length) return undefined;
  const children = new Map(
    names.map((name) => [
      name,
      names.filter(
        (other) =>
          other !== name &&
          new RegExp(`\\b${other}\\b\\s*(#\\s*\\(|[A-Za-z_]\\w*\\s*[(\\[])`).test(
            bodies.get(name)!,
          ),
      ),
    ]),
  );
  const used = new Set([...children.values()].flat());
  const roots = names.filter((name) => !used.has(name));
  const size = (name: string, seen = new Set<string>()): number => {
    if (seen.has(name)) return 0;
    seen.add(name);
    return 1 + children.get(name)!.reduce((sum, child) => sum + size(child, seen), 0);
  };
  return (roots.length ? roots : names).sort((a, b) => size(b) - size(a))[0];
}

/**
 * Turns a folder with a project of the vendor's IDE (Gowin EDA, a `.gprj` file) into a Yosis
 * project. The `.gprj` names the sources; memory images next to them come along too. A folder
 * without a `.gprj` is taken as it is: every Verilog and constraint file in it.
 */
export function projectFromFolder(files: FolderFile[], which?: string): Project {
  const normal = files.map((file) => ({ ...file, path: file.path.replace(/\\/g, '/') }));
  const gprj = which
    ? normal.find((file) => file.path === which)
    : normal
        .filter((file) => file.path.toLowerCase().endsWith('.gprj'))
        .sort((a, b) => a.path.split('/').length - b.path.split('/').length)[0];
  const base = gprj ? gprj.path.slice(0, gprj.path.lastIndexOf('/') + 1) : '';
  const inside = normal.filter((file) => file.path.startsWith(base) && SOURCE.test(file.path));
  let chosen = inside;
  if (gprj) {
    const listed = new Set(
      [...gprj.text.matchAll(/path="([^"]+)"/g)].map(
        (match) => base + match[1].replace(/\\/g, '/'),
      ),
    );
    chosen = inside.filter(
      (file) =>
        listed.has(file.path) ||
        // $readmemh loads these by name; the project file does not list them.
        (/\.(hex|mem)$/i.test(file.path) && !file.path.slice(base.length).startsWith('impl/')),
    );
  }
  if (!chosen.some((file) => /\.(v|sv)$/i.test(file.path)))
    throw new Error('В папке не нашлось файлов Verilog (.v или .sv).');
  // Paths stay as they are in the folder (src/…): the pupil sees the same tree as on disk.
  const prefix = base;
  const named = chosen.map((file) => ({
    name: file.path
      .slice(prefix.length)
      .split('/')
      .map((part) => part.replace(/[^A-Za-z0-9_.-]/g, '_').replace(/^[^A-Za-z0-9_]+/, '_'))
      .join('/'),
    content: file.text.replace(/^\uFEFF/, ''),
  }));
  if (named.length > MAX_FILES)
    throw new Error(
      `В проекте ${named.length} файлов, а Yosis принимает не больше ${MAX_FILES}. Уберите из папки лишнее.`,
    );
  const config = normal.find((file) => file.path === `${base}impl/project_process_config.json`);
  let top: string | undefined;
  try {
    top = (JSON.parse(config?.text ?? '{}') as { TopModule?: string }).TopModule || undefined;
  } catch {
    /* A damaged settings file: the top module is found from the sources. */
  }
  const sources = named.filter((file) => /\.(v|sv)$/i.test(file.name)).map((file) => file.content);
  const declared = new Set(
    [
      ...sources
        .map(withoutComments)
        .join('\n')
        .matchAll(/^\s*module\s+([A-Za-z_]\w*)/gm),
    ].map((match) => match[1]),
  );
  if (!top || !declared.has(top)) top = guessTop(sources);
  if (!top) throw new Error('В исходниках не найден ни один модуль Verilog.');
  const folder = (gprj?.path ?? normal[0]?.path ?? 'project').split('/');
  const name = (gprj ? folder[folder.length - 1].replace(/\.gprj$/i, '') : folder[0]) || 'project';
  // The file with the top module opens first, then the other sources, then the rest.
  const rank = (file: { name: string; content: string }) =>
    !/\.(v|sv)$/i.test(file.name)
      ? 2
      : new RegExp(`\\bmodule\\s+${top}\\b`).test(withoutComments(file.content))
        ? 0
        : 1;
  named.sort((a, b) => rank(a) - rank(b));
  return { name: name.slice(0, 100), top, board: 'tangnano20k', files: named };
}

/** Every vendor project in a picked folder: the pupil may have chosen a folder of several. */
export function gowinProjects(files: FolderFile[]): { path: string; title: string }[] {
  return files
    .map((file) => file.path.replace(/\\/g, '/'))
    .filter((path) => path.toLowerCase().endsWith('.gprj'))
    .sort()
    .map((path) => ({
      path,
      // The folder of the project tells more than the name of its file.
      title: path.split('/').slice(1, -1).join(' / ') || path.split('/').pop()!,
    }));
}
