import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getFocusLoopTarget, getTabDestination } from '../src/lib/accessibility';
import { StudioNavigation, workspaceTabs } from '../src/components/StudioNavigation';

test('horizontal tabs wrap, reach endpoints, and leave Tab to the browser', () => {
  assert.equal(getTabDestination('ArrowLeft', 0, 9), 8);
  assert.equal(getTabDestination('ArrowRight', 8, 9), 0);
  assert.equal(getTabDestination('Home', 4, 9), 0);
  assert.equal(getTabDestination('End', 4, 9), 8);
  assert.equal(getTabDestination('Tab', 4, 9), null);
  assert.equal(getTabDestination('ArrowDown', 4, 9), null);
  assert.equal(getTabDestination('ArrowRight', 0, 0), null);
});

test('dialog focus wraps both ends and recovers focus that left the dialog', () => {
  const [first, middle, last, outside] = [{}, {}, {}, {}];
  const controls = [first, middle, last];
  assert.equal(getFocusLoopTarget(controls, last, false), first);
  assert.equal(getFocusLoopTarget(controls, first, true), last);
  assert.equal(getFocusLoopTarget(controls, middle, false), null);
  assert.equal(getFocusLoopTarget(controls, middle, true), null);
  assert.equal(getFocusLoopTarget(controls, outside, false), first);
  assert.equal(getFocusLoopTarget(controls, outside, true), last);
  assert.equal(getFocusLoopTarget([first], first, true), first);
  assert.equal(getFocusLoopTarget([], null, false), null);
});

test('all workspaces keep Files and expose named tabs with one keyboard stop', () => {
  for (const tab of workspaceTabs) {
    const html = renderToStaticMarkup(
      createElement(StudioNavigation, {
        tab: tab.id,
        onChange() {},
        fileManagerOpen: false,
        onToggleFiles() {},
        constraintsCount: 2,
        synthesisStatus: 'stale',
        physicalStatus: 'error',
      }),
    );
    assert.match(html, /aria-label="Файлы проекта"/);
    assert.match(html, /aria-controls="project-files"/);
    assert.equal((html.match(/role="tab"/g) ?? []).length, workspaceTabs.length);
    assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1);
    assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
    for (const target of workspaceTabs) {
      assert.match(html, new RegExp(`id="tab-${target.id}"`));
      assert.match(html, new RegExp(`aria-controls="panel-${target.id}"`));
    }
    assert.match(html, /Gowin · Нужна новая сборка/);
    assert.match(html, /Кристалл · Ошибка/);
  }
});

function luminance(hex: string) {
  const [r, g, b] = hex
    .slice(1)
    .match(/../g)!
    .map((value) => parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('light and dark theme text and primary actions meet 4.5:1 contrast', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  for (const selector of [':root', ":root[data-theme='dark']"]) {
    const block = css.slice(css.indexOf(`${selector} {`)).split('}')[0];
    const colors = Object.fromEntries(
      [...block.matchAll(/--([a-z-]+):\s*(#[\da-f]{6})\b/g)].map((match) => [match[1], match[2]]),
    );
    for (const foreground of ['text', 'text-soft', 'muted', 'accent', 'accent-strong', 'success']) {
      for (const background of ['surface', 'panel', 'canvas', 'panel-raised', 'accent-soft']) {
        const ratio = contrast(colors[foreground], colors[background]);
        assert.ok(ratio >= 4.5, `${selector} ${foreground}/${background}: ${ratio.toFixed(2)}:1`);
      }
    }
    for (const pair of [
      ['accent-text', 'accent'],
      ['accent-text', 'accent-strong'],
      ['danger', 'danger-soft'],
      ['warning', 'warning-soft'],
    ]) {
      assert.ok(contrast(colors[pair[0]], colors[pair[1]]) >= 4.5, `${selector} ${pair.join('/')}`);
    }
  }
});

test('workspace styles have a 12px floor for labels and diagram text', () => {
  const componentDir = new URL('../src/components/', import.meta.url);
  const files = [
    new URL('../src/styles.css', import.meta.url),
    ...readdirSync(componentDir)
      .filter((name) => name.endsWith('.css'))
      .map((name) => new URL(name, componentDir)),
  ];
  for (const file of files) {
    const css = readFileSync(file, 'utf8');
    const sizes = [
      ...css.matchAll(
        /font-size\s*:\s*(\d+(?:\.\d+)?)px|font\s*:\s*(?:(?:normal|bold|italic|[1-9]00)\s+)*(\d+(?:\.\d+)?)px/g,
      ),
    ];
    for (const match of sizes)
      assert.ok(Number(match[1] ?? match[2]) >= 12, `${file.pathname}: ${match[0]}`);
  }
});
