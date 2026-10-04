import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type * as monaco from 'monaco-editor/editor/editor.api.js';
import {
  ArrowRight,
  Braces,
  Circle,
  Cpu,
  FileCode2,
  GitBranch,
  LoaderCircle,
  Play,
  RotateCcw,
  Search,
  X,
  GraduationCap,
} from 'lucide-react';
import type { Project, SourceFile } from '../shared/types';
import type { PhysicalResult } from '../shared/physical';
const Schematic = lazy(() =>
  import('./components/Schematic').then((module) => ({ default: module.Schematic })),
);
const LutInspector = lazy(() =>
  import('./components/LutInspector').then((module) => ({ default: module.LutInspector })),
);
const SimulationPanel = lazy(() =>
  import('./components/SimulationPanel').then((module) => ({ default: module.SimulationPanel })),
);
const VirtualBoardPanel = lazy(() =>
  import('./components/VirtualBoardPanel').then((module) => ({
    default: module.VirtualBoardPanel,
  })),
);
import type { LearningGuide, LearningWorkspace } from './components/LearningPanel';
const LearningPanel = lazy(() =>
  import('./components/LearningPanel').then((module) => ({ default: module.LearningPanel })),
);
const SourceEditor = lazy(() =>
  import('./components/SourceEditor').then((module) => ({ default: module.SourceEditor })),
);
const MissionTour = lazy(() =>
  import('./components/MissionTour').then((module) => ({ default: module.MissionTour })),
);
const ChipPanel = lazy(() =>
  import('./components/ChipPanel').then((module) => ({ default: module.ChipPanel })),
);
const BoardPanel = lazy(() =>
  import('./components/BoardPanel').then((module) => ({ default: module.BoardPanel })),
);
import { ProjectFiles } from './components/ProjectFiles';
const ProjectHub = lazy(() =>
  import('./components/ProjectHub').then((module) => ({ default: module.ProjectHub })),
);
const PinPlanner = lazy(() =>
  import('./components/PinPlanner').then((module) => ({ default: module.PinPlanner })),
);
const CircuitEditor = lazy(() =>
  import('./components/CircuitEditor').then((module) => ({ default: module.CircuitEditor })),
);
import { HelpTrigger } from './components/HelpCard';
import { getHierarchy, getResources } from './lib/netlist';
import { ModuleHierarchyMenu } from './components/ModuleHierarchyMenu';
import './components/studio-header.css';
import { StudioHeader } from './components/StudioHeader';
import { BuildLogs } from './components/BuildLogs';
import { StudioNavigation, type WorkTab } from './components/StudioNavigation';
import { PanelBoundary } from './components/PanelBoundary';
import { Dialog } from './components/Dialog';
import { StudioGuide } from './components/StudioGuide';
import { useProjectStore } from './hooks/useProjectStore';
import { useHealth } from './hooks/useHealth';
import { useBuild } from './hooks/useBuild';
import { useServerSession } from './hooks/useServerSession';
import { ServerLoginDialog } from './components/ServerLoginDialog';
const ServerSyncDialog = lazy(() =>
  import('./components/ServerSyncDialog').then((module) => ({ default: module.ServerSyncDialog })),
);
import { readStudioRoute, studioUrl } from './lib/studio-route';
import { hasSameHdlSources } from './lib/pin-planner';
import { starterCircuit } from '../shared/schematic';
import { linkVcdSignal, type RtlSignalLink } from './lib/signal-link';
import {
  cloneProject,
  examples,
  identifyProject,
  loadExample,
  loadProject,
  validateProject,
} from './lib/projects';
import { planSchematicAddition } from './lib/circuit-add';
import {
  dismissStaleNotice,
  findStaleExampleCopy,
  isStaleNoticeDismissed,
} from './lib/example-origin';

type View = 'rtl' | 'technology';
type FileDialog = { kind: 'add' | 'rename'; value: string; target?: string } | null;
const stages: Record<string, string> = {
  queued: 'Подготовка',
  preparing: 'Подготовка проекта',
  rtl: 'RTL-представление',
  technology: 'Синтез Gowin',
  synthesis: 'Синтез Gowin',
  complete: 'Завершено',
  finished: 'Завершено',
};

