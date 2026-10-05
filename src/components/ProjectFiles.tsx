import { useState, type ReactNode } from 'react';
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileCode2,
  Folder,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type { Project, SourceFile } from '../../shared/types';

interface FileTreeNode {
  name: string;
  path: string;
  file?: SourceFile;
  children: FileTreeNode[];
}
function fileTree(files: SourceFile[]): FileTreeNode[] {
  const roots: FileTreeNode[] = [];
  for (const file of files) {
    let siblings = roots;
    const parts = file.name.split('/');
    parts.forEach((name, index) => {
      const path = parts.slice(0, index + 1).join('/');
      let node = siblings.find((item) => item.path === path);
      if (!node) {
        node = { name, path, children: [] };
        siblings.push(node);
      }
      if (index === parts.length - 1) node.file = file;
      siblings = node.children;
    });
  }
  return roots;
}

export interface ProjectFilesProps {
  project: Project;
  activeFile: string;
  onOpen: (file: SourceFile) => void;
  onAdd: () => void;
  onRename: (file: SourceFile) => void;
  onDelete: (file: SourceFile) => void;
  onTopChange: (value: string) => void;
  onClose: () => void;
  children?: ReactNode;
}

function FileBranch({
  node,
  depth,
  props,
}: {
  node: FileTreeNode;
  depth: number;
  props: ProjectFilesProps;
}) {
  const [expanded, setExpanded] = useState(true);
  if (!node.file)
    return (
      <div className="file-folder">
        <button
          className="file-folder-toggle"
          style={{ paddingLeft: 10 + depth * 12 }}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Folder size={14} />
          <span>{node.name}</span>
        </button>
        {expanded &&
          node.children.map((child) => (
            <FileBranch key={child.path} node={child} depth={depth + 1} props={props} />
          ))}
      </div>
    );
  const file = node.file;
  const selected = props.activeFile === file.name;
  const isConstraints = file.name.endsWith('.cst');
  const lastSource =
    /\.(v|sv|ysch)$/.test(file.name) &&
    props.project.files.filter((item) => /\.(v|sv|ysch)$/.test(item.name)).length === 1;
  return (
    <div className={`file-row ${selected ? 'selected' : ''}`}>
      <button
        className="file-select"
        style={{ paddingLeft: 10 + depth * 12 }}
        title={`${file.name} · ${isConstraints ? 'открыть назначения выводов' : file.name.endsWith('.ysch') ? 'открыть конструктор' : 'открыть код'}`}
        aria-label={`Открыть ${file.name}`}
        aria-current={selected ? 'true' : undefined}
        onClick={() => props.onOpen(file)}
      >
        {isConstraints ? <SlidersHorizontal size={15} /> : <FileCode2 size={15} />}
        <span>{node.name}</span>
      </button>
      <div className="file-actions">
        <button
          className="mini-button"
          title="Переименовать"
          aria-label={`Переименовать ${file.name}`}
          onClick={() => props.onRename(file)}
        >
          <Pencil size={12} />
        </button>
        <button
          className="mini-button"
          title="Удалить"
          aria-label={`Удалить ${file.name}`}
          disabled={lastSource}
          onClick={() => props.onDelete(file)}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

/** The same project tree stays mounted while workspace tabs change. */
export function ProjectFiles(props: ProjectFilesProps) {
  return (
    <aside className="explorer project-files" id="project-files" aria-label="Файлы проекта">
      <div className="panel-label">
        <Folder size={15} />
        <span>Файлы проекта</span>
        <button
          className="mini-button"
          aria-label="Добавить файл"
          title="Добавить файл"
          onClick={props.onAdd}
        >
          <Plus size={16} />
        </button>
        <button
          className="mini-button files-close"
          aria-label="Скрыть файлы проекта"
          onClick={props.onClose}
        >
          <X size={15} />
        </button>
      </div>
      <div className="file-list">
        {fileTree(props.project.files).map((node) => (
          <FileBranch key={node.path} node={node} depth={0} props={props} />
        ))}
      </div>
      <label className="section-label" htmlFor="top-module">
        Верхний модуль
      </label>
      <div className="top-input-wrap">
        <Boxes size={15} />
        <input
          id="top-module"
          value={props.project.top}
          onChange={(event) => props.onTopChange(event.target.value)}
          spellCheck={false}
          maxLength={128}
        />
      </div>
      {props.children}
      <div className="sidebar-bottom">
        <Cpu size={21} />
        <strong>Tang Nano 20K</strong>
        <code>GW2A-18C</code>
        <p>.v и .sv — код, .ysch — конструктор, .cst — выводы. Проект сохраняется в браузере.</p>
      </div>
    </aside>
  );
}
