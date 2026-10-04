import { useEffect, useRef } from 'react';
import {
  ArrowDownToLine,
  Check,
  CheckCheck,
  Circle,
  LoaderCircle,
  PanelBottomClose,
  PanelBottomOpen,
  Terminal,
} from 'lucide-react';
import type { BuildResult, Diagnostic } from '../../shared/types';
import { downloadText } from '../lib/projects';
const statusLabels = {
  queued: 'В очереди',
  running: 'Синтез выполняется',
  success: 'Синтез завершён',
  error: 'Ошибка сборки',
  cancelled: 'Сборка отменена',
};
function formatDuration(ms: number) {
  const seconds = ms / 1000;
  return `${seconds.toFixed(seconds < 10 ? 1 : 0)} с`;
}
export function BuildLogs({
  build,
  busy,
  elapsed,
  logsOpen,
  setLogsOpen,
  logTab,
  setLogTab,
  navigateSource,
}: {
  build: BuildResult | null;
  busy: boolean;
  elapsed: number;
  logsOpen: boolean;
  setLogsOpen: (value: boolean) => void;
  logTab: 'logs' | 'diagnostics';
  setLogTab: (value: 'logs' | 'diagnostics') => void;
  navigateSource: (file: string, line: number) => void;
}) {
  const logsRef = useRef<HTMLPreElement>(null);
  const diagnosticCount = build?.diagnostics.length || 0;
  useEffect(() => {
    const pre = logsRef.current;
    if (pre) pre.scrollTop = pre.scrollHeight;
  }, [build?.logs]);
  return (
    <section className={`logs-panel ${logsOpen ? 'open' : 'collapsed'}`}>
      <div className="logs-header">
        <div className="log-tabs">
          <button
            className={logTab === 'logs' ? 'active' : ''}
            onClick={() => {
              setLogTab('logs');
              setLogsOpen(!logsOpen || logTab !== 'logs');
            }}
          >
            <Terminal size={14} />
            Журнал сборки
          </button>
          <button
            className={logTab === 'diagnostics' ? 'active' : ''}
            onClick={() => {
              setLogTab('diagnostics');
              setLogsOpen(!logsOpen || logTab !== 'diagnostics');
            }}
          >
            Диагностика
            <span className={`diagnostic-count ${diagnosticCount ? 'has-errors' : ''}`}>
              {diagnosticCount}
            </span>
          </button>
        </div>
        <div className="logs-actions">
          {build && (
            <span className={`build-outcome ${build.status}`}>
              {busy ? (
                <LoaderCircle size={13} className="spin" />
              ) : build.status === 'success' ? (
                <Check size={13} />
              ) : (
                <Circle size={10} />
              )}
              {statusLabels[build.status]}
              <small>{formatDuration(elapsed)}</small>
            </span>
          )}
          <button
            className="icon-button"
            disabled={!build}
            aria-label="Скачать журнал"
            title="Скачать журнал"
            onClick={() => downloadText('logs.txt', build?.logs || '', 'text/plain')}
          >
            <ArrowDownToLine size={14} />
          </button>
          <button
            className="icon-button"
            title={logsOpen ? 'Свернуть журнал' : 'Развернуть журнал'}
            aria-label={logsOpen ? 'Свернуть журнал' : 'Развернуть журнал'}
            onClick={() => setLogsOpen(!logsOpen)}
          >
            {logsOpen ? <PanelBottomClose size={16} /> : <PanelBottomOpen size={16} />}
          </button>
        </div>
      </div>
      {logsOpen && (
        <div className="logs-body">
          {logTab === 'logs' ? (
            <pre ref={logsRef}>
              {build
                ? build.logs || 'Сборка в очереди. Ожидаем запуск Yosys…'
                : 'Запустите синтез, чтобы увидеть команды и сообщения Yosys.'}
            </pre>
          ) : (
            <div className="diagnostics-list">
              {build?.diagnostics.map((diagnostic: Diagnostic, index: number) => (
                <button
                  className={`diagnostic-row ${diagnostic.severity}`}
                  key={index}
                  disabled={!diagnostic.file || !diagnostic.line}
                  onClick={() =>
                    diagnostic.file && navigateSource(diagnostic.file, diagnostic.line || 1)
                  }
                >
                  <span className="diagnostic-level">
                    {diagnostic.severity === 'error' ? 'Ошибка' : 'Предупреждение'}
                  </span>
                  <span className="diagnostic-message">{diagnostic.message}</span>
                  {diagnostic.file && (
                    <code>
                      {diagnostic.file}
                      {diagnostic.line ? `:${diagnostic.line}` : ''}
                    </code>
                  )}
                </button>
              ))}
              {!diagnosticCount && (
                <div className="diagnostics-empty">
                  <CheckCheck size={18} />
                  <span>
                    {build?.status === 'error'
                      ? build.error || 'Подробности доступны в журнале.'
                      : build
                        ? 'Ошибки и предупреждения не обнаружены.'
                        : 'Здесь появятся сообщения сборки.'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
