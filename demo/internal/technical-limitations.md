## Demo Limitations

### Scope and indexing
- **Windowed log reads only**: All dashboard reads use a recent block window (~5k blocks). Older events fall out of scope, so:
  - **Timelines** may be incomplete for long‑lived payments.
  - **Status derivation** can miss historical transitions outside the window.
  - **KPIs** reflect only the active window, not total history.
- **No database/indexer**: There is no persistent store for events or derived state. The app re-derives from logs on each request and cannot compute long-term analytics.

### Session scoping (minSalt)
- **Session filter**: Endpoints filter by `salt ≥ minSalt` (anchored to server boot time). This:
  - Keeps KPIs and lists scoped to the “current session,” but excludes payments created before server boot.
  - Can produce **inconsistent metrics across restarts** (new `minSalt`).
  - Requires explicit overrides to compare across sessions.

### Payment identity and salts
- **Salt generation**: Demo uses `salt = now` (seconds). If two payments are built within the same second with identical fields, a **collision** is possible.
- **Lookup by salt**: `GET /api/dashboard/payments/[id]` resolves by salt within the recent logs window. If the creation event is outside the window, **lookup by salt can fail**.

### Collectors and flows covered
- **Payment collectors**: Demo write routes exercise only the pre-approval collector (`approve → preApprove`). ERC-3009 and Permit2 collectors are not demonstrated end‑to‑end.
- **Refund collectors**: The default path uses an operator-funded refund collector. Merchant-funded (e.g., ERC-3009/Permit2-based) refund collectors are not implemented in the demo.
- **Fees**: Demo flows set `feeBps = 0` and `feeReceiver = 0x0`, so fee validation/behavior across ranges and dynamic recipients is not exercised.

### Security and operational constraints
- **Server-side private keys**: The server loads `OPERATOR_PRIVATE_KEY` (or `RELAYER_PRIVATE_KEY`) and `PAYER_PRIVATE_KEY` from environment variables and signs transactions. This is **not suitable for production custody**.
- **No API authentication/authorization**: Demo API routes accept public calls. A third party could trigger onchain actions using the server’s keys if the demo is publicly reachable.
- **Rate limiting and abuse protection**: No rate limiting, CSRF protection, or abuse prevention is implemented.
- **Nonce handling**: Nonces are read per account at call time; concurrent requests can **race** and cause nonce conflicts.

### State derivation and accuracy
- **Status precedence**: Status is computed from logs with a simple precedence (`charged > captured > authorized`; terminal: refunded|voided|reclaimed). Edge cases outside the window can **misclassify** status.
- **Refundable calculation**: Refund candidates use `sum(captured) − sum(refunded)` from recent logs. It is an **approximation** and does not reconcile against historical events outside the window.
- **TokenStore balances**: KPIs show native `POL` for operator when available. The demo **does not compute per‑token TokenStore balances** for KPIs; the sidebar balance may be incomplete relative to claims in docs.

### UX and formatting
- **Single-token assumption**: UI assumes a single demo token for formatting symbols/decimals. Multi-token payments are not fully supported in the presentation layer.
- **Amount formatting**: UI formatting truncates to 4 fractional digits and may be locale‑sensitive. Exact amounts should be read from raw units when precision is critical.
- **Real-time updates**: Polling with a small memoization window (~3s). There are **no websockets or subscriptions**, so updates are “real‑time‑ish.”

### Chain and configuration
- **Chain fixed to Amoy**: URLs and chain config are tied to Polygon Amoy. There is no runtime chain switching.
- **Hard-coded expiries**: `preApprovalExpiry/authorizationExpiry/refundExpiry` are set to `now + (1h/2h/3h)` in demo flows. These are **not configurable from the UI** and may not match real commerce policies.
- **Single RPC and no fallback**: Uses a single `RPC_URL` without fallbacks or adaptive backoff. Outages or rate limits will surface as errors.

### Disputes and persistence
- **In-memory disputes store**: Disputes are kept in a process-global variable. They **reset on redeploy/restart**, are not durable, and are not multi‑instance safe.
- **No onchain linkage**: Disputes exist only offchain in the demo; approving refunds from disputes does not record any onchain correlation.

### Reorgs, liveness, and resiliency
- **Reorg handling**: No explicit protection against chain reorgs. The app may show transient or incorrect statuses during reorgs.
- **Error handling**: Limited retries/backoff. Failures (RPC/network) may require manual refresh.
- **Gas strategy**: Default gas settings from viem/provider; no dynamic fee strategy or estimation tuning exposed.

### Security reminders (demo‑only)
- **Not for production custody**: Keys in env and public endpoints make this demo inherently unsafe for production. Use dedicated relayer infrastructure, API auth, key management (HSM/KMS), and role-based access control before any real deployment.
- **Token denylists and fee receiver**: The demo sets `feeReceiver = 0x0` and `feeBps = 0`. It does not demonstrate liveness strategies for denylisted fee receivers or dynamic fee routing.

### Extensibility gaps
- **Multi-collector UX**: UI lacks flows to select ERC‑3009/Permit2 collectors or pass collector‑specific data (e.g., signatures).
- **Multi-token support**: UI assumes a single token for KPIs and formatting; switching tokens requires code changes.
- **Analytics**: No historical trends, cohort analysis, or revenue/fee reports due to lack of persistence and indexing. 