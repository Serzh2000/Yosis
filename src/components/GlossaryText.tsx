import { useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { searchGlossary, splitGlossary, type GlossaryTerm } from '../lib/learning-glossary';
import { Dialog } from './Dialog';
import './glossary.css';

/** Text in which the first mention of every glossary term is a tap-to-explain button. */
export function GlossaryText({ text }: { text: string }) {
  const [open, setOpen] = useState<GlossaryTerm | null>(null);
  const parts = splitGlossary(text);
  return (
    <>
      {parts.map((part, index) =>
        typeof part === 'string' ? (
          part
        ) : (
          <button
            key={index}
            type="button"
            className="glossary-term"
            aria-expanded={open?.id === part.term.id}
            title={part.term.meaning}
            onClick={() => setOpen(open?.id === part.term.id ? null : part.term)}
          >
            {part.text}
          </button>
        ),
      )}
      {open && (
        <span className="glossary-pop" role="note">
          <strong>{open.term}.</strong> {open.meaning}
          {open.analogy && <em> {open.analogy}</em>}
          <button type="button" aria-label="Закрыть пояснение" onClick={() => setOpen(null)}>
            <X size={12} />
          </button>
        </span>
      )}
    </>
  );
}

export function GlossaryDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const terms = searchGlossary(query);
  return (
    <Dialog onClose={onClose} labelledBy="glossary-title" className="dialog glossary-dialog">
      <div className="glossary-head">
        <h2 id="glossary-title">Словарь терминов</h2>
        <button className="icon-button" aria-label="Закрыть словарь" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <label className="glossary-search">
        <Search size={14} />
        <input
          autoFocus
          aria-label="Найти термин"
          placeholder="Найти термин…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <dl className="glossary-list">
        {terms.map((term) => (
          <div key={term.id}>
            <dt>{term.term}</dt>
            <dd>
              {term.meaning}
              {term.analogy && <em> {term.analogy}</em>}
            </dd>
          </div>
        ))}
        {!terms.length && <p>Такого термина пока нет в словаре.</p>}
      </dl>
    </Dialog>
  );
}

export function GlossaryButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="glossary-open" onClick={onClick} title="Объяснения слов и терминов">
      <BookOpen size={14} /> Словарь
    </button>
  );
}
