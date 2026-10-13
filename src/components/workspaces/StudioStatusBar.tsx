import type { BuildResult, ToolchainStatus } from '../../../shared/types';

const stages: Record<string, string> = {
  queued: 'Подготовка',
  preparing: 'Подготовка проекта',
  rtl: 'RTL-представление',
  technology: 'Синтез Gowin',
  synthesis: 'Синтез Gowin',
  complete: 'Завершено',
  finished: 'Завершено',
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
            ? 'Проверяем инструменты…'
            : health?.yosys.available
              ? 'Yosys готов'
              : 'Тулчейн недоступен'}
        </span>
        <span className="statusbar-separator" />
        <span>
          {busy
            ? `${stages[build?.stage || 'queued'] || build?.stage || 'Синтез'}…`
            : saveState === 'saved'
              ? 'Изменения сохранены в браузере'
              : saveState === 'saving'
                ? 'Сохраняем…'
                : 'Ошибка сохранения'}
        </span>
      </div>
      <div>
        <span>
          {health?.capabilities.simulation ? 'Icarus Verilog готов' : 'Симулятор недоступен'}
        </span>
        <span className="statusbar-separator" />
        <span>Tang Nano 20K · {top}</span>
      </div>
    </footer>
  );
}
