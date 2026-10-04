import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatParameterValue,
  getParameterHelp,
  getPrimitiveHelp,
  getResourceHelp,
} from '../src/lib/help';

test('Yosys width and signed flags are readable while original bits remain intact', () => {
  const widthBits = '00000000000000000000000000000011';
  const width = formatParameterValue('A_WIDTH', widthBits, '$add');
  assert.equal(width.display, '3 бита');
  assert.equal(width.raw, widthBits);
  assert.equal(width.decimal, '3');
  assert.equal(width.encoding, 'binary');
  assert.equal(formatParameterValue('Y_WIDTH', 16).display, '16 бит');
  assert.equal(formatParameterValue('A_SIGNED', '0').display, 'нет · без знака');
  assert.equal(formatParameterValue('B_SIGNED', '1').display, 'да · со знаком');
  assert.match(getParameterHelp('A_SIGNED', '0', '$add').paragraphs.join(' '), /−4…3/);
});

test('wide LUT INIT is converted exactly without Number precision loss', () => {
  const bits = '1'.repeat(64);
  const value = formatParameterValue('INIT', bits, 'LUT6');
  assert.equal(value.display, '0xFFFFFFFFFFFFFFFF');
  assert.equal(value.decimal, '18446744073709551615');
  assert.equal(value.raw, bits);
  assert.equal(
    formatParameterValue('WIDTH', Number.MAX_SAFE_INTEGER + 1).display,
    String(Number.MAX_SAFE_INTEGER + 1),
  );
});

test('unknown and string parameters retain their actual values', () => {
  for (const raw of ['00xx', '1z01', 'GW2A-18C', '27.0', 'true']) {
    const value = formatParameterValue('INIT', raw);
    assert.equal(value.raw, raw);
    assert.equal(value.display, raw);
    assert.equal(value.decimal, undefined);
  }
  assert.match(getParameterHelp('INIT', '10xz', 'LUT2').notes!.join(' '), /нельзя перевести/);
});

test('memory polarity vectors describe each port and use the least significant bit for port 0', () => {
  assert.equal(
    formatParameterValue('RD_CLK_POLARITY', '11', '$mem_v2').display,
    'порты 0: ↑ · 1: ↑',
  );
  assert.equal(
    formatParameterValue('WR_CLK_POLARITY', '10', '$mem_v2').display,
    'порты 0: ↓ · 1: ↑',
  );
  assert.equal(formatParameterValue('RD_CLK_ENABLE', '01', '$mem_v2').display, 'порты 0: 1 · 1: 0');
  assert.equal(
    formatParameterValue('RD_TRANSPARENCY_MASK', '1010', '$mem_v2').display,
    'маска 0xA',
  );
  const article = getParameterHelp('RD_CLK_POLARITY', '11', '$mem_v2');
  assert.match(article.title, /Фронты такта портов/);
  assert.match(article.paragraphs.join(' '), /Младший бит относится к порту 0/);
  assert.equal(formatParameterValue('A_SIGNED', '11', '$macc_v2').display, '3');
});

