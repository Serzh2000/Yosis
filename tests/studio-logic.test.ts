import test from 'node:test';
import assert from 'node:assert/strict';
import type { BuildResult, YosysNetlist } from '../shared/types';
import type { PhysicalResult } from '../shared/physical';
import {
  canDeleteFile,
  moduleNameForFile,
  newFileContent,
  workTabForFile,
} from '../src/lib/file-templates';
import { physicalStatus, synthesisStatus } from '../src/lib/studio-status';
import { studioTabs } from '../src/lib/studio-tabs';
import { workspaceTabs } from '../src/components/StudioNavigation';
import { canNavigateTo, resolveSourceName } from '../src/hooks/useSourceNavigation';
import { pickModuleName } from '../src/hooks/useNetlistView';
import { resolveTheme } from '../src/hooks/useTheme';
import { validateProject } from '../shared/project-validation';

test('a new file gets content that fits its extension', () => {
  assert.match(newFileContent('rtl/alu_core.v'), /^module alu_core \(/);
  assert.equal(moduleNameForFile('rtl/my-file.sv'), 'my_file');
  assert.match(newFileContent('board.cst'), /IO_LOC/);
  assert.match(newFileContent('defs.svh'), /^\/\/ Общие параметры/);
  assert.equal(typeof JSON.parse(newFileContent('top.ysch')), 'object');
  assert.doesNotThrow(() =>
    validateProject({
      name: 'p',
      top: 'top',
      board: 'tangnano20k',
      files: [
        { name: 'top.v', content: 'module top(); endmodule' },
        { name: 'new_mod.v', content: newFileContent('new_mod.v') },
      ],
    }),
  );
});

test('a file opens on the tab that edits it', () => {
  assert.equal(workTabForFile('board.cst'), 'constraints');
  assert.equal(workTabForFile('top.ysch'), 'design');
  assert.equal(workTabForFile('top.v'), 'code');
  assert.equal(workTabForFile('rom.hex'), 'code');
});

test('the last file and the last source of a project cannot be deleted', () => {
  const files = [{ name: 'top.v' }, { name: 'board.cst' }, { name: 'rom.hex' }];
  assert.equal(canDeleteFile([{ name: 'top.v' }], { name: 'top.v' }), false);
  assert.equal(canDeleteFile(files, files[0]), false);
  assert.equal(canDeleteFile(files, files[1]), true);
  assert.equal(canDeleteFile([...files, { name: 'alu.v' }], files[0]), true);
});

test('tab badges describe the result relative to the current project', () => {
  const build = (status: string) => ({ status }) as BuildResult;
  assert.equal(synthesisStatus(build('success'), true, false), 'busy');
  assert.equal(synthesisStatus(build('success'), false, true), 'stale');
  assert.equal(synthesisStatus(build('success'), false, false), 'success');
  assert.equal(synthesisStatus(build('error'), false, false), 'error');
  assert.equal(synthesisStatus(null, false, false), undefined);
  const placed = (status: string) => ({ result: { status } as PhysicalResult, snapshot: 'a' });
  assert.equal(physicalStatus(placed('success'), 'a'), 'success');
  assert.equal(physicalStatus(placed('success'), 'b'), 'stale');
  assert.equal(physicalStatus(placed('running'), 'a'), 'busy');
  assert.equal(physicalStatus(placed('queued'), 'a'), 'busy');
  assert.equal(physicalStatus(placed('error'), 'a'), 'error');
  assert.equal(physicalStatus({ result: null, snapshot: '' }, 'a'), undefined);
});

test('navigation lists every tab once with its icon', () => {
  assert.deepEqual(
    workspaceTabs.map((tab) => tab.id),
    studioTabs.map((tab) => tab.id),
  );
  assert.equal(new Set(studioTabs.map((tab) => tab.id)).size, 10);
  assert.ok(
    workspaceTabs.every((tab) => typeof tab.icon === 'object' || typeof tab.icon === 'function'),
  );
});

test('source paths from logs and schematics resolve to project files', () => {
  const files = [{ name: 'top.v' }, { name: 'rtl/alu.v' }];
  assert.equal(resolveSourceName(files, 'top.v'), 'top.v');
  assert.equal(resolveSourceName(files, '/work/build/rtl/alu.v'), 'rtl/alu.v');
  assert.equal(resolveSourceName(files, 'C:\\work\\rtl\\alu.v'), 'rtl/alu.v');
  assert.equal(resolveSourceName(files, 'C:\\work/rtl/alu.v'), 'rtl/alu.v');
  assert.equal(resolveSourceName(files, 'other.v'), undefined);
  assert.equal(canNavigateTo(files, '/tmp/x/top.v'), true);
  assert.equal(canNavigateTo(files, '/share/yosys/top.v'), false);
  assert.equal(canNavigateTo(files, 'missing.v'), false);
});

test('the schematic shows the selected module, then the top, then the first one', () => {
  const netlist = { modules: { alu: {}, top: {}, first: {} } } as unknown as YosysNetlist;
  assert.equal(pickModuleName(netlist, 'alu', 'top'), 'alu');
  assert.equal(pickModuleName(netlist, 'gone', 'top'), 'top');
  assert.equal(pickModuleName(netlist, 'gone', 'gone2'), 'alu');
  assert.equal(pickModuleName(undefined, 'a', 'b'), undefined);
});

test('the saved theme wins over the system theme', () => {
  assert.equal(
    resolveTheme('dark', () => false),
    'dark',
  );
  assert.equal(
    resolveTheme('light', () => true),
    'light',
  );
  assert.equal(
    resolveTheme(null, () => true),
    'dark',
  );
  assert.equal(
    resolveTheme('sepia', () => false),
    'light',
  );
});
