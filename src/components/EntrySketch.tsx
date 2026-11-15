import type { ReactNode } from 'react';

/**
 * The cards of the library keep their examples as short text lines: a waveform drawn with
 * `_ / ‾ \`, a truth table split by `│`, or a plain remark. Here each kind is drawn as what it is
 * (a timing diagram, a table, a caption) instead of showing the raw characters in a code box.
 */
type Part =
  | { kind: 'waves'; rows: { name: string; wave: string; rest: string }[] }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'note'; text: string };

const WAVE = /^(\S{1,6})\s+([_‾/\\]{4,})(.*)$/;

export function parseSketch(lines: readonly string[]): Part[] {
  const parts: Part[] = [];
  for (const line of lines) {
    const wave = WAVE.exec(line);
    const last = parts[parts.length - 1];
    if (wave) {
      const row = { name: wave[1], wave: wave[2], rest: wave[3].trim() };
      if (last?.kind === 'waves') last.rows.push(row);
      else parts.push({ kind: 'waves', rows: [row] });
    } else if (line.includes('│')) {
      const row = line.split('│').map((cell) => cell.trim());
      if (last?.kind === 'table') last.rows.push(row);
      else parts.push({ kind: 'table', rows: [row] });
    } else parts.push({ kind: 'note', text: line.replace(/\s{2,}/g, '  ').trim() });
  }
  return parts;
}

const STEP = 10;
const ROW = 26;
const HIGH = 6;
const LOW = 19;

function wavePath(wave: string, y: number): string {
  const points: string[] = [];
  [...wave].forEach((char, index) => {
    const x = index * STEP;
    const from = char === '_' || char === '/' ? LOW : HIGH;
    const to = char === '_' || char === '\\' ? LOW : HIGH;
    points.push(`${points.length ? 'L' : 'M'}${x},${y + from}`, `L${x + STEP},${y + to}`);
  });
  return points.join(' ');
}

function Waves({ rows }: { rows: { name: string; wave: string; rest: string }[] }) {
  const length = Math.max(...rows.map((row) => row.wave.length));
  const nameWidth = Math.max(...rows.map((row) => row.name.length)) * 8 + 8;
  const width = nameWidth + length * STEP + 4;
  return (
    <div className="sketch-waves">
      <svg viewBox={`0 0 ${width} ${rows.length * ROW}`} role="img" aria-label="Временная диаграмма">
        {rows.map((row, index) => (
          <g key={index} transform={`translate(0,${index * ROW})`}>
            <text className="sketch-name" x={0} y={LOW + 3}>
              {row.name}
            </text>
            <path
              className={`sketch-wave ${/^c?lk$/i.test(row.name) ? 'clock' : ''}`}
              transform={`translate(${nameWidth},0)`}
              d={wavePath(row.wave, 0)}
            />
          </g>
        ))}
      </svg>
      {rows.some((row) => row.rest) && (
        <ul>
          {rows
            .filter((row) => row.rest)
            .map((row, index) => (
              <li key={index}>
                {row.name}: {row.rest.replace(/^[()]|[()]$/g, '')}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

/** «A B │ Y» is three columns when every row has the same number of values. */
export function splitColumns(rows: string[][]): string[][] {
  const split = rows.map((row) => row.flatMap((cell) => cell.split(/\s+/).filter(Boolean)));
  return split.every((row) => row.length === split[0].length) ? split : rows;
}

function Table({ rows }: { rows: string[][] }) {
  const [head, ...body] = splitColumns(rows);
  return (
    <table className="sketch-table">
      <thead>
        <tr>
          {head.map((cell, index) => (
            <th key={index}>{cell}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((row, index) => (
          <tr key={index}>
            {row.map((cell, column) => (
              <td key={column}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EntrySketch({ lines }: { lines: readonly string[] }): ReactNode {
  return (
    <div className="entry-sketch">
      {parseSketch(lines).map((part, index) =>
        part.kind === 'waves' ? (
          <Waves key={index} rows={part.rows} />
        ) : part.kind === 'table' ? (
          <Table key={index} rows={part.rows} />
        ) : (
          <p key={index} className="sketch-note">
            {part.text}
          </p>
        ),
      )}
    </div>
  );
}
