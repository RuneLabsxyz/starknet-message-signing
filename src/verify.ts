import { RpcProvider, type TypedData, type WeierstrassSignatureType, type Provider } from 'starknet';
import {
  SIGNATURE_METHODS,
  type ValidationResult,
  type SignatureMethod,
  type VerifyOptions
} from './types';
import { getMessageHash } from './hash';

/**
 * Checks if a signature's timestamp is within acceptable range.
 *
 * @param typedData - The typed data with timestamp in message
 * @param maxAge - Maximum age in seconds
 * @returns Validation result
 */
function checkTimestamp(typedData: TypedData, maxAge: number): ValidationResult {
  if (!('timestamp' in typedData.message)) {
    return { isValid: true }; // No timestamp to check
  }

  const timestamp = Number(typedData.message.timestamp);
  if (isNaN(timestamp)) {
    return { isValid: false, error: 'Invalid timestamp format' };
  }

  const now = Math.floor(Date.now() / 1000);

  // Handle both milliseconds and seconds timestamps
  const normalizedTimestamp = timestamp > 1e12 ? Math.floor(timestamp / 1000) : timestamp;

  if (now - normalizedTimestamp > maxAge) {
    return { isValid: false, error: 'Signature has expired' };
  }

  return { isValid: true };
}

/**
 * Checks if an account is deployed and returns appropriate error.
 * Used to differentiate "Invalid signature" from "Account not deployed".
 */
async function checkAccountDeployment(
  provider: Provider,
  address: string
): Promise<ValidationResult> {
  try {
    await provider.getClassAt(address);
    // Account is deployed, signature is just invalid
    return {
      isValid: false,
      error: 'Invalid signature'
    };
  } catch {
    // Account is not deployed
    return {
      isValid: false,
      error: 'Account not deployed'
    };
  }
}

/**
 * Checks if an account is deployed (returns boolean).
 *
 * @param provider - Starknet provider
 * @param address - Account address to check
 * @returns True if account is deployed
 */
export async function isAccountDeployed(
  provider: Provider | string,
  address: string
): Promise<boolean> {
  const rpcProvider =
    typeof provider === 'string' ? new RpcProvider({ nodeUrl: provider }) : provider;

  try {
    await rpcProvider.getClassAt(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies a Starknet signature against typed data.
 *
 * @param provider - Starknet provider or RPC URL
 * @param typedData - The typed data that was signed
 * @param signature - The signature to verify
 * @param address - The expected signer address
 * @param options - Verification options
 * @returns ValidationResult with isValid and optional error message
 *
 * @example
 * const provider = new RpcProvider({ nodeUrl: 'https://...' });
 * const result = await verifySignature(provider, typedData, signature, address, { maxAge: 300 });
 * if (!result.isValid) console.error(result.error);
 */
export async function verifySignature(
  provider: Provider | string,
  typedData: TypedData,
  signature: WeierstrassSignatureType,
  address: string,
  options: VerifyOptions = {}
): Promise<ValidationResult> {
  const rpcProvider =
    typeof provider === 'string' ? new RpcProvider({ nodeUrl: provider }) : provider;

  const { maxAge, template, method = SIGNATURE_METHODS.STARKNET } = options;

  // Step 1: Validate typed data structure if template provided
  if (template) {
    try {
      template.validate(typedData);
    } catch (e) {
      return {
        isValid: false,
        error: `Invalid typed data: ${e instanceof Error ? e.message : String(e)}`
      };
    }
  }

  // Step 2: Check timestamp expiry if maxAge specified
  if (maxAge !== undefined) {
    const timestampResult = checkTimestamp(typedData, maxAge);
    if (!timestampResult.isValid) {
      return timestampResult;
    }
  }

  // Step 3: Verify the signature on-chain
  try {
    const hash = await getMessageHash(typedData, address, method);
    await rpcProvider.verifyMessageInStarknet(hash, signature, address);
    return { isValid: true };
  } catch {
    // Step 4: Differentiate between invalid signature and undeployed account
    return checkAccountDeployment(rpcProvider, address);
  }
}

/**
 * Simple verification function that returns boolean.
 * Throws on undeployed accounts.
 *
 * @param provider - Starknet provider or RPC URL
 * @param typedData - The typed data that was signed
 * @param signature - The signature to verify
 * @param address - The expected signer address
 * @param method - Signature method (defaults to STARKNET)
 * @returns True if signature is valid
 * @throws Error if account is not deployed
 *
 * @example
 * try {
 *   const isValid = await verify(provider, typedData, signature, address);
 * } catch (e) {
 *   if (e.message === 'Account not deployed') {
 *     // Handle undeployed account
 *   }
 * }
 */
export async function verify(
  provider: Provider | string,
  typedData: TypedData,
  signature: WeierstrassSignatureType,
  address: string,
  method: SignatureMethod = SIGNATURE_METHODS.STARKNET
): Promise<boolean> {
  const result = await verifySignature(provider, typedData, signature, address, { method });
  if (result.error === 'Account not deployed') {
    throw new Error('Account not deployed');
  }
  return result.isValid;
}
