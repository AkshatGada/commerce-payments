# Dashboard Data Issues and Remediation Plan

## Context
The dashboard derives state from onchain events using server routes under `demo/web/app/api/dashboard/*`, primarily via `viem.getLogs` over a recent block window (~5k blocks). UI fetches these routes on load/refresh.

---

## Observed Issues

1) Inconsistent transaction counts on refresh
- Symptom: Refreshing `/dashboard` shows different numbers of payments; after multiple refreshes the count stabilizes.
- Surfaces: Payments list and KPIs.

2) "Live Payments" card shows fluctuating totals (count and DMO volume)
- Symptom: The KPI sometimes shows a higher/lower count and sum, changing between refreshes.
- Surfaces: `GET /api/dashboard/kpis`.

3) Verification of charge transactions (clarity)
- Clarification: Endpoint `POST /api/charge` performs approve (payer), preApprove (payer), and charge (operator). Users want a simple way to verify onchain that payer→merchant transfer happened and who paid gas for each step.

---

## Likely Root Causes

- Windowed log queries
  - Routes use a sliding recent-window (latest-5000 → latest). As new blocks arrive, the window and results shift, causing ephemeral counts. Older events can fall out of the window; new events may not appear immediately due to RPC propagation.

- Non-deterministic fetch timing / multi-request races
  - KPI and Payments routes are called concurrently; minor timing differences across refreshes can yield different sets if the chain advanced between calls.

- Event deduping/status precedence
  - We merge events by `paymentInfoHash` with status precedence (charged > captured > authorized). If one event set lags (RPC latency, indexing lag across event types), interim states can appear.

- No persistent index
  - We recompute state from scratch each request. Without a local index (sinceBlock → now), transient RPC inconsistencies impact every response.

- KPI definition
  - "Live Payments" currently sums `authorized + charged` amounts in the time window and counts unique payments in that same window. This is sensitive to the exact window bounds.

---

## Repro Steps (for reference)
1) Open `/dashboard`, note KPI and payments count.
2) Rapidly refresh (or call `GET /api/dashboard/{kpis,payments}` repeatedly) while new blocks are mined.
3) Observe fluctuating counts; after several seconds the counts often converge as RPC results catch up.

---

## Plan (Do Not Implement Yet)

### Phase 1 – Stabilize queries and definitions (low-risk)
1. Pin a consistent block window per response
   - Determine `toBlock` once per request; set `fromBlock = max(toBlock - WINDOW, 0)`; reuse across all event queries in the same route call.
   - Already mostly done in code; ensure all queries in a route share the same `toBlock/fromBlock` variables.

2. Tighten deduplication and sorting
   - Normalize `paymentInfoHash` (lowercase) before map keys.
   - Sort results by `blockNumber` (descending) and `salt` (fallback) for deterministic ordering.

3. Define KPIs deterministically
   - Live payments: clarify definition. Options:
     - a) "Authorized + Charged amounts in window" (current)
     - b) "Captured + Charged amounts in window" (closer to settled volume)
   - Pick one and document in README; apply consistently.

4. Short-lived server-side memoization (3–5s)
   - Cache the computed payload in memory keyed by route path and parameters to avoid visible jitter across rapid refreshes.

Acceptance for Phase 1
- 3 consecutive refreshes return identical payloads (unless a new block is mined and included uniformly across all event types) within the memo window.

### Phase 2 – Incremental indexer (moderate effort)
1. Maintain a lightweight in-memory index
   - Keep `lastScannedBlock` in process memory.
   - On each request, scan from `lastScannedBlock+1 → latest` and merge new events into an in-memory map keyed by `paymentInfoHash` (include counts/sums per KPI).
   - Serve responses from the in-memory index (deterministic), not fresh window scans.

2. Warm start / recovery
   - On boot, backfill from `latest - INIT_WINDOW` to `latest`.
   - Persist `lastScannedBlock` plus a compact snapshot to disk (optional) for hot reloads.

3. Expose diagnostics
   - Add `/api/dashboard/diag` with `lastScannedBlock`, `entries`, and cache stats for troubleshooting.

Acceptance for Phase 2
- Refreshing yields stable results regardless of minor RPC timing; counts only change when new blocks/events arrive and are indexed.

### Phase 3 – UX/Verification improvements
1. Charge verification helper
   - Extend `POST /api/charge` response with explicit:
     - `from/to/method` summaries and a direct PolygonScan URL per tx.
   - Add a "View tx trio" link in the UI to view approve/preApprove/charge together.

2. KPI tooltips and definitions
   - Add tooltips summarizing how KPIs are computed and their time windows.

3. Configurable window
   - Add an env var `DASHBOARD_LOG_WINDOW` and show current window bounds in KPIs payload.

---

## Risks & Considerations
- In-memory index resets on server restart (can mitigate with snapshot persistence or external cache if needed).
- RPC providers may still return inconsistent logs across endpoints temporarily; Phase 2 indexer reduces visible effects.
- Very large windows increase latency and payload size; prefer indexed approach.

---

## Rollout Strategy
- Implement Phase 1 behind a small PR; measure variance across 50 refreshes (± 0 change expected within memo window).
- If acceptable, proceed to Phase 2 to eliminate remaining jitter.
- Add Phase 3 UX improvements after stabilization.

---

## Success Criteria
- Stable counts on repeated refreshes (no oscillation without new blocks).
- KPI values change only when new events enter the index.
- Clear user verification path for charge flows (tx links and senders visible). 