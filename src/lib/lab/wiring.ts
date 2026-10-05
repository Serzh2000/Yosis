import { headerByFpga } from './bench';
import type { PinDir } from './catalog';
import type { PinTarget } from './runtime';

export interface LinkStatus {
  ok: boolean;
  /** Why the wire would not carry a signal. */
  reason?: string;
}

/**
 * Whether a wire between a part pin of direction `pin` and the pad of FPGA pin `fpga` would
 * work, as far as the design is known. A pad no signal uses yet is fine: it can be assigned.
 */
export function linkStatus(
  pin: PinDir,
  fpga: number | null,
  targets: ReadonlyMap<number, PinTarget> | undefined,
): LinkStatus {
  const rail = fpga === null ? undefined : headerByFpga.get(fpga)?.rail;
  if (fpga === null || !headerByFpga.has(fpga))
    return { ok: false, reason: 'Такого контакта нет.' };
  if (pin === 'vcc' || pin === 'gnd') {
    if (!rail)
      return {
        ok: false,
        reason:
          pin === 'vcc'
            ? 'Вывод VCC подключают к питанию: контакт 3V3 или 5V.'
            : 'Вывод GND подключают к земле: контакт GND.',
      };
    if ((rail === 'GND') !== (pin === 'gnd'))
      return {
        ok: false,
        reason:
          pin === 'vcc'
            ? 'Это земля. Вывод VCC подключают к 3V3 или 5V.'
            : `Это питание ${rail}. Вывод GND подключают к земле.`,
      };
    return { ok: true };
  }
  if (rail)
    return {
      ok: false,
      reason: `Это ${rail === 'GND' ? 'земля' : `питание ${rail}`}: сюда подключают только выводы VCC и GND деталей.`,
    };
  const target = targets?.get(fpga);
  if (!target || target.direction === 'inout') return { ok: true };
  if (pin === 'in' && target.direction === 'input')
    return {
      ok: false,
      reason: `На контакте ${fpga} — вход схемы (${target.signal}): он ничего не выдаёт, а вывод детали ждёт сигнал.`,
    };
  if (pin === 'out' && target.direction === 'output')
    return {
      ok: false,
      reason: `На контакте ${fpga} — выход схемы (${target.signal}): два выхода на одном проводе.`,
    };
  return { ok: true };
}
