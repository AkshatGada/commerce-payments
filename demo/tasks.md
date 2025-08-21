# Dashboard Tasks

> Tracking checklist for the merchant dashboard in `demo/web`.

## Meta
- [x] Create dashboard plan (`demo/dashboard-plan.md`)
- [x] Scaffold `/dashboard` page (Next.js App Router)
- [x] Hook endpoints to dashboard UI
- [ ] Add README section linking dashboard

## Reuse Existing Protocol + Endpoints
- [x] Reuse escrow + collectors from repo (no new contracts)
- [x] Reuse demo endpoints for core operations (charge, authorize→capture, refund, void, reclaim)
- [x] Fix `authorize-capture` tokenCollector param to use `PREAPPROVAL_COLLECTOR`
- [ ] Centralize shared viem config/utilities for reuse across endpoints

## New API Endpoints (Phase 1)
- [x] `GET /api/dashboard/payments` — list payments with status (logs/indexer or stub)
- [x] `GET /api/dashboard/payments/[id]` — payment detail by `paymentInfoHash` or `salt`
- [x] `GET /api/dashboard/refunds` — list refundable payments
- [x] `POST /api/dashboard/refunds` — process refund (reuse escrow `refund` path)
- [x] `GET /api/dashboard/disputes` — list disputes (offchain)
- [x] `POST /api/dashboard/disputes` — create dispute (offchain)

## UI (Phase 1)
- [x] Payment status board with filters (salt, payer, status, token, date)
- [x] Payment detail drawer/page with timeline
- [x] Refunds dashboard (eligible list + countdowns) — basic via Payments table + detail fetch
- [x] Refund processing (one-click + partial + bulk) — basic 50% action
- [x] Disputes dashboard + create flow

## Analytics (Phase 1)
- [ ] Basic refund analytics (count, amount, reasons)
- [ ] Basic disputes analytics (rates, avg resolution time)

## Quality + Ops
- [ ] Add basic input validation to new endpoints
- [ ] Error boundary + toasts in UI
- [ ] Env checks (`process.env`) for dashboard endpoints
- [ ] E2E happy-path test plan for demo flows via dashboard 