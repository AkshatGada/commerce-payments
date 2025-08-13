### Payment Ops Stabilization Plan (payments-foxes)

Scope: Improve the Payment Ops tab to (a) surface operation progress via loading indicators, (b) fix JSON serialization errors when building PaymentInfo, and (c) fix the Authorize + Capture flow by ensuring prerequisite steps are executed.

1) Add loading indicators
- Show a spinner and disable buttons while operations run: Build, Charge, Authorize+Capture, Refund, Void, Reclaim
- Keep per-operation state to avoid blocking unrelated actions
- Minimal UX: inline spinner inside the button; no modals required

2) Fix Build Payment serialization
- Problem: JSON serialization fails on BigInt
- Approach: return a JSON-safe PaymentInfo: convert all uint fields to strings
- Compatibility: downstream routes (e.g., refunds) will accept this JSON shape and convert back to BigInt before contract calls

3) Fix Authorize + Capture revert
- Problem: revert on authorize via PreApproval collector due to missing payer pre-approval
- Approach: mirror the charge flow steps: payer approves ERC20 to PreApprovalCollector, payer calls preApprove(paymentInfo), then operator calls authorize and capture
- Nonce handling: use pending nonces for payer and operator as done in charge

4) Server-side normalization for Refunds
- Accept JSON-safe PaymentInfo; normalize types before writeContract
- Coerce numeric strings to BigInt and addresses to checksum

5) Verification
- Run: Build → Charge (USDC) and Build → Authorize + Capture
- Check: Payment card updates, KPIs reflect USDC amounts, Operator Balance shows POL, Refunds tab supports partial refund using JSON-safe PaymentInfo

Deliverables
- UI: inline spinner states on Payment Ops buttons
- API: JSON-safe build route, normalized refund route, fixed authorize-capture route
- Env: token decimals respected (USDC) 