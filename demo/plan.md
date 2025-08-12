# Visual Demo Plan (Payments Protocol)

## Goals
- Showcase all 6 operations with clear fund movement and timing windows.
- One-click scenes that run reliably on Amoy using env-configured wallets.
- Minimal friction for BD demo, with readable balances and tx links.

## UX Structure
1. Payment Graph (Payer → TokenStore → Merchant [+ Fee Receiver]) with animations
2. State Panel: capturable/refundable bars + expiry countdowns
3. Timeline: PaymentAuthorized/Captured/Charged/Voided/Reclaimed/Refunded with tx links
4. Balances: payer, merchant, tokenStore (and feeReceiver if used)
5. Scene tabs: Charge, Authorize→Captures, Refund, Void, Reclaim

## API Endpoints
- POST /api/payment/build: Return PaymentInfo, hash, tokenStore, expiries
- POST /api/authorize: approve + preApprove (payer), then authorize (operator)
- POST /api/capture: capture (operator) amount + feeBps + feeReceiver
- POST /api/charge: approve + preApprove (payer), then charge (operator)
- POST /api/void: void (operator)
- POST /api/reclaim: reclaim (payer)
- POST /api/refund: refund (operator) amount via OPERATOR_REFUND_COLLECTOR
- GET /api/payment/state?hash=...: balances + latest events (phase 2)

## Milestones
- M1 (today):
  - Scaffold `/payments` page with components: PaymentGraph, StatePanel, Balances, Timeline (static)
  - Implement /api/payment/build, /api/charge, /api/authorize, /api/capture
  - Wire Charge and Authorize→Capture buttons; show balances and tx links
- M2:
  - Implement /api/refund, /api/void, /api/reclaim
  - Add timers and button gating by expiries
  - Add partial capture flow with fee slider (2% then 4%)
- M3:
  - Event Timeline from onchain logs filtered by paymentInfoHash
  - Collector switching (PreApproval default; Permit2/3009 optional)
  - Polishing animations and error UX; Vercel deploy

## Risks & Mitigations
- Nonce conflicts: fetch pending nonces, await receipts between steps
- Payment reuse: vary salt on each run
- RPC flakiness: allow retry and show errors with copied payload

## Done when
- All 6 operations demoed with animations, balances, and tx links.
- BD can run any scene in <8 minutes from the hosted demo. 