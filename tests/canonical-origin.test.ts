import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalLocalUrl,
  KEEP_ORIGIN_PARAMETER,
  type LocationParts,
} from '../src/lib/canonical-origin';

const base: LocationParts = {
  protocol: 'http:',
  hostname: 'localhost',
  port: '5173',
  pathname: '/',
  search: '',
  hash: '',
};

test('localhost перенаправляется на 127.0.0.1 с сохранением порта, пути, запроса и якоря', () => {
  assert.equal(canonicalLocalUrl(base), 'http://127.0.0.1:5173/');
  assert.equal(
    canonicalLocalUrl({ ...base, port: '3001', pathname: '/a/b', search: '?x=1', hash: '#lesson' }),
    'http://127.0.0.1:3001/a/b?x=1#lesson',
  );
  assert.equal(
    canonicalLocalUrl({ ...base, hostname: 'LOCALHOST', port: '' }),
    'http://127.0.0.1/',
  );
  assert.equal(canonicalLocalUrl({ ...base, hostname: '[::1]' }), 'http://127.0.0.1:5173/');
});

test('канонический, публичный и защищённый адреса не перенаправляются', () => {
  assert.equal(canonicalLocalUrl({ ...base, hostname: '127.0.0.1' }), null);
  assert.equal(canonicalLocalUrl({ ...base, hostname: 'fpga.school.example' }), null);
  assert.equal(canonicalLocalUrl({ ...base, protocol: 'https:' }), null);
  assert.equal(canonicalLocalUrl({ ...base, hostname: 'notlocalhost' }), null);
  assert.equal(canonicalLocalUrl({ ...base, search: `?${KEEP_ORIGIN_PARAMETER}` }), null);
  assert.equal(canonicalLocalUrl({ ...base, hostname: 'localhost.evil.example' }), null);
});
