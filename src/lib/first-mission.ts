import type { Project, SimulationConfig } from '../../shared/types';
import type { Lesson } from './lessons';

export type MissionTab = 'code' | 'rtl' | 'constraints' | 'simulation' | 'chip' | 'board';
export const missionSteps: Array<{
  id: string;
  title: string;
  text: string;
  task: string;
  target: string;
  tab?: MissionTab;
}> = [
  {
    id: 'brief',
    title: 'Первая миссия: сигнальный маяк',
    text: 'Ты в мастерской цифровых устройств. Verilog описывает схему, Yosys собирает логику, а файл CST связывает её с контактами платы. Наставник покажет каждый шаг в настоящей IDE.',
    task: 'Соберём маяк: две группы по три LED меняются каждые полсекунды. Текущий проект сохранится; для миссии создадим отдельный.',
    target: '[data-tour="new-project"]',
  },
  {
    id: 'code',
    title: 'Твой первый приказ схеме',
    text: "В top.v уже есть тактовый делитель. phase выбирает одну из двух групп. 6'b101010 — шесть битов в двоичной записи; 0 включает физический LED. assign непрерывно соединяет выход с выражением.",
    task: "В последней строке assign замени 6'b111111 на 6'b101010. Остальные строки пока оставь. Это не команда процессору: ты описываешь провод и переключатель.",
    target: '[data-tour="editor"]',
    tab: 'code',
  },
  {
    id: 'simulate',
    title: 'Проверь маяк до подключения',
    text: 'Железо дорого чинить, поэтому сначала проверяем поведение. Для короткого опыта наставник ставит HALF_PERIOD = 4 в отдельной копии для симуляции. В твоём проекте для платы остаётся 13 500 000 тактов.',
    task: 'Запусти проверку в карточке миссии. Ожидаем 101010, затем 010101, затем снова 101010. Ошибка покажет первый расходящийся момент.',
    target: '[data-tour="mission-check"]',
    tab: 'simulation',
  },
  {
    id: 'synthesize',
    title: 'Преврати описание в схему',
    text: 'Синтез ищет регистры, счётчик и мультиплексор в твоём Verilog. На RTL увидишь эти операции, а Gowin покажет, как они превратились в LUT и триггеры.',
    task: 'Нажми подсвеченную кнопку «Синтезировать» в шапке. Дождись успешной сборки текущего кода.',
    target: '[data-tour="synthesize"]',
    tab: 'code',
  },
  {
    id: 'rtl',
    title: 'Загляни внутрь устройства',
    text: 'Здесь видно, какую схему ты описал. Регистр хранит состояние, сумматор увеличивает счётчик, мультиплексор выбирает группу LED. Нажатие на элемент показывает его входы и параметры.',
    task: 'Открой RTL и выбери любой элемент на схеме. В инспекторе можно нажать на название примитива для объяснения.',
    target: '[data-tour="tab-rtl"]',
    tab: 'rtl',
  },
  {
    id: 'pins',
    title: 'Провода получают адреса',
    text: 'CST назначает clk на вывод 4 и led_n[0…5] на выводы 15…20. IO_TYPE=LVCMOS33 задаёт электрический стандарт 3,3 В. Номера здесь относятся к ножкам FPGA.',
    task: 'Открой «Выводы .cst», найди назначение led_n[0] и ответь: какой уровень включает LED Tang Nano 20K?',
    target: '[data-tour="tab-constraints"]',
    tab: 'constraints',
  },
  {
    id: 'place',
    title: 'Размести схему на кристалле',
    text: 'nextpnr выбирает реальные ячейки и прокладывает соединения с учётом CST. Apicula упаковывает результат в битстрим .fs. Карта показывает занятость ресурсов и связей.',
    task: 'Открой «Кристалл» и нажми «Разместить». После успешной сборки появятся карта и битстрим этого проекта.',
    target: '[data-tour="place"]',
    tab: 'chip',
  },
  {
    id: 'connect',
    title: 'Познакомь браузер с платой',
    text: 'Подключи Tang Nano 20K и открой «Подключение». Выбор USB даёт странице доступ только к выбранному устройству. Перед записью прочитаем ID FPGA. UART-порт для сообщений — отдельное подключение.',
    task: 'Нажми «Выбрать USB-плату». Если штатный FTDI недоступен, в панели есть вход UPDATE/BOOT и проверка ROM через Web Serial. Установка DirtyJTAG ещё готовится.',
    target: '[data-tour="connect"]',
    tab: 'board',
  },
  {
    id: 'program',
    title: 'Загрузи собственное устройство',
    text: 'Выбери «Сборка проекта», затем «Загрузить в SRAM». SRAM-конфигурация работает до отключения питания; после него плата вернётся к программе из flash.',
    task: 'Дождись подтверждения конфигурации FPGA. Засчитаем только загрузку битстрима этой миссии, собранного из текущих файлов.',
    target: '[data-tour="program"]',
    tab: 'board',
  },
  {
    id: 'observe',
    title: 'Проверь устройство глазами',
    text: 'Протокол подтвердил загрузку, теперь проверяем результат на самой плате. Две группы по три ярких LED должны меняться примерно раз в полсекунды.',
    task: 'Посмотри на шесть пользовательских LED и отметь результат. Если поведение отличается, вернись к подключению и журналу; миссия пока не завершена.',
    target: '[data-tour="program"]',
    tab: 'board',
  },
  {
    id: 'complete',
    title: 'Первое устройство готово',
    text: 'Ты прошёл путь от Verilog до работающей FPGA: описание, симуляция, RTL, физические выводы, размещение и загрузка.',
    task: 'Теперь начинай курс Verilog: входы и выходы, логика, шины, мультиплексор, регистры, счётчик и автомат. В каждом уроке есть задача, подсказки и настоящая проверка.',
    target: '[data-tour="tab-lessons"]',
  },
];

