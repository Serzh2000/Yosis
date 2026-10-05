import type { Example } from './examples';
import { busMoreExamples } from './examples-lab-bus2';
import { displayExamples } from './examples-lab-display';
import { i2cDisplayExamples } from './examples-lab-i2c';
import { partExamples } from './examples-lab-parts';
import { sensorExamples } from './examples-lab-sensors';

/** Examples for the laboratory's parts, protocol ones first; each opens with its bench ready (lab/presets.ts). */
export const labExamples: Example[] = [
  ...i2cDisplayExamples,
  ...sensorExamples,
  ...displayExamples,
  ...busMoreExamples,
  ...partExamples,
];
