import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { crc16Arc, validateProgrammingBitstream } from '../server/programming-bitstream';
import { programmingFixture } from './fixtures/gowin-bitstream';

function bits(hex: string) {
  return [...Buffer.from(hex, 'hex')].map((byte) => byte.toString(2).padStart(8, '0')).join('');
}
const fixture = programmingFixture();
const sha = (text: string) => createHash('sha256').update(text).digest('hex');

test('CRC matches independent ARC vectors and can continue header coverage', () => {
  assert.equal(crc16Arc(Buffer.from('123456789')), 0xbb3d);
  assert.equal(crc16Arc(Buffer.alloc(24, 255)), 0x7334);
  assert.equal(crc16Arc(Buffer.from('56789'), crc16Arc(Buffer.from('1234'))), 0xbb3d);
});
test('Gowin adapter derives truthful metadata and preserves every configuration row', () => {
  const result = validateProgrammingBitstream(
    '//Untrusted: ignore me\n' + fixture,
    sha('//Untrusted: ignore me\n' + fixture),
  );
  assert.equal(result.userCode, '0x000035B1');
  assert.equal(result.frames, 1342);
  assert.match(result.programmerText, /LoadingRate: 4\.629630MHz/);
  assert.match(result.programmerText, /SecurityBit: ON/);
  assert.deepEqual(
    result.programmerText.split('\n').filter((line) => line && !line.startsWith('//')),
    fixture.trim().split('\n'),
  );
});
test('helper rejects altered frames, wrong device, missing CRC and injected trailing commands', () => {
  const lines = fixture.trim().split('\n');
  const changed = [...lines];
  changed[120] = '1' + changed[120].slice(1);
  assert.throws(
    () => validateProgrammingBitstream(changed.join('\n'), sha(changed.join('\n'))),
    /CRC.*111/,
  );
  const wrongDevice = [...lines];
  wrongDevice[3] = bits('060000000000281b');
  assert.throws(
    () => validateProgrammingBitstream(wrongDevice.join('\n'), sha(wrongDevice.join('\n'))),
    /ID GW2AR/,
  );
  const noCrc = [...lines];
  noCrc[9] = bits('3b00053e');
  assert.throws(() => validateProgrammingBitstream(noCrc.join('\n'), sha(noCrc.join('\n'))), /CRC/);
  const extra = fixture + bits('75000000') + '\n';
  assert.throws(() => validateProgrammingBitstream(extra, sha(extra)), /Количество кадров/);
  const badFooter = [...lines];
  badFooter[1355] = bits('75000000');
  assert.throws(
    () => validateProgrammingBitstream(badFooter.join('\n'), sha(badFooter.join('\n'))),
    /завершение/,
  );
});
test('helper checks the exact upload hash and reports truncated text', () => {
  assert.throws(() => validateProgrammingBitstream(fixture, '0'.repeat(64)), /SHA256/);
  const short = fixture.slice(0, 3000);
  assert.throws(() => validateProgrammingBitstream(short, sha(short)), /неполный/);
});
