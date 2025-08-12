import { NextResponse } from 'next/server';
import { createPublicClient, http, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { ESCROW_ABI, ESCROW_EVENTS } from '@/lib/abi';

export async function GET() {
  try {
    const env = process.env as Record<string, string>;
    const { RPC_URL, AUTH_CAPTURE_ESCROW } = env;
    if (!RPC_URL || !AUTH_CAPTURE_ESCROW) {
      // Return empty list if not configured in this environment
      return NextResponse.json({ items: [] });
    }

    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const escrow = getAddress(AUTH_CAPTURE_ESCROW);

    // Fetch recent logs for core events (last ~5k blocks for demo)
    const latest = await publicClient.getBlockNumber();
    const fromBlock = latest - 5000n > 0n ? latest - 5000n : 0n;

    // Query each event type individually to preserve decoding
    const [authorized, charged, captured, refunded, voided, reclaimed] = await Promise.all([
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[0], fromBlock }), // PaymentAuthorized
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[2], fromBlock }), // PaymentCharged
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[1], fromBlock }), // PaymentCaptured
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[3], fromBlock }), // PaymentRefunded
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[4], fromBlock }), // PaymentVoided
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[5], fromBlock }), // PaymentReclaimed
    ]);

    type Status = 'authorized' | 'captured' | 'charged' | 'refunded' | 'voided' | 'reclaimed';

    // Build a map keyed by paymentInfoHash with latest status
    const map = new Map<string, any>();

    const upsert = (hash: string, patch: Partial<any>, status: Status) => {
      const prev = map.get(hash) || { paymentInfoHash: hash };
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
      map.set(hash, next);
    };

    for (const log of authorized) {
      const { args } = log as any;
      const info = args.paymentInfo as any;
      upsert(args.paymentInfoHash, {
        salt: String(info.salt),
        payer: info.payer,
        receiver: info.receiver,
        token: info.token,
        preApprovalExpiry: info.preApprovalExpiry,
        authorizationExpiry: info.authorizationExpiry,
        refundExpiry: info.refundExpiry,
      }, 'authorized');
    }
    for (const log of charged) {
      const { args } = log as any;
      const info = args.paymentInfo as any;
      upsert(args.paymentInfoHash, {
        salt: String(info.salt),
        payer: info.payer,
        receiver: info.receiver,
        token: info.token,
        preApprovalExpiry: info.preApprovalExpiry,
        authorizationExpiry: info.authorizationExpiry,
        refundExpiry: info.refundExpiry,
      }, 'charged');
    }
    for (const log of captured) {
      const { args } = log as any;
      upsert(args.paymentInfoHash, {}, 'captured');
    }
    for (const log of refunded) {
      const { args } = log as any;
      upsert(args.paymentInfoHash, {}, 'refunded');
    }
    for (const log of voided) {
      const { args } = log as any;
      upsert(args.paymentInfoHash, {}, 'voided');
    }
    for (const log of reclaimed) {
      const { args } = log as any;
      upsert(args.paymentInfoHash, {}, 'reclaimed');
    }

    const items = Array.from(map.values()).sort((a, b) => Number(b.salt ?? 0) - Number(a.salt ?? 0));

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
} 