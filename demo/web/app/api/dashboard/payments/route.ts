import { NextResponse } from 'next/server';
import { createPublicClient, http, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { ESCROW_ABI, ESCROW_EVENTS } from '@/lib/abi';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let __CACHE__: { at: number; payload: any } | null = null;
const TTL_MS = 3000;

export async function GET() {
  try {
    const now = Date.now();
    if (__CACHE__ && now - __CACHE__.at < TTL_MS) return NextResponse.json(__CACHE__.payload);

    const env = process.env as Record<string, string>;
    const { RPC_URL, AUTH_CAPTURE_ESCROW } = env;
    if (!RPC_URL || !AUTH_CAPTURE_ESCROW) {
      return NextResponse.json({ items: [] });
    }

    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const escrow = getAddress(AUTH_CAPTURE_ESCROW);

    // Pin a consistent window per request
    const latest = await publicClient.getBlockNumber();
    const toBlock = latest;
    const fromBlock = toBlock - 5000n > 0n ? toBlock - 5000n : 0n;

    // Query each event type with the same bounds
    const [authorized, charged, captured, refunded, voided, reclaimed] = await Promise.all([
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[0], fromBlock, toBlock }), // PaymentAuthorized
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[2], fromBlock, toBlock }), // PaymentCharged
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[1], fromBlock, toBlock }), // PaymentCaptured
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[3], fromBlock, toBlock }), // PaymentRefunded
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[4], fromBlock, toBlock }), // PaymentVoided
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[5], fromBlock, toBlock }), // PaymentReclaimed
    ]);

    type Status = 'authorized' | 'captured' | 'charged' | 'refunded' | 'voided' | 'reclaimed';

    const map = new Map<string, any>();

    const upsert = (hash: string, patch: Partial<any>, status: Status) => {
      const key = hash.toLowerCase();
      const prev = map.get(key) || { paymentInfoHash: key };
      const statusRank: Record<Status, number> = {
        authorized: 1,
        captured: 2,
        charged: 3,
        refunded: 4,
        voided: 4,
        reclaimed: 4,
      };
      const next = { ...prev, ...patch };
      const currentRank = prev.status ? statusRank[prev.status as Status] : 0;
      if (statusRank[status] >= currentRank) {
        next.status = status;
      }
      next.statusColor =
        next.status === 'authorized' ? 'bg-yellow-500' :
        next.status === 'captured' || next.status === 'charged' ? 'bg-green-600' :
        next.status === 'refunded' ? 'bg-blue-600' :
        next.status === 'voided' || next.status === 'reclaimed' ? 'bg-gray-500' : 'bg-gray-400';
      map.set(key, next);
    };

    for (const log of authorized) {
      const { args } = log as any;
      const info = args.paymentInfo as any;
      upsert((args.paymentInfoHash as string), {
        salt: String(info.salt),
        payer: info.payer,
        receiver: info.receiver,
        token: info.token,
        preApprovalExpiry: Number(info.preApprovalExpiry),
        authorizationExpiry: Number(info.authorizationExpiry),
        refundExpiry: Number(info.refundExpiry),
      }, 'authorized');
    }
    for (const log of charged) {
      const { args } = log as any;
      const info = args.paymentInfo as any;
      upsert((args.paymentInfoHash as string), {
        salt: String(info.salt),
        payer: info.payer,
        receiver: info.receiver,
        token: info.token,
        preApprovalExpiry: Number(info.preApprovalExpiry),
        authorizationExpiry: Number(info.authorizationExpiry),
        refundExpiry: Number(info.refundExpiry),
      }, 'charged');
    }
    for (const log of captured) {
      const { args } = log as any;
      upsert((args.paymentInfoHash as string), {}, 'captured');
    }
    for (const log of refunded) {
      const { args } = log as any;
      upsert((args.paymentInfoHash as string), {}, 'refunded');
    }
    for (const log of voided) {
      const { args } = log as any;
      upsert((args.paymentInfoHash as string), {}, 'voided');
    }
    for (const log of reclaimed) {
      const { args } = log as any;
      upsert((args.paymentInfoHash as string), {}, 'reclaimed');
    }

    // Deterministic sort: by numeric salt desc then hash
    const items = Array.from(map.values()).sort((a, b) => {
      const as = Number(a.salt ?? 0);
      const bs = Number(b.salt ?? 0);
      if (as !== bs) return bs - as;
      return (b.paymentInfoHash as string).localeCompare(a.paymentInfoHash as string);
    });

    const payload = { items, window: { fromBlock: fromBlock.toString(), toBlock: toBlock.toString() } };
    __CACHE__ = { at: now, payload };
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
} 