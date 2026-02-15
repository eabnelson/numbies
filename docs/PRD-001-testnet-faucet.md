# Testnet Faucet: Seed New Users with $50 AUSD

## Overview
Automatically seed new users with $50 of AlphaUSD (AUSD) testnet tokens when they first sign up and create a wallet. This improves onboarding by giving new users immediate funds to explore the app.

## Problem Statement
New users sign up with zero balance and cannot use the app's payment features until they acquire testnet tokens manually. This creates friction in the onboarding experience.

## Goals
1. Automatically detect eligible new users (created within 24 hours, $0 balance)
2. Transfer $50 AUSD from a treasury wallet to new users
3. Execute silently without blocking the user experience
4. Log errors without surfacing them to users

---

## Feature Specifications

### 1. Eligibility Criteria
A user is eligible for seeding if ALL of the following are true:
- User record exists in Convex with a `walletAddress`
- User `_creationTime` is within the last 24 hours (86,400,000 ms)
- User's on-chain AUSD balance is exactly 0

### 2. Treasury Wallet
- A dedicated EVM wallet will hold testnet AUSD for seeding
- Private key stored in environment variable: `TEMPO_TESTNET_FAUCET_PRIVATE_KEY`
- Treasury will be manually funded with testnet AUSD (no low-balance monitoring needed)
- Wallet address derived from private key at runtime

### 3. Seeding Amount
- Amount: **$50 AUSD** (50 * 10^18 in raw units, 18 decimals)
- Token: AlphaUSD at `0x20c0000000000000000000000000000000000001`
- Chain: Tempo Testnet (chainId: 42431)

### 4. Trigger Flow
```
User logs in via Privy
    ↓
Privy creates/loads embedded wallet
    ↓
Frontend calls createOrFindUser mutation with walletAddress
    ↓
Mutation returns { isNew: true/false, user }
    ↓
If user has walletAddress, frontend calls seedNewUser action
    ↓
Action checks eligibility (createdAt < 24h AND balance === 0)
    ↓
If eligible, transfer $50 AUSD from treasury to user
    ↓
Log success or error (silent to user)
```

### 5. Error Handling
- All errors logged to console (no user-facing errors)
- No automatic retries
- If seeding fails, user can acquire testnet funds manually
- Treasury running low is not monitored (manual refills)

---

## Technical Considerations

### Convex Actions
Convex actions (vs mutations) can make external HTTP calls, which is required for blockchain RPC. The action will:
1. Use `"use node"` directive for Node.js environment (needed for viem)
2. Import viem directly (no React hooks)
3. Create wallet client from private key
4. Execute TIP-20 transfer

### Viem Setup for Backend
```typescript
import { createWalletClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { tempoTestnet } from 'viem/chains'
```

### Environment Variable
Add to `.env.local` and Convex dashboard:
```
TEMPO_TESTNET_FAUCET_PRIVATE_KEY=0x...
```

### Platform Differences
- The seeding logic runs entirely on the backend (Convex action)
- Frontend trigger is the same for web and native
- No platform-specific code needed

---

## Implementation Tasks & Status

> **Instructions:** After completing each task, update its status from `[ ]` to `[x]` and add completion notes if relevant.

### Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Completed
- `[-]` Skipped/Not needed

---

### Phase 1: Backend - Convex Action

#### Task 1.1: Create seedNewUser Convex action
- **Status:** `[x]`
- **Scope:** Create a new Convex action that handles the seeding logic
- **Steps:**
  1. Create new file `convex/faucet.ts`
  2. Add `"use node"` directive for Node.js runtime
  3. Define `seedNewUser` action with args: `{ walletAddress: string }`
  4. Implement eligibility check: query user by walletAddress, verify createdAt < 24h
  5. Add on-chain balance check using viem publicClient
  6. If eligible, execute transfer from treasury wallet
  7. Return `{ seeded: boolean, error?: string }` for logging
- **Files:** `convex/faucet.ts` (new)
- **Completion notes:**

#### Task 1.2: Add viem dependencies to Convex
- **Status:** `[x]`
- **Scope:** Ensure viem works in Convex Node.js runtime
- **Steps:**
  1. Verify viem is already in package.json (it is)
  2. Test that viem imports work in Convex action with `"use node"`
  3. Add any missing buffer polyfills if needed for Node environment
- **Files:** `convex/faucet.ts`
- **Completion notes:**

#### Task 1.3: Implement treasury wallet transfer logic
- **Status:** `[x]`
- **Scope:** Use viem to send AUSD from treasury to new user
- **Steps:**
  1. Import `privateKeyToAccount` from `viem/accounts`
  2. Create account from `TEMPO_TESTNET_FAUCET_PRIVATE_KEY` env var
  3. Create wallet client with tempo chain config
  4. Use `walletClient.writeContract` to call TIP-20 transfer
  5. Wait for transaction confirmation
  6. Log transaction hash on success
- **Files:** `convex/faucet.ts`
- **Completion notes:**

---

### Phase 2: Frontend Integration

#### Task 2.1: Call seedNewUser after login
- **Status:** `[x]`
- **Scope:** Trigger the seeding action from AuthContext after user creation
- **Steps:**
  1. Import the `seedNewUser` action in `AuthContext.tsx`
  2. In `saveUserOnLogin`, after successful user creation/update
  3. If user has `walletAddress`, call `seedNewUser({ walletAddress })`
  4. Fire-and-forget (don't await, don't block login flow)
  5. Log result for debugging but don't surface errors to user
- **Files:** `src/auth/AuthContext.tsx`
- **Completion notes:**

#### Task 2.2: Handle wallet address updates
- **Status:** `[x]`
- **Scope:** Also trigger seeding when wallet address is updated for existing user
- **Steps:**
  1. In `updateWalletAddress` callback in AuthContext
  2. After successful wallet address update, call `seedNewUser`
  3. Fire-and-forget pattern (same as above)
- **Files:** `src/auth/AuthContext.tsx`
- **Completion notes:**

---

### Phase 3: Environment & Deployment

#### Task 3.1: Add environment variable
- **Status:** `[x]`
- **Scope:** Configure the treasury private key in environment
- **Steps:**
  1. Add `TEMPO_TESTNET_FAUCET_PRIVATE_KEY` to `.env.local.example`
  2. Document the env var in CLAUDE.md under Environment section
  3. Add actual key to Convex dashboard (Settings > Environment Variables)
- **Files:** `.env.local.example`, `CLAUDE.md`
- **Completion notes:**

#### Task 3.2: Create treasury wallet
- **Status:** `[x]`
- **Scope:** Generate new EVM wallet for faucet treasury
- **Steps:**
  1. Generate new EVM keypair (can use `viem` or any wallet tool)
  2. Record the private key securely
  3. Fund the wallet with testnet AUSD
  4. Add private key to Convex environment variables
- **Files:** N/A (manual process)
- **Completion notes:**

---

### Phase 4: Testing

#### Task 4.1: Test eligibility logic
- **Status:** `[ ]`
- **Scope:** Verify eligibility checks work correctly
- **Steps:**
  1. Test with user created > 24h ago (should NOT seed)
  2. Test with user with non-zero balance (should NOT seed)
  3. Test with new user, zero balance (should seed)
  4. Test with user missing wallet address (should NOT seed)
- **Files:** Manual testing
- **Completion notes:**

#### Task 4.2: Test end-to-end flow
- **Status:** `[ ]`
- **Scope:** Verify complete signup → seed flow
- **Steps:**
  1. Create new Privy account via SMS
  2. Wait for embedded wallet creation
  3. Verify user appears in Convex
  4. Check that $50 AUSD arrives in wallet
  5. Verify logs show successful seeding
- **Files:** Manual testing
- **Completion notes:**

---

## Progress Summary

| Phase | Tasks | Completed | Status |
|-------|-------|-----------|--------|
| 1. Backend | 3 | 3 | Complete |
| 2. Frontend | 2 | 2 | Complete |
| 3. Environment | 2 | 2 | Complete |
| 4. Testing | 2 | 0 | Not started |
| **Total** | **9** | **7** | **78%** |

---

## Development & Testing Configuration

- **Local dev URL:** `http://localhost:8081`
- **Convex dashboard:** `https://dashboard.convex.dev`
- **Tempo Explorer:** `https://explore.tempo.xyz`
- **Testnet RPC:** `https://rpc.moderato.tempo.xyz`

### Testing Checklist
- [ ] New user signup seeds $50 AUSD
- [ ] Existing user (>24h) is not seeded
- [ ] User with existing balance is not seeded
- [ ] Failed transactions log errors silently
- [ ] Treasury balance decreases by $50 per new user

---

## Error States

| Scenario | Behavior | Log Message |
|----------|----------|-------------|
| User not found | Skip seeding | `"User not found for wallet: {address}"` |
| User too old (>24h) | Skip seeding | `"User not eligible: created {hours}h ago"` |
| Non-zero balance | Skip seeding | `"User not eligible: balance is {balance}"` |
| Treasury low/empty | Transaction fails | `"Faucet transfer failed: {error}"` |
| RPC error | Transaction fails | `"Faucet transfer failed: {error}"` |
| Missing env var | Action fails | `"TEMPO_TESTNET_FAUCET_PRIVATE_KEY not configured"` |

---

## Open Questions

1. ~~How to get testnet AUSD for treasury?~~ → Manual funding by team
2. ~~Should we track seeding in DB?~~ → No, use createdAt + balance check

---

## Appendix: File Changes Summary

### New Files
- `convex/faucet.ts` - Convex action for seeding new users

### Modified Files
- `src/auth/AuthContext.tsx` - Add seedNewUser call after login
- `.env.local.example` - Document new env var
- `CLAUDE.md` - Document new env var

### Reference Files (read-only)
- `src/blockchain/tempo.ts` - Chain config and publicClient setup
- `src/blockchain/chainConfig.ts` - Token address and chain details
- `src/blockchain/useSendTokens.web.ts` - Example of viem transfer logic
- `convex/users.ts` - User queries and mutations
