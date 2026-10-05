import { useEffect, useRef, useState } from 'react';
import { Check, Download, Link2, LoaderCircle, Unplug, Upload, Usb } from 'lucide-react';
import type { Project } from '../../shared/types';
import type { PhysicalResult } from '../../shared/physical';
import { parseGowinBitstream } from '../../shared/gowin-bitstream';
import { FtdiWebUsbTransport, type WebUsbDevice } from '../lib/ftdi-webusb';
import { DirtyJtagWebUsbTransport, DIRTYJTAG_USB_FILTER } from '../lib/dirtyjtag-webusb';
import { GowinJtag, type JtagIdentity, type ProgrammingProgress } from '../lib/gowin-jtag';
import { MAX_BITSTREAM_BYTES, physicalIsFresh, sha256Text } from '../lib/programming-client';
import {
  BOUFFALO_ROM_FILTERS,
  probeBl616Rom,
  type RomBootInfo,
  type RomSerialPort,
} from '../lib/bl616-rom';
import './programming.css';
import { DebuggerInstaller } from './DebuggerInstaller';
import { getProjectSnapshot } from '../lib/projects';

interface Props {
  project: Project;
  physical?: PhysicalResult | null;
  physicalSnapshot: string;
  uartConnected: boolean;
  uartBusy?: boolean;
  closeUart: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
  onOpenChip?: () => void;
  onIdentity?: (identity: JtagIdentity | null) => void;
  onProgrammed?: (snapshot: string) => void;
  mode?: 'program' | 'maintenance';
  onOpenSetup?: () => void;
}
interface BrowserUsb {
  requestDevice(options: {
    filters: { vendorId: number; productId: number }[];
  }): Promise<WebUsbDevice>;
  addEventListener(
    type: 'disconnect',
    listener: (event: Event & { device?: WebUsbDevice }) => void,
  ): void;
  removeEventListener(
    type: 'disconnect',
    listener: (event: Event & { device?: WebUsbDevice }) => void,
  ): void;
}
interface BrowserRomSerial {
  requestPort(options: {
    filters: readonly { usbVendorId: number; usbProductId: number }[];
  }): Promise<RomSerialPort>;
}
interface Artifact {
  name: string;
  text: string;
  sha256: string;
  projectName: string;
  source: 'project' | 'file';
  physicalId?: string;
  snapshot?: string;
}
interface Receipt {
  projectName: string;
  sha256: string;
  device: string;
  status: 'running' | 'success' | 'error';
  progress: ProgrammingProgress;
  logs: string;
  result?: JtagIdentity;
  error?: string;
}
const registerHex = (value: number) => '0x' + value.toString(16).padStart(8, '0').toUpperCase();
const openAdapter = (device: WebUsbDevice) =>
  device.vendorId === DIRTYJTAG_USB_FILTER.vendorId
    ? DirtyJtagWebUsbTransport.open(device)
    : FtdiWebUsbTransport.open(device);

