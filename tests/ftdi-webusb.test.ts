import test from 'node:test';
import assert from 'node:assert/strict';
import {
  discoverFtdiInterfaceA,
  FtdiWebUsbTransport,
  stripFtdiStatusBytes,
  type UsbAlternateDescriptor,
  type UsbConfigurationDescriptor,
  type UsbControlSetup,
  type UsbInResult,
  type UsbOutResult,
  type WebUsbDevice,
} from '../src/lib/ftdi-webusb';

const alternate: UsbAlternateDescriptor = {
  alternateSetting: 0,
  interfaceClass: 0xff,
  endpoints: [
    { endpointNumber: 1, direction: 'in', type: 'bulk', packetSize: 64 },
    { endpointNumber: 2, direction: 'out', type: 'bulk', packetSize: 64 },
  ],
};
const configuration: UsbConfigurationDescriptor = {
  configurationValue: 1,
  interfaces: [
    { interfaceNumber: 0, alternate, alternates: [alternate] },
    {
      interfaceNumber: 1,
      alternate: {
        ...alternate,
        endpoints: alternate.endpoints.map((endpoint) => ({
          ...endpoint,
          endpointNumber: endpoint.endpointNumber + 2,
        })),
      },
      alternates: [alternate],
    },
  ],
};

function view(bytes: readonly number[] | Uint8Array): DataView {
  // Use an offset view to catch accidental reads of the whole backing ArrayBuffer.
  const buffer = new Uint8Array(bytes.length + 4);
  buffer.set(bytes, 2);
  return new DataView(buffer.buffer, 2, bytes.length);
}
function ok(bytes: readonly number[] | Uint8Array): UsbInResult {
  return { status: 'ok', data: view(bytes) };
}

class FakeUsb implements WebUsbDevice {
  vendorId = 0x0403;
  productId = 0x6010;
  serialNumber = 'independent-fixture';
  productName = "20K's FRIEND";
  opened = false;
  configuration: UsbConfigurationDescriptor | null = configuration;
  configurations: readonly UsbConfigurationDescriptor[] = [configuration];
  calls: { method: string; args: unknown[] }[] = [];
  input: UsbInResult[] = [ok([0x01, 0x60, 0xfa, 0xaa])];
  openFailure = false;
  claimFailure = false;
  outputResult: UsbOutResult | undefined;
  hangInput = false;
  hangOutput = false;
  hangControl = false;
  releaseFailure = false;

  async open() {
    this.calls.push({ method: 'open', args: [] });
    if (this.openFailure) throw new Error('open failure');
    this.opened = true;
  }
  async close() {
    this.calls.push({ method: 'close', args: [] });
    this.opened = false;
  }
  async selectConfiguration(value: number) {
    this.calls.push({ method: 'selectConfiguration', args: [value] });
    this.configuration = this.configurations.find((item) => item.configurationValue === value)!;
  }
  async claimInterface(index: number) {
    this.calls.push({ method: 'claimInterface', args: [index] });
    if (this.claimFailure) throw new Error('claim failure');
  }
  async releaseInterface(index: number) {
    this.calls.push({ method: 'releaseInterface', args: [index] });
    if (this.releaseFailure) throw new Error('release failure');
  }
  async selectAlternateInterface(index: number, value: number) {
    this.calls.push({ method: 'selectAlternateInterface', args: [index, value] });
  }
  async controlTransferIn(setup: UsbControlSetup, length: number) {
    this.calls.push({ method: 'controlTransferIn', args: [{ ...setup }, length] });
    return ok([16]);
  }
  async controlTransferOut(setup: UsbControlSetup): Promise<UsbOutResult> {
    this.calls.push({ method: 'controlTransferOut', args: [{ ...setup }] });
    if (this.hangControl) return new Promise(() => {});
    return { status: 'ok', bytesWritten: 0 };
  }
  async transferIn(endpoint: number, length: number): Promise<UsbInResult> {
    this.calls.push({ method: 'transferIn', args: [endpoint, length] });
    if (this.hangInput) return new Promise(() => {});
    return this.input.shift() ?? ok([0x01, 0x60]);
  }
  async transferOut(endpoint: number, bytes: Uint8Array<ArrayBuffer>): Promise<UsbOutResult> {
    this.calls.push({ method: 'transferOut', args: [endpoint, new Uint8Array(bytes)] });
    if (this.hangOutput) return new Promise(() => {});
    return this.outputResult ?? { status: 'ok', bytesWritten: bytes.length };
  }
}

