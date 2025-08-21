## Token Collector Abstraction — Technical Implementation Plan

### Goals
- **Unify multiple authorization methods** (PreApproval, ERC-3009, Permit2) behind a clean abstraction.
- **Operator choice at build-time**: select the collector for each payment.
- **Handle collector-specific prep**: signatures, approvals, validity windows.
- **Pass correct `collectorData`** to escrow for `charge` and `authorize`.
- **Observability**: show collector used per payment; optionally decode payload previews.
- **Keep demo-safe defaults**; enable production-hardening later.

### User Stories
- As an operator, I can choose an Authorization Method: **PreApproval**, **ERC-3009**, or **Permit2**.
- I can run **Charge** or **Authorize → Capture** using the selected method.
- I can prepare any **required approvals/signatures** from the UI.
- I can see which **collector was used** for any payment and key terms/validity.
- If a method isn’t supported, I get a **guided fallback** to a supported method.

### Architecture Overview
- **UI**: Extend the Payment Ops composer with a **Collector dropdown** + contextual inputs per method.
- **API**: Add **builder endpoints** that produce ready-to-use `collectorData` for ERC-3009 and Permit2. Update payment routes to accept `{ collector, collectorData }`.
- **Contracts**: Unchanged. Escrow remains collector-agnostic; we supply the chosen collector address and bytes.

### Collectors and Flows (Scope)
- **PreApprovalPaymentCollector** (existing):
  - Payer on-chain: `approve(token, collector, amount)` → `collector.preApprove(paymentInfo)`
  - Escrow: `charge/authorize` with `collectorData = 0x`
- **ERC3009PaymentCollector** (new):
  - Payer off-chain: EIP-3009 signature for `receiveWithAuthorization`-style transfer
  - Escrow calls collector with `collectorData` (packed args + signature)
- **Permit2PaymentCollector** (new):
  - Payer one-time on-chain: `approve(PERMIT2_ADDRESS, max)` (or limited)
  - Payer off-chain: PermitSingle EIP-712 signature
  - Escrow calls collector with `collectorData` (permit struct + signature)

Future (refund collectors, optional next phase):
- **OperatorRefundCollector** (existing)
- **ERC3009RefundCollector** and **Permit2RefundCollector** (merchant-funded refunds)

### Configuration & Types
- **Env vars** (add):
  - `ERC3009_COLLECTOR`, `PERMIT2_COLLECTOR`, `PERMIT2_ADDRESS`
  - Optional: `ERC3009_TOKENS_ALLOWLIST` (comma-separated list)
- **Types**:
  - `CollectorType = 'preapproval' | 'erc3009' | 'permit2' | 'refund:operator' | 'refund:erc3009' | 'refund:permit2'`
  - `CollectorConfig = { address: Hex; label: string; kind: CollectorType; requirements?: string[] }`

### UI Changes (Payment Ops: `demo/web/app/dashboard/page.tsx`)
- Add **Collector select** with options: PreApproval, ERC-3009, Permit2.
- Contextual inputs:
  - Common: `amountDec`, (future: `feeBps`, `feeReceiver`).
  - ERC-3009: `validAfter`, `validBefore` (sec), `nonce` (optional).
  - Permit2: `permitDeadline` (sec), `permittedAmount` (defaults to `amount`), `spender=collector`.
- **Prepare step** (button):
  - PreApproval: keep current flow (approve + preApprove); no `collectorData`.
  - ERC-3009: call `POST /api/collector/erc3009/prepare` to get `collectorData`.
  - Permit2: ensure Permit2 approval (if needed) and call `POST /api/collector/permit2/prepare` to get `collectorData`.
- **Execute** buttons:
  - Charge: `POST /api/charge` with `{ paymentInfo, amount, collector, collectorData }`.
  - Authorize + Capture: `POST /api/authorize-capture` with same shape (or split into `/api/authorize` + `/api/capture`).
- **Observability**:
  - Show selected collector label and preview of `collectorData` (safe subset) in the Results panel.

### API Changes
- New builder routes:
  - `POST /api/collector/erc3009/prepare`
    - Input: `{ paymentInfo, amount, validAfter, validBefore, nonce? }`
    - Output: `{ collectorData: Hex, preview: {...} }`
  - `POST /api/collector/permit2/prepare`
    - Input: `{ paymentInfo, amount, deadline, permittedAmount? }`
    - Output: `{ collectorData: Hex, preview: {...} }`
- Update payment routes:
  - `POST /api/payment/build` → accept `collectorType` (optional) and return defaults (e.g., windows)
  - `POST /api/charge`, `POST /api/authorize-capture` → accept `{ collector, collectorData }`
    - Backward-compatible default: PreApproval with `collectorData = '0x'`

### CollectorData Encoding (helpers in `demo/web/lib/collectors.ts`)
- PreApproval: `'0x'` (unused)
- ERC-3009: ABI-encode
  - Example layout: `(from, to, value, validAfter, validBefore, nonce, v, r, s)`
  - Collector unpacks and calls token’s `receiveWithAuthorization` (or variant)
- Permit2: ABI-encode
  - `PermitSingle` struct fields `{ permitted: { token, amount }, spender, nonce, deadline }`, and signature bytes
  - Collector unpacks and calls Permit2 to transfer

