### Commerce Payments Dashboard (Demo) — Basics

This demo shows how operators manage onchain payments using the Commerce Payments Protocol via a modern dashboard.

What you can do
- Track payments across their lifecycle: authorize → capture/charge → refund → void/reclaim
- See KPIs: live volume, refundable totals, active disputes, and operator TokenStore balance
- Manage refunds (full or partial) and handle disputes (evidence, status)

Key concepts
- Operator: submits transactions on behalf of merchants/payers (gas + automation), but cannot steal funds
- Escrow: funds are held during authorization; captures settle to merchants; refunds return to payers
- TokenStore: per-operator vault that isolates liquidity

Tabs in the dashboard
- Payments: live board with filters, per-payment detail and actions
- Refunds: list of refundable payments with quick actions and an analytics sidebar
- Disputes: create and manage disputes; approve refund directly from a dispute

How it connects to chain
- Reads: viem fetches recent onchain events from Polygon Amoy (demo testnet)
- Writes: server routes submit signed transactions (using env keys) to perform actions

What to expect in the demo
- Real-time-ish updates (recent blocks window)
- Simple UX for core actions (refunds, disputes)
- Links out to PolygonScan for transparency 