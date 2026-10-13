// @ts-check
/** @typedef {import('../shared/types').Project} Project */
/** @typedef {import('../shared/types').SourceFile} SourceFile */

// Makes sources written for the vendor's tools digestible for Yosys without changing what the
// pupil sees in the editor: the rewrite happens only in the copy handed to synthesis.

const REAL_LITERAL =
  /(?<![\w.$])\d[\d_]*\.\d[\d_]*(?:[eE][+-]?\d+)?|(?<![\w.$])\d[\d_]*[eE][+-]?\d+/;

/** Same length as the source, with comments and strings blanked, so offsets stay valid. */
function mask(/** @type {string} */ source) {
  return source.replace(
    /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"/g,
    (/** @type {string} */ text) => text.replace(/[^\n]/g, ' '),
  );
}

/**
 * Timing constants are often written with fractions: `parameter T = CLK / 1_000_000 * 0.85`.
 * Yosys keeps such a parameter real and then fails on comparing a counter with it. A counter
 * compared with 21.95 behaves exactly as one compared with 22, so every real-valued parameter
 * is rounded up to an integer with the language's own functions. Line numbers do not change.
 */
export function integerRealParameters(/** @type {string} */ source) {
  const plain = mask(source);
  const real = new Set();
  const edits = [];
  const declaration = /\b(?:parameter|localparam)\b/g;
  for (let found = declaration.exec(plain); found; found = declaration.exec(plain)) {
    // One declaration may list several names: `parameter A = 1.5, B = A * 2;`.
    let at = found.index + found[0].length;
    for (;;) {
      const head = /^\s*(?:(?:integer|signed|unsigned|\[[^\]]*\])\s*)*([A-Za-z_][\w$]*)\s*=/.exec(
        plain.slice(at, at + 400),
      );
      if (!head) break;
      const start = at + head[0].length;
      let end = start;
      let depth = 0;
      for (; end < plain.length; end++) {
        const char = plain[end];
        if (char === '(' || char === '{' || char === '[') depth++;
        else if (char === ')' || char === '}' || char === ']') {
          if (depth === 0) break;
          depth--;
        } else if ((char === ',' || char === ';') && depth === 0) break;
      }
      const expression = plain.slice(start, end);
      const isReal =
        REAL_LITERAL.test(expression) ||
        [...expression.matchAll(/[A-Za-z_][\w$]*/g)].some((name) => real.has(name[0]));
      if (isReal && !/\$rtoi\b/.test(expression)) {
        edits.push({ start, end, name: head[1] });
      }
      if (plain[end] !== ',') break;
      // After a comma comes either the next name of this declaration or a new declaration.
      at = end + 1;
      if (/^\s*(?:parameter|localparam)\b/.test(plain.slice(at, at + 40))) break;
    }
  }
  if (!edits.length) return { text: source, rounded: [] };
  let text = source;
  for (const edit of edits.reverse())
    text = `${text.slice(0, edit.start)} $rtoi($ceil(${source.slice(edit.start, edit.end).trim()}))${text.slice(edit.end)}`;
  return { text, rounded: edits.map((edit) => edit.name).reverse() };
}

/** Applies the rewrites to every Verilog file of a project; `report` receives a note. */
export function compatibleProject(
  /** @type {Project} */ project,
  /** @type {(note: string) => void} */ report,
) {
  const files = project.files.map((file) => {
    if (!/\.(v|sv|vh|svh)$/.test(file.name)) return file;
    const { text: integers, rounded } = integerRealParameters(file.content);
    if (rounded.length)
      report(
        `${file.name}: параметры ${rounded.join(', ')} заданы дробными числами. Для синтеза они округлены вверх до целых: счётчик, сравниваемый с 21,95, ведёт себя так же, как с 22.\n`,
      );
    // `input reg` cannot exist: a port that the module itself assigns is an output. The
    // vendor's tool lets the slip pass.
    let slips = 0;
    const text = integers.replace(/\binput(\s+reg\b)/g, (match, rest, offset) => {
      if (mask(integers.slice(0, offset + match.length)).slice(offset) !== match) return match;
      slips++;
      return `output${rest}`;
    });
    if (slips)
      report(
        `${file.name}: порт объявлен как «input reg» — так бывает только у выхода. Для синтеза он считается «output reg».\n`,
      );
    return text === file.content ? file : { ...file, content: text };
  });
  // $readmemh("firmware.hex") names its file without a folder, and the vendor's tool looks
  // for it next to the sources. Memory images kept in a folder are offered at the top as well.
  const taken = new Set(files.map((file) => file.name));
  for (const file of [...files]) {
    const short = file.name.slice(file.name.lastIndexOf('/') + 1);
    if (/\.(hex|mem)$/.test(file.name) && short !== file.name && !taken.has(short)) {
      taken.add(short);
      files.push({ name: short, content: file.content });
    }
  }
  return { ...project, files };
}

/**
 * The command that reads one source file. A project with any SystemVerilog file is read as
 * SystemVerilog throughout, as the vendor's tool allows; every folder of the project is a
 * place to look for `include files, so sources kept in src/ find their headers.
 */
export function readCommand(/** @type {Project} */ project, /** @type {SourceFile} */ file) {
  const folders = new Set(
    project.files
      .filter((item) => item.name.includes('/'))
      .map((item) => item.name.slice(0, item.name.lastIndexOf('/'))),
  );
  const sv = project.files.some((item) => item.name.endsWith('.sv')) ? '-sv ' : '';
  return `read_verilog ${sv}-I. ${[...folders].map((folder) => `-I${folder} `).join('')}${file.name}`;
}