test('FTDI discovery selects only interface A and rejects vendor/bulk/alternate ambiguity', () => {
  const usb = new FakeUsb();
  assert.deepEqual(discoverFtdiInterfaceA(usb), {
    configurationValue: 1,
    alternateSetting: 0,
    input: 1,
    output: 2,
    packetSize: 64,
  });
  usb.productId = 0x6011;
  assert.throws(() => discoverFtdiInterfaceA(usb), /0403:6010/);
  usb.productId = 0x6010;
  usb.configurations = [{ configurationValue: 1, interfaces: [configuration.interfaces[1]] }];
  assert.throws(() => discoverFtdiInterfaceA(usb), /interface A/);
  for (const bad of [
    { ...alternate, interfaceClass: 2 },
    { ...alternate, endpoints: [...alternate.endpoints, alternate.endpoints[0]] },
    {
      ...alternate,
      endpoints: alternate.endpoints.map((endpoint) => ({
        ...endpoint,
        type: 'interrupt' as const,
      })),
    },
    {
      ...alternate,
      endpoints: alternate.endpoints.map((endpoint) => ({ ...endpoint, direction: 'in' as const })),
    },
    {
      ...alternate,
      endpoints: alternate.endpoints.map((endpoint) => ({ ...endpoint, packetSize: 0 })),
    },
  ]) {
    usb.configurations = [
      {
        configurationValue: 1,
        interfaces: [{ interfaceNumber: 0, alternate: bad, alternates: [bad] }],
      },
    ];
    assert.throws(() => discoverFtdiInterfaceA(usb), /interface A/);
  }
  usb.configurations = [
    {
      configurationValue: 1,
      interfaces: [
        {
          interfaceNumber: 0,
          alternate,
          alternates: [alternate, { ...alternate, alternateSetting: 1 }],
        },
      ],
    },
  ];
  assert.throws(() => discoverFtdiInterfaceA(usb), /единственный/);
});

test('FTDI status stripping removes headers per full and short packet, including status-only packets', () => {
  const wire = new Uint8Array(64 * 2 + 5);
  wire.set([0x01, 0x60], 0);
  wire.set(
    Array.from({ length: 62 }, (_, index) => index),
    2,
  );
  wire.set([0x02, 0x61], 64);
  wire.set(
    Array.from({ length: 62 }, (_, index) => index + 62),
    66,
  );
  wire.set([0x03, 0x62, 124, 125, 126], 128);
  assert.deepEqual(
    stripFtdiStatusBytes(view(wire), 64),
    Uint8Array.from({ length: 127 }, (_, index) => index),
  );
  assert.deepEqual(stripFtdiStatusBytes(Uint8Array.of(0x01, 0x60), 64), new Uint8Array());
  assert.deepEqual(stripFtdiStatusBytes(new Uint8Array(), 64), new Uint8Array());
  const fullPlusStatus = new Uint8Array(66);
  fullPlusStatus.set(wire.subarray(0, 64));
  fullPlusStatus.set([0x01, 0x60], 64);
  assert.equal(stripFtdiStatusBytes(fullPlusStatus, 64).length, 62);
  assert.throws(() => stripFtdiStatusBytes(new Uint8Array(65), 64), /Неполный/);
  assert.throws(() => stripFtdiStatusBytes(Uint8Array.of(1), 64), /Неполный/);
  assert.throws(() => stripFtdiStatusBytes(new Uint8Array(), 2), /размер/);
  const highSpeed = new Uint8Array(1027);
  highSpeed.set([0x01, 0x60], 0);
  highSpeed.set([0x01, 0x60], 512);
  highSpeed.set([0x01, 0x60, 9], 1024);
  assert.equal(stripFtdiStatusBytes(highSpeed, 512).length, 1021);
});

