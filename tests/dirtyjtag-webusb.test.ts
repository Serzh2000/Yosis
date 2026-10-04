import test from 'node:test';
import assert from 'node:assert/strict';
import { DirtyJtagWebUsbTransport, discoverDirtyJtag } from '../src/lib/dirtyjtag-webusb';
import {
  GowinJtag,
  instructionCommand,
  registerReadCommand,
  decodeRegister,
  dataWriteCommands,
} from '../src/lib/gowin-jtag';
import type {
  WebUsbDevice,
  UsbConfigurationDescriptor,
  UsbControlSetup,
} from '../src/lib/ftdi-webusb';
import { programmingFixture } from './fixtures/gowin-bitstream';
import { parseGowinBitstream } from '../shared/gowin-bitstream';

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
// Independent DJTAG2 packet parser and TAP, including firmware's MSB-first wire format.
class DirtyDevice implements WebUsbDevice {
  vendorId = 0x1209;
  productId = 0xc0ca;
  opened = false;
  productName = 'DirtyJTAG';
  configuration: UsbConfigurationDescriptor | null = null;
  configurations: UsbConfigurationDescriptor[] = [
    {
      configurationValue: 1,
      interfaces: [
        {
          interfaceNumber: 0,
          alternate: {
            alternateSetting: 0,
            interfaceClass: 255,
            endpoints: [
              { endpointNumber: 1, direction: 'out', type: 'bulk', packetSize: 64 },
              { endpointNumber: 2, direction: 'in', type: 'bulk', packetSize: 64 },
            ],
          },
          alternates: [],
        },
        {
          interfaceNumber: 1,
          alternate: { alternateSetting: 0, interfaceClass: 2, endpoints: [] },
          alternates: [],
        },
      ],
    },
  ];
  claims: number[] = [];
  releases: number[] = [];
  packets: Uint8Array[] = [];
  pending = new Uint8Array(0);
  state = 'idle';
  ir = 0x11;
  tms = 0;
  tdi = 0;
  irBits: number[] = [];
  drBits: number[] = [];
  configBits: number[] = [];
  id = 0x81b;
  tail = 0xffffffff;
  user = 0x8896;
  status = 0x6020;
  instructions: number[] = [];
  failClaim = false;
  short = false;
  hang = false;
  invalidInfo = false;
  constructor() {
    for (const intf of this.configurations[0].interfaces) intf.alternates = [intf.alternate];
  }
  async open() {
    this.opened = true;
  }
  async close() {
    this.opened = false;
  }
  async selectConfiguration() {
    this.configuration = this.configurations[0];
  }
  async claimInterface(value: number) {
    this.claims.push(value);
    if (this.failClaim) throw new Error('claim denied');
  }
  async releaseInterface(value: number) {
    this.releases.push(value);
  }
  async selectAlternateInterface() {}
  async controlTransferIn(_setup: UsbControlSetup, _length: number): Promise<never> {
    throw new Error('FTDI control must never reach DirtyJTAG');
  }
  async controlTransferOut(_setup: UsbControlSetup): Promise<never> {
    throw new Error('FTDI control must never reach DirtyJTAG');
  }
  pulse(tms: number, tdi: number) {
    let tdo = 0;
    if (this.state === 'shift-ir') this.irBits.push(tdi);
    if (this.state === 'shift-dr') {
      const bit = this.drBits.length;
      const value =
        this.ir === 0x11
          ? bit < 32
            ? this.id
            : this.tail
          : this.ir === 0x41
            ? this.status
            : this.user;
      tdo = (value >>> (bit % 32)) & 1;
      this.drBits.push(tdi);
    }
    const next = TAP[this.state][tms];
    if (next === 'reset') this.ir = 0x11;
    if (next === 'capture-ir') this.irBits = [];
    if (next === 'capture-dr') this.drBits = [];
    if (next === 'update-ir') {
      assert.equal(this.irBits.length, 8);
      this.ir = this.irBits.reduce((v, b, i) => v | (b << i), 0);
      this.instructions.push(this.ir);
      if (this.ir === 0x15) this.status |= 0x80;
      if (this.ir === 0x05) this.status = 0xa0;
      if (this.ir === 0x08) this.status |= 0x2000;
      if (this.ir === 0x3a) this.status &= ~0x80;
    }
    if (next === 'update-dr') {
      if (this.ir === 0x17) this.configBits = [...this.drBits];
      if (this.ir === 0x0a) this.user = this.drBits.reduce((v, b, i) => v | (b << i), 0) >>> 0;
    }
    this.state = next;
    return tdo;
  }
  async transferOut(endpoint: number, bytes: Uint8Array<ArrayBuffer>) {
    assert.equal(endpoint, 1);
    assert.ok(bytes.length <= 64);
    this.packets.push(bytes.slice());
    if (this.hang) return new Promise<never>(() => {});
    if (this.short) return { status: 'ok' as const, bytesWritten: bytes.length - 1 };
    const out: number[] = [];
    for (let pos = 0; pos < bytes.length;) {
      const op = bytes[pos++];
      if (!op) break;
      if (op === 1)
        out.push(
          ...new TextEncoder().encode(this.invalidInfo ? 'DJTAG1\n\0\0\0' : 'DJTAG2\n\0\0\0'),
          ...new Array(14).fill(0xab),
        );
      else if (op === 2) {
        pos += 2;
      } else if (op === 4) {
        const mask = bytes[pos++],
          value = bytes[pos++];
        if (mask & 16) this.tms = (value >>> 4) & 1;
        if (mask & 4) this.tdi = (value >>> 2) & 1;
      } else if ((op & 15) === 3) {
        const bits = bytes[pos++] + (op & 64 ? 256 : 0),
          count = Math.ceil(bits / 8),
          data = new Array(count).fill(0);
        assert.ok(bits <= 496);
        assert.ok(pos + count <= bytes.length);
        for (let i = 0; i < bits; i++) {
          const bit = this.pulse(this.tms, (bytes[pos + (i >>> 3)] >>> (7 - (i % 8))) & 1);
          data[i >>> 3] |= bit << (7 - (i % 8));
        }
        if (!(op & 128)) out.push(...data);
        pos += count;
      } else if ((op & 15) === 6) {
        const signals = bytes[pos++],
          pulses = bytes[pos++];
        let last = 0;
        for (let i = 0; i < pulses; i++)
          last = this.pulse((signals >>> 4) & 1, (signals >>> 2) & 1);
        if (op & 128) out.push(last ? 255 : 0);
      } else assert.fail('Unknown DirtyJTAG command ' + op);
    }
    assert.equal(this.pending.length, 0, 'each response must be consumed before next command');
    this.pending = Uint8Array.from(out);
    return { status: 'ok' as const, bytesWritten: bytes.length };
  }
  async transferIn(endpoint: number, length: number) {
    assert.equal(endpoint, 2);
    assert.equal(length, 64);
    const data = this.pending;
    this.pending = new Uint8Array();
    return { status: 'ok' as const, data: new DataView(data.buffer) };
  }
}
test('DirtyJTAG discovers only the vendor JTAG interface and consumes INFO debug tail', async () => {
  const device = new DirtyDevice(),
    transport = await DirtyJtagWebUsbTransport.open(device);
  assert.deepEqual(device.claims, [0]);
  assert.equal(device.pending.length, 0);
  assert.deepEqual(await new GowinJtag(transport).probe(), {
    idCode: 0x81b,
    status: 0x6020,
    userCode: 0x8896,
  });
  assert.deepEqual(await transport.close(), []);
  assert.deepEqual(device.releases, [0]);
  assert.equal(device.opened, false);
  const wrong = new DirtyDevice();
  wrong.vendorId = 0x0403;
  assert.throws(() => discoverDirtyJtag(wrong));
});
test('DirtyJTAG preserves each of 32 sampled register bits and IR/DR boundaries', async () => {
  for (const value of [0, 0xffffffff, ...Array.from({ length: 32 }, (_, bit) => 2 ** bit)]) {
    const device = new DirtyDevice(),
      transport = await DirtyJtagWebUsbTransport.open(device);
    device.user = value;
    await transport.write(instructionCommand(0x13));
    await transport.write(registerReadCommand(32));
    const decoded = decodeRegister(await transport.readExact(5), 32);
    assert.equal(new DataView(decoded.buffer).getUint32(0, true), value);
    assert.equal(device.drBits.length, 32);
    assert.equal(device.state, 'idle');
    await transport.close();
  }
});
test('DirtyJTAG 62-byte packets keep one uninterrupted configuration scan', async () => {
  for (const length of [1, 2, 31, 32, 61, 62, 63, 509, 510, 511, 1020]) {
    const device = new DirtyDevice(),
      transport = await DirtyJtagWebUsbTransport.open(device),
      data = Uint8Array.from({ length }, (_, i) => (i * 71) & 255);
    await transport.write(instructionCommand(0x17));
    for (const command of dataWriteCommands(data)) await transport.write(command);
    assert.deepEqual(
      device.configBits,
      [...data].flatMap((byte) => Array.from({ length: 8 }, (_, bit) => (byte >>> bit) & 1)),
    );
    assert.equal(device.state, 'idle');
    await transport.close();
  }
});
test('DirtyJTAG completes the same SRAM bitstream and checks Done/UserCode', async () => {
  const device = new DirtyDevice(),
    transport = await DirtyJtagWebUsbTransport.open(device),
    fs = programmingFixture();
  const result = await new GowinJtag(
    transport,
    () => {},
    async () => {},
  ).program(fs);
  assert.equal(result.userCode, 0x35b1);
  assert.equal(result.status & 0x200f, 0x2000);
  assert.deepEqual(
    device.configBits,
    [...parseGowinBitstream(fs).wireBytes].flatMap((byte) =>
      Array.from({ length: 8 }, (_, bit) => (byte >>> (7 - bit)) & 1),
    ),
  );
  assert.ok(!device.instructions.some((op) => [0x3c, 0x71, 0x75].includes(op)));
  await transport.close();
});
test('DirtyJTAG rejects wrong chip and chain before any SRAM instruction', async () => {
  for (const property of ['id', 'tail'] as const) {
    const device = new DirtyDevice();
    device[property] = 0x12345678;
    const transport = await DirtyJtagWebUsbTransport.open(device);
    await assert.rejects(new GowinJtag(transport).program(programmingFixture()), /Ожидается одна/);
    assert.deepEqual(device.instructions, []);
    await transport.close();
  }
});
test('DirtyJTAG validates whole commands before sending, and never retries a short USB write', async () => {
  const device = new DirtyDevice(),
    transport = await DirtyJtagWebUsbTransport.open(device),
    count = device.packets.length;
  await assert.rejects(transport.write(Uint8Array.of(0x4b, 0, 1, 0xff)), /Неподдерживаемая/);
  assert.equal(device.packets.length, count);
  device.short = true;
  await assert.rejects(transport.write(Uint8Array.of(0x4b, 0, 1)), /Неполная/);
  assert.equal(device.packets.length, count + 1);
  await assert.rejects(transport.write(Uint8Array.of(0x4b, 0, 1)), /недоступна/);
  await transport.close();
});
test('DirtyJTAG claim failure sends no packets, and DJTAG1 receives no GPIO commands', async () => {
  const device = new DirtyDevice();
  device.failClaim = true;
  await assert.rejects(DirtyJtagWebUsbTransport.open(device), /claim denied/);
  assert.equal(device.packets.length, 0);
  assert.equal(device.opened, false);
  const old = new DirtyDevice();
  old.invalidInfo = true;
  await assert.rejects(DirtyJtagWebUsbTransport.open(old), /не подтвердил/);
  assert.equal(old.packets.length, 1);
  assert.equal(old.opened, false);
});
test('DirtyJTAG stalled USB has a deadline and closes the abandoned session', async () => {
  const device = new DirtyDevice(),
    transport = await DirtyJtagWebUsbTransport.open(device, { timeoutMs: 10 });
  device.hang = true;
  await assert.rejects(transport.write(Uint8Array.of(0x4b, 0, 1)), /Нет ответа/);
  assert.equal(device.opened, false);
  await transport.close();
});
