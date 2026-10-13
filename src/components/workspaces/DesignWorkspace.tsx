import { Suspense } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Project, SourceFile } from '../../../shared/types';
import type { SchematicAdditionPlan } from '../../lib/circuit-add';
import { PanelBoundary } from '../PanelBoundary';
import { CircuitEditor } from './lazy-panels';

/** Вкладка «Конструктор»: редактор схемы или объяснение, почему схемы в проекте нет. */
export function DesignWorkspace({
  project,
  circuitSource,
  busy,
  setProject,
  schematicPlan,
  onAddSchematic,
  onPins,
  onNewFromElements,
}: {
  project: Project;
  circuitSource: SourceFile | undefined;
  busy: boolean;
  setProject: Dispatch<SetStateAction<Project>>;
  schematicPlan: SchematicAdditionPlan;
  onAddSchematic: () => void;
  onPins: (signal: string) => void;
  onNewFromElements: () => void;
}) {
  return (
    <div id="panel-design" role="tabpanel" aria-labelledby="tab-design" className="pin-workspace">
      <PanelBoundary name="конструктор схем" resetKey={project.id}>
        <Suspense fallback={<div className="editor-loading">Открываем конструктор…</div>}>
          {circuitSource ? (
            <CircuitEditor
              key={`${project.id}:${circuitSource.name}`}
              project={project}
              source={circuitSource}
              busy={busy}
              onChange={setProject}
              onPins={onPins}
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
                  <button className="button primary" onClick={onAddSchematic}>
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
                onClick={onNewFromElements}
              >
                Новый проект из элементов
              </button>
            </div>
          )}
        </Suspense>
      </PanelBoundary>
    </div>
  );
}
