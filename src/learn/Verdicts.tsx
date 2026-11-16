import { t } from '../lib/i18n';
import type { LessonVerdict } from '../lib/lessons';

/** The result of a check, case by case, and a word about what to do next. */
export function Verdicts({ verdicts, error }: { verdicts: LessonVerdict[] | null; error: string }) {
  const passed = verdicts?.every((item) => item.passed) ?? false;
  return (
    <>
      {error ? (
        <p className="learn-sim-error" role="alert">
          {error}
        </p>
      ) : null}
      {verdicts ? (
        <ul className="learn-verdicts" aria-label={t('Результаты проверки')}>
          {verdicts.map((item) => (
            <li key={item.title} className={item.passed ? 'right' : 'wrong'}>
              <strong>
                {item.passed ? '✓' : '✗'} {item.title}
              </strong>
              <span>
                {Object.entries(item.inputs)
                  .map(([name, value]) => `${name}=${value}`)
                  .join(', ') || t('без входов')}
                {' → '}
                {t('ждали {expected}', { expected: item.expected })}
                {item.passed ? '' : t(', получили {actual}', { actual: item.actual })}
              </span>
            </li>
          ))}
          <li className={passed ? 'summary right' : 'summary wrong'}>
            {passed
              ? t('Все проверки прошли.')
              : t('Найди место, которое отвечает за первый сбой.')}
          </li>
        </ul>
      ) : null}
    </>
  );
}
