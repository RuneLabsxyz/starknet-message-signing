import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryNonceAdapter } from '../src';

describe('MemoryNonceAdapter', () => {
  let adapter: MemoryNonceAdapter;

  beforeEach(() => {
    adapter = new MemoryNonceAdapter();
  });

  it('returns null for unknown address', async () => {
    const nonce = await adapter.getCurrentNonce('0x123');
    expect(nonce).toBeNull();
  });

  it('initializes with provided nonces', async () => {
    adapter = new MemoryNonceAdapter({
      '0x123': 5,
      '0x456': 10
    });

    expect(await adapter.getCurrentNonce('0x123')).toBe(5);
    expect(await adapter.getCurrentNonce('0x456')).toBe(10);
  });

  it('normalizes addresses to lowercase', async () => {
    adapter = new MemoryNonceAdapter({
      '0xABC': 5
    });

    expect(await adapter.getCurrentNonce('0xabc')).toBe(5);
    expect(await adapter.getCurrentNonce('0xABC')).toBe(5);
  });

  it('updates nonce when higher than current', async () => {
    adapter.setNonce('0x123', 5);

    const success = await adapter.updateNonce('0x123', 10);
    expect(success).toBe(true);
    expect(await adapter.getCurrentNonce('0x123')).toBe(10);
  });

  it('rejects nonce update when equal to current', async () => {
    adapter.setNonce('0x123', 5);

    const success = await adapter.updateNonce('0x123', 5);
    expect(success).toBe(false);
    expect(await adapter.getCurrentNonce('0x123')).toBe(5);
  });

  it('rejects nonce update when lower than current', async () => {
    adapter.setNonce('0x123', 10);

    const success = await adapter.updateNonce('0x123', 5);
    expect(success).toBe(false);
    expect(await adapter.getCurrentNonce('0x123')).toBe(10);
  });

  it('rejects update for unknown address', async () => {
    const success = await adapter.updateNonce('0x123', 5);
    expect(success).toBe(false);
  });

  it('clears all nonces', async () => {
    adapter.setNonce('0x123', 5);
    adapter.setNonce('0x456', 10);

    adapter.clear();

    expect(await adapter.getCurrentNonce('0x123')).toBeNull();
    expect(await adapter.getCurrentNonce('0x456')).toBeNull();
  });

  it('setNonce creates entry for new address', async () => {
    adapter.setNonce('0x123', 5);
    expect(await adapter.getCurrentNonce('0x123')).toBe(5);
  });
});
