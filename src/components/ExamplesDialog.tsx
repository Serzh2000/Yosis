import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Search, X } from 'lucide-react';
import { examples } from '../lib/examples';
import { filterExampleCatalog } from '../lib/example-catalog';
import {
  curriculumLevels,
  curriculumTopics,
  getExampleLesson,
  type CurriculumLevel,
  type CurriculumTopic,
} from '../lib/example-curriculum';
import { Dialog } from './Dialog';
import './examples-dialog.css';

export function ExamplesDialog({
  onChoose,
  onClose,
  embedded = false,
  chooseLabel = 'Открыть проект',
}: {
  onChoose: (id: string) => void;
  onClose: () => void;
  embedded?: boolean;
  chooseLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<CurriculumLevel | 'all'>(1);
  const [topic, setTopic] = useState<CurriculumTopic | 'all'>('all');
  const [selectedId, setSelectedId] = useState('button');
  const filtered = useMemo(
    () => filterExampleCatalog(examples, { query, level, topic }),
    [query, level, topic],
  );
  const selected = filtered.find((example) => example.id === selectedId) ?? filtered[0];
  const lesson = selected && getExampleLesson(selected.id);
  const activeLevel = curriculumLevels.find((item) => item.id === level);
  const levelCounts = useMemo(
    () =>
      curriculumLevels.map(
        (item) =>
          examples.filter((example) => getExampleLesson(example.id)?.level === item.id).length,
      ),
    [],
  );
  const topicCounts = useMemo(
    () =>
      curriculumTopics.map(
        (item) =>
          examples.filter((example) => {
            const metadata = getExampleLesson(example.id);
            return metadata?.topic === item.id && (level === 'all' || metadata.level === level);
          }).length,
      ),
    [level],
  );

  const resetFilters = () => {
    setQuery('');
    setLevel('all');
    setTopic('all');
  };
  function showPrerequisite(id: string) {
    resetFilters();
    setSelectedId(id);
  }

  return (
    <Dialog
      embedded={embedded}
      className="examples-dialog"
      backdropClassName="examples-backdrop"
      labelledBy="examples-heading"
      onClose={onClose}
      initialFocus="input"
    >
      <header className="examples-heading">
        <BookOpen size={23} />
        <div>
          <h2 id="examples-heading">
            Мастерская примеров <span>{examples.length}</span>
          </h2>
          <p>От первого вентиля до обработки сигналов и своего процессора</p>
        </div>
        <button
          type="button"
          className={embedded ? 'button subtle' : 'icon-button'}
          aria-label={embedded ? 'К выбору начала' : 'Закрыть примеры'}
          onClick={onClose}
        >
          {embedded ? (
            <>
              <ArrowLeft size={14} />К выбору начала
            </>
          ) : (
            <X size={19} />
          )}
        </button>
      </header>
      <nav className="example-levels" aria-label="Уровни сложности">
        <button
          type="button"
          aria-pressed={level === 'all'}
          onClick={() => {
            setLevel('all');
            setTopic('all');
          }}
        >
          <span>Все уровни</span>
          <small>{examples.length}</small>
        </button>
        {curriculumLevels.map((item, index) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={level === item.id}
            onClick={() => {
              setLevel(item.id);
              setTopic('all');
            }}
          >
            <b>{item.id}</b>
            <span>{item.title}</span>
            <small>{levelCounts[index]}</small>
          </button>
        ))}
      </nav>
      <div className="examples-filters">
        <label className="examples-search">
          <Search size={15} />
          <input
            aria-label="Найти пример"
            placeholder="Название, тема или чему хотите научиться…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="examples-topic">
          <span>Тема</span>
          <select
            aria-label="Тема примеров"
            value={topic}
            onChange={(event) => setTopic(event.target.value as CurriculumTopic | 'all')}
          >
            <option value="all">Все темы</option>
            {curriculumTopics.map((item, index) => (
              <option key={item.id} value={item.id} disabled={!topicCounts[index]}>
                {item.title} · {topicCounts[index]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="examples-results">
        <span>
          {activeLevel
            ? activeLevel.description
            : 'Выберите тему или изучайте примеры по учебному порядку.'}
        </span>
        <strong aria-live="polite">Найдено: {filtered.length}</strong>
      </div>
      <div className="examples-content">
        <div className="examples-grid" aria-label="Примеры в учебном порядке">
          {filtered.map((example) => {
            const metadata = getExampleLesson(example.id)!;
            return (
              <button
                type="button"
                className="example-card"
                key={example.id}
                aria-pressed={selected?.id === example.id}
                onClick={() => setSelectedId(example.id)}
              >
                <div className="example-card-heading">
                  <span className="example-level-badge">Уровень {metadata.level}</span>
                  <span>{curriculumTopics.find((item) => item.id === metadata.topic)?.title}</span>
                  {selected?.id === example.id && <Check size={13} />}
                </div>
                <h3>{example.title}</h3>
                <p>{example.description}</p>
                <footer>
                  <code>Verilog + CST</code>
                  <span>{example.project.files.length} файла</span>
                </footer>
              </button>
            );
          })}
          {!filtered.length && (
            <div className="examples-no-results">
              <strong>В этом сочетании примеров нет</strong>
              <p>Измените тему, уровень или поисковый запрос.</p>
              <button className="button subtle" onClick={resetFilters}>
                Показать все примеры
              </button>
            </div>
          )}
        </div>
        {selected && lesson && (
          <aside className="example-lesson" aria-label="О выбранном примере">
            <div className="example-lesson-title">
              <span>
                Уровень {lesson.level} ·{' '}
                {curriculumTopics.find((item) => item.id === lesson.topic)?.title}
              </span>
              <h3>{selected.title}</h3>
              <button
                type="button"
                className="button primary example-open"
                onClick={() => onChoose(selected.id)}
              >
                {chooseLabel} <ArrowRight size={14} />
              </button>
              <small>Своя копия · Verilog и .cst</small>
            </div>
            <div>
              <h4>Чему научитесь</h4>
              <p>{lesson.objective}</p>
            </div>
            <div>
              <h4>Посмотрите на диаграммах</h4>
              <p>{lesson.observe}</p>
            </div>
            <div>
              <h4>Попробуйте изменить</h4>
              <p>{lesson.experiment}</p>
            </div>
            <div className="example-prerequisites">
              <h4>До этого полезно пройти</h4>
              {lesson.prerequisites.length ? (
                lesson.prerequisites.map((id) => (
                  <button type="button" key={id} onClick={() => showPrerequisite(id)}>
                    {examples.find((example) => example.id === id)?.title}
                    <ArrowRight size={12} />
                  </button>
                ))
              ) : (
                <p>Можно начинать с этого примера.</p>
              )}
            </div>
          </aside>
        )}
      </div>
      <footer className="examples-footer">
        Уровень определяется нужными знаниями. Переходы к предыдущим примерам помогут заполнить
        пробелы.
      </footer>
    </Dialog>
  );
}
