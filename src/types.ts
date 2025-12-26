import type { TypedData, WeierstrassSignatureType } from 'starknet';

/**
 * Supported signature methods for Starknet wallets.
 */
export const SIGNATURE_METHODS = {
  /** Standard starknet.js signature verification */
  STARKNET: 'starknetjs',
  /** Cartridge controller signature verification */
  CONTROLLER: 'controller'
} as const;

export type SignatureMethod = (typeof SIGNATURE_METHODS)[keyof typeof SIGNATURE_METHODS];

/**
 * Result of signature validation.
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Configuration for the signing library.
 */
export interface StarknetSigningConfig {
  /** Chain ID (e.g., 'SN_MAIN', 'SN_SEPOLIA') */
  chainId: 'SN_MAIN' | 'SN_SEPOLIA' | string;
  /** Domain name for typed data (e.g., 'MyApp') */
  domainName: string;
  /** Domain version (default: '1') */
  domainVersion?: string;
  /** URL for Cartridge controller hash validation */
  cartridgeValidatorUrl?: string;
}

/**
 * TypedData with a typed message field.
 */
export type GenericTypedData<T> = Omit<TypedData, 'message'> & {
  message: T;
};

/**
 * A signed message with all metadata needed for verification.
 */
export interface SignedMessage {
  typedData: TypedData;
  signature: WeierstrassSignatureType;
  address: string;
  method: SignatureMethod;
}

/**
 * Options for signature verification.
 */
export interface VerifyOptions {
  /** Maximum age of signature in seconds */
  maxAge?: number;
  /** Template for typed data validation */
  template?: { validate: (data: TypedData) => void };
  /** Signature method used */
  method?: SignatureMethod;
}
