# Commerce Payments Demo (Amoy)

A minimal Next.js demo that executes Approve → PreApprove → Authorize → Capture on Amoy using deployed contracts.

## Setup

1. Copy env and fill values (use addresses from `/deployments/amoy-addresses.env` and `/demo/addresses.amoy.env`):

```bash
cp .env.example .env.local
```

Required variables:
- `RPC_URL` (Amoy RPC)
- `RELAYER_PRIVATE_KEY` (must correspond to `PAYER` and hold gas + DEMO_TOKEN)
- `AUTH_CAPTURE_ESCROW`, `PREAPPROVAL_COLLECTOR`, `DEMO_TOKEN`
- `PAYER`, `MERCHANT`, `PAYMENT_SALT`

2. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/demo` and click "Run demo".

## Vercel
- Create a new project with this `demo/web` directory as the root.
- Set the same environment variables in Vercel.
- Deploy and share `/demo` URL.

## Notes
- This basic demo assumes the relayer acts as both payer and operator.
- Ensure the relayer wallet holds sufficient `DEMO_TOKEN` and gas on Amoy. 