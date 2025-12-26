import { typedData as typedDataUtils, type TypedData } from 'starknet';
import { SIGNATURE_METHODS, type SignatureMethod } from './types';
import { getGlobalConfig } from './config';

/**
 * Computes the message hash for signature verification.
 * Handles both standard Starknet and Cartridge controller methods.
 *
 * @param typedData - The typed data to hash
 * @param address - The signer's address
 * @param method - The signature method used (defaults to STARKNET)
 * @returns The computed hash as a hex string
 *
 * @example
 * const hash = await getMessageHash(typedData, address, SIGNATURE_METHODS.STARKNET);
 */
export async function getMessageHash(
  typedData: TypedData,
  address: string,
  method: SignatureMethod = SIGNATURE_METHODS.STARKNET
): Promise<string> {
  if (method === SIGNATURE_METHODS.STARKNET) {
    return typedDataUtils.getMessageHash(typedData, address);
  }

  // Cartridge controller uses external service for hash computation
  const config = getGlobalConfig();
  const validatorUrl =
    config.cartridgeValidatorUrl || 'https://cartridge-validate.runelabs.workers.dev/';

  const response = await fetch(validatorUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ typed_data: typedData, account: address })
  });

  if (!response.ok) {
    throw new Error(`Failed to compute Cartridge hash: ${response.statusText}`);
  }

  return await response.text();
}
