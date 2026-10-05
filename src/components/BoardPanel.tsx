import { useEffect, useRef, useState } from 'react';
import { Cable, Link2, Unplug, Send, ExternalLink } from 'lucide-react';
import type { Project } from '../../shared/types';
import type { PhysicalResult } from '../../shared/physical';
import { parseCstPins } from '../lib/physical';
import { ProgrammingPanel } from './ProgrammingPanel';
import './physical.css';

interface BrowserSerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}
interface BrowserSerial {
  requestPort(): Promise<BrowserSerialPort>;
  addEventListener(type: 'disconnect', listener: (event: Event) => void): void;
  removeEventListener(type: 'disconnect', listener: (event: Event) => void): void;
}
type SerialNavigator = Navigator & { serial?: BrowserSerial; usb?: unknown };

export function BoardPanel({
  project,
  physical,
  physicalSnapshot = '',
  onOpenChip,
  onIdentity,
  onProgrammed,
}: {
  project: Project;
  physical?: PhysicalResult | null;
  physicalSnapshot?: string;
  onOpenChip?: () => void;
  onIdentity?: (identity: import('../lib/gowin-jtag').JtagIdentity | null) => void;
  onProgrammed?: (snapshot: string) => void;
}) {
  const serial = (navigator as SerialNavigator).serial;
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState<'program' | 'uart' | 'maintenance'>('program');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [programmingBusy, setProgrammingBusy] = useState(false);
  const [baudRate, setBaudRate] = useState(115200);
  const [identity, setIdentity] = useState('');
  const [terminal, setTerminal] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const portRef = useRef<BrowserSerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const mounted = useRef(true);
  const receive = useRef<Promise<void> | null>(null);
  const writePending = useRef<Promise<void> | null>(null);
  const pins = parseCstPins(project.files);

  async function closePort(strict = false) {
    const port = portRef.current;
    portRef.current = null;
    try {
      await readerRef.current?.cancel();
    } catch {
      /* A physically detached port is already closed. */
    }
    try {
      await receive.current;
    } catch {
      /* The reader reports its error in the terminal. */
    }
    try {
      await writePending.current;
    } catch {
      /* A physically detached port may reject an active write. */
    }
    try {
      await port?.close();
    } catch (cause) {
      if (strict) {
        portRef.current = port;
        throw new Error(
          `Не удалось закрыть UART перед загрузкой: ${cause instanceof Error ? cause.message : 'порт занят'}`,
          { cause },
        );
      }
    }
    if (mounted.current) {
      setConnected(false);
      setBusy(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    const disconnected = (event: Event) => {
      if (event.target === portRef.current) {
        setError('USB-порт отключён.');
        void closePort();
      }
    };
    serial?.addEventListener('disconnect', disconnected);
    return () => {
      mounted.current = false;
      serial?.removeEventListener('disconnect', disconnected);
      void closePort();
    };
  }, [serial]);

  async function connect() {
    if (!serial || busy) return;
    setBusy(true);
    setError('');
    let port: BrowserSerialPort | null = null;
    try {
      port = await serial.requestPort();
      if (!mounted.current) return;
      await port.open({ baudRate });
      if (!mounted.current) {
        await port.close();
        return;
      }
      portRef.current = port;
      const info = port.getInfo();
      setIdentity(
        info.usbVendorId === undefined
          ? 'Последовательный порт'
          : `USB ${info.usbVendorId.toString(16).padStart(4, '0')}:${(info.usbProductId ?? 0).toString(16).padStart(4, '0')}`,
      );
      setConnected(true);
      setTerminal('');
      receive.current = (async () => {
        const decoder = new TextDecoder();
        if (!port?.readable) return;
        const reader = port.readable.getReader();
        readerRef.current = reader;
        try {
          while (portRef.current === port) {
            const chunk = await reader.read();
            if (chunk.done) break;
            const text = decoder.decode(chunk.value, { stream: true });
            if (mounted.current) setTerminal((previous) => (previous + text).slice(-32768));
          }
        } catch (cause) {
          if (mounted.current && portRef.current === port)
            setError(cause instanceof Error ? cause.message : 'Ошибка чтения UART.');
        } finally {
          reader.releaseLock();
          if (readerRef.current === reader) readerRef.current = null;
        }
      })();
    } catch (cause) {
      if (mounted.current && !(cause instanceof DOMException && cause.name === 'NotFoundError'))
        setError(cause instanceof Error ? cause.message : 'Не удалось открыть порт.');
      if (port && portRef.current !== port) {
        try {
          await port.close();
        } catch {
          /* Not opened. */
        }
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function send() {
    const port = portRef.current;
    if (!port?.writable || !message || writePending.current) return;
    const line = message;
    setSending(true);
    const pending = (async () => {
      let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
      try {
        writer = port.writable!.getWriter();
        await writer.write(new TextEncoder().encode(`${line}\r\n`));
        if (mounted.current && portRef.current === port)
          setMessage((current) => (current === line ? '' : current));
      } catch (cause) {
        if (mounted.current && portRef.current === port)
          setError(cause instanceof Error ? cause.message : 'Ошибка отправки UART.');
      } finally {
        writer?.releaseLock();
      }
    })();
    writePending.current = pending;
    try {
      await pending;
    } finally {
      if (writePending.current === pending) writePending.current = null;
      if (mounted.current) setSending(false);
    }
  }

  return (
    <section className="physical-workspace board-workspace">
      <header className="physical-heading">
        <div>
          <h2>Подключение платы</h2>
          <p>Tang Nano 20K, кристалл GW2AR-LV18QN88C8/I7</p>
        </div>
        <nav className="board-mode-nav" aria-label="Работа с платой">
          {(
            [
              ['program', 'Загрузить схему'],
              ['uart', 'UART-терминал'],
              ['maintenance', 'Отладчик'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-pressed={view === id}
              disabled={programmingBusy || busy}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <div className="board-single-workspace">
        <div className="board-program-layout" hidden={view === 'uart'}>
          <ProgrammingPanel
            mode={view === 'maintenance' ? 'maintenance' : 'program'}
            onOpenSetup={() => setView('maintenance')}
            project={project}
            physical={physical}
            physicalSnapshot={physicalSnapshot}
            uartConnected={connected}
            uartBusy={busy}
            closeUart={() => closePort(true)}
            onBusyChange={setProgrammingBusy}
            onOpenChip={onOpenChip}
            onIdentity={onIdentity}
            onProgrammed={onProgrammed}
          />
          <aside className="physical-card board-profile-card">
            <h3>Паспорт платы</h3>
            <dl className="board-profile">
              <div>
                <dt>Семейство</dt>
                <dd>GW2A-18C</dd>
              </div>
              <div>
                <dt>Корпус</dt>
                <dd>QN88</dd>
              </div>
              <div>
                <dt>Светодиоды</dt>
                <dd>6 · выводы 15–20</dd>
              </div>
              <div>
                <dt>Кнопки</dt>
                <dd>Выводы 87 / 88</dd>
              </div>
              <div>
                <dt>Назначения .cst</dt>
                <dd>{pins.length}</dd>
              </div>
            </dl>
            <a
              href="https://github.com/YosysHQ/apicula/blob/master/examples/tangnano20k.cst"
              target="_blank"
              rel="noreferrer"
            >
              Распиновка Apicula <ExternalLink size={12} />
            </a>
          </aside>
        </div>
        <section className="physical-card uart-card" hidden={view !== 'uart'}>
          <div className="physical-card-title">
            <Cable size={19} />
            <h3>UART в браузере</h3>
            <span className={`connection-badge ${connected ? 'is-connected' : ''}`}>
              {connected ? 'Подключено' : 'Нет подключения'}
            </span>
          </div>
          <p>
            Выберите USB Serial-порт платы. Терминал читает данные устройства и отправляет строки с
            окончанием CRLF.
          </p>
          <div className="physical-controls">
            <label>
              Скорость
              <select
                aria-label="Скорость UART"
                value={baudRate}
                disabled={connected || busy || programmingBusy}
                onChange={(event) => setBaudRate(Number(event.target.value))}
              >
                {[9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button primary"
              disabled={!serial || busy || programmingBusy}
              onClick={() => (connected ? void closePort() : void connect())}
            >
              {connected ? <Unplug size={15} /> : <Link2 size={15} />}{' '}
              {busy ? 'Подключение…' : connected ? 'Отключить' : 'Выбрать порт'}
            </button>
          </div>
          {!serial && (
            <div className="physical-note">
              Этот браузер не предоставляет Web Serial. Откройте приложение в браузере с поддержкой
              Web Serial (например, Chrome или Edge) на localhost.
            </div>
          )}
          {connected && (
            <small className="physical-muted">
              {identity} · {baudRate} бод
            </small>
          )}
          {error && (
            <div className="physical-error" role="alert">
              {error}
            </div>
          )}
          <pre className="uart-terminal" aria-label="Данные UART">
            {terminal ||
              (connected
                ? 'Порт открыт. Ожидаем данные…'
                : 'Здесь появятся сообщения подключённого устройства.')}
          </pre>
          <form
            className="uart-send"
            onSubmit={(event) => {
              event.preventDefault();
              if (!programmingBusy) void send();
            }}
          >
            <input
              aria-label="Строка для UART"
              placeholder="Строка для устройства"
              value={message}
              maxLength={4096}
              disabled={!connected || programmingBusy}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button
              className="button subtle"
              disabled={!connected || !message || sending || programmingBusy}
            >
              <Send size={15} />
              {sending ? 'Отправка…' : 'Отправить'}
            </button>
            <button type="button" className="button subtle" onClick={() => setTerminal('')}>
              Очистить
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}
