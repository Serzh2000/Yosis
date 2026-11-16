// Ищет в src/ и shared/ русские строки, которые не обёрнуты в t()/tx(): кандидаты для перевода.
// Запуск: node scripts/find-untranslated.mjs [--files] [путь…]
// Комментарии, словари перевода и тесты пропускаются; шумные места (исходный код примеров,
// регулярные выражения, `console`) нужно отсеивать глазами.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const filesOnly = args.includes('--files');
const roots = args.filter((arg) => !arg.startsWith('--'));
const cyrillic = /[А-Яа-яЁё]/;

function* walk(dir) {
  if (fs.statSync(dir).isFile()) {
    yield dir;
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'i18n' || entry.name === 'node_modules') continue;
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) yield full;
  }
}

/** Заменяет комментарии пробелами, сохраняя строки и переводы строк. */
function blank(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const n = source[i + 1];
    if (c === '/' && n === '/') {
      const end = source.indexOf('\n', i);
      const stop = end < 0 ? source.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
    } else if (c === '/' && n === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end < 0 ? source.length : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== c && (c === '`' || source[j] !== '\n'))
        j += source[j] === '\\' ? 2 : 1;
      out += source.slice(i, j + 1);
      i = j + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

const found = new Map();
for (const root of roots.length ? roots : ['src', 'shared']) {
  for (const file of walk(root)) {
    const text = blank(fs.readFileSync(file, 'utf8'));
    const hits = [];
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      if (!cyrillic.test(line)) return;
      // Литералы в кавычках, не завёрнутые в t( / tx(
      for (const m of line.matchAll(/(?<![\w$])(t|tx)\(\s*(['"`])/g)) void m;
      const literal = /(['"`])((?:\\.|(?!\1).)*[А-Яа-яЁё](?:\\.|(?!\1).)*)\1/g;
      for (const match of line.matchAll(literal)) {
        const before = line.slice(0, match.index).trimEnd();
        if (/(?:\bt|\btx|translateServerMessage)\(\s*$/.test(before)) continue;
        if (/tx\([^)]*,\s*$/.test(before)) continue;
        hits.push([index + 1, match[2].slice(0, 70)]);
      }
      // Текст JSX на своей строке
      const trimmed = line.trim();
      if (/^[^<>{}='"`;()]*[А-Яа-яЁё][^<>{}='"`;()]*$/.test(trimmed) && !trimmed.startsWith('*'))
        hits.push([index + 1, trimmed.slice(0, 70)]);
    });
    if (hits.length) found.set(file, hits);
  }
}

let total = 0;
for (const [file, hits] of [...found].sort((a, b) => b[1].length - a[1].length)) {
  total += hits.length;
  if (filesOnly) console.log(String(hits.length).padStart(4), file);
  else {
    console.log(`## ${file} (${hits.length})`);
    for (const [line, text] of hits) console.log(`  ${line}: ${text}`);
  }
}
console.log(`всего: ${total} в ${found.size} файлах`);