test('MPSSE initialization follows literal FTDI vendor requests and synchronization before JTAG directions', async () => {
  const usb = new FakeUsb();
  const transport = await FtdiWebUsbTransport.open(usb);
  assert.equal(transport.ready, true);
  assert.equal(transport.requestedFrequency, 2_500_000);
  assert.equal(transport.actualFrequency, 2_000_000);
  assert.deepEqual(
    usb.calls.filter((call) => call.method === 'claimInterface').map((call) => call.args),
    [[0]],
  );
  const controls = usb.calls
    .filter((call) => call.method === 'controlTransferOut')
    .map((call) => call.args[0] as UsbControlSetup);
  assert.deepEqual(
    controls.map(({ request, value, index }) => [request, value, index]),
    [
      [0, 0, 1],
      [0x0b, 0, 1],
      [0, 1, 1],
      [0, 2, 1],
      [9, 2, 1],
      [0x0b, 0x020b, 1],
      [0, 1, 1],
      [0, 2, 1],
    ],
  );
  assert.ok(
    controls.every((setup) => setup.requestType === 'vendor' && setup.recipient === 'device'),
  );
  const writes = usb.calls.filter((call) => call.method === 'transferOut');
  assert.deepEqual(writes[0].args, [2, Uint8Array.of(0xaa, 0x87)]);
  assert.deepEqual(writes[1].args, [2, Uint8Array.of(0x8b, 0x85, 0x86, 2, 0, 0x80, 8, 0x0b, 0x87)]);
  assert.deepEqual(await transport.close(), []);
  const cleanupControls = usb.calls
    .filter((call) => call.method === 'controlTransferOut')
    .slice(-2)
    .map((call) => call.args[0] as UsbControlSetup);
  assert.deepEqual(
    cleanupControls.map(({ request, value, index }) => [request, value, index]),
    [
      [0x0b, 0, 1],
      [9, 16, 1],
    ],
  );
  assert.equal(usb.calls.at(-2)?.method, 'releaseInterface');
  assert.equal(usb.calls.at(-1)?.method, 'close');
  assert.equal(transport.ready, false);
});

test('bulk reads preserve excess payload and handle several FTDI packet headers in one transfer', async () => {
  const usb = new FakeUsb();
  const transport = await FtdiWebUsbTransport.open(usb);
  const wire = new Uint8Array(69);
  wire.set([0x01, 0x60]);
  wire.set(
    Uint8Array.from({ length: 62 }, (_, index) => index),
    2,
  );
  wire.set([0x01, 0x60, 62, 63, 64], 64);
  usb.input.push(ok(wire));
  assert.deepEqual(
    await transport.readExact(63),
    Uint8Array.from({ length: 63 }, (_, index) => index),
  );
  const count = usb.calls.filter((call) => call.method === 'transferIn').length;
  assert.deepEqual(await transport.readExact(2), Uint8Array.of(63, 64));
  assert.equal(
    usb.calls.filter((call) => call.method === 'transferIn').length,
    count,
    'Excess bytes are consumed from the local buffer',
  );
  usb.input.push(ok([0x01, 0x60]), ok([0x01, 0x60, 10]), ok([0x01, 0x60, 11]));
  assert.deepEqual(await transport.readExact(2), Uint8Array.of(10, 11));
  await transport.close();
});

test('failed interface claiming never issues vendor requests or releases an unclaimed interface', async () => {
  const usb = new FakeUsb();
  usb.claimFailure = true;
  const transport = new FtdiWebUsbTransport(usb);
  await assert.rejects(transport.open(), /claim failure/);
  assert.deepEqual(
    usb.calls.map((call) => call.method),
    ['open', 'claimInterface', 'close'],
  );
  assert.equal(usb.opened, false);
  assert.equal(transport.ready, false);
  await assert.rejects(transport.write(Uint8Array.of(0x87)), /недоступна/);
  const unopened = new FakeUsb();
  unopened.openFailure = true;
  await assert.rejects(FtdiWebUsbTransport.open(unopened), /open failure/);
  assert.deepEqual(
    unopened.calls.map((call) => call.method),
    ['open'],
  );
});

test('invalid synchronization resets claimed channel and never sends JTAG clock configuration', async () => {
  const usb = new FakeUsb();
  usb.input = [ok([0x01, 0x60, 0xfa, 0xab])];
  await assert.rejects(FtdiWebUsbTransport.open(usb), /MPSSE/);
  assert.equal(usb.calls.filter((call) => call.method === 'transferOut').length, 1);
  assert.ok(usb.calls.some((call) => call.method === 'releaseInterface'));
  assert.equal(usb.calls.at(-1)?.method, 'close');
  const extra = new FakeUsb();
  extra.input = [ok([0x01, 0x60, 0xfa, 0xaa, 0xaa])];
  await assert.rejects(FtdiWebUsbTransport.open(extra), /MPSSE/);
});

