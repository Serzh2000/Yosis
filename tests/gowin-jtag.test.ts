import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GowinJtag,
  dataWriteCommands,
  decodeRegister,
  instructionCommand,
  registerReadCommand,
  tmsCommands,
  type JtagTransport,
} from '../src/lib/gowin-jtag';
import { parseGowinBitstream } from '../shared/gowin-bitstream';
import { programmingFixture } from './fixtures/gowin-bitstream';

const TAP: Record<string, [string, string]> = {
  reset: ['idle', 'reset'],
  idle: ['idle', 'select-dr'],
  'select-dr': ['capture-dr', 'select-ir'],
  'capture-dr': ['shift-dr', 'exit1-dr'],
  'shift-dr': ['shift-dr', 'exit1-dr'],
  'exit1-dr': ['pause-dr', 'update-dr'],
  'pause-dr': ['pause-dr', 'exit2-dr'],
  'exit2-dr': ['shift-dr', 'update-dr'],
  'update-dr': ['idle', 'select-dr'],
  'select-ir': ['capture-ir', 'reset'],
  'capture-ir': ['shift-ir', 'exit1-ir'],
  'shift-ir': ['shift-ir', 'exit1-ir'],
  'exit1-ir': ['pause-ir', 'update-ir'],
  'pause-ir': ['pause-ir', 'exit2-ir'],
  'exit2-ir': ['shift-ir', 'update-ir'],
  'update-ir': ['idle', 'select-dr'],
};
type Clock = { tms: number; tdi: number; read: boolean };
function clocks(commands: Uint8Array): Clock[] {
  const result: Clock[] = [];
  let offset = 0;
  while (offset < commands.length) {
    const opcode = commands[offset++];
    if (opcode === 0x87) continue;
    if ([0x4b, 0x6b, 0x1b, 0x3b].includes(opcode)) {
      const count = commands[offset++] + 1,
        value = commands[offset++];
      for (let bit = 0; bit < count; bit++)
        result.push({
          tms: opcode & 0x40 ? (value >>> bit) & 1 : 0,
          tdi: opcode & 0x40 ? (value >>> 7) & 1 : (value >>> bit) & 1,
          read: !!(opcode & 0x20),
        });
    } else if ([0x19, 0x39].includes(opcode)) {
      const count = commands[offset++] + (commands[offset++] << 8) + 1;
      assert.ok(offset + count <= commands.length);
      for (const value of commands.subarray(offset, offset + count))
        for (let bit = 0; bit < 8; bit++)
          result.push({ tms: 0, tdi: (value >>> bit) & 1, read: !!(opcode & 0x20) });
      offset += count;
    } else assert.fail('Unexpected MPSSE command ' + opcode.toString(16));
  }
  return result;
}
class TapModel implements JtagTransport {
  state = 'idle';
  ir = 0x11;
  irBits: number[] = [];
  drBits: number[] = [];
  instructions: number[] = [];
  status = 0x6020;
  userCode = 0x8896;
  id = 0x81b;
  chainTail = 0xffffffff;
  configBits: number[] = [];
  pending = new Uint8Array();
  calls = 0;
  async write(command: Uint8Array) {
    this.calls++;
    const samples: number[] = [];
    for (const clock of clocks(command)) {
      if (this.state === 'shift-ir') this.irBits.push(clock.tdi);
      if (this.state === 'shift-dr') this.drBits.push(clock.tdi);
      if (clock.read && this.state === 'shift-dr') {
        const value =
          this.ir === 0x11
            ? this.drBits.length <= 32
              ? this.id
              : this.chainTail
            : this.ir === 0x41
              ? this.status
              : this.userCode;
        samples.push((value >>> ((this.drBits.length - 1) % 32)) & 1);
      }
      const next = TAP[this.state][clock.tms];
      if (next === 'reset') this.ir = 0x11;
      if (next === 'capture-ir') this.irBits = [];
      if (next === 'capture-dr') this.drBits = [];
      if (next === 'update-ir') {
        assert.equal(this.irBits.length, 8);
        this.ir = this.irBits.reduce((value, bit, index) => value | (bit << index), 0);
        this.instructions.push(this.ir);
        if (this.ir === 0x15) this.status |= 0x80;
        if (this.ir === 0x05) this.status = 0xa0;
        if (this.ir === 0x08) this.status |= 0x2000;
        if (this.ir === 0x3a) this.status &= ~0x80;
      }
      if (next === 'update-dr') {
        if (this.ir === 0x17) this.configBits = [...this.drBits];
        if (this.ir === 0x0a)
          this.userCode =
            this.drBits.reduce((value, bit, index) => value | (bit << index), 0) >>> 0;
      }
      this.state = next;
    }
    if (samples.length) {
      assert.ok(samples.length === 32 || samples.length === 64);
      const data = new Uint8Array(samples.length / 8 + 1);
      samples.forEach((bit, index) => {
        if (index < samples.length - 8) data[index >>> 3] |= bit << (index % 8);
        else if (index < samples.length - 1) data[data.length - 2] |= bit << ((index % 8) + 1);
        else data[data.length - 1] |= bit << 7;
      });
      this.pending = data;
    }
  }
  async readExact(length: number) {
    assert.equal(this.pending.length, length);
    const result = this.pending;
    this.pending = new Uint8Array();
    return result;
  }
}

