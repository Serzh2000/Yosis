import { starterCircuit } from '../../shared/schematic';
import type { WorkTab } from './studio-tabs';

/** Вкладка, в которой открывается файл: выводы, конструктор схем или код. */
export function workTabForFile(name: string): WorkTab {
  return name.endsWith('.cst') ? 'constraints' : name.endsWith('.ysch') ? 'design' : 'code';
}

/** Имя модуля для нового файла: последний сегмент пути без расширения, лишние символы -> «_». */
export function moduleNameForFile(name: string): string {
  return name
    .split('/')
    .at(-1)!
    .replace(/\.(v|sv)$/, '')
    .replace(/[^A-Za-z0-9_]/g, '_');
}

/** Содержимое нового файла по расширению. */
export function newFileContent(name: string): string {
  if (name.endsWith('.ysch')) return JSON.stringify(starterCircuit(), null, 2);
  if (name.endsWith('.cst'))
    return '// IO_LOC "port_name" номер_вывода_FPGA;\n// IO_PORT "port_name" IO_TYPE=LVCMOS33;\n';
  if (/\.(vh|svh)$/.test(name)) return '// Общие параметры и определения Verilog\n';
  return `module ${moduleNameForFile(name)} (\n    // Добавьте входы и выходы\n);\n\nendmodule\n`;
}

/** Можно ли удалить файл: в проекте остаётся хотя бы один файл и один исходник (.v, .sv, .ysch). */
export function canDeleteFile(
  files: readonly { name: string }[],
  target: { name: string },
): boolean {
  if (files.length <= 1) return false;
  const isSource = (name: string) => /\.(v|sv|ysch)$/.test(name);
  return !(isSource(target.name) && files.filter((file) => isSource(file.name)).length === 1);
}
