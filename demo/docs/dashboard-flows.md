### Commerce Payments Dashboard (Demo) — End-to-End Flow

Scenario: Payer buys an item; operator facilitates payment; merchant later requests a refund.

Actors
- Payer: holds the token being spent
- Merchant: receives funds upon capture/charge
- Operator: submits transactions (gas) and manages lifecycle

Network & contracts
- Polygon Amoy testnet (demo)
- `AuthCaptureEscrow` + Token Collectors; per-operator TokenStore

Flow (charge path: authorize + capture in one step)
1) Pre-approve (payer)
   - UI/Tool: demo uses `/api/charge` to simulate
   - Under the hood: payer `approve` to pre-approval collector and `preApprove(paymentInfo)`
2) Charge (operator)
   - UI: optional, or use `/api/charge`
   - On-chain: `escrow.charge(paymentInfo, amount, collector, data, feeBps, feeReceiver)`
   - Result: funds transferred to merchant; `refundableAmount` set
3) Observe in dashboard
   - Payments tab shows `charged` with expiries and token info
   - KPI updates: live volume increments; refundable may reflect the amount
4) Refund (operator)
   - From Refunds tab: choose payment row → `Full Refund` or `Partial Refund`
   - Under the hood: `POST /api/dashboard/refunds` → `escrow.refund(paymentInfo, amount, refundCollector, data)`
   - Result: `refundableAmount` decreases; payer receives tokens back
5) Dispute (optional)
   - Create dispute from Payments detail or Disputes tab
   - Add evidence (URL) and set status; approve refund from the dispute detail

Alternate flow (authorize → capture)
1) Authorize (operator)
   - UI: use `/api/authorize-capture` to simulate authorize then capture
   - On-chain: `escrow.authorize(paymentInfo, amount, paymentCollector, data)`
   - Result: funds in TokenStore; status `authorized`
2) Capture (operator)
   - On-chain: `escrow.capture(paymentInfo, amount, feeBps, feeReceiver)` (partial or full)
   - Result: funds to merchant; `refundableAmount` increases
3) Void or Reclaim (cancellation paths)
   - Void (operator, anytime): returns capturable funds to payer; payment no longer capturable
   - Reclaim (payer, after auth expiry): returns remaining capturable funds to payer

What the dashboard surfaces
- Timeline: authorized/charged/captured/refunded/voided/reclaimed with tx links
- State: `capturableAmount`, `refundableAmount`
- Actions: refund (full/partial), create dispute, approve refund from disputes, set dispute status, add evidence

How to reproduce in the demo
- Seed activity: call `POST /api/run-demo` or `POST /api/authorize-capture` or `POST /api/charge`
- Open `/dashboard`:
  - Payments: inspect detail, create dispute
  - Refunds: run full/partial refunds; view analytics sidebar
  - Disputes: open a dispute, add evidence, set status, approve refund 