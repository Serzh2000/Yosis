import { Fragment, type ReactNode } from 'react';
import { partById } from '../lib/lab/catalog';
import type { Block } from './content/schema';

/** `code` and **bold** inside a line. */
function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/** Limited markdown: paragraphs, bullet lists, **bold** and `code`. */
export function Markdown({ md }: { md: string }) {
  const groups = md.trim().split(/\n{2,}/);
  return (
    <>
      {groups.map((group, index) => {
        const lines = group.split('\n');
        if (lines.every((line) => /^\s*[-•]\s+/.test(line)))
          return (
            <ul key={index}>
              {lines.map((line, i) => (
                <li key={i}>{inline(line.replace(/^\s*[-•]\s+/, ''))}</li>
              ))}
            </ul>
          );
        return <p key={index}>{inline(lines.join(' '))}</p>;
      })}
    </>
  );
}

export function BlockView({
  block,
  chosen,
  onAnswer,
  onInsert,
}: {
  block: Block;
  /** The option picked in a quiz block, if any. */
  chosen?: number;
  onAnswer?: (choice: number) => void;
  onInsert?: (code: string) => void;
}) {
  switch (block.kind) {
    case 'text':
      return (
        <div className="learn-text">
          <Markdown md={block.md} />
        </div>
      );
    case 'image':
      return (
        <figure className="learn-figure">
          <img src={block.src} alt={block.alt} />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    case 'code':
      return (
        <figure className="learn-code">
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
          <pre>
            <code>{block.code}</code>
          </pre>
          {block.insertable && onInsert ? (
            <button type="button" className="button subtle" onClick={() => onInsert(block.code)}>
              В редактор
            </button>
          ) : null}
        </figure>
      );
    case 'quiz': {
      const answered = chosen !== undefined;
      return (
        <div className="learn-quiz">
          <p className="learn-quiz-q">{block.question}</p>
          <div className="learn-quiz-options" role="radiogroup" aria-label={block.question}>
            {block.options.map((option, index) => {
              const state = !answered
                ? ''
                : index === block.answer
                  ? 'right'
                  : index === chosen
                    ? 'wrong'
                    : '';
              return (
                <button
                  key={index}
                  type="button"
                  role="radio"
                  aria-checked={chosen === index}
                  className={`learn-option ${state}`}
                  onClick={() => onAnswer?.(index)}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {answered ? (
            <p className={`learn-quiz-note ${chosen === block.answer ? 'right' : 'wrong'}`}>
              {chosen === block.answer ? 'Верно. ' : 'Пока не то. '}
              {block.explain}
            </p>
          ) : null}
        </div>
      );
    }
    case 'parts':
      return (
        <p className="learn-parts">
          Понадобятся:{' '}
          <strong>
            {block.items
              .map((item) => `${partById.get(item.def)?.title ?? item.def} × ${item.count}`)
              .join(', ')}
          </strong>
          . Они есть в списке слева на столе.
        </p>
      );
  }
}
