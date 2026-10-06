import assert from 'node:assert/strict';
import test from 'node:test';
import { validateProject } from '../shared/project-validation';
import { guessTop, projectFromFolder } from '../src/lib/gowin-import';

const gprj = `<?xml version="1" encoding="UTF-8"?>
<Project>
  <FileList>
    <File path="src/top.v" type="file.verilog" enable="1"/>
    <File path="src/pll/gowin rpll.v" type="file.verilog" enable="1"/>
    <File path="src/board.cst" type="file.cst" enable="1"/>
    <File path="src/timing.sdc" type="file.sdc" enable="1"/>
  </FileList>
</Project>`;

test('a Gowin EDA project folder becomes a Yosis project', () => {
  const project = projectFromFolder([
    { path: 'demo/demo.gprj', text: gprj },
    { path: 'demo/src/top.v', text: 'module system(input clk); core u(.clk(clk)); endmodule\n' },
    { path: 'demo/src/pll/gowin rpll.v', text: '\uFEFFmodule core(input clk); endmodule\n' },
    { path: 'demo/src/board.cst', text: 'IO_LOC "clk" 4;\n' },
    { path: 'demo/src/timing.sdc', text: 'create_clock -period 37 [get_ports {clk}]\n' },
    { path: 'demo/src/firmware.hex', text: '00000013\n' },
    { path: 'demo/src/unused.v', text: 'module other; endmodule\n' },
    { path: 'demo/impl/pnr/design.v', text: 'module junk; endmodule\n' },
    { path: 'demo/impl/project_process_config.json', text: '{ "TopModule": "system" }' },
  ]);
  assert.equal(project.name, 'demo');
  assert.equal(project.top, 'system');
  // The tree of the folder is kept, so the pupil sees src/ as on disk.
  assert.deepEqual(project.files.map((file) => file.name).sort(), [
    'src/board.cst',
    'src/firmware.hex',
    'src/pll/gowin_rpll.v',
    'src/timing.sdc',
    'src/top.v',
  ]);
  assert.equal(project.files[0].name, 'src/top.v', 'the file with the top module comes first');
  assert.ok(
    project.files.every((file) => !file.content.startsWith('\uFEFF')),
    'the byte order mark is dropped',
  );
  assert.doesNotThrow(() => validateProject(project));
});

test('the top module is guessed when the settings do not name it', () => {
  assert.equal(
    guessTop([
      'module uart_rx #(parameter N = 1)(input a); endmodule',
      'module uart_top(input a);\n  uart_rx #(.N(2))\n    receiver (.a(a));\nendmodule',
    ]),
    'uart_top',
  );
  const project = projectFromFolder([
    { path: 'plain/a.v', text: 'module leaf(input a); endmodule' },
    { path: 'plain/b.v', text: 'module blink(input a); leaf l(.a(a)); endmodule' },
  ]);
  assert.equal(project.top, 'blink');
  assert.equal(project.name, 'plain');
  assert.throws(() => projectFromFolder([{ path: 'x/readme.md', text: '' }]), /Verilog/);
});
