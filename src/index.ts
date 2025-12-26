// Core types
export {
  SIGNATURE_METHODS,
  type SignatureMethod,
  type ValidationResult,
  type StarknetSigningConfig,
  type GenericTypedData,
  type SignedMessage,
  type VerifyOptions
} from './types';

// Errors
export { TypedDataError } from './errors';

// Configuration
export { setGlobalConfig, getGlobalConfig, resetGlobalConfig } from './config';

// Template system
export {
  createTemplate,
  validateType,
  type SignatureTemplate,
  type RealizedGenericData
} from './template';

// Hash computation
export { getMessageHash } from './hash';

// Signing
export { signMessage, sign } from './sign';

// Verification
export { verifySignature, verify, isAccountDeployed } from './verify';

// Nonce system
export {
  verifyWithNonce,
  MemoryNonceAdapter,
  type NonceAdapter,
  type VerifyWithNonceOptions
} from './nonce';

// Utilities
export { padAddress, normalizeAddress, addressEquals } from './utils';
