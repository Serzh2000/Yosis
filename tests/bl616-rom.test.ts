import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeBl616BootInfo, probeBl616Rom, type RomSerialPort } from '../src/lib/bl616-rom';

// Independent BL616 manufacturer log: OK, 24-byte BootInfo. No image/flash fixture.
const raw = Uint8Array.from(Buffer.from('010016060000010027128901cd002bcf0eb49a000f758010', 'hex'));
const reply = Uint8Array.from([0x4f, 0x4b, 24, 0, ...raw]);

function portDouble(
  options: {
    sync?: number[];
    response?: Uint8Array;
    fragment?: boolean;
    noResponse?: boolean;
    vendor?: number;
    product?: number;
    failOpen?: boolean;
    closedResponse?: boolean;
  } = {},
) {
  let input: ReadableStreamDefaultController<Uint8Array>;
  const writes: number[][] = [];
  let opens = 0,
    closes = 0,
    cancels = 0;
  const port: RomSerialPort = {
    readable: new ReadableStream({
      start(controller) {
        input = controller;
      },
      cancel() {
        cancels++;
      },
    }),
    writable: new WritableStream({
      write(data) {
        writes.push(Array.from(data));
        if (options.noResponse) return;
        const bytes =
          writes.length === 1
            ? new Uint8Array(options.sync ?? [0x4f, 0x4b])
            : (options.response ?? reply);
        if (options.closedResponse) {
          input.close();
          return;
        }
        if (options.fragment) for (const byte of bytes) input.enqueue(new Uint8Array([byte]));
        else input.enqueue(bytes);
      },
    }),
    getInfo: () => ({
      usbVendorId: options.vendor ?? 0xffff,
      usbProductId: options.product ?? 0xffff,
    }),
    async open(settings) {
      opens++;
      assert.equal(settings.baudRate, 115200);
      if (options.failOpen) throw new Error('open failed');
    },
    async close() {
      closes++;
    },
  };
  return { port, writes, counts: () => ({ opens, closes, cancels }) };
}

test('BL616 boot-info vector uses IF signing/encryption offsets and reversed chip ID', () => {
  const info = decodeBl616BootInfo(raw, 'ffff:ffff');
  assert.deepEqual(info, {
    usbId: 'ffff:ffff',
    version: '0x06160001',
    signing: 0,
    encryption: 0,
    chipId: 'b40ecf2b00cd',
    raw: Buffer.from(raw).toString('hex'),
  });
  const protectedInfo = raw.slice();
  protectedInfo[4] = 1;
  protectedInfo[5] = 2;
  assert.equal(decodeBl616BootInfo(protectedInfo, '').signing, 1);
  assert.equal(decodeBl616BootInfo(protectedInfo, '').encryption, 2);
  const loader = raw.slice();
  loader.fill(0xff, 0, 4);
  assert.throws(() => decodeBl616BootInfo(loader, ''), /это не ответ ROM/);
});

test('probe emits only sync and GetBootInfo and closes unlocked streams', async () => {
  const mock = portDouble();
  const info = await probeBl616Rom(mock.port);
  assert.equal(info.version, '0x06160001');
  assert.deepEqual(mock.writes, [Array(69).fill(0x55), [0x10, 0, 0, 0]]);
  assert.deepEqual(mock.counts(), { opens: 1, closes: 1, cancels: 1 });
  assert.equal(mock.port.readable?.locked, false);
  assert.equal(mock.port.writable?.locked, false);
});

test('byte fragments, stale sync FL0201 and repeated OK do not corrupt GetBootInfo', async () => {
  const mock = portDouble({
    fragment: true,
    sync: [0x4f, 0x4b, 0x46, 0x4c, 2, 1],
    response: Uint8Array.from([0x4f, 0x4b, ...reply]),
  });
  assert.equal((await probeBl616Rom(mock.port)).raw, Buffer.from(raw).toString('hex'));
  assert.deepEqual(mock.writes[1], [0x10, 0, 0, 0]);
});

test('ordinary FTDI serial port is rejected before opening or traffic', async () => {
  const mock = portDouble({ vendor: 0x0403 });
  await assert.rejects(probeBl616Rom(mock.port), /Нужен порт загрузчика/);
  assert.deepEqual(mock.counts(), { opens: 0, closes: 0, cancels: 0 });
  assert.equal(mock.writes.length, 0);
});

test('stock BL616 ROM 349b:6160 observed as Windows COM12 passes the selector identity check', async () => {
  const mock = portDouble({ vendor: 0x349b, product: 0x6160 });
  assert.equal((await probeBl616Rom(mock.port)).usbId, '349b:6160');
  assert.deepEqual(mock.writes, [Array(69).fill(0x55), [0x10, 0, 0, 0]]);
});

test('actual stock Tang Nano browser BootInfo requires encryption for IF loading', () => {
  const actual = Uint8Array.from(
    Buffer.from('01001606000101002792800135b7f50286241a000f758010', 'hex'),
  );
  const info = decodeBl616BootInfo(actual, '349b:6160');
  assert.equal(info.version, '0x06160001');
  assert.equal(info.signing, 0);
  assert.equal(info.encryption, 1);
});

test('ROM FL response preserves its error code without sending another command', async () => {
  const mock = portDouble({ response: new Uint8Array([0x46, 0x4c, 2, 1]) });
  await assert.rejects(probeBl616Rom(mock.port), /0x0102/);
  assert.equal(mock.writes.length, 2);
  assert.equal(mock.counts().closes, 1);
});

test('oversized reply length is rejected and never reaches image/run commands', async () => {
  const mock = portDouble({ response: new Uint8Array([0x4f, 0x4b, 0xff, 0x7f]) });
  await assert.rejects(probeBl616Rom(mock.port), /длина BootInfo/);
  assert.equal(mock.writes.length, 2);
  assert.equal(mock.counts().closes, 1);
  assert.throws(() => decodeBl616BootInfo(new Uint8Array(20), ''), /Некорректный/);
});

test('timeout cancels the outstanding read and releases the serial port', async () => {
  const mock = portDouble({ noResponse: true });
  await assert.rejects(probeBl616Rom(mock.port, { timeoutMs: 15 }), /Нет ответа ROM/);
  assert.deepEqual(mock.counts(), { opens: 1, closes: 1, cancels: 1 });
  assert.equal(mock.port.readable?.locked, false);
  assert.equal(mock.writes.length, 1);
});

test('disconnect and open failures do not report successful boot info', async () => {
  const detached = portDouble({ closedResponse: true });
  await assert.rejects(probeBl616Rom(detached.port), /отключён/);
  assert.equal(detached.counts().closes, 1);
  const unopened = portDouble({ failOpen: true });
  await assert.rejects(probeBl616Rom(unopened.port), /open failed/);
  assert.equal(unopened.counts().closes, 0);
  assert.equal(unopened.writes.length, 0);
});