export default function App() {
  const initialRoute = useRef(readStudioRoute(window.location.href)).current;
  const {
    project,
    setProject,
    projectRef,
    projectSnapshot,
    savedProjects,
    ready,
    saveState,
    storageError,
    flushSave,
    remove,
    duplicate,
    rename,
  } = useProjectStore(initialRoute.projectId);
  const [projectSession, setProjectSession] = useState(0);
  const { session, loginRequired, login, logout } = useServerSession();
  const [loginOpen, setLoginOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [learningSession, setLearningSession] = useState(0);
  const [activeFile, setActiveFile] = useState(() => project.files[0].name);
  const { health, healthError, healthLoading, checkHealth } = useHealth();
  const [physicalBuild, setPhysicalBuild] = useState<{
    result: PhysicalResult | null;
    snapshot: string;
  }>({ result: null, snapshot: '' });
  const receivePhysicalResult = useCallback(
    (result: PhysicalResult | null, snapshot: string) => setPhysicalBuild({ result, snapshot }),
    [],
  );
  const [selectedModule, setSelectedModule] = useState(project.top);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [highlightedSignal, setHighlightedSignal] = useState<RtlSignalLink | null>(null);
  const [highlightedSource, setHighlightedSource] = useState<{ file: string; line: number }>();
  const [error, setError] = useState('');
  const [workTab, setWorkTab] = useState<WorkTab>(initialRoute.tab);
  const [lessonId, setLessonId] = useState(initialRoute.lessonId);
  const [visited, setVisited] = useState<Set<WorkTab>>(() => new Set([initialRoute.tab]));
  const [info, setInfo] = useState('');
  const [staleNoticeVersion, setStaleNoticeVersion] = useState(0);
  const [learningGuide, setLearningGuide] = useState<LearningGuide | null>(null);
  const [missionOpen, setMissionOpen] = useState(false);
  const [missionPreview, setMissionPreview] = useState<{
    id: string;
    vcd: string;
    snapshot: string;
    name: string;
  } | null>(null);
  const [boardIdentified, setBoardIdentified] = useState(false);
  const [programmedSnapshot, setProgrammedSnapshot] = useState('');
  const receiveBoardIdentity = useCallback(
    (identity: import('./lib/gowin-jtag').JtagIdentity | null) => setBoardIdentified(!!identity),
    [],
  );
  const exploreLearningWorkspace = (workspace: LearningWorkspace, guide: LearningGuide) => {
    setLearningGuide(guide);
    setWorkTab(
      workspace === 'pins' ? 'constraints' : workspace === 'board' ? 'virtual' : workspace,
    );
  };
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('yosis.theme.v1');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* Optional preference. */
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [projectHubOpen, setProjectHubOpen] = useState(false);
  const [projectHubStart, setProjectHubStart] = useState<string | undefined>();
  const [plannerSignal, setPlannerSignal] = useState('');
  const [fileManagerOpen, setFileManagerOpen] = useState(
    () => !window.matchMedia('(max-width: 900px)').matches,
  );
  const [logsOpen, setLogsOpen] = useState(false);
  const [logTab, setLogTab] = useState<'logs' | 'diagnostics'>('logs');
  const [fileDialog, setFileDialog] = useState<FileDialog>(null);
  const [fileError, setFileError] = useState('');
  const [deletedFile, setDeletedFile] = useState<SourceFile | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const pendingNavigation = useRef<{ file: string; line: number } | null>(null);
  const projectSelectionGeneration = useRef(0);
  const activeFileRef = useRef(activeFile);
  activeFileRef.current = activeFile;
  const activeSource = project.files.find((file) => file.name === activeFile) || project.files[0];
  const {
    build,
    buildSnapshot,
    submitting,
    pollError,
    busy,
    elapsed,
    startBuild,
    cancelBuild,
    resetBuild,
  } = useBuild({
    projectRef,
    ready,
    onError: setError,
    onStart: () => {
      setHighlightedSignal(null);
      setError('');
      setSelectedCell(null);
      setLogsOpen(true);
      setLogTab('logs');
    },
    onResult: (result) => {
      setSelectedModule(result.top);
      if (result.status === 'success') setSelectedCell(null);
      if (result.status === 'error') setLogTab('diagnostics');
    },
  });
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const stale = !!build && !!buildSnapshot && projectSnapshot !== buildSnapshot;
  const existingNames = useMemo(
    () => [project.name, ...savedProjects.map((item) => item.name)],
    [project.name, savedProjects],
  );
  const staleCandidate = useMemo(
    () => (ready ? findStaleExampleCopy(project, examples) : null),
    [project, ready],
  );
  // staleNoticeVersion заставляет перечитать признак скрытия после нажатия «Скрыть».
  const staleExample =
    staleNoticeVersion >= 0 &&
    staleCandidate &&
    !isStaleNoticeDismissed(project.id, staleCandidate.currentHash)
      ? staleCandidate
      : null;
  const view: View = workTab === 'technology' ? 'technology' : 'rtl';
  const netlist = view === 'rtl' ? build?.rtl : build?.technology;
  const moduleName = netlist?.modules[selectedModule]
    ? selectedModule
    : netlist?.modules[build?.top || project.top]
      ? build?.top || project.top
      : Object.keys(netlist?.modules || {})[0];
  const hierarchy = useMemo(
    () => (netlist ? getHierarchy(netlist, build?.top || project.top) : null),
    [netlist, build?.top, project.top],
  );
  const resources = useMemo(
    () => (netlist && moduleName ? getResources(netlist, moduleName) : null),
    [netlist, moduleName],
  );
  const currentCell =
    selectedCell && netlist && moduleName
      ? netlist.modules[moduleName]?.cells[selectedCell] || null
      : null;
  const constraintsFiles = project.files.filter((file) => file.name.endsWith('.cst'));
  const constraintsSource =
    constraintsFiles.find((file) => file.name === activeFile) || constraintsFiles[0];
  const circuitSource =
    project.files.find((file) => file.name === activeFile && file.name.endsWith('.ysch')) ??
    project.files.find((file) => file.name.endsWith('.ysch'));
  const hdlSource = project.files.find((file) => /\.(v|sv|vh|svh)$/.test(file.name));
  const usesProjectFiles = workTab === 'code' || workTab === 'constraints';

  useEffect(() => {
    if (loginRequired) setLoginOpen(true);
  }, [loginRequired]);
  useEffect(() => {
    if (ready && !project.files.some((file) => file.name === activeFile))
      setActiveFile(project.files[0].name);
  }, [ready, project.files, activeFile]);

  const openFile = (file: SourceFile) => {
    setActiveFile(file.name);
    setWorkTab(
      file.name.endsWith('.cst') ? 'constraints' : file.name.endsWith('.ysch') ? 'design' : 'code',
    );
    if (window.matchMedia('(max-width: 900px)').matches) setFileManagerOpen(false);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem('yosis.theme.v1', theme);
    } catch {
      /* The theme still works in memory. */
    }
  }, [theme]);

  useEffect(() => {
    setSelectedCell(null);
  }, [workTab]);
  useEffect(() => {
    if (workTab === 'constraints' && constraintsSource && activeFile !== constraintsSource.name)
      setActiveFile(constraintsSource.name);
    if (workTab === 'code' && !/\.(v|sv|vh|svh)$/.test(activeSource.name) && hdlSource)
      setActiveFile(hdlSource.name);
    if (workTab === 'design' && circuitSource && activeFile !== circuitSource.name)
      setActiveFile(circuitSource.name);
  }, [
    workTab,
    activeFile,
    constraintsSource,
    activeSource.name,
    project.files,
    hdlSource,
    circuitSource,
  ]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.defaultPrevented) {
        event.preventDefault();
        void startBuild();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void flushSave().catch(() => {});
      }
      if (event.key === 'Escape') {
        setFileDialog(null);
        setShowGuide(false);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [startBuild, flushSave]);

  const canNavigateSource = useCallback(
    (file: string) => {
      const normalized = file.replaceAll('\\', '/');
      return (
        !normalized.startsWith('/share/') &&
        projectRef.current.files.some(
          (source) => source.name === normalized || normalized.endsWith(`/${source.name}`),
        )
      );
    },
    [projectRef],
  );

  const navigateSource = useCallback(
    (file: string, line: number) => {
      const sourceName = projectRef.current.files.find(
        (source) => source.name === file || file.replaceAll('\\', '/').endsWith(`/${source.name}`),
      )?.name;
      if (!sourceName) {
        setError(`Исходник ${file} отсутствует в текущем проекте.`);
        return;
      }
      pendingNavigation.current = { file: sourceName, line };
      setWorkTab(sourceName.endsWith('.cst') ? 'constraints' : 'code');
      setActiveFile(sourceName);
      setHighlightedSource({ file: sourceName, line });
      window.setTimeout(() => {
        editorRef.current?.revealLineInCenter(line);
        editorRef.current?.setPosition({ lineNumber: line, column: 1 });
        editorRef.current?.focus();
      }, 50);
    },
    [projectRef],
  );

  const openProject = useCallback(
    async (next: Project, savePrevious = true) => {
      if (busyRef.current) return;
      projectSelectionGeneration.current += 1;
      if (savePrevious) {
        try {
          await flushSave();
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : 'Сохранение текущего проекта недоступно.',
          );
          return;
        }
      }
      const identified = identifyProject(next);
      resetBuild();
      setProject(identified);
      setProjectSession((value) => value + 1);
      setActiveFile(identified.files[0].name);
      setSelectedModule(identified.top);
      setSelectedCell(null);
      setHighlightedSource(undefined);
      setHighlightedSignal(null);
      setProjectHubOpen(false);
      setDeletedFile(null);
      setWorkTab(identified.files[0].name.endsWith('.ysch') ? 'design' : 'code');
      setPlannerSignal('');
      setError('');
    },
    [flushSave, resetBuild, setProject],
  );

  const submitNewProject = async (next: Project) => {
    if (busyRef.current) throw new Error('Дождитесь окончания синтеза.');
    await flushSave();
    const identified = identifyProject(next, true);
    await flushSave(identified);
    await openProject(identified, false);
  };
  const renameSavedProject = async (id: string, name: string) => {
    if (id === projectRef.current.id) {
      const next = validateProject({ ...projectRef.current, name });
      await flushSave(next);
      setProject(next);
    } else {
      await rename(id, name);
    }
  };
  useEffect(() => {
    setVisited((previous) => (previous.has(workTab) ? previous : new Set([...previous, workTab])));
    if (ready)
      window.history.replaceState(
        null,
        '',
        studioUrl(window.location.href, workTab, project.id, lessonId),
      );
  }, [workTab, project.id, ready, lessonId]);
  useEffect(() => {
    const restore = () => {
      const route = readStudioRoute(window.location.href);
      setLessonId(route.lessonId);
      if (route.projectId && route.projectId !== projectRef.current.id) {
        void loadProject(route.projectId)
          .then((next) => openProject(next))
          .then(() => setWorkTab(route.tab))
          .catch((cause) => setError(cause.message));
      } else setWorkTab(route.tab);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [ready, openProject, projectRef]);

  const importProject = async (file: File | undefined) => {
    if (!file || busyRef.current) return;
    const generation = ++projectSelectionGeneration.current;
    try {
      if (file.size > 3 * 1024 * 1024) throw new Error('Файл проекта превышает 3 МБ.');
      const next = validateProject(JSON.parse(await file.text()));
      if (generation !== projectSelectionGeneration.current || busyRef.current) return;
      void openProject(identifyProject(next, true));
    } catch (cause) {
      if (generation === projectSelectionGeneration.current)
        setError(cause instanceof Error ? cause.message : 'Не удалось открыть проект.');
    }
    if (importRef.current) importRef.current.value = '';
  };

  const submitFile = (event: FormEvent) => {
    event.preventDefault();
    if (!fileDialog) return;
    const name = fileDialog.value.trim();
    const next = cloneProject(project);
    if (fileDialog.kind === 'rename')
      next.files = next.files.map((file) =>
        file.name === fileDialog.target ? { ...file, name } : file,
      );
    else
      next.files.push({
        name,
        content: name.endsWith('.ysch')
          ? JSON.stringify(starterCircuit(), null, 2)
          : name.endsWith('.cst')
            ? '// IO_LOC "port_name" номер_вывода_FPGA;\n// IO_PORT "port_name" IO_TYPE=LVCMOS33;\n'
            : /\.(vh|svh)$/.test(name)
              ? '// Общие параметры и определения Verilog\n'
              : `module ${name
                  .split('/')
                  .at(-1)!
                  .replace(/\.(v|sv)$/, '')
                  .replace(
                    /[^A-Za-z0-9_]/g,
                    '_',
                  )} (\n    // Добавьте входы и выходы\n);\n\nendmodule\n`,
      });
    try {
      validateProject(next);
    } catch (cause) {
      setFileError(cause instanceof Error ? cause.message : 'Некорректное имя файла.');
      return;
    }
    setProject(next);
    setActiveFile(name);
    setWorkTab(name.endsWith('.cst') ? 'constraints' : name.endsWith('.ysch') ? 'design' : 'code');
    setFileDialog(null);
    setFileError('');
  };

  useEffect(() => {
    if (!projectHubOpen) setProjectHubStart(undefined);
  }, [projectHubOpen]);
  const schematicPlan = useMemo(() => planSchematicAddition(project), [project]);
  const addSchematic = () => {
    const plan = planSchematicAddition(project);
    if (!plan.ok) return;
    const next = cloneProject(project);
    next.files.push({ name: plan.fileName, content: JSON.stringify(starterCircuit(), null, 2) });
    try {
      validateProject(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось добавить схему.');
      return;
    }
    setProject(next);
    setActiveFile(plan.fileName);
    setWorkTab('design');
  };

  const deleteFile = (target = activeSource) => {
    if (
      project.files.length <= 1 ||
      (/\.(v|sv|ysch)$/.test(target.name) &&
        project.files.filter((file) => /\.(v|sv|ysch)$/.test(file.name)).length === 1)
    )
      return;
    setDeletedFile(target);
    const files = project.files.filter((file) => file.name !== target.name);
    setProject({ ...project, files });
    if (target.name === activeFile) {
      const replacement = files[Math.min(project.files.indexOf(target), files.length - 1)];
      setActiveFile(replacement.name);
      if (
        (workTab === 'code' || workTab === 'constraints' || workTab === 'design') &&
        !(workTab === 'constraints' && !files.some((file) => file.name.endsWith('.cst')))
      )
        setWorkTab(
          replacement.name.endsWith('.cst')
            ? 'constraints'
            : replacement.name.endsWith('.ysch')
              ? 'design'
              : 'code',
        );
    }
  };

  const restoreDeletedFile = () => {
    if (!deletedFile) return;
    try {
      const restored = validateProject({ ...project, files: [...project.files, deletedFile] });
      setProject(restored);
      openFile(deletedFile);
      setProjectHubOpen(false);
      setDeletedFile(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось восстановить файл.');
    }
  };

  const resourceRows = resources
    ? ([
        ['LUT', resources.LUT],
        ['FF', resources.FF],
        ['ALU', resources.ALU],
        ['BRAM', resources.BRAM],
        ['DSP', resources.DSP],
        ['I/O', resources.IO],
      ] as const)
    : null;

  const showBuildLog = ['code', 'design', 'rtl', 'technology', 'constraints'].includes(workTab);
  const renderEditor = (source: SourceFile) => (
    <Suspense
      fallback={
        <div className="editor-loading" role="status">
          Загрузка редактора…
        </div>
      }
    >
      <SourceEditor
        source={source}
        project={project}
        syntaxAvailable={!!health?.capabilities.synthesis}
        synthesisBusy={busy}
        projectId={project.id!}
        theme={theme}
        saveState={saveState}
        diagnostics={stale ? [] : (build?.diagnostics ?? [])}
        onChange={(value) =>
          setProject((previous) => ({
            ...previous,
            files: previous.files.map((file) =>
              file.name === source.name ? { ...file, content: value } : file,
            ),
          }))
        }
        onSelectLine={(line) => setHighlightedSource({ file: source.name, line })}
        onMount={(editor) => {
          editorRef.current = editor;
          if (pendingNavigation.current?.file === source.name) {
            const line = pendingNavigation.current.line;
            editor.setPosition({ lineNumber: line, column: 1 });
            editor.revealLineInCenter(line);
            pendingNavigation.current = null;
          }
        }}
      />
    </Suspense>
  );

  if (!ready)
    return (
      <div className="empty-workspace" role="status">
        <LoaderCircle className="spin" size={24} />
        Открываем проекты…
      </div>
    );
  return (
    <div className="studio" data-theme={theme}>
      {missionOpen && (
        <Suspense fallback={null}>
          <MissionTour
            open={missionOpen}
            project={project}
            tab={workTab}
            busy={busy}
            simulationAvailable={!!health?.capabilities.simulation}
            synthesisFresh={
              build?.status === 'success' && !stale && buildSnapshot === projectSnapshot
            }
            selectedCell={selectedCell}
            physicalFresh={
              physicalBuild.result?.status === 'success' &&
              physicalBuild.result.bitstreamAvailable &&
              physicalBuild.snapshot === projectSnapshot
            }
            boardIdentified={boardIdentified}
            programmedSnapshot={programmedSnapshot}
            onPreview={setMissionPreview}
            existingNames={existingNames}
            onClose={() => setMissionOpen(false)}
            onLoad={(next) => {
              void openProject(next);
            }}
            onNavigate={setWorkTab}
            onRestore={(name) => {
              const saved = savedProjects.find((item) => item.name === name);
              if (saved)
                void loadProject(saved.id)
                  .then((next) => openProject(next))
                  .catch((cause) => setError(cause.message));
              else setError('Проект миссии не найден в библиотеке.');
            }}
          />
        </Suspense>
      )}
      <StudioHeader
        project={project}
        busy={busy}
        submitting={submitting}
        theme={theme}
        showSynthesis={showBuildLog}
        synthesisAvailable={!!health?.capabilities.synthesis}
        healthLoading={healthLoading}
        serverLabel={session ? 'Синхронизация' : 'Войти'}
        onServer={() => (session ? setSyncOpen(true) : setLoginOpen(true))}
        onCode={() => setWorkTab('code')}
        onProjectHub={() => {
          void flushSave().catch(() => {});
          setProjectHubOpen(true);
        }}
        onCancel={() => void cancelBuild()}
        onSynthesize={() => void startBuild()}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onGuide={() => setShowGuide(true)}
      />
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => void importProject(event.target.files?.[0])}
      />
      <StudioNavigation
        tab={workTab}
        onChange={setWorkTab}
        fileManagerOpen={fileManagerOpen}
        filesAvailable={usesProjectFiles}
        onToggleFiles={() => setFileManagerOpen(!fileManagerOpen)}
        constraintsCount={constraintsFiles.length}
        synthesisStatus={
          busy
            ? 'busy'
            : stale
              ? 'stale'
              : build?.status === 'success'
                ? 'success'
                : build?.status === 'error'
                  ? 'error'
                  : undefined
        }
        physicalStatus={
          physicalBuild.result?.status === 'success'
            ? physicalBuild.snapshot === projectSnapshot
              ? 'success'
              : 'stale'
            : physicalBuild.result?.status === 'error'
              ? 'error'
              : physicalBuild.result?.status === 'running' ||
                  physicalBuild.result?.status === 'queued'
                ? 'busy'
                : undefined
        }
      />

      {(error || healthError || pollError || saveState === 'error') && (
        <div className="notice error-notice" role="alert">
          <Circle size={12} />
          <span>
            {error ||
              (healthError
                ? `Сервис сборки недоступен: ${healthError}`
                : pollError
                  ? `Связь со сборкой прервана: ${pollError} Повторяем подключение…`
                  : storageError || 'Не удалось сохранить проект в браузере.')}
          </span>
          {healthError && (
            <button onClick={() => void checkHealth()}>
              <RotateCcw size={13} />
              Подключиться
            </button>
          )}
          {error && (
            <button
              className="notice-close"
              aria-label="Закрыть сообщение"
              onClick={() => setError('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      {info && (
        <div className="notice" role="status">
          <span>{info}</span>
          <button
            className="notice-close"
            aria-label="Закрыть сообщение"
            onClick={() => setInfo('')}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {staleExample && (
        <div className="notice" role="status" data-testid="stale-example-notice">
          <span>
            {staleExample.certainty === 'guess' ? 'Похоже, это копия' : 'Это копия'} примера «
            {staleExample.example.title}», а в библиотеке пример с тех пор исправлен. Ваш проект не
            изменён.
          </span>
          <button
            onClick={() => {
              void openProject(loadExample(staleExample.example, existingNames));
            }}
          >
            Открыть свежую копию
          </button>
          <button
            className="notice-close"
            aria-label="Скрыть напоминание об обновлении примера"
            onClick={() => {
              dismissStaleNotice(project.id, staleExample.currentHash);
              setStaleNoticeVersion((value) => value + 1);
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {deletedFile && (
        <div className="notice undo-notice">
          <span>Файл {deletedFile.name} удалён.</span>
          <button onClick={restoreDeletedFile}>
            <RotateCcw size={13} />
            Восстановить
          </button>
          <button
            className="notice-close"
            aria-label="Закрыть сообщение об удалении"
            onClick={() => setDeletedFile(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {learningGuide && workTab !== 'lessons' && (
        <aside className="learning-tutor-dock" aria-label="Наставник">
          <GraduationCap size={18} />
          <div>
            <strong>{learningGuide.title}</strong>
            <span title={learningGuide.tip}>{learningGuide.tip}</span>
          </div>
          <button className="button subtle" onClick={() => setWorkTab('lessons')}>
            Вернуться к уроку
            <ArrowRight size={13} />
          </button>
          <button
            className="icon-button"
            aria-label="Скрыть наставника"
            onClick={() => setLearningGuide(null)}
          >
            <X size={13} />
          </button>
        </aside>
      )}
      <div className={`project-shell ${usesProjectFiles && fileManagerOpen ? 'files-open' : ''}`}>
        {usesProjectFiles && (
          <>
            <button
              className="files-overlay-backdrop"
              aria-label="Закрыть дерево файлов"
              onClick={() => setFileManagerOpen(false)}
            />
            <ProjectFiles
              project={project}
              activeFile={activeFile}
              onOpen={openFile}
              onAdd={() => {
                setFileDialog({ kind: 'add', value: 'module.v' });
                setFileError('');
              }}
              onRename={(file) => {
                setFileDialog({ kind: 'rename', value: file.name, target: file.name });
                setFileError('');
              }}
              onDelete={deleteFile}
              onTopChange={(top) => setProject((previous) => ({ ...previous, top }))}
              onClose={() => setFileManagerOpen(false)}
            />
          </>
        )}
        <main className="main-workspace">
          {workTab === 'code' && (
            <div
              id="panel-code"
              role="tabpanel"
              aria-labelledby="tab-code"
              className="code-workspace"
            >
              <div className="code-main">
                <PanelBoundary name="редактор" resetKey={project.id}>
                  {hdlSource ? (
                    renderEditor(
                      /\.(v|sv|vh|svh)$/.test(activeSource.name) ? activeSource : hdlSource,
                    )
                  ) : (
                    <div className="empty-workspace">
                      <h2>Этот проект описан схемой</h2>
                      <p>Verilog создаётся автоматически из .ysch при сборке.</p>
                      <button className="button primary" onClick={() => setWorkTab('design')}>
                        Открыть конструктор
                      </button>
                    </div>
                  )}
                </PanelBoundary>
              </div>
              <details className="code-guide">
                <summary>О проекте и работе с кодом</summary>
                <div className="code-context">
                  <strong>{project.name}</strong>
                  <button className="button subtle" onClick={() => setProjectHubOpen(true)}>
                    Управление проектом
                  </button>
                  <h2>Код становится схемой</h2>
                  <p>
                    Опишите входы, выходы и связь между ними. Yosys покажет, из каких элементов
                    получается устройство.
                  </p>
                  <div className="workflow-steps">
                    <button onClick={() => setWorkTab('rtl')}>
                      <span>1</span>
                      <div>
                        <strong>Посмотрите RTL</strong>
                        <small>Вентили, мультиплексоры, регистры</small>
                      </div>
                      <ArrowRight size={15} />
                    </button>
                    <button onClick={() => setWorkTab('simulation')}>
                      <span>2</span>
                      <div>
                        <strong>Проверьте сигналы</strong>
                        <small>Такты, сброс и временные диаграммы</small>
                      </div>
                      <ArrowRight size={15} />
                    </button>
                    <button onClick={() => setWorkTab('virtual')}>
                      <span>3</span>
                      <div>
                        <strong>Запустите на виртуальной плате</strong>
                        <small>Управляйте входами и наблюдайте выходы</small>
                      </div>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  <button className="lesson-link" onClick={() => setWorkTab('lessons')}>
                    <GraduationCap size={18} />
                    <span>
                      Не знаете, с чего начать?<strong>Начните курс с наставником</strong>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </details>
            </div>
          )}

          {workTab === 'design' && (
            <div
              id="panel-design"
              role="tabpanel"
              aria-labelledby="tab-design"
              className="pin-workspace"
            >
              <PanelBoundary name="конструктор схем" resetKey={project.id}>
                <Suspense fallback={<div className="editor-loading">Открываем конструктор…</div>}>
                  {circuitSource ? (
                    <CircuitEditor
                      key={`${project.id}:${circuitSource.name}`}
                      project={project}
                      source={circuitSource}
                      busy={busy}
                      onChange={setProject}
                      onPins={(signal) => {
                        setPlannerSignal(signal);
                        setWorkTab('constraints');
                      }}
                    />
                  ) : (
                    <div className="empty-workspace" data-testid="no-schematic">
                      <h2>В этом проекте нет схемы</h2>
                      {schematicPlan.ok ? (
                        <>
                          <p>
                            Проект описан на Verilog. Можно добавить в него схему из элементов: файл{' '}
                            {schematicPlan.fileName} станет модулем «{project.top}».
                          </p>
                          <button className="button primary" onClick={addSchematic}>
                            Добавить схему в этот проект
                          </button>
                        </>
                      ) : (
                        <>
                          <p>{schematicPlan.reason}</p>
                          <p>
                            Безопасный выбор — новый проект из логических элементов: текущий проект
                            останется в библиотеке без изменений.
                          </p>
                        </>
                      )}
                      <button
                        className={schematicPlan.ok ? 'button subtle' : 'button primary'}
                        onClick={() => {
                          setProjectHubStart('schematic');
                          setProjectHubOpen(true);
                        }}
                      >
                        Новый проект из элементов
                      </button>
                    </div>
                  )}
                </Suspense>
              </PanelBoundary>
            </div>
          )}

          {workTab === 'constraints' && (
            <div
              id="panel-constraints"
              role="tabpanel"
              aria-labelledby="tab-constraints"
              className="pin-workspace"
            >
              <PanelBoundary name="назначение выводов" resetKey={project.id}>
                <Suspense fallback={<div className="editor-loading">Открываем выводы…</div>}>
                  <PinPlanner
                    project={project}
                    rtl={hasSameHdlSources(project, buildSnapshot) ? build?.rtl : undefined}
                    busy={busy}
                    onSynthesize={() => void startBuild()}
                    activeFile={constraintsSource?.name}
                    initialSignal={plannerSignal}
                    onChange={setProject}
                    renderEditor={renderEditor}
                  />
                </Suspense>
              </PanelBoundary>
            </div>
          )}

          {(workTab === 'rtl' || workTab === 'technology') && (
            <div
              id={`panel-${workTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${workTab}`}
              className="logic-workspace"
            >
              <section className="schematic-pane">
                <div className="pane-title">
                  <GitBranch size={16} />
                  <span>{view === 'rtl' ? 'RTL-схема' : 'Примитивы Gowin'}</span>
                  <ModuleHierarchyMenu
                    hierarchy={hierarchy}
                    selected={moduleName}
                    onSelect={(name) => {
                      setSelectedModule(name);
                      setSelectedCell(null);
                    }}
                  />
                  <span className="pane-meta">{moduleName || project.top}</span>
                </div>
                {stale && (
                  <div className="stale-banner">
                    <RotateCcw size={14} />
                    <span>Исходники изменены. Схема относится к предыдущей сборке.</span>
                    <button onClick={() => void startBuild()} disabled={busy}>
                      Обновить
                    </button>
                  </div>
                )}
                <div className="schematic-content">
                  {netlist && moduleName ? (
                    <PanelBoundary name="схема" resetKey={project.id}>
                      <Suspense fallback={<div className="editor-loading">Строим схему…</div>}>
                        <Schematic
                          netlist={netlist}
                          moduleName={moduleName}
                          selectedCell={selectedCell}
                          onSelectCell={setSelectedCell}
                          onSourceNavigate={navigateSource}
                          canNavigateSource={canNavigateSource}
                          highlightedSource={highlightedSource}
                          highlightedBits={
                            !stale && view === 'rtl' && highlightedSignal?.module === moduleName
                              ? highlightedSignal.bits
                              : undefined
                          }
                          onSelectModule={(name) => {
                            setSelectedModule(name);
                            setSelectedCell(null);
                          }}
                        />
                      </Suspense>
                    </PanelBoundary>
                  ) : (
                    <div className="empty-workspace">
                      <span className="empty-chip">
                        <Cpu size={46} />
                      </span>
                      <span className="workspace-eyebrow">ОТ VERILOG К ЛОГИКЕ</span>
                      <h2>
                        {busy
                          ? 'Yosys строит схему…'
                          : build?.status === 'error'
                            ? 'Проверьте исходный код'
                            : 'Схема вашего устройства'}
                      </h2>
                      <p>
                        {busy
                          ? 'Готовое представление появится здесь. Ход работы доступен в журнале.'
                          : build?.status === 'error'
                            ? build.error || 'Откройте диагностику сборки.'
                            : view === 'rtl'
                              ? 'Вентили, сумматоры, мультиплексоры и регистры — с привычными схемными обозначениями.'
                              : 'Реальные LUT, триггеры и другие примитивы Gowin. Выберите LUT, чтобы увидеть её таблицу истинности.'}
                      </p>
                      <button
                        className="button primary"
                        disabled={busy || !health?.capabilities.synthesis}
                        onClick={() => void startBuild()}
                      >
                        {busy ? <LoaderCircle size={15} className="spin" /> : <Play size={15} />}
                        Синтезировать проект
                      </button>
                    </div>
                  )}
                </div>
                <div className="schematic-footer">
                  <span>
                    {netlist
                      ? `${Object.keys(netlist.modules[moduleName]?.cells || {}).length} элементов в модуле`
                      : 'Ожидаем результат синтеза'}
                  </span>
                  <span>
                    {view === 'rtl' ? 'До отображения на FPGA' : 'До упаковки и размещения'}
                  </span>
                </div>
              </section>
              <aside className="inspector-pane">
                <div className="pane-title">
                  <Search size={15} />
                  <span>Инспектор</span>
                </div>
                <div className="inspector-scroll">
                  {currentCell ? (
                    <PanelBoundary name="инспектор" resetKey={project.id}>
                      <Suspense fallback={null}>
                        <LutInspector
                          cell={currentCell}
                          cellName={selectedCell}
                          onSourceNavigate={navigateSource}
                          canNavigateSource={canNavigateSource}
                        />
                      </Suspense>
                    </PanelBoundary>
                  ) : (
                    <div className="inspector-intro">
                      <Braces size={27} />
                      <h3>Выберите элемент</h3>
                      <p>Нажмите на схеме, чтобы изучить подключения, параметры и таблицу LUT.</p>
                    </div>
                  )}
                  <div className="resource-section">
                    <div className="section-label">РЕСУРСЫ МОДУЛЯ</div>
                    {resourceRows ? (
                      <>
                        <div className="resource-grid">
                          {resourceRows.map(([label, value]) => (
                            <HelpTrigger
                              topic={{
                                kind: 'resource',
                                resource: label === 'I/O' ? 'IO' : label,
                                view,
                              }}
                              className={value ? 'has-resource' : ''}
                              key={label}
                            >
                              <strong>{value.toLocaleString('ru-RU')}</strong>
                              <span>{label}</span>
                            </HelpTrigger>
                          ))}
                        </div>
                        {resources!.other > 0 && (
                          <HelpTrigger
                            topic={{ kind: 'resource', resource: 'other', view }}
                            className="other-resources"
                          >
                            <span>Другие элементы</span>
                            <strong>{resources!.other}</strong>
                          </HelpTrigger>
                        )}
                        <p className="resource-note">
                          {view === 'rtl'
                            ? 'RTL-операции до технологического синтеза.'
                            : 'После synth_gowin; до упаковки и размещения.'}
                        </p>
                      </>
                    ) : (
                      <p className="resource-note">Подсчёт появится после синтеза.</p>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}

          {visited.has('simulation') && (
            <section
              id="panel-simulation"
              role="tabpanel"
              aria-labelledby="tab-simulation"
              className="full-panel-workspace"
              hidden={workTab !== 'simulation'}
              aria-label="Рабочая область временных диаграмм"
            >
              <PanelBoundary name="simulation" resetKey={project.id}>
                <Suspense
                  fallback={
                    <div className="editor-loading" role="status">
                      Открываем рабочую область…
                    </div>
                  }
                >
                  <SimulationPanel
                    guidedPreview={missionPreview}
                    project={project}
                    projectSession={projectSession}
                    rtl={build?.rtl}
                    onSynthesize={() => void startBuild()}
                    synthesisBusy={busy}
                    available={!!health?.capabilities.simulation}
                    canRevealSignal={(signal) =>
                      !stale && !!build?.rtl && !!linkVcdSignal(build.rtl, project.top, signal)
                    }
                    onRevealSignal={(signal) => {
                      const link =
                        !stale && build?.rtl && linkVcdSignal(build.rtl, project.top, signal);
                      if (!link) return;
                      setHighlightedSignal(link);
                      setSelectedModule(link.module);
                      setSelectedCell(null);
                      setHighlightedSource(undefined);
                      setWorkTab('rtl');
                      setInfo(
                        `Сигнал ${link.name}: подсвечены связи и элементы модуля ${link.module}.`,
                      );
                    }}
                  />
                </Suspense>
              </PanelBoundary>
            </section>
          )}
          {visited.has('virtual') && (
            <section
              id="panel-virtual"
              role="tabpanel"
              aria-labelledby="tab-virtual"
              className="full-panel-workspace"
              hidden={workTab !== 'virtual'}
              aria-label="Рабочая область виртуальной платы"
            >
              <PanelBoundary name="virtual" resetKey={project.id}>
                <Suspense
                  fallback={
                    <div className="editor-loading" role="status">
                      Открываем рабочую область…
                    </div>
                  }
                >
                  <VirtualBoardPanel
                    project={project}
                    rtl={build?.rtl}
                    onSynthesize={() => void startBuild()}
                    synthesisBusy={busy}
                    available={!!health?.capabilities.simulation}
                  />
                </Suspense>
              </PanelBoundary>
            </section>
          )}
          {visited.has('chip') && (
            <section
              id="panel-chip"
              role="tabpanel"
              aria-labelledby="tab-chip"
              className="full-panel-workspace"
              hidden={workTab !== 'chip'}
              aria-label="Рабочая область кристалла"
            >
              <PanelBoundary name="chip" resetKey={project.id}>
                <Suspense
                  fallback={
                    <div className="editor-loading" role="status">
                      Открываем рабочую область…
                    </div>
                  }
                >
                  <ChipPanel
                    project={project}
                    technology={build?.technology}
                    buildId={build?.status === 'success' && !stale ? build.id : undefined}
                    onSynthesize={() => void startBuild()}
                    synthesisBusy={busy}
                    onResult={receivePhysicalResult}
                  />
                </Suspense>
              </PanelBoundary>
            </section>
          )}
          {visited.has('lessons') && (
            <section
              id="panel-lessons"
              role="tabpanel"
              aria-labelledby="tab-lessons"
              className="full-panel-workspace"
              hidden={workTab !== 'lessons'}
              aria-label="Интерактивное обучение"
            >
              <PanelBoundary name="lessons" resetKey={project.id}>
                <Suspense
                  fallback={
                    <div className="editor-loading" role="status">
                      Открываем рабочую область…
                    </div>
                  }
                >
                  <LearningPanel
                    key={learningSession}
                    lessonId={lessonId}
                    onLessonChange={setLessonId}
                    project={project}
                    available={!!health?.capabilities.simulation}
                    projectBusy={busy}
                    onLoadProject={(next) => {
                      void openProject(next);
                    }}
                    onExplore={exploreLearningWorkspace}
                    onStartMission={() => setMissionOpen(true)}
                  />
                </Suspense>
              </PanelBoundary>
            </section>
          )}
          {visited.has('board') && (
            <section
              id="panel-board"
              role="tabpanel"
              aria-labelledby="tab-board"
              className="full-panel-workspace"
              hidden={workTab !== 'board'}
              aria-label="Подключение платы"
            >
              <PanelBoundary name="board" resetKey={project.id}>
                <Suspense
                  fallback={
                    <div className="editor-loading" role="status">
                      Открываем рабочую область…
                    </div>
                  }
                >
                  <BoardPanel
                    project={project}
                    physical={physicalBuild.result}
                    physicalSnapshot={physicalBuild.snapshot}
                    onOpenChip={() => setWorkTab('chip')}
                    onIdentity={receiveBoardIdentity}
                    onProgrammed={setProgrammedSnapshot}
                  />
                </Suspense>
              </PanelBoundary>
            </section>
          )}

          {showBuildLog && (
            <BuildLogs
              build={build}
              busy={busy}
              elapsed={elapsed}
              logsOpen={logsOpen}
              setLogsOpen={setLogsOpen}
              logTab={logTab}
              setLogTab={setLogTab}
              navigateSource={navigateSource}
            />
          )}
        </main>
      </div>
      <button id="build-shortcut" hidden onClick={() => void startBuild()} />
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
          <span>Tang Nano 20K · {project.top}</span>
        </div>
      </footer>

      {loginOpen && (
        <ServerLoginDialog
          onClose={() => setLoginOpen(false)}
          onLogin={async (token) => {
            await login(token);
            await checkHealth();
          }}
        />
      )}
      {syncOpen && session && (
        <Suspense fallback={null}>
          <ServerSyncDialog
            project={project}
            user={session.user}
            canLogout={!session.local && !busy}
            onClose={() => setSyncOpen(false)}
            onLogout={logout}
            onCourseRestore={() => {
              setLearningSession((value) => value + 1);
              setWorkTab('lessons');
            }}
            onOpenCopy={(next) => openProject(identifyProject(next, true))}
          />
        </Suspense>
      )}
      {projectHubOpen && (
        <Suspense fallback={null}>
          <ProjectHub
            project={project}
            projects={savedProjects}
            build={build}
            buildFresh={!stale}
            initialStart={projectHubStart}
            onClose={() => setProjectHubOpen(false)}
            onCreate={submitNewProject}
            onOpen={async (id) => {
              await openProject(await loadProject(id));
            }}
            onImport={() => importRef.current?.click()}
            onSave={async () => {
              await flushSave();
            }}
            onRename={renameSavedProject}
            onDuplicate={async (id, name) => {
              await flushSave();
              await openProject(await duplicate(id, name), false);
            }}
            onDelete={async (id) => {
              await flushSave();
              await remove(id);
              if (projectRef.current.id === id)
                await openProject(identifyProject(examples[0].project, true), false);
            }}
          />
        </Suspense>
      )}
      {fileDialog && (
        <Dialog onClose={() => setFileDialog(null)} labelledBy="file-dialog-heading">
          <form onSubmit={submitFile}>
            <div className="dialog-heading">
              <FileCode2 size={20} />
              <h2 id="file-dialog-heading">
                {fileDialog.kind === 'add' ? 'Новый файл' : 'Переименовать файл'}
              </h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Закрыть"
                onClick={() => setFileDialog(null)}
              >
                <X size={18} />
              </button>
            </div>
            <label htmlFor="filename">Имя файла</label>
            <input
              id="filename"
              autoFocus
              value={fileDialog.value}
              onChange={(event) => setFileDialog({ ...fileDialog, value: event.target.value })}
              placeholder="module.v"
            />
            <p>
              Расширения .v, .sv, .vh, .svh, .cst или .ysch. Можно указать папку, например
              rtl/alu.v.
            </p>
            {fileError && (
              <div className="dialog-error" role="alert">
                {fileError}
              </div>
            )}
            <div className="dialog-actions">
              <button type="button" className="button subtle" onClick={() => setFileDialog(null)}>
                Отмена
              </button>
              <button type="submit" className="button primary">
                {fileDialog.kind === 'add' ? 'Создать файл' : 'Переименовать'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {showGuide && <StudioGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}
