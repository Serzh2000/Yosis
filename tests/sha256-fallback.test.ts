import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { sha256Bytes } from '../src/lib/programming-client';

test('SHA-256 without Web Crypto matches the reference for every padding boundary', () => {
  const sizes = [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 128, 1000, 70000];
  for (const size of sizes) {
    const bytes = Uint8Array.from({ length: size }, (_, index) => (index * 131 + size) & 0xff);
    assert.equal(sha256Bytes(bytes), createHash('sha256').update(bytes).digest('hex'), `${size}`);
  }
  assert.equal(
    sha256Bytes(new TextEncoder().encode('abc')),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});