const source = `// Миссия 1: маяк Tang Nano 20K. Генератор платы — 27 МГц.
// Измени только вторую группу в assign. 0 включает физический LED.
module top #(parameter integer HALF_PERIOD = 13_500_000)(
    input wire clk,
    output wire [5:0] led_n
);
    reg [23:0] divider = 0;
    reg phase = 0;
    always @(posedge clk) begin
        if (divider == HALF_PERIOD - 1) begin
            divider <= 0;
            phase <= ~phase;
        end else divider <= divider + 1'b1;
    end
    // phase ? группа_1 : группа_0; ровно три LED в каждой группе.
    assign led_n = phase ? 6'b010101 : 6'b111111; // TODO: исправь группу_0
endmodule
`;
const cst =
  '// Tang Nano 20K: штатный генератор и шесть LED, внешние провода не нужны.\n' +
  'IO_LOC "clk" 4;\nIO_PORT "clk" PULL_MODE=UP IO_TYPE=LVCMOS33;\n' +
  Array.from(
    { length: 6 },
    (_, bit) =>
      `// LED${bit}: низкий уровень включает свет.\nIO_LOC "led_n[${bit}]" ${15 + bit};\nIO_PORT "led_n[${bit}]" PULL_MODE=UP DRIVE=8 IO_TYPE=LVCMOS33;\n`,
  ).join('');

export function createMissionProject(existingNames: string[]): Project {
  const base = 'mission-beacon';
  let name = base,
    suffix = 2;
  while (existingNames.includes(name)) name = `${base}-${suffix++}`;
  return {
    name,
    top: 'top',
    board: 'tangnano20k',
    files: [
      { name: 'top.v', content: source },
      { name: 'board.cst', content: cst },
    ],
  };
}
export const missionConfig: SimulationConfig = {
  clock: 'clk',
  reset: null,
  resetActiveLow: false,
  resetCycles: 0,
  cycles: 14,
  periodNs: 10,
  inputs: {},
};
export const missionExercise: Pick<Lesson, 'output' | 'cases' | 'config'> = {
  config: missionConfig,
  output: 'led_n',
  cases: [0, 2, 3, 6, 7, 10, 11, 13].map((cycle) => ({
    title: `Такт ${cycle}: группа ${Math.floor((cycle + 1) / 4) % 2}`,
    cycle,
    inputs: {},
    expected: Math.floor((cycle + 1) / 4) % 2 ? '010101' : '101010',
  })),
};
/** Keep the real board's timing intact; only the simulator's clone is accelerated. */
export function missionSimulationProject(project: Project): Project {
  const code = project.files.find((file) => file.name === 'top.v')?.content;
  if (!code || !/parameter\s+integer\s+HALF_PERIOD\s*=\s*13_500_000/.test(code))
    throw new Error(
      'Верни HALF_PERIOD = 13_500_000 для генератора 27 МГц. Наставник ускоряет только копию для симуляции.',
    );
  return {
    ...project,
    files: project.files.map((file) =>
      file.name === 'top.v'
        ? {
            ...file,
            content: code.replace(
              /(parameter\s+integer\s+HALF_PERIOD\s*=\s*)13_500_000/,
              (_match, prefix: string) => prefix + '4',
            ),
          }
        : { ...file },
    ),
  };
}
export interface MissionProgress {
  version: 1;
  projectName: string;
  step: number;
  verifiedSnapshot: string;
  finished: boolean;
}
export const emptyMission = (): MissionProgress => ({
  version: 1,
  projectName: '',
  step: 0,
  verifiedSnapshot: '',
  finished: false,
});
export function parseMission(input: string | null): MissionProgress {
  try {
    const value = JSON.parse(input ?? 'null');
    if (
      !value ||
      value.version !== 1 ||
      typeof value.projectName !== 'string' ||
      !/^mission-beacon(?:-\d+)?$/.test(value.projectName) ||
      !Number.isInteger(value.step) ||
      value.step < 1 ||
      value.step > 10 ||
      typeof value.verifiedSnapshot !== 'string' ||
      value.verifiedSnapshot.length > 100_000
    )
      return emptyMission();
    // USB identity and completed uploads are session evidence. Repeat them after reload.
    return {
      version: 1,
      projectName: value.projectName,
      step: Math.min(value.step, 7),
      verifiedSnapshot: value.verifiedSnapshot,
      finished: value.finished === true,
    };
  } catch {
    return emptyMission();
  }
}
