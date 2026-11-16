import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { PanelBoundary } from '../PanelBoundary';
import type { WorkTab } from '../../lib/studio-tabs';
import { t } from '../../lib/i18n';

/**
 * Панель, которая остаётся смонтированной после первого открытия и только прячется: состояние
 * симуляции, лаборатории и курса не теряется при переключении вкладок.
 */
export function PanelSlot({
  tab,
  active,
  label,
  resetKey,
  children,
}: {
  tab: WorkTab;
  active: boolean;
  label: string;
  resetKey?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={`panel-${tab}`}
      role="tabpanel"
      aria-labelledby={`tab-${tab}`}
      className="full-panel-workspace"
      hidden={!active}
      aria-label={label}
    >
      <PanelBoundary name={tab} resetKey={resetKey}>
        <Suspense
          fallback={
            <div className="editor-loading" role="status">
              {t('Открываем рабочую область…')}
            </div>
          }
        >
          {children}
        </Suspense>
      </PanelBoundary>
    </section>
  );
}
