# @runelabsxyz/starknet-message-signing

TypeScript library for Starknet typed data signing and verification with support for multiple wallet types, replay attack prevention, and account deployment detection.

## Installation

```bash
# Backend only (most common)
npm install @runelabsxyz/starknet-message-signing starknet

# Frontend only needs starknet for signing
npm install starknet
```

## Architecture

This package is designed for a **server-generates, client-signs** flow:

```
┌─────────────────┐     GET /api/login      ┌─────────────────┐
│                 │ ◄───────────────────────│                 │
│     SERVER      │     { typedData }       │     CLIENT      │
│                 │ ───────────────────────►│                 │
│  - Templates    │                         │  - Wallet       │
│  - Generation   │     POST /api/login     │  - Signing      │
│  - Verification │ ◄───────────────────────│                 │
│                 │  { typedData, sig }     │                 │
└─────────────────┘                         └─────────────────┘
```

**The frontend never generates typed data** - it receives the complete structure from your backend API and signs it with the user's wallet.

### What Goes Where

| Function | Backend | Frontend |
|----------|---------|----------|
| `createTemplate()` | ✅ Define schemas | ❌ |
| `template.getRequest()` | ✅ Generate typed data | ❌ |
| `template.validate()` | ✅ Validate incoming data | ❌ |
| `verifySignature()` | ✅ Verify signatures | ❌ |
| `verifyWithNonce()` | ✅ Replay prevention | ❌ |
| `account.signMessage()` | ❌ | ✅ (starknet.js) |

## Usage

### Backend Setup

```typescript
// lib/signatures.ts
import { createTemplate, setGlobalConfig } from '@runelabsxyz/starknet-message-signing';

setGlobalConfig({
  chainId: 'SN_MAIN',
  domainName: 'MyApp'
});

export const LoginTemplate = createTemplate('Login', {
  Login: [
    { name: 'username', type: 'string' },
    { name: 'timestamp', type: 'felt' }
  ]
});
```

### Backend API Endpoints

```typescript
// GET /api/login - Generate typed data for client to sign
import { LoginTemplate } from './lib/signatures';

app.get('/api/login', (req, res) => {
  const { username } = req.query;

  const typedData = LoginTemplate.getRequest({
    username,
    timestamp: Math.floor(Date.now() / 1000)
  });

  res.json(typedData);
});

// POST /api/login - Verify the signed message
import { verifySignature } from '@runelabsxyz/starknet-message-signing';

app.post('/api/login', async (req, res) => {
  const { typedData, signature, address } = req.body;

  const result = await verifySignature(
    process.env.STARKNET_RPC_URL,
    typedData,
    signature,
    address,
    { maxAge: 300, template: LoginTemplate }
  );

  if (!result.isValid) {
    return res.status(401).json({ error: result.error });
    // "Invalid signature" | "Account not deployed" | "Signature has expired"
  }

  // Create session, return token, etc.
  res.json({ success: true });
});
```

### Frontend (No package needed!)

```typescript
// The frontend only needs starknet.js for wallet interaction
import { connect } from 'starknetkit';  // or any wallet connector

async function login(username: string) {
  // 1. Get typed data from your backend
  const typedData = await fetch(`/api/login?username=${username}`).then(r => r.json());

  // 2. Sign with user's wallet (starknet.js)
  const { wallet } = await connect();
  const signature = await wallet.account.signMessage(typedData);

  // 3. Send signature back to backend
  const result = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      typedData,
      signature,
      address: wallet.account.address
    })
  });

  return result.json();
}
```

### Frontend with Package (Optional)

If you want type safety or the `signMessage` helper on the frontend:

```typescript
import { signMessage, SIGNATURE_METHODS } from '@runelabsxyz/starknet-message-signing';

const typedData = await fetch('/api/login?username=alice').then(r => r.json());
const signed = await signMessage(account, typedData, SIGNATURE_METHODS.STARKNET);
// { typedData, signature, address, method }
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
import { setGlobalConfig } from '@runelabsxyz/starknet-message-signing';

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

// Generate typed data (server-side)
const typedData = MyTemplate.getRequest({
  action: 'transfer',
  amount: 1000,
  timestamp: Math.floor(Date.now() / 1000)
});

// Validate structure (server-side, when receiving from client)
MyTemplate.validate(typedData); // throws TypedDataError if invalid
```

**Supported types:** `string`, `felt`, `shortstring`, nested custom types

### Verification

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

For operations that must not be replayed (transfers, linking accounts, etc.):

```typescript
import { verifyWithNonce, type NonceAdapter } from '@runelabsxyz/starknet-message-signing';

// Implement your database adapter
class PostgresNonceAdapter implements NonceAdapter {
  async getCurrentNonce(address: string): Promise<number | null> {
    const row = await db.query('SELECT counter FROM users WHERE address = $1', [address]);
    return row?.counter ?? null;
  }

  async updateNonce(address: string, newNonce: number): Promise<boolean> {
    const result = await db.query(
      'UPDATE users SET counter = $1 WHERE address = $2 AND counter < $1 RETURNING 1',
      [newNonce, address]
    );
    return result.rowCount > 0;
  }
}

// Template must include nonce field
const TransferTemplate = createTemplate('Transfer', {
  Transfer: [
    { name: 'to', type: 'felt' },
    { name: 'amount', type: 'felt' },
    { name: 'nonce', type: 'felt' },
    { name: 'timestamp', type: 'felt' }
  ]
});

// Server: generate with next nonce
app.get('/api/transfer', async (req, res) => {
  const currentNonce = await db.getUserNonce(req.user.address);
  const typedData = TransferTemplate.getRequest({
    to: req.query.to,
    amount: req.query.amount,
    nonce: currentNonce + 1,
    timestamp: Math.floor(Date.now() / 1000)
  });
  res.json(typedData);
});

// Server: verify with nonce check
const result = await verifyWithNonce(
  provider,
  typedData,
  signature,
  address,
  new PostgresNonceAdapter(),
  { maxAge: 300, template: TransferTemplate }
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

### Verification Errors

| Error | Meaning |
|-------|---------|
| `"Invalid signature"` | Signature doesn't match the typed data |
| `"Account not deployed"` | User's wallet contract isn't deployed yet |
| `"Signature has expired"` | Timestamp is older than `maxAge` |
| `"Invalid typed data: ..."` | Structure doesn't match template |
| `"Invalid nonce"` | Nonce is not greater than current (replay attempt) |
| `"User not found"` | Address not in your database (for nonce verification) |

## Cartridge Controller Support

For Cartridge controller wallets, specify the method:

```typescript
import { SIGNATURE_METHODS } from '@runelabsxyz/starknet-message-signing';

const { typedData, signature, address, method } = req.body;

const result = await verifySignature(provider, typedData, signature, address, {
  method: method || SIGNATURE_METHODS.STARKNET
});
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
