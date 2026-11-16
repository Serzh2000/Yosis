import fs from 'node:fs';

// Использование: node scripts/_add-dict.mjs <файл словаря> <файл с объектом JSON>
const [dictFile, jsonFile] = process.argv.slice(2);
const add = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
let source = fs.readFileSync(dictFile, 'utf8').replace(/\r\n/g, '\n');
let count = 0;
const lines = Object.entries(add)
  .filter(([key]) => !source.includes(JSON.stringify(key).slice(1, -1)))
  .map(([key, value]) => {
    count++;
    return `  ${JSON.stringify(key)}: ${JSON.stringify(value)},\n`;
  })
  .join('');
source = source.replace(/\n};\s*$/, '\n' + lines + '};\n');
fs.writeFileSync(dictFile, source);
console.log('added', count, 'to', dictFile);
