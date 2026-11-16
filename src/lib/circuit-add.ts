import type { Project } from '../../shared/types';
import { moduleDeclarations } from './verilog-modules';
import { t } from './i18n';

export type SchematicAdditionPlan = { ok: true; fileName: string } | { ok: false; reason: string };

/**
 * Можно ли добавить схему (.ysch) в проект, написанный на Verilog?
 * Схема превращается в модуль с именем верхнего модуля проекта в файле `<имя>.v`, а в проекте
 * допустима одна схема. Поэтому добавить её можно, только если ни файл, ни модуль не заняты.
 */
export function planSchematicAddition(project: Project): SchematicAdditionPlan {
  if (project.files.some((file) => file.name.endsWith('.ysch')))
    return { ok: false, reason: t('В проекте уже есть схема: допустим один файл .ysch.') };
  const generated = `${project.top}.v`;
  const clash = project.files.find((file) => file.name.toLowerCase() === generated.toLowerCase());
  if (clash)
    return {
      ok: false,
      reason: t(
        'В проекте уже есть файл {name}. Из схемы получился бы тот же {generated}, и сборка не станет его перезаписывать.',
        { name: clash.name, generated },
      ),
    };
  const declaring = project.files.find(
    (file) =>
      /\.(?:v|sv)$/.test(file.name) &&
      moduleDeclarations(file.content).some((item) => item.name === project.top),
  );
  if (declaring)
    return {
      ok: false,
      reason: t(
        'Верхний модуль «{top}» уже описан в {name}. Схема тоже создаёт модуль с этим именем, а подмодулей схема не поддерживает, поэтому у проекта получились бы два верхних модуля.',
        { top: project.top, name: declaring.name },
      ),
    };
  return { ok: true, fileName: `${project.top}.ysch` };
}