export function ProgrammingPanel({
  project,
  physical,
  physicalSnapshot,
  uartConnected,
  uartBusy = false,
  closeUart,
  onBusyChange,
  onOpenChip,
  onIdentity,
  onProgrammed,
  mode = 'program',
  onOpenSetup,
}: Props) {
  const usb = (navigator as Navigator & { usb?: BrowserUsb }).usb;
  const romSerial = (navigator as Navigator & { serial?: BrowserRomSerial }).serial;
  const [target, setTarget] = useState<WebUsbDevice | null>(null);
  const [identity, setIdentity] = useState<JtagIdentity | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [choosingDevice, setChoosingDevice] = useState(false);
  const [source, setSource] = useState<'project' | 'file'>('project');
  const [projectArtifact, setProjectArtifact] = useState<Artifact | null>(null);
  const [fileArtifact, setFileArtifact] = useState<Artifact | null>(null);
  const [sourceHash, setSourceHash] = useState('');
  const [loadingArtifact, setLoadingArtifact] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const [artifactError, setArtifactError] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [romProbing, setRomProbing] = useState(false);
  const [romStage, setRomStage] = useState('');
  const [romInfo, setRomInfo] = useState<RomBootInfo | null>(null);
  const [romError, setRomError] = useState('');
  const [adapterKind, setAdapterKind] = useState<'ftdi' | 'dirtyjtag' | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const operation = useRef(false);
  const mounted = useRef(true);
  const fileGeneration = useRef(0);
  const currentSnapshot = getProjectSnapshot(project);
  const fresh = physicalIsFresh(physical, physicalSnapshot, currentSnapshot, sourceHash);
  const artifact = source === 'project' ? projectArtifact : fileArtifact;
  const running = connecting || romProbing || setupBusy || receipt?.status === 'running';
  const validArtifact =
    !!artifact &&
    (source === 'file' ||
      (fresh && artifact.physicalId === physical?.id && artifact.snapshot === currentSnapshot));
  const current = useRef({ snapshot: currentSnapshot, physicalId: physical?.id, fresh });
  current.current = { snapshot: currentSnapshot, physicalId: physical?.id, fresh };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    onBusyChange(running);
    return () => onBusyChange(false);
  }, [running, onBusyChange]);
  useEffect(() => {
    onIdentity?.(identity);
  }, [identity, onIdentity]);
  useEffect(() => {
    const leaving = (event: BeforeUnloadEvent) => {
      if (operation.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leaving);
    return () => window.removeEventListener('beforeunload', leaving);
  }, []);
  useEffect(() => {
    const disconnected = (event: Event & { device?: WebUsbDevice }) => {
      if (event.device === target) {
        setTarget(null);
        setIdentity(null);
        setError('USB-плата отключена. Подключите её и выберите снова.');
      }
    };
    usb?.addEventListener('disconnect', disconnected);
    return () => usb?.removeEventListener('disconnect', disconnected);
  }, [usb, target]);
  useEffect(() => {
    let active = true;
    setSourceHash('');
    if (physicalSnapshot)
      void sha256Text(physicalSnapshot)
        .then((hash) => {
          if (active) setSourceHash(hash);
        })
        .catch(() => {
          if (active)
            setArtifactError('SHA-256 недоступен. Откройте приложение через HTTPS или localhost.');
        });
    return () => {
      active = false;
    };
  }, [physicalSnapshot]);
  useEffect(() => {
    const abort = new AbortController();
    if (!fresh || !physical) {
      setLoadingArtifact(false);
      return () => abort.abort();
    }
    setLoadingArtifact(true);
    setArtifactError('');
    const snapshot = currentSnapshot,
      id = physical.id,
      projectName = project.name;
    void (async () => {
      try {
        const response = await fetch(
          `/api/physical/${encodeURIComponent(id)}/artifacts/design.fs`,
          { signal: abort.signal, cache: 'no-store' },
        );
        if (!response.ok) throw new Error('Не удалось получить битстрим. Повторите размещение.');
        const text = await response.text();
        parseGowinBitstream(text);
        const sha256 = await sha256Text(text);
        if (!abort.signal.aborted)
          setProjectArtifact({
            name: 'design.fs',
            text,
            sha256,
            projectName,
            source: 'project',
            physicalId: id,
            snapshot,
          });
      } catch (cause) {
        if (!abort.signal.aborted)
          setArtifactError(cause instanceof Error ? cause.message : 'Ошибка чтения битстрима.');
      } finally {
        if (!abort.signal.aborted) setLoadingArtifact(false);
      }
    })();
    return () => abort.abort();
  }, [fresh, physical, currentSnapshot, project.name]);

  async function connect() {
    if (!usb || operation.current || uartBusy || setupBusy) return;
    operation.current = true;
    setConnecting(true);
    setChoosingDevice(true);
    setError('');
    setTarget(null);
    setIdentity(null);
    let transport: FtdiWebUsbTransport | DirtyJtagWebUsbTransport | undefined;
    try {
      // requestDevice must run directly from this click, before asynchronous work.
      const device = await usb.requestDevice({
        filters: [{ vendorId: 0x0403, productId: 0x6010 }, DIRTYJTAG_USB_FILTER],
      });
      setAdapterKind(device.vendorId === DIRTYJTAG_USB_FILTER.vendorId ? 'dirtyjtag' : 'ftdi');
      if (mounted.current) setChoosingDevice(false);
      await closeUart();
      transport = await openAdapter(device);
      const result = await new GowinJtag(transport).probe();
      if (mounted.current) {
        setTarget(device);
        setIdentity(result);
      }
    } catch (cause) {
      if (mounted.current && !(cause instanceof DOMException && cause.name === 'NotFoundError')) {
        setError(cause instanceof Error ? cause.message : 'Не удалось получить доступ к USB.');
      }
    } finally {
      if (transport) {
        const warnings = await transport.close();
        if (warnings.length && mounted.current) {
          setTarget(null);
          setIdentity(null);
          setError(warnings.join('; '));
        }
      }
      operation.current = false;
      if (mounted.current) {
        setConnecting(false);
        setChoosingDevice(false);
      }
    }
  }
  async function chooseFile(file: File) {
    const generation = ++fileGeneration.current;
    setArtifactError('');
    try {
      if (!/\.fs$/i.test(file.name) || file.size > MAX_BITSTREAM_BYTES)
        throw new Error('Выберите Gowin .fs размером до 16 МБ.');
      const text = await file.text();
      parseGowinBitstream(text);
      const sha256 = await sha256Text(text);
      if (mounted.current && generation === fileGeneration.current) {
        setFileArtifact({ name: file.name, text, sha256, projectName: file.name, source: 'file' });
        setSource('file');
      }
    } catch (cause) {
      if (mounted.current && generation === fileGeneration.current) {
        setFileArtifact(null);
        setArtifactError(cause instanceof Error ? cause.message : 'Не удалось открыть файл.');
      }
    }
  }
  async function probeRom() {
    if (!romSerial || operation.current || uartBusy || setupBusy) return;
    operation.current = true;
    setRomProbing(true);
    setRomStage('Выберите ROM-порт…');
    setRomInfo(null);
    setRomError('');
    setTarget(null);
    setIdentity(null);
    try {
      // Keep browser permission selection in the click's user activation.
      const port = await romSerial.requestPort({ filters: BOUFFALO_ROM_FILTERS });
      await closeUart();
      const info = await probeBl616Rom(port, {
        onStage: (stage) => {
          if (mounted.current) setRomStage(stage);
        },
      });
      if (mounted.current) setRomInfo(info);
    } catch (cause) {
      if (mounted.current && !(cause instanceof DOMException && cause.name === 'NotFoundError'))
        setRomError(cause instanceof Error ? cause.message : 'Не удалось прочитать ROM.');
    } finally {
      operation.current = false;
      if (mounted.current) {
        setRomProbing(false);
        setRomStage('');
      }
    }
  }
  async function program() {
    if (
      !target ||
      !identity ||
      !artifact ||
      !validArtifact ||
      operation.current ||
      uartBusy ||
      setupBusy
    )
      return;
    const selected = artifact,
      device = target;
    operation.current = true;
    setError('');
    setShowLogs(false);
    setReceipt({
      projectName: selected.projectName,
      sha256: selected.sha256,
      device: device.productName || 'Tang Nano 20K',
      status: 'running',
      progress: { stage: 'Подготовка', percent: 0 },
      logs: '',
    });
    let transport: FtdiWebUsbTransport | DirtyJtagWebUsbTransport | undefined;
    let result: JtagIdentity | undefined,
      failure = '';
    try {
      await closeUart();
      if (
        selected.source === 'project' &&
        (!current.current.fresh ||
          selected.snapshot !== current.current.snapshot ||
          selected.physicalId !== current.current.physicalId)
      )
        throw new Error('Проект изменился. Повторите синтез и размещение.');
      if ((await sha256Text(selected.text)) !== selected.sha256)
        throw new Error('Битстрим изменился. Выберите файл заново.');
      transport = await openAdapter(device);
      result = await new GowinJtag(transport, (progress) => {
        if (mounted.current)
          setReceipt(
            (previous) =>
              previous && {
                ...previous,
                progress,
                logs:
                  previous.progress.stage === progress.stage
                    ? previous.logs
                    : previous.logs + progress.stage + '\n',
              },
          );
      }).program(selected.text);
    } catch (cause) {
      failure = cause instanceof Error ? cause.message : 'Ошибка USB/JTAG.';
    } finally {
      if (transport) {
        const warnings = await transport.close();
        if (warnings.length) failure = [failure, ...warnings].filter(Boolean).join('; ');
      }
      operation.current = false;
      if (mounted.current) {
        setTarget(null);
        setIdentity(null);
        setReceipt(
          (previous) =>
            previous && {
              ...previous,
              status: failure ? 'error' : 'success',
              error: failure || undefined,
              result,
              progress: {
                stage: failure ? 'Ошибка загрузки' : 'Загрузка завершена',
                percent: failure ? previous.progress.percent : 100,
              },
            },
        );
        if (!failure && selected.source === 'project' && selected.snapshot)
          onProgrammed?.(selected.snapshot);
      }
    }
  }
  return (
    <section
      className="physical-card programming-panel"
      aria-label={mode === 'program' ? 'Загрузка битстрима в плату' : 'Обслуживание USB-отладчика'}
    >
      <div hidden={mode !== 'program'} className="programming-main-flow">
        <div className="physical-card-title">
          <Usb size={17} />
          <h3>Загрузка в FPGA</h3>
          <span className={`connection-badge ${target ? 'is-connected' : ''}`}>
            {adapterKind === 'dirtyjtag' ? 'DirtyJTAG v2' : 'WebUSB · JTAG'}
          </span>
        </div>
        <p className="programming-intro">
          Запустите схему на плате. Загрузка в SRAM действует до отключения питания.
        </p>
        <section className={`programming-step ${target ? 'is-done' : ''}`}>
          <h4 className="programming-step-heading">
            <span>{target ? <Check size={13} aria-label="готово" /> : 1}</span>Подключите плату
          </h4>
          <div className={`programming-device-row ${target ? 'is-connected' : ''}`}>
            {target && (
              <div className="programming-device">
                <i aria-hidden="true" />
                <strong>{target.productName || 'Tang Nano 20K'}</strong>
                <small>{identity ? 'FPGA отвечает по JTAG' : 'USB подключён'}</small>
              </div>
            )}
            <button
              data-tour="connect"
              className="button subtle"
              disabled={!usb || running || uartBusy}
              onClick={() => void connect()}
            >
              {connecting ? <LoaderCircle size={14} className="spin" /> : <Link2 size={14} />}{' '}
              {connecting
                ? choosingDevice
                  ? 'Выберите USB в окне браузера…'
                  : 'Проверяем JTAG…'
                : target
                  ? 'Выбрать другую плату'
                  : 'Выбрать USB-плату'}
            </button>
            {target && (
              <button
                className="programming-icon-button"
                aria-label="Отключить USB-плату"
                title="Отключить USB-плату"
                disabled={running}
                onClick={() => {
                  setTarget(null);
                  setIdentity(null);
                }}
              >
                <Unplug size={15} />
              </button>
            )}
          </div>
          {!usb && (
            <div className="physical-note">
              WebUSB недоступен. Откройте Yosis через HTTPS или localhost в браузере с WebUSB,
              например Chrome или Edge.
            </div>
          )}
          {identity && (
            <details className="programming-helper-detail">
              <summary>FPGA GW2AR-18C распознана</summary>
              <span>ID {registerHex(identity.idCode)}</span>
              <span>
                Status {registerHex(identity.status)} · UserCode {registerHex(identity.userCode)}
              </span>
            </details>
          )}
          {error && (
            <div className="physical-error" role="alert">
              {error}
              <details className="programming-error-hint">
                <summary>Как исправить подключение</summary>
                {adapterKind === 'dirtyjtag'
                  ? 'Выбран DirtyJTAG. Ошибка захвата требует проверки WinUSB и доступа к interface 0. Переподключите USB без UPDATE и закройте другие программы, работающие с платой.'
                  : 'Штатная FTDI-эмуляция на Windows может блокировать WebUSB. Откройте раздел «Отладчик» и выберите Bouffalo CDC в режиме UPDATE. Закройте другие программы, работающие с платой.'}
              </details>
              {onOpenSetup && adapterKind !== 'dirtyjtag' && (
                <button className="button subtle" onClick={onOpenSetup}>
                  Открыть настройку отладчика
                </button>
              )}
            </div>
          )}
        </section>
        <section className={`programming-step ${validArtifact ? 'is-done' : ''}`}>
          <h4 className="programming-step-heading">
            <span>{validArtifact ? <Check size={13} aria-label="готово" /> : 2}</span>Выберите схему
          </h4>
          <div className="programming-source-row" role="group" aria-label="Источник битстрима">
            <button
              className={`button subtle ${source === 'project' ? 'is-active' : ''}`}
              disabled={running}
              onClick={() => setSource('project')}
            >
              Сборка проекта
            </button>
            <button
              className={`button subtle ${source === 'file' ? 'is-active' : ''}`}
              disabled={running}
              onClick={() => {
                setSource('file');
                fileRef.current?.click();
              }}
            >
              <Upload size={13} />
              Свой .fs
            </button>
            <input
              ref={fileRef}
              hidden
              type="file"
              accept=".fs"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void chooseFile(file);
                event.target.value = '';
              }}
            />
          </div>
          <div className={`programming-artifact ${validArtifact ? 'is-ready' : ''}`}>
            {source === 'project' && loadingArtifact ? (
              <span>
                <LoaderCircle size={14} className="spin" />
                Проверяем битстрим…
              </span>
            ) : validArtifact && artifact ? (
              <>
                <strong>{artifact.projectName}</strong>
                <span>
                  {artifact.name} · {(artifact.text.length / 1024 / 1024).toFixed(2)} МБ
                </span>
                <details className="programming-artifact-hash">
                  <summary>Проверка файла</summary>
                  <code>SHA-256 {artifact.sha256}</code>
                  <span>Модель FPGA и CRC проверены.</span>
                </details>
              </>
            ) : source === 'project' ? (
              <>
                <strong>
                  {physical?.status === 'success' && physical.bitstreamAvailable
                    ? 'Сборка относится к предыдущим исходникам'
                    : 'Битстрим проекта ещё не готов'}
                </strong>
                <span>Синтезируйте проект и выполните размещение во вкладке «Кристалл».</span>
                {onOpenChip && (
                  <button className="physical-text-button" onClick={onOpenChip}>
                    Открыть кристалл
                  </button>
                )}
              </>
            ) : (
              <>
                <strong>Выберите текстовый битстрим .fs</strong>
                <span>Проверим модель FPGA и CRC каждого кадра.</span>
              </>
            )}
          </div>
          {artifactError && (
            <div className="physical-error" role="alert">
              {artifactError}
            </div>
          )}
        </section>
        <section className={`programming-step ${receipt?.status === 'success' ? 'is-done' : ''}`}>
          <h4 className="programming-step-heading">
            <span>
              {receipt?.status === 'success' ? <Check size={13} aria-label="готово" /> : 3}
            </span>
            Запустите на FPGA
          </h4>
          <div className="programming-action">
            <button
              data-tour="program"
              className="button primary"
              disabled={
                !target ||
                !validArtifact ||
                running ||
                uartBusy ||
                (source === 'project' && loadingArtifact)
              }
              onClick={() => void program()}
            >
              {receipt?.status === 'running' ? (
                <LoaderCircle size={14} className="spin" />
              ) : (
                <Download size={14} />
              )}{' '}
              {receipt?.status === 'running' ? 'Загрузка…' : 'Загрузить в SRAM'}
            </button>
            {uartConnected && <span>Перед JTAG-проверкой UART будет закрыт.</span>}
          </div>
          {receipt && (
            <div className={`programming-job status-${receipt.status}`} aria-live="polite">
              <div>
                <strong>{receipt.progress.stage}</strong>
                <button
                  className="physical-text-button"
                  onClick={() => setShowLogs((value) => !value)}
                >
                  {showLogs ? 'Скрыть журнал' : 'Журнал'}
                </button>
              </div>
              {receipt.status === 'running' && (
                <progress
                  className="programming-progress"
                  max={100}
                  value={receipt.progress.percent}
                  aria-label="Ход загрузки"
                />
              )}
              <details className="programming-receipt-meta">
                <summary>Подробности загрузки</summary>
                <small>
                  {receipt.projectName} · SHA-256 {receipt.sha256.slice(0, 16)}… · {receipt.device}
                </small>
                {receipt.result && (
                  <p>
                    Status {registerHex(receipt.result.status)} · UserCode{' '}
                    {registerHex(receipt.result.userCode)}
                  </p>
                )}
              </details>
              {receipt.status === 'success' && (
                <p>FPGA подтвердила конфигурацию. Проверьте LED и поведение устройства на плате.</p>
              )}
              {receipt.error && <p role="alert">{receipt.error}</p>}
              {showLogs && (
                <pre className="physical-logs">{receipt.logs || 'Передача ещё не началась.'}</pre>
              )}
            </div>
          )}
        </section>
      </div>
      <div className="programming-setup" hidden={mode !== 'maintenance'}>
        <DebuggerInstaller
          disabled={connecting || romProbing || receipt?.status === 'running' || uartBusy}
          closeUart={closeUart}
          onBusy={setSetupBusy}
          onInstalled={() => {
            setTarget(null);
            setIdentity(null);
            setError('');
            setAdapterKind(null);
          }}
          onConnect={() => void connect()}
        />
        <details className="programming-rom-probe">
          <summary>Диагностика: прочитать BootInfo</summary>
          <p>
            Отключите USB. Зажмите UPDATE за разъёмом HDMI, подключите USB и отпустите кнопку.
            Выберите новый порт «Устройство с последовательным интерфейсом USB» или Bouffalo CDC.
            Проверка читает BootInfo; прошивка отладчика, flash и eFuse сохраняются.
          </p>
          <button
            className="button subtle"
            disabled={!romSerial || running || uartBusy}
            onClick={() => void probeRom()}
          >
            {romProbing ? <LoaderCircle size={13} className="spin" /> : <Usb size={13} />}{' '}
            {romProbing ? romStage : 'Прочитать BootInfo'}
          </button>
          {!romSerial && <p>Нужен браузер с Web Serial через HTTPS или localhost.</p>}
          {romError && <p role="alert">{romError}</p>}
          {romInfo && (
            <div className="programming-rom-result" aria-live="polite">
              <span>
                Ответ ROM получен · USB {romInfo.usbId} · версия {romInfo.version}
              </span>
              <span>
                Подпись IF: {romInfo.signing} · шифрование IF: {romInfo.encryption}
              </span>
              <details>
                <summary>Исходный ответ BootInfo</summary>
                <code>{romInfo.raw}</code>
              </details>
            </div>
          )}
        </details>
      </div>
    </section>
  );
}
