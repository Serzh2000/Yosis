import type { ModuleVariant } from '../../../shared/pin-layout';
import type { McuBoardId } from '../../../shared/mcu';

/** Dimensions from the manufacturers' mechanical drawings. x runs from USB to antenna/ICSP. */
export const boardPackages: Record<
  McuBoardId,
  {
    width: number;
    depth: number;
    spacing: number;
    first: number;
    direction: 1 | -1;
    holes: [number, number][];
    holeRadius: number;
  }
> = {
  tangnano20k: {
    width: 58.4,
    depth: 22.86,
    spacing: 20.32,
    first: -24.13,
    direction: 1,
    holeRadius: 0,
    holes: [],
  },
  uno: {
    width: 68.58,
    depth: 53.34,
    spacing: 0,
    first: 0,
    direction: 1,
    holeRadius: 1.6,
    holes: [
      [-20.32, 24.13],
      [-19.05, -24.13],
      [31.75, 19.05],
      [31.75, -8.89],
    ],
  },
  nano: {
    width: 45,
    depth: 18,
    spacing: 15.24,
    first: -18.18,
    direction: 1,
    holeRadius: 0.9,
    holes: [
      [-21.2, -7.62],
      [-21.2, 7.62],
      [21.2, -7.62],
      [21.2, 7.62],
    ],
  },
  esp32: {
    width: 48.26,
    depth: 27.94,
    spacing: 25.4,
    first: 22.86,
    direction: -1,
    holeRadius: 0,
    holes: [],
  },
  esp32s3: {
    width: 62.74,
    depth: 25.4,
    spacing: 22.86,
    first: 30.1,
    direction: -1,
    holeRadius: 0,
    holes: [],
  },
};
/** Printing exists even where the simplified simulator does not expose reset or flash terminals. */
export const decorativeHeaders: Partial<
  Record<McuBoardId, { left: Record<number, string>; right: Record<number, string> }>
> = {
  nano: { left: { 2: 'REF', 12: 'RST', 14: 'VIN' }, right: { 11: 'GND', 12: 'RST' } },
  esp32: {
    left: { 1: 'EN', 15: 'D2', 16: 'D3', 17: 'CMD' },
    right: { 16: 'D1', 17: 'D0', 18: 'CLK' },
  },
  esp32s3: { left: { 1: '3V3', 2: 'RST' }, right: { 20: 'G', 21: 'G' } },
};
export function physicalPinLabel(board: McuBoardId, label: string) {
  if (board === 'esp32' || board === 'esp32s3') {
    if (label.startsWith('GND')) return 'G';
    if (label === 'IO36' && board === 'esp32') return 'VP';
    if (label === 'IO39' && board === 'esp32') return 'VN';
    if (label === (board === 'esp32' ? 'IO1' : 'IO43')) return 'TX';
    if (label === (board === 'esp32' ? 'IO3' : 'IO44')) return 'RX';
    return label.replace(/^IO/, '');
  }
  if (board === 'uno' && /^D[0-9]+$/.test(label)) {
    const n = Number(label.slice(1));
    return `${[3, 5, 6, 9, 10, 11].includes(n) ? '~' : ''}${n}`;
  }
  return label;
}

export function radioPackage(board: 'esp32' | 'esp32s3', variant?: ModuleVariant) {
  const s3 = board === 'esp32s3',
    wrover = !s3 && variant === 'wrover';
  const length = wrover ? 31.4 : 25.5;
  const start = boardPackages[board].width / 2 + (s3 ? 0 : 6.04) - 25.5;
  return {
    start,
    length,
    end: start + length,
    shieldLength: length - 7.5,
    marking: s3
      ? `WROOM-1 ${variant === 's3-r8' ? 'N8R8' : 'N8'}`
      : wrover
        ? 'WROVER-E'
        : 'WROOM-32E',
    title: s3
      ? `ESP32-S3-WROOM-1-${variant === 's3-r8' ? 'N8R8' : 'N8'}`
      : wrover
        ? 'ESP32-WROVER-E'
        : 'ESP32-WROOM-32E',
  };
}
