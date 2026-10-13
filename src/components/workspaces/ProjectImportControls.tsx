import type { useProjectImport } from '../../hooks/useProjectImport';
import { Dialog } from '../Dialog';

/** Скрытые поля выбора файла и папки проекта и окно выбора, если в папке несколько проектов. */
export function ProjectImportControls({
  imports,
}: {
  imports: ReturnType<typeof useProjectImport>;
}) {
  const { folderChoice } = imports;
  return (
    <>
      <input
        ref={imports.importRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => void imports.importProject(event.target.files?.[0])}
      />
      <input
        ref={(element) => {
          imports.folderRef.current = element;
          // React has no typed attribute for choosing a folder.
          element?.setAttribute('webkitdirectory', '');
        }}
        type="file"
        multiple
        hidden
        onChange={(event) => void imports.importFolder(event.target.files)}
      />
      {folderChoice && (
        <Dialog
          title="В папке несколько проектов"
          className="dialog folder-choice"
          onClose={imports.closeFolderChoice}
        >
          <p>Выберите, какой открыть. Каждый проект — это отдельный файл .gprj.</p>
          <ul>
            {folderChoice.projects.map((item) => (
              <li key={item.path}>
                <button
                  type="button"
                  className="button subtle"
                  onClick={() => imports.chooseFolderProject(item.path)}
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </>
  );
}
