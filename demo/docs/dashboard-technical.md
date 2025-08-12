### Commerce Payments Dashboard (Demo) — Technical

Stack
- Next.js App Router (TypeScript), Tailwind
- viem for RPC reads/writes (Polygon Amoy)
- Server routes under `demo/web/app/api` for reads/writes
- UI in `demo/web/app/dashboard/page.tsx`

Contracts and addresses
- Uses `AuthCaptureEscrow` and Token Collectors deployed on Amoy
- Reads events via `ESCROW_EVENTS` (see `demo/web/lib/abi.ts`)
- Env: `.env.local` holds `RPC_URL`, `AUTH_CAPTURE_ESCROW`, collectors, demo accounts/keys

Server routes (dashboard)
- KPIs: `GET /api/dashboard/kpis` — aggregates recent logs for live volume, refundable total, active disputes, operator TokenStore balance
- Payments: `GET /api/dashboard/payments` — builds current status per `paymentInfoHash`
- Payment detail: `GET /api/dashboard/payments/[id]` — id is salt or hash; returns `paymentInfo`, `state`, `timeline` (BigInt-safe)
- Refundables: `GET /api/dashboard/refunds` — refundable candidates and `remaining`
- Refund action: `POST /api/dashboard/refunds` — executes `escrow.refund(paymentInfo, amount, collector, data)`
- Disputes: `GET/POST/PATCH /api/dashboard/disputes` — in-memory store for demo (status and attachments)

Core reads
- Window: last ~5k blocks (configurable per route); viem `getLogs`
- State: `paymentState(paymentInfoHash)` for `capturableAmount` and `refundableAmount`
- TokenStore: `getTokenStore(operator)` → read token balances for KPIs

Status derivation
- From logs; precedence: `charged > captured > authorized`; terminal: `refunded | voided | reclaimed`
- Refundable = sum(captured) - sum(refunded) > 0

UI data contracts
- Payments list item: `{ paymentInfoHash, salt, payer, receiver, token, expiries, status, statusColor }`
- Payment detail: `{ paymentInfo, state, timeline[] }` with amounts as strings
- Refundables row: `{ paymentInfoHash, remaining, refundExpiry, payer, token, salt }`
- KPIs: `{ live: { volume, count }, refundableNow, activeDisputes, operatorBalance? }`

Actions
- Refunds (full/partial): client fetches detail → posts `{ paymentInfo, amount }`
- Disputes: create, add evidence (`name,url`), set status (`open|pending|resolved`)
- Approve Refund from Dispute: default amount = `refundableAmount`; units computed from token decimals

Security notes
- Server-side wallet clients sign transactions using env keys
- Escrow functions are NonReentrant and post-call balance checked (see protocol docs)
- Disputes are demo-only (no persistence)

Local dev
- `cd demo/web && npm run dev -p 3020`
- Ensure `.env.local` filled with Amoy addresses and keys
- Use `/api/run-demo` or `/api/authorize-capture` to seed activity if needed

Limitations (demo)
- Logs window only (no DB); trend charts are placeholders
- Single token assumed for formatting in UI (reads symbol/decimals for KPIs) 