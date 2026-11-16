// Оборачивает русские фразы из словаря области (src/i18n/en-*.ts) в t('…') в указанных файлах.
// Запуск: node scripts/i18n-apply.mjs src/components/Foo.tsx …
// Трогает только точные совпадения: значение атрибута, строка JSX-текста целиком, `>фраза<`
// и строковый литерал. Длинные многострочные абзацы переводятся вручную.
import fs from 'node:fs';
import path from 'node:path';

// Словарь области: I18N_DICT=src/i18n/en-chip.ts node scripts/i18n-apply.mjs файлы…
const dictionary = fs.readFileSync(process.env.I18N_DICT ?? 'src/i18n/en-shell.ts', 'utf8');
const keyPattern = /^\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"):/gm;
const keys = [...dictionary.matchAll(keyPattern)]
  .map((match) => (match[1] ?? match[2]).replace(/\\'/g, "'"))
  .sort((a, b) => b.length - a.length);

const quote = (key) => key.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const pattern = (key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const file of process.argv.slice(2)) {
  const original = fs.readFileSync(file, 'utf8');
  let text = original;
  let count = 0;
  const jsx = file.endsWith('.tsx');
  for (const key of keys) {
    const body = pattern(key);
    const wrapped = `t('${quote(key)}')`;
    if (jsx) {
      text = text.replace(new RegExp(`(\\s[\\w-]+)="${body}"`, 'g'), (whole, name) => {
        count++;
        return `${name}={${wrapped}}`;
      });
      text = text.replace(new RegExp(`^(\\s*)${body}(\\s*)$`, 'gm'), (whole, before, after) => {
        count++;
        return `${before}{${wrapped}}${after}`;
      });
      text = text.replace(new RegExp(`>${body}<`, 'g'), () => {
        count++;
        return `>{${wrapped}}<`;
      });
      text = text.replace(
        new RegExp(`(</\\w+>|/>)${body}(?=\\s*(?:<|$))`, 'gm'),
        (whole, before) => {
          count++;
          return `${before}{${wrapped}}`;
        },
      );
    }
    text = text.replace(new RegExp(`(?<!t\\()(['"])${body}\\1`, 'g'), () => {
      count++;
      return wrapped;
    });
  }
  // Литерал в кавычках внутри атрибута уже стал t('…'): снять лишние кавычки.
  text = text.replace(/="t\('((?:\\.|[^'\\])*)'\)"/g, (whole, inner) => `={t('${inner}')}`);
  if (text === original) continue;
  if (!/from '[^']*\/i18n'|from '\.\/i18n'/.test(text)) {
    let relative = path.relative(path.dirname(file), 'src/lib/i18n').replace(/\\/g, '/');
    if (!relative.startsWith('.')) relative = `./${relative}`;
    const lines = text.split('\n');
    let last = -1;
    lines.forEach((line, index) => {
      if (/^import /.test(line) || /^\} from /.test(line)) last = index;
    });
    lines.splice(last + 1, 0, `import { t } from '${relative}';`);
    text = lines.join('\n');
  }
  fs.writeFileSync(file, text);
  console.log(file, count);
}
