import {
  useCallback,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { CircleHelp, ExternalLink, X } from 'lucide-react';
import { getHelpArticle, type HelpArticle, type HelpSymbol, type HelpTopic } from '../lib/help';
import { Dialog } from './Dialog';
import './help.css';

/** A small, self-contained button: no App-level modal state is necessary. */
export interface HelpTriggerProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'onClick'
> {
  topic: HelpTopic;
  children?: ReactNode;
  showIcon?: boolean;
  ariaLabel?: string;
}

export function HelpTrigger({
  topic,
  children,
  showIcon = true,
  ariaLabel,
  className = '',
  ...props
}: HelpTriggerProps) {
  const [open, setOpen] = useState(false);
  const article = useMemo(() => getHelpArticle(topic), [topic]);
  const close = useCallback(() => setOpen(false), []);
  const label = ariaLabel ?? props['aria-label'] ?? `Справка: ${article.subtitle}`;
  return (
    <>
      <button
        {...props}
        type="button"
        className={`help-trigger ${className}`}
        title={props.title ?? `Что означает ${article.subtitle}?`}
        aria-label={label}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {children ?? article.subtitle}
        {showIcon && <CircleHelp className="help-trigger-icon" size={13} aria-hidden="true" />}
      </button>
      {open && <HelpCard article={article} onClose={close} />}
    </>
  );
}

/** Conventional schematic symbols, with a generic block for specialized hardware. */
export function HelpIllustration({ article }: { article: HelpArticle }) {
  const { symbol, inverted } = article;
  const labels: Partial<Record<HelpSymbol, string>> = {
    mux: 'MUX',
    demux: 'DEMUX',
    register: 'DFF',
    latch: 'LATCH',
    memory: 'RAM',
    arithmetic: 'ALU',
    block: '?',
    parameter: 'N',
  };
  const label = article.symbolLabel ?? labels[symbol] ?? '';
  const gate = ['and', 'or', 'xor', 'not', 'buffer'].includes(symbol);
  const outputX = symbol === 'and' ? 194 : symbol === 'or' || symbol === 'xor' ? 195 : 192;
  return (
    <svg
      className={`help-illustration help-symbol-${symbol}`}
      viewBox="0 0 320 150"
      role="img"
      aria-label={`Схемное обозначение: ${article.title}`}
    >
      {gate && (
        <>
          <path
            className="help-wire"
            d={
              symbol === 'not' || symbol === 'buffer'
                ? 'M40 70 H118'
                : symbol === 'or' || symbol === 'xor'
                  ? 'M40 48 H126 M40 92 H126'
                  : 'M40 48 H118 M40 92 H118'
            }
          />
          {symbol === 'and' ? (
            <path className="help-symbol-body" d="M118 26 H150 A44 44 0 0 1 150 114 H118 Z" />
          ) : symbol === 'or' || symbol === 'xor' ? (
            <>
              <path
                className="help-symbol-body"
                d="M115 26 C156 26 180 48 195 70 C180 92 156 114 115 114 Q144 70 115 26 Z"
              />
              {symbol === 'xor' && <path className="help-wire" d="M104 26 Q133 70 104 114" />}
            </>
          ) : (
            <path className="help-symbol-body" d="M118 26 L192 70 L118 114 Z" />
          )}
          {(inverted || symbol === 'not') && (
            <circle className="help-symbol-bubble" cx={outputX + 6} cy="70" r="6" />
          )}
          <path
            className="help-wire"
            d={`M${outputX + (inverted || symbol === 'not' ? 12 : 0)} 70 H278`}
          />
          <text x="28" y={symbol === 'not' || symbol === 'buffer' ? 74 : 52}>
            A
          </text>
          {symbol !== 'not' && symbol !== 'buffer' && (
            <text x="28" y="96">
              B
            </text>
          )}
          <text x="286" y="74">
            Y
          </text>
        </>
      )}
      {(symbol === 'mux' || symbol === 'demux') && (
        <>
          <path
            className="help-symbol-body"
            d={
              symbol === 'mux' ? 'M120 25 L202 43 V98 L120 116 Z' : 'M120 43 L202 25 V116 L120 98 Z'
            }
          />
          <path
            className="help-wire"
            d={
              symbol === 'mux'
                ? `M42 48 H120 M42 92 H120 M${inverted ? 214 : 202} 70 H278 M161 107 V138`
                : 'M42 70 H120 M202 48 H278 M202 92 H278 M161 107 V138'
            }
          />
          {inverted && <circle className="help-symbol-bubble" cx="208" cy="70" r="6" />}
          <text x="160" y="74" textAnchor="middle">
            {label}
          </text>
          <text x="150" y="149">
            S
          </text>
          <text x="27" y={symbol === 'mux' ? 52 : 74}>
            A
          </text>
          {symbol === 'mux' && (
            <text x="27" y="96">
              B
            </text>
          )}
          <text x="286" y={symbol === 'mux' ? 74 : 52}>
            Y
          </text>
        </>
      )}
      {symbol === 'adder' && (
        <>
          <circle className="help-symbol-body" cx="160" cy="70" r="42" />
          <path className="help-wire" d="M42 48 H124 M42 92 H124 M202 70 H278" />
          <text className="help-operation" x="160" y="80" textAnchor="middle">
            {label || '+'}
          </text>
          <text x="27" y="52">
            A
          </text>
          <text x="27" y="96">
            B
          </text>
          <text x="286" y="74">
            Y
          </text>
        </>
      )}
      {(symbol === 'register' || symbol === 'latch') && (
        <>
          <rect className="help-symbol-body" x="108" y="24" width="100" height="104" rx="2" />
          <path className="help-wire" d="M42 48 H108 M208 48 H278 M42 104 H108" />
          {symbol === 'register' && <path className="help-wire" d="M108 97 L120 104 L108 111" />}
          <text x="120" y="52">
            D
          </text>
          <text x="188" y="52">
            Q
          </text>
          <text x="160" y="81" textAnchor="middle">
            {label}
          </text>
          <text x="124" y="109">
            {symbol === 'register' ? 'CLK' : 'EN'}
          </text>
          <text x="27" y="52">
            D
          </text>
          <text x="286" y="52">
            Q
          </text>
        </>
      )}
      {symbol === 'lut' && (
        <>
          <rect className="help-symbol-body" x="103" y="14" width="110" height="122" rx="4" />
          <path
            className="help-wire"
            d="M42 48 H103 M42 92 H103 M213 70 H278 M103 45 H213 M103 68 H213 M103 91 H213 M158 14 V136"
          />
          <text x="118" y="35">
            BA
          </text>
          <text x="176" y="35">
            Y
          </text>
          {['00', '01', '10', '11'].map((bits, index) => (
            <g key={bits}>
              <text x="118" y={61 + index * 23}>
                {bits}
              </text>
              <text x="179" y={61 + index * 23}>
                {index === 3 ? '1' : '0'}
              </text>
            </g>
          ))}
          <text x="27" y="52">
            A
          </text>
          <text x="27" y="96">
            B
          </text>
          <text x="286" y="74">
            Y
          </text>
        </>
      )}
      {symbol === 'parameter' && (
        <>
          {[
            ['2', '1'],
            ['1', '0'],
            ['0', '1'],
          ].map(([position, bit], index) => (
            <g key={position}>
              <rect
                className="help-symbol-body"
                x={60 + index * 58}
                y="40"
                width="46"
                height="52"
                rx="4"
              />
              <text className="help-operation" x={83 + index * 58} y="75" textAnchor="middle">
                {bit}
              </text>
              <text x={83 + index * 58} y="110" textAnchor="middle">
                [{position}]
              </text>
            </g>
          ))}
          <text className="help-operation" x="259" y="75" textAnchor="middle">
            = 5
          </text>
          <text x="160" y="136" textAnchor="middle">
            пример: число из 3 битов
          </text>
        </>
      )}
      {!gate &&
        !['mux', 'demux', 'adder', 'register', 'latch', 'lut', 'parameter'].includes(symbol) && (
          <>
            <rect className="help-symbol-body" x="106" y="24" width="108" height="104" rx="4" />
            <path className="help-wire" d="M42 48 H106 M42 92 H106 M214 70 H278" />
            <text className="help-operation" x="160" y="82" textAnchor="middle">
              {symbol === 'io' ? 'I/O' : label}
            </text>
            <text x="25" y="52">
              {symbol === 'memory' ? 'ADDR' : 'A'}
            </text>
            <text x="25" y="96">
              {symbol === 'memory' ? 'DATA' : 'B'}
            </text>
            <text x="286" y="74">
              Y
            </text>
          </>
        )}
    </svg>
  );
}

export function HelpCard({ article, onClose }: { article: HelpArticle; onClose: () => void }) {
  const titleId = useId();
  return (
    <Dialog
      className="help-card"
      backdropClassName="help-backdrop"
      labelledBy={titleId}
      onClose={onClose}
    >
      <header className="help-card-header">
        <div>
          <span className="help-card-eyebrow">Справка по схеме</span>
          <code className="help-card-subtitle">{article.subtitle}</code>
          <h2 id={titleId}>{article.title}</h2>
        </div>
        <button className="help-close" type="button" onClick={onClose} aria-label="Закрыть справку">
          <X size={18} />
        </button>
      </header>
      <div className="help-card-body">
        <figure className="help-symbol-figure">
          <HelpIllustration article={article} />
          <figcaption>
            {article.symbol === 'parameter'
              ? 'Параметр задаёт постоянную настройку'
              : article.symbol === 'lut'
                ? 'Пример таблицы для двух входов: AND'
                : 'Условное обозначение · схема работы'}
          </figcaption>
        </figure>
        {article.decodedValue !== undefined && (
          <div className="help-decoded">
            <span>Текущее значение</span>
            <strong>{article.decodedValue}</strong>
            <details>
              <summary>Исходная запись Yosys</summary>
              <code>{article.rawValue}</code>
            </details>
          </div>
        )}
        <div className="help-explanation">
          {article.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        {article.example && (
          <div className="help-example">
            <h3>Пример</h3>
            <pre>
              <code>{article.example}</code>
            </pre>
            <p>Код поясняет операцию. Форма нетлиста после синтеза зависит от всей схемы.</p>
          </div>
        )}
        {!!article.notes?.length && (
          <div className="help-notes">
            <h3>Как читать схему</h3>
            <ul>
              {article.notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <footer className="help-card-footer">
        {article.sources?.map((link) => (
          <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
            {link.title}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        ))}
        <button className="button subtle" type="button" onClick={onClose}>
          Понятно
        </button>
      </footer>
    </Dialog>
  );
}
