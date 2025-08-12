# Commerce Payments Demo Dashboard

A modern operator-facing dashboard demonstrating the Commerce Payments Protocol on Polygon Amoy. It visualizes the full payment lifecycle and lets you operate flows like refunds and disputes.

## What’s inside
- Next.js (App Router) + TypeScript + Tailwind
- viem for onchain reads/writes
- Server routes for dashboard data and actions under `demo/web/app/api`:
  - `GET /api/dashboard/kpis` — KPIs (live volume, refundable, disputes, TokenStore balance)
  - `GET /api/dashboard/payments` — payment list with status
  - `GET /api/dashboard/payments/[id]` — detail by `salt` or `paymentInfoHash`
  - `GET /api/dashboard/refunds`, `POST /api/dashboard/refunds` — refundables + refund
  - `GET /api/dashboard/disputes`, `POST /api/dashboard/disputes`, `PATCH /api/dashboard/disputes` — in-memory disputes store
- Demo operation endpoints (for local seeding): `POST /api/charge`, `POST /api/authorize-capture`, `POST /api/refund`, `POST /api/void`, `POST /api/reclaim`, `POST /api/payment/build`

## Key features
- Payments board with filters and per-payment detail (timeline + state)
- Refunds management (full/partial), analytics sidebar, countdowns
- Disputes list + detail (evidence, status, approve refund)
- KPI header: Live Payments, Refundable Now, Active Disputes, Operator Balance

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

## Seeding demo activity
- Quick charge (default 0.01 token):
```
curl -X POST http://localhost:3000/api/charge -H 'content-type: application/json' -d '{"amountDec":"0.1"}'
```
- Authorize then capture (0.01 token):
```
curl -X POST http://localhost:3000/api/authorize-capture
```

## Architecture
- UI: `demo/web/app/dashboard/page.tsx`
- UI primitives: `demo/web/components/ui/*`
- ABIs & events: `demo/web/lib/abi.ts`
- Docs: `demo/docs/*` (Basics, Technical, Flows)

## Notes
- Disputes are stored in-memory for the demo (non-persistent).
- The dashboard reads logs from a recent blocks window (≈5k) for “real-time-ish” state.
- Refunds default to operator-funded refunds via `OPERATOR_REFUND_COLLECTOR`. 