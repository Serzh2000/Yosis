import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { Project } from '../shared/types';
import './components/studio-header.css';
import { BuildLogs } from './components/BuildLogs';
import { StudioGuide } from './components/StudioGuide';
import { StudioHeader } from './components/StudioHeader';
import { StudioNavigation } from './components/StudioNavigation';
import { FileNameDialog } from './components/workspaces/FileNameDialog';
import { MissionHost } from './components/workspaces/MissionHost';
import { PersistentPanels } from './components/workspaces/PersistentPanels';
import { ProjectFilesPane } from './components/workspaces/ProjectFilesPane';
import { ProjectHubHost } from './components/workspaces/ProjectHubHost';
import { ProjectImportControls } from './components/workspaces/ProjectImportControls';
import type { EditorBindings } from './components/workspaces/ProjectSourceEditor';
import { ServerDialogs } from './components/workspaces/ServerDialogs';
import { SourceWorkspaces } from './components/workspaces/SourceWorkspaces';
import { StudioNotices } from './components/workspaces/StudioNotices';
import { StudioStatusBar } from './components/workspaces/StudioStatusBar';
import { useBuild } from './hooks/useBuild';
import { useHardwareState } from './hooks/useHardwareState';
import { useHealth } from './hooks/useHealth';
import { useNetlistSelection, useNetlistView } from './hooks/useNetlistView';
import { useProjectFiles } from './hooks/useProjectFiles';
import { useProjectImport } from './hooks/useProjectImport';
import { useProjectStore } from './hooks/useProjectStore';
import { useProjectSwitch, type OpenProject } from './hooks/useProjectSwitch';
import { useServerSession } from './hooks/useServerSession';
import { useSourceNavigation } from './hooks/useSourceNavigation';
import { useStaleExample } from './hooks/useStaleExample';
import { useStudioRoute } from './hooks/useStudioRoute';
import { useStudioShortcuts } from './hooks/useStudioShortcuts';
import { useTheme } from './hooks/useTheme';
import type { LearningGuide, LearningWorkspace } from './lib/learning-types';
import { loadExample, loadProject } from './lib/projects';
import { linkVcdSignal } from './lib/signal-link';
import { readStudioRoute } from './lib/studio-route';
import { physicalStatus, synthesisStatus } from './lib/studio-status';
import type { VcdSignal } from './lib/vcd';

type MissionPreview = { id: string; vcd: string; snapshot: string; name: string };

