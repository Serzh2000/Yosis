import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Upload, Download, Play, Square, Layers, Map, ChevronRight } from 'lucide-react';
import type { Project, YosysNetlist } from '../../shared/types';
import type { PhysicalResult, PhysicalToolStatus } from '../../shared/physical';
import { parsePlacement } from '../lib/physical';
import { getResources } from '../lib/netlist';
import { request, requestVoid } from '../lib/api';
import { pollJob } from '../lib/job-client';
import { getProjectSnapshot } from '../lib/projects';
import { HelpTrigger } from './HelpCard';
import { ChipMap } from './ChipMap';
import './physical.css';

interface Props {
  project: Project;
  technology?: YosysNetlist;
  buildId?: string;
  synthesisBusy?: boolean;
  onSynthesize?: () => void;
  onResult?: (result: PhysicalResult | null, sourceSnapshot: string) => void;
}
const COLORS = ['#db9550', '#7fa47d', '#ca7777', '#a58abd', '#bba36d', '#7caaa2', '#b99a8d'];
const CATEGORIES = ['LUT', 'FF', 'ALU', 'BRAM', 'DSP', 'IO', 'other'] as const;
const STORAGE_KEY = 'yosis.physical.v1';
function timingRows(report: unknown): { name: string; achieved: number; requested: number }[] {
  if (!report || typeof report !== 'object') return [];
  const fmax = (report as Record<string, unknown>).fmax;
  if (!fmax || typeof fmax !== 'object') return [];
  return Object.entries(fmax).flatMap(([name, raw]) => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    return typeof item.achieved === 'number' && typeof item.constraint === 'number'
      ? [{ name, achieved: item.achieved, requested: item.constraint }]
      : [];
  });
}

