import { describe, it, expect, beforeEach } from 'vitest';
import { setGlobalConfig, getGlobalConfig, resetGlobalConfig } from '../src';

describe('config', () => {
  beforeEach(() => {
    resetGlobalConfig();
  });

  it('has sensible defaults', () => {
    const config = getGlobalConfig();
    expect(config.chainId).toBe('SN_MAIN');
    expect(config.domainName).toBe('starknet-signing');
    expect(config.domainVersion).toBe('1');
    expect(config.cartridgeValidatorUrl).toBe('https://cartridge-validate.runelabs.workers.dev/');
  });

  it('allows partial config updates', () => {
    setGlobalConfig({ domainName: 'MyApp' });

    const config = getGlobalConfig();
    expect(config.domainName).toBe('MyApp');
    expect(config.chainId).toBe('SN_MAIN'); // Unchanged
  });

  it('allows full config updates', () => {
    setGlobalConfig({
      chainId: 'SN_SEPOLIA',
      domainName: 'TestApp',
      domainVersion: '2',
      cartridgeValidatorUrl: 'https://custom.url/'
    });

    const config = getGlobalConfig();
    expect(config.chainId).toBe('SN_SEPOLIA');
    expect(config.domainName).toBe('TestApp');
    expect(config.domainVersion).toBe('2');
    expect(config.cartridgeValidatorUrl).toBe('https://custom.url/');
  });

  it('resets to defaults', () => {
    setGlobalConfig({ domainName: 'Changed' });
    resetGlobalConfig();

    const config = getGlobalConfig();
    expect(config.domainName).toBe('starknet-signing');
  });

  it('returns a copy of config', () => {
    const config1 = getGlobalConfig();
    config1.domainName = 'Modified';

    const config2 = getGlobalConfig();
    expect(config2.domainName).toBe('starknet-signing'); // Not modified
  });
});
