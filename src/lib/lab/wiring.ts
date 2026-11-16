import { headerByFpga } from './pads';
import type { PinDir } from './catalog';
import type { PinTarget } from './runtime';
import { t } from '../../../shared/i18n';

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
    return { ok: false, reason: t('Такого контакта нет.') };
  if (pin === 'vcc' || pin === 'gnd') {
    if (!rail)
      return {
        ok: false,
        reason:
          pin === 'vcc'
            ? t('Вывод VCC подключают к питанию: контакт 3V3 или 5V.')
            : t('Вывод GND подключают к земле: контакт GND.'),
      };
    if ((rail === 'GND') !== (pin === 'gnd'))
      return {
        ok: false,
        reason:
          pin === 'vcc'
            ? t('Это земля. Вывод VCC подключают к 3V3 или 5V.')
            : t('Это питание {rail}. Вывод GND подключают к земле.', { rail }),
      };
    return { ok: true };
  }
  if (rail)
    return {
      ok: false,
      reason: t('Это {what}: сюда подключают только выводы VCC и GND деталей.', {
        what: rail === 'GND' ? t('земля') : t('питание {rail}', { rail }),
      }),
    };
  const target = targets?.get(fpga);
  if (!target || target.direction === 'inout') return { ok: true };
  if (pin === 'in' && target.direction === 'input')
    return {
      ok: false,
      reason: t(
        'На контакте {fpga} — вход схемы ({signal}): он ничего не выдаёт, а вывод детали ждёт сигнал.',
        {
          fpga,
          signal: target.signal,
        },
      ),
    };
  if (pin === 'out' && target.direction === 'output')
    return {
      ok: false,
      reason: t('На контакте {fpga} — выход схемы ({signal}): два выхода на одном проводе.', {
        fpga,
        signal: target.signal,
      }),
    };
  return { ok: true };
}