export function ChipPanel({
  project,
  technology,
  buildId,
  onSynthesize,
  synthesisBusy,
  onResult,
}: Props) {
  const [status, setStatus] = useState<PhysicalToolStatus | null>(null);
  const [job, setJob] = useState<PhysicalResult | null>(null);
  const jobRef = useRef(job);
  jobRef.current = job;
  const [placement, setPlacement] = useState<unknown>(null);
  const [artifactName, setArtifactName] = useState('');
  const [snapshot, setSnapshot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [frequency, setFrequency] = useState(27);
  const [cstFile, setCstFile] = useState(
    project.files.find((file) => /\.cst$/.test(file.name))?.name ?? '',
  );
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const generation = useRef(0);
  const initialSnapshot = useRef(getProjectSnapshot(project)).current;
  const busy = submitting || job?.status === 'running' || job?.status === 'queued';
  useEffect(() => {
    onResult?.(job, snapshot);
  }, [job, snapshot, onResult]);
  const cstFiles = useMemo(
    () => project.files.filter((file) => /\.cst$/.test(file.name)),
    [project.files],
  );
  useEffect(() => {
    if (!cstFiles.some((file) => file.name === cstFile)) setCstFile(cstFiles[0]?.name ?? '');
  }, [cstFiles, cstFile]);
  useEffect(() => {
    const abort = new AbortController();
    const currentGeneration = generation.current;
    request<{ physical?: PhysicalToolStatus }>('/api/health', { signal: abort.signal })
      .then((health) => {
        if (!abort.signal.aborted)
          setStatus(
            health.physical ?? { available: false, engine: 'nextpnr', bitstreamAvailable: false },
          );
      })
      .catch((cause) => {
        if (!abort.signal.aborted) setError(cause.message);
      });
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as {
        id: string;
        project: string;
      } | null;
      if (saved?.id && saved.project === initialSnapshot) {
        request<PhysicalResult>(`/api/physical/${saved.id}`, { signal: abort.signal })
          .then((result) => {
            if (!abort.signal.aborted && generation.current === currentGeneration) {
              setJob(result);
              setSnapshot(saved.project);
              setFrequency(result.config.frequencyMHz);
              setCstFile(result.config.cstFile);
              if (result.placed) {
                setPlacement(result.placed);
                setArtifactName('placement.json');
              }
            }
          })
          .catch(() => {});
      }
    } catch {
      /* A damaged session cache does not affect saved projects. */
    }
    const dispose = () => {
      generation.current++;
      abort.abort();
      const active = jobRef.current;
      if (active && ['queued', 'running'].includes(active.status)) {
        void requestVoid(`/api/physical/${active.id}/cancel`, { method: 'POST' }).catch(() => {});
      }
    };
    return dispose;
  }, [initialSnapshot]);
  const jobId = job?.id,
    jobStatus = job?.status;
  useEffect(() => {
    if (!jobId || !jobStatus || !['queued', 'running'].includes(jobStatus)) return;
    const initialJob = jobRef.current;
    if (!initialJob || initialJob.id !== jobId) return;
    const abort = new AbortController();
    const currentGeneration = generation.current;
    let timer: ReturnType<typeof setTimeout>;
    let current = initialJob;
    const poll = async () => {
      try {
        const result = await pollJob(`/api/physical/${current.id}`, current, abort.signal);
        if (abort.signal.aborted || generation.current !== currentGeneration) return;
        current = result;
        setJob(result);
        if (result.placed) {
          setPlacement(result.placed);
          setArtifactName('placement.json');
        }
        if (['queued', 'running'].includes(result.status)) timer = setTimeout(poll, 900);
      } catch (cause) {
        if (!abort.signal.aborted && generation.current === currentGeneration) {
          setError(cause instanceof Error ? cause.message : String(cause));
          timer = setTimeout(poll, 2500);
        }
      }
    };
    timer = setTimeout(poll, 300);
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [jobId, jobStatus]);
  async function start() {
    if (!buildId || busy) return;
    const source = getProjectSnapshot(project),
      currentGeneration = ++generation.current;
    setSubmitting(true);
    setError('');
    try {
      const result = await request<PhysicalResult>('/api/physical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, buildId, config: { cstFile, frequencyMHz: frequency } }),
      });
      if (generation.current !== currentGeneration) {
        void requestVoid(`/api/physical/${result.id}/cancel`, { method: 'POST' }).catch(() => {});
        return;
      }
      setJob(result);
      setSnapshot(source);
      setPlacement(null);
      setSelected(null);
      setArtifactName('');
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: result.id, project: source }));
    } catch (cause) {
      if (generation.current === currentGeneration)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (generation.current === currentGeneration) setSubmitting(false);
    }
  }
  async function cancel() {
    if (!job) return;
    const currentGeneration = generation.current;
    try {
      const result = await request<PhysicalResult>(`/api/physical/${job.id}/cancel`, {
        method: 'POST',
      });
      if (generation.current === currentGeneration) setJob(result);
    } catch (cause) {
      if (generation.current === currentGeneration)
        setError(cause instanceof Error ? cause.message : String(cause));
    }
  }
  async function importPlacement(file: File) {
    if (busy) return;
    const currentGeneration = ++generation.current;
    try {
      if (file.size > 64 * 1024 * 1024) throw new Error('JSON размещения превышает 64 МБ.');
      const data = JSON.parse(await file.text());
      parsePlacement(data);
      if (generation.current !== currentGeneration) return;
      setPlacement(data);
      setArtifactName(file.name);
      setSnapshot('');
      setJob(null);
      setSelected(null);
      setError('');
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (cause) {
      if (generation.current === currentGeneration)
        setError(cause instanceof Error ? cause.message : String(cause));
    }
  }
  const parsed = useMemo(() => {
    if (!placement) return { map: null, error: '' };
    try {
      return { map: parsePlacement(placement), error: '' };
    } catch (cause) {
      return { map: null, error: cause instanceof Error ? cause.message : String(cause) };
    }
  }, [placement]);
  const map = parsed.map;
  const resourceCounts = useMemo(
    () => (technology ? getResources(technology, project.top) : null),
    [technology, project.top],
  );
  const selectedTile = map?.tiles.find((tile) => `${tile.x},${tile.y}` === selected);
  const timings = timingRows(job?.report);
  const stale = snapshot && snapshot !== getProjectSnapshot(project);
  return (
    <section className="physical-workspace chip-workspace">
      <section className="physical-card physical-build-card">
        <div className="physical-build-heading">
          <div className="physical-card-title">
            <Activity size={16} />
            <h3>Размещение и трассировка</h3>
            <span className="physical-muted">GW2A-18C</span>
          </div>
          <div className="physical-pipeline">
            <span>Verilog</span>
            <ChevronRight size={12} />
            <span>Gowin</span>
            <ChevronRight size={12} />
            <span className={map ? 'stage-ready' : ''}>nextpnr</span>
            <ChevronRight size={12} />
            <span className={job?.bitstreamAvailable ? 'stage-ready' : ''}>.fs</span>
          </div>
        </div>
        <div className="physical-controls">
          <label>
            Ограничения
            <select
              aria-label="Файл ограничений для размещения"
              value={cstFile}
              onChange={(event) => setCstFile(event.target.value)}
              disabled={busy}
            >
              {!cstFiles.length && <option value="">Добавьте .cst в проект</option>}
              {cstFiles.map((file) => (
                <option key={file.name} value={file.name}>
                  {file.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Частота, МГц
            <input
              type="number"
              aria-label="Целевая частота"
              min={1}
              max={500}
              step="any"
              value={frequency}
              disabled={busy}
              onChange={(event) => setFrequency(Number(event.target.value))}
            />
          </label>
          {busy ? (
            <button className="button stop" onClick={() => void cancel()}>
              <Square size={14} />
              Остановить
            </button>
          ) : (
            <button
              className="button primary"
              disabled={
                !status?.available || !buildId || !cstFile || frequency < 1 || frequency > 500
              }
              data-tour="place"
              onClick={() => void start()}
            >
              <Play size={14} />
              Разместить и собрать
            </button>
          )}
          <button
            className="button subtle"
            disabled={busy}
            onClick={() => uploadRef.current?.click()}
          >
            <Upload size={14} />
            Открыть nextpnr JSON
          </button>
          <input
            ref={uploadRef}
            type="file"
            hidden
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importPlacement(file);
              event.target.value = '';
            }}
          />
        </div>
        {!technology && (
          <p className="physical-muted">
            Сначала выполните синтез проекта.
            {onSynthesize && (
              <button
                className="physical-text-button"
                onClick={onSynthesize}
                disabled={synthesisBusy}
              >
                Синтезировать
              </button>
            )}
          </p>
        )}
        {status && !status.available && (
          <p className="physical-note">
            {status.error ?? 'nextpnr пока недоступен.'} Карта также открывает готовые результаты{' '}
            <code>nextpnr --write</code>.
          </p>
        )}
        {job && (
          <div className={`physical-job-status status-${job.status}`} role="status">
            <span>{job.stage}</span>
            {job.elapsedMs && <small>{(job.elapsedMs / 1000).toFixed(1)} с</small>}
            <button className="physical-text-button" onClick={() => setShowLogs((value) => !value)}>
              {showLogs ? 'Скрыть журнал' : 'Журнал'}
            </button>
            {job.placed && (
              <a
                className="physical-text-button"
                href={`/api/physical/${job.id}/artifacts/placement.json`}
                download
              >
                <Download size={13} /> JSON
              </a>
            )}
            {job.bitstreamAvailable && (
              <a
                className="physical-text-button"
                href={`/api/physical/${job.id}/artifacts/design.fs`}
                download
              >
                <Download size={13} /> Битстрим .fs
              </a>
            )}
          </div>
        )}
        {showLogs && <pre className="physical-logs">{job?.logs || 'Журнал пока пуст.'}</pre>}
        {(error || job?.error || parsed.error) && (
          <div className="physical-error" role="alert">
            {error || job?.error || parsed.error}
          </div>
        )}
        {stale && (
          <p className="physical-note">
            Карта относится к предыдущей версии проекта. Повторите синтез и размещение после
            изменения файлов.
          </p>
        )}
      </section>
      {resourceCounts && (
        <div className="physical-resources" role="group" aria-label="Ресурсы проекта после синтеза">
          {CATEGORIES.map((category) => (
            <HelpTrigger
              key={category}
              topic={{ kind: 'resource', resource: category, view: 'technology' }}
            >
              <span>{category === 'other' ? 'Другие' : category}</span>
              <strong>{resourceCounts[category]}</strong>
            </HelpTrigger>
          ))}
        </div>
      )}
      {map ? (
        <div className="chip-layout">
          <section className="physical-card chip-map-card">
            <div className="physical-card-title">
              <Map size={18} />
              <h3>Карта размещения на кристалле</h3>
            </div>
            <ChipMap
              map={map}
              artifactName={artifactName}
              selected={selected}
              onSelect={setSelected}
            />
            <details className="physical-muted chip-map-caption">
              <summary>Как читать карту?</summary>
              <p>
                Кристалл разбит на тайлы, у каждого есть координаты X и Y из nextpnr. Цвет тайла
                показывает, какого ресурса в нём больше всего, а полоска внизу тайла: сколько связей
                проходит через него. Это карта занятости по координатам. Температура, мощность и
                процент ёмкости тайла не рассчитываются.{' '}
                {map.fullChipBounds
                  ? 'Границы 56 × 55 тайлов взяты из базы GW2A-18C Apicula.'
                  : 'Граница показана по максимальным координатам артефакта.'}
              </p>
            </details>
          </section>
          <aside className="chip-sidebar">
            <section className="physical-card">
              <div className="physical-card-title">
                <Layers size={18} />
                <h3>
                  {selectedTile ? `Тайл X${selectedTile.x} Y${selectedTile.y}` : 'Выберите тайл'}
                </h3>
              </div>
              {selectedTile ? (
                <>
                  <p>
                    {selectedTile.cells.length} ячеек · {selectedTile.routingPips} переходов
                    трассировки
                  </p>
                  <ul className="chip-cell-list">
                    {selectedTile.cells.slice(0, 200).map((cell) => (
                      <li key={cell.name}>
                        <HelpTrigger
                          className="chip-cell-type"
                          topic={{ kind: 'primitive', type: cell.type }}
                        >
                          {cell.type}
                        </HelpTrigger>
                        <code>{cell.bel}</code>
                        <span title={cell.name}>{cell.name}</span>
                        <small>{cell.hierarchy}</small>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>
                  Нажмите на окрашенную ячейку карты, чтобы увидеть физические элементы и их имена.
                </p>
              )}
            </section>
            <section className="physical-card">
              <h3>Результат nextpnr</h3>
              <dl className="board-profile">
                <div>
                  <dt>Размещено</dt>
                  <dd>{map.cells.length}</dd>
                </div>
                <div>
                  <dt>Тайлов с ячейками</dt>
                  <dd>{map.tiles.filter((tile) => tile.cells.length).length}</dd>
                </div>
                <div>
                  <dt>Переходов</dt>
                  <dd>{map.routingPips}</dd>
                </div>
              </dl>
              {map.warnings.map((warning) => (
                <p className="physical-note" key={warning}>
                  {warning}
                </p>
              ))}
              {timings.map((timing) => (
                <div className="timing-result" key={timing.name}>
                  <strong>{timing.name}</strong>
                  <span>
                    {timing.achieved.toFixed(2)} / {timing.requested.toFixed(2)} МГц
                  </span>
                  <small>
                    {timing.achieved >= timing.requested
                      ? 'Частота достигнута'
                      : 'Частота не достигнута'}
                  </small>
                </div>
              ))}
            </section>
          </aside>
        </div>
      ) : (
        <section className="physical-card chip-empty-state">
          <Map size={55} strokeWidth={1} />
          <h3>Где ваша логика окажется в FPGA?</h3>
          <p>
            После nextpnr здесь появятся реальные координаты LUT, триггеров, блоков памяти и
            выводов. Переключайте слои, исследуйте плотность и проваливайтесь в отдельный тайл.
          </p>
          <div className="chip-preview-legend">
            <span>
              <i style={{ background: COLORS[0] }} />
              LUT
            </span>
            <span>
              <i style={{ background: COLORS[1] }} />
              Регистры
            </span>
            <span>
              <i style={{ background: COLORS[3] }} />
              Память
            </span>
            <span>
              <i style={{ background: COLORS[5] }} />
              Выводы
            </span>
          </div>
        </section>
      )}
    </section>
  );
}
