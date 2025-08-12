import { NextResponse } from 'next/server';
import { createPublicClient, http, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { ESCROW_ABI, ESCROW_EVENTS, ERC20_ABI } from '@/lib/abi';

// Pull disputes from in-memory store used by disputes endpoint
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDisputesStore = (): { disputes: any[] } => (globalThis as any).__DISPUTES__ || { disputes: [] };

export async function GET() {
  try {
    const env = process.env as Record<string, string>;
    const { RPC_URL, AUTH_CAPTURE_ESCROW, OPERATOR, DEMO_TOKEN } = env;
    if (!RPC_URL || !AUTH_CAPTURE_ESCROW) return NextResponse.json({ error: 'Not configured' }, { status: 400 });

    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const escrow = getAddress(AUTH_CAPTURE_ESCROW);

    const latest = await publicClient.getBlockNumber();
    const fromBlock = latest - 5000n > 0n ? latest - 5000n : 0n;

    // Events
    const [authorized, charged, captured, refunded] = await Promise.all([
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[0], fromBlock }),
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[2], fromBlock }),
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[1], fromBlock }),
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[3], fromBlock }),
    ]);

    // Live payments: total volume and count in window (authorized + charged)
    let liveVolume = 0n;
    const paymentSet = new Set<string>();
    for (const l of authorized as any[]) { liveVolume += BigInt(l.args.amount); paymentSet.add(l.args.paymentInfoHash); }
    for (const l of charged as any[]) { liveVolume += BigInt(l.args.amount); paymentSet.add(l.args.paymentInfoHash); }
    const liveCount = paymentSet.size;

    // Refundable now: sum(captured) - sum(refunded)
    const capMap = new Map<string, bigint>();
    for (const l of captured as any[]) { const k = l.args.paymentInfoHash as string; capMap.set(k, (capMap.get(k) || 0n) + BigInt(l.args.amount)); }
    const refMap = new Map<string, bigint>();
    for (const l of refunded as any[]) { const k = l.args.paymentInfoHash as string; refMap.set(k, (refMap.get(k) || 0n) + BigInt(l.args.amount)); }
    let refundableNow = 0n;
    for (const [k, cap] of capMap.entries()) {
      const ref = refMap.get(k) || 0n;
      if (cap > ref) refundableNow += (cap - ref);
    }

    // Active disputes (in-memory demo store)
    const disputesStore = getDisputesStore();
    const activeDisputes = disputesStore.disputes?.filter((d: any) => d.status !== 'resolved').length || 0;

    // Operator TokenStore balance (if operator and token provided)
    let operatorBalance: { tokenStore: string; token: string; balance: string; symbol?: string; decimals?: number } | null = null;
    if (OPERATOR && DEMO_TOKEN) {
      const operator = getAddress(OPERATOR);
      const token = getAddress(DEMO_TOKEN);
      const tokenStore = await publicClient.readContract({ address: escrow, abi: ESCROW_ABI, functionName: 'getTokenStore', args: [operator] }) as `0x${string}`;
      const [balance, symbol, decimals] = await Promise.all([
        publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [tokenStore] }) as Promise<bigint>,
        publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'symbol' }) as Promise<string>,
        publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'decimals' }) as Promise<number>,
      ]);
      operatorBalance = { tokenStore, token, balance: balance.toString(), symbol, decimals };
    }

    return NextResponse.json({
      window: { fromBlock: fromBlock.toString(), toBlock: latest.toString() },
      live: { volume: liveVolume.toString(), count: liveCount },
      refundableNow: refundableNow.toString(),
      activeDisputes,
      operatorBalance,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
} 