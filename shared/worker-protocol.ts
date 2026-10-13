import type { LabDesign } from './lab';
import type { Project, YosysNetlist, YosysPort } from './types';

/**
 * Протокол IPC между сервером и дочерними процессами-воркерами (`server/*-runner.mjs`).
 * Обе стороны типизированы отсюда: менеджеры берут `WorkerMessage`, воркеры в JSDoc ссылаются на
 * те же типы, поэтому расхождение формата ловит компилятор, а не тест.
 */

/**
 * Запрос к `yosys-runner.mjs`. Это один из режимов: прогрев (`warm`), проверка запуска (`probe`),
 * подготовка схемы для лаборатории (`project` + `lab`), RTL для Icarus (`project` +
 * `prepareSimulation`) или обычный синтез (`project`).
 */
export interface YosysRequest {
  warm?: boolean;
  probe?: boolean;
  project?: Project;
  lab?: boolean;
  prepareSimulation?: boolean;
}

/** Запрос к `syntax-runner.mjs`: проверить синтаксис без полного синтеза. */
export interface SyntaxRequest {
  project: Project;
}

/** Запрос к `physical-yosys-runner.mjs`: плоский нетлист для nextpnr. */
export interface FlattenRequest {
  technology: YosysNetlist;
  top: string;
}

/** Сообщения воркера, общие для всех воркеров. */
export type CommonWorkerMessage =
  /** Кусок журнала. */
  | { type: 'log'; text: string }
  /** Успешное завершение; после него воркер закрывает канал. */
  | { type: 'success' }
  /** Неудача синтеза или проверки. */
  | { type: 'failure'; error: string };

/** Сообщения `yosys-runner.mjs`. */
export type YosysWorkerMessage =
  | CommonWorkerMessage
  | { type: 'stage'; stage: string }
  | { type: 'netlist'; name: 'rtl' | 'technology'; netlist: YosysNetlist }
  | { type: 'probe-success' }
  | { type: 'warm' }
  | { type: 'lab'; design: LabDesign }
  | {
      type: 'simulation-design';
      ports: Record<string, YosysPort>;
      modules: string[];
      design: string;
    };

/** Сообщения `syntax-runner.mjs`. */
export type SyntaxWorkerMessage = CommonWorkerMessage;

/** Сообщения `physical-yosys-runner.mjs` (собственный вид ответа: `flat` и `error`). */
export type FlattenWorkerMessage =
  { type: 'log'; text: string } | { type: 'flat'; text: string } | { type: 'error'; error: string };

/** Любое сообщение воркера. */
export type WorkerMessage = YosysWorkerMessage | SyntaxWorkerMessage | FlattenWorkerMessage;
