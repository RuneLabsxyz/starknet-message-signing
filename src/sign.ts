import type { TypedData, Account, AccountInterface, WeierstrassSignatureType } from 'starknet';
import { SIGNATURE_METHODS, type SignedMessage, type SignatureMethod } from './types';

/**
 * Signs a message using the provided account.
 * Works on the client-side with any starknet.js compatible wallet.
 *
 * @param account - The starknet.js Account or wallet interface
 * @param typedData - The typed data to sign
 * @param method - The signature method (defaults to standard starknet.js)
 * @returns The signed message with signature and metadata
 *
 * @example
 * const account = new Account(provider, address, privateKey);
 * const request = LoginTemplate.getRequest({ username: 'alice', timestamp: Date.now() });
 * const signed = await signMessage(account, request);
 */
export async function signMessage(
  account: Account | AccountInterface,
  typedData: TypedData,
  method: SignatureMethod = SIGNATURE_METHODS.STARKNET
): Promise<SignedMessage> {
  const signature = (await account.signMessage(typedData)) as WeierstrassSignatureType;

  return {
    typedData,
    signature,
    address: account.address,
    method
  };
}

/**
 * Signs typed data and returns just the signature.
 * Simpler API for when you just need the signature.
 *
 * @param account - The starknet.js Account or wallet interface
 * @param typedData - The typed data to sign
 * @returns The signature
 *
 * @example
 * const signature = await sign(account, typedData);
 */
export async function sign(
  account: Account | AccountInterface,
  typedData: TypedData
): Promise<WeierstrassSignatureType> {
  return (await account.signMessage(typedData)) as WeierstrassSignatureType;
}
