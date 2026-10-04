function bits(hex: string) {
  return [...Buffer.from(hex, 'hex')].map((byte) => byte.toString(2).padStart(8, '0')).join('');
}
// CRCs calculated independently with Apicula: first 9231, chained 502D, tail 7334.
export function programmingFixture(): string {
  const headers = [
    'ff'.repeat(20),
    'ffff',
    'a5c3',
    '060000000000081b',
    '1000000000ae0000',
    '5100ffffffffffff',
    '0b000000',
    'd200ffff00000000',
    '12000000',
    '3b80053e',
  ].map(bits);
  const data = '0'.repeat(3376);
  return [
    ...headers,
    data + bits('3192') + '1'.repeat(48),
    ...Array.from({ length: 1341 }, () => data + bits('2d50') + '1'.repeat(48)),
    bits('ff'.repeat(18) + '3473'),
    bits('0a000000000035b1'),
    bits('ff'.repeat(8)),
    bits('08000000'),
    bits('ff'.repeat(8)),
    bits('ffff'),
    '',
  ].join('\n');
}
