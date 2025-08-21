## Product Plan — Pilot-Ready Dashboard Features

### Objectives
- **Protocol fit and parity**: Prove end-to-end authorize/capture/void/refund parity with legacy processors.
- **Low integration lift**: Provide adapters and webhooks that align with partner schemas and workflows.
- **Enterprise expectations**: Deliver reconciliation, controls, reporting, and operations UX.

### Feature Themes

- **Processor adapters (northbound integrations)**
  - Adapter layer mapping onchain lifecycle to each processor’s semantics (Shift4, Worldpay, Bridge/Stripe, Walapay/Nuvei).
  - Webhook emitters per-partner schema; signed payloads, retries, idempotency keys, ordered delivery.
  - Idempotency and replay protection for inbound/outbound events.

- **Merchant and operator models**
  - Merchant profiles: KYB status (stub), settlement instructions, supported tokens, refund SLAs, fee schedules.
  - Operator workspace: multi-merchant switching, RBAC, audit log of actions.
  - Fee engine: per-merchant fee bands, dynamic `feeReceiver` routing, scheduled changes.

- **Lifecycle UX parity**
  - Unified Ops panel: `authorize`, `capture`, `charge`, `refund`, `void`, `reclaim` for all collector types (PreApproval, Permit2, ERC-3009).
  - Partial capture/refund composer: line-item splits (subtotal, tax, shipping), multi-receiver fees, validation against `minFeeBps..maxFeeBps`.
  - Time-window guardrails and countdowns with policy templates (e.g., 7/30/90 days).

- **Reconciliation and reporting**
  - Settlement views: captured totals by merchant/processor/token/day; payout schedules; variance flags.
  - Exports: CSV and S3 pushes; GAAP-friendly schemas (Payments, Captures, Refunds, Fees, Payouts).
  - Dispute center: card-world state mapping (inquiry → chargeback), evidence attachments, refund linkage.

- **Risk and controls**
  - Rule engine: velocity limits, high-value approvals, token/client allow/deny lists.
  - Refund controls: thresholds, maker-checker approvals, dual control for large amounts.
  - Observability: incident timeline, SLA dashboards, alerting (webhook/Slack/Email).

- **Ecosystem support**
  - Multi-chain toggle (Polygon PoS, zkEVM, Amoy) and token catalogs per chain.
  - FX/rate capture: bind fiat quotes to onchain payments, store rate source + timestamp.
  - Sandbox harness: scenario generator (success, partial, timeout, denylist), simulated expiry time travel.

- **Platform hardening**
  - AuthN/Z: API keys, JWT/OAuth, RBAC, scoped permissions.
  - Secrets: KMS/HSM-backed signer abstraction (no raw PKs in env), relayer service.
  - Persistence: indexer + database for events, state snapshots, webhooks, disputes, exports.
  - Reliability: retries, DLQs, idempotent writes, backoff; reorg-safe indexing and reconciliation.

### Partner-Specific Priorities

- **Shift4 / Worldpay**
  - Batch settlements and daily payout files; reconciliation views aligned to settlement batches.
  - Partial capture after fulfillment; card-world dispute mapping.
  - Merchant-level fee schedules and operational controls.

- **Bridge/Stripe**
  - Split payouts (receiver + fee account), application fee modeling, transfer groups.
  - TokenStore as “balance”-like view; multi-item order grouping.
  - Webhook compatibility (event types, signatures, idempotency keys).

- **Walapay / Nuvei**
  - On/off-ramp UX: surface KYC/KYB states; fiat settlement targets.
  - FX lock-in at auth/capture; configurable rate providers.
  - Token policy enforcement per merchant/region.

### Data Model & APIs

- **Entities**: Merchant, ProcessorAdapter, SettlementBatch, Payout, Payment, Event, Dispute, ExportJob, WebhookSubscription, RiskRule, AuditLog.
- **Indices**: `paymentInfoHash`, `salt`, `operator`, `merchantId`, `processorId`, `chainId`, `token`.
- **APIs**
  - Webhooks: `payment.authorized|captured|charged|refunded|voided|reclaimed` (signed, idempotent, reordered-safe delivery).
  - Reconciliation: `GET /reports/settlements`, `GET /reports/payouts`, `GET /reports/variance` (filters: date, merchant, processor, token).
  - Risk: `POST /risk/rules`, `POST /risk/allow-list`, `POST /risk/deny-list`.
  - Admin: `PUT /fees`, `PUT /limits`, `POST /exports`, `POST /webhooks`.

### Indexing & Persistence
- Replace windowed reads with a persistent indexer:
  - Option A: Subgraph (The Graph) for `AuthCaptureEscrow` + `TokenStore`.
  - Option B: Viem log consumer → Postgres with reorg handling and exactly-once upserts.
- Store: payments, events, state snapshots, webhook deliveries, disputes, exports, audit logs.

### UX Improvements
- Multi-token selector and per-token KPIs; advanced filters (status, merchant, token, chain, date).
- Timeline deltas (accounting changes per event) and fee breakdowns.
- Bulk actions: batch captures/refunds with guardrails and approvals.
- Configurable expiries and fee ranges in the UI; presets per merchant.

### Compliance & Audit
- Full audit log (who/when/what) for every action; signed action records.
- Exportable dispute evidence bundles; retention controls and redaction.
- Access policies, data residency flags, and configurable retention windows.

### Pilot Success Metrics
- Time-to-integrate per partner; number of API/webhook mismatches.
- Event delivery reliability (>99.9%), idempotency correctness.
- Reconciliation accuracy (no unexplained variance across batches).
- Ops efficiency: mean time to capture/refund; approval latency.
- Infrastructure SLA adherence (RPC/indexer uptime, retry success).

### Phased Roadmap

- **Phase 0 — Hardening (1–2 weeks)**
  - API auth, secrets management, idempotency, retries/DLQ.
  - Indexer + DB; replace 5k-block windowing; reorg-safe processing.

- **Phase 1 — Pilot MVP (2–3 weeks)**
  - Processor adapters v1: Bridge/Stripe + Shift4 mapping.
  - Webhooks + signature verification; settlement/payout views; CSV export.
  - Multi-collector flows; partial capture/refund composer; fee config UI.

- **Phase 2 — Pilot+ Enterprise (3–4 weeks)**
  - Risk rules, approvals, maker-checker; enhanced disputes workflow.
  - Multi-chain/token KPIs; FX capture; on/off-ramp paths for Walapay/Nuvei.
  - SLA dashboards, alerting; bulk operations.

- **Phase 3 — Scale (4+ weeks)**
  - Batch processing, backfills, long-horizon analytics.
  - Merchant onboarding, RBAC, self-serve webhook/fee configuration.

### Open Questions / Next Priorities
- Target partner order and must-have API/webhook compat requirements.
- Required settlement artifacts (file formats, cadence) per partner.
- Preferred risk rules and approval thresholds; audit requirements.
- Reporting must-haves for reconciliation across tokens/chains. 