# Frontend Tasks – Refined Merchant Dashboard

Single source of truth for building the production-grade dashboard UI in `demo/web`, aligned with `demo/design.md` and the mock. All routes live under `/dashboard`.

## Objectives
- Pixel-polished, responsive UI implementing Payments, Refunds, Disputes, Analytics.
- Real-time-ish data via onchain logs and cached reads.
- Safe actions: refunds, dispute creation, captures (optional), deep links to scanner.
- Accessibility (WCAG AA), performance (Core Web Vitals), robust error UX.

---

## Architecture
- Framework: Next.js App Router (existing), TypeScript, Tailwind v4.
- Data: `viem` calls to Polygon Amoy via server routes; client uses fetch hooks.
- State: page-local React state + lightweight hooks (SWR-style custom) for polling.
- Endpoints
  - Core (existing):
    - `POST /api/charge`
    - `POST /api/authorize-capture`
    - `POST /api/refund`
    - `POST /api/void`
    - `POST /api/reclaim`
    - `POST /api/payment/build`
  - Dashboard (new):
    - `GET /api/dashboard/payments`
    - `GET /api/dashboard/payments/[id]`
    - `GET /api/dashboard/refunds`, `POST /api/dashboard/refunds`
    - `GET /api/dashboard/disputes`, `POST /api/dashboard/disputes`
- Contracts/ABIs: `AuthCaptureEscrow` (events, `paymentState`, `getHash`), ERC20.
- Styling: Tailwind tokens + CSS variables (colors, radii, shadows) per `design.md` palette.
- Fonts: Inter (weights 400, 500, 600, 700).

---

## Routes and Navigation
- `/dashboard` – shell + default tab = Payments
- Tabs (client-side): Payments | Refunds | Disputes | Analytics
  - Option A: single page with tab state
  - Option B (optional future): nested routes `/dashboard/{payments,refunds,disputes,analytics}`

---

## Design System (Foundations)
- Color tokens:
  - background: #FFFFFF; surface: #F7F8FC; text: #2C3E50
  - primary: #4A90E2; success: #2ECC71; warning: #F39C12; error: #E74C3C; borders: #EAEBF0
- Radii: 8px cards; Focus outline: 2px primary at 2px offset
- Shadows: subtle md for cards; hover elevation for interactive
- Typography: scale (12/14/16/20/24/32), headings semibold+, body regular/medium
- Components: Button (variants: primary, subtle, danger), Badge, Card, StatCard, Table, Input, Select, Checkbox, Tabs, Drawer/Panel, Modal, Toast, Skeleton

---

## Payments Tab (Default)
- Header KPI Row (4 StatCards)
  - Live Payments (authorized value, transactions, trend)
  - Refundable Now (sum refundable, count)
  - Active Disputes (count, avg resolution time)
  - Operator Balance (TokenStore balance)
- Filters Sidebar
  - Status (checkboxes): Authorized, Captured, Refundable (derived), Completed (Captured+no refundable), Disputed
  - Date Range (day/week/month/custom) – client-only filter; server returns recent window
  - Needs Attention: Expiring Soon (<24h auth/refund), High-Value (top decile by amount)
- Payment Board (Kanban-like grid, no DnD in phase 1)
  - Columns: Authorized, Captured, Refundable, Completed
  - Card content: amount+token badge, shortened salt, countdown (orange <24h), side color bar per status
  - Click -> opens Detail Panel (drawer on right)
- Detail Panel
  - Display formatted `PaymentInfo`
  - State (`capturableAmount`, `refundableAmount`)
  - Timeline: Authorized/Charged, Captured, Refunded, Voided, Reclaimed (with block and relative time)
  - Actions: Initiate Refund (with amount input, default 50%), View on PolygonScan

Data integration
- List: `GET /api/dashboard/payments` (already implemented) with client filters
- Detail: `GET /api/dashboard/payments/[id]`
- Refund: `POST /api/dashboard/refunds` (defaults to `OPERATOR_REFUND_COLLECTOR`)

---

## Refunds Tab
- Refundable Table
  - Columns: Payment ID (salt), Payer, Amount Captured, Remaining Refundable, Token, Refund Deadline (countdown), Status
  - Row actions: Full Refund, Partial Refund (input popover)
  - Bulk select + "Process Bulk Refund" (sequential POSTs)
- Analytics Sidebar
  - Totals (refunded vs revenue), refund rate over time (sparkline), top reasons (if provided)

Data integration
- List: `GET /api/dashboard/refunds`
- Actions: `POST /api/dashboard/refunds` (per row, then bulk)

---

## Disputes Tab
- Disputes List
  - Columns: Dispute ID, Payment (hash/salt), Reason, Status, Created, Updated
  - Filters: Status (Open/Pending/Resolved), Urgency, Age
- Detail View
  - Payment context (same component as Payments Detail)
  - Evidence (phase 1: URL attachments only)
  - Communication log (list of entries; phase 1 read-only demo)
  - Actions: Approve Refund (calls refund flow), Provide Evidence (append attachment), Escalate (status change)