### Events & Detail View
- `PaymentAuthorized` and `PaymentCharged` include `tokenCollector`.
- Extend:
  - `GET /api/dashboard/payments` to map `tokenCollector` → `collectorLabel` for rows
  - `GET /api/dashboard/payments/[id]` to include `collectorLabel` in detail
- UI: show collector label in list chips and detail header; optional decoded preview

### Validation & Fallbacks
- ERC-3009 support:
  - Probe token support or use `ERC3009_TOKENS_ALLOWLIST`; if unsupported, hide/disable option.
- Permit2 availability:
  - Validate `PERMIT2_ADDRESS` on chain; hide if unavailable.
- Fallbacks:
  - If ERC-3009 prepare fails, prompt fallback to Permit2 → PreApproval.

### Testing Plan
- **Unit**: typed data builders for ERC-3009 and Permit2; signature recovery matches expected domains.
- **Integration (Amoy)**:
  - ERC-3009: use a known ERC-3009 token (or deploy a demo)
  - Permit2: use Uniswap Permit2 on Amoy and a standard ERC-20
- **Regression**: existing PreApproval flows remain unaffected.

### Security Considerations
- Demo signs with env keys; add minimal **API protection** in dev/staging.
- Do not log raw signatures; show truncated previews.
- Future: client-side signing or KMS/HSM-backed server signer abstraction.

### Delivery Steps (Sequenced)
1) Config & ABIs
   - Add env vars: `ERC3009_COLLECTOR`, `PERMIT2_COLLECTOR`, `PERMIT2_ADDRESS`, `ERC3009_TOKENS_ALLOWLIST?`
   - Add minimal Permit2 ABI/types if needed.
2) Library
   - Create `demo/web/lib/collectors.ts` with encoders/decoders and typed data builders (`erc3009`, `permit2`).
   - Helpers to resolve `CollectorConfig` from env.
3) API — Builder Endpoints
   - `POST /api/collector/erc3009/prepare`
   - `POST /api/collector/permit2/prepare`
   - Input validation, typed data construction, signing (demo-only), return `collectorData`.
4) API — Payment Routes
   - Update `POST /api/charge` and `POST /api/authorize-capture` to accept `{ collector, collectorData }`.
   - Maintain PreApproval as default path.
5) UI — Ops Tab
   - Add Collector select and contextual inputs.
   - Implement Prepare logic per collector; persist `collectorData` in state.
   - Wire Execute actions to send chosen `collector` + `collectorData`.
6) Events & Detail
   - Update payments and detail endpoints to surface `collectorLabel`.
   - UI: display label (and optional payload preview) in list/detail.
7) Validation & Fallbacks
   - Implement token capability checks; hide/disable unsupported collectors.
   - UX prompts for fallback if preparation fails.
8) Tests
   - Unit tests for data builders and encoders.
   - Integration tests on Amoy for each method.
9) Docs
   - Update `demo/product.md` and `docs/TokenCollectors.md` references (demo section) to reflect UI/API changes.

### Task Breakdown (Actionable)
- Config
  - [ ] Add new env vars to `demo/web/.env.example` and README
- Library (`demo/web/lib/*`)
  - [ ] `collectors.ts`: `encodeErc3009CollectorData`, `encodePermit2CollectorData`, `buildErc3009TypedData`, `buildPermit2TypedData`, `resolveCollectorConfig`
  - [ ] `erc3009.ts`, `permit2.ts` (optional: split per collector)
- API (new)
  - [ ] `demo/web/app/api/collector/erc3009/prepare/route.ts`
  - [ ] `demo/web/app/api/collector/permit2/prepare/route.ts`
- API (update)
  - [ ] `demo/web/app/api/charge/route.ts`: accept `collector`, `collectorData`
  - [ ] `demo/web/app/api/authorize-capture/route.ts`: accept `collector`, `collectorData`
  - [ ] `demo/web/app/api/payment/build/route.ts`: accept `collectorType` and return defaults
- UI (update `demo/web/app/dashboard/page.tsx`)
  - [ ] Collector select + inputs
  - [ ] Prepare handlers calling new builder endpoints
  - [ ] Execute using `{ collector, collectorData }`
  - [ ] Show `collectorLabel` and preview in detail/results
- Events/Detail
  - [ ] Update `GET /api/dashboard/payments` to attach `collectorLabel`
  - [ ] Update `GET /api/dashboard/payments/[id]` to include `collectorLabel`
- Validation & Fallbacks
  - [ ] ERC3009 support probe/allowlist; Permit2 availability check
  - [ ] Fallback UX path
- Tests
  - [ ] Unit: typed data/signatures
  - [ ] Integration: run end-to-end flows on Amoy for each collector
- Docs
  - [ ] Update demo docs to include collector selection and flows

### Milestones
- **M1 — Builder & Encoding (1–2 days)**: env, library helpers, builder endpoints, basic unit tests
- **M2 — Payment Routes & UI (2–3 days)**: updated `/charge` and `/authorize-capture`, Ops UI with collector selection and prepare/execute
- **M3 — Detail, Validation & Tests (1–2 days)**: collector label in lists/detail, capability checks, integration tests
- **M4 — Polish & Docs (1 day)**: payload previews, docs updates, minor UX refinements

### Open Questions
- Which ERC-3009 token(s) are we targeting on Amoy (deploy demo token if needed)?
- Confirm Permit2 address on Amoy and spender policy.
- Do we need separate authorize/capture endpoints now, or keep combined route for demo?
- What minimal API auth should we add for staging (rate limiting, key)? 