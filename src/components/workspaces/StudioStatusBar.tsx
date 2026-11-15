import type { BuildResult, ToolchainStatus } from '../../../shared/types';
import { t } from '../../lib/i18n';

const stages: Record<string, string> = {
  queued: t('Подготовка'),
  preparing: t('Подготовка проекта'),
  rtl: t('RTL-представление'),
  technology: t('Синтез Gowin'),
  synthesis: t('Синтез Gowin'),
  complete: t('Завершено'),
  finished: t('Завершено'),
};

/** Нижняя строка: готовность инструментов, ход синтеза или состояние сохранения. */
export function StudioStatusBar({
  health,
  healthLoading,
  busy,
  build,
  saveState,
  top,
}: {
  health: ToolchainStatus | null;
  healthLoading: boolean;
  busy: boolean;
  build: BuildResult | null;
  saveState: 'saving' | 'saved' | 'error';
  top: string;
}) {
  return (
    <footer className="app-statusbar">
      <div>
        <span className={`status-dot ${health?.yosys.available ? 'online' : 'pending'}`} />
        <span>
          {healthLoading
            ? t('Проверяем инструменты…')
            : health?.yosys.available
              ? t('Yosys готов')
              : t('Тулчейн недоступен')}
        </span>
        <span className="statusbar-separator" />
        <span>
          {busy
            ? `${stages[build?.stage || 'queued'] || build?.stage || t('Синтез')}…`
            : saveState === 'saved'
              ? t('Изменения сохранены в браузере')
              : saveState === 'saving'
                ? t('Сохраняем…')
                : t('Ошибка сохранения')}
        </span>
      </div>
      <div>
        <span>
          {health?.capabilities.simulation ? t('Icarus Verilog готов') : t('Симулятор недоступен')}
        </span>
        <span className="statusbar-separator" />
        <span>Tang Nano 20K · {top}</span>
      </div>
    </footer>
  );
}
