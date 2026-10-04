import { useRef, useState } from 'react';
import {
  BookOpen,
  CircuitBoard,
  Download,
  Folder,
  Link2,
  Plus,
  Save,
  Upload,
  X,
} from 'lucide-react';
import type { BuildResult, Project } from '../../shared/types';
import { downloadText, type ProjectSummary } from '../lib/projects';
import { Dialog } from './Dialog';
import { ExamplesDialog } from './ExamplesDialog';
import { ProjectLibraryDialog } from './ProjectLibraryDialog';
import { ProjectWizard } from './ProjectWizard';
import { examples } from '../lib/examples';
import './project-hub.css';

export interface ProjectHubProps {
  project: Project;
  projects: ProjectSummary[];
  build: BuildResult | null;
  buildFresh: boolean;
  onClose: () => void;
  onCreate: (project: Project) => Promise<void>;
  onOpen: (id: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDuplicate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onImport: () => void;
  onSave: () => Promise<void>;
}

/** One project window owns creation, examples, the library and current-project actions. */
export function ProjectHub(props: ProjectHubProps) {
  const [page, setPage] = useState<'create' | 'library' | 'current'>('create');
  const [start, setStart] = useState<string | null>(null);
  const [catalog, setCatalog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(props.project.name);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const names = props.projects.map((project) => project.name);
  const exportName = props.project.name.replace(/[^A-Za-z0-9_-]/g, '_') || 'project';
  function navigate(next: typeof page) {
    setPage(next);
    setMessage('');
    setError('');
    heading.current?.focus();
  }
  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось выполнить действие.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      className="project-hub"
      backdropClassName="project-hub-backdrop"
      labelledBy="project-hub-heading"
      onClose={props.onClose}
      closeDisabled={busy}
      busy={busy}
      initialFocus="[data-create-choice]"
    >
      <header className="project-hub-heading">
        <Folder size={22} />
        <div>
          <h2 id="project-hub-heading" ref={heading} tabIndex={-1}>
            Проекты
          </h2>
          <p>Создайте своё устройство или продолжите сохранённое</p>
        </div>
        <nav className="project-hub-nav" aria-label="Разделы проектов">
          {(
            [
              ['create', 'Создание', Plus],
              ['library', 'Мои проекты', Folder],
              ['current', 'Текущий проект', Save],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              aria-pressed={page === id}
              disabled={busy}
              onClick={() => navigate(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
        <button
          className="icon-button"
          aria-label="Закрыть проекты"
          disabled={busy}
          onClick={props.onClose}
        >
          <X size={18} />
        </button>
      </header>
      <div className="project-hub-content">
        {page === 'create' &&
          (start ? (
            <ProjectWizard
              key={start}
              embedded
              initialStart={start}
              initialStep={1}
              existingNames={names}
              initialName={start === 'blank' ? undefined : `my-${start}`}
              onBusyChange={setBusy}
              onCreate={props.onCreate}
              onClose={() => {
                setStart(null);
                heading.current?.focus();
              }}
            />
          ) : catalog ? (
            <ExamplesDialog
              embedded
              chooseLabel="Выбрать этот пример"
              onClose={() => setCatalog(false)}
              onChoose={setStart}
            />
          ) : (
            <section className="project-hub-start">
              <h3>С чего начнём?</h3>
              <p>
                Все варианты создают отдельный проект. Текущие исходники сохранятся в библиотеке.
              </p>
              <div className="project-hub-choices">
                <button data-create-choice onClick={() => setStart('blank')}>
                  <Plus size={28} />
                  <strong>С нуля</strong>
                  <span>Напишите Verilog и назначьте физические выводы платы.</span>
                </button>
                <button onClick={() => setStart('schematic')}>
                  <CircuitBoard size={28} />
                  <strong>Из логических элементов</strong>
                  <span>Соберите схему на холсте. Приложение создаст Verilog для сборки.</span>
                </button>
                <button onClick={() => setCatalog(true)}>
                  <BookOpen size={28} />
                  <strong>На основе примера</strong>
                  <span>
                    {examples.length} проектов с комментариями, заданиями и назначенными выводами.
                  </span>
                </button>
                <button
                  onClick={() => {
                    props.onClose();
                    props.onImport();
                  }}
                >
                  <Upload size={28} />
                  <strong>Импорт проекта</strong>
                  <span>Продолжите работу из сохранённого файла JSON.</span>
                </button>
              </div>
            </section>
          ))}
        {page === 'library' && (
          <ProjectLibraryDialog
            embedded
            onBusyChange={setBusy}
            projects={props.projects}
            currentId={props.project.id}
            onClose={props.onClose}
            onOpen={props.onOpen}
            onRename={props.onRename}
            onDuplicate={props.onDuplicate}
            onDelete={props.onDelete}
            onImport={() => {
              props.onClose();
              props.onImport();
            }}
            onCreate={() => {
              setStart(null);
              setCatalog(false);
              navigate('create');
            }}
          />
        )}
        {page === 'current' && (
          <section className="project-hub-current">
            <h3>{props.project.name}</h3>
            <p>
              {props.project.files.length} файлов · верхний модуль <code>{props.project.top}</code>{' '}
              · Tang Nano 20K
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => props.onRename(props.project.id!, name), 'Название сохранено.');
              }}
            >
              <label>
                Название проекта
                <input
                  required
                  maxLength={100}
                  value={name}
                  disabled={busy}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <button type="submit" className="button subtle" disabled={busy}>
                Сохранить название
              </button>
            </form>
            <div className="project-hub-actions">
              <button
                className="button subtle"
                disabled={busy}
                onClick={() => void run(props.onSave, 'Проект сохранён в браузере.')}
              >
                <Save size={16} />
                Сохранить сейчас
              </button>
              <button
                className="button subtle"
                onClick={() =>
                  downloadText(`${exportName}.json`, JSON.stringify(props.project, null, 2))
                }
              >
                <Download size={16} />
                Экспорт проекта JSON
              </button>
              <button
                className="button subtle"
                onClick={() =>
                  void run(
                    () => navigator.clipboard.writeText(window.location.href),
                    'Ссылка скопирована. Для передачи исходников используйте экспорт проекта.',
                  )
                }
              >
                <Link2 size={16} />
                Ссылка на вкладку
              </button>
              <button
                className="button subtle"
                disabled={!props.buildFresh || !props.build?.rtl}
                onClick={() => downloadText('rtl.json', JSON.stringify(props.build?.rtl, null, 2))}
              >
                <Download size={16} />
                Нетлист RTL
              </button>
              <button
                className="button subtle"
                disabled={!props.buildFresh || !props.build?.technology}
                onClick={() =>
                  downloadText('technology.json', JSON.stringify(props.build?.technology, null, 2))
                }
              >
                <Download size={16} />
                Нетлист Gowin
              </button>
            </div>
            <p>
              Изменения сохраняются автоматически. Проекты этого браузера доступны в разделе «Мои
              проекты».
            </p>
          </section>
        )}
      </div>
      {message && (
        <p className="hub-message" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="dialog-error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