test('pmux explains one-hot selection and the undefined multi-select case', () => {
  const article = getPrimitiveHelp('$pmux');
  assert.equal(article.symbol, 'mux');
  assert.match(article.title, /мультиплексор/);
  assert.match(article.paragraphs.join(' '), /one-hot/);
  assert.match(article.notes!.join(' '), /несколько единиц.*неопределён/);
  assert.match(article.example!, /default: y = 'bx/);
  assert.match(getParameterHelp('S_WIDTH', '11', '$pmux').notes!.join(' '), /WIDTH × S_WIDTH/);
});

test('bitwise, logical and reduction gates explain distinct operations', () => {
  assert.match(getPrimitiveHelp('$and').example!, /a & b/);
  assert.match(getPrimitiveHelp('$logic_and').example!, /a && b/);
  assert.match(getPrimitiveHelp('$logic_and').paragraphs.join(' '), /один логический бит/);
  assert.match(getPrimitiveHelp('$reduce_and').example!, /&a/);
  assert.equal(getPrimitiveHelp('$_NAND_').symbol, 'and');
  assert.equal(getPrimitiveHelp('$_NAND_').inverted, true);
  assert.equal(getPrimitiveHelp('$_NMUX_').inverted, true);
});

test('register help keeps reset priority, latch behavior and asynchronous enable distinct', () => {
  assert.match(getPrimitiveHelp('$sdffe').notes!.join(' '), /сброс имеет приоритет/);
  assert.match(getPrimitiveHelp('$sdffce').notes!.join(' '), /EN имеет приоритет/);
  const latch = getPrimitiveHelp('$adlatch');
  assert.equal(latch.symbol, 'latch');
  assert.match(latch.example!, /always @\*/);
  assert.doesNotMatch(latch.example!, /posedge clk/);
  assert.match(getPrimitiveHelp('$adffe').example!, /else if \(enable\)/);
  assert.match(getPrimitiveHelp('$_DFF_N_').example!, /negedge clk/);
  assert.match(getPrimitiveHelp('$_DFF_PN0_').example!, /posedge clk or negedge reset/);
  assert.match(getPrimitiveHelp('$_DFF_PN0_').example!, /if \(!reset\) q <= 1'b0/);
  assert.match(getPrimitiveHelp('$_DFFE_PN_').example!, /if \(!enable\)/);
  assert.match(getPrimitiveHelp('$_DLATCH_NN1_').example!, /if \(!reset\) q = 1'b1/);
});

test('Gowin help distinguishes synchronous reset from asynchronous clear', () => {
  assert.match(getPrimitiveHelp('DFFRE').paragraphs.join(' '), /на активном фронте/);
  assert.match(getPrimitiveHelp('DFFNCE').example!, /negedge clk or posedge clear/);
  assert.match(getPrimitiveHelp('IOBUF').paragraphs.join(' '), /OEN = 1 освобождает/);
  assert.match(getPrimitiveHelp('LUT4').paragraphs.join(' '), /16 выходных битов/);
  assert.match(getPrimitiveHelp('ALU').notes!.join(' '), /не целый процессорный блок/);
  for (const type of ['MUX2_LUT5', 'MUX2_LUT6', '$_MUX_', '$_NMUX_']) {
    assert.match(getPrimitiveHelp(type).notes!.join(' '), /однобитовые/);
    assert.doesNotMatch(getPrimitiveHelp(type).notes!.join(' '), /WIDTH/);
  }
});

test('memory primitives in actual Yosys netlists receive memory help', () => {
  for (const type of [
    '$mem',
    '$mem_v2',
    '$memrd',
    '$memrd_v2',
    '$memwr',
    '$memwr_v2',
    '$meminit',
    '$meminit_v2',
  ]) {
    const article = getPrimitiveHelp(type);
    assert.equal(article.symbol, 'memory', type);
    assert.doesNotMatch(article.paragraphs.join(' '), /пока нет отдельного/);
    assert.match(article.sources![0].url, /word_mem/);
  }
});

test('resource help describes stages accurately and unknown types avoid invented behavior', () => {
  for (const resource of ['LUT', 'FF', 'ALU', 'BRAM', 'DSP', 'IO', 'I/O', 'other'] as const) {
    assert.match(
      getResourceHelp(resource, 'rtl').notes!.join(' '),
      /количество ячеек или операций/,
    );
    assert.match(getResourceHelp(resource, 'technology').notes!.join(' '), /после synth_gowin/);
  }
  assert.match(
    getResourceHelp('FF', 'rtl').notes!.join(' '),
    /многобитовый RTL-регистр считается одной ячейкой/,
  );
  const custom = getPrimitiveHelp('my_experimental_ip');
  assert.equal(custom.symbol, 'block');
  assert.equal(custom.example, undefined);
  assert.match(custom.notes!.join(' '), /по одному имени поведение не определяется/);
});

test('official source links use the appropriate cell-library sections', () => {
  assert.match(getPrimitiveHelp('$lut').sources![0].url, /word_logic\.html$/);
  assert.match(getPrimitiveHelp('$_DFF_P_').sources![0].url, /gate_reg_ff\.html$/);
  assert.match(getPrimitiveHelp('$_DLATCH_P_').sources![0].url, /gate_reg_latch\.html$/);
  assert.match(getPrimitiveHelp('$_AND_').sources![0].url, /gate_comb_simple\.html$/);
  assert.match(getPrimitiveHelp('$_AOI3_').sources![0].url, /gate_comb_combined\.html$/);
});
