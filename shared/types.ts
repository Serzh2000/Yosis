export type Bit = number | string;
export interface SourceFile {
  name: string;
  content: string;
}
/** Откуда создан проект: встроенный пример и отпечатки файлов на момент копирования. */
export interface ProjectOrigin {
  exampleId: string;
  /** Отпечаток файлов примера из библиотеки в момент копирования. */
  sourceHash: string;
  /** Отпечаток файлов самой копии сразу после создания (с учётом переименования модуля). */
  copyHash: string;
}
export interface Project {
  /** Stable storage identity; legacy imports can omit it. */
  id?: string;
  name: string;
  top: string;
  board: 'tangnano20k';
  files: SourceFile[];
  /** Задаётся для копий встроенных примеров; у старых проектов отсутствует. */
  origin?: ProjectOrigin;
}
export interface YosysPort {
  direction: 'input' | 'output' | 'inout';
  bits: Bit[];
  offset?: number;
  upto?: number;
}
export interface YosysCell {
  hide_name?: number;
  type: string;
  parameters: Record<string, string | number>;
  attributes: Record<string, string | number>;
  port_directions: Record<string, 'input' | 'output' | 'inout'>;
  connections: Record<string, Bit[]>;
}
export interface YosysModule {
  attributes: Record<string, string | number>;
  ports: Record<string, YosysPort>;
  cells: Record<string, YosysCell>;
  netnames: Record<
    string,
    { bits: Bit[]; attributes?: Record<string, string | number>; hide_name?: number }
  >;
}
export interface YosysNetlist {
  creator: string;
  modules: Record<string, YosysModule>;
}
export interface Diagnostic {
  severity: 'error' | 'warning';
  message: string;
  file?: string;
  line?: number;
}
export interface BuildRequest {
  project: Project;
}
export type BuildStatus = 'queued' | 'running' | 'success' | 'error' | 'cancelled';
export interface BuildResult {
  id: string;
  status: BuildStatus;
  stage: string;
  startedAt: string;
  finishedAt?: string;
  elapsedMs?: number;
  logs: string;
  diagnostics: Diagnostic[];
  rtl?: YosysNetlist;
  technology?: YosysNetlist;
  top: string;
  projectHash: string;
  toolVersion?: string;
  error?: string;
}
export interface ToolchainStatus {
  yosys: { available: boolean; engine: string; version?: string };
  board: { name: string; device: string; family: string };
  simulator?: { available: boolean; engine: string; version?: string };
  physical?: import('./physical').PhysicalToolStatus;
  capabilities: {
    synthesis: boolean;
    simulation: boolean;
    placeAndRoute: boolean;
    bitstream: boolean;
    programming: boolean;
  };
}

export interface SimulationConfig {
  clock: string | null;
  reset: string | null;
  resetActiveLow: boolean;
  resetCycles: number;
  cycles: number;
  periodNs: number;
  inputs: Record<string, string>;
  /** Input changes at the start of a zero-based clock period, after initial settling. */
  stimuli?: Array<{ cycle: number; inputs: Record<string, string> }>;
  /** Exact input times, in ns, with 1 ps resolution. Mutually exclusive with stimuli. */
  timedStimuli?: Array<{ timeNs: number; inputs: Record<string, string> }>;
  /** Sample top-level ports 1 ps after this time, after RTL has settled. */
  expectations?: Array<{ timeNs: number; signal: string; value: string }>;
}
export interface SimulationCheck {
  timeNs: number;
  signal: string;
  expected: string;
  actual: string | null;
  passed: boolean;
}
export interface SimulationRequest {
  project: Project;
  config: SimulationConfig;
}
export interface SimulationResult {
  id: string;
  status: BuildStatus;
  stage: string;
  startedAt: string;
  finishedAt?: string;
  elapsedMs?: number;
  logs: string;
  diagnostics: Diagnostic[];
  top: string;
  projectHash: string;
  config: SimulationConfig;
  engine: string;
  toolVersion?: string;
  vcd?: string;
  checks?: SimulationCheck[];
  error?: string;
}
