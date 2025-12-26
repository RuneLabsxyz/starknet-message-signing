import type { StarknetSigningConfig } from './types';

const DEFAULT_CARTRIDGE_VALIDATOR_URL = 'https://cartridge-validate.runelabs.workers.dev/';

let globalConfig: StarknetSigningConfig = {
  chainId: 'SN_MAIN',
  domainName: 'starknet-signing',
  domainVersion: '1',
  cartridgeValidatorUrl: DEFAULT_CARTRIDGE_VALIDATOR_URL
};

/**
 * Sets the global configuration for the signing library.
 * Call this once at application startup.
 *
 * @param config - Partial configuration to merge with defaults
 *
 * @example
 * setGlobalConfig({
 *   chainId: 'SN_MAIN',
 *   domainName: 'MyApp'
 * });
 */
export function setGlobalConfig(config: Partial<StarknetSigningConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Gets the current global configuration.
 *
 * @returns A copy of the current configuration
 */
export function getGlobalConfig(): StarknetSigningConfig {
  return { ...globalConfig };
}

/**
 * Resets the global configuration to defaults.
 * Useful for testing.
 */
export function resetGlobalConfig(): void {
  globalConfig = {
    chainId: 'SN_MAIN',
    domainName: 'starknet-signing',
    domainVersion: '1',
    cartridgeValidatorUrl: DEFAULT_CARTRIDGE_VALIDATOR_URL
  };
}