/** Композиция студии: состояние живёт в хуках, разметка вкладок — в components/workspaces. */
export default function App() {
  const initialRoute = useRef(readStudioRoute(window.location.href)).current;
  const store = useProjectStore(initialRoute.projectId);
  const { project, setProject, projectRef, projectSnapshot, savedProjects } = store;
  const { ready, saveState, storageError, flushSave } = store;
  const server = useServerSession();
  const { health, healthError, healthLoading, checkHealth } = useHealth();
  const hardware = useHardwareState();
  const [loginOpen, setLoginOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [learningSession, setLearningSession] = useState(0);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [learningGuide, setLearningGuide] = useState<LearningGuide | null>(null);
  const [missionOpen, setMissionOpen] = useState(false);
  const [missionPreview, setMissionPreview] = useState<MissionPreview | null>(null);
  const [projectHubOpen, setProjectHubOpen] = useState(false);
  const [projectHubStart, setProjectHubStart] = useState<string | undefined>();
  const [plannerSignal, setPlannerSignal] = useState('');
  const [logsOpen, setLogsOpen] = useState(false);
  const [logTab, setLogTab] = useState<'logs' | 'diagnostics'>('logs');
  const [showGuide, setShowGuide] = useState(false);

  // Маршрут и импорт открывают проекты через openProject, который объявлен ниже: они получают
  // стабильную обёртку, а ссылка всегда указывает на актуальную версию.
  const openProjectRef = useRef<OpenProject>(async () => {});
  const openProjectForwarded = useCallback<OpenProject>(
    (next, savePrevious) => openProjectRef.current(next, savePrevious),
    [],
  );
  const { workTab, setWorkTab, lessonId, setLessonId, visited } = useStudioRoute({
    initialRoute,
    ready,
    projectId: project.id,
    projectRef,
    openProject: openProjectForwarded,
    onError: setError,
  });
  const files = useProjectFiles({
    project,
    setProject,
    ready,
    workTab,
    setWorkTab,
    onError: setError,
    closeProjectHub: () => setProjectHubOpen(false),
  });
  const { theme, toggleTheme } = useTheme();
  const sourceNav = useSourceNavigation({
    projectRef,
    setWorkTab,
    setActiveFile: files.setActiveFile,
    onError: setError,
  });
  const selection = useNetlistSelection(project.top, workTab);
  const { setSelectedModule, setSelectedCell, setHighlightedSignal } = selection;
  const { build, buildSnapshot, submitting, pollError, busy, elapsed, ...buildActions } = useBuild({
    projectRef,
    ready,
    onError: setError,
    onStart: () => {
      setHighlightedSignal(null);
      setError('');
      setSelectedCell(null);
      setLogTab('logs');
    },
    onResult: (result) => {
      setSelectedModule(result.top);
      if (result.status === 'success') setSelectedCell(null);
      if (result.status === 'error') setLogTab('diagnostics');
    },
  });
  const { startBuild, cancelBuild, resetBuild } = buildActions;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const stale = !!build && !!buildSnapshot && projectSnapshot !== buildSnapshot;
  const existingNames = useMemo(
    () => [project.name, ...savedProjects.map((item) => item.name)],
    [project.name, savedProjects],
  );
  const { staleExample, dismissStaleExample } = useStaleExample(project, ready);
  const netlistView = useNetlistView({
    build,
    project,
    workTab,
    selectedModule: selection.selectedModule,
    selectedCell: selection.selectedCell,
  });
  const imports = useProjectImport({
    openProject: openProjectForwarded,
    busyRef,
    onError: setError,
  });
  useStudioShortcuts({
    startBuild,
    flushSave,
    onEscape: () => {
      files.closeFileDialog();
      setShowGuide(false);
    },
  });
  useEffect(() => {
    if (server.loginRequired) setLoginOpen(true);
  }, [server.loginRequired]);
  useEffect(() => {
    if (!projectHubOpen) setProjectHubStart(undefined);
  }, [projectHubOpen]);

  const { setActiveFile, clearDeletedFile } = files;
  const { clearHighlight } = sourceNav;
  const resetSelectionFor = useCallback(
    (opened: Project) => {
      setActiveFile(opened.files[0].name);
      setSelectedModule(opened.top);
      setSelectedCell(null);
      clearHighlight();
      setHighlightedSignal(null);
      setProjectHubOpen(false);
      clearDeletedFile();
      setWorkTab(opened.files[0].name.endsWith('.ysch') ? 'design' : 'code');
      setPlannerSignal('');
    },
    [
      setActiveFile,
      setSelectedModule,
      setSelectedCell,
      clearHighlight,
      setHighlightedSignal,
      clearDeletedFile,
      setWorkTab,
    ],
  );
  const { openProject, projectSession } = useProjectSwitch({
    busyRef,
    flushSave,
    resetBuild,
    setProject,
    invalidatePendingImports: imports.invalidatePendingImports,
    onOpened: resetSelectionFor,
    onError: setError,
  });
  openProjectRef.current = openProject;

  const exploreLearningWorkspace = (workspace: LearningWorkspace, guide: LearningGuide) => {
    setLearningGuide(guide);
    setWorkTab(
      workspace === 'pins' ? 'constraints' : workspace === 'board' ? 'virtual' : workspace,
    );
  };
  const revealSignal = (signal: VcdSignal) => {
    const link = !stale && build?.rtl && linkVcdSignal(build.rtl, project.top, signal);
    if (!link) return;
    setHighlightedSignal(link);
    setSelectedModule(link.module);
    setSelectedCell(null);
    clearHighlight();
    setWorkTab('rtl');
    setInfo(`Сигнал ${link.name}: подсвечены связи и элементы модуля ${link.module}.`);
  };
  const openServer = () => (server.session ? setSyncOpen(true) : setLoginOpen(true));
  const synthesize = () => void startBuild();
  const serverLabel = server.session ? 'Синхронизация' : 'Войти';
  const editor: EditorBindings = {
    project,
    setProject,
    syntaxAvailable: !!health?.capabilities.synthesis,
    synthesisBusy: busy,
    theme,
    saveState,
    diagnostics: stale ? [] : (build?.diagnostics ?? []),
    onSelectLine: sourceNav.selectLine,
    onMount: sourceNav.mountEditor,
  };
  const showBuildLog = ['code', 'design', 'rtl', 'technology', 'constraints'].includes(workTab);

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
        <MissionHost
          project={project}
          projectSnapshot={projectSnapshot}
          workTab={workTab}
          busy={busy}
          health={health}
          build={build}
          buildSnapshot={buildSnapshot}
          stale={stale}
          selectedCell={selection.selectedCell}
          hardware={hardware}
          existingNames={existingNames}
          savedProjects={savedProjects}
          onPreview={setMissionPreview}
          onClose={() => setMissionOpen(false)}
          onNavigate={setWorkTab}
          onLoad={(next) => void openProject(next)}
          onRestore={(id) =>
            void loadProject(id)
              .then((next) => openProject(next))
              .catch((cause) => setError(cause.message))
          }
          onError={setError}
        />
      )}
      <StudioHeader
        project={project}
        busy={busy}
        submitting={submitting}
        theme={theme}
        showSynthesis={showBuildLog}
        synthesisAvailable={!!health?.capabilities.synthesis}
        healthLoading={healthLoading}
        serverLabel={serverLabel}
        showServer={!server.session?.local}
        onServer={openServer}
        onCode={() => setWorkTab('code')}
        onProjectHub={() => {
          void flushSave().catch(() => {});
          setProjectHubOpen(true);
        }}
        onCancel={() => void cancelBuild()}
        onSynthesize={synthesize}
        onToggleTheme={toggleTheme}
        onGuide={() => setShowGuide(true)}
      />
      <ProjectImportControls imports={imports} />
      <StudioNavigation
        tab={workTab}
        onChange={setWorkTab}
        fileManagerOpen={files.fileManagerOpen}
        filesAvailable={files.usesProjectFiles}
        onToggleFiles={() => files.setFileManagerOpen(!files.fileManagerOpen)}
        constraintsCount={files.constraintsFiles.length}
        schematicAvailable={
          workTab === 'design' || project.files.some((file) => file.name.endsWith('.ysch'))
        }
        synthesisStatus={synthesisStatus(build, busy, stale)}
        physicalStatus={physicalStatus(hardware.physical, projectSnapshot)}
      />

      <StudioNotices
        workTab={workTab}
        error={error}
        healthError={healthError}
        pollError={pollError}
        saveFailed={saveState === 'error'}
        storageError={storageError}
        onCloseError={() => setError('')}
        onReconnect={() => void checkHealth()}
        info={info}
        onCloseInfo={() => setInfo('')}
        staleExample={staleExample}
        onOpenFreshExample={() => {
          if (staleExample) void openProject(loadExample(staleExample.example, existingNames));
        }}
        onDismissStaleExample={dismissStaleExample}
        deletedFile={files.deletedFile}
        onRestoreFile={files.restoreDeletedFile}
        onCloseDeletedFile={files.clearDeletedFile}
        learningGuide={learningGuide}
        onBackToLesson={() => setWorkTab('lessons')}
        onHideGuide={() => setLearningGuide(null)}
      />
      <div
        className={`project-shell ${files.usesProjectFiles && files.fileManagerOpen ? 'files-open' : ''}`}
      >
        {files.usesProjectFiles && (
          <ProjectFilesPane project={project} setProject={setProject} files={files} />
        )}
        <main className="main-workspace">
          <SourceWorkspaces
            workTab={workTab}
            project={project}
            setProject={setProject}
            build={build}
            buildSnapshot={buildSnapshot}
            stale={stale}
            busy={busy}
            health={health}
            files={files}
            editor={editor}
            model={netlistView}
            selection={{
              selectedCell: selection.selectedCell,
              highlightedSignal: selection.highlightedSignal,
              highlightedSource: sourceNav.highlightedSource,
              onSelectCell: setSelectedCell,
              onSelectModule: (name) => {
                setSelectedModule(name);
                setSelectedCell(null);
              },
            }}
            links={sourceNav}
            plannerSignal={plannerSignal}
            setWorkTab={setWorkTab}
            onPins={(signal) => {
              setPlannerSignal(signal);
              setWorkTab('constraints');
            }}
            onNewFromElements={() => {
              setProjectHubStart('schematic');
              setProjectHubOpen(true);
            }}
            onSynthesize={synthesize}
          />
          <PersistentPanels
            visited={visited}
            workTab={workTab}
            project={project}
            setProject={setProject}
            projectSession={projectSession}
            build={build}
            stale={stale}
            busy={busy}
            health={health}
            guidedPreview={missionPreview}
            learning={{
              session: learningSession,
              lessonId,
              onLessonChange: setLessonId,
              onLoadProject: (next) => void openProject(next),
              onExplore: exploreLearningWorkspace,
              onStartMission: () => setMissionOpen(true),
            }}
            hardware={hardware}
            setWorkTab={setWorkTab}
            onSynthesize={synthesize}
            onRevealSignal={revealSignal}
          />
          {showBuildLog && (
            <BuildLogs
              build={build}
              busy={busy}
              elapsed={elapsed}
              logsOpen={logsOpen}
              setLogsOpen={setLogsOpen}
              logTab={logTab}
              setLogTab={setLogTab}
              navigateSource={sourceNav.navigateSource}
            />
          )}
        </main>
      </div>
      <button id="build-shortcut" hidden onClick={synthesize} />
      <StudioStatusBar
        health={health}
        healthLoading={healthLoading}
        busy={busy}
        build={build}
        saveState={saveState}
        top={project.top}
      />

      <ServerDialogs
        loginOpen={loginOpen}
        syncOpen={syncOpen}
        server={server}
        project={project}
        busy={busy}
        onCloseLogin={() => setLoginOpen(false)}
        onCloseSync={() => setSyncOpen(false)}
        onLoggedIn={checkHealth}
        onCourseRestore={() => {
          setLearningSession((value) => value + 1);
          setWorkTab('lessons');
        }}
        openProject={openProject}
      />
      {projectHubOpen && (
        <ProjectHubHost
          store={store}
          setProject={setProject}
          busyRef={busyRef}
          build={build}
          buildFresh={!stale}
          initialStart={projectHubStart}
          serverLabel={serverLabel}
          openProject={openProject}
          onServer={() => {
            setProjectHubOpen(false);
            openServer();
          }}
          onClose={() => setProjectHubOpen(false)}
          onImport={imports.pickProjectFile}
          onImportFolder={imports.pickProjectFolder}
        />
      )}
      {files.fileDialog && (
        <FileNameDialog
          dialog={files.fileDialog}
          error={files.fileError}
          onChange={files.changeFileDialogValue}
          onClose={files.closeFileDialog}
          onSubmit={files.submitFile}
        />
      )}
      {showGuide && <StudioGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}
