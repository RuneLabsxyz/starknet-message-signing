import { describe, it, expect } from 'vitest';
import { padAddress, normalizeAddress, addressEquals } from '../src';

describe('padAddress', () => {
  it('pads short address with 0x prefix', () => {
    const result = padAddress('0x1234');
    expect(result).toBe('0x' + '0'.repeat(60) + '1234');
    expect(result.length).toBe(66);
  });

  it('pads short address without 0x prefix', () => {
    const result = padAddress('1234');
    expect(result).toBe('0x' + '0'.repeat(60) + '1234');
  });

  it('handles full length address', () => {
    const fullAddress = '0x' + '1'.repeat(64);
    const result = padAddress(fullAddress);
    expect(result).toBe(fullAddress.toLowerCase());
  });

  it('lowercases address', () => {
    const result = padAddress('0xABCD');
    expect(result).toBe('0x' + '0'.repeat(60) + 'abcd');
  });
});

describe('normalizeAddress', () => {
  it('pads and lowercases', () => {
    const result = normalizeAddress('0xABCD');
    expect(result).toBe('0x' + '0'.repeat(60) + 'abcd');
  });
});

describe('addressEquals', () => {
  it('returns true for equal addresses with different padding', () => {
    expect(addressEquals('0x1234', '0x' + '0'.repeat(60) + '1234')).toBe(true);
  });

  it('returns true for equal addresses with different case', () => {
    expect(addressEquals('0xABCD', '0xabcd')).toBe(true);
  });

  it('returns false for different addresses', () => {
    expect(addressEquals('0x1234', '0x5678')).toBe(false);
  });

  it('handles addresses without 0x prefix', () => {
    expect(addressEquals('1234', '0x1234')).toBe(true);
  });
});
