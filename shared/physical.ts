import type { BuildStatus, YosysNetlist } from './types';

export interface PhysicalConfig {
  cstFile: string;
  frequencyMHz: number;
}
export interface PhysicalToolStatus {
  available: boolean;
  engine: string;
  nextpnrVersion?: string;
  bitstreamAvailable: boolean;
  error?: string;
}
export interface PhysicalResult {
  id: string;
  buildId: string;
  projectHash: string;
  status: BuildStatus;
  stage: string;
  startedAt: string;
  finishedAt?: string;
  elapsedMs?: number;
  logs: string;
  config: PhysicalConfig;
  engine: string;
  error?: string;
  placed?: YosysNetlist;
  report?: unknown;
  bitstreamAvailable: boolean;
}

export interface PlacedCell {
  name: string;
  type: string;
  bel: string;
  x: number;
  y: number;
  category: 'LUT' | 'FF' | 'ALU' | 'BRAM' | 'DSP' | 'IO' | 'other';
  hierarchy: string;
}
export interface PlacementTile {
  x: number;
  y: number;
  cells: PlacedCell[];
  routingPips: number;
}
export interface PlacementMap {
  top: string;
  device?: string;
  family?: string;
  cells: PlacedCell[];
  tiles: PlacementTile[];
  unplaced: number;
  ignoredConstants: number;
  routingPips: number;
  maxX: number;
  maxY: number;
  fullChipBounds: boolean;
  warnings: string[];
}
