import { X } from 'lucide-react';
import type { SimulationConfig, SimulationCheck, YosysPort } from '../../shared/types';
import { t } from '../lib/i18n';

export function SimulationChecks({
  expectations,
  checks,
  ports,
  durationNs,
  busy,
  onChange,
}: {
  expectations: NonNullable<SimulationConfig['expectations']>;
  checks?: SimulationCheck[];
  ports: Record<string, YosysPort>;
  durationNs: number;
  busy: boolean;
  onChange: (values: NonNullable<SimulationConfig['expectations']>) => void;
}) {
  const names = Object.keys(ports);
  const defaultSignal = names.find((name) => ports[name].direction === 'output') ?? names[0];
  return (
    <>
      <p className="simulation-settings-note">
        {t(
          'Задайте время и ожидаемый уровень порта. Значение снимается через 0,001 нс после указанного момента, когда изменения RTL уже обработаны. X — неизвестно, Z — отключённый выход.',
        )}
      </p>
      <div className="simulation-check-list">
        {expectations.map((entry, index) => {
          const check = checks?.[index];
          return (
            <div key={index} className="simulation-check-row">
              <label>
                {t('Время, нс')}
                <input
                  aria-label={t('Время проверки {n}, нс', { n: index + 1 })}
                  type="number"
                  min="0"
                  max={durationNs}
                  step="0.001"
                  value={entry.timeNs}
                  disabled={busy}
                  onChange={(e) =>
                    onChange(
                      expectations.map((row, i) =>
                        i === index ? { ...row, timeNs: Number(e.target.value) } : row,
                      ),
                    )
                  }
                />
              </label>
              <label>
                {t('Порт')}
                <select
                  aria-label={t('Порт проверки {n}', { n: index + 1 })}
                  value={entry.signal}
                  disabled={busy}
                  onChange={(e) =>
                    onChange(
                      expectations.map((row, i) =>
                        i === index ? { ...row, signal: e.target.value } : row,
                      ),
                    )
                  }
                >
                  {!ports[entry.signal] && (
                    <option value={entry.signal}>
                      {t('{name} · отсутствует', { name: entry.signal })}
                    </option>
                  )}
                  {names.map((name) => (
                    <option key={name} value={name}>
                      {name} · {t('{count} бит', { count: ports[name].bits.length })}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('Ожидается')}
                <input
                  aria-label={t('Ожидаемое значение {n}', { n: index + 1 })}
                  value={entry.value}
                  placeholder="0, 0xFF, 0b10, X"
                  disabled={busy}
                  onChange={(e) =>
                    onChange(
                      expectations.map((row, i) =>
                        i === index ? { ...row, value: e.target.value } : row,
                      ),
                    )
                  }
                />
              </label>
              <button
                className="icon-button"
                disabled={busy}
                aria-label={t('Удалить проверку {n}', { n: index + 1 })}
                onClick={() => onChange(expectations.filter((_, i) => i !== index))}
              >
                <X size={14} />
              </button>
              {check && (
                <p className={check.passed ? 'check-pass' : 'check-fail'}>
                  {check.passed ? t('Совпало') : t('Не совпало')} · {t('фактически')}{' '}
                  {check.actual === null ? t('нет образца') : `0b${check.actual}`}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {!expectations.length && (
        <p className="simulation-settings-note">
          {t('Проверок пока нет. Диаграммы можно смотреть и без них.')}
        </p>
      )}
      <button
        className="button subtle"
        disabled={busy || !defaultSignal || expectations.length >= 2048}
        onClick={() =>
          onChange([...expectations, { timeNs: 0, signal: defaultSignal, value: '0' }])
        }
      >
        {t('Добавить проверку')}
      </button>
    </>
  );
}
