# Commerce Payments Demo — Executive Overview

## 1) Purpose
This demo presents the Commerce Payments Protocol through a modern, operator‑facing dashboard. It demonstrates how onchain payments support day‑to‑day commerce requirements such as reserving funds, settling after fulfillment, issuing refunds, and handling disputes—while preserving transparency and strong controls.

## 2) Dashboard Capabilities
- KPI Overview: live payment volume, refundable totals, active disputes, and operator balance
- Payments: real‑time status tracking with an auditable timeline and links to the blockchain explorer
- Refunds: eligibility view with full and partial refund actions
- Disputes: record, attach evidence, update status, and approve refunds
- Payment Ops: one‑click execution of common payment operations for demonstrations and testing

## 3) The Payments Tab (at a glance)
Each card represents a payment and displays a clear status:
- Authorized: funds reserved for a purchase
- Captured: reserved funds settled to the merchant
- Charged: authorization and capture completed in a single step
- Refunded: funds returned to the payer
- Voided/Reclaimed: reserved funds cancelled and returned to the payer

Selecting “View” opens a detailed panel with PaymentInfo, current state (what is capturable or refundable), and a step‑by‑step timeline. Every event links to the blockchain explorer for independent verification.

## 4) How to Use the Demo
1. Open the dashboard and choose the Payment Ops tab.
2. Select a scenario:
   - Build Payment → Charge (instant settlement), or
   - Authorize + Capture (two‑step settlement)
3. Review the results panel for transaction hashes and explorer links.
4. Move to the Payments or Refunds tab to observe state changes and, if relevant, initiate a refund.
5. Use the Disputes tab to log and resolve issues by attaching evidence and, where appropriate, approving a refund.

The demo is session‑aware: counts and lists focus on operations performed since the server started, reducing noise from previous runs.

## 5) Why This Matters
Commerce requires more than simple wallet‑to‑wallet transfers. Merchants need to:
- Reserve funds and settle later based on fulfillment and reconciliation timelines
- Cancel or return funds safely (voids, reclaims, refunds)
- Resolve disputes through a documented process with supporting evidence

The protocol brings these patterns onchain with a trust‑minimized operator model. Operators advance payments through defined states, but movement of funds is strictly constrained by cryptographic terms and time‑based safeguards.

## 6) Protocol Components Used (Credit)
This demo is built on the Base Commerce Protocol’s audited components:
- AuthCaptureEscrow — core contract that validates terms, manages payment state, and executes authorize, capture, charge, refund, void, and reclaim
- TokenStore — per‑operator vault that segments escrowed liquidity for safety
- Token Collectors — pluggable modules for sourcing funds (demo uses Pre‑Approval collector for payments and an Operator Refund collector for refunds)
- PaymentInfo & Time Windows — immutable payment terms with `preApprovalExpiry`, `authorizationExpiry`, and `refundExpiry` providing safety and predictability
- Fee Framework — min/max fee bps constraints and optional dynamic fee receiver (fee=0 by default in the demo)

## 7) Notes and Additional Details
- Transparency: every action links to the blockchain explorer for auditability
- Safety Windows: pre‑approval, authorization, and refund expiries prevent funds from remaining in limbo
- Documentation:
  - Protocol overview: `docs/README.md`
  - Token collectors and fees: `docs/TokenCollectors.md`, `docs/Fees.md`
  - Security and audits: `docs/Security.md`, root `README.md`
- Support: if a result looks unexpected, refresh KPIs or follow the transaction links in the results panel to confirm onchain status

With these tools, teams can demonstrate end‑to‑end commerce flows—authorize → capture, charge, refund, void, and reclaim—clearly and credibly, in minutes. 