test('short or stalled bulk writes are never retried and poison further MPSSE operations', async () => {
  for (const result of [
    { status: 'ok' as const, bytesWritten: 1 },
    { status: 'stall' as const, bytesWritten: 0 },
  ]) {
    const usb = new FakeUsb();
    const transport = await FtdiWebUsbTransport.open(usb);
    usb.outputResult = result;
    const count = usb.calls.filter((call) => call.method === 'transferOut').length;
    await assert.rejects(transport.write(Uint8Array.of(1, 2, 3)), /Неполная запись/);
    assert.equal(usb.calls.filter((call) => call.method === 'transferOut').length, count + 1);
    await assert.rejects(transport.write(Uint8Array.of(1, 2, 3)), /недоступна/);
    await transport.close();
  }
});

test('hung reads and writes expire, close the handle, and cannot retry or restore around outstanding transfers', async () => {
  for (const operation of ['read', 'write'] as const) {
    const usb = new FakeUsb();
    const transport = await FtdiWebUsbTransport.open(usb, { timeoutMs: 15, readTimeoutMs: 15 });
    const controls = usb.calls.filter((call) => call.method === 'controlTransferOut').length;
    if (operation === 'read') usb.hangInput = true;
    else usb.hangOutput = true;
    const started = Date.now();
    await assert.rejects(
      operation === 'read' ? transport.readExact(1) : transport.write(Uint8Array.of(1)),
      /Истекло время/,
    );
    assert.ok(Date.now() - started < 500);
    assert.equal(transport.ready, false);
    assert.equal(usb.opened, false);
    await transport.close();
    assert.equal(usb.calls.filter((call) => call.method === 'controlTransferOut').length, controls);
    assert.equal(usb.calls.filter((call) => call.method === 'close').length, 1);
    await assert.rejects(transport.readExact(1), /недоступна/);
  }
});

test('status-only streams obey an overall read deadline and malformed packet lengths are rejected', async () => {
  const usb = new FakeUsb();
  const transport = await FtdiWebUsbTransport.open(usb, { readTimeoutMs: 10 });
  await assert.rejects(transport.readExact(1), /время/);
  assert.ok(usb.calls.filter((call) => call.method === 'transferIn').length < 50);
  await transport.close();
  const malformed = new FakeUsb();
  const reader = await FtdiWebUsbTransport.open(malformed);
  malformed.input.push(ok([1]));
  await assert.rejects(reader.readExact(1), /Неполный пакет/);
  await reader.close();
});

test('write chunk boundaries preserve all bytes and cleanup remains bounded when FTDI control hangs', async () => {
  const usb = new FakeUsb();
  const transport = await FtdiWebUsbTransport.open(usb, { timeoutMs: 15 });
  const source = Uint8Array.from({ length: 5000 }, (_, index) => index & 255);
  await transport.write(source);
  const chunks = usb.calls
    .filter((call) => call.method === 'transferOut')
    .slice(-2)
    .map((call) => call.args[1] as Uint8Array);
  assert.deepEqual(
    chunks.map((chunk) => chunk.length),
    [4096, 904],
  );
  assert.deepEqual(Uint8Array.from([...chunks[0], ...chunks[1]]), source);
  usb.hangControl = true;
  const controls = usb.calls.filter((call) => call.method === 'controlTransferOut').length;
  const warnings = await transport.close();
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Истекло время/);
  assert.equal(
    usb.calls.filter((call) => call.method === 'controlTransferOut').length,
    controls + 1,
    'No restore is attempted after a hanging reset',
  );
  assert.equal(usb.opened, false);
});

test('transport refuses ownership of an existing browser session and validates memory bounds', async () => {
  const usb = new FakeUsb();
  usb.opened = true;
  const transport = new FtdiWebUsbTransport(usb);
  await assert.rejects(transport.open(), /уже открыта/);
  assert.deepEqual(usb.calls, []);
  assert.throws(() => new FtdiWebUsbTransport(new FakeUsb(), { timeoutMs: 0 }), /таймаут/);
  assert.throws(() => new FtdiWebUsbTransport(new FakeUsb(), { maxReadBytes: 2 ** 30 }), /размер/);
});
