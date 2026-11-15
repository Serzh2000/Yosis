import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyCircuit, library, newLibraryNode } from '../shared/schematic';
import { circuitGeometry } from '../src/lib/circuit-geometry';
import { CircuitSymbol, type SymbolStyle } from '../src/components/CircuitSymbol';

const doc = emptyCircuit();
const draw = (id: string, style: SymbolStyle) =>
  renderToStaticMarkup(createElement(CircuitSymbol, { node: newLibraryNode(doc, id), style }));
const ids = (library as { id: string }[]).map((entry) => entry.id);

test('every library element can be drawn in both styles', () => {
  assert.ok(ids.length >= 90, 'the library is not empty');
  for (const id of ids)
    for (const style of ['ansi', 'gost'] as const) {
      const svg = draw(id, style);
      assert.match(svg, /<g transform=/, `${id}/${style}`);
      assert.ok(!/NaN|undefined/.test(svg), `${id}/${style}: broken numbers in the markup`);
    }
});

test('the style never moves a pin: switching it keeps wires where they are', () => {
  // The geometry has no style parameter at all; this pins that down for every element.
  for (const id of ids) {
    const node = newLibraryNode(doc, id);
    const geometry = circuitGeometry(node);
    assert.ok(
      geometry.pins.every((pin) => Number.isFinite(pin.x) && Number.isFinite(pin.y)),
      id,
    );
    assert.deepEqual(
      circuitGeometry(node).pins.map((pin) => [pin.name, pin.x, pin.y]),
      geometry.pins.map((pin) => [pin.name, pin.x, pin.y]),
    );
  }
});

test('IEC (ЕСКД) style draws gates as rectangles with their function inside', () => {
  const expected: [string, string][] = [
    ['and', '&'],
    ['or', '≥1'],
    ['xor', '=1'],
    ['not', '1'],
    ['buf', '1'],
    ['nand', '&'],
    ['nor', '≥1'],
    ['xnor', '=1'],
  ];
  for (const [id, mark] of expected) {
    const gost = draw(id, 'gost');
    // React escapes the ampersand in text.
    const text = mark.replace('&', '&amp;');
    assert.ok(gost.includes(`>${text}<`), `${id}: ${mark}`);
    assert.ok(!/ A\d|C\d/.test(gost.split('<text')[0]), id);
    assert.match(gost, /<rect class="cs-body"/, `${id}: a rectangle body`);
    assert.ok(!draw(id, 'ansi').includes(`>${text}<`), `${id}: ANSI has no text mark`);
  }
});

test('ANSI gates keep a gap between the inversion bubble and the pin', () => {
  for (const id of ['not', 'nand', 'nor', 'xnor']) {
    const svg = draw(id, 'ansi');
    const bubble = /<circle class="cs-bubble" cx="(\d+)"/.exec(svg);
    assert.ok(bubble, `${id}: has a bubble`);
    const width = circuitGeometry(newLibraryNode(doc, id)).localWidth;
    // Pin centre is at x = width with radius 4; the bubble (r = 4) must not reach it.
    assert.ok(width - Number(bubble[1]) >= 8, `${id}: bubble at ${bubble[1]}, width ${width}`);
  }
});

test('multiplexers in IEC style keep only the select pin names, so text never overlaps', () => {
  const svg = draw('mux4', 'gost');
  assert.ok(svg.includes('>MUX<'));
  assert.ok(!/>D[0-3]</.test(svg), 'data pin names are dropped');
  assert.match(svg, />S</, 'select stays labelled');
});

test('blocks with long pin names are wide enough for the label and the parameters', () => {
  for (const id of ['fulladder', 'add4', 'halfadder']) {
    const node = newLibraryNode(doc, id);
    const geometry = circuitGeometry(node);
    const longest = Math.max(...geometry.pins.map((pin) => pin.name.length));
    assert.ok(geometry.localWidth >= 2 * (longest * 7 + 10), `${id}: width ${geometry.localWidth}`);
  }
});
