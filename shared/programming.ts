/** The helper runs on the computer with the USB board, independently of the build server. */
export type ProgrammingBackend = 'gowin' | 'openfpgaloader';

export interface ProgrammingHealth {
  version: 1;
  backend: ProgrammingBackend;
  available: boolean;
  detail: string;
}

export interface ProgrammingDevice {
  id: string;
  label: string;
  board: 'tangnano20k';
  model: 'GW2AR-18C';
  deviceID: '0x0000081b';
  backend: ProgrammingBackend;
  serial?: string;
  location?: number;
}

export interface ProgrammingRequest {
  /** Client-created UUID is also the job ID, so a lost POST response can be recovered safely. */
  requestId: string;
  deviceId: string;
  bitstream: string;
  sha256: string;
  projectName: string;
}

export interface ProgrammingJob {
  id: string;
  status: 'running' | 'success' | 'error';
  stage: string;
  logs: string;
  sha256: string;
  projectName: string;
  deviceId: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
}
