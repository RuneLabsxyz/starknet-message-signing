/**
 * Pads a Starknet address to 66 characters (0x + 64 hex digits).
 * Handles both 0x-prefixed and raw addresses.
 *
 * @param address - The address to pad
 * @returns The padded address with 0x prefix
 *
 * @example
 * padAddress('0x1234') // '0x0000...1234' (66 chars total)
 */
export function padAddress(address: string): string {
  let addressEnd: string;

  if (address.startsWith('0x')) {
    addressEnd = address.slice(2);
  } else {
    addressEnd = address;
  }

  const addressPadded = addressEnd.toLowerCase().padStart(64, '0');
  return `0x${addressPadded}`;
}

/**
 * Normalizes an address for comparison (pads and lowercases).
 *
 * @param address - The address to normalize
 * @returns The normalized address
 */
export function normalizeAddress(address: string): string {
  return padAddress(address).toLowerCase();
}

/**
 * Checks if two addresses are equal (handles padding differences).
 *
 * @param a - First address
 * @param b - Second address
 * @returns True if addresses are equal
 *
 * @example
 * addressEquals('0x1234', '0x0000...1234') // true
 */
export function addressEquals(a: string, b: string): boolean {
  return normalizeAddress(a) === normalizeAddress(b);
}