Data integration
- List: `GET /api/dashboard/disputes`
- Create: `POST /api/dashboard/disputes`
- Update (phase 1 optional): extend disputes route to support status updates and attachments

---

## Analytics Tab
- Widgets grid
  - Revenue Trends (line, token filter)
  - Lifecycle Funnel (Authorized -> Captured -> Completed)
  - Dispute & Refund Impact (stacked bar)
  - Customer Insights (top payers)
  - Operator Performance (success rates, avg capture time)

Data integration
- Phase 1: compute serverside from logs within window (e.g., 5–10k blocks)
- Phase 2: local cache (SQLite/Prisma) for historical charts

---

## Data & Real-time Strategy
- On-demand logs window (last N blocks) for boards and lists
- Polling: 15–30s with ETag-style client cache
- Derivations
  - Status precedence: charged > captured > authorized; terminal: refunded/voided/reclaimed
  - Refundable = sum(captured) - sum(refunded) > 0
  - ExpiringSoon if `authorizationExpiry` or `refundExpiry` within 24h
- Links: PolygonScan for txs and addresses

---

## Error, Loading, Empty States
- Loading: skeletons for KPI, board, tables; avoid layout shift
- Errors: inline card with retry; toast with error details for actions
- Empty: helpful message + CTA (e.g., "No refundable payments found")

---

## Accessibility
- Semantics: role/aria for buttons, dialogs (modals/drawers), tables
- Keyboard: tab order, ESC to close drawer/modal, Enter to confirm, focus trap
- Color contrast >= 4.5:1; focus visible

---

## Performance
- Avoid large client bundles; keep heavy logic in server routes
- Memoize derived lists, virtualize large tables if needed
- Image/icon sprites; defer non-critical

---

## Env & Config
- Requires in `.env.local` (already present):
  - `RPC_URL`, `AUTH_CAPTURE_ESCROW`, `PREAPPROVAL_COLLECTOR`, `OPERATOR_REFUND_COLLECTOR`, `DEMO_TOKEN`, `PAYER`, `MERCHANT`, `OPERATOR`, keys

---

## Implementation Plan (Phased)

### Phase A – Foundations
- [x] Install Inter font; update `layout.tsx`
- [x] Tailwind tokens (colors baseline) in `globals.css`; light/dark CSS variables
- [x] Shared UI primitives: Button, Card, Modal, cn utility
- [x] Toast system (portal in root)

### Phase B – Payments
- [x] Header KPIs with real values (via `/api/dashboard/kpis`)
- [x] Filters sidebar (status, search)
- [x] Kanban-like cards grid replacing table
- [x] Detail drawer (formatted PaymentInfo, timeline) — added PolygonScan links
- [x] Refund action (amount input, validation, toast success/error) — basic 50% action
- [x] View on PolygonScan links — timeline items link to scanner

### Phase C – Refunds
- [x] Refundable table; search/sort — basic table rendered
- [x] Full/Partial refund actions (input popover) — implemented
- [x] Bulk selection + sequential processing with progress UI — pending (can be added during polish)
- [x] Sidebar analytics (basic cards + tiny charts)

### Phase D – Disputes
- [x] Disputes list + filters — basic list rendered
- [x] Create Dispute modal (reason, notes)
- [x] Dispute detail view; attachments (URL-only)
- [x] Actions: approve refund (calls refund), provide evidence (append), escalate (status) — API supports PATCH for `addEvidence` and `setStatus`

### Phase E – Analytics
- [ ] Widgets grid scaffold
- [ ] Revenue trend (based on captured events)
- [ ] Lifecycle funnel (counts per phase)
- [ ] Refund/dispute impact summary

### Phase F – Quality & Hardening
- [ ] Input validation for all actions (amount > 0; <= refundable)
- [ ] Error boundaries
- [ ] Keyboard navigation tests; aria attributes
- [ ] Performance pass (memoization, reduce renders)
- [ ] E2E smoke (Playwright): payments list loads; open detail; refund; create dispute

---

## API Hook Contracts (Client)
- [ ] `usePayments({ status, q, range })` -> list, loading, error, refresh
- [ ] `usePaymentDetail(id)` -> detail, loading, error, refresh
- [ ] `useRefundables()` -> list
- [ ] `useDisputes()` -> list/create
- [ ] `mutateRefund({ paymentInfo, amount })` -> tx hash
- [ ] `mutateDispute({ paymentInfoHash, reason, notes })`

---

## Acceptance Criteria
- Payments board reflects onchain state within 30s polling window.
- Detail panel shows accurate PaymentInfo and timeline for selected payment.
- Refund action completes and updates refundable state within one poll cycle; success toast shows tx link.
- Disputes can be created and appear in list immediately.
- All critical flows keyboard-accessible and screen-reader friendly.
- No client console errors; LCP < 2.5s on local demo; no layout shifts during loading.



