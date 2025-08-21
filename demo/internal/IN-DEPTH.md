# Commerce Payments Demo – In‑Depth Technical Guide

This document provides a deep technical explanation of the demo app, its contracts, flows, data structures, API surfaces, and operational guarantees. It’s targeted at engineers who will extend or integrate this demo.

---

## 0) Scope
- Network: Polygon Amoy testnet
- Tokens: ERC‑20 (`DEMO_TOKEN`)
- Contracts used (deployed separately, env‑configured):
  - `AuthCaptureEscrow`
  - `PreApprovalPaymentCollector` (payment collection via approve + preApprove)
  - `OperatorRefundCollector` (demo refund source from operator)
- Demo roles (distinct keys):
  - Payer: authorizes spending for the payment
  - Operator: triggers lifecycle ops on escrow; pays gas
  - Merchant: receives captured funds

---

## 1) Environment and Secrets
Create `demo/web/.env.local`:

```ini
# Contracts
AUTH_CAPTURE_ESCROW=0x...
PREAPPROVAL_COLLECTOR=0x...
OPERATOR_REFUND_COLLECTOR=0x...
DEMO_TOKEN=0x...

# Participants
PAYER=0xPayerAddress
MERCHANT=0xMerchantAddress
OPERATOR=0xOperatorAddress   # informational; derived from OPERATOR_PRIVATE_KEY at runtime

# Keys (32‑byte hex; with or without 0x)
PAYER_PRIVATE_KEY=0x...
OPERATOR_PRIVATE_KEY=0x...

# Network
RPC_URL=https://rpc-amoy.polygon.technology

# Optional uniqueness aid
# PAYMENT_SALT=...
```

Notes
- Payer must hold `DEMO_TOKEN` for the chosen demo amount (default `0.01` with 18 decimals).
- Operator must hold MATIC on Amoy for gas.
- Never commit private keys.

---

## 2) Core Data Structures

### 2.1 PaymentInfo (immutable terms per payment)
```solidity
struct PaymentInfo {
  address operator;           // lifecycle authority; pays gas
  address payer;              // token owner authorizing spend
  address receiver;           // merchant (capture destination)
  address token;              // ERC‑20 token address
  uint120 maxAmount;          // authorization cap (<= uint120)
  uint48 preApprovalExpiry;   // last time when auth/charge can be initiated
  uint48 authorizationExpiry; // after this, capture is disabled; payer can reclaim
  uint48 refundExpiry;        // last time refund is allowed
  uint16 minFeeBps;           // fee floor (basis points)
  uint16 maxFeeBps;           // fee ceiling (basis points)
  address feeReceiver;        // fixed recipient or 0 for flexible
  uint256 salt;               // uniqueness entropy per payment
}
```

- Uniqueness: hash includes `PaymentInfo`, chain id, and `AuthCaptureEscrow` address.
- Time windows: guard liveness, cancellation, and finality.
- Fees: validated at `capture/charge` within `[minFeeBps, maxFeeBps]`.

### 2.2 Accounting (derived)
- `capturableAmount`: funds escrowed in TokenStore, available to capture or return
- `refundableAmount`: previously captured funds available to refund

### 2.3 TokenStore (per‑operator vault)
- `getTokenStore(operator)` returns deterministic vault address used to hold escrowed funds for that operator.
- Liquidity is segmented by operator to mitigate cross‑operator risk.

---

## 3) Collectors in This Demo

### 3.1 PreApprovalPaymentCollector (Payment)
- Payer performs:
  - `approve(PREAPPROVAL_COLLECTOR, amount)`
  - `preApprove(paymentInfo)` (binds approval to specific `PaymentInfo`)
- Escrow calls the collector to pull funds during `authorize`/`charge`.

### 3.2 OperatorRefundCollector (Refund)
- Operator pre‑funds this collector by plain ERC‑20 `approve` (handled inside the route).
- Escrow calls the collector on `refund` to move funds to payer.

---

## 4) Roles, Security, and Guarantees
- Operator is trust‑minimized: cannot alter `PaymentInfo` and cannot move funds outside allowed transitions.
- Payer controls pre‑approval and reclaim after `authorizationExpiry`.
- All mutating calls are executed with nonce sequencing and receipts awaited in the demo to avoid race conditions (`nonce too low`).
- Private key normalization: accepts keys with or without `0x`; validates 32 bytes.

---

## 5) Demo App Architecture (Next.js)
```
/demo/web
  app/
    payments/page.tsx         # UI: actions, balances, addresses, animated graph
    layout.tsx                # Tailwind + base layout
    globals.css               # Tailwind v4 import + utility classes
    api/
      charge/route.ts         # approve+preApprove (payer), charge (operator)
      authorize-capture/route.ts  # authorize -> capture (operator)
      refund/route.ts         # refund via OperatorRefundCollector
      void/route.ts           # operator voids remaining capturable
      reclaim/route.ts        # payer reclaims after expiry
      payment/build/route.ts  # derive paymentInfo preview and tokenStore
  lib/abi.ts                  # Minimal ABIs used by routes
  tailwind.config.ts          # Tailwind v4 config (colors, plugins)
  postcss.config.js           # uses @tailwindcss/postcss
```

UI is rendered at `http://localhost:3000/payments`.

---

## 6) API Surfaces (Serverless Routes)
All routes respond with JSON and await receipts between steps to ensure deterministic order.

### 6.1 POST /api/charge
One‑step payment (auth+capture):
- Payer path: `approve` → `preApprove`
- Operator path: `charge(paymentInfo, amount, PREAPPROVAL_COLLECTOR, 0, feeReceiver=0)`
- Returns: `{ txs: { approveHash, preApproveHash, chargeHash } }`

### 6.2 POST /api/authorize-capture
Two‑step settlement:
- Operator path: `authorize(paymentInfo, amount, PREAPPROVAL_COLLECTOR)` → `capture(paymentInfo, amount, feeBps=0, feeReceiver=0)`
- Returns: `{ txs: { authorizeHash, captureHash } }`

### 6.3 POST /api/refund
- Operator path: `refund(paymentInfo, amount, OPERATOR_REFUND_COLLECTOR)`
- Returns: `{ txs: { refundHash } }`

### 6.4 POST /api/void
- Operator path: `void(paymentInfo)`
- Returns: `{ txs: { voidHash } }`

### 6.5 POST /api/reclaim
- Payer path: `reclaim(paymentInfo)` (only after `authorizationExpiry`)
- Returns: `{ txs: { reclaimHash } }`

### 6.6 POST /api/payment/build
- Derives `paymentInfo` and returns `tokenStore` for the specified operator
- Returns: `{ paymentInfo, addresses: { escrow, token, operator, payer, merchant, tokenStore } }`

Common output fields:
- `balancesBefore` / `balancesAfter` (payer, merchant, tokenStore)
- `addresses` (escrow, token, operator, payer, merchant, tokenStore)

---

## 7) Flow Sequences

### 7.1 Charge (1‑step)
1) Payer `approve(PREAPPROVAL_COLLECTOR, amount)`
2) Payer `preApprove(paymentInfo)`
3) Operator `charge(paymentInfo, amount, PREAPPROVAL_COLLECTOR, 0, feeReceiver=0)`
- Effect: Payer → TokenStore → Merchant in a single transaction on escrow side; `refundableAmount = amount`.

### 7.2 Authorize → Capture
1) Operator `authorize(paymentInfo, amount, PREAPPROVAL_COLLECTOR)`
   - Effect: Payer → TokenStore, `capturableAmount += amount`
2) Operator `capture(paymentInfo, amount, feeBps=0, feeReceiver=0)`
   - Effect: TokenStore → Merchant; `capturableAmount -= amount`, `refundableAmount += amount`

### 7.3 Refund
1) Operator `refund(paymentInfo, refundAmount, OPERATOR_REFUND_COLLECTOR)`
   - Effect: Refund collector → Payer; `refundableAmount -= refundAmount`

### 7.4 Void
1) Operator `void(paymentInfo)`
   - Effect: TokenStore → Payer; clears `capturableAmount`

### 7.5 Reclaim
1) Payer `reclaim(paymentInfo)` (after `authorizationExpiry`)
   - Effect: TokenStore → Payer; clears `capturableAmount`

---

## 8) Nonce and Receipt Handling
To avoid `nonce too low` errors:
- Payer nonce `N` is fetched with `blockTag: 'pending'`; `approve` uses `N`, `preApprove` uses `N+1`.
- Operator nonce `M` likewise sequences `authorize`/`capture` or other ops.
- Each step awaits `waitForTransactionReceipt(hash)` before proceeding.

---

## 9) Fees
- Validated at `capture/charge`:
  - `minFeeBps <= feeBps <= maxFeeBps` and `maxFeeBps <= 10000`
  - If `feeBps > 0`, `feeReceiver != address(0)`
  - If a fixed `feeReceiver` is provided in `PaymentInfo`, supplied `feeReceiver` must match
- Demo defaults to `0` fees; adjust endpoints to exercise fee behavior.

---

## 10) Error Handling & Troubleshooting
- Nonce too low
  - Competing transactions or prior partial success
  - Fix: wait, re‑run; demo already sequences and awaits receipts
- PaymentAlreadyCollected / uniqueness
  - Vary `salt` or allow the default time‑based salt used in endpoints
- Insufficient funds / gas
  - Ensure Payer has tokens, Operator has MATIC
- Reclaim/void timing
  - `reclaim` only after `authorizationExpiry`
  - `void` anytime with non‑zero `capturableAmount`
- PostCSS/Tailwind setup (UI)
  - Tailwind v4: `@import "tailwindcss";`, `@tailwindcss/postcss` configured in `postcss.config.js`

---

## 11) Extending the Demo
- Partial captures with fee sliders and dynamic `feeReceiver`
- Switch collectors (Permit2, ERC‑3009) based on token/wallet
- Live onchain event timeline via `getLogs` filtered by `paymentInfoHash`
- Alternative refund collectors (e.g., merchant‑signed ERC‑3009/Permit2)
- Animated paths per operation (distinct graph flows)

---

## 12) Runbook
```bash
# install and run
cd demo/web
npm install
npm run dev -- --port 3000
# visit http://localhost:3000/payments
```

Ensure `.env.local` is filled and wallets are funded before executing flows. 