test('TMS resets every independent TAP state and SRAM instruction allowlist excludes flash/reload', async () => {
  for (const state of Object.keys(TAP)) {
    const tap = new TapModel();
    tap.state = state;
    for (const { tms } of clocks(tmsCommands([1, 1, 1, 1, 1, 1, 0])))
      tap.state = TAP[tap.state][tms];
    assert.equal(tap.state, 'idle');
  }
  for (const opcode of [0, 0x3c, 0x71, 0x75])
    assert.throws(() => instructionCommand(opcode), /не разрешена/);
});
test('register scans have exact boundaries and decode every one of 32 output bits', async () => {
  for (const value of [0, 0xffffffff, ...Array.from({ length: 32 }, (_, bit) => 2 ** bit)]) {
    const tap = new TapModel();
    tap.userCode = value;
    await tap.write(instructionCommand(0x13));
    await tap.write(registerReadCommand(32));
    assert.equal(tap.drBits.length, 32);
    assert.equal(tap.state, 'idle');
    const data = decodeRegister(await tap.readExact(5), 32);
    assert.equal(new DataView(data.buffer).getUint32(0, true), value);
  }
});
test('packet boundaries retain one continuous DR shift and every input bit exactly once', async () => {
  for (const length of [1, 2, 509, 510, 511, 1020]) {
    const tap = new TapModel(),
      data = Uint8Array.from({ length }, (_, index) => (index * 71) & 255);
    await tap.write(instructionCommand(0x17));
    const commands = [...dataWriteCommands(data)];
    for (let index = 0; index < commands.length; index++) {
      assert.ok(commands[index].length <= 512);
      await tap.write(commands[index]);
      assert.equal(tap.state, index === commands.length - 1 ? 'idle' : 'shift-dr');
    }
    assert.deepEqual(
      tap.configBits,
      [...data].flatMap((byte) => Array.from({ length: 8 }, (_, bit) => (byte >>> bit) & 1)),
    );
  }
});
test('probe is read-only and rejects wrong devices and multiple JTAG chips', async () => {
  const tap = new TapModel();
  assert.deepEqual(await new GowinJtag(tap).probe(), {
    idCode: 0x81b,
    userCode: 0x8896,
    status: 0x6020,
  });
  assert.deepEqual(tap.instructions, [0x11, 0x13, 0x41]);
  for (const changed of ['id', 'chainTail'] as const) {
    const wrong = new TapModel();
    wrong[changed] = 0x12345678;
    await assert.rejects(new GowinJtag(wrong).probe(), /Ожидается одна/);
    assert.deepEqual(wrong.instructions, []);
  }
});
test('full SRAM transfer matches the original FS bit order, validates Done and exact UserCode', async () => {
  const text = programmingFixture(),
    parsed = parseGowinBitstream(text),
    tap = new TapModel();
  const stages: number[] = [];
  const result = await new GowinJtag(
    tap,
    (progress) => stages.push(progress.percent),
    async () => {},
  ).program(text);
  assert.equal(result.userCode, 0x35b1);
  assert.equal(result.status & 0x200f, 0x2000);
  assert.deepEqual(
    tap.configBits,
    [...parsed.wireBytes].flatMap((byte) =>
      Array.from({ length: 8 }, (_, bit) => (byte >>> (7 - bit)) & 1),
    ),
  );
  assert.equal(stages.at(-1), 100);
  assert.ok(stages.every((value, index) => index === 0 || value >= stages[index - 1]));
  assert.ok(tap.instructions.includes(0x05));
  assert.ok(!tap.instructions.some((opcode) => [0x3c, 0x71, 0x75].includes(opcode)));
  assert.equal(tap.state, 'idle');
});
test('invalid CRC and FPGA error flags never reach SRAM erase', async () => {
  const invalid = new TapModel();
  await assert.rejects(new GowinJtag(invalid).program('1010\n'), /неполный/);
  assert.equal(invalid.calls, 0);
  const tap = new TapModel();
  tap.status |= 1;
  await assert.rejects(new GowinJtag(tap).program(programmingFixture()), /сообщает ошибку/);
  assert.ok(!tap.instructions.includes(0x05));
});
