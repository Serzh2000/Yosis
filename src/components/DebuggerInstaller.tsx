import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Upload,
  Usb,
} from 'lucide-react';
import { BOUFFALO_ROM_FILTERS, type RomSerialPort } from '../lib/bl616-rom';
import {
  applyDebuggerInstall,
  backupFileName,
  debuggerPackage,
  prepareDebuggerInstall,
  readBackupFile,
  type BackupFile,
  type InstallPlan,
} from '../lib/debugger-install';
import { RomTranscript, type FlashProgress } from '../lib/bl616-flash';
import { downloadText } from '../lib/projects';
import { t } from '../lib/i18n';

interface Props {
  disabled: boolean;
  closeUart: () => Promise<void>;
  onBusy: (busy: boolean) => void;
  onInstalled: () => void;
  onConnect: () => void;
}
function downloadBytes(filename: string, bytes: ArrayBuffer) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function DebuggerInstaller({ disabled, closeUart, onBusy, onInstalled, onConnect }: Props) {
  const serial = (
    navigator as Navigator & {
      serial?: {
        requestPort(options: { filters: typeof BOUFFALO_ROM_FILTERS }): Promise<RomSerialPort>;
        getPorts?: () => Promise<RomSerialPort[]>;
        addEventListener?: (name: string, callback: EventListener) => void;
        removeEventListener?: (name: string, callback: EventListener) => void;
      };
    }
  ).serial;
  const [plan, setPlan] = useState<InstallPlan | null>(null);
  const [busy, setBusy] = useState(false),
    [writing, setWriting] = useState(false);
  const [progress, setProgress] = useState<FlashProgress | null>(null);
  const [error, setError] = useState(''),
    [done, setDone] = useState<'install' | 'restore' | null>(null);
  const [copySaved, setCopySaved] = useState(false),
    [restoreFile, setRestoreFile] = useState<BackupFile | null>(null),
    [hasJournal, setHasJournal] = useState(false);
  const port = useRef<RomSerialPort | null>(null),
    active = useRef(false),
    mounted = useRef(true),
    abort = useRef<AbortController | null>(null);
  const journal = useRef<RomTranscript | null>(null),
    fileInput = useRef<HTMLInputElement>(null);
  async function chooseRestoreFile(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    setError('');
    setRestoreFile(null);
    try {
      if (file.size > 16 * 1024 * 1024) throw new Error(t('Файл больше flash BL616.'));
      setRestoreFile(await readBackupFile(file.name, new Uint8Array(await file.arrayBuffer())));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    void serial
      ?.getPorts?.()
      .then((ports) => {
        const eligible = ports.filter((candidate) => {
          const info = candidate.getInfo();
          return BOUFFALO_ROM_FILTERS.some(
            (filter) =>
              filter.usbVendorId === info.usbVendorId && filter.usbProductId === info.usbProductId,
          );
        });
        if (mounted.current && !active.current && eligible.length === 1) port.current = eligible[0];
      })
      .catch(() => {
        /* A fresh chooser remains available. */
      });
  }, [serial]);
  useEffect(() => {
    const disconnected: EventListener = (event) => {
      const disconnectedPort = (event as Event & { port?: RomSerialPort }).port ?? event.target;
      if (disconnectedPort !== port.current) return;
      port.current = null;
      abort.current?.abort();
      setPlan(null);
      setError(t('ROM-порт отключён. Подключи плату с UPDATE и выбери порт заново.'));
    };
    serial?.addEventListener?.('disconnect', disconnected);
    return () => serial?.removeEventListener?.('disconnect', disconnected);
  }, [serial]);
  useEffect(() => {
    const leaving = (event: BeforeUnloadEvent) => {
      if (active.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leaving);
    return () => window.removeEventListener('beforeunload', leaving);
  }, []);
  function report(value: FlashProgress) {
    if (mounted.current) setProgress(value);
  }
  async function selectPort() {
    if (!serial || active.current || disabled) return;
    active.current = true;
    setBusy(true);
    onBusy(true);
    setPlan(null);
    port.current = null;
    try {
      const selected = await serial.requestPort({ filters: BOUFFALO_ROM_FILTERS });
      if (mounted.current) {
        port.current = selected;
        setError('');
      }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      active.current = false;
      if (mounted.current) setBusy(false);
      onBusy(false);
    }
  }
  async function prepare(mode: InstallPlan['mode'], file?: BackupFile) {
    if (!serial || active.current || disabled) return;
    active.current = true;
    setBusy(true);
    onBusy(true);
    setError('');
    setPlan(null);
    setDone(null);
    setProgress(null);
    setCopySaved(false);
    const controller = new AbortController();
    abort.current = controller;
    const transcript = new RomTranscript();
    journal.current = transcript;
    transcript.note(
      `Logra · ${mode}${file ? t(' из файла') : ''} · ${debuggerPackage.build} · ${new Date().toISOString()} · ${navigator.userAgent}`,
    );
    try {
      // The chooser must be opened directly inside the user gesture, before awaiting UART cleanup.
      const selected =
        port.current ?? (await serial.requestPort({ filters: BOUFFALO_ROM_FILTERS }));
      port.current = selected;
      await closeUart();
      report({ stage: t('Проверяем BL616 и пакет прошивки…'), done: 0, total: 0 });
      const next = await prepareDebuggerInstall(selected, mode, report, controller.signal, {
        transcript,
        restoreFile: file,
      });
      transcript.note(
        t('Подготовка завершена: копия {hash}, секторов к записи: {sectors}', {
          hash: next.backup.hash,
          sectors: next.sectors,
        }),
      );
      if (mounted.current) {
        setPlan(next);
        setProgress(null);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      transcript.note(t('Подготовка остановлена: {message}', { message }));
      // A failed session may hold a stale port object; the next attempt opens the chooser again.
      port.current = null;
      if (mounted.current) setError(message);
    } finally {
      active.current = false;
      if (mounted.current) {
        setBusy(false);
        setHasJournal(true);
      }
      onBusy(false);
    }
  }
  async function apply() {
    if (!plan || !port.current || active.current || disabled) return;
    active.current = true;
    setBusy(true);
    setWriting(true);
    onBusy(true);
    setError('');
    const selectedPlan = plan;
    const transcript = journal.current ?? new RomTranscript();
    journal.current = transcript;
    transcript.note(
      t('Запись · {mode} · {time}', {
        mode: selectedPlan.mode,
        time: new Date().toISOString(),
      }),
    );
    try {
      const result = await applyDebuggerInstall(port.current, selectedPlan, report, transcript);
      transcript.note(
        t('Запись завершена: секторов {sectors}, SHA-256 всей flash совпал', {
          sectors: result.sectors,
        }),
      );
      if (mounted.current) {
        setDone(selectedPlan.mode);
        setPlan(null);
        setRestoreFile(null);
        onInstalled();
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      transcript.note(t('Запись остановлена: {message}', { message }));
      port.current = null;
      if (mounted.current) {
        setError(message);
        setPlan(null);
      }
    } finally {
      active.current = false;
      if (mounted.current) {
        setBusy(false);
        setWriting(false);
      }
      onBusy(false);
    }
  }
  return (
    <section className="debugger-installer" aria-label={t('Установка и восстановление отладчика')}>
      <div className="debugger-installer-title">
        <Usb size={16} />
        <strong>{t('Отладчик для работы в браузере')}</strong>
        <span>BL616 · Tang Nano 20K</span>
      </div>
      <p>
        {t(
          t(
            'DirtyJTAG заменяет FTDI-эмуляцию в отладчике платы. Пакет содержит загрузчик Sipeed и JTAG с дескрипторами для WinUSB; UART остаётся отдельным портом. Инструменты на компьютере ученика не требуются.',
          ),
        )}
      </p>
      {!done && (
        <ol>
          <li>
            {t(
              t(
                'Отключи USB. Зажми UPDATE (BOOT) за HDMI, подключи USB и отпусти кнопку. LED могут продолжать бегущий огонь: режим загрузчика определяется появлением Bouffalo CDC.',
              ),
            )}
          </li>
          <li>
            {t(
              t(
                'Выбери Bouffalo CDC. Приложение прочитает flash BL616, сохранит копии в браузере и на сервере и проверит их SHA-256.',
              ),
            )}
          </li>
          <li>
            {t(
              t(
                'Проверь сведения о плате, затем запусти установку. После записи переподключи USB без UPDATE.',
              ),
            )}
          </li>
        </ol>
      )}
      {!plan && !busy && !done && (
        <div className="debugger-installer-actions">
          <button
            className="button primary"
            disabled={disabled || !serial}
            onClick={() => void prepare('install')}
          >
            <Usb size={14} />
            {t('Подготовить установку')}
          </button>
          <button
            className="button subtle"
            disabled={disabled || !serial}
            onClick={() => void prepare('restore')}
          >
            <RotateCcw size={14} />
            {t('Восстановить сохранённую прошивку')}
          </button>
          <button
            className="button subtle"
            disabled={disabled || !serial}
            onClick={() => void selectPort()}
          >
            {t('Выбрать другой ROM-порт')}
          </button>
          <button
            className="button subtle"
            disabled={disabled || !serial}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={14} />
            {t('Восстановить из файла…')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".bin,application/octet-stream"
            hidden
            onChange={(event) => void chooseRestoreFile(event.target.files?.[0])}
          />
        </div>
      )}
      {!plan && !busy && !done && restoreFile && (
        <div className="debugger-install-review">
          <div>
            <ShieldCheck size={16} />
            <strong>{t('Файл копии проверен')}</strong>
          </div>
          <dl>
            <dt>BL616</dt>
            <dd>{restoreFile.chipId}</dd>
            <dt>SHA-256</dt>
            <dd title={restoreFile.hash}>
              {t('{hash}… · совпал с именем', { hash: restoreFile.hash.slice(0, 20) })}
            </dd>
            <dt>{t('Размер')}</dt>
            <dd>{t('{size} МБ', { size: restoreFile.bytes.length / 1024 / 1024 })}</dd>
          </dl>
          <div className="debugger-installer-actions">
            <button
              className="button primary"
              disabled={disabled || !serial}
              onClick={() => void prepare('restore', restoreFile)}
            >
              <RotateCcw size={14} />
              {t('Восстановить из этого файла')}
            </button>
            <button className="button subtle" onClick={() => setRestoreFile(null)}>
              {t('Убрать файл')}
            </button>
          </div>
        </div>
      )}
      {!serial && <p role="status">{t('Нужен браузер с Web Serial через HTTPS или localhost.')}</p>}
      {plan && (
        <div className="debugger-install-review">
          <div>
            <ShieldCheck size={16} />
            <strong>{t('Резервная копия сохранена и перечитана')}</strong>
          </div>
          <dl>
            <dt>BL616</dt>
            <dd>{plan.backup.chipId}</dd>
            <dt>ROM / flash</dt>
            <dd>
              {plan.backup.identity.boot.version} · {plan.backup.identity.jedec} ·{' '}
              {t('{size} МБ', { size: plan.backup.identity.size / 1024 / 1024 })}
            </dd>
            <dt>{t('SHA-256 копии')}</dt>
            <dd title={plan.backup.hash}>{plan.backup.hash.slice(0, 20)}…</dd>
            <dt>{t('Запись')}</dt>
            <dd>
              {t('{count} секторов', { count: plan.sectors })} ·{' '}
              {plan.mode === 'install'
                ? debuggerPackage.build
                : t('самая ранняя сохранённая копия')}
            </dd>
          </dl>
          <p>
            {t(
              t(
                'Изменится прошивка USB-отладчика BL616. Во время записи сохрани питание. Проверенная копия также сохранена на сервере в твоём профиле. Скачивание дополнительной копии доступно по желанию.',
              ),
            )}
          </p>
          <div className="debugger-installer-actions">
            <button
              className="button subtle"
              disabled={busy}
              onClick={() => {
                downloadBytes(backupFileName(plan.backup), plan.backup.bytes);
                setCopySaved(true);
              }}
            >
              <ArrowDownToLine size={14} />
              {copySaved ? t('Скачать копию ещё раз') : t('Скачать копию (.bin)')}
            </button>
            <button
              className="button primary"
              disabled={busy || disabled}
              onClick={() => void apply()}
            >
              <ArrowRight size={14} />
              {plan.mode === 'install' ? t('Установить DirtyJTAG') : t('Восстановить BL616')}
            </button>
            <button
              className="button subtle"
              disabled={busy}
              onClick={() => {
                setPlan(null);
                port.current = null;
              }}
            >
              {t('Назад')}
            </button>
          </div>
        </div>
      )}
      {busy && (
        <div className="debugger-install-progress" role="status">
          <LoaderCircle size={14} className="spin" />
          <span>{progress?.stage || t('Выбери порт Bouffalo CDC…')}</span>
          {!!progress?.total && (
            <>
              <progress
                max={progress.total}
                value={progress.done}
                aria-label={t('Ход установки отладчика')}
              />
              <small>{Math.round((progress.done / progress.total) * 100)}%</small>
            </>
          )}
          {!writing && (
            <button className="physical-text-button" onClick={() => abort.current?.abort()}>
              {t('Отменить подготовку')}
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="physical-error" role="alert">
          {error}
        </p>
      )}
      {hasJournal && !busy && (
        <button
          className="physical-text-button"
          onClick={() =>
            downloadText(
              `bl616-rom-journal-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`,
              journal.current?.text() ?? '',
              'text/plain',
            )
          }
        >
          <ArrowDownToLine size={13} />
          {t('Скачать журнал обмена с ROM')}
        </button>
      )}
      {done && (
        <div className="debugger-install-done" role="status">
          <Check size={17} />
          <strong>
            {done === 'install'
              ? t('DirtyJTAG записан. SHA-256 всей flash совпал.')
              : t('Сохранённая flash BL616 восстановлена и проверена.')}
          </strong>
          <p>
            {t('Отключи USB и подключи снова без UPDATE.')}{' '}
            {done === 'install'
              ? t('Выбери DirtyJTAG и проверь ID FPGA, затем загружай битстрим в SRAM.')
              : t('USB-отладчик из сохранённой копии должен появиться снова.')}
          </p>
          {done === 'install' && (
            <button className="button primary" disabled={disabled} onClick={onConnect}>
              {t('Выбрать DirtyJTAG')}
              <ArrowRight size={14} />
            </button>
          )}
          <button
            className="physical-text-button"
            onClick={() => {
              setDone(null);
              setProgress(null);
            }}
          >
            {t('К установке и восстановлению')}
          </button>
        </div>
      )}
      <details className="debugger-installer-details">
        <summary>{t('Пакет и границы проверки')}</summary>
        <p>
          {t(
            t(
              'Сборка из закреплённых исходников DirtyJTAG и Bouffalo SDK. Установка ещё проходит испытания на реальной плате. Протокол проверяет ROM, параметры flash, резервную копию и каждый записанный сектор; при несовместимости останавливается до стирания. eFuse и конфигурация FPGA этим мастером не записываются.',
            ),
          )}
        </p>
        <a href="https://github.com/pepijndevos/bl616_dirtyjtag" target="_blank" rel="noreferrer">
          {t('Исходный проект DirtyJTAG')}
        </a>
      </details>
    </section>
  );
}
