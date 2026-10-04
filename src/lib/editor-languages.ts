import type * as Monaco from 'monaco-editor/editor/editor.api.js';

export const verilogKeywords =
  `accept_on alias always always_comb always_ff always_latch and assert assign assume automatic before begin bind bins binsof bit break buf bufif0 bufif1 byte case casex casez cell chandle checker class clocking cmos config const constraint context continue cover covergroup coverpoint cross deassign default defparam design disable dist do edge else end endcase endchecker endclass endclocking endconfig endfunction endgenerate endgroup endinterface endmodule endpackage endprimitive endprogram endproperty endsequence endspecify endtable endtask enum event eventually expect export extends extern final first_match for force foreach forever fork forkjoin function generate genvar global highz0 highz1 if iff ifnone ignore_bins illegal_bins implements implies import incdir include initial inout input inside int integer interconnect intersect join join_any join_none large let liblist library local localparam logic longint macromodule matches medium modport module nand negedge nettype new nexttime nmos nor noshowcancelled not notif0 notif1 null or output package packed parameter pmos posedge primitive priority program property protected pull0 pull1 pulldown pullup pulsestyle_ondetect pulsestyle_onevent pure rand randc randcase randsequence rcmos real realtime ref reg reject_on release repeat restrict return rnmos rpmos rtran rtranif0 rtranif1 s_always s_eventually s_nexttime s_until s_until_with scalared sequence shortint shortreal showcancelled signed small solve specify specparam static string strong strong0 strong1 struct super supply0 supply1 sync_accept_on sync_reject_on table tagged task this throughout time timeprecision timeunit tran tranif0 tranif1 tri tri0 tri1 triand trior trireg type typedef union unique unique0 unsigned until until_with untyped use uwire var vectored virtual void wait wait_order wand weak weak0 weak1 while wildcard wire with within wor xnor xor`.split(
    /\s+/,
  );

export function registerEditorLanguages(monaco: typeof Monaco) {
  monaco.languages.register({ id: 'verilog', extensions: ['.v', '.sv', '.vh', '.svh'] });
  monaco.languages.setMonarchTokensProvider('verilog', {
    keywords: verilogKeywords,
    tokenizer: {
      root: [
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
        [/`[A-Za-z_$][\w$]*/, 'keyword.preprocessor'],
        [/\\[^\s]+/, 'identifier'],
        [/\$[A-Za-z_][\w$]*/, 'type.identifier'],
        [/(?:\d[\d_]*)?'[sS]?[bB][01xzXZ?_]+/, 'number'],
        [/(?:\d[\d_]*)?'[sS]?[oO][0-7xzXZ?_]+/, 'number'],
        [/(?:\d[\d_]*)?'[sS]?[dD][\dxzXZ?_]+/, 'number'],
        [/(?:\d[\d_]*)?'[sS]?[hH][\da-fA-FxzXZ?_]+/, 'number'],
        [/'[01xXzZ]/, 'number'],
        [/\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?(?:s|ms|us|ns|ps|fs)?/, 'number'],
        [/[a-zA-Z_$][\w$]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
        [/"/, 'string', '@string'],
        [/[{}()[\]]/, '@brackets'],
        [/[=+\-*/%&|^~!<>?:]+/, 'operator'],
        [/[,;.]/, 'delimiter'],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],
      string: [
        [/[^"\\]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop'],
      ],
    },
  });
  monaco.languages.setLanguageConfiguration('verilog', {
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [
      ['(', ')'],
      ['[', ']'],
      ['{', '}'],
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '"', close: '"', notIn: ['string', 'comment'] },
    ],
    indentationRules: {
      increaseIndentPattern: /\b(begin|case|casex|casez|fork|generate)\b[^;]*$/,
      decreaseIndentPattern: /^\s*(end|endcase|join|endgenerate)\b/,
    },
  });
  monaco.languages.register({ id: 'gowin-cst', extensions: ['.cst'] });
  monaco.languages.setMonarchTokensProvider('gowin-cst', {
    tokenizer: {
      root: [
        [/\/\/.*$|#.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        [
          /\b(?:IO_LOC|IO_PORT|CLOCK_LOC|INS_LOC|IO_TYPE|PULL_MODE|DRIVE|SLEW_RATE|OPEN_DRAIN)\b/,
          'keyword',
        ],
        [/\b(?:LVCMOS\d+|LVTTL|LVDS\d+|BLVDS|MLVDS|BUFG|UP|DOWN|NONE|FAST|SLOW|ON|OFF)\b/, 'type'],
        [/"(?:[^"\\]|\\.)*"/, 'string'],
        [/\b\d+\b/, 'number'],
        [/[=;]/, 'operator'],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],
    },
  });
  monaco.languages.setLanguageConfiguration('gowin-cst', {
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [['[', ']']],
    autoClosingPairs: [{ open: '"', close: '"' }],
  });
  const snippets = [
    [
      'module',
      'Модуль с входом и выходом',
      'module ${1:top} (\n    input wire ${2:a},\n    output wire ${3:y}\n);\n    ${0}\nendmodule',
    ],
    ['assign', 'Непрерывное присваивание комбинационной логики', 'assign ${1:y} = ${2:a & b};'],
    [
      'always_ff',
      'Регистр со сбросом по активному нулю',
      'always @(posedge ${1:clk} or negedge ${2:reset_n}) begin\n    if (!${2:reset_n}) ${3:q} <= ${4:0};\n    else ${3:q} <= ${5:d};\nend',
    ],
    [
      'always_comb',
      'Комбинационная логика с значением по умолчанию',
      'always @* begin\n    ${1:y} = ${2:0};\n    if (${3:enable}) ${1:y} = ${4:a};\nend',
    ],
    [
      'case',
      'Выбор одной ветки с default',
      'case (${1:select})\n    ${2:0}: ${3:y} = ${4:a};\n    default: ${3:y} = ${5:0};\nendcase',
    ],
  ];
  const provide =
    (items: string[][]) => (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: items.map(([label, documentation, insertText]) => ({
          label,
          documentation,
          insertText,
          range,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        })),
      };
    };
  monaco.languages.registerCompletionItemProvider('verilog', {
    provideCompletionItems: provide([
      ...snippets,
      ...verilogKeywords.map((word) => [word, 'Ключевое слово Verilog / SystemVerilog', word]),
    ]),
  });
  monaco.languages.registerCompletionItemProvider('gowin-cst', {
    provideCompletionItems: provide([
      ['IO_LOC', 'Связать сигнал с физическим выводом FPGA', 'IO_LOC "${1:led_n[0]}" ${2:15};'],
      ['IO_PORT', 'Электрические свойства вывода', 'IO_PORT "${1:led_n[0]}" IO_TYPE=LVCMOS33;'],
      ['CLOCK_LOC', 'Тактовый буфер', 'CLOCK_LOC "${1:clk}" BUFG;'],
    ]),
  });
}
