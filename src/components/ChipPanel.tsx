import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Upload, Download, Play, Square, Layers, Map, ChevronRight } from 'lucide-react';
import type { Project, YosysNetlist } from '../../shared/types';
import type { PhysicalResult, PhysicalToolStatus, PlacementTile } from '../../shared/physical';
import { parsePlacement } from '../lib/physical';
import { getResources } from '../lib/netlist';
import { pollJob } from '../lib/job-client';
import { getProjectSnapshot } from '../lib/projects';
import { HelpTrigger } from './HelpCard';
import './physical.css';

interface Props {
  project: Project;
  technology?: YosysNetlist;
  buildId?: string;
  synthesisBusy?: boolean;
  onSynthesize?: () => void;
  onResult?: (result: PhysicalResult | null, sourceSnapshot: string) => void;
}
type MapMode = 'density' | 'routing' | 'category' | 'hierarchy';
const COLORS = ['#db9550', '#7fa47d', '#ca7777', '#a58abd', '#bba36d', '#7caaa2', '#b99a8d'];
const CATEGORIES = ['LUT', 'FF', 'ALU', 'BRAM', 'DSP', 'IO', 'other'] as const;
const STORAGE_KEY = 'yosis.physical.v1';
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
  return result as T;
}
function colorFor(label: string): string {
  let hash = 0;
  for (const code of label) hash = (hash * 31 + code.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}
function dominant(values: string[]): string {
  const counts = new globalThis.Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other';
}
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
  const [mode, setMode] = useState<MapMode>('density');
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
        void fetch(`/api/physical/${active.id}/cancel`, { method: 'POST' }).catch(() => {});
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
        void fetch(`/api/physical/${result.id}/cancel`, { method: 'POST' }).catch(() => {});
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
  const maxDensity =
    map?.tiles.reduce(
      (maximum, tile) =>
        Math.max(maximum, mode === 'routing' ? tile.routingPips : tile.cells.length),
      1,
    ) ?? 1;
  const tileSize = 13,
    mapWidth = map ? (map.maxX + 1) * tileSize : 0,
    mapHeight = map ? (map.maxY + 1) * tileSize : 0;
  const selectedTile = map?.tiles.find((tile) => `${tile.x},${tile.y}` === selected);
  const timings = timingRows(job?.report);
  const stale = snapshot && snapshot !== getProjectSnapshot(project);
  function tileColor(tile: PlacementTile): string {
    if (mode === 'category')
      return COLORS[
        CATEGORIES.indexOf(
          dominant(tile.cells.map((cell) => cell.category)) as (typeof CATEGORIES)[number],
        )
      ];
    if (mode === 'hierarchy') return colorFor(dominant(tile.cells.map((cell) => cell.hierarchy)));
    const count = mode === 'routing' ? tile.routingPips : tile.cells.length;
    return `hsl(${75 - 65 * Math.sqrt(count / maxDensity)} 58% ${66 - (25 * count) / maxDensity}%)`;
  }
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
              <h3>Тепловая карта</h3>
              <select
                aria-label="Режим карты кристалла"
                value={mode}
                onChange={(event) => setMode(event.target.value as MapMode)}
              >
                <option value="density">Плотность ячеек</option>
                <option value="routing">Плотность трассировки</option>
                <option value="category">Тип ресурсов</option>
                <option value="hierarchy">Модули</option>
              </select>
            </div>
            <div className="chip-map-subtitle">
              <span>
                {map.family ?? 'Gowin'} · {artifactName}
              </span>
              <span>
                X: 0–{map.maxX} · Y: 0–{map.maxY}
              </span>
            </div>
            <div className="chip-map-viewport">
              <svg
                role="img"
                aria-label="Тепловая карта размещённых элементов FPGA"
                viewBox={`-16 -16 ${mapWidth + 32} ${mapHeight + 32}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <pattern
                    id="chip-grid"
                    width={tileSize}
                    height={tileSize}
                    patternUnits="userSpaceOnUse"
                  >
                    <rect
                      width={tileSize - 1}
                      height={tileSize - 1}
                      rx="1"
                      fill="var(--chip-empty)"
                    />
                  </pattern>
                </defs>
                <rect width={mapWidth} height={mapHeight} fill="url(#chip-grid)" />
                <text className="chip-axis" x={0} y={-5}>
                  X →
                </text>
                <text className="chip-axis" x={-12} y={8}>
                  Y
                </text>
                {map.tiles.map((tile) => {
                  const count = mode === 'routing' ? tile.routingPips : tile.cells.length;
                  if (!count && (mode === 'density' || mode === 'category' || mode === 'hierarchy'))
                    return null;
                  if (!count && mode === 'routing') return null;
                  return (
                    <rect
                      key={`${tile.x},${tile.y}`}
                      x={tile.x * tileSize}
                      y={tile.y * tileSize}
                      width={tileSize - 1}
                      height={tileSize - 1}
                      rx={1}
                      fill={tileColor(tile)}
                      stroke={selected === `${tile.x},${tile.y}` ? 'var(--text)' : 'none'}
                      strokeWidth={2}
                      tabIndex={0}
                      role="button"
                      aria-label={`X${tile.x} Y${tile.y}: ${tile.cells.length} ячеек, ${tile.routingPips} переходов`}
                      onClick={() => setSelected(`${tile.x},${tile.y}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelected(`${tile.x},${tile.y}`);
                        }
                      }}
                    >
                      <title>{`X${tile.x} Y${tile.y} · ${tile.cells.length} ячеек · ${tile.routingPips} переходов`}</title>
                    </rect>
                  );
                })}
              </svg>
            </div>
            <div className="chip-map-legend">
              {mode === 'density' || mode === 'routing' ? (
                <>
                  <span className="heat-gradient" />
                  <span>
                    1 → {maxDensity} {mode === 'routing' ? 'переходов' : 'ячеек'} на тайл
                  </span>
                </>
              ) : mode === 'category' ? (
                CATEGORIES.map((category, index) => (
                  <span key={category}>
                    <i style={{ background: COLORS[index] }} />
                    {category}
                  </span>
                ))
              ) : (
                [...new Set(map.cells.map((cell) => cell.hierarchy))]
                  .slice(0, 10)
                  .map((hierarchy) => (
                    <span key={hierarchy}>
                      <i style={{ background: colorFor(hierarchy) }} />
                      {hierarchy}
                    </span>
                  ))
              )}
            </div>
            <details className="physical-muted chip-map-caption">
              <summary>Как читать карту?</summary>
              <p>
                Цвет показывает количество элементов или переходов в тайле. Это карта занятости по
                координатам nextpnr. Температура и процент ёмкости тайла не рассчитываются.{' '}
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