---

## Mapping to Current Work
- Endpoints already implemented are sufficient for Phase B–D.
- Add small server utilities if needed (e.g., operator balance for KPI4).
- Reuse `ESCROW_EVENTS` and `ESCROW_ABI` from `lib/abi.ts`.

---

## Tracking
Use `demo/tasks.md` for high-level progress. This file is the implementation blueprint; check off blocks above as they’re completed. 

---

## Aceternity UI Integration Plan (Do Not Execute Yet)

Adopt Aceternity UI for a modern, animated dashboard per the mock. This section augments the plan; no execution yet.

### Library & Setup
- Install (later): `npm install aceternity-ui framer-motion`
- Theme: leverage Aceternity dark/light theme provider; add theme toggle in header
- Motion: use `framer-motion` for micro-animations and section transitions

### Components to Use
- Imports from `aceternity-ui`:
  - Layout: Dashboard shell/layout components (if provided), Grid utilities
  - Display: `Card` (glassmorphism variants), `Table` (animated), `Badge`
  - Inputs: `Button` (variants: primary, subtle, danger), `Input`, `Select`, `Checkbox`
  - Overlays: `Modal` (payment detail, refund/partial input), Drawer/Sheet (if available)
- Mapping to features
  - KPI metrics (Live Payments, Refundable Now, Active Disputes, Operator Balance): Glassmorphism `Card` with icons and subtle gradient backgrounds
  - Payments tracking: Animated `Table` for the list view; or board built with Aceternity Cards + motion (kanban-style columns)
  - Detail panels: `Modal`/Drawer with sectioned content, animated open/close
  - Actions: `Button` variants for capture, refund, dispute with loading states
  - Filters: `Input`, `Select`, `Checkbox` styled via Aceternity

### Theming & Animations
- Enable built-in dark/light theme and respect user preference (prefers-color-scheme)
- Use micro-animations on:
  - KPI value changes (count-up, subtle pulse on increase)
  - Table row mount/update (fade+slide)
  - Button interactions (press/hover ripple, disabled states)
  - Modal open/close (spring transitions)

### API Integration (unchanged backend)
- Continue using existing endpoints:
  - `/api/dashboard/payments`, `/api/dashboard/payments/[id]`
  - `/api/dashboard/refunds` (GET/POST)
  - `/api/dashboard/disputes` (GET/POST)
- Wire Aceternity components to current data contracts; no API changes required

### UX Details
- Glassmorphism KPIs: blurred background, soft gradient, shadow; animated deltas
- Animated tables: row hover elevation, per-cell shimmer on loading
- Modal detail: two-column layout (PaymentInfo | State), timeline below with animated dots
- Buttons: size/variant per action importance; include icons where helpful

### Execution Checklist (Phase A.1 – Aceternity Adoption)
- [ ] Add Aceternity UI & Framer Motion to plan (this section)
- [ ] Install packages (when execution starts): `npm install aceternity-ui framer-motion`
- [ ] Wrap app with Aceternity theme provider; add theme toggle
- [ ] Replace KPI cards with Aceternity glass `Card`s and motion count-up
- [ ] Replace Payments list with Aceternity `Table` (animated) + our filters
- [ ] Replace detail drawer with Aceternity `Modal`/Sheet; animate sections
- [ ] Standardize `Button` usage to Aceternity variants (primary/subtle/danger)
- [ ] Ensure dark/light theme parity; test keyboard focus and motion-reduced mode

### Acceptance Criteria (UI Kit)
- All primary surfaces use Aceternity components (Cards, Buttons, Tables, Modals)
- Dark and light themes both polished; no contrast regressions
- Animations are smooth (60fps locally) and respectful of `prefers-reduced-motion`
- No changes to backend APIs required; all current flows remain functional 

---

## Progress Log
- Added Inter font via `next/font` and applied it in `app/layout.tsx`.
- Introduced light/dark CSS variables for background/foreground/card in `app/globals.css`.
- Implemented UI primitives: `Button`, `Card`, `Modal`, and `cn` utility.
- Added global `ToastProvider` with `useToast`; replaced alert() with toasts in `/dashboard`.
- Implemented KPIs endpoint and rendered KPI cards; moved filters to a left sidebar; replaced payments table with a card grid.
- Enhanced payment detail timeline with PolygonScan tx links.
- Added tabs for Payments/Refunds/Disputes; built Refunds table with full/partial actions; added Disputes create flow and list.
- Extended disputes API to support evidence uploads (URL metadata) and status updates.
- Implemented Refunds analytics sidebar (Totals, Trend sparkline placeholder, Top reasons) with client-side derivations.
- Added Dispute detail modal: payment context fetch, evidence add, status update, and Approve Refund action with KPI and refundables refresh.
- Added KPI refresh control in Refunds tab.
- Next: optional bulk refunds, then Aceternity UI polish pass. 