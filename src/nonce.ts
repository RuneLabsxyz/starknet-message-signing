import type { Provider, TypedData, WeierstrassSignatureType } from 'starknet';
import type { ValidationResult, VerifyOptions } from './types';
import { verifySignature } from './verify';

/**
 * Interface for nonce storage adapters.
 * Implement this to integrate with your database.
 *
 * The nonce system prevents replay attacks by ensuring each
 * nonce can only be used once and must be higher than the previous.
 *
 * @example
 * class PostgresNonceAdapter implements NonceAdapter {
 *   constructor(private db: Database) {}
 *
 *   async getCurrentNonce(address: string): Promise<number | null> {
 *     const row = await this.db.query(
 *       'SELECT counter FROM users WHERE address = $1',
 *       [address]
 *     );
 *     return row?.counter ?? null;
 *   }
 *
 *   async updateNonce(address: string, newNonce: number): Promise<boolean> {
 *     const result = await this.db.query(
 *       `UPDATE users SET counter = $1
 *        WHERE address = $2 AND counter < $1
 *        RETURNING 1`,
 *       [newNonce, address]
 *     );
 *     return result.rowCount > 0;
 *   }
 * }
 */
export interface NonceAdapter {
  /**
   * Gets the current nonce counter for an address.
   * @returns The current counter, or null if user not found
   */
  getCurrentNonce(address: string): Promise<number | null>;

  /**
   * Atomically updates the nonce counter.
   * Should only update if newNonce > currentNonce.
   * @returns true if update succeeded, false otherwise
   */
  updateNonce(address: string, newNonce: number): Promise<boolean>;
}

/**
 * Options for verification with nonce.
 */
export interface VerifyWithNonceOptions extends VerifyOptions {
  /** Field name for nonce in the message (defaults to 'nonce') */
  nonceField?: string;
}

/**
 * In-memory nonce adapter for testing and development.
 * Do not use in production - nonces are lost on restart.
 */
export class MemoryNonceAdapter implements NonceAdapter {
  private nonces: Map<string, number> = new Map();

  constructor(initialNonces?: Record<string, number>) {
    if (initialNonces) {
      Object.entries(initialNonces).forEach(([address, nonce]) => {
        this.nonces.set(address.toLowerCase(), nonce);
      });
    }
  }

  async getCurrentNonce(address: string): Promise<number | null> {
    return this.nonces.get(address.toLowerCase()) ?? null;
  }

  async updateNonce(address: string, newNonce: number): Promise<boolean> {
    const normalizedAddress = address.toLowerCase();
    const current = this.nonces.get(normalizedAddress);

    if (current === undefined || newNonce <= current) {
      return false;
    }

    this.nonces.set(normalizedAddress, newNonce);
    return true;
  }

  /** Sets a nonce directly (for testing) */
  setNonce(address: string, nonce: number): void {
    this.nonces.set(address.toLowerCase(), nonce);
  }

  /** Clears all nonces (for testing) */
  clear(): void {
    this.nonces.clear();
  }
}

/**
 * Verifies a signature and validates/updates the nonce atomically.
 * Use this for operations that should not be replayed.
 *
 * @param provider - Starknet provider or RPC URL
 * @param typedData - The typed data with nonce in message
 * @param signature - The signature to verify
 * @param address - The signer's address
 * @param nonceAdapter - Your nonce storage implementation
 * @param options - Verification options
 * @returns Validation result
 *
 * @example
 * const result = await verifyWithNonce(
 *   provider,
 *   typedData,
 *   signature,
 *   address,
 *   myDatabaseNonceAdapter,
 *   { maxAge: 300, template: MyTemplate }
 * );
 */
export async function verifyWithNonce(
  provider: Provider | string,
  typedData: TypedData,
  signature: WeierstrassSignatureType,
  address: string,
  nonceAdapter: NonceAdapter,
  options: VerifyWithNonceOptions = {}
): Promise<ValidationResult> {
  // First verify the signature itself
  const signatureResult = await verifySignature(provider, typedData, signature, address, options);

  if (!signatureResult.isValid) {
    return signatureResult;
  }

  // Then check and update the nonce
  const nonceField = options.nonceField || 'nonce';

  if (!(nonceField in typedData.message)) {
    return {
      isValid: false,
      error: `Missing ${nonceField} in message`
    };
  }

  const nonce = Number((typedData.message as Record<string, unknown>)[nonceField]);
  if (isNaN(nonce)) {
    return {
      isValid: false,
      error: 'Invalid nonce format'
    };
  }

  // Get current nonce
  const currentNonce = await nonceAdapter.getCurrentNonce(address);
  if (currentNonce === null) {
    return {
      isValid: false,
      error: 'User not found'
    };
  }

  // Validate nonce is higher
  if (nonce <= currentNonce) {
    return {
      isValid: false,
      error: 'Invalid nonce'
    };
  }

  // Atomically update the nonce
  const updateSuccess = await nonceAdapter.updateNonce(address, nonce);
  if (!updateSuccess) {
    return {
      isValid: false,
      error: 'Failed to update nonce'
    };
  }

  return { isValid: true };
}
