import { reservedWords } from '../../shared/verilog-identifiers';
import type { Project } from '../../shared/types';
import { examples } from './examples';
import { cloneProject, validateProject } from './projects';
import { markExampleOrigin } from './example-origin';
import { starterCircuit } from '../../shared/schematic';

export interface WizardSettings {
  start: string;
  name: string;
  top: string;
}
export interface WizardErrors {
  start?: string;
  name?: string;
  top?: string;
}

// A starting project with a board contract and a place for the pupil's own logic.
// These are the same verified package connections as in the example library.
const blankPins = [
  ['clk', 4, 'Генератор платы: 27 МГц.'],
  ['reset', 88, 'Кнопка S1 на выводе 88: нажата = 1, отпущена = 0.'],
  ...Array.from({ length: 6 }, (_, bit) => [
    `led_n[${bit}]`,
    15 + bit,
    `LED${bit}: 0 включает свет, 1 выключает.`,
  ]),
];
const blankProject: Project = {
  name: 'my-first-fpga',
  top: 'top',
  board: 'tangnano20k',
  files: [
    {
      name: 'top.v',
      content: `// Заготовка для своего устройства на Tang Nano 20K.
// Порты — договор между схемой и платой. Их выводы заданы в board.cst.
// clk: генератор 27 МГц; reset: кнопка сброса S1, нажата = 1.
// led_n[5:0]: шесть LED. Уровень 0 включает свет, 1 выключает.
// Начните с комбинационной связи assign или добавьте регистр с always.
module top (
    input wire clk,
    input wire reset,
    output wire [5:0] led_n
);
    // Пока своей логики нет, все LED выключены.
    // Например, assign led_n = {6{~reset}}; включит их при нажатии кнопки.
    assign led_n = 6'b111111;
endmodule
`,
    },
    {
      name: 'board.cst',
      content:
        `// Выводы своей схемы для Tang Nano 20K (GW2AR-LV18QN88C8/I7).
// Эти имена соответствуют портам заготовки top.v. Если измените порты, обновите .cst.
// IO_LOC указывает номер вывода корпуса FPGA, а не контакт разъёма платы.
// IO_PORT задаёт стандарт LVCMOS33: логические уровни 3,3 В.
// Каждый бит led_n имеет отдельное назначение физическому LED.
// Pinout: https://github.com/YosysHQ/apicula/blob/master/examples/tangnano20k.cst
// Плата: https://wiki.sipeed.com/hardware/en/tang/tang-nano-20k/nano-20k.html

` +
        blankPins
          .map(
            ([signal, pin, explanation]) => `// ${signal}: ${explanation}
IO_LOC "${signal}" ${pin};
IO_PORT "${signal}" IO_TYPE=LVCMOS33${pin === 88 ? ' PULL_MODE=DOWN' : ''};
${signal === 'clk' ? '// Глобальный буфер такта уменьшает разницу задержек между регистрами.\nCLOCK_LOC "clk" BUFG;\n' : ''}`,
          )
          .join('\n'),
    },
  ],
};

export const wizardStartingPoints = [
  {
    id: 'schematic',
    title: 'Конструктор логических элементов',
    description: 'Вход → NOT → LED. Соединяйте элементы без ручного Verilog.',
    project: {
      name: 'my-circuit',
      top: 'top',
      board: 'tangnano20k',
      files: [
        { name: 'top.ysch', content: JSON.stringify(starterCircuit(), null, 2) },
        {
          name: 'board.cst',
          content:
            '// Кнопка S1 нажата = 1. NOT превращает 1 в активный уровень LED.\nIO_LOC "button" 88;\nIO_PORT "button" IO_TYPE=LVCMOS33 PULL_MODE=DOWN;\n// LED0 светится при 0.\nIO_LOC "led_n" 15;\nIO_PORT "led_n" IO_TYPE=LVCMOS33;\n',
        },
      ],
    } as Project,
  },
  {
    id: 'blank',
    title: 'Своя схема',
    description: 'Заготовка с тактом, сбросом и шестью LED.',
    project: blankProject,
  },
  ...examples,
];

/** Keep source offsets so that only a real declaration, never an explanation, is renamed. */
function declarationLocations(source: string): Array<{ name: string; start: number }> {
  const masked = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\])*"/g, (token) =>
    token.replace(/[^\r\n]/g, ' '),
  );
  return [
    ...masked.matchAll(/\bmodule\s+(?:(?:automatic|static)\s+)?([A-Za-z_][A-Za-z0-9_$]*)/g),
  ].map((match) => ({ name: match[1], start: match.index! + match[0].lastIndexOf(match[1]) }));
}

export function validateWizardFields(
  settings: WizardSettings,
  existingNames: readonly string[] = [],
): WizardErrors {
  const errors: WizardErrors = {};
  const name = settings.name.trim(),
    top = settings.top.trim();
  const start = wizardStartingPoints.find((item) => item.id === settings.start);
  if (!start) errors.start = 'Выберите заготовку или встроенный пример.';
  if (!name || name.length > 100) errors.name = 'Введите название от 1 до 100 символов.';
  else if (
    existingNames.some(
      (existing) => existing.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
  )
    errors.name = `Проект «${name}» уже есть. Выберите другое название.`;
  if (!/^[A-Za-z_][A-Za-z0-9_$]{0,127}$/.test(top) || reservedWords.has(top)) {
    errors.top =
      'Используйте латинские буквы, цифры и _. Начните с буквы или _. Имя не должно быть словом Verilog.';
  } else if (
    start &&
    top !== start.project.top &&
    start.project.files.some(
      (file) =>
        /\.(?:v|sv)$/.test(file.name) &&
        declarationLocations(file.content).some((item) => item.name === top),
    )
  ) {
    errors.top = `Модуль «${top}» уже есть внутри примера. Выберите другое имя верхнего модуля.`;
  }
  return errors;
}

export function suggestWizardName(
  existingNames: readonly string[],
  base = 'my-first-fpga',
): string {
  const names = new Set(existingNames.map((name) => name.trim().toLocaleLowerCase()));
  const cleanBase = base.trim().slice(0, 96) || 'my-first-fpga';
  if (!names.has(cleanBase.toLocaleLowerCase())) return cleanBase;
  let suffix = 2;
  while (names.has(`${cleanBase}-${suffix}`.toLocaleLowerCase())) suffix++;
  return `${cleanBase}-${suffix}`;
}

export function createWizardProject(
  settings: WizardSettings,
  existingNames: readonly string[] = [],
): Project {
  const errors = validateWizardFields(settings, existingNames);
  const error = errors.start || errors.name || errors.top;
  if (error) throw new Error(error);
  const project = cloneProject(
    wizardStartingPoints.find((item) => item.id === settings.start)!.project,
  );
  const top = settings.top.trim();
  if (top !== project.top && !project.files.some((file) => file.name.endsWith('.ysch'))) {
    const declarations = project.files.flatMap((file, fileIndex) =>
      /\.(?:v|sv)$/.test(file.name)
        ? declarationLocations(file.content)
            .filter((item) => item.name === project.top)
            .map((item) => ({ ...item, fileIndex }))
        : [],
    );
    if (declarations.length !== 1)
      throw new Error('В заготовке должен быть один верхний модуль. Выберите другой пример.');
    const { fileIndex, start, name } = declarations[0];
    const file = project.files[fileIndex];
    file.content = file.content.slice(0, start) + top + file.content.slice(start + name.length);
  }
  project.name = settings.name.trim();
  project.top = top;
  const example = examples.find((item) => item.id === settings.start);
  return validateProject(example ? markExampleOrigin(project, example) : project);
}
