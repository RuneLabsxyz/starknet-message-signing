# @runelabsxyz/starknet-message-signing

TypeScript library for Starknet typed data signing and verification with support for multiple wallet types, replay attack prevention, and account deployment detection.

## Installation

```bash
npm install @runelabsxyz/starknet-message-signing starknet
# or
bun add @runelabsxyz/starknet-message-signing starknet
```

## Quick Start

```typescript
import {
  createTemplate,
  signMessage,
  verifySignature,
  setGlobalConfig
} from '@runelabsxyz/starknet-message-signing';
import { Account, RpcProvider } from 'starknet';

// Configure once at startup
setGlobalConfig({
  chainId: 'SN_MAIN',
  domainName: 'MyApp'
});

// Define a signature template
const LoginTemplate = createTemplate('Login', {
  Login: [
    { name: 'username', type: 'string' },
    { name: 'timestamp', type: 'felt' }
  ]
});

// Client-side: Sign a message
const request = LoginTemplate.getRequest({
  username: 'alice',
  timestamp: Math.floor(Date.now() / 1000)
});
const signed = await signMessage(account, request);

// Server-side: Verify the signature
const result = await verifySignature(
  'https://your-rpc-url.com',
  signed.typedData,
  signed.signature,
  signed.address,
  { maxAge: 300, template: LoginTemplate }
);

if (result.isValid) {
  console.log('Signature valid!');
} else {
  console.error(result.error);
  // "Invalid signature" | "Account not deployed" | "Signature has expired"
}
```

## Features

- **Typed Data Templates** - Create reusable signature schemas with validation
- **Multiple Wallet Support** - Standard starknet.js and Cartridge controller
- **Account Detection** - Distinguishes invalid signatures from undeployed accounts
- **Replay Prevention** - Nonce-based system with pluggable storage adapters
- **Timestamp Validation** - Configurable signature expiry
- **Type Safety** - Full TypeScript support with recursive type validation

## API Reference

### Configuration

```typescript
import { setGlobalConfig, getGlobalConfig, resetGlobalConfig } from '@runelabsxyz/starknet-message-signing';

setGlobalConfig({
  chainId: 'SN_MAIN',           // or 'SN_SEPOLIA'
  domainName: 'MyApp',
  domainVersion: '1',           // optional, defaults to '1'
  cartridgeValidatorUrl: '...'  // optional, for Cartridge controller
});
```

### Templates

```typescript
import { createTemplate } from '@runelabsxyz/starknet-message-signing';

const MyTemplate = createTemplate('MyMessage', {
  MyMessage: [
    { name: 'action', type: 'string' },
    { name: 'amount', type: 'felt' },
    { name: 'timestamp', type: 'felt' }
  ]
});

// Generate typed data
const request = MyTemplate.getRequest({
  action: 'transfer',
  amount: 1000,
  timestamp: Math.floor(Date.now() / 1000)
});

// Validate structure
MyTemplate.validate(request); // throws TypedDataError if invalid
```

**Supported types:** `string`, `felt`, `shortstring`, nested custom types

### Signing (Client-side)

```typescript
import { signMessage, sign } from '@runelabsxyz/starknet-message-signing';

// Returns SignedMessage with metadata
const signed = await signMessage(account, typedData);
// { typedData, signature, address, method }

// Returns just the signature
const signature = await sign(account, typedData);
```

### Verification (Server-side)

```typescript
import { verifySignature, verify, SIGNATURE_METHODS } from '@runelabsxyz/starknet-message-signing';

// Detailed result with error info
const result = await verifySignature(provider, typedData, signature, address, {
  maxAge: 300,              // optional: expire after 5 minutes
  template: MyTemplate,     // optional: validate structure
  method: SIGNATURE_METHODS.STARKNET  // or CONTROLLER for Cartridge
});
// { isValid: boolean, error?: string }

// Simple boolean (throws on undeployed account)
const isValid = await verify(provider, typedData, signature, address);
```

### Nonce-based Replay Prevention

```typescript
import { verifyWithNonce, type NonceAdapter } from '@runelabsxyz/starknet-message-signing';

// Implement your database adapter
class MyNonceAdapter implements NonceAdapter {
  async getCurrentNonce(address: string): Promise<number | null> {
    // Return current nonce from DB, or null if user not found
  }

  async updateNonce(address: string, newNonce: number): Promise<boolean> {
    // Atomically update if newNonce > current, return success
  }
}

// Template must include nonce field
const NonceTemplate = createTemplate('Action', {
  Action: [
    { name: 'data', type: 'string' },
    { name: 'nonce', type: 'felt' },
    { name: 'timestamp', type: 'felt' }
  ]
});

const result = await verifyWithNonce(
  provider,
  typedData,
  signature,
  address,
  new MyNonceAdapter(),
  { maxAge: 300, template: NonceTemplate }
);
```

### Utilities

```typescript
import { padAddress, normalizeAddress, addressEquals } from '@runelabsxyz/starknet-message-signing';

padAddress('0x1234');        // '0x0000...1234' (66 chars)
normalizeAddress('0xABCD');  // '0x0000...abcd' (padded + lowercase)
addressEquals('0x1234', '0x0000...1234');  // true
```

## Error Handling

```typescript
import { TypedDataError } from '@runelabsxyz/starknet-message-signing';

try {
  template.validate(typedData);
} catch (e) {
  if (e instanceof TypedDataError) {
    console.log(e.toString());
    // "TypedDataError: Login->username: Not a string"
    console.log(e.fieldInfo);
    // ["Login", "username"]
  }
}
```

## Development

```bash
# With Nix (recommended)
nix develop
# or with direnv
direnv allow

# Install dependencies
bun install

# Run tests
bun run test

# Build
bun run build

# Type check
bun run typecheck
```

## License

MIT
