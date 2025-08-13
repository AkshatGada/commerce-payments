# Payment Operations Tab — README & Instructions

## Overview
The Payment Ops tab provides a guided UI to execute and verify individual payment operations of the Commerce Payments Protocol without curl. It’s designed for demos and QA to run transactional flows quickly and view results (tx hashes, scan links, and the affected payment state) in one place.

What you can do
- Build PaymentInfo for a fresh demo payment
- Charge (1-step authorize + capture)
- Authorize + Capture (2-step)
- Refund (full/partial) using operator-funded refund collector
- Void (operator-initiated cancel of uncaptured funds)
- Reclaim (payer-initiated cancel after authorization expiry)

The Results panel shows your latest txs and links to Polygonscan. It also displays the current PaymentInfo JSON so you can reuse/copy it when needed.

## Quick Start
1) Start dev server
```
cd demo/web
npm run dev -p 3000
```
2) Open the dashboard at `http://localhost:3000/dashboard` and click the new "Payment Ops" tab.
3) Run one of:
   - Build Payment → Run Charge
   - Authorize + Capture (runs both txs sequentially)
   - Refund (paste PaymentInfo or reuse the one from Build Payment)

Tip: The dashboard session is anchored to server start, so counts reflect only operations you trigger after `npm run dev` (session-aware filtering).

## Controls & Flows
- Build Payment
  - Calls `/api/payment/build` to generate a PaymentInfo using env values and `salt=now()`.
  - The PaymentInfo JSON appears in the right panel and can be reused in Refund.

- Charge
  - Inputs: `amountDec` (defaults to 0.1 or your value)
  - Calls `/api/charge` → approve (payer) + preApprove (payer) + charge (operator)
  - Results show three tx hashes with Polygonscan links

- Authorize + Capture
  - Runs two txs: `authorize` followed by `capture` for the same amount
  - Use for 2-step demo; results show both hashes

- Refund
  - Inputs: `amountDec` and `PaymentInfo`
  - Paste PaymentInfo from Build Payment or from a detail endpoint
  - Calls `/api/dashboard/refunds` (operator-funded refund collector)

- Void
  - Calls `/api/void` using demo env PaymentInfo; returns uncaptured funds to payer

- Reclaim
  - Calls `/api/reclaim` using demo env PaymentInfo; only valid after `authorizationExpiry`

## Result Panel
- Tx log (latest on top): shows operation, tx hash, and a "view" link to Polygonscan
- Current PaymentInfo: JSON block for copy/paste and auditing

## Notes
- On first charge per token, the payer’s approve+preApprove are required; later charges only run the operator charge.
- KPIs and Payments board will reflect only current session operations; refresh KPIs to see updates.
- Refunds require a PaymentInfo that has refundable balance.

## Troubleshooting
- Nothing shows after operation
  - Check the toast for errors; RPC issues may require retry.
  - Open the tx links in the Results panel to confirm status.
- Reclaim fails
  - Ensure current time is past `authorizationExpiry` for that PaymentInfo.

---

## Original Plan (for reference)

### Goals
- Provide a guided UI to execute each payment operation without curl.
- Show clear next steps (e.g., authorize → capture) and live feedback (tx hashes, links).
- Keep outputs consistent with the dashboard session filters.

### Layout
- New tab: "Payment Ops" to the right of Disputes.
- Two columns (responsive):
  1) Operation Controls (cards with inputs + buttons)
  2) Result Panel (timeline/log + current PaymentInfo and State)

### Components
- OperationCard(title, description, inputs, primaryAction, helperAction?)
- ResultPanel
  - Tx list with status, hash, Polygonscan link, elapsed time
  - PaymentInfo (formatted)
  - State snapshot (capturable/refundable)
  - Session window/minSalt shown subtly
- Shared helpers
  - toUnits/fromUnits, short address, openScanLink

### Supported Operations
- Build Payment (helper): calls `/api/payment/build` → returns PaymentInfo to reuse for subsequent ops in the session panel.
- Authorize: `/api/authorize-capture` can be split; for clarity we’ll add a dedicated authorize endpoint (or reuse authorize inside authorize-capture with capture skipped) — UX takes PaymentInfo + amount + collector.
- Capture: `/api/capture` (requires PaymentInfo + amount + feeBps + feeReceiver).
- Charge: `/api/charge` (PaymentInfo + amount + collector + fee params; feeBps=0 default).
- Void: `/api/void` (PaymentInfo only; returns capturable to payer).
- Reclaim: `/api/reclaim` (PaymentInfo; only after authorizationExpiry).
- Refund: `/api/refund` (PaymentInfo + amount; uses OPERATOR_REFUND_COLLECTOR by default).

### Inputs (defaults)
- amountDec: number (default 0.01 of token decimals)
- feeBps: 0 by default; feeReceiver: 0x0 by default
- collector: PREAPPROVAL_COLLECTOR for authorize/charge; OPERATOR_REFUND_COLLECTOR for refund
- PaymentInfo: either from Build Payment or pasted JSON; salt auto-`now()` if building

### Flow Guidance (UX)
- Build → Authorize → Capture
  - After Authorize succeeds, show a hint button: "Now Capture" (prefill same PaymentInfo and max amount available).
- Charge (standalone)
  - After Charge, show hint buttons: "View Detail" and "Refund" (prefill refundable amount).
- Void/Reclaim
  - After Authorize (before Capture), show "Void" enabled; "Reclaim" disabled until `authorizationExpiry` < now.
- Refund
  - Enabled after Capture/Charge; prefill `refundableAmount`.

### Result Panel Details
- Always display latest response at the top of the log.
- Fields per tx:
  - operation, amount, fee, from, to, gas payer (sender), txHash (scan link)
- After each success, fetch `/api/dashboard/payments/[salt-or-hash]` and show PaymentInfo + State + Timeline to confirm effects.
- Respect session filtering (minSalt) so numbers match KPIs.

### Errors & Validation
- Disable buttons while pending; show toast + inline error.
- Validate amount > 0; for capture/refund cannot exceed available.
- For reclaim, guard on time (explain when it will be available).

### Settings/Toggles
- Session-only (default): send `?minSalt=sessionMinSalt` to detail fetches.
- Advanced (optional future): manual minSalt input for reproducible replays.

### Rollout
- Phase 1
  - Implement UI shell + OperationCards for Charge, Build, Authorize, Capture, Refund.
  - Append results to panel; fetch detail after each op.
- Phase 2
  - Add Void/Reclaim with guards and countdown hints.
  - Add fee inputs and feeReceiver for capture/charge.
- Phase 3
  - Add presets and a "Run Scenario" sequence (e.g., Build → Authorize → Capture automatically). 