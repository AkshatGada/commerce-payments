# Commerce Payments Demo – Instructions

This guide explains how to run the visual demo, what each operation does, and how to troubleshoot common issues.

## 1) Prerequisites
- Node.js 18+
- An Amoy RPC endpoint (e.g. `https://rpc-amoy.polygon.technology`)
- Two wallets:
  - Payer: holds `DEMO_TOKEN` (ERC-20) for the demo amount (default 0.01 with 18 decimals)
  - Operator: holds MATIC on Amoy for gas

## 2) Environment
Create `demo/web/.env.local` with the following keys (values exist in repo envs for addresses):

```
# Contracts
AUTH_CAPTURE_ESCROW=0x...
PREAPPROVAL_COLLECTOR=0x...
OPERATOR_REFUND_COLLECTOR=0x...
DEMO_TOKEN=0x...

# Participants
PAYER=0xPayerAddress
MERCHANT=0xMerchantAddress
OPERATOR=0xOperatorAddress   # informational in UI; derived from OPERATOR_PRIVATE_KEY at runtime

# Keys (private keys must be 32-byte hex; with or without 0x is fine)
PAYER_PRIVATE_KEY=0x...
OPERATOR_PRIVATE_KEY=0x...

# Network
RPC_URL=https://rpc-amoy.polygon.technology

# Optional – used to ensure Payment uniqueness in some flows
# PAYMENT_SALT=...
```

Notes
- Payer address should match `PAYER_PRIVATE_KEY`.
- Operator address should match `OPERATOR_PRIVATE_KEY`.
- Fund payer with `DEMO_TOKEN` and operator with MATIC.

## 3) Install and run
From repo root:

```bash
cd demo/web
npm install
npm run dev -- --port 3000
```

Open the demo UI at `http://localhost:3000/payments`.

## 4) Roles and escrow model
- Operator: calls `authorize`, `capture`, `void`, `refund` (pays gas, manages lifecycle). Funds are constrained by `PaymentInfo` and the protocol.
- Payer: grants spending authorization (via collector) and can call `reclaim` after `authorizationExpiry`.
- TokenStore: per-operator escrow vault that isolates liquidity.

## 5) Demo scenes in the UI
Buttons on `/payments` call the following flows and show balances + tx links.

- Charge (1-step)
  - Payer: `approve` → `preApprove`
  - Operator: `charge` (authorization + capture in one)
  - Effect: Payer → TokenStore → Merchant. Refundable amount increases immediately.

- Authorize → Capture (2-step)
  - Operator: `authorize` (assumes payer preapproval exists)
  - Operator: `capture` (can be partial; current demo uses full amount)
  - Effect: First step moves funds into TokenStore; second step pays Merchant and sets refundable amount.

- Refund
  - Operator: `refund` using `OPERATOR_REFUND_COLLECTOR` (operator-funded sample)
  - Effect: Refundable amount decreases as funds move to Payer.

- Void
  - Operator: `void` remaining `capturableAmount`
  - Effect: TokenStore → Payer for any uncaptured funds; capture is disabled afterward.

- Reclaim
  - Payer: `reclaim` (only after `authorizationExpiry`)
  - Effect: Payer recovers any remaining capturable funds from TokenStore.

## 6) Endpoints (for automation/scripts)
The UI calls these API routes (serverless) in `demo/web`:

- `POST /api/charge`
- `POST /api/authorize-capture`
- `POST /api/refund`
- `POST /api/void`
- `POST /api/reclaim`
- `POST /api/payment/build` (returns a `paymentInfo` preview and addresses)

Each returns:
- `txs`: transaction hashes for relevant steps
- `balancesBefore` / `balancesAfter`: payer, merchant, tokenStore
- `addresses`: escrow, token, operator, payer, merchant, tokenStore

Example cURL (charge):
```bash
curl -s -X POST http://localhost:3000/api/charge | jq
```

## 7) Customizing amounts and fees
- Default amount: `0.01` (with 18 decimals) in the endpoints.
- Fees: capture/charge paths support feeBps and feeReceiver (demo uses `0`).
- To experiment with fees or partial captures, adjust the endpoint code in `demo/web/app/api/*`.

## 8) Troubleshooting
- Nonce too low
  - Cause: Another app sent a tx; or a previous run partially succeeded.
  - Fix: Wait for pending txs to mine; the demo fetches nonces and sequences txs. If needed, re-run after a minute.

- PaymentAlreadyCollected / uniqueness errors
  - Cause: Reusing the same `PaymentInfo` (same `salt` and expiries).
  - Fix: Refresh the page (the code uses current time for `salt`), or set a new `PAYMENT_SALT`.

- Insufficient funds
  - Ensure Payer has `DEMO_TOKEN` and Operator has MATIC for gas.

- Denylist or fee receiver issues
  - If a fee receiver blocks transfers, set `feeReceiver` flexible (`address(0)` in `PaymentInfo`) and choose an alternate at call time.

- RPC issues
  - Use a reliable Amoy RPC; rate limits can cause sporadic failures.

## 9) Deploying the demo
- Deploy the `demo/web` app to Vercel.
- Add the same environment variables in Vercel Project settings.
- Use burner/demo keys only; never commit secrets.

## 10) What’s next (optional polish)
- Partial capture with a fee slider
- Collector switching (Permit2, ERC-3009) depending on token/wallet
- Live event timeline via `getLogs` filtered by `paymentInfoHash`
- Enhanced animations (e.g., different flow paths per operation) 