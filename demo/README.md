# Commerce Payments Demo Dashboard

A modern operator-facing dashboard demonstrating the Commerce Payments Protocol on Polygon Amoy. It visualizes the full payment lifecycle and lets you operate flows like refunds and disputes.

## Why this demo exists
Traditional ecommerce needs flows that onchain P2P transfers don’t provide by default: delayed settlement, guaranteed payment, cancellations, partial refunds, and disputes. This demo shows how the protocol brings those capabilities onchain and how an operator can safely run them at scale.

What it proves
- Payment lifecycle for commerce: `authorize → capture` (delayed settlement) and `charge` (instant settle), plus `refund`, `void`, and `reclaim` safety valves
- Trust-minimized operator model: the operator advances state but cannot arbitrarily move funds; all movement is cryptographically bound to `PaymentInfo`
- Payer and merchant protections:
  - Escrow-backed guarantees for merchants during auth/capture
  - Time windows (`preApprovalExpiry`, `authorizationExpiry`, `refundExpiry`) and payer-initiated `reclaim` after auth expiry
- Liquidity segmentation: per-operator `TokenStore` isolates escrowed funds to reduce blast radius
- Modular token collection: collectors abstract ERC-20 spending methods (PreApproval in-demo; Permit2/3009 compatible by design)
- Fees with guardrails: min/max bps and optional dynamic `feeReceiver`
- Event-sourced status: statuses are derived from onchain events within a recent block window

Commerce aspects covered here
- Authorize-and-capture pattern used widely by merchants (inventory, partial fulfillment, tax/reconciliation)
- Refunds (full/partial) with deadlines, dispute-driven approvals
- Disputes workflow (offchain demo store of evidence/status) to mirror real ops
- Operator operational view: KPIs, expiries, refundable totals, TokenStore balance

> This demo runs on Polygon Amoy and uses an in-memory disputes store. It’s intended for evaluation and BD demos, not production custody.

## What’s inside
- Next.js (App Router) + TypeScript + Tailwind
- viem for onchain reads/writes
- Server routes for dashboard data and actions under `demo/web/app/api`:
  - `GET /api/dashboard/kpis` — KPIs (live volume, refundable, disputes, TokenStore balance)
  - `GET /api/dashboard/payments` — payment list with status
  - `GET /api/dashboard/payments/[id]` — detail by `salt` or `paymentInfoHash`
  - `GET /api/dashboard/refunds`, `POST /api/dashboard/refunds` — refundables + refund
  - `GET /api/dashboard/disputes`, `POST /api/dashboard/disputes`, `PATCH /api/dashboard/disputes` — in-memory disputes store
  - Payment operations (used by the Payment Ops tab): `POST /api/charge`, `POST /api/authorize-capture`, `POST /api/refund`, `POST /api/void`, `POST /api/reclaim`, `POST /api/payment/build`

## Key features
- Payments board with filters and per-payment detail (timeline + state)
- Refunds management (full/partial), analytics sidebar, countdowns
- Disputes list + detail (evidence, status, approve refund)
- KPI header: Live Payments, Refundable Now, Active Disputes, Operator Balance
- NEW: Payment Ops tab — build, charge, authorize+capture, refund, void, reclaim with tx links

## Setup
1) Env file: `demo/web/.env.local`
```
RPC_URL=...
AUTH_CAPTURE_ESCROW=...
PREAPPROVAL_COLLECTOR=...
OPERATOR_REFUND_COLLECTOR=...
DEMO_TOKEN=...
OPERATOR=...
OPERATOR_PRIVATE_KEY=...
PAYER=...
PAYER_PRIVATE_KEY=...
MERCHANT=...
```
2) Install and run
```
cd demo/web
npm install
npm run dev -p 3000
```
Open `http://localhost:3000/dashboard`.

## Try it (recommended)
Use the Payment Ops tab (no curl needed):
- Build Payment → Run Charge (approve + preApprove + charge)
- Or run Authorize + Capture (2-step)
- Refund (paste PaymentInfo from Build, or use one from an existing payment)
- Void / Reclaim (demo flows using env PaymentInfo)
The Results panel shows tx hashes with Polygonscan links, and the current PaymentInfo JSON for reuse.

## Architecture
- UI: `demo/web/app/dashboard/page.tsx`
- UI primitives: `demo/web/components/ui/*`
- ABIs & events: `demo/web/lib/abi.ts`
- Docs: `demo/docs/*` (Basics, Technical, Flows)

## Notes
- Disputes are stored in-memory for the demo (non-persistent).
- The dashboard reads logs from a recent blocks window (≈5k) for “real-time-ish” state.
- Refunds default to operator-funded refunds via `OPERATOR_REFUND_COLLECTOR`. 

## End-to-end flow (Charge → Refund) via the UI
1) Open the Payment Ops tab → Run Charge (e.g., 0.1). You’ll see approve/preApprove/charge tx links.
2) The new payment appears as `charged` in the Payments tab (detail → timeline/state).
3) Refund from the Refunds tab (Full/Partial) or from Payment Ops (Refund section).

## Advanced (curl) — optional
- Quick charge:
```
curl -X POST http://localhost:3000/api/charge -H 'content-type: application/json' -d '{"amountDec":"0.1"}'
```
- Authorize then capture:
```
curl -X POST http://localhost:3000/api/authorize-capture
```
- Get payment detail by salt/hash:
```
curl http://localhost:3000/api/dashboard/payments/[salt-or-hash]
```
- Refund with `paymentInfo` and `amount` (units):
```
curl -X POST http://localhost:3000/api/dashboard/refunds -H 'content-type: application/json' \
  -d '{
    "paymentInfo": { ...from detail response... },
    "amount": "50000000000000000"
  }'
```
This refunds 0.05 (assuming 18 decimals). Dashboard KPIs and Refunds update on refresh